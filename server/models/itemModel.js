
const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  // ... (existing fields like itemType, category, etc.)
  itemType: { type: String, required: true, enum: ['Lost', 'Found'] },
  category: { type: String, required: true },
  color: { type: String },
  description: { type: String, required: true },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  status: { type: String, required: true, default: 'active', enum: ['active', 'reunited'] },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // --- NEW FIELDS ---
  imageUrl: {
    type: String,
  },
  imagePublicId: { // To allow for easy deletion from Cloudinary
    type: String,
  },
  imageEmbedding: { // To store the AI-generated "fingerprint"
    type: [Number],
  },

  // --- Embedding processing state ---
  embeddingStatus: { // pending | processing | success | failed
    type: String,
    enum: ['pending', 'processing', 'success', 'failed'],
    default: 'pending'
  },
  embeddingAttempts: { type: Number, default: 0 },
  nextEmbedRetryAt: { type: Date },

}, { timestamps: true });

itemSchema.index({ location: '2dsphere' });

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;
