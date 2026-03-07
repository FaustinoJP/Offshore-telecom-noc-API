const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/sites', auth, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM sites ORDER BY id');
  res.json({ success: true, data: rows });
});

router.get('/alarms', auth, async (req, res) => {
  const { rows } = await db.query(`
    SELECT a.*, s.name AS site_name
    FROM alarms a
    LEFT JOIN sites s ON s.id = a.site_id
    ORDER BY a.id DESC
  `);
  res.json({ success: true, data: rows });
});

router.get('/incidents', auth, async (req, res) => {
  const { rows } = await db.query(`
    SELECT i.*, a.message AS alarm_message, s.name AS site_name
    FROM incidents i
    LEFT JOIN alarms a ON a.id = i.alarm_id
    LEFT JOIN sites s ON s.id = a.site_id
    ORDER BY i.id DESC
  `);
  res.json({ success: true, data: rows });
});

router.get('/sites/map', auth, async (req, res) => {
  const { rows } = await db.query(`
    SELECT id, name, latitude, longitude, status
    FROM sites
    ORDER BY id
  `);
  res.json({ success: true, data: rows });
});

router.get('/links/map', auth, async (req, res) => {
  const { rows } = await db.query(`
    SELECT
      l.id,
      l.source_site,
      l.target_site,
      l.capacity,
      l.status,
      s1.name AS source_name,
      s2.name AS target_name
    FROM links l
    LEFT JOIN sites s1 ON s1.id = l.source_site
    LEFT JOIN sites s2 ON s2.id = l.target_site
    ORDER BY l.id
  `);
  res.json({ success: true, data: rows });
});

router.get('/topology/nodes', auth, async (req, res) => {
  const { rows } = await db.query(`
    SELECT
      id,
      name,
      status,
      CASE
        WHEN name ILIKE '%Core%' THEN 'core'
        WHEN name ILIKE '%Hub%' THEN 'hub'
        ELSE 'site'
      END AS type
    FROM sites
    ORDER BY id
  `);
  res.json({ success: true, data: rows });
});

router.get('/topology/links', auth, async (req, res) => {
  const { rows } = await db.query(`
    SELECT
      id,
      source_site AS source,
      target_site AS target,
      capacity,
      status
    FROM links
    ORDER BY id
  `);
  res.json({ success: true, data: rows });
});

module.exports = router;
