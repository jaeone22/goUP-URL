const express = require('express');
const shortid = require('shortid');
const path = require('path');
const redis = require('redis');
const { body, validationResult } = require('express-validator');
const app = express();
const port = 3000;

require('dotenv').config();

// Redis 클라이언트
const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT; 
const redisPassword = process.env.REDIS_PASSWORD; 

const client = redis.createClient({
    url: `redis://${redisHost}:${redisPort}`,
    password: redisPassword,
    socket: {
        connectTimeout: 10000, // 연결 타임아웃 10초
    }
});

const connectWithRetry = async () => {
    while (true) {
        try {
            await client.connect();
            console.log('Redis client connected');
            break;
        } catch (error) {
            console.error('Redis connection error, retrying in 5 seconds:', error);
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5초 후 재시도
        }
    }
};

connectWithRetry();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    express.static(path.join(__dirname, 'public'))(req, res, next);
});

// URL 단축 엔드포인트
app.post('/shorten', [
    body('url').isURL()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400);
    }

    try {
        const originalUrl = req.body.url;
        const shortUrl = shortid.generate();
        await client.set(`url:${shortUrl}`, originalUrl); // URL 데이터를 Redis에 저장
        res.send({ shortUrl }); // 단축된 URL을 JSON 형식으로 반환
    } catch {
        res.status(500).send();
    }
});

app.get('/:shortUrl', async (req, res) => {
    const shortUrl = req.params.shortUrl;
    try {
        const originalUrl = await client.get(`url:${shortUrl}`); // Redis에서 URL 데이터 가져오기
        if (originalUrl) {
            const finalUrl = originalUrl.startsWith('http') ? originalUrl : `https://${originalUrl}`;
            res.redirect(finalUrl);
        } else {
            res.status(404);
        }
    } catch {
        res.status(500).send();
    }
});

app.listen(port, () => {
    console.log(`Server Started! http://localhost:${port}`);
});