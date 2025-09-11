// /src/pages/ChatPage.jsx
import { useState, useEffect, useContext, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';

const ChatPage = () => {
  const { receiverId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const { userInfo } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch initial chat history
  useEffect(() => {
    const fetchMessages = async () => {
      // FIX: Add a more robust guard to check for the string "undefined"
      if (!userInfo || !receiverId || receiverId === 'undefined') {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        };
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/messages/${receiverId}`, config);
        setMessages(data);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [receiverId, userInfo]);

  // Listen for incoming messages in real-time
  useEffect(() => {
    if (socket) {
      const handleNewMessage = (incomingMessage) => {
        if (incomingMessage.senderId === receiverId) {
          setMessages((prevMessages) => [...prevMessages, incomingMessage]);
        }
      };
      socket.on('newMessage', handleNewMessage);
      return () => {
        socket.off('newMessage', handleNewMessage);
      };
    }
  }, [socket, receiverId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !receiverId || receiverId === 'undefined') return;

    try {
      const messageData = {
        senderId: userInfo._id,
        receiverId,
        message: newMessage,
      };
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userInfo.token}`,
        },
      };
      const { data: savedMessage } = await axios.post(`${import.meta.env.VITE_API_URL}/api/messages/send/${receiverId}`, { message: newMessage }, config);
      socket.emit('sendMessage', messageData);
      setMessages((prevMessages) => [...prevMessages, savedMessage]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (loading) return <p className="text-center p-10">Loading chat...</p>;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-100">
      <div className="flex-grow p-2 md:p-4 overflow-y-auto">
        {messages.map((msg, index) => (
          <div key={msg._id || index} className={`flex ${msg.senderId === userInfo._id ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`max-w-[80%] md:max-w-md p-3 rounded-lg ${msg.senderId === userInfo._id ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800 shadow-sm'}`}>
              <p>{msg.message}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-2 md:p-4 bg-white border-t flex gap-2 sticky bottom-0">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-grow p-3 md:p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button type="submit" className="bg-indigo-600 text-white px-4 md:px-6 rounded-lg hover:bg-indigo-700"
          aria-label="Send message"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatPage;
