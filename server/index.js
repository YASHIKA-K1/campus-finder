const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const cron = require('node-cron');
const http = require('http');
const { Server } = require('socket.io');

const { findAndNotifyMatches, processItemsWithoutEmbeddings } = require('./services/matching.service.js');

dotenv.config();

const authRoutes = require('./routes/auth_routes.js');
const itemRoutes = require('./routes/item_routes.js');
const notificationRoutes = require('./routes/notification.routes.js');
const createMessageRoutes = require('./routes/message.routes.js');

const app = express();
const server = http.createServer(app);

const staticAllowedOrigins = (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim());

const corsOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);

  const normalized = origin.toLowerCase();
  const isStaticAllowed = staticAllowedOrigins.includes(normalized);
  const isVercelDomain = /https?:\/\/([a-z0-9-]+-)?campus-finder(.*)?\.vercel\.app$/i.test(normalized);

  if (isStaticAllowed || isVercelDomain) {
    return callback(null, true);
  }
  return callback(new Error(`CORS not allowed for origin: ${origin}`));
};

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
  },
});

const userSocketMap = {};

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId && userId !== "undefined") {
    userSocketMap[userId] = socket.id;
  }

  socket.on("sendMessage", ({ senderId, receiverId, message }) => {
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", { senderId, message });
    }
  });

  socket.on('disconnect', () => {
    for (let uid in userSocketMap) {
      if (userSocketMap[uid] === socket.id) {
        delete userSocketMap[uid];
        break;
      }
    }
  });
});

app.use(cors({
  origin: corsOrigin,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', createMessageRoutes(io));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.send('Campus Finder API is running...');
});

const PORT = process.env.PORT || 5000;
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/campus-finder';

mongoose.connect(mongoUri)
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server listening on ${PORT}`);
    });

    io.userSocketMap = userSocketMap;

    cron.schedule('*/10 * * * * *', () => {
      findAndNotifyMatches(io);
    });

    const embedCron = process.env.EMBED_CRON || '*/5 * * * *';
    cron.schedule(embedCron, () => {
      processItemsWithoutEmbeddings();
    });
  })
  .catch(err => {
    console.error("Database connection error:", err);
    process.exit(1);
  });