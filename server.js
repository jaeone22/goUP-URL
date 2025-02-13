const express = require('express');
const shortid = require('shortid');
const path = require('path');
const redis = require('redis');
const { body, validationResult } = require('express-validator');
const app = express();
const port = 3000;

// dotenv 패키지 추가
require('dotenv').config();

// Redis 클라이언트 설정 (환경 변수 사용)
const redisHost = process.env.REDIS_HOST; // Redis 호스트 주소
const redisPort = process.env.REDIS_PORT; // Redis 포트
const redisPassword = process.env.REDIS_PASSWORD; // Redis 비밀번호

const client = redis.createClient({
    url: `redis://${redisHost}:${redisPort}`,
    password: redisPassword
});

(async () => {
    await client.connect();
})();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 언어에 따라 정적 파일 제공 경로 설정
app.use((req, res, next) => {
    express.static(path.join(__dirname, 'public'))(req, res, next);
});

// URL 단축 엔드포인트
app.post('/shorten', [
    body('url').isURL(),
    body('url').matches(/^[a-zA-Z0-9\-._~:/?#@!$&'()*+,;=]*$/)
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400); // 에러 메시지를 JSON 형식으로 반환
    }

    const originalUrl = req.body.url;
    const shortUrl = shortid.generate();
    await client.set(`url:${shortUrl}`, originalUrl); // URL 데이터를 Redis에 저장
    res.send({ shortUrl }); // 단축된 URL을 JSON 형식으로 반환
});

app.get('/:shortUrl', async (req, res) => {
    const shortUrl = req.params.shortUrl;
    const originalUrl = await client.get(`url:${shortUrl}`); // Redis에서 URL 데이터 가져오기
    if (originalUrl) {
        // originalUrl이 http 또는 https로 시작하지 않으면 추가
        const finalUrl = originalUrl.startsWith('http') ? originalUrl : `https://${originalUrl}`;
        res.redirect(finalUrl);
    } else {
        res.status(404);
    }
});

app.listen(port, () => {
    console.log(`Server Started! http://localhost:${port}`);
});