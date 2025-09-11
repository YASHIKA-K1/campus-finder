// /src/context/SocketContext.jsx
import { createContext, useState, useEffect, useContext } from 'react';
import io from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { userInfo } = useContext(AuthContext);

  useEffect(() => {
    if (userInfo) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      if (import.meta.env.DEV) console.log('Connecting to socket.io at:', apiUrl);
      
      const newSocket = io(apiUrl, {
        query: { userId: userInfo._id },
        transports: ['websocket', 'polling'], // Add fallback transport
        timeout: 20000, // 20 second timeout
      });
      
      setSocket(newSocket);

      // Connection event listeners
      newSocket.on('connect', () => {
        if (import.meta.env.DEV) console.log('Socket connected:', newSocket.id);
      });

      newSocket.on('disconnect', (reason) => {
        if (import.meta.env.DEV) console.log('Socket disconnected:', reason);
      });

      newSocket.on('connect_error', (error) => {
        if (import.meta.env.DEV) console.error('Socket connection error:', error);
      });

      // Listener for new notifications (match or chat)
      newSocket.on('newNotification', (notification) => {
        if (import.meta.env.DEV) console.log('Received notification:', notification);
        // Increment unread count for both match and chat notifications
        setUnreadCount((prevCount) => prevCount + 1);
      });

      return () => {
        if (import.meta.env.DEV) console.log('Closing socket connection');
        newSocket.close();
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
      }
    }
  }, [userInfo]);

  const clearUnreadCount = () => {
    setUnreadCount(0);
  };

  return (
    <SocketContext.Provider value={{ socket, unreadCount, clearUnreadCount }}>
      {children}
    </SocketContext.Provider>
  );
};
