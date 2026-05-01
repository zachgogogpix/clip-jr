const axios = require('axios');

// Converts milliseconds (e.g. 47515) to HH:MM:SS.mmm
function toTimestamp(ms) {
  const total = parseInt(ms, 10);
  const hours = Math.floor(total / 3600000);
  const minutes = Math.floor((total % 3600000) / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const millis = total % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

async function trimClip(mp4Url, clipStart, clipEnd) {
  const body = {
    url: mp4Url,
    start: toTimestamp(clipStart),
    end: toTimestamp(clipEnd),
  };

  const response = await axios.post(process.env.JUANSTREAM_API_URL, body, {
    responseType: 'arraybuffer',
  });

  return response.data;
}

module.exports = { trimClip };
