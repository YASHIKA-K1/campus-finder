## Campus Finder

Find and return lost items on campus. This monorepo contains a React client and an Express/Socket.IO server backed by MongoDB. Users can post lost/found items, chat in real time, and receive notifications for matches and messages.

### Features
- Post lost/found items with image, category, description, and map location
- Real‑time chat between owners and finders (Socket.IO)
- Notifications for messages and smart matching
- JWT authentication; client stores session in `sessionStorage`
- Optional AI utilities and scheduled jobs for matching and embeddings

### Tech Stack
- Client: React + Vite, React Router, Context API, Tailwind CSS, Leaflet
- Server: Node.js, Express, Socket.IO, Mongoose, Multer + Cloudinary
- Database: MongoDB (Atlas or local)

### Prerequisites
- Node.js 18+
- MongoDB database (local or hosted)
- Cloudinary account (for image uploads)

### Quick Start
```bash
git clone <repo>
cd campus-finder

# 1) Server
cd server
npm install
copy NUL .env  # Windows; or create .env manually
REM Required .env keys (see server/README.md for full list):
REM MONGO_URI, JWT_SECRET, PORT=5000, CLIENT_ORIGINS=http://localhost:5173
REM CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
npm start

# 2) Client (new terminal)
cd ../client
npm install
echo VITE_API_URL=http://localhost:5000 > .env
npm run dev
```

Open the app at `http://localhost:5173`.

### Project Structure
```
client/   React app (Vite + Tailwind + Leaflet)
server/   Express API, Socket.IO, MongoDB models, services, cron jobs
```

### Environment Variables
- Server (`server/.env`)
  - `MONGO_URI` (required)
  - `JWT_SECRET` (required)
  - `PORT` (default 5000)
  - `CLIENT_ORIGINS` (comma‑separated allowed origins, e.g. http://localhost:5173)
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (required for image uploads)
  - Optional:
    - `OPENAI_API_KEY` (for `scripts/backfill_embeddings.js`)
    - `EMBED_CRON` (cron string for embedding processing; default every 5 minutes)
- Client (`client/.env`)
  - `VITE_API_URL` (e.g. http://localhost:5000)

### Common Scripts
- Client
  - `npm run dev` – start Vite dev server
  - `npm run build` – production build
  - `npm run preview` – preview built app
- Server
  - `npm start` – start API and Socket.IO server

### Deployment Notes
- Set `CLIENT_ORIGINS` on the server to your deployed client URL(s)
- Set `VITE_API_URL` in the client to the deployed API URL
- Ensure Cloudinary env vars are configured in the server environment

### More Docs
- See `client/README.md` for frontend specifics (pages, contexts, styling)
- See `server/README.md` for API surface, sockets, envs, cron jobs, and scripts
