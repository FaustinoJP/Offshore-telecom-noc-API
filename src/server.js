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



app.get('/bootstrap-noc', async (req, res) => {
  try {

    await db.query(`
      CREATE TABLE IF NOT EXISTS sites (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        latitude FLOAT,
        longitude FLOAT,
        status TEXT DEFAULT 'healthy',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id SERIAL PRIMARY KEY,
        site_id INTEGER REFERENCES sites(id),
        name TEXT,
        vendor TEXT,
        model TEXT,
        status TEXT DEFAULT 'online'
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS links (
        id SERIAL PRIMARY KEY,
        source_site INTEGER REFERENCES sites(id),
        target_site INTEGER REFERENCES sites(id),
        capacity INTEGER,
        status TEXT DEFAULT 'up'
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS alarms (
        id SERIAL PRIMARY KEY,
        site_id INTEGER REFERENCES sites(id),
        severity TEXT,
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id SERIAL PRIMARY KEY,
        alarm_id INTEGER REFERENCES alarms(id),
        status TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    res.json({ success: true, message: "NOC schema created" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});




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
