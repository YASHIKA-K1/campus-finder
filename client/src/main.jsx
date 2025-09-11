// /src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// Import global styles
import './index.css';
import 'leaflet/dist/leaflet.css';

// Import Context Providers
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Import Layout and Page Components
import App from './App.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import ChatPage from './pages/ChatPages.jsx';
import MyPostsPage from './pages/MyPostsPage.jsx';

// Define the router configuration
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />, // The main App component acts as the layout
    children: [
      {
        index: true, // Default page for '/'
        element: <HomePage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
      {
        path: 'notifications',
        element: <NotificationsPage />,
      },
      {
        path: 'chat/:receiverId',
        element: <ChatPage />,
      },
      {
        path: 'my-posts', // The route for the My Posts page
        element: <MyPostsPage />,
      },
    ],
  },
]);

// Render the application
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <SocketProvider>
        <RouterProvider router={router} />
      </SocketProvider>
    </AuthProvider>
  </React.StrictMode>
);
