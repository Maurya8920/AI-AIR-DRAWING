import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function StartScreen() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="landing-layout">
      {/* Left side: 3-line hero headline + subtitle */}
      <div className="hero-left">
        <h1 className="hero-headline">
          <span className="headline-line-1">Create in</span>
          <span className="headline-line-2">Pure Air</span>
          <span className="headline-line-3">With AI</span>
        </h1>

        <p className="hero-subtitle">
          Turn your hand into an expressive touchless brush. Natural gesture tracking in 3D air space powered by high-speed vision AI.
        </p>

        <div className="hero-features">
          <div className="feature-chip">
            <span className="feature-dot" />
            <span>21 Hand Joint Tracking</span>
          </div>
          <div className="feature-chip">
            <span className="feature-dot" />
            <span>Angle-Invariant Gestures</span>
          </div>
          <div className="feature-chip">
            <span className="feature-dot" />
            <span>Cloud Gallery</span>
          </div>
        </div>
      </div>

      {/* Bottom right: Floating glass card inspired by reference */}
      <div className="hero-right">
        <div className="glass-card booking-style-card">
          <div className="card-top-row">
            <div>
              <span className="card-tag">Vision Studio</span>
              <h2 className="card-heading">Air Drawing Suite</h2>
            </div>
            <div className="card-icon-bubble">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              </svg>
            </div>
          </div>

          <div className="gesture-guide-preview">
            <div className="gesture-row-compact">
              <span className="gesture-icon">☝️</span>
              <div className="gesture-detail">
                <span className="gesture-name">Index Up</span>
                <span className="gesture-desc">Draw / Ink stroke</span>
              </div>
            </div>

            <div className="gesture-row-compact">
              <span className="gesture-icon">✌️</span>
              <div className="gesture-detail">
                <span className="gesture-name">Two Fingers</span>
                <span className="gesture-desc">Hover / Pen lift</span>
              </div>
            </div>

            <div className="gesture-row-compact">
              <span className="gesture-icon">✋</span>
              <div className="gesture-detail">
                <span className="gesture-name">Open Palm (1s)</span>
                <span className="gesture-desc">Undoable clear</span>
              </div>
            </div>

            <div className="gesture-row-compact">
              <span className="gesture-icon">👍</span>
              <div className="gesture-detail">
                <span className="gesture-name">Thumbs Up</span>
                <span className="gesture-desc">Save / Download</span>
              </div>
            </div>
          </div>

          <div className="card-action-block">
            <div className="card-status-info">
              <span className="status-label-small">Experience</span>
              <span className="status-value-small">Zero Hardware Required</span>
            </div>
            <div className="card-cta-group">
              <Link to="/draw" className="btn-pill-primary">
                Start Drawing
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>

              {!isAuthenticated ? (
                <Link to="/register" className="btn-glass-secondary">
                  Join Free
                </Link>
              ) : (
                <Link to="/my-drawings" className="btn-glass-secondary">
                  My Gallery
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
