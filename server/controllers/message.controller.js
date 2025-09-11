const Conversation = require('../models/conversation.model.js');
const Message = require('../models/message.model.js');
const Notification = require('../models/notification.model.js');

// @desc    Send a message
// @route   POST /api/messages/send/:receiverId
// @access  Private
// Accept io as a parameter for real-time notification
const sendMessage = async (req, res, io) => {
  try {
    const { message } = req.body;
    const { receiverId } = req.params;
    const senderId = req.user._id;

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
      });
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      message,
    });

    if (newMessage) {
      conversation.messages.push(newMessage._id);
    }

    // Save message and conversation
    await Promise.all([conversation.save(), newMessage.save()]);

    // Create notification for receiver
    const notification = await Notification.create({
      user: receiverId,
      message: `You received a new message from user ${senderId}`,
      otherUser: senderId,
      itemId: null,
      matchItemId: null,
    });

    // Emit real-time notification event to receiver
    if (io && io.userSocketMap && io.userSocketMap[receiverId]) {
      io.to(io.userSocketMap[receiverId]).emit('newNotification', notification);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// @desc    Get messages between users
// @route   GET /api/messages/:userToChatId
// @access  Private
const getMessages = async (req, res) => {
  try {
    const { userToChatId } = req.params;
    const senderId = req.user._id;

    const conversation = await Conversation.findOne({
      participants: { $all: [senderId, userToChatId] },
    }).populate("messages"); // Populate the messages field

    if (!conversation) {
      return res.status(200).json([]);
    }

    res.status(200).json(conversation.messages);
  } catch (error) {
    console.error("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { sendMessage, getMessages };