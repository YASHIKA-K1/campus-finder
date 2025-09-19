const axios = require('axios');

let lastApiCallAtMs = 0;
const sleep = ms => new Promise(res => setTimeout(res, ms));

const rateLimit = async () => {
  const ratePerMin = Number(process.env.EMBED_RATE_PER_MIN || 30);
  const minIntervalMs = Math.max(1, Math.floor(60000 / ratePerMin));
  const now = Date.now();
  const elapsed = now - lastApiCallAtMs;
  if (elapsed < minIntervalMs) {
    await sleep(minIntervalMs - elapsed);
  }
  lastApiCallAtMs = Date.now();
};

const postWithRetries = async (url, payload, config = {}) => {
  const maxRetries = Number(process.env.EMBED_MAX_RETRIES || 3);
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      await rateLimit();
      return await axios.post(url, payload, config);
    } catch (error) {
      const status = error?.response?.status;
      const retriable = [429, 500, 502, 503, 504].includes(status);
      
      if (!retriable || attempt >= maxRetries - 1) throw error;
      
      const base = Number(process.env.EMBED_BACKOFF_BASE_MS || 1000);
      const factor = Number(process.env.EMBED_BACKOFF_FACTOR || 2);
      const jitter = Math.floor(Math.random() * 250);
      const delay = base * Math.pow(factor, attempt) + jitter;
      
      await sleep(delay);
      attempt++;
    }
  }
};

const urlToGenerativePart = async (url) => {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return {
    inlineData: {
      data: Buffer.from(response.data, 'binary').toString('base64'),
      mimeType: response.headers['content-type'],
    },
  };
};

const fileToGenerativePart = async (filePath) => {
  const fs = require('fs');
  const path = require('path');
  
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  
  const mimeTypes = {
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  
  return {
    inlineData: {
      data: fileBuffer.toString('base64'),
      mimeType: mimeTypes[ext] || 'image/jpeg',
    },
  };
};

const generateEmbedding = async (imagePath) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const rateLimitCooldown = process.env.AI_RATE_LIMIT_COOLDOWN_MS || 300000;
  const lastRateLimit = process.env.LAST_AI_RATE_LIMIT;
  if (lastRateLimit && (Date.now() - parseInt(lastRateLimit)) < rateLimitCooldown) {
    return null;
  }

  try {
    let imagePart;
    
    if (imagePath.startsWith('http')) {
      let transformedUrl = imagePath;
      if (imagePath.includes('/upload/')) {
        transformedUrl = imagePath.replace('/upload/', '/upload/w_400,h_400,c_limit,q_auto/');
      }
      imagePart = await urlToGenerativePart(transformedUrl);
    } else {
      imagePart = await fileToGenerativePart(imagePath);
    }

    const visionModel = 'gemini-1.5-flash-latest';
    const visionApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${visionModel}:generateContent?key=${apiKey}`;

    const visionPayload = {
      contents: [{
        parts: [
          { text: "Describe this item in a few keywords for a lost and found database." },
          imagePart
        ]
      }]
    };

    const visionResponse = await postWithRetries(visionApiUrl, visionPayload);
    const description = visionResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!description) return null;

    const embeddingModel = 'embedding-001';
    const embeddingApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${embeddingModel}:embedContent?key=${apiKey}`;

    const embeddingPayload = {
      model: `models/${embeddingModel}`,
      content: { parts: [{ text: description }] }
    };

    const embeddingResponse = await postWithRetries(embeddingApiUrl, embeddingPayload);
    const embedding = embeddingResponse.data?.embedding?.values;

    return embedding || null;

  } catch (error) {
    if (error.response?.status === 429) {
      process.env.LAST_AI_RATE_LIMIT = Date.now().toString();
    }
    return null;
  }
};

module.exports = { generateEmbedding };