const db = require('./database.js');

/**
 * 퀘스트 시스템
 * 
 * 퀘스트 타입:
 * - weekly: 주간 퀘스트 (매주 자동 초기화)
 * - monthly: 월간 퀘스트 (매월 자동 초기화)
 * - repeatable: 반복 퀘스트 (완료 후에도 계속 진행 가능)
 * 
 * 퀘스트 구조:
 * - id: 고유 식별자
 * - name: 퀘스트 이름
 * - description: 퀘스트 설명
 * - bonus: 완료 시 보너스 포인트
 * - target: 목표 값
 * - type: 퀘스트 타입
 * - updateProgress: 진행도 업데이트 함수 (trip 객체를 받아 진행도 증가량 반환)
 */

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
  {
    id: 'weekly_public_transit_5',
    name: '주간 대중교통 이용',
    description: '이번 주에 5번 이상 대중교통 이용하기',
    bonus: 250,
    target: 5,
    type: 'weekly',
    updateProgress: (trip) => {
      // 대중교통 이용일 경우 1씩 증가
      const publicTransitModes = ['bus', 'subway', 'train'];
      return publicTransitModes.includes(trip.route.transportMode) ? 1 : 0;
    }
  },
  {
    id: 'monthly_carbon_save_5kg',
    name: '월간 탄소 절감 목표',
    description: '이번 달에 5kg의 탄소를 절약하기',
    bonus: 500,
    target: 5000, // 5kg = 5000g
    type: 'monthly',
    updateProgress: (trip) => {
      // 절약한 탄소량을 더함
      return trip.emission?.savedEmission || 0;
    }
  },
  {
    id: 'weekly_no_car_7',
    name: '주간 무차주',
    description: '이번 주에 7일 연속 자동차를 사용하지 않기',
    bonus: 300,
    target: 7,
    type: 'weekly',
    updateProgress: (trip) => {
      // 자동차를 사용하지 않은 경우 1씩 증가
      const carModes = ['car', 'electric_car', 'hybrid', 'hydrogen', 'motorcycle', 'electric_motorcycle'];
      if (carModes.includes(trip.route.transportMode)) {
        return -999; // 자동차 사용 시 퀘스트 실패 (리셋 필요)
      }
      return 1;
    }
  },
  {
    id: 'repeatable_walk_50km',
    name: '걷기 마라톤',
    description: '도보로 누적 50km 이동하기 (반복 가능)',
    bonus: 400,
    target: 50, // km
    type: 'repeatable',
    updateProgress: (trip) => {
      return trip.route.transportMode === 'walking' ? trip.route.distance : 0;
    }
  },
  {
    id: 'weekly_bike_30km',
    name: '주간 자전거 챌린지',
    description: '이번 주에 자전거로 30km 이동하기',
    bonus: 350,
    target: 30, // km
    type: 'weekly',
    updateProgress: (trip) => {
      return trip.route.transportMode === 'bicycle' ? trip.route.distance : 0;
    }
  },
  {
    id: 'monthly_eco_trips_20',
    name: '월간 친환경 이동',
    description: '이번 달에 친환경 이동 수단(도보/자전거/대중교통)으로 20번 이동하기',
    bonus: 400,
    target: 20,
    type: 'monthly',
    updateProgress: (trip) => {
      const ecoModes = ['walking', 'bicycle', 'bus', 'subway', 'train'];
      return ecoModes.includes(trip.route.transportMode) ? 1 : 0;
    }
  },
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

      // 주간/월간 퀘스트 초기화 로직
      if (quest.type === 'weekly') {
        const lastUpdated = new Date(userQuest.last_updated);
        const daysSinceUpdate = Math.floor((now - lastUpdated) / (1000 * 60 * 60 * 24));
        
        // 마지막 업데이트로부터 7일 이상 지났으면 주간 퀘스트 초기화
        if (daysSinceUpdate >= 7) {
          // 주간 퀘스트 리셋: 진행도 0으로 초기화, 상태를 active로 변경
          const resetSql = `UPDATE user_quests SET progress = 0, status = 'active', last_updated = ? WHERE id = ?`;
          db.run(resetSql, [todayStr, userQuest.id]);
          console.log(`사용자 ${userId}의 주간 퀘스트 '${quest.name}'이 초기화되었습니다.`);
          
          // 초기화 후 새로운 진행도로 시작
          const newProgress = progressIncrement;
          if (newProgress >= quest.target) {
            const updateSql = `UPDATE user_quests SET progress = ?, status = 'completed', last_updated = ? WHERE id = ?`;
            db.run(updateSql, [newProgress, todayStr, userQuest.id]);
            console.log(`사용자 ${userId}가 퀘스트 '${quest.name}'을 완료했습니다!`);
          } else {
            const updateSql = `UPDATE user_quests SET progress = ?, last_updated = ? WHERE id = ?`;
            db.run(updateSql, [newProgress, todayStr, userQuest.id]);
          }
          continue; // 이미 처리했으므로 다음 퀘스트로
        }
      } else if (quest.type === 'monthly') {
        const lastUpdated = new Date(userQuest.last_updated);
        const lastMonth = lastUpdated.getMonth();
        const lastYear = lastUpdated.getFullYear();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // 다른 달이면 월간 퀘스트 초기화
        if (lastMonth !== currentMonth || lastYear !== currentYear) {
          const resetSql = `UPDATE user_quests SET progress = 0, status = 'active', last_updated = ? WHERE id = ?`;
          db.run(resetSql, [todayStr, userQuest.id]);
          console.log(`사용자 ${userId}의 월간 퀘스트 '${quest.name}'이 초기화되었습니다.`);
          
          // 초기화 후 새로운 진행도로 시작
          const newProgress = progressIncrement;
          if (newProgress >= quest.target) {
            const updateSql = `UPDATE user_quests SET progress = ?, status = 'completed', last_updated = ? WHERE id = ?`;
            db.run(updateSql, [newProgress, todayStr, userQuest.id]);
            console.log(`사용자 ${userId}가 퀘스트 '${quest.name}'을 완료했습니다!`);
          } else {
            const updateSql = `UPDATE user_quests SET progress = ?, last_updated = ? WHERE id = ?`;
            db.run(updateSql, [newProgress, todayStr, userQuest.id]);
          }
          continue;
        }
      }

      // 진행도가 음수인 경우 (예: 무차주 퀘스트에서 자동차 사용)
      if (progressIncrement < 0) {
        // 퀘스트 실패: 진행도 0으로 리셋
        const resetSql = `UPDATE user_quests SET progress = 0, last_updated = ? WHERE id = ?`;
        db.run(resetSql, [todayStr, userQuest.id]);
        console.log(`사용자 ${userId}의 퀘스트 '${quest.name}'이 실패하여 초기화되었습니다.`);
        continue;
      }

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
