import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/navbar.css';

function Navbar({ user, userName, setUser, setUserName }) {
  const navigate = useNavigate();
  const isLoggedIn = user;

  // Dark/Light Mode State
  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem('theme') === 'dark'
  );

  // Sync dark mode class on body
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("userName");
    if (setUser) setUser(null);
    if (setUserName) setUserName("Writer");
    navigate("/login");
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const openProfileView = () => {
    // Flag to open profile view when they enter the dashboard
    localStorage.setItem("openProfileOnLoad", "true");
    navigate("/dashboard");
  };

  return (
    <nav className="navbar">
      <h1 className="logo" onClick={() => navigate("/")}>
        PublishPro
      </h1>

      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/library">Library</Link>

        {isLoggedIn && (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <span
              className="navbar-user-greeting"
              onClick={openProfileView}
              title="Click to view profile drawer"
            >
              ✍️ Hi, <strong>{userName}</strong>
            </span>
          </>
        )}

        {/* Sun/Moon Theme Toggler */}
        <button
          className="theme-toggle-navbar-btn"
          onClick={toggleTheme}
          title="Toggle Dark/Light Mode"
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>

        {!isLoggedIn ? (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup" className="nav-btn">
              Get Started
            </Link>
          </>
        ) : (
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}

export default Navbar;