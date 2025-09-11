const mongoose = require('mongoose');
require('dotenv').config();
const Item = require('../models/itemModel.js');
const { generateEmbedding } = require('../services/ai.service.js');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/campus-finder';
  const batchSize = Number(process.env.BACKFILL_BATCH_SIZE || 5);
  const batchDelayMs = Number(process.env.BACKFILL_BATCH_DELAY_MS || 2000);

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // Select items missing embeddings (not set or empty array)
  const query = {
    imageUrl: { $exists: true },
    $or: [
      { imageEmbedding: { $exists: false } },
      { imageEmbedding: { $size: 0 } }
    ]
  };

  let processed = 0;
  while (true) {
    const items = await Item.find(query).limit(batchSize);
    if (items.length === 0) break;
    console.log(`Processing batch of ${items.length} items...`);

    for (const item of items) {
      try {
        const embedding = await generateEmbedding(item.imageUrl);
        if (embedding && embedding.length > 0) {
          await Item.findByIdAndUpdate(item._id, { imageEmbedding: embedding });
          console.log(`Updated item ${item._id} with embedding (${embedding.length})`);
        } else {
          console.warn(`No embedding for item ${item._id}`);
        }
      } catch (err) {
        console.error(`Error embedding item ${item._id}:`, err?.response?.data || err.message);
      }
      processed++;
    }

    if (items.length === batchSize) {
      console.log(`Sleeping ${batchDelayMs}ms before next batch...`);
      await sleep(batchDelayMs);
    }
  }

  console.log(`Backfill complete. Processed: ${processed}`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });



