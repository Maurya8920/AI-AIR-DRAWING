import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDrawings, deleteDrawing } from '../services/api';

export default function MyDrawings() {
  const [drawings, setDrawings] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const navigate = useNavigate();

  const fetchDrawings = async (query = '') => {
    try {
      setLoading(true);
      const data = await getDrawings(query);
      setDrawings(data.data || []);
    } catch (err) {
      console.error('Failed to load drawings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrawings();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDrawings(search);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this drawing?')) return;
    setDeleting(id);
    try {
      await deleteDrawing(id);
      setDrawings((prev) => prev.filter((d) => d._id !== id));
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="my-drawings-page">
      <div className="my-drawings-container">
        <div className="my-drawings-header">
          <div>
            <h1>My Drawings</h1>
            <p className="gallery-subtitle">Browse and manage your cloud-saved creations</p>
          </div>
          <Link to="/draw" className="action-btn primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Drawing
          </Link>
        </div>

        {/* Search */}
        <form className="search-bar" onSubmit={handleSearch}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search drawings by title..."
          />
          <button type="submit" className="search-submit">Search</button>
        </form>

        {loading ? (
          <div className="page-loading">
            <div className="loading-spinner" />
            <p>Loading drawings...</p>
          </div>
        ) : drawings.length === 0 ? (
          <div className="dashboard-empty">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <h3>{search ? 'No drawings match your search' : 'No drawings yet'}</h3>
            <p>Start drawing in the air to create your first masterpiece!</p>
            <Link to="/draw" className="action-btn primary">Start Drawing</Link>
          </div>
        ) : (
          <div className="drawings-grid-full">
            {drawings.map((d) => (
              <div key={d._id} className="drawing-card">
                <div
                  className="drawing-card-image"
                  onClick={() => navigate(`/drawings/${d._id}`)}
                >
                  {d.thumbnail ? (
                    <img
                      src={d.thumbnail}
                      alt={d.title}
                      className="drawing-card-thumb"
                      loading="lazy"
                    />
                  ) : (
                    <div className="drawing-card-placeholder">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="drawing-card-body">
                  <h3 className="drawing-card-title">{d.title}</h3>
                  <p className="drawing-card-date">
                    {new Date(d.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <div className="drawing-card-actions">
                    <button
                      className="card-btn open"
                      onClick={() => navigate(`/drawings/${d._id}`)}
                    >
                      Open
                    </button>
                    <button
                      className="card-btn delete"
                      onClick={() => handleDelete(d._id)}
                      disabled={deleting === d._id}
                    >
                      {deleting === d._id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
