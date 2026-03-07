const router = require('express').Router();
const db = require('../db');

module.exports = (io) => {
  router.post('/alarms', async (req, res) => {
    const alarm = req.body;
    const id = alarm.id || `alm-${Date.now()}`;
    await db.query('INSERT INTO alarms (id, site_id, severity, state, equipment, message, started_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()) ON CONFLICT (id) DO NOTHING', [id, alarm.siteId, alarm.severity || 'Critical', alarm.state || 'Open', alarm.deviceName || null, alarm.message || 'No heartbeat',]);
    await db.query('UPDATE sites SET status = $2, active_alarms = active_alarms + 1, last_seen = NOW() WHERE id = $1', [alarm.siteId, 'Down']);
    await db.query('INSERT INTO events (id, event, message, event_time) VALUES ($1,$2,$3,NOW()) ON CONFLICT (id) DO NOTHING', [`evt-${Date.now()}`, 'alarm.created', `${alarm.siteName}: ${alarm.message || 'No heartbeat'}`]);
    io.emit('alarm.created', { siteId: alarm.siteId, siteName: alarm.siteName, message: alarm.message || 'No heartbeat', startedAt: new Date().toISOString(), siteStatus: 'Down' });
    io.emit('site.status.changed', { siteId: alarm.siteId, siteName: alarm.siteName, status: 'Down', activeAlarms: 1, lastSeen: new Date().toISOString() });
    res.json({ success: true });
  });

  router.post('/recovery', async (req, res) => {
    const payload = req.body;
    await db.query("UPDATE alarms SET state = 'Resolved' WHERE site_id = $1 AND state IN ('Open','Acknowledged','Monitoring')", [payload.siteId]);
    await db.query('UPDATE sites SET status = $2, active_alarms = 0, last_seen = NOW() WHERE id = $1', [payload.siteId, 'Healthy']);
    await db.query('INSERT INTO events (id, event, message, event_time) VALUES ($1,$2,$3,NOW()) ON CONFLICT (id) DO NOTHING', [`evt-${Date.now()}`, 'alarm.closed', `${payload.siteName}: connectivity restored`]);
    io.emit('alarm.closed', { siteId: payload.siteId, siteName: payload.siteName, closedAt: new Date().toISOString(), siteStatus: 'Healthy' });
    io.emit('site.status.changed', { siteId: payload.siteId, siteName: payload.siteName, status: 'Healthy', activeAlarms: 0, lastSeen: new Date().toISOString() });
    res.json({ success: true });
  });

  router.post('/metrics', async (_req, res) => res.json({ success: true }));

  return router;
};
