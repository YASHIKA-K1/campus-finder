const mongoose = require('mongoose');
require('dotenv').config();
const { generateEmbedding } = require('./services/ai.service.js');

async function testAI() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const Item = require('./models/itemModel.js');
    const items = await Item.find({ imageUrl: { $exists: true } }).limit(1);
    
    if (items.length > 0) {
      console.log('Testing AI service with item:', items[0]._id);
      console.log('Image URL:', items[0].imageUrl);
      
      const embedding = await generateEmbedding(items[0].imageUrl);
      console.log('Embedding generated:', !!embedding);
      console.log('Embedding length:', embedding ? embedding.length : 0);
      
      if (embedding) {
        // Update the item with the embedding
        await Item.findByIdAndUpdate(items[0]._id, { imageEmbedding: embedding });
        console.log('Updated item with embedding');
      }
    } else {
      console.log('No items with imageUrl found');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

testAI();


