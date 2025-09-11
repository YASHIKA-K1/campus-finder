// /src/components/Header.jsx
import { Link, useNavigate } from 'react-router-dom';
import { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';

const Header = () => {
  const { userInfo, logout } = useContext(AuthContext);
  const { unreadCount, clearUnreadCount } = useContext(SocketContext);
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNotificationsClick = () => {
    clearUnreadCount();
    navigate('/notifications');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="text-2xl font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
              Campus Finder 📍
            </Link>
          </div>

          {/* Navigation */}
          <div className="hidden sm:flex items-center space-x-6">
            {userInfo ? (
              <>
                <button
                  onClick={handleNotificationsClick}
                  className="relative flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-indigo-50 transition-colors shadow-sm"
                  style={{ minWidth: 120 }}
                >
                  <span className="text-lg">🔔</span>
                  <span className="font-semibold text-gray-700">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-3 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold border-2 border-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <div className="relative group">
                  <button className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-semibold">
                      {userInfo.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:block text-gray-700">Welcome, {userInfo.name}!</span>
                  </button>
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 invisible group-hover:visible">
                    <Link
                      to="/my-posts"
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      My Posts
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-gray-600 hover:text-indigo-600 transition-colors px-3 py-2 rounded-md text-sm font-medium">
                  Login
                </Link>
                <Link to="/register" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 shadow-sm">
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="sm:hidden">
            <button
              aria-label="Toggle menu"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-indigo-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {isMobileMenuOpen ? '✖️' : '☰'}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {isMobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-3 space-y-3">
            {userInfo ? (
              <>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); handleNotificationsClick(); }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-gray-100 hover:bg-indigo-50"
                >
                  <span className="flex items-center gap-2"><span>🔔</span> Notifications</span>
                  {unreadCount > 0 && (
                    <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <Link
                  to="/my-posts"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100"
                >
                  My Posts
                </Link>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="block w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100">Login</Link>
                <Link to="/register" onClick={() => setIsMobileMenuOpen(false)} className="block w-full text-left px-4 py-3 rounded-lg bg-indigo-600 text-white text-center hover:bg-indigo-700">Register</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
