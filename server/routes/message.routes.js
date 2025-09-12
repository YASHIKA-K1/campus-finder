
const express = require('express');
const { protect } = require('../middleware/protect.js');
const { sendMessage, getMessages } = require('../controllers/message.controller.js');

function messageRoutes(io) {
  const router = express.Router();

  // Get all messages with a user
  router.get('/:userToChatId', protect, getMessages);

  // Send a message
  router.post('/send/:receiverId', protect, (req, res) => {
    sendMessage(req, res, io);
  });

  return router;
}

module.exports = messageRoutes;
