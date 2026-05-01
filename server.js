require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { getClipJob, closePool } = require('./src/db');
const { enableMp4Support, buildMp4Url, waitForMp4Ready } = require('./src/mux');
const { trimClip } = require('./src/clipper');

const app = express();
app.use(express.json());
app.use(express.static('public'));
app.use('/clips', express.static(path.join(__dirname, 'clips')));

app.get('/clip/status', async (req, res) => {
  const { videoId } = req.query;

  if (!videoId) {
    res.status(400).end();
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    const job = await getClipJob(videoId);

    send('status', { message: 'Enabling MP4 support on Mux asset...' });
    await enableMp4Support(job.asset_id);

    send('status', { message: 'Waiting for Mux asset to be ready...' });
    await waitForMp4Ready(job.asset_id);
    send('mux_ready', { message: 'Mux asset ready.' });

    send('status', { message: 'Clipping video...' });
    const mp4Url = buildMp4Url(job.playback_id);
    const clipBuffer = await trimClip(mp4Url, job.clip_start_ms, job.clip_end_ms);

    const filename = `clip_${videoId}.mp4`;
    fs.writeFileSync(path.join(__dirname, 'clips', filename), clipBuffer);

    send('done', { url: `/clips/${filename}` });
  } catch (err) {
    console.error(err.response?.data || err.message);
    send('error', { message: err.response?.data?.error?.messages?.[0] || err.message });
  } finally {
    res.end();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`clip-maker running on http://localhost:${PORT}`));
