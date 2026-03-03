require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const todoRouter = require('./src/routes/todos');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS_ORIGINS 환경변수(쉼표 구분)를 이용한 동적 CORS 허용
const rawOrigins = process.env.CORS_ORIGINS || '';
const allowedOrigins = rawOrigins
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

app.use(
  cors({
    origin(origin, callback) {
      // 비브라우저 요청 또는 same-origin 요청(origin 없음)은 허용
      if (!origin) {
        return callback(null, true);
      }

      // 환경변수에 아무 값도 없으면 개발 편의를 위해 모두 허용
      if (allowedOrigins.length === 0) {
        console.warn('[CORS] 허용 origin 목록이 비어 있습니다. 모든 origin을 허용합니다.');
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`[CORS] 차단된 origin: ${origin}. 허용 목록: ${allowedOrigins.join(', ')}`);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  })
);

// JSON body 파싱
app.use(express.json());

// 헬스 체크 엔드포인트
app.get('/health', (req, res) => {
  return res.status(200).json({
    success: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Todo 라우터
app.use('/api/todos', todoRouter);

// JSON 파싱 및 공통 에러 핸들러
// - JSON 파싱 실패(SyntaxError) 처리
// - 운영 환경(production)에서는 스택 정보를 응답에 포함하지 않음
app.use((err, req, res, next) => {
  // JSON 파싱 에러
  if (err instanceof SyntaxError && 'body' in err) {
    console.error('JSON 파싱 오류:', err.message);
    return res.status(400).json({
      success: false,
      message: '잘못된 JSON 형식입니다.',
    });
  }

  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  if (status === 500) {
    console.error('서버 내부 오류:', err.message);
    if (!isProd && err.stack) {
      console.error(err.stack);
    }
  }

  const message =
    status === 500 && isProd
      ? '서버 내부 오류가 발생했습니다.'
      : err.message || '서버 내부 오류가 발생했습니다.';

  return res.status(status).json({
    success: false,
    message,
  });
});

// MongoDB 연결 (환경 변수 또는 로컬 기본값)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/todo-backend';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB 연결 성공');
    app.listen(PORT, () => {
      console.log(`서버가 포트 ${PORT}에서 실행 중 입니다. (PORT=${PORT})`);
    });
  })
  .catch((err) => {
    console.error('MongoDB 연결 실패:', err.message);
    // 운영 안정성을 위해 프로세스를 종료하여 재시작(예: Heroku dyno restart)을 유도
    process.exit(1);
  });

