const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  // An array of the two users participating in the conversation
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // An array of the messages in the conversation
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: [],
  }],
}, { timestamps: true });

const Conversation = mongoose.model('Conversation', conversationSchema);
module.exports = Conversation;