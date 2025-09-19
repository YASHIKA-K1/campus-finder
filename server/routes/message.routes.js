const express = require('express');
const { protect } = require('../middleware/protect.js');
const { sendMessage, getMessages } = require('../controllers/message.controller.js');

function messageRoutes(io) {
  const router = express.Router();

  router.get('/:userToChatId', protect, getMessages);
  router.post('/send/:receiverId', protect, (req, res) => {
    sendMessage(req, res, io);
  });

  return router;
}

module.exports = messageRoutes;