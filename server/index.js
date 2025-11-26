const express = require('express');
const cors = require('cors');
const db = require('./database.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './server/.env' }); // 명확한 경로 지정

const app = express();
const port = process.env.PORT || 3001;
const isDevelopment = process.env.NODE_ENV !== 'production';

// CORS 설정: 프로덕션에서는 특정 origin만 허용 (필요 시)
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || '*' 
    : '*',
  credentials: true
};

app.use(cors(corsOptions));
// 요청 본문 크기 제한 증가 (기본 100kb → 10mb)
// 경로 데이터(polylines 등)가 클 수 있으므로 제한을 늘림
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/', (req, res) => {
  res.send('EcoNavi 백엔드 서버가 실행 중입니다.');
});

// Health check 엔드포인트 (서버 연결 확인용)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: '서버가 정상적으로 실행 중입니다.',
    timestamp: new Date().toISOString()
  });
});

// 회원가입 API 라우트
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: '사용자 이름과 비밀번호를 모두 입력해주세요.' });
  }

  // 비밀번호 암호화 (salt rounds = 10)
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      return res.status(500).json({ message: '비밀번호 암호화 중 오류 발생', error: err.message });
    }

    // username이 'admin'인 경우 관리자 권한 부여
    const isAdmin = username === 'admin' ? 1 : 0;
    const sql = 'INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)';
    db.run(sql, [username, hashedPassword, isAdmin], function (err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(409).json({ message: '이미 존재하는 사용자 이름입니다.' });
        }
        return res.status(500).json({ message: '데이터베이스 오류가 발생했습니다.', error: err.message });
      }
      res.status(201).json({ message: '회원가입이 성공적으로 완료되었습니다.', userId: this.lastID });
    });
  });
});

// 로그인 API 라우트
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: '사용자 이름과 비밀번호를 모두 입력해주세요.' });
  }

  const sql = 'SELECT * FROM users WHERE username = ?';
  db.get(sql, [username], (err, user) => {
    if (err) {
      return res.status(500).json({ message: '데이터베이스 오류가 발생했습니다.', error: err.message });
    }
    if (!user) {
      return res.status(404).json({ message: '존재하지 않는 사용자입니다.' });
    }

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        return res.status(500).json({ message: '비밀번호 비교 중 오류 발생', error: err.message });
      }
      
      if (isMatch) {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          return res.status(500).json({ message: '서버 설정 오류: JWT 비밀 키가 없습니다.' });
        }

        const token = jwt.sign(
          { id: user.id, username: user.username },
          secret,
          { expiresIn: '1h' }
        );
        res.status(200).json({ message: '로그인 성공!', token });

      } else {
        res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
      }
    });
  });
});

const authMiddleware = require('./authMiddleware');
const adminMiddleware = require('./adminMiddleware');

// 보너스 포인트 계산 로직 (프론트엔드와 동일하게 유지)
const BONUS_POINTS = {
  walking: 10,
  bicycle: 8,
  bus: 5,
  subway: 6,
  car: 0,
  electric_car: 3,
};

const calculateBonus = (route) => {
  const basePoints = BONUS_POINTS[route.transportMode] || 0;
  const distanceMultiplier = Math.min(route.distance / 10, 2);
  const ecoMultiplier = ['walking', 'bicycle'].includes(route.transportMode) ? 1.5 : 1;
  return Math.round(basePoints * distanceMultiplier * ecoMultiplier);
};

// 내 정보 조회 API (포인트 및 목표 포함)
app.get('/me', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const sql = "SELECT id, username, points, monthly_goal, vehicle_type, is_admin FROM users WHERE id = ?";
  db.get(sql, [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ message: '사용자 정보 조회 중 데이터베이스 오류가 발생했습니다.', error: err.message });
    }
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    // is_admin을 boolean으로 변환
    user.is_admin = user.is_admin === 1;
    res.status(200).json(user);
  });
});

