// /server/services/ai.service.js
const axios = require('axios');

// --- Simple client-side rate limiter (per-process) ---
let lastApiCallAtMs = 0;
function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function rateLimit() {
  const ratePerMin = Number(process.env.EMBED_RATE_PER_MIN || 30); // default 30 req/min
  const minIntervalMs = Math.max(1, Math.floor(60000 / ratePerMin));
  const now = Date.now();
  const elapsed = now - lastApiCallAtMs;
  if (elapsed < minIntervalMs) {
    await sleep(minIntervalMs - elapsed);
  }
  lastApiCallAtMs = Date.now();
}

async function postWithRetries(url, payload, config = {}) {
  const maxRetries = Number(process.env.EMBED_MAX_RETRIES || 3);
  let attempt = 0;
  while (true) {
    try {
      await rateLimit();
      return await axios.post(url, payload, config);
    } catch (error) {
      const status = error?.response?.status;
      const retriable = status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
      if (!retriable || attempt >= maxRetries) throw error;
      const base = Number(process.env.EMBED_BACKOFF_BASE_MS || 1000);
      const factor = Number(process.env.EMBED_BACKOFF_FACTOR || 2);
      const jitter = Math.floor(Math.random() * 250);
      const delay = base * Math.pow(factor, attempt) + jitter;
      console.warn(`AI request failed (status ${status}). Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await sleep(delay);
      attempt++;
    }
  }
}

// Helper function: download an image and convert it to base64
async function urlToGenerativePart(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return {
    inlineData: {
      data: Buffer.from(response.data, 'binary').toString('base64'),
      mimeType: response.headers['content-type'],
    },
  };
}

// Helper function: read local file and convert it to base64
async function fileToGenerativePart(filePath) {
  const fs = require('fs');
  const path = require('path');
  
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  
  let mimeType = 'image/jpeg'; // default
  if (ext === '.png') mimeType = 'image/png';
  else if (ext === '.gif') mimeType = 'image/gif';
  else if (ext === '.webp') mimeType = 'image/webp';
  
  return {
    inlineData: {
      data: fileBuffer.toString('base64'),
      mimeType: mimeType,
    },
  };
}

// Main function: generate embedding for an image
const generateEmbedding = async (imagePath) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.warn('Google API Key is missing. Skipping embedding generation.');
    return null;
  }

  try {
    let imagePart;
    
    // Check if it's a URL or local file path
    if (imagePath.startsWith('http')) {
      // It's a URL - transform Cloudinary image for smaller size (if applicable)
      let transformedUrl = imagePath;
      if (imagePath.includes('/upload/')) {
        transformedUrl = imagePath.replace(
          '/upload/',
          '/upload/w_400,h_400,c_limit,q_auto/'
        );
      }
      imagePart = await urlToGenerativePart(transformedUrl);
    } else {
      // It's a local file path
      imagePart = await fileToGenerativePart(imagePath);
    }

    // Step 1: Vision API → get description
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
    if (!description) {
      console.warn("No description generated from AI. Response:", JSON.stringify(visionResponse.data, null, 2));
      return null;
    }
    console.log("AI generated description:", description);

    // Step 2: Embedding API → get embedding for description
    const embeddingModel = 'embedding-001';
    const embeddingApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${embeddingModel}:embedContent?key=${apiKey}`;

    const embeddingPayload = {
      model: `models/${embeddingModel}`,
      content: { parts: [{ text: description }] }
    };

    const embeddingResponse = await postWithRetries(embeddingApiUrl, embeddingPayload);
    const embedding = embeddingResponse.data?.embedding?.values;

    if (!embedding) {
      console.warn("No embedding generated. Response:", JSON.stringify(embeddingResponse.data, null, 2));
      return null;
    }

    console.log(`Successfully generated embedding with ${embedding.length} dimensions`);
    return embedding;

  } catch (error) {
    console.error('--- AI SERVICE ERROR ---');
    if (error.response) {
      console.error('API Response Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    console.error('--- END OF AI ERROR ---');
    return null; // safer than throwing (prevents crashing jobs)
  }
};

module.exports = { generateEmbedding };
