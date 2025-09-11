// /src/pages/NotificationsPage.jsx
import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Modal from '../components/Modal.jsx';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const { userInfo } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!userInfo) {
        setLoading(false);
        return;
      }
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        };
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/notifications`, config);
        setNotifications(data);
      } catch (error) {
        if (import.meta.env.DEV) console.error('Failed to fetch notifications:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [userInfo]);

  const handleNotificationClick = (notification) => {
    setSelectedNotification(notification);
    setIsModalOpen(true);
  };

  const handleStartChat = () => {
    if (selectedNotification) {
      setIsModalOpen(false);
      navigate(`/chat/${selectedNotification.otherUser._id}`);
    }
  };

  if (loading) {
    return <div className="text-center p-10">Loading notifications...</div>;
  }

  return (
    <>
      <div className="bg-gradient-to-br from-indigo-50 to-white min-h-screen">
        <div className="container mx-auto p-4 md:p-8">
          <h2 className="text-4xl font-extrabold text-indigo-700 mb-8 tracking-tight">Notifications</h2>
          {notifications.length === 0 ? (
            <div className="bg-white p-8 rounded-xl shadow-lg text-center">
              <p className="text-gray-500 text-lg">You have no new notifications.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {notifications.map((notif) => {
                // Check if this is a message notification (no matchItemId, but has otherUser)
                const isMessageNotif = notif.otherUser && !notif.matchItemId;
                const isActionable = notif.otherUser && notif.matchItemId;

                return (
                  <div
                    key={notif._id}
                    onClick={() => isActionable && handleNotificationClick(notif)}
                    className={`w-full text-left bg-white p-6 rounded-xl shadow-lg flex items-start space-x-6 transition-colors ${
                      isActionable || isMessageNotif
                        ? 'hover:bg-indigo-50 cursor-pointer'
                        : 'opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className={`flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center font-bold text-2xl ${isMessageNotif ? 'bg-green-500 text-white' : 'bg-indigo-500 text-white'}`}>
                      {isMessageNotif ? '💬' : '🔔'}
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-semibold text-gray-800 mb-1">{notif.message}</p>
                        <small className="text-gray-400">{new Date(notif.createdAt).toLocaleString()}</small>
                      </div>
                      {isMessageNotif && notif.otherUser && (
                        <button
                          onClick={() => navigate(`/chat/${notif.otherUser._id}`)}
                          className="mt-3 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-5 rounded-lg transition-all duration-300 shadow-md"
                        >
                          Reply & Chat
                        </button>
                      )}
                      {isActionable && (
                        <button
                          onClick={() => handleNotificationClick(notif)}
                          className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-5 rounded-lg transition-all duration-300 shadow-md"
                        >
                          View Match
                        </button>
                      )}
                      {!isActionable && !isMessageNotif && (
                        <p className="text-xs text-red-500 mt-2">(This notification is informational and does not have a chat action.)</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        {selectedNotification && selectedNotification.matchItemId && (
          <div className="text-center">
            <h3 className="text-3xl font-extrabold mb-4 text-indigo-700">Potential Match Found!</h3>
            <p className="text-gray-600 mb-4 text-lg">
              Is this your item?
            </p>
            <div className="border border-gray-200 rounded-xl p-6 mb-4 bg-indigo-50">
              <img 
                src={selectedNotification.matchItemId.imageUrl} 
                alt="Matched item" 
                className="w-full h-56 object-cover rounded-xl mb-4 shadow-md"
              />
              <p className="text-gray-700 font-semibold text-lg">Description:</p>
              <p className="text-gray-600 text-base">{selectedNotification.matchItemId.description}</p>
            </div>
            <p className="text-gray-600 mb-4 text-base">
              This was reported by user: <span className="font-bold text-indigo-700">{selectedNotification.otherUser.name}</span>
            </p>
            <button
              onClick={handleStartChat}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg text-lg"
            >
              Yes, Start Chat
            </button>
          </div>
        )}
      </Modal>
    </>
  );
};

export default NotificationsPage;
