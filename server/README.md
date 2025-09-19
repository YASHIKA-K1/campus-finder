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

## AI Matching System
The system uses Google Gemini API for image-based matching with intelligent fallback:

### Primary Matching (AI-based)
- Uses Google Gemini Vision API to analyze images and generate embeddings
- Compares embeddings using cosine similarity (threshold: 0.60)
- Requires both items to have embeddings

### Fallback Matching (Category-based)
- Activates when AI quota is exceeded or embeddings are unavailable
- Matches items based on:
  - Exact category match (case-insensitive)
  - Description similarity
  - Generic categories (phone, wallet, keys, bag, book, laptop, charger, mouse, keyboard, bracelet, watch, glasses)

### Rate Limiting
- When AI quota is exceeded (429 errors), system enters cooldown mode
- Skips AI processing for 5 minutes (configurable via `AI_RATE_LIMIT_COOLDOWN_MS`)
- Continues matching using fallback system
- Automatically resumes AI processing after cooldown period

## Scripts
- `npm start` – start the server
- `node scripts/backfill_embeddings.js` – optional embedding backfill (requires `OPENAI_API_KEY`)



