const express = require('express');
const shortid = require('shortid');
const path = require('path');
const redis = require('redis');
const app = express();
const port = 3000;

// Redis 클라이언트 설정 (데이터베이스 주소, 포트, 비밀번호)
const redisHost = 'svc.sel4.cloudtype.app'; // Redis 호스트 주소
const redisPort = '30153'; // Redis 포트 (기본값은 6379)
const redisPassword = 'hefpum-zozgum-jAspy2'; // Redis 비밀번호

const client = redis.createClient({
    url: `redis://${redisHost}:${redisPort}`,
    password: redisPassword
});

client.on('error', (err) => console.log('Redis Client Error', err));

(async () => {
    await client.connect();
})();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 제공 경로 추가
app.use(express.static(path.join(__dirname, 'public')));

// URL 단축 엔드포인트
app.post('/shorten', async (req, res) => {
    const originalUrl = req.body.url;
    const shortUrl = shortid.generate();
    await client.set(`url:${shortUrl}`, originalUrl); // URL 데이터를 Redis에 저장
    res.send({ shortUrl });
});

// 단축 URL 리디렉션 엔드포인트
app.get('/:shortUrl', async (req, res) => {
    const shortUrl = req.params.shortUrl;
    const originalUrl = await client.get(`url:${shortUrl}`); // Redis에서 URL 데이터 가져오기
    if (originalUrl) {
        res.redirect(originalUrl);
    } else {
        res.status(404).send('URL 주소를 찾을 수 없어요');
    }
});

app.listen(port, () => {
    console.log(`URL Shortener app listening at http://localhost:${port}`);
});