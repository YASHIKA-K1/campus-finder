const express = require('express');
const path = require('path');
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
  .map((s) => s.trim());

// Allow Vercel preview and production domains dynamically
const corsOrigin = (origin, callback) => {
  // Allow non-browser requests and same-origin
  if (!origin) return callback(null, true);

  // Normalize origin for comparison
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
  if (process.env.NODE_ENV !== 'production') {
    console.log('A user connected:', socket.id);
  }

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
    if (process.env.NODE_ENV !== 'production') {
      console.log('User disconnected:', socket.id);
    }
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
    if (process.env.NODE_ENV !== 'production') {
      console.log("Successfully connected to MongoDB.");
    }

    io.userSocketMap = userSocketMap;

    cron.schedule('*/10 * * * * *', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Running scheduled job: Finding item matches...');
      }
      findAndNotifyMatches(io);
    });

    const embedCron = process.env.EMBED_CRON || '*/5 * * * *';
    cron.schedule(embedCron, () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Running scheduled job: Processing items without embeddings...');
      }
      processItemsWithoutEmbeddings();
    });
  })
  .catch(err => {
    console.error("Database connection error:", err);
    process.exit(1);
  });
