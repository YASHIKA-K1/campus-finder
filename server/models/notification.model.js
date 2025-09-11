// /server/models/notification.model.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  otherUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  matchItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
