require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();

app.use(cors({
  origin: '*'  // 렌더 배포 후 프론트 URL로 바꾸기
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// id_token 받아서 구글에 검증 후 JWT 발급
app.post('/login', async (req, res) => {
  try {
    const { idToken } = req.body;
    console.log('Received idToken:', idToken ? '있음' : '없음');

    // 구글에 id_token 검증 요청
    const response = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );

    const userInfo = response.data;
    console.log('User info:', userInfo.email);

    // JWT 발급
    const jwtToken = jwt.sign(
      {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      },
      process.env.JWT_SECRET,
      { expiresIn: '3m' }
    );

    res.json({ token: jwtToken, user: userInfo });

  } catch (error) {
    console.error('Auth error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// JWT 검증
app.get('/test', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.json(0);

    const token = authHeader.split(' ')[1];
    if (!token) return res.json(0);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verified:', decoded.email);
    res.json(1);

  } catch (error) {
    console.log('Token verification failed:', error.message);
    res.json(0);
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
