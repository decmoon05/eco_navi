const db = require('./database.js');

// 모든 퀘스트 목록과 관련 로직 정의
const quests = [
  {
    id: 'weekly_walk_3',
    name: '주간 걷기 챌린지',
    description: '이번 주에 3번 이상 도보 이동하기',
    bonus: 150,
    target: 3,
    type: 'weekly', // 주간 퀘스트
    updateProgress: (trip) => {
      // 도보 이동일 경우 1씩 증가
      return trip.route.transportMode === 'walking' ? 1 : 0;
    }
  },
  {
    id: 'repeatable_bike_20km',
    name: '자전거 라이더',
    description: '자전거로 20km 이동하기 (반복 가능)',
    bonus: 200,
    target: 20, // km
    type: 'repeatable', // 반복 퀘스트
    updateProgress: (trip) => {
      // 자전거 이동일 경우 이동 거리를 더함
      return trip.route.transportMode === 'bicycle' ? trip.route.distance : 0;
    }
  },
  // TODO: 더 많은 퀘스트 추가
];

// 사용자의 퀘스트 상태를 확인하고 업데이트하는 함수
const updateQuests = async (userId, trip) => {
  const now = new Date();
  const todayStr = now.toISOString();

  for (const quest of quests) {
    const progressIncrement = quest.updateProgress(trip);
    if (progressIncrement === 0) continue; // 이 퀘스트와 관련 없는 활동

    // 1. 현재 퀘스트 진행 상황을 DB에서 가져옴
    const getSql = `SELECT * FROM user_quests WHERE user_id = ? AND quest_id = ?`;
    const userQuest = await new Promise((resolve, reject) => {
      db.get(getSql, [userId, quest.id], (err, row) => err ? reject(err) : resolve(row));
    });

    if (userQuest) {
      // 이미 완료된 퀘스트는 건너뜀
      if (userQuest.status === 'rewarded') continue;

      // TODO: 주간 퀘스트 초기화 로직 추가

      const newProgress = userQuest.progress + progressIncrement;
      if (newProgress >= quest.target) {
        // 목표 달성!
        const updateSql = `UPDATE user_quests SET progress = ?, status = 'completed', last_updated = ? WHERE id = ?`;
        db.run(updateSql, [newProgress, todayStr, userQuest.id]);
        console.log(`사용자 ${userId}가 퀘스트 '${quest.name}'을 완료했습니다!`);
      } else {
        // 진행 상황 업데이트
        const updateSql = `UPDATE user_quests SET progress = ?, last_updated = ? WHERE id = ?`;
        db.run(updateSql, [newProgress, todayStr, userQuest.id]);
      }

    } else {
      // 새로운 퀘스트 시작
      const newProgress = progressIncrement;
      const status = newProgress >= quest.target ? 'completed' : 'active';
      const insertSql = `INSERT INTO user_quests (user_id, quest_id, progress, target, status, last_updated) VALUES (?, ?, ?, ?, ?, ?)`;
      db.run(insertSql, [userId, quest.id, newProgress, quest.target, status, todayStr]);
      if (status === 'completed') {
        console.log(`사용자 ${userId}가 퀘스트 '${quest.name}'을 완료했습니다!`);
      }
    }
  }
};

module.exports = { quests, updateQuests };
