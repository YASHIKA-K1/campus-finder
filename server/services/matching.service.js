const Item = require('../models/itemModel.js');
const Notification = require('../models/notification.model.js');

const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

const SIMILARITY_THRESHOLD = 0.60;
const GENERIC_CATEGORIES = new Set(['phone', 'wallet', 'keys', 'bag', 'book', 'laptop', 'charger', 'mouse', 'keyboard', 'bracelet', 'watch', 'glasses']);

const findAndNotifyMatches = async (io) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newItems = await Item.find({ 
      createdAt: { $gte: twentyFourHoursAgo }
    }).lean();

    if (newItems.length === 0) return;

    for (const newItem of newItems) {
      const oppositeItemType = newItem.itemType === 'Lost' ? 'Found' : 'Lost';
      
      const potentialMatches = await Item.find({
        itemType: oppositeItemType,
        status: 'active'
      }).lean();

      for (const potentialMatch of potentialMatches) {
        if (newItem._id.equals(potentialMatch._id)) continue;

        const isCategoryMatch = newItem.category.toLowerCase() === potentialMatch.category.toLowerCase();
        
        if (isCategoryMatch) {
          let isMatch = false;
          let matchType = '';

          if (newItem.imageEmbedding?.length > 0 && potentialMatch.imageEmbedding?.length > 0) {
            const similarity = cosineSimilarity(newItem.imageEmbedding, potentialMatch.imageEmbedding);
            if (similarity > SIMILARITY_THRESHOLD) {
              isMatch = true;
              matchType = 'AI';
            }
          }

          if (!isMatch) {
            const descriptionMatch = newItem.description && potentialMatch.description &&
              (newItem.description.toLowerCase().includes(potentialMatch.description.toLowerCase()) ||
              potentialMatch.description.toLowerCase().includes(newItem.description.toLowerCase()));
            
            const isGenericCategory = GENERIC_CATEGORIES.has(newItem.category.toLowerCase());
            
            if (descriptionMatch || isGenericCategory) {
              isMatch = true;
              matchType = 'Category';
            }
          }

          if (isMatch) {
            const userId1 = newItem.user._id || newItem.user;
            const userId2 = potentialMatch.user._id || potentialMatch.user;
            const matchId1 = potentialMatch._id;
            const matchId2 = newItem._id;

            const [alreadyNotified1, alreadyNotified2] = await Promise.all([
              Notification.findOne({ user: userId1, matchItemId: matchId1 }).lean(),
              Notification.findOne({ user: userId2, matchItemId: matchId2 }).lean()
            ]);

            const notifications = [];
            
            if (!alreadyNotified1) {
              const message = matchType === 'AI' 
                ? `A potential match for your ${newItem.itemType.toLowerCase()} ${newItem.category} was found using AI!`
                : `A potential match for your ${newItem.itemType.toLowerCase()} ${newItem.category} was found!`;
              
              notifications.push({
                user: userId1,
                message,
                itemId: newItem._id,
                otherUser: userId2,
                matchItemId: matchId1,
              });
            }
            
            if (!alreadyNotified2) {
              const message = matchType === 'AI'
                ? `Someone reported an item that looks similar to your ${potentialMatch.itemType.toLowerCase()} ${potentialMatch.category} using AI.`
                : `Someone reported an item that matches your ${potentialMatch.itemType.toLowerCase()} ${potentialMatch.category}.`;
              
              notifications.push({
                user: userId2,
                message,
                itemId: potentialMatch._id,
                otherUser: userId1,
                matchItemId: matchId2,
              });
            }

            if (notifications.length > 0) {
              const createdNotifications = await Notification.insertMany(notifications);
              
              if (io?.userSocketMap) {
                createdNotifications.forEach(notif => {
                  const socketId = io.userSocketMap[notif.user.toString()];
                  if (socketId) {
                    io.to(socketId).emit('newNotification', notif);
                  }
                });
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in matching service:', error);
  }
};

const processItemsWithoutEmbeddings = async () => {
  try {
    const { generateEmbedding } = require('./ai.service.js');
    
    const rateLimitCooldown = process.env.AI_RATE_LIMIT_COOLDOWN_MS || 300000;
    const lastRateLimit = process.env.LAST_AI_RATE_LIMIT;
    if (lastRateLimit && (Date.now() - parseInt(lastRateLimit)) < rateLimitCooldown) {
      return;
    }
    
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const batchSize = Number(process.env.EMBED_BATCH_SIZE || 3);
    const now = new Date();
    
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

    for (const item of items) {
      try {
        const embedding = await generateEmbedding(item.imageUrl);
        if (embedding?.length > 0) {
          await Item.findByIdAndUpdate(item._id, {
            imageEmbedding: embedding,
            embeddingStatus: 'success',
            nextEmbedRetryAt: null
          });
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
      }
    }
  } catch (error) {
    console.error('Error in processItemsWithoutEmbeddings:', error);
  }
};

module.exports = { findAndNotifyMatches, processItemsWithoutEmbeddings };