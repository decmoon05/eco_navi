const db = require('./database.js');

/**
 * 업적 시스템
 * 
 * 업적은 사용자의 특정 행동이나 누적 통계를 기반으로 달성됩니다.
 * 각 업적은 한 번만 달성 가능하며, 달성 시 보너스 포인트를 지급합니다.
 * 
 * 업적 구조:
 * - id: 고유 식별자
 * - name: 업적 이름
 * - description: 업적 설명
 * - bonus: 달성 시 보너스 포인트
 * - check: 달성 조건 확인 함수 (userId, trip을 받아 boolean 반환)
 * 
 * 업적 종류:
 * - 첫 이용 업적: 특정 이동 수단을 처음 사용할 때
 * - 거리 기반 업적: 누적 이동 거리 달성
 * - 탄소 절감 업적: 누적 탄소 절감량 달성
 * - 이용 횟수 기반 업적: 특정 이동 수단을 여러 번 이용
 */

// 모든 업적 목록과 달성 조건 정의
const achievements = [
  {
    id: 'first_walk',
    name: '첫 걸음',
    description: '첫 도보 경로를 검색하여 건강과 환경을 모두 챙겼습니다.',
    bonus: 50, // 달성 보너스 포인트
    check: async (userId, trip) => {
      // 이번 경로가 'walking'이면 달성
      return trip.route.transportMode === 'walking';
    }
  },
  {
    id: 'first_bus',
    name: '버스의 달인',
    description: '첫 버스 경로를 검색하여 대중교통 이용을 시작했습니다.',
    bonus: 50,
    check: async (userId, trip) => {
      return trip.route.transportMode === 'bus';
    }
  },
  {
    id: 'total_walk_10km',
    name: '걷기왕',
    description: '도보로 누적 10km를 달성했습니다.',
    bonus: 100,
    check: async (userId, trip) => {
      const sql = `SELECT SUM(distance) AS total_distance FROM trips WHERE user_id = ? AND transport_mode = 'walking'`;
      return new Promise((resolve, reject) => {
        db.get(sql, [userId], (err, row) => {
          if (err) return resolve(false);
          resolve(row && row.total_distance >= 10);
        });
      });
    }
  },
  {
    id: 'save_10kg',
    name: '지구의 수호자',
    description: '누적 10kg의 탄소를 절약했습니다.',
    bonus: 200,
    check: async (userId, trip) => {
      const sql = `SELECT SUM(saved_emission) AS total_saved FROM trips WHERE user_id = ?`;
      return new Promise((resolve, reject) => {
        db.get(sql, [userId], (err, row) => {
          if (err) return resolve(false);
          resolve(row && row.total_saved >= 10000); // 10kg = 10,000g
        });
      });
    }
  },
  {
    id: 'bike_100km',
    name: '자전거 마스터',
    description: '자전거로 누적 100km를 달성했습니다.',
    bonus: 500,
    check: async (userId, trip) => {
      const sql = `SELECT SUM(distance) AS total_distance FROM trips WHERE user_id = ? AND transport_mode = 'bicycle'`;
      return new Promise((resolve, reject) => {
        db.get(sql, [userId], (err, row) => {
          if (err) return resolve(false);
          resolve(row && row.total_distance >= 100);
        });
      });
    }
  },
  {
    id: 'save_50kg',
    name: '탄소 절감 마스터',
    description: '누적 50kg의 탄소를 절약했습니다.',
    bonus: 1000,
    check: async (userId, trip) => {
      const sql = `SELECT SUM(saved_emission) AS total_saved FROM trips WHERE user_id = ?`;
      return new Promise((resolve, reject) => {
        db.get(sql, [userId], (err, row) => {
          if (err) return resolve(false);
          resolve(row && row.total_saved >= 50000); // 50kg = 50,000g
        });
      });
    }
  },
  {
    id: 'walk_100km',
    name: '걷기 마스터',
    description: '도보로 누적 100km를 달성했습니다.',
    bonus: 600,
    check: async (userId, trip) => {
      const sql = `SELECT SUM(distance) AS total_distance FROM trips WHERE user_id = ? AND transport_mode = 'walking'`;
      return new Promise((resolve, reject) => {
        db.get(sql, [userId], (err, row) => {
          if (err) return resolve(false);
          resolve(row && row.total_distance >= 100);
        });
      });
    }
  },
  {
    id: 'public_transit_50',
    name: '대중교통 애호가',
    description: '대중교통을 50번 이상 이용했습니다.',
    bonus: 400,
    check: async (userId, trip) => {
      const sql = `SELECT COUNT(*) AS count FROM trips WHERE user_id = ? AND transport_mode IN ('bus', 'subway', 'train')`;
      return new Promise((resolve, reject) => {
        db.get(sql, [userId], (err, row) => {
          if (err) return resolve(false);
          resolve(row && row.count >= 50);
        });
      });
    }
  },
  {
    id: 'eco_trips_100',
    name: '친환경 라이프',
    description: '친환경 이동 수단으로 100번 이상 이동했습니다.',
    bonus: 800,
    check: async (userId, trip) => {
      const sql = `SELECT COUNT(*) AS count FROM trips WHERE user_id = ? AND transport_mode IN ('walking', 'bicycle', 'bus', 'subway', 'train')`;
      return new Promise((resolve, reject) => {
        db.get(sql, [userId], (err, row) => {
          if (err) return resolve(false);
          resolve(row && row.count >= 100);
        });
      });
    }
  },
  {
    id: 'save_100kg',
    name: '탄소 절감 영웅',
    description: '누적 100kg의 탄소를 절약했습니다.',
    bonus: 2000,
    check: async (userId, trip) => {
      const sql = `SELECT SUM(saved_emission) AS total_saved FROM trips WHERE user_id = ?`;
      return new Promise((resolve, reject) => {
        db.get(sql, [userId], (err, row) => {
          if (err) return resolve(false);
          resolve(row && row.total_saved >= 100000); // 100kg = 100,000g
        });
      });
    }
  },
  {
    id: 'total_distance_500km',
    name: '장거리 여행자',
    description: '누적 500km를 이동했습니다.',
    bonus: 600,
    check: async (userId, trip) => {
      const sql = `SELECT SUM(distance) AS total_distance FROM trips WHERE user_id = ?`;
      return new Promise((resolve, reject) => {
        db.get(sql, [userId], (err, row) => {
          if (err) return resolve(false);
          resolve(row && row.total_distance >= 500);
        });
      });
    }
  },
  {
    id: 'first_train',
    name: '기차의 달인',
    description: '첫 기차 경로를 검색했습니다.',
    bonus: 50,
    check: async (userId, trip) => {
      return trip.route.transportMode === 'train';
    }
  },
  {
    id: 'first_subway',
    name: '지하철의 달인',
    description: '첫 지하철 경로를 검색했습니다.',
    bonus: 50,
    check: async (userId, trip) => {
      return trip.route.transportMode === 'subway';
    }
  },
];

