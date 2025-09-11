// /server/services/matching.service.js
const Item = require('../models/itemModel.js');
const Notification = require('../models/notification.model.js');

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Using a more lenient threshold for better matching
const SIMILARITY_THRESHOLD = 0.60;

const findAndNotifyMatches = async (io) => {
  try {
    // Using a 24-hour window to increase AI matching opportunities
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Only fetch items that the AI has finished processing
    const newItems = await Item.find({ 
      createdAt: { $gte: twentyFourHoursAgo },
      imageEmbedding: { $exists: true, $ne: [] }
    });

    if (newItems.length === 0) return;

    for (const newItem of newItems) {
      const oppositeItemType = newItem.itemType === 'Lost' ? 'Found' : 'Lost';
      
      // Also ensure potential matches have been processed by the AI
      const potentialMatches = await Item.find({
        itemType: oppositeItemType,
        status: 'active',
        imageEmbedding: { $exists: true, $ne: [] }
      });

      for (const potentialMatch of potentialMatches) {
        if (newItem._id.equals(potentialMatch._id)) continue;

        // 1. Check for a case-insensitive category match first
        const isCategoryMatch = newItem.category.toLowerCase() === potentialMatch.category.toLowerCase();
        
        if (isCategoryMatch) {
            // 2. If categories match, then check for visual similarity
            const similarity = cosineSimilarity(newItem.imageEmbedding, potentialMatch.imageEmbedding);
            console.log(`[Matcher] AI matching: [${newItem.category}] vs [${potentialMatch.category}]. Similarity: ${similarity.toFixed(2)}`);

            if (similarity > SIMILARITY_THRESHOLD) {
              console.log(`✅ AI Match Found! Item ${newItem._id} and ${potentialMatch._id}`);

              // Prevent duplicate notifications for the same match
              const userId1 = newItem.user._id ? newItem.user._id : newItem.user;
              const userId2 = potentialMatch.user._id ? potentialMatch.user._id : potentialMatch.user;
              const matchId1 = potentialMatch._id;
              const matchId2 = newItem._id;

              const alreadyNotified1 = await Notification.findOne({ user: userId1, matchItemId: matchId1 });
              const alreadyNotified2 = await Notification.findOne({ user: userId2, matchItemId: matchId2 });

              let notif1 = null, notif2 = null;
              if (!alreadyNotified1) {
                notif1 = await Notification.create({
                  user: userId1,
                  message: `A potential match for your ${newItem.itemType.toLowerCase()} ${newItem.category} was found!`,
                  itemId: newItem._id,
                  otherUser: userId2,
                  matchItemId: matchId1,
                });
                console.log('[Notification Debug] Created notif1:', notif1);
                if (io && io.userSocketMap) {
                  const receiverSocketId = io.userSocketMap[userId1.toString()];
                  if (receiverSocketId) {
                    io.to(receiverSocketId).emit('newNotification', notif1);
                  }
                }
              }
              if (!alreadyNotified2) {
                notif2 = await Notification.create({
                  user: userId2,
                  message: `Someone reported an item that looks similar to your ${potentialMatch.itemType.toLowerCase()} ${potentialMatch.category}.`,
                  itemId: potentialMatch._id,
                  otherUser: userId1,
                  matchItemId: matchId2,
                });
                console.log('[Notification Debug] Created notif2:', notif2);
                if (io && io.userSocketMap) {
                  const matchSocketId = io.userSocketMap[userId2.toString()];
                  if (matchSocketId) {
                    io.to(matchSocketId).emit('newNotification', notif2);
                  }
                }
              }
            }
        }
      }
    }
  } catch (error) {
    console.error('Error in AI matching service:', error);
  }
};

// Function to process items that don't have embeddings yet (batched + limited)
const processItemsWithoutEmbeddings = async () => {
  try {
    const { generateEmbedding } = require('./ai.service.js');
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const batchSize = Number(process.env.EMBED_BATCH_SIZE || 3);
    const now = new Date();
    // Atomically claim items to avoid duplicate processing
    const items = [];
    for (let i = 0; i < batchSize; i++) {
      const claimed = await Item.findOneAndUpdate(
        {
          createdAt: { $lt: oneMinuteAgo },
          imageUrl: { $exists: true },
          $or: [
            { imageEmbedding: { $exists: false } },
            { imageEmbedding: { $size: 0 } }
          ],
          $or: [
            { embeddingStatus: { $in: ['pending', 'failed'] } },
            { embeddingStatus: { $exists: false } }
          ],
          $or: [
            { nextEmbedRetryAt: { $exists: false } },
            { nextEmbedRetryAt: { $lte: now } }
          ]
        },
        { $set: { embeddingStatus: 'processing' } },
        { new: true }
      );
      if (!claimed) break;
      items.push(claimed);
    }

    console.log(`[Matcher] Found ${items.length} items without embeddings to process`);
    for (const item of items) {
      try {
        const embedding = await generateEmbedding(item.imageUrl);
        if (embedding && embedding.length > 0) {
          await Item.findByIdAndUpdate(item._id, {
            imageEmbedding: embedding,
            embeddingStatus: 'success',
            nextEmbedRetryAt: null
          });
          console.log(`[Matcher] Successfully added embedding to item ${item._id}`);
        } else {
          const attempts = (item.embeddingAttempts || 0) + 1;
          const base = Number(process.env.EMBED_BACKOFF_BASE_MS || 1000);
          const factor = Number(process.env.EMBED_BACKOFF_FACTOR || 2);
          const backoffMs = base * Math.pow(factor, Math.min(attempts - 1, 5));
          const retryAt = new Date(Date.now() + backoffMs);
          await Item.findByIdAndUpdate(item._id, {
            embeddingStatus: 'failed',
            embeddingAttempts: attempts,
            nextEmbedRetryAt: retryAt
          });
          console.warn(`[Matcher] No embedding for ${item._id}. attempts=${attempts}, retryAt=${retryAt.toISOString()}`);
        }
      } catch (err) {
        const attempts = (item.embeddingAttempts || 0) + 1;
        const base = Number(process.env.EMBED_BACKOFF_BASE_MS || 1000);
        const factor = Number(process.env.EMBED_BACKOFF_FACTOR || 2);
        const backoffMs = base * Math.pow(factor, Math.min(attempts - 1, 5));
        const retryAt = new Date(Date.now() + backoffMs);
        await Item.findByIdAndUpdate(item._id, {
          embeddingStatus: 'failed',
          embeddingAttempts: attempts,
          nextEmbedRetryAt: retryAt
        });
        console.error(`[Matcher] Error embedding item ${item._id}:`, err?.response?.data || err.message);
      }
    }
  } catch (error) {
    console.error('Error in processItemsWithoutEmbeddings:', error);
  }
};

module.exports = { findAndNotifyMatches, processItemsWithoutEmbeddings };
