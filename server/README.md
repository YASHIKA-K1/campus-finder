# Campus Finder – Server

Express API with Socket.IO and MongoDB for real‑time lost & found.

## Setup
```bash
cd server
npm install

# Create environment file
copy NUL .env  # On Windows; otherwise create .env manually
```

### .env
Required keys:
```
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>
JWT_SECRET=change_me
PORT=5000
CLIENT_ORIGINS=http://localhost:5173

# Image uploads (Cloudinary)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```
Optional:
```
OPENAI_API_KEY=sk-...   # for scripts/backfill_embeddings.js
EMBED_CRON=*/5 * * * *  # schedule for embedding processing (default every 5 minutes)
```

## Run
```bash
npm start
# or
npm run dev  # if nodemon is configured
```

## CORS and Sockets
- CORS allowed origins are controlled by `CLIENT_ORIGINS` (comma‑separated)
- Socket.IO expects a `userId` in the connection query string and emits targeted events

## Routes
- Auth: `POST /api/auth/register`, `POST /api/auth/login`
- Items: `GET /api/items`, `POST /api/items` (multipart with `image`), `GET /api/items/my-items`, `PUT /api/items/:id/status`
- Messages: `GET /api/messages/:userToChatId`, `POST /api/messages/send/:receiverId`
- Notifications: `GET /api/notifications`

## File Uploads
- Configured in `config.js` using `multer-storage-cloudinary`
- `POST /api/items` expects a multipart form with field name `image`

## Background Jobs
- Matching job runs every 10 seconds to find and notify potential matches
- Embedding processing job runs on `EMBED_CRON` (default every 5 minutes)

## Scripts
- `npm start` – start the server
- `node scripts/backfill_embeddings.js` – optional embedding backfill (requires `OPENAI_API_KEY`)

## Development Notes
- Ensure the client base URL is included in `CLIENT_ORIGINS`
- Server listens on `PORT` after a successful MongoDB connection
- Socket events:
  - Server emits `newMessage` to specific users on direct sends
  - Server may emit `newNotification` for matches/messages consumed by the client

