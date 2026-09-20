import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDrawings } from '../services/api';

export default function Dashboard() {
  const { user } = useAuth();
  const [drawings, setDrawings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0 });

  useEffect(() => {
    const fetchDrawings = async () => {
      try {
        const data = await getDrawings();
        setDrawings(data.data || []);
        setStats({ total: data.count || 0 });
      } catch (err) {
        console.error('Failed to load drawings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDrawings();
  }, []);

  const latestDrawing = drawings[0] || null;
  const recentDrawings = drawings.slice(0, 6);

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Welcome */}
        <div className="dashboard-welcome">
          <h1>
            Welcome back, <span className="highlight">{user?.name}</span>
          </h1>
          <p>Your touchless digital creation workspace</p>
        </div>

        {/* Stats Grid */}
        <div className="dashboard-stats">
          <div className="stat-card">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">Total Drawings</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{user?.email}</span>
            <span className="stat-label">Email</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{memberSince}</span>
            <span className="stat-label">Member Since</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-actions">
          <Link to="/draw" className="action-btn primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            </svg>
            Start Drawing
          </Link>
          <Link to="/my-drawings" className="action-btn secondary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Gallery
          </Link>
        </div>

        {/* Latest Drawing */}
        {latestDrawing && (
          <div className="dashboard-section">
            <h2 className="section-title">Latest Drawing</h2>
            <Link to={`/drawings/${latestDrawing._id}`} className="latest-drawing-card">
              <div className="drawing-image-container">
                {latestDrawing.thumbnail ? (
                  <img
                    src={latestDrawing.thumbnail}
                    alt={latestDrawing.title}
                    className="latest-drawing-thumb"
                  />
                ) : (
                  <div className="drawing-image-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="latest-drawing-info">
                <h3>{latestDrawing.title}</h3>
                <p>
                  {new Date(latestDrawing.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </Link>
          </div>
        )}

        {/* Recent Drawings */}
        {recentDrawings.length > 0 && (
          <div className="dashboard-section">
            <h2 className="section-title">Recent Drawings</h2>
            <div className="drawings-grid">
              {recentDrawings.map((d) => (
                <Link key={d._id} to={`/drawings/${d._id}`} className="drawing-card-mini">
                  <div className="drawing-card-thumb-container">
                    {d.thumbnail ? (
                      <img
                        src={d.thumbnail}
                        alt={d.title}
                        className="drawing-card-mini-thumb"
                      />
                    ) : (
                      <div className="drawing-card-thumb">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <span className="drawing-card-title">{d.title}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {drawings.length === 0 && (
          <div className="dashboard-empty">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            </svg>
            <h3>No drawings yet</h3>
            <p>Start drawing in the air to create your first masterpiece!</p>
            <Link to="/draw" className="action-btn primary">Start Drawing</Link>
          </div>
        )}
      </div>
    </div>
  );
}
