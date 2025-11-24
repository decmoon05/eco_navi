const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // 헤더에서 토큰 추출
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (token == null) {
    return res.sendStatus(401); // 토큰이 없음
  }

  // 토큰 검증
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403); // 토큰이 유효하지 않음
    }
    req.user = user;
    next(); // 다음 미들웨어 또는 API 로직으로 이동
  });
};

module.exports = authMiddleware;
