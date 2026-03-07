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





app.get('/seed-noc', async (req, res) => {
  try {
    await db.query(`DELETE FROM incidents`);
    await db.query(`DELETE FROM alarms`);
    await db.query(`DELETE FROM links`);
    await db.query(`DELETE FROM devices`);
    await db.query(`DELETE FROM sites`);

    await db.query(`
      INSERT INTO sites (name, latitude, longitude, status)
      VALUES
        ('Luanda Core', -8.8383, 13.2344, 'healthy'),
        ('Soyo Hub', -6.1349, 12.3689, 'healthy'),
        ('Cabinda Edge', -5.5600, 12.1900, 'degraded'),
        ('Offshore Platform A', -8.9201, 13.1821, 'healthy'),
        ('Offshore Platform B', -9.1500, 12.9500, 'down'),
        ('Benguela POP', -12.5763, 13.4055, 'healthy'),
        ('Lobito Relay', -12.3481, 13.5456, 'healthy'),
        ('Namibe Station', -15.1961, 12.1522, 'degraded');
    `);

    await db.query(`
      INSERT INTO devices (site_id, name, vendor, model, status)
      VALUES
        (1, 'Core Router 1', 'Cisco', 'ASR1001-X', 'online'),
        (1, 'Core Switch 1', 'Cisco', 'Catalyst 9500', 'online'),
        (2, 'Aggregation Router', 'Huawei', 'NE40E', 'online'),
        (3, 'Microwave IDU', 'Ceragon', 'IP-20', 'warning'),
        (4, 'VSAT Modem A', 'iDirect', 'Evolution X7', 'online'),
        (4, 'Access Switch', 'Cisco', 'Catalyst 9300', 'online'),
        (5, 'VSAT Modem B', 'iDirect', 'Evolution X7', 'offline'),
        (5, 'Edge Firewall', 'Fortinet', 'FortiGate 100F', 'offline'),
        (6, 'Aggregation Switch', 'Huawei', 'S6730', 'online'),
        (7, 'Microwave ODU', 'Ceragon', 'IP-50', 'online'),
        (8, 'Relay Router', 'Juniper', 'MX204', 'warning');
    `);

    await db.query(`
      INSERT INTO links (source_site, target_site, capacity, status)
      VALUES
        (1, 2, 10000, 'up'),
        (2, 3, 5000, 'degraded'),
        (2, 4, 2000, 'up'),
        (2, 5, 2000, 'down'),
        (1, 6, 5000, 'up'),
        (6, 7, 2000, 'up'),
        (7, 8, 1000, 'degraded');
    `);

    await db.query(`
      INSERT INTO alarms (site_id, severity, message)
      VALUES
        (3, 'major', 'Microwave packet loss above threshold'),
        (5, 'critical', 'VSAT link unavailable'),
        (5, 'critical', 'Firewall unreachable'),
        (8, 'warning', 'Latency jitter increasing');
    `);

    await db.query(`
      INSERT INTO incidents (alarm_id, status)
      VALUES
        (1, 'investigating'),
        (2, 'open'),
        (3, 'open'),
        (4, 'monitoring');
    `);

    res.json({ success: true, message: 'NOC sample data inserted' });
  } catch (error) {
    console.error('SEED NOC ERROR:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
