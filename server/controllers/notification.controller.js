// /server/controllers/notification.controller.js
const Notification = require('../models/notification.model.js');

const getNotifications = async (req, res) => {
  try {
    // This .populate() chain is crucial. It tells the database to include
    // the details from the referenced 'User' and 'Item' documents.
    // Ensure ObjectId usage in query
    const userId = req.user._id;
    console.log('[Notification Debug] Querying notifications for user:', userId);
    const notifications = await Notification.find({ user: userId })
      .populate('otherUser', 'name')
      .populate('matchItemId', 'description imageUrl')
      .sort({ createdAt: -1 });
    console.log('[Notification Debug] Notifications returned:', JSON.stringify(notifications, null, 2));
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { getNotifications };
