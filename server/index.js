const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const cron = require('node-cron');
const http = require('http');
const { Server } = require('socket.io');

const { findAndNotifyMatches, processItemsWithoutEmbeddings } = require('./services/matching.service.js');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth_routes.js');
const itemRoutes = require('./routes/item_routes.js');
const notificationRoutes = require('./routes/notification.routes.js');
const messageRoutes = require('./routes/message.routes.js');

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Attach socket.io to the server
const allowedOrigins = (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim());

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

const userSocketMap = {}; // { userId: socketId }

// --- Real-time Socket.io Logic ---
io.on('connection', (socket) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('A user connected:', socket.id);
  }

  const userId = socket.handshake.query.userId;
  if (userId && userId !== "undefined") {
    userSocketMap[userId] = socket.id;
  }

  // Listen for new messages from a client
  socket.on("sendMessage", ({ senderId, receiverId, message }) => {
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
      // Send the message directly to the specific receiver's socket
      io.to(receiverSocketId).emit("newMessage", { senderId, message });
    }
  });

  socket.on('disconnect', () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('User disconnected:', socket.id);
    }
    // Clean up the userSocketMap on disconnect
    for (let uid in userSocketMap) {
      if (userSocketMap[uid] === socket.id) {
        delete userSocketMap[uid];
        break;
      }
    }
  });
});

// Middleware
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes(io));

// --- Serve frontend in production ---
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDistPath));

  // SPA fallback - send index.html for any non-API route
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// --- A Simple Test Route ---
app.get('/', (req, res) => {
    res.send('Campus Finder API is running...');
});

// --- Start Server After Connecting to DB ---
const PORT = process.env.PORT || 5000;

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/campus-finder';
mongoose.connect(mongoUri)
    .then(() => {
        // Use server.listen instead of app.listen
        server.listen(PORT, () => {
            console.log(`Server listening on ${PORT}`);
        });
        if (process.env.NODE_ENV !== 'production') {
          console.log("Successfully connected to MongoDB.");
        }

        // --- Schedule the Smart Match Job ---
        // Attach userSocketMap to io for access in matching.service
        io.userSocketMap = userSocketMap;
        cron.schedule('*/10 * * * * *', () => {
            if (process.env.NODE_ENV !== 'production') {
              console.log('Running scheduled job: Finding item matches...');
            }
            findAndNotifyMatches(io);
        });
        
        // --- Schedule the Process Items Without Embeddings Job ---
        // Run every 2 minutes to process items that failed AI processing
        const embedCron = process.env.EMBED_CRON || '*/5 * * * *'; // default every 5 minutes
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