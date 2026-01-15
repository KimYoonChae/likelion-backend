require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();

// CORS 설정 (프론트엔드 주소 허용)
app.use(cors({
  origin: 'http://localhost:3000'  // 프론트엔드 로컬 주소
}));

app.use(express.json());

// 루트 경로 (서버 작동 확인용)
app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// 1. Google OAuth - 코드를 받아서 JWT 토큰 발급
app.post('/auth/google', async (req, res) => {
  try {
    const { code } = req.body;
    
    console.log('Received code:', code);
    
    // Google에서 access token 받기
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.REDIRECT_URI,
      grant_type: 'authorization_code'
    });
    
    const { access_token } = tokenResponse.data;
    console.log('Got access token');
    
    // Google에서 사용자 정보 받기
    const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    
    const userInfo = userResponse.data;
    console.log('User info:', userInfo);
    
    // JWT 토큰 생성 (3분 유효)
    const jwtToken = jwt.sign(
      { 
        email: userInfo.email, 
        name: userInfo.name,
        picture: userInfo.picture 
      },
      process.env.JWT_SECRET,
      { expiresIn: '3m' }
    );
    
    res.json({ token: jwtToken, user: userInfo });
    
  } catch (error) {
    console.error('Auth error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Authentication failed',
      details: error.response?.data || error.message 
    });
  }
});

// 2. JWT 토큰 검증 테스트
app.get('/test', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      console.log('No authorization header');
      return res.json(0);
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      console.log('No token found');
      return res.json(0);
    }
    
    // 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verified for user:', decoded.email);
    
    res.json(1); // 인증 성공
    
  } catch (error) {
    console.log('Token verification failed:', error.message);
    res.json(0); // 인증 실패 (만료 또는 유효하지 않음)
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
