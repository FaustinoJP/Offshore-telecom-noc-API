const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/sites', auth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM sites ORDER BY id');
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('GET /sites ERROR:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SITES_FAILED', message: error.message }
    });
  }
});

router.get('/alarms', auth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT a.*, s.name AS site_name
      FROM alarms a
      LEFT JOIN sites s ON s.id = a.site_id
      ORDER BY a.id DESC
    `);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('GET /alarms ERROR:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'ALARMS_FAILED', message: error.message }
    });
  }
});

router.get('/incidents', auth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT i.*, a.message AS alarm_message, s.name AS site_name
      FROM incidents i
      LEFT JOIN alarms a ON a.id = i.alarm_id
      LEFT JOIN sites s ON s.id = a.site_id
      ORDER BY i.id DESC
    `);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('GET /incidents ERROR:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INCIDENTS_FAILED', message: error.message }
    });
  }
});

router.get('/sites/map', auth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, name, latitude, longitude, status
      FROM sites
      ORDER BY id
    `);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('GET /sites/map ERROR:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'MAP_SITES_FAILED', message: error.message }
    });
  }
});

router.get('/links/map', auth, async (req, res) => {
  try {
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
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('GET /links/map ERROR:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'MAP_LINKS_FAILED', message: error.message }
    });
  }
});

router.get('/topology/nodes', auth, async (req, res) => {
  try {
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
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('GET /topology/nodes ERROR:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'TOPOLOGY_NODES_FAILED', message: error.message }
    });
  }
});

router.get('/topology/links', auth, async (req, res) => {
  try {
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
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('GET /topology/links ERROR:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'TOPOLOGY_LINKS_FAILED', message: error.message }
    });
  }
});

module.exports = router;
