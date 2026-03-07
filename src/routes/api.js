const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));

router.use(requireAuth);

router.get('/dashboard/summary', async (_req, res) => {
  const sites = await db.query('SELECT status FROM sites');
  const alarms = await db.query("SELECT COUNT(*)::int AS count FROM alarms WHERE severity = 'Critical' AND state IN ('Open','Acknowledged','Monitoring')");
  const totalSites = sites.rows.length;
  const healthy = sites.rows.filter(r => r.status === 'Healthy').length;
  const degraded = sites.rows.filter(r => r.status === 'Degraded').length;
  const down = sites.rows.filter(r => r.status === 'Down').length;
  res.json({ success: true, data: { totalSites, activeSites: healthy, degradedSites: degraded, downSites: down, criticalAlarms: alarms.rows[0].count, availability24h: 98.7 } });
});

router.get('/sites', async (_req, res) => {
  const { rows } = await db.query('SELECT id, name, region, technology, status, availability, active_alarms AS "activeAlarms", lat, lng, last_seen AS "lastSeen" FROM sites ORDER BY name');
  res.json({ success: true, data: rows });
});
router.get('/sites/map', async (_req, res) => {
  const { rows } = await db.query('SELECT id, name, region, technology, status, availability, active_alarms AS "activeAlarms", lat, lng, last_seen AS "lastSeen" FROM sites ORDER BY name');
  res.json({ success: true, data: rows });
});
router.get('/links/map', async (_req, res) => {
  const { rows } = await db.query('SELECT id, name, source_site_id AS "from", target_site_id AS "to", type, status, utilization, latency FROM links ORDER BY name');
  res.json({ success: true, data: rows });
});
router.get('/events/recent', async (_req, res) => {
  const { rows } = await db.query('SELECT id, event, message, event_time AS time FROM events ORDER BY event_time DESC LIMIT 20');
  res.json({ success: true, data: rows });
});
router.get('/alarms', async (_req, res) => {
  const { rows } = await db.query('SELECT id, site_id AS "siteId", severity, state, equipment, message, started_at AS "startedAt" FROM alarms ORDER BY started_at DESC');
  res.json({ success: true, data: rows });
});
router.get('/incidents', async (_req, res) => {
  const { rows } = await db.query('SELECT id, site_id AS "siteId", title, priority, status, owner_name AS owner, opened_at AS "openedAt" FROM incidents ORDER BY opened_at DESC');
  res.json({ success: true, data: rows });
});
router.get('/topology/nodes', async (_req, res) => {
  const { rows } = await db.query(`
    SELECT 'core-001'::text AS id, 'Core Router Luanda'::text AS name, 'core'::text AS type, 'IP/MPLS'::text AS technology, 'Luanda'::text AS region, 'Healthy'::text AS status, 0::int AS "activeAlarms"
    UNION ALL
    SELECT 'hub-001', 'GTP Aggregation Hub', 'hub', 'Fiber', 'Central', 'Healthy', 0
    UNION ALL
    SELECT id, name, 'site', technology, region, status, active_alarms FROM sites
  `);
  res.json({ success: true, data: rows });
});
router.get('/topology/links', async (_req, res) => {
  const { rows } = await db.query(`
    SELECT 'topo-link-001'::text AS id, 'Core to GTP'::text AS name, 'core-001'::text AS source, 'hub-001'::text AS target, 'Fiber'::text AS type, 'Healthy'::text AS status, 61::int AS utilization, 4::int AS latency
    UNION ALL
    SELECT id, name, CASE WHEN source_site_id = 'site-003' THEN 'hub-001' ELSE source_site_id END, target_site_id, type, status, utilization, latency FROM links
  `);
  res.json({ success: true, data: rows });
});

module.exports = router;
