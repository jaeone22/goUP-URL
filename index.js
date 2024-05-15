const express = require('express');
const shortid = require('shortid');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

const urlDatabasePath = path.join(__dirname, 'urlDatabase.json');
let urlDatabase = {};

// 서버 시작 시 데이터베이스 로드
if (fs.existsSync(urlDatabasePath)) {
    const data = fs.readFileSync(urlDatabasePath);
    urlDatabase = JSON.parse(data);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 제공 경로 추가
app.use(express.static(path.join(__dirname, 'public')));

// URL 단축 엔드포인트
app.post('/shorten', (req, res) => {
    const originalUrl = req.body.url;
    const shortUrl = shortid.generate();
    urlDatabase[shortUrl] = originalUrl;
    fs.writeFileSync(urlDatabasePath, JSON.stringify(urlDatabase)); // 데이터베이스 저장
    res.send({ shortUrl });
});

// 단축 URL 리디렉션 엔드포인트
app.get('/:shortUrl', (req, res) => {
    const shortUrl = req.params.shortUrl;
    const originalUrl = urlDatabase[shortUrl];
    if (originalUrl) {
        res.redirect(originalUrl);
    } else {
        res.status(404).send('URL 주소를 찾을 수 없어요');
    }
});

app.listen(port, () => {
    console.log(`URL Shortener app listening at http://localhost:${port}`);
});