// 월간 목표 설정 API
app.post('/goal', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { monthly_goal } = req.body;

  if (typeof monthly_goal !== 'number' || monthly_goal < 0) {
    return res.status(400).json({ message: '올바른 목표 값을 입력해주세요.' });
  }

  const sql = `UPDATE users SET monthly_goal = ? WHERE id = ?`;
  db.run(sql, [monthly_goal, userId], function(err) {
    if (err) {
      return res.status(500).json({ message: '월간 목표 설정 중 데이터베이스 오류가 발생했습니다.', error: err.message });
    }
    res.status(200).json({ message: '월간 목표가 성공적으로 설정되었습니다.' });
  });
});

// 차량 종류 설정 API
app.post('/me/vehicle', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { vehicleType } = req.body;

  const validVehicleTypes = ['car', 'electric_car', 'hybrid', 'hydrogen', 'motorcycle', 'electric_motorcycle'];
  if (!validVehicleTypes.includes(vehicleType)) {
    return res.status(400).json({ message: '유효한 차량 종류를 선택해주세요.' });
  }

  const sql = `UPDATE users SET vehicle_type = ? WHERE id = ?`;
  db.run(sql, [vehicleType, userId], function(err) {
    if (err) {
      return res.status(500).json({ message: '차량 정보 업데이트 중 데이터베이스 오류가 발생했습니다.', error: err.message });
    }
    res.status(200).json({ message: '차량 정보가 성공적으로 업데이트되었습니다.' });
  });
});

const { checkAndAwardAchievements, achievements } = require('./achievements.js');
const { quests, updateQuests } = require('./quests.js');

// 활동 기록 저장 API
app.post('/trips', authMiddleware, async (req, res) => {
  const { route, emission } = req.body;
  const userId = req.user.id;

  // 1. 활동 기록 저장
  const insertTripSql = `INSERT INTO trips (user_id, date, origin_name, destination_name, distance, duration, transport_mode, total_emission, saved_emission)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const tripParams = [
    userId,
    new Date().toISOString(),
    route.origin.name,
    route.destination.name,
    route.distance,
    route.duration,
    route.transportMode,
    emission.totalEmission,
    emission.savedEmission
  ];

  db.run(insertTripSql, tripParams, async function(err) {
    if (err) {
      return res.status(500).json({ message: '활동 기록 저장 중 데이터베이스 오류가 발생했습니다.', error: err.message });
    }
    const tripId = this.lastID;
    const tripData = { route, emission };

    // 2. 보너스 포인트 계산 및 사용자 포인트 업데이트
    const bonusPoints = calculateBonus(route);
    if (bonusPoints > 0) {
      const updateUserSql = `UPDATE users SET points = points + ? WHERE id = ?`;
      db.run(updateUserSql, [bonusPoints, userId], (updateErr) => {
        if (updateErr) console.error('사용자 포인트 업데이트 오류:', updateErr.message);
      });
    }

    // 3. 월간 목표 달성 확인 (생략 - 업적/퀘스트 시스템에서 통합 관리 가능)

    // 4. 업적 달성 확인
    const newlyAchieved = await checkAndAwardAchievements(userId, tripData);

    // 5. 퀘스트 진행상황 업데이트
    await updateQuests(userId, tripData);

    res.status(201).json({ 
      message: '활동 기록이 성공적으로 저장되었습니다.', 
      tripId, 
      newlyAchieved 
    });
  });
});

// 달성한 업적 목록 조회 API
app.get('/achievements', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const sql = `SELECT * FROM user_achievements WHERE user_id = ? ORDER BY date DESC`;
  db.all(sql, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: '업적 조회 중 데이터베이스 오류가 발생했습니다.', error: err.message });
    }
    // 전체 업적 정보와 달성한 업적 정보를 조합하여 반환
    const result = rows.map(achieved => {
      const achievementInfo = achievements.find(a => a.id === achieved.achievement_id);
      return { ...achievementInfo, date: achieved.date };
    });
    res.status(200).json(result);
  });
});

// 활동 기록 조회 API
app.get('/trips', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const sql = "SELECT * FROM trips WHERE user_id = ? ORDER BY date DESC";

  db.all(sql, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: '활동 기록 조회 중 데이터베이스 오류가 발생했습니다.', error: err.message });
    }
    res.status(200).json(rows);
  });
});

// 랭킹 조회 API
app.get('/ranking', (req, res) => {
  const sql = `
    SELECT
      u.username,
      SUM(t.saved_emission) AS total_saved_emission
    FROM trips t
    JOIN users u ON t.user_id = u.id
    GROUP BY u.username
    ORDER BY total_saved_emission DESC
    LIMIT 20;
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: '랭킹 조회 중 데이터베이스 오류가 발생했습니다.', error: err.message });
    }
    res.status(200).json(rows);
  });
});

