import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDrawing, deleteDrawing } from '../services/api';

export default function DrawingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [drawing, setDrawing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchDrawing = async () => {
      try {
        const data = await getDrawing(id);
        setDrawing(data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDrawing();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this drawing?')) return;
    setDeleting(true);
    try {
      await deleteDrawing(id);
      navigate('/my-drawings');
    } catch (err) {
      alert(err.message);
      setDeleting(false);
    }
  };

  const handleDownload = () => {
    if (!drawing?.imageData) return;
    const link = document.createElement('a');
    link.download = `${drawing.title || 'drawing'}.png`;
    link.href = drawing.imageData;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" />
        <p>Loading drawing...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-loading">
        <p className="text-error">{error}</p>
        <button className="action-btn secondary" onClick={() => navigate('/my-drawings')}>
          Back to My Drawings
        </button>
      </div>
    );
  }

  return (
    <div className="drawing-details-page">
      <div className="drawing-details-container">
        {/* Header */}
        <div className="details-header">
          <button
            className="back-btn"
            onClick={() => navigate('/my-drawings')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <div className="details-actions">
            <button className="action-btn secondary" onClick={handleDownload}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download
            </button>
            <button
              className="action-btn danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        {/* Drawing Image */}
        <div className="details-image-wrapper">
          {drawing?.imageData ? (
            <img
              src={drawing.imageData}
              alt={drawing.title}
              className="details-image"
            />
          ) : (
            <div className="details-image-placeholder">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <p>Image data not available</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="details-info">
          <h1 className="details-title">{drawing?.title}</h1>

          <div className="details-meta">
            <div className="meta-item">
              <span className="meta-label">Created</span>
              <span className="meta-value">
                {drawing?.createdAt &&
                  new Date(drawing.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Brush Color</span>
              <span className="meta-value">
                <span
                  className="color-indicator"
                  style={{ background: drawing?.brushColor }}
                />
                {drawing?.brushColor}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Brush Size</span>
              <span className="meta-value">{drawing?.brushSize}px</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
