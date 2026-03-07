require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const internalRoutesFactory = require('./routes/internal');

const app = express();
const server = http.createServer(app);





const db = require('./db');

app.get('/bootstrap-users', async (req, res) => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      INSERT INTO users (email, password, role)
      VALUES (
        'admin@nocsystem.local',
        '$2a$10$XFeVQ9uQH9H6y1t7yPqF8OqkX5uXkR4c6p9hL1Yy6n3Yk1Kp6vG7K',
        'admin'
      )
      ON CONFLICT (email) DO NOTHING;
    `);

    return res.json({ success: true, message: 'users bootstrapped' });
  } catch (error) {
    console.error('BOOTSTRAP ERROR:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});


const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.options('*', cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', apiRoutes);
app.use('/api/internal', internalRoutesFactory(io));

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);
});

const port = process.env.PORT || 4000;
server.listen(port, () => console.log(`API running on ${port}`));



