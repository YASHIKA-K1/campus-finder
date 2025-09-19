const Notification = require('../models/notification.model.js');

const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const notifications = await Notification.find({ user: userId })
      .populate('otherUser', 'name')
      .populate('matchItemId', 'description imageUrl')
      .sort({ createdAt: -1 })
      .lean();
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { getNotifications };