const jwt = require('jsonwebtoken');

/**
 * 관리자 권한 체크 미들웨어
 * 인증된 사용자 중에서도 username이 'admin'인 경우만 접근 허용
 * 
 * 사용법: app.get('/admin/...', authMiddleware, adminMiddleware, handler)
 * authMiddleware가 먼저 실행되어 req.user를 설정한 후, 이 미들웨어가 admin 체크를 수행합니다.
 */
const adminMiddleware = (req, res, next) => {
  // authMiddleware가 이미 실행되어 req.user가 설정되어 있어야 함
  if (!req.user) {
    return res.status(401).json({ message: '인증이 필요합니다.' });
  }

  // 인증된 사용자의 username 확인
  const username = req.user.username;
  
  // username이 'admin'인 경우만 관리자로 인식
  if (username === 'admin') {
    next(); // 관리자 권한 있음
  } else {
    res.status(403).json({ message: '관리자 권한이 필요합니다.' });
  }
};

module.exports = adminMiddleware;

