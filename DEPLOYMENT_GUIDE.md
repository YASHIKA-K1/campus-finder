# Campus Finder Deployment Guide

## Overview
This project is now configured for deployment on:
- **Frontend (React)**: Vercel
- **Backend (Node.js/Express)**: Render

## Deployment Steps

### 1. Backend Deployment (Render)

1. Go to [Render.com](https://render.com) and create an account
2. Create a new "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Environment**: Node
   - **Plan**: Free

5. Set the following environment variables in Render:
   ```
   NODE_ENV=production
   PORT=10000
   MONGO_URI=your-mongodb-connection-string
   JWT_SECRET=your-jwt-secret
   CLOUDINARY_CLOUD_NAME=your-cloudinary-name
   CLOUDINARY_API_KEY=your-cloudinary-key
   CLOUDINARY_API_SECRET=your-cloudinary-secret
   GOOGLE_AI_API_KEY=your-google-ai-key
   CLIENT_ORIGINS=https://your-vercel-app.vercel.app
   ```

6. Deploy the backend

### 2. Frontend Deployment (Vercel)

1. Go to [Vercel.com](https://vercel.com) and create an account
2. Import your GitHub repository
3. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. Set environment variables in Vercel:
   ```
   VITE_API_URL=https://your-render-app.onrender.com
   ```

5. Deploy the frontend

### 3. Update Configuration Files

After deployment, update these files with your actual URLs:

1. **vercel.json**: Replace `https://your-render-app.onrender.com` with your actual Render URL
2. **render.yaml**: Replace `https://your-vercel-app.vercel.app` with your actual Vercel URL

### 4. Database Setup

Make sure your MongoDB database is accessible from Render. You can use:
- MongoDB Atlas (recommended for production)
- Any MongoDB hosting service

### 5. Environment Variables Reference

#### Backend (Render)
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name
- `CLOUDINARY_API_KEY`: Cloudinary API key
- `CLOUDINARY_API_SECRET`: Cloudinary API secret
- `GOOGLE_AI_API_KEY`: Google AI API key for embeddings
- `CLIENT_ORIGINS`: Comma-separated list of allowed origins
- `NODE_ENV`: Set to "production"
- `PORT`: Set to 10000 (Render's default)

#### Frontend (Vercel)
- `VITE_API_URL`: Your Render backend URL

## File Structure Changes

The following files were created/modified for the new deployment setup:

### New Files:
- `vercel.json` - Vercel configuration
- `client/vercel.json` - Client-specific Vercel config
- `render.yaml` - Render configuration
- `DEPLOYMENT_GUIDE.md` - This guide

### Modified Files:
- `client/vite.config.js` - Added proxy configuration
- `client/package.json` - Added vercel-build script
- `server/index.js` - Removed frontend serving, added health check

### Removed Files:
- `railway.json` - Railway configuration
- `nixpacks.toml` - Nixpacks configuration

## Testing

After deployment:
1. Test the backend health endpoint: `https://your-render-app.onrender.com/health`
2. Test the frontend: `https://your-vercel-app.vercel.app`
3. Verify API calls work from the frontend to the backend

## Troubleshooting

- Make sure CORS origins are correctly set
- Verify all environment variables are set
- Check Render logs for backend issues
- Check Vercel function logs for frontend issues
- Ensure MongoDB is accessible from Render
