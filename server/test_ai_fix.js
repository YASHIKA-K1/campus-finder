const mongoose = require('mongoose');
require('dotenv').config();
const { generateEmbedding } = require('./services/ai.service.js');
const Item = require('./models/itemModel.js');

async function testAIFix() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Test with a sample image URL (you can replace this with a real image URL)
    const testImageUrl = 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=400&fit=crop';
    
    console.log('Testing AI service with sample image...');
    const embedding = await generateEmbedding(testImageUrl);
    
    if (embedding && embedding.length > 0) {
      console.log('✅ AI service is working!');
      console.log('Embedding length:', embedding.length);
      console.log('First few values:', embedding.slice(0, 5));
    } else {
      console.log('❌ AI service failed to generate embedding');
    }
    
    // Check existing items in database
    const totalItems = await Item.countDocuments();
    const itemsWithEmbeddings = await Item.countDocuments({ imageEmbedding: { $exists: true, $ne: [] } });
    const itemsWithoutEmbeddings = await Item.countDocuments({ imageEmbedding: { $exists: false } });
    
    console.log('\nDatabase status:');
    console.log(`Total items: ${totalItems}`);
    console.log(`Items with embeddings: ${itemsWithEmbeddings}`);
    console.log(`Items without embeddings: ${itemsWithoutEmbeddings}`);
    
    if (itemsWithoutEmbeddings > 0) {
      console.log('\nItems without embeddings will be processed by the scheduled job.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

testAIFix();


