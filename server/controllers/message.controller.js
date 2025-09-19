const Conversation = require('../models/conversation.model.js');
const Message = require('../models/message.model.js');
const Notification = require('../models/notification.model.js');

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

    conversation.messages.push(newMessage._id);

    await Promise.all([conversation.save(), newMessage.save()]);

    const notification = await Notification.create({
      user: receiverId,
      message: `You received a new message from user ${senderId}`,
      otherUser: senderId,
      itemId: null,
      matchItemId: null,
    });

    if (io?.userSocketMap?.[receiverId]) {
      io.to(io.userSocketMap[receiverId]).emit('newNotification', notification);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getMessages = async (req, res) => {
  try {
    const { userToChatId } = req.params;
    const senderId = req.user._id;

    const conversation = await Conversation.findOne({
      participants: { $all: [senderId, userToChatId] },
    }).populate("messages").lean();

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