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


app.get('/bootstrap-full-schema', async (req, res) => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS sites (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        region TEXT NOT NULL,
        technology TEXT NOT NULL,
        status TEXT NOT NULL,
        availability NUMERIC(5,2) DEFAULT 99.0,
        active_alarms INTEGER DEFAULT 0,
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS links (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        source_site_id TEXT NOT NULL,
        target_site_id TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        utilization INTEGER DEFAULT 0,
        latency INTEGER DEFAULT 0
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        event TEXT NOT NULL,
        message TEXT NOT NULL,
        event_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS alarms (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        severity TEXT NOT NULL,
        state TEXT NOT NULL,
        equipment TEXT,
        message TEXT NOT NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        title TEXT NOT NULL,
        priority TEXT NOT NULL,
        status TEXT NOT NULL,
        owner_name TEXT,
        opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    return res.json({ success: true, message: 'Full NOC schema created' });
  } catch (error) {
    console.error('BOOTSTRAP FULL SCHEMA ERROR:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});




app.get('/seed-full-noc', async (req, res) => {
  try {
    await db.query(`DELETE FROM incidents`);
    await db.query(`DELETE FROM alarms`);
    await db.query(`DELETE FROM events`);
    await db.query(`DELETE FROM links`);
    await db.query(`DELETE FROM sites`);

    await db.query(`
      INSERT INTO sites (id, name, region, technology, status, availability, active_alarms, lat, lng, last_seen)
      VALUES
        ('site-001', 'MBA-VSAT-03', 'Offshore', 'VSAT', 'Degraded', 96.80, 2, -8.9201, 13.1821, CURRENT_TIMESTAMP),
        ('site-002', 'QLM-MW-01', 'North', 'Microwave', 'Down', 92.40, 3, -8.8383, 13.2344, CURRENT_TIMESTAMP),
        ('site-003', 'GTP-FO-07', 'Central', 'Fiber', 'Healthy', 99.40, 0, -8.8147, 13.2302, CURRENT_TIMESTAMP),
        ('site-004', 'LDA-LTE-12', 'South', 'LTE', 'Healthy', 99.10, 1, -8.8791, 13.2617, CURRENT_TIMESTAMP),
        ('site-005', 'SON-MW-04', 'North', 'Microwave', 'Healthy', 99.80, 0, -6.1349, 12.3689, CURRENT_TIMESTAMP),
        ('site-006', 'CAB-FO-02', 'West', 'Fiber', 'Healthy', 99.90, 0, -5.5600, 12.1900, CURRENT_TIMESTAMP),
        ('site-007', 'KBL-VSAT-09', 'Offshore', 'VSAT', 'Degraded', 97.10, 1, -9.1500, 12.9500, CURRENT_TIMESTAMP),
        ('site-008', 'BGT-LTE-03', 'South', 'LTE', 'Healthy', 99.20, 0, -12.5763, 13.4055, CURRENT_TIMESTAMP);
    `);

    await db.query(`
      INSERT INTO links (id, name, source_site_id, target_site_id, type, status, utilization, latency)
      VALUES
        ('topo-link-002', 'GTP to MBA', 'site-003', 'site-001', 'VSAT', 'Degraded', 77, 620),
        ('topo-link-003', 'GTP to QLM', 'site-003', 'site-002', 'Microwave', 'Down', 22, 0),
        ('topo-link-004', 'GTP to LDA', 'site-003', 'site-004', 'LTE', 'Healthy', 44, 19),
        ('link-005', 'SON to GTP', 'site-005', 'site-003', 'Microwave', 'Healthy', 35, 12),
        ('link-006', 'CAB to GTP', 'site-006', 'site-003', 'Fiber', 'Healthy', 61, 4),
        ('link-007', 'KBL to GTP', 'site-007', 'site-003', 'VSAT', 'Degraded', 69, 540),
        ('link-008', 'BGT to LDA', 'site-008', 'site-004', 'LTE', 'Healthy', 28, 25);
    `);

    await db.query(`
      INSERT INTO events (id, event, message, event_time)
      VALUES
        ('evt-001', 'alarm.created', 'QLM-MW-01: No heartbeat', CURRENT_TIMESTAMP),
        ('evt-002', 'site.status.changed', 'MBA-VSAT-03 changed to Degraded', CURRENT_TIMESTAMP),
        ('evt-003', 'link.status.changed', 'GTP to QLM changed to Down', CURRENT_TIMESTAMP),
        ('evt-004', 'alarm.created', 'LDA-LTE-12: CPU above threshold', CURRENT_TIMESTAMP);
    `);

    await db.query(`
      INSERT INTO alarms (id, site_id, severity, state, equipment, message, started_at)
      VALUES
        ('alm-1001', 'site-001', 'Major', 'Acknowledged', 'Modem-2', 'High packet loss', CURRENT_TIMESTAMP),
        ('alm-1002', 'site-002', 'Critical', 'Open', 'ODU-A', 'No heartbeat', CURRENT_TIMESTAMP),
        ('alm-1003', 'site-004', 'Warning', 'Monitoring', 'eNodeB', 'CPU above threshold', CURRENT_TIMESTAMP),
        ('alm-1004', 'site-007', 'Major', 'Open', 'VSAT Modem', 'Latency above threshold', CURRENT_TIMESTAMP);
    `);

    await db.query(`
      INSERT INTO incidents (id, site_id, title, priority, status, owner_name, opened_at)
      VALUES
        ('INC-2401', 'site-002', 'Microwave outage on QLM ring', 'High', 'Open', 'Field Ops', CURRENT_TIMESTAMP),
        ('INC-2398', 'site-001', 'VSAT latency degradation', 'Medium', 'Monitoring', 'NOC Team', CURRENT_TIMESTAMP),
        ('INC-2396', 'site-003', 'Fiber flap at GTP aggregation', 'High', 'Investigating', 'Transmission', CURRENT_TIMESTAMP),
        ('INC-2392', 'site-004', 'RAN CPU threshold warning', 'Low', 'Resolved', 'RAN Team', CURRENT_TIMESTAMP);
    `);

    return res.json({ success: true, message: 'Full NOC seed inserted' });
  } catch (error) {
    console.error('SEED FULL NOC ERROR:', error);
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



