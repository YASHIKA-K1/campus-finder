import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { Icon } from 'leaflet';
import { AuthContext } from '../context/AuthContext';

delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });
  return null;
}

const HomePage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    itemType: 'Lost',
    category: '',
    description: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [location, setLocation] = useState(null);
  const { userInfo } = useContext(AuthContext);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/items`);
      setItems(res.data);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location || !imageFile) {
      alert('Please select a location and upload an image.');
      return;
    }

    setSubmitting(true);
    const submissionData = new FormData();
    submissionData.append('image', imageFile);
    submissionData.append('itemType', formData.itemType);
    submissionData.append('category', formData.category);
    submissionData.append('description', formData.description);
    submissionData.append('location', JSON.stringify({ type: 'Point', coordinates: [location.lng, location.lat] }));

    try {
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${userInfo.token}`,
        },
      };
      await axios.post(`${import.meta.env.VITE_API_URL}/api/items`, submissionData, config);

      setFormData({ itemType: 'Lost', category: '', description: '' });
      setImageFile(null);
      setLocation(null);
      document.getElementById('image-upload').value = null;
      fetchItems();
      alert('Item posted successfully!');
    } catch (error) {
      console.error('Failed to post item:', error.response?.data?.message);
      alert('Failed to post item. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center p-10">Loading map and items...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <div className="rounded-2xl shadow-2xl overflow-hidden border border-indigo-100">
            <MapContainer
              center={[26.1878, 91.6915]} // IIT Guwahati center
              zoom={15}
              className="h-[60vh] md:h-[600px] w-full"
              maxBounds={[
                [26.16, 91.67], // Southwest corner
                [26.21, 91.71], // Northeast corner
              ]}
              maxBoundsViscosity={0.5} // allows scroll, gently pulls back if you drag too far
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />

              {items.map((item) => (
                <Marker
                  key={item._id}
                  position={[item.location.coordinates[1], item.location.coordinates[0]]}
                >
                  <Popup>
                    <div className="flex flex-col items-center">
                      <img
                        src={item.imageUrl}
                        alt={item.category}
                        className="w-40 h-32 object-cover rounded-lg mb-2 shadow"
                      />
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold rounded-full mb-2 ${item.itemType === 'Lost'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                          }`}
                      >
                        {item.itemType}
                      </span>
                      <b className="text-lg text-indigo-700">{item.category}</b>
                      <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {userInfo && <LocationMarker onLocationSelect={setLocation} />}
              {location && <Marker position={location} />}
            </MapContainer>


          </div>
        </div>
        <div className="lg:col-span-1">
          {userInfo ? (
            <div className="bg-white p-8 rounded-2xl shadow-2xl border border-indigo-100">
              <h3 className="text-3xl font-extrabold mb-6 text-indigo-700">Post an Item</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">Upload Image</label>
                  <input
                    type="file"
                    id="image-upload"
                    name="image"
                    onChange={handleImageChange}
                    className="mt-1 block w-full text-base text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-base file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">Category</label>
                  <input
                    type="text"
                    name="category"
                    placeholder="e.g., Phone, Keys"
                    value={formData.category}
                    onChange={handleFormChange}
                    className="mt-1 block w-full px-4 py-3 bg-white border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">Item Type</label>
                  <select name="itemType" value={formData.itemType} onChange={handleFormChange} className="mt-1 block w-full px-4 py-3 bg-white border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base">
                    <option value="Lost">Lost</option>
                    <option value="Found">Found</option>
                  </select>
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    name="description"
                    placeholder="e.g., Blue Milton bottle with a dent"
                    value={formData.description}
                    onChange={handleFormChange}
                    className="mt-1 block w-full px-4 py-3 bg-white border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base"
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className={`w-full flex justify-center items-center py-3 px-6 border border-transparent rounded-xl shadow-md text-base font-bold text-white focus:outline-none ${
                    submitting 
                      ? 'bg-indigo-400 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Posting...
                    </>
                  ) : (
                    'Post Item'
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-6 rounded-2xl shadow-xl" role="alert">
              <p className="font-bold text-lg">Welcome to Campus Finder!</p>
              <p className="text-base">Please log in or register to post a lost or found item.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
