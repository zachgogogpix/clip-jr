require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { getClipJob, closePool } = require('./src/db');
const { enableMp4Support, buildMp4Url } = require('./src/mux');
const { trimClip } = require('./src/clipper');

function waitForEnter(message) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
}

async function main() {
  const videoId = process.argv[2];

  if (!videoId) {
    console.error('Usage: node index.js <video_id>');
    process.exit(1);
  }

  try {
    console.log(`\nFetching clip job for video id: ${videoId}`);
    const job = await getClipJob(videoId);
    console.log(`  Asset ID:    ${job.asset_id}`);
    console.log(`  Playback ID: ${job.playback_id}`);
    console.log(`  Clip start:  ${job.clip_start_ms}ms`);
    console.log(`  Clip end:    ${job.clip_end_ms}ms`);

    console.log('\nEnabling MP4 support on Mux asset...');
    await enableMp4Support(job.asset_id);
    console.log('  MP4 support request sent.');

    await waitForEnter('\nWait for Mux to finish processing the MP4, then press Enter to continue...');

    const mp4Url = buildMp4Url(job.playback_id);
    console.log(`\nSending clip request to Juanstream...`);
    console.log(`  URL:   ${mp4Url}`);

    const clipBuffer = await trimClip(mp4Url, job.clip_start_ms, job.clip_end_ms);
    const outputPath = path.join(__dirname, `clip_${videoId}.mp4`);
    fs.writeFileSync(outputPath, clipBuffer);
    console.log(`\nClip saved to: ${outputPath}`);
  } catch (err) {
    console.error('\nError:', err.response?.data || err.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();
