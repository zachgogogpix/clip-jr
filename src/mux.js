const axios = require('axios');

async function enableMp4Support(assetId) {
  try {
    const response = await axios.put(
      `https://api.mux.com/video/v1/assets/${assetId}/mp4-support`,
      { mp4_support: 'capped-1080p' },
      {
        auth: {
          username: process.env.MUX_TOKEN_ID,
          password: process.env.MUX_TOKEN_SECRET,
        },
      }
    );
    return response.data;
  } catch (err) {
    const messages = err.response?.data?.error?.messages ?? [];
    if (messages.some(m => m.toLowerCase().includes('already exists'))) {
      return null; // already enabled, safe to continue
    }
    throw err;
  }
}

function buildMp4Url(playbackId) {
  return `https://stream.mux.com/${playbackId}/capped-1080p.mp4`;
}

async function waitForMp4Ready(assetId, { intervalMs = 4000, timeoutMs = 300000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  const auth = { username: process.env.MUX_TOKEN_ID, password: process.env.MUX_TOKEN_SECRET };

  while (Date.now() < deadline) {
    const { data } = await axios.get(`https://api.mux.com/video/v1/assets/${assetId}`, { auth });
    if (data.data.static_renditions?.status === 'ready') return;
    await new Promise(r => setTimeout(r, intervalMs));
  }

  throw new Error(`Timed out waiting for MP4 to be ready on asset ${assetId}`);
}

module.exports = { enableMp4Support, buildMp4Url, waitForMp4Ready };
