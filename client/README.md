# Campus Finder – Client

Responsive React app (Vite + Tailwind + Leaflet) for posting and finding lost items.

## Getting Started
```bash
cd client
npm install
echo VITE_API_URL=http://localhost:5000 > .env
npm run dev
```

Open `http://localhost:5173`.

## Available Scripts
- `npm run dev` – start Vite dev server
- `npm run build` – build for production
- `npm run preview` – preview production build

## Tech
- React 19, React Router, Context API
- Tailwind CSS
- Leaflet via `react-leaflet` for the map

## Environment
Create `.env` in `client/`:
```
VITE_API_URL=http://localhost:5000
```

## App Structure
- `src/context/AuthContext.jsx` – stores user info (JWT, etc.) in `sessionStorage`
- `src/context/SocketContext.jsx` – connects to Socket.IO at `VITE_API_URL` and exposes `socket` and `unreadCount`
- `src/pages/HomePage.jsx` – shows a map of items, lets authenticated users post items with image and location
- `src/pages/LoginPage.jsx`, `src/pages/RegisterPage.jsx` – auth flows calling `/api/auth/login` and `/api/auth/register`

## How the Map Works
- Uses `react-leaflet` `MapContainer` and a click handler to capture coordinates
- When posting, coordinates are sent as GeoJSON Point `[lng, lat]` in the `location` field

## Troubleshooting
- If the map tiles do not render, check your network and ensure tiles from `https://{s}.tile.openstreetmap.org` are reachable
- If API calls fail, confirm `VITE_API_URL` matches the server base URL and that CORS is configured (`CLIENT_ORIGINS` on the server)
- If sockets do not connect, verify the server is running and `VITE_API_URL` is reachable; see console for connection logs