// 모든 업적을 확인하고, 새로 달성한 업적이 있다면 DB에 저장하고 보너스 포인트를 반환하는 함수
const checkAndAwardAchievements = async (userId, trip) => {
  // 1. 사용자가 이미 달성한 업적 목록을 가져옴
  const getAchievedSql = `SELECT achievement_id FROM user_achievements WHERE user_id = ?`;
  const achieved = await new Promise((resolve, reject) => {
    db.all(getAchievedSql, [userId], (err, rows) => {
      if (err) return resolve([]);
      resolve(rows.map(r => r.achievement_id));
    });
  });

  let totalBonus = 0;
  const newlyAchieved = [];

  // 2. 모든 업적에 대해 달성 조건을 확인
  for (const achievement of achievements) {
    // 이미 달성한 업적은 건너뜀
    if (achieved.includes(achievement.id)) continue;

    const isAchieved = await achievement.check(userId, trip);
    if (isAchieved) {
      totalBonus += achievement.bonus;
      newlyAchieved.push(achievement);
    }
  }

  // 3. 새로 달성한 업적이 있다면 DB에 저장하고 사용자 포인트 업데이트
  if (newlyAchieved.length > 0) {
    const insertSql = `INSERT INTO user_achievements (user_id, achievement_id, date) VALUES (?, ?, ?)`;
    const now = new Date().toISOString();
    
    // 여러 업적을 동시에 달성할 수 있으므로, 각각 저장
    for (const achievement of newlyAchieved) {
      db.run(insertSql, [userId, achievement.id, now], (err) => {
        if (err) console.error(`업적 저장 오류 (${achievement.id}):`, err.message);
        else console.log(`사용자 ${userId}가 업적 '${achievement.name}'을 달성했습니다!`);
      });
    }

    const updateUserSql = `UPDATE users SET points = points + ? WHERE id = ?`;
    db.run(updateUserSql, [totalBonus, userId], (err) => {
      if (err) console.error('업적 보너스 지급 오류:', err.message);
    });
  }

  return newlyAchieved;
};

module.exports = { achievements, checkAndAwardAchievements };
