const db = require('./database.js');

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
  // TODO: 더 많은 업적 추가
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
