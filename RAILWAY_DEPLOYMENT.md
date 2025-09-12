# Railway Deployment Guide for Campus Finder

## Overview
This guide will help you deploy the Campus Finder application to Railway successfully.

## Fixed Issues
The following issues have been resolved for Railway deployment:

1. **Build Command Structure**: Updated the build process to use proper npm scripts
2. **Package Configuration**: Enhanced root package.json with proper build scripts
3. **Railway Configuration**: Added railway.json and nixpacks.toml for proper deployment
4. **Environment Variables**: Created example environment configuration

## Deployment Steps

### 1. Environment Variables
Set the following environment variables in your Railway project:

```bash
# Required
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
NODE_ENV=production

# Optional (with defaults)
CLIENT_ORIGINS=https://your-domain.up.railway.app
PORT=5000
EMBED_CRON=*/5 * * * *

# AI Service (if using AI features)
GOOGLE_AI_API_KEY=your_google_ai_api_key

# Cloudinary (if using image uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### 2. Build Process
The application now uses the following build process:

1. **Install Dependencies**: `npm install` (installs concurrently for dev)
2. **Build Client**: `npm run build` (builds React app)
3. **Install Server Dependencies**: `cd server && npm ci`
4. **Start Server**: `npm start` (runs the server)

### 3. File Structure
```
campus-finder/
├── package.json          # Root package with build scripts
├── railway.json          # Railway deployment config
├── nixpacks.toml         # Nixpacks build config
├── client/               # React frontend
│   ├── package.json
│   ├── package-lock.json
│   └── dist/            # Built frontend (created during build)
└── server/              # Express backend
    ├── package.json
    ├── package-lock.json
    └── index.js         # Main server file
```

### 4. Key Changes Made

#### Root package.json
- Added proper build scripts
- Added concurrently for development
- Set main entry point to server/index.js

#### Build Scripts
- `npm run build-all`: Builds client and installs server dependencies
- `npm start`: Starts the server
- `npm run dev`: Runs both client and server in development

#### Railway Configuration
- `railway.json`: Defines build and deploy commands
- `nixpacks.toml`: Alternative build configuration

### 5. Production Behavior
- Client is built and served statically by the Express server
- All non-API routes serve the React app (SPA routing)
- API routes are prefixed with `/api`
- Socket.io is configured for real-time features

### 6. Troubleshooting

#### Build Fails
- Ensure all package-lock.json files are committed
- Check that environment variables are set
- Verify MongoDB connection string is correct

#### Runtime Errors
- Check Railway logs for specific error messages
- Ensure all required environment variables are set
- Verify database connectivity

#### Client Not Loading
- Check that CLIENT_ORIGINS includes your Railway domain
- Ensure NODE_ENV is set to 'production'
- Verify the build process completed successfully

## Next Steps
1. Set up your environment variables in Railway
2. Connect your MongoDB database
3. Deploy and test the application
4. Configure custom domain if needed

The application should now deploy successfully on Railway!
