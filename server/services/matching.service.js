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

// Helper function to calculate distance between two coordinates in kilometers
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Helper function for flexible description matching
const isDescriptionMatch = (desc1, desc2) => {
  if (!desc1 || !desc2) return false;
  
  const words1 = desc1.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  const words2 = desc2.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  
  // Calculate word overlap percentage
  const commonWords = words1.filter(word => words2.includes(word));
  const totalWords = Math.max(words1.length, words2.length);
  const overlapPercentage = commonWords.length / totalWords;
  
  // Consider it a match if there's at least 20% word overlap
  return overlapPercentage >= 0.2;
};

const findAndNotifyMatches = async (io) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newItems = await Item.find({ 
      createdAt: { $gte: twentyFourHoursAgo }
    }).lean();

    if (newItems.length === 0) return;

    for (const newItem of newItems) {
      const oppositeItemType = newItem.itemType === 'Lost' ? 'Found' : 'Lost';
      
      // Use MongoDB geospatial query to find items within 1km radius
      const potentialMatches = await Item.find({
        itemType: oppositeItemType,
        status: 'active',
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: newItem.location.coordinates
            },
            $maxDistance: 1000 // 1km in meters
          }
        }
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
            // For fallback matching, prioritize category match
            // If categories match, we have a potential match
            isMatch = true;
            matchType = 'Category';
            
            // Additional description matching for better confidence
            const descriptionMatch = isDescriptionMatch(newItem.description, potentialMatch.description);
            const isGenericCategory = GENERIC_CATEGORIES.has(newItem.category.toLowerCase());
            
            // If we have both category match AND (description match OR generic category), 
            // this is a stronger match
            if (descriptionMatch || isGenericCategory) {
              matchType = 'Category+Description';
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
              let message;
              if (matchType === 'AI') {
                message = `A potential match for your ${newItem.itemType.toLowerCase()} ${newItem.category} was found using AI!`;
              } else if (matchType === 'Category+Description') {
                message = `A potential match for your ${newItem.itemType.toLowerCase()} ${newItem.category} was found based on category and description!`;
              } else {
                message = `A potential match for your ${newItem.itemType.toLowerCase()} ${newItem.category} was found based on category and location!`;
              }
              
              notifications.push({
                user: userId1,
                message,
                itemId: newItem._id,
                otherUser: userId2,
                matchItemId: matchId1,
              });
            }
            
            if (!alreadyNotified2) {
              let message;
              if (matchType === 'AI') {
                message = `Someone reported an item that looks similar to your ${potentialMatch.itemType.toLowerCase()} ${potentialMatch.category} using AI.`;
              } else if (matchType === 'Category+Description') {
                message = `Someone reported an item that matches your ${potentialMatch.itemType.toLowerCase()} ${potentialMatch.category} based on category and description.`;
              } else {
                message = `Someone reported an item that matches your ${potentialMatch.itemType.toLowerCase()} ${potentialMatch.category} based on category and location.`;
              }
              
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