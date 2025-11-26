const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 데이터베이스 경로 설정 (환경 변수 또는 기본값)
// 클라우드 배포 시 Persistent Disk 경로 사용
let dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'database.db');

// 디렉토리가 없으면 생성 (Render Persistent Disk 등)
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 데이터베이스 파일에 연결 (없으면 새로 생성)
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('데이터베이스 연결 오류:', err.message);
  } else {
    console.log('SQLite 데이터베이스에 성공적으로 연결되었습니다.');
    // 데이터베이스가 성공적으로 연결되면 테이블 생성
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )`, (err) => {
      if (err) {
        console.error('users 테이블 생성 오류:', err.message);
      } else {
        console.log('users 테이블이 성공적으로 생성되거나 이미 존재합니다.');
        // users 테이블에 points 컬럼 추가 (이미 존재하면 오류 무시)
        db.run(`ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('points 컬럼 추가 오류:', err.message);
          }
        });

        // 월간 목표 관련 컬럼 추가
        db.run(`ALTER TABLE users ADD COLUMN monthly_goal INTEGER DEFAULT 10000`, (err) => { // 기본 목표 10kg
          if (err && !err.message.includes('duplicate column name')) {
            console.error('monthly_goal 컬럼 추가 오류:', err.message);
          }
        });
        db.run(`ALTER TABLE users ADD COLUMN goal_achieved_month TEXT`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('goal_achieved_month 컬럼 추가 오류:', err.message);
          }
        });
        db.run(`ALTER TABLE users ADD COLUMN vehicle_type TEXT`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('vehicle_type 컬럼 추가 오류:', err.message);
          }
        });
        // 관리자 권한 컬럼 추가
        db.run(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('is_admin 컬럼 추가 오류:', err.message);
          }
        });
      }
    });

    // 활동 기록을 저장할 trips 테이블 생성
    db.run(`CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      origin_name TEXT NOT NULL,
      destination_name TEXT NOT NULL,
      distance REAL NOT NULL,
      duration INTEGER NOT NULL,
      transport_mode TEXT NOT NULL,
      total_emission REAL NOT NULL,
      saved_emission REAL NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`, (err) => {
      if (err) {
        console.error('trips 테이블 생성 오류:', err.message);
      } else {
        console.log('trips 테이블이 성공적으로 생성되거나 이미 존재합니다.');
      }
    });

    // 사용자가 달성한 업적을 저장할 테이블
    db.run(`CREATE TABLE IF NOT EXISTS user_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      achievement_id TEXT NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, achievement_id)
    )`, (err) => {
      if (err) {
        console.error('user_achievements 테이블 생성 오류:', err.message);
      } else {
        console.log('user_achievements 테이블이 성공적으로 생성되거나 이미 존재합니다.');
      }
    });

    // 포인트 교환 상품 테이블
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        points_required INTEGER NOT NULL,
        icon TEXT
      )`, (err) => {
        if (err) return console.error('products 테이블 생성 오류:', err.message);
        console.log('products 테이블이 성공적으로 생성되거나 이미 존재합니다.');

        // 샘플 상품 추가 (테이블이 비어 있을 경우에만)
        db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
          if (row.count === 0) {
            const stmt = db.prepare("INSERT INTO products (name, description, points_required, icon) VALUES (?, ?, ?, ?)");
            stmt.run('편의점 상품권 1,000원', '전국 편의점에서 사용 가능한 모바일 상품권', 1000, '🏪');
            stmt.run('커피 기프티콘', '제휴 카페에서 아메리카노 한 잔', 3000, '☕');
            stmt.run('나무 한 그루 심기', '환경 단체를 통해 내 이름으로 나무 한 그루를 심습니다', 5000, '🌳');
            stmt.finalize((err) => {
              if (!err) console.log('샘플 상품이 추가되었습니다.');
            });
          }
        });
      });

      // 사용자-상품 교환 기록 테이블
      db.run(`CREATE TABLE IF NOT EXISTS user_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        exchange_date TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      )`, (err) => {
        if (err) console.error('user_products 테이블 생성 오류:', err.message);
        else console.log('user_products 테이블이 성공적으로 생성되거나 이미 존재합니다.');
      });

      // 사용자 퀘스트 진행 상황 테이블
      db.run(`CREATE TABLE IF NOT EXISTS user_quests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        quest_id TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        target INTEGER NOT NULL,
        status TEXT DEFAULT 'active', -- active, completed, rewarded
        last_updated TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id, quest_id)
      )`, (err) => {
        if (err) console.error('user_quests 테이블 생성 오류:', err.message);
        else console.log('user_quests 테이블이 성공적으로 생성되거나 이미 존재합니다.');
      });
    });
  }
});

module.exports = db;
