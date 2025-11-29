/**
 * 데이터베이스 동기화 스크립트
 * 
 * 사용법:
 *   node sync-database.js <source-url> <target-url> <admin-username> <admin-password>
 * 
 * 예시:
 *   # 로컬 → 클라우드
 *   node sync-database.js http://localhost:3001 https://econavi-production.up.railway.app admin 3297
 * 
 *   # 클라우드 → 로컬
 *   node sync-database.js https://econavi-production.up.railway.app http://localhost:3001 admin 3297
 */

const https = require('https');
const http = require('http');

// 명령줄 인수 파싱
const args = process.argv.slice(2);
if (args.length < 4) {
  console.error('사용법: node sync-database.js <source-url> <target-url> <admin-username> <admin-password>');
  console.error('예시: node sync-database.js http://localhost:3001 https://econavi-production.up.railway.app admin 3297');
  process.exit(1);
}

const [sourceUrl, targetUrl, adminUsername, adminPassword] = args;

// HTTP/HTTPS 요청 헬퍼
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, data: jsonData });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${jsonData.message || data}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, data });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// 로그인하여 토큰 가져오기
async function getAuthToken(url, username, password) {
  console.log(`[${url}] 로그인 중...`);
  const response = await makeRequest(`${url}/login`, {
    method: 'POST',
    body: { username, password },
  });
  return response.data.token;
}

// 데이터베이스 백업
async function backupDatabase(url, token) {
  console.log(`[${url}] 데이터베이스 백업 중...`);
  const response = await makeRequest(`${url}/admin/backup`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
}

// 데이터베이스 복원
async function restoreDatabase(url, token, backupData) {
  console.log(`[${url}] 데이터베이스 복원 중...`);
  const response = await makeRequest(`${url}/admin/restore`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: { data: backupData.data },
  });
  return response.data;
}

// 메인 동기화 함수
async function syncDatabase() {
  try {
    console.log('='.repeat(60));
    console.log('데이터베이스 동기화 시작');
    console.log(`소스: ${sourceUrl}`);
    console.log(`대상: ${targetUrl}`);
    console.log('='.repeat(60));

    // 1. 소스 서버에서 백업
    const sourceToken = await getAuthToken(sourceUrl, adminUsername, adminPassword);
    const backupData = await backupDatabase(sourceUrl, sourceToken);
    
    console.log(`백업 완료: ${Object.keys(backupData.data).length}개 테이블`);
    Object.keys(backupData.data).forEach((table) => {
      console.log(`  - ${table}: ${backupData.data[table].length}개 레코드`);
    });

    // 2. 대상 서버에 복원
    const targetToken = await getAuthToken(targetUrl, adminUsername, adminPassword);
    await restoreDatabase(targetUrl, targetToken, backupData);

    console.log('='.repeat(60));
    console.log('✅ 데이터베이스 동기화 완료!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ 동기화 실패:', error.message);
    process.exit(1);
  }
}

// 실행
syncDatabase();

