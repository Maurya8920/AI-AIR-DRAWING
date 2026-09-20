import { GESTURE_LABELS } from '../utils/gestureDetection';

/**
 * StatusPanel — shows real-time AI status (camera, hand, gesture, FPS, brush, color, delegate).
 */
export default function StatusPanel({
  cameraStatus,
  handDetected,
  gesture,
  fps,
  brushSize,
  color,
  isModelLoading,
  delegateUsed = 'GPU',
}) {
  const getStatusDot = (active) => (
    <span className={`status-dot ${active ? 'active' : 'inactive'}`} />
  );

  return (
    <div className="status-panel">
      <h3 className="status-title">AI STATUS</h3>
      <div className="status-divider" />

      <div className="status-row">
        <span className="status-label">Camera</span>
        <span className="status-value">
          {getStatusDot(cameraStatus === 'connected')}
          {cameraStatus === 'connected' ? 'Connected' : cameraStatus === 'loading' ? 'Starting...' : 'Off'}
        </span>
      </div>

      <div className="status-row">
        <span className="status-label">Model</span>
        <span className="status-value">
          {getStatusDot(!isModelLoading)}
          {isModelLoading ? 'Loading...' : `Ready (${delegateUsed})`}
        </span>
      </div>

      <div className="status-row">
        <span className="status-label">Hand</span>
        <span className="status-value">
          {getStatusDot(handDetected)}
          {handDetected ? 'Detected' : 'Not Found'}
        </span>
      </div>

      <div className="status-row">
        <span className="status-label">Gesture</span>
        <span className="status-value gesture-value">
          {GESTURE_LABELS[gesture] || '— None'}
        </span>
      </div>

      <div className="status-divider" />

      <div className="status-row">
        <span className="status-label">FPS</span>
        <span className="status-value fps-value">{fps}</span>
      </div>

      <div className="status-row">
        <span className="status-label">Brush</span>
        <span className="status-value">{brushSize}px</span>
      </div>

      <div className="status-row">
        <span className="status-label">Color</span>
        <span className="status-value">
          <span
            className="color-indicator"
            style={{ background: color }}
          />
        </span>
      </div>
    </div>
  );
}