// --- 상점 관련 API ---

// 상품 목록 조회 API
app.get('/products', (req, res) => {
  const sql = "SELECT * FROM products ORDER BY points_required ASC";
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: '상품 목록 조회 중 데이터베이스 오류가 발생했습니다.', error: err.message });
    }
    res.status(200).json(rows);
  });
});

// 상품 교환 API
app.post('/products/:id/exchange', authMiddleware, (req, res) => {
  const productId = req.params.id;
  const userId = req.user.id;

  // 1. 상품 정보와 사용자 포인트 정보 동시 조회
  const getProductSql = "SELECT * FROM products WHERE id = ?";
  const getUserSql = "SELECT * FROM users WHERE id = ?";

  db.get(getProductSql, [productId], (err, product) => {
    if (err || !product) return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });

    db.get(getUserSql, [userId], (err, user) => {
      if (err || !user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });

      // 2. 포인트 확인
      if (user.points < product.points_required) {
        return res.status(400).json({ message: '포인트가 부족합니다.' });
      }

      // 3. 트랜잭션: 사용자 포인트 차감 및 교환 기록 추가
      db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        const updateUserSql = `UPDATE users SET points = points - ? WHERE id = ?`;
        db.run(updateUserSql, [product.points_required, userId]);

        const insertExchangeSql = `INSERT INTO user_products (user_id, product_id, exchange_date) VALUES (?, ?, ?)`;
        db.run(insertExchangeSql, [userId, productId, new Date().toISOString()]);

        db.run("COMMIT", (err) => {
          if (err) {
            db.run("ROLLBACK");
            return res.status(500).json({ message: '상품 교환 처리 중 오류가 발생했습니다.' });
          }
          res.status(200).json({ message: `'${product.name}' 상품을 성공적으로 교환했습니다!` });
        });
      });
    });
  });
});

// --- 퀘스트 관련 API ---

// 퀘스트 목록 및 진행상황 조회 API
app.get('/quests', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const sql = "SELECT * FROM user_quests WHERE user_id = ?";
  db.all(sql, [userId], (err, userQuests) => {
    if (err) {
      return res.status(500).json({ message: '퀘스트 정보 조회 중 오류가 발생했습니다.', error: err.message });
    }
    // 전체 퀘스트 정보와 사용자의 진행상황을 조합하여 반환
    const result = quests.map(quest => {
      const userQuest = userQuests.find(uq => uq.quest_id === quest.id);
      return {
        ...quest,
        progress: userQuest?.progress || 0,
        status: userQuest?.status || 'inactive',
      };
    });
    res.status(200).json(result);
  });
});

// 퀘스트 보상 수령 API
app.post('/quests/:id/reward', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const questId = req.params.id;

  const sql = `SELECT * FROM user_quests WHERE user_id = ? AND quest_id = ? AND status = 'completed'`;
  db.get(sql, [userId, questId], (err, userQuest) => {
    if (err || !userQuest) {
      return res.status(404).json({ message: '보상을 받을 수 있는 퀘스트가 아닙니다.' });
    }

    const questInfo = quests.find(q => q.id === questId);
    if (!questInfo) {
      return res.status(404).json({ message: '존재하지 않는 퀘스트입니다.' });
    }

    const bonus = questInfo.bonus;
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");
      const updateUserSql = `UPDATE users SET points = points + ? WHERE id = ?`;
      db.run(updateUserSql, [bonus, userId]);

      const updateQuestSql = `UPDATE user_quests SET status = 'rewarded' WHERE id = ?`;
      db.run(updateQuestSql, [userQuest.id]);

      db.run("COMMIT", (err) => {
        if (err) {
          db.run("ROLLBACK");
          return res.status(500).json({ message: '보상 처리 중 오류가 발생했습니다.' });
        }
        res.status(200).json({ message: `'${questInfo.name}' 퀘스트 보상을 수령했습니다! (+${bonus}P)` });
      });
    });
  });
});

