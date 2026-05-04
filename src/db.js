const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB,
  user: process.env.DB_USER,
  password: process.env.DB_PWD,
  ssl: process.env.DB_SSL_REQUIRED === 'true' ? { rejectUnauthorized: false } : false,
});

async function getClipJob(videoId) {
  const result = await pool.query(
    `SELECT
       v.id,
       v.artist,
       v.title,
       v.clip_start_ms,
       v.clip_end_ms,
       m.asset_id,
       m.playback_id
     FROM video v
     JOIN mux m ON m.video_id = v.id
     WHERE v.id = $1`,
    [videoId]
  );

  if (result.rows.length === 0) {
    throw new Error(`No video found with id: ${videoId}`);
  }

  return result.rows[0];
}

async function closePool() {
  await pool.end();
}

module.exports = { getClipJob, closePool };
