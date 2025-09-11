// /src/pages/MyPostsPage.jsx
import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const MyPostsPage = () => {
  const [myItems, setMyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userInfo } = useContext(AuthContext);

  const fetchMyItems = async () => {
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
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/items/my-items`, config);
      setMyItems(data);
    } catch (error) {
      console.error('Failed to fetch my items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyItems();
  }, [userInfo]);

  const handleMarkAsReunited = async (itemId) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      };
      await axios.put(`${import.meta.env.VITE_API_URL}/api/items/${itemId}/status`, {}, config);
      fetchMyItems(); // Refresh the list
    } catch (error) {
      console.error('Failed to update item status:', error);
    }
  };

  if (loading) {
    return <div className="text-center p-10">Loading your posts...</div>;
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-white min-h-screen">
      <div className="container mx-auto p-4 md:p-8">
        <h2 className="text-4xl font-extrabold text-indigo-700 mb-8 tracking-tight">My Post History</h2>
        {myItems.length === 0 ? (
          <div className="bg-white p-8 rounded-xl shadow-lg text-center">
            <p className="text-gray-500 text-lg">You haven't posted any items yet.</p>
            <Link to="/" className="text-indigo-600 hover:underline mt-4 inline-block font-bold">Post an item</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {myItems.map((item) => (
              <div key={item._id} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-indigo-100">
                <img src={item.imageUrl} alt={item.description} className="w-full h-56 object-cover rounded-t-2xl" />
                <div className="p-6">
                  <span className={`inline-block px-3 py-1 text-sm font-bold rounded-full mb-2 ${
                    item.itemType === 'Lost' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {item.itemType}
                  </span>
                  <h3 className="text-xl font-extrabold mt-2 text-indigo-700">{item.category}</h3>
                  <p className="text-gray-600 text-base mb-4">{item.description}</p>
                  {item.status === 'active' ? (
                     <button
                      onClick={() => handleMarkAsReunited(item._id)}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-md text-base"
                    >
                      Mark as Reunited
                    </button>
                  ) : (
                    <p className="text-center font-semibold text-green-600 bg-green-50 p-3 rounded-xl text-base">Reunited</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPostsPage;