// 월간 리포트 조회 API
app.get('/reports/:year/:month', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { year, month } = req.params;

  const startDate = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`;
  const endDate = new Date(year, month, 0, 23, 59, 59, 999).toISOString();

  try {
    // 여러 통계 쿼리를 병렬로 실행
    const [monthlyTrips, allUsersTotalSavings] = await Promise.all([
      // 1. 현재 사용자의 해당 월 활동 기록 전체 조회
      new Promise((resolve, reject) => {
        const sql = "SELECT * FROM trips WHERE user_id = ? AND date >= ? AND date <= ?";
        db.all(sql, [userId, startDate, endDate], (err, rows) => err ? reject(err) : resolve(rows));
      }),
      // 2. 전체 사용자의 총 절감량 (백분위 계산용)
      new Promise((resolve, reject) => {
        const sql = `SELECT user_id, SUM(saved_emission) as total_savings FROM trips GROUP BY user_id`;
        db.all(sql, [], (err, rows) => err ? reject(err) : resolve(rows));
      })
    ]);

    if (!monthlyTrips || monthlyTrips.length === 0) {
      return res.status(200).json({ message: '해당 월의 활동 기록이 없습니다.' });
    }

    // --- 통계 계산 ---
    const totalTrips = monthlyTrips.length;
    const totalDistance = monthlyTrips.reduce((sum, trip) => sum + trip.distance, 0);
    const averageDistance = totalDistance / totalTrips;

    const modeCounts = monthlyTrips.reduce((acc, trip) => {
      acc[trip.transport_mode] = (acc[trip.transport_mode] || 0) + 1;
      return acc;
    }, {});

    const dailySavings = monthlyTrips.reduce((acc, trip) => {
      const day = trip.date.split('T')[0];
      acc[day] = (acc[day] || 0) + trip.saved_emission;
      return acc;
    }, {});

    let bestDay = { date: null, savings: 0 };
    for (const day in dailySavings) {
      if (dailySavings[day] > bestDay.savings) {
        bestDay = { date: day, savings: dailySavings[day] };
      }
    }

    const currentUserSavings = allUsersTotalSavings.find(u => u.user_id === userId)?.total_savings || 0;
    const higherRankedUsers = allUsersTotalSavings.filter(u => u.total_savings > currentUserSavings).length;
    const percentile = (allUsersTotalSavings.length - higherRankedUsers) / allUsersTotalSavings.length * 100;

    res.status(200).json({
      totalTrips,
      totalDistance,
      averageDistance,
      modeCounts,
      bestDay,
      percentile,
    });

  } catch (err) {
    res.status(500).json({ message: '리포트 생성 중 오류가 발생했습니다.', error: err.message });
  }
});

// ==================== 관리자 API ====================
// 개발자/관리자용 API - admin 계정만 접근 가능

// 모든 유저 목록 조회
app.get('/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  const sql = 'SELECT id, username, points, monthly_goal, vehicle_type FROM users ORDER BY id';
  db.all(sql, [], (err, users) => {
    if (err) {
      return res.status(500).json({ message: '유저 목록 조회 중 오류가 발생했습니다.', error: err.message });
    }
    res.status(200).json(users);
  });
});

// 특정 유저의 상세 정보 (탄소량 포함)
app.get('/admin/users/:userId', authMiddleware, adminMiddleware, (req, res) => {
  const userId = parseInt(req.params.userId);
  
  // 유저 기본 정보
  const userSql = 'SELECT id, username, points, monthly_goal, vehicle_type FROM users WHERE id = ?';
  db.get(userSql, [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ message: '유저 정보 조회 중 오류가 발생했습니다.', error: err.message });
    }
    if (!user) {
      return res.status(404).json({ message: '유저를 찾을 수 없습니다.' });
    }

    // 유저의 모든 이동 기록 조회
    const tripsSql = 'SELECT * FROM trips WHERE user_id = ? ORDER BY date DESC';
    db.all(tripsSql, [userId], (err, trips) => {
      if (err) {
        return res.status(500).json({ message: '이동 기록 조회 중 오류가 발생했습니다.', error: err.message });
      }

      // 탄소량 통계 계산
      const totalSavedEmission = trips.reduce((sum, trip) => sum + (trip.saved_emission || 0), 0);
      const totalEmission = trips.reduce((sum, trip) => sum + (trip.total_emission || 0), 0);
      const totalDistance = trips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
      const tripCount = trips.length;

      res.status(200).json({
        user,
        trips,
        statistics: {
          totalSavedEmission,
          totalEmission,
          totalDistance,
          tripCount,
        },
      });
    });
  });
});

// 유저 비밀번호 변경
app.post('/admin/users/:userId/password', authMiddleware, adminMiddleware, (req, res) => {
  const userId = parseInt(req.params.userId);
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ message: '새 비밀번호는 최소 4자 이상이어야 합니다.' });
  }

  // 유저 존재 확인
  const checkSql = 'SELECT id FROM users WHERE id = ?';
  db.get(checkSql, [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ message: '유저 확인 중 오류가 발생했습니다.', error: err.message });
    }
    if (!user) {
      return res.status(404).json({ message: '유저를 찾을 수 없습니다.' });
    }

    // 비밀번호 암호화
    bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
      if (err) {
        return res.status(500).json({ message: '비밀번호 암호화 중 오류 발생', error: err.message });
      }

      const updateSql = 'UPDATE users SET password = ? WHERE id = ?';
      db.run(updateSql, [hashedPassword, userId], function (err) {
        if (err) {
          return res.status(500).json({ message: '비밀번호 변경 중 오류가 발생했습니다.', error: err.message });
        }
        res.status(200).json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
      });
    });
  });
});

// 전체 탄소량 통계
app.get('/admin/statistics', authMiddleware, adminMiddleware, (req, res) => {
  // 모든 유저의 탄소량 통계
  const sql = `
    SELECT 
      u.id,
      u.username,
      COALESCE(SUM(t.saved_emission), 0) as total_saved_emission,
      COALESCE(SUM(t.total_emission), 0) as total_emission,
      COALESCE(SUM(t.distance), 0) as total_distance,
      COUNT(t.id) as trip_count
    FROM users u
    LEFT JOIN trips t ON u.id = t.user_id
    GROUP BY u.id, u.username
    ORDER BY total_saved_emission DESC
  `;

  db.all(sql, [], (err, userStats) => {
    if (err) {
      return res.status(500).json({ message: '통계 조회 중 오류가 발생했습니다.', error: err.message });
    }

    // 전체 합계 계산
    const totalSavedEmission = userStats.reduce((sum, stat) => sum + stat.total_saved_emission, 0);
    const totalEmission = userStats.reduce((sum, stat) => sum + stat.total_emission, 0);
    const totalDistance = userStats.reduce((sum, stat) => sum + stat.total_distance, 0);
    const totalTripCount = userStats.reduce((sum, stat) => sum + stat.trip_count, 0);
    const totalUsers = userStats.length;

    res.status(200).json({
      summary: {
        totalUsers,
        totalSavedEmission,
        totalEmission,
        totalDistance,
        totalTripCount,
      },
      users: userStats,
    });
  });
});

// 모든 네트워크 인터페이스에서 리스닝 (0.0.0.0)
// 이렇게 하면 외부에서도 접근 가능 (같은 네트워크 내)
app.listen(port, '0.0.0.0', () => {
  console.log(`백엔드 서버가 http://0.0.0.0:${port} 에서 실행 중입니다.`);
  console.log(`로컬 접근: http://localhost:${port}`);
  console.log(`환경: ${isDevelopment ? '개발 모드' : '프로덕션 모드'}`);
  if (isDevelopment) {
    console.log('개발 서버 모드 - Android 에뮬레이터: http://10.0.2.2:3001');
    console.log('개발 서버 모드 - 실제 기기: http://<your-local-ip>:3001');
    console.log('⚠️  외부 접근 가능: 같은 네트워크의 다른 기기에서 접근할 수 있습니다.');
  }
});