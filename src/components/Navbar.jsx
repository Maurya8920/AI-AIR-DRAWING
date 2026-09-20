import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Close menu on click/tap outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar" ref={navRef}>
      <div className="navbar-inner">
        {/* Brand Logo with warm orange accent symbol */}
        <Link to="/" className="navbar-logo" onClick={() => setMenuOpen(false)}>
          <span className="logo-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" fill="#FF8A1F" fillOpacity="0.85" />
              <circle cx="16" cy="8" r="4" fill="#FFA54F" fillOpacity="0.9" />
              <circle cx="8" cy="16" r="3" fill="#FF7200" />
            </svg>
          </span>
          <span className="logo-text">AI Air Drawing</span>
        </Link>

        {/* Mobile menu toggle button */}
        <button
          className={`navbar-hamburger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
          <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
          <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
        </button>

        {/* Navigation Links & Action Buttons */}
        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <Link
            to="/"
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            Home
          </Link>
          <Link
            to="/draw"
            className={`nav-link ${isActive('/draw') ? 'active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            Studio
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/my-drawings"
                className={`nav-link ${isActive('/my-drawings') ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                Gallery
              </Link>
              <Link
                to="/dashboard"
                className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>

              <div className="nav-user-section">
                <span className="nav-username">{user?.name}</span>
                <button className="nav-pill-btn nav-logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="nav-auth-section">
              <Link
                to="/login"
                state={{ from: location }}
                className={`nav-link nav-signin-btn ${isActive('/login') ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                Sign In
              </Link>
              <Link
                to="/draw"
                className="nav-pill-btn nav-start-btn"
                onClick={() => setMenuOpen(false)}
              >
                Start Drawing
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
