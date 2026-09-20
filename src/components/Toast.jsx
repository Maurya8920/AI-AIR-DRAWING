import { useState, useEffect } from 'react';

/**
 * Toast notification component.
 * Auto-dismisses after 3 seconds (or 5 seconds if an action button is present).
 */
export default function Toast({
  message,
  type = 'success',
  actionLabel,
  onAction,
  onClose,
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const duration = actionLabel ? 5000 : 3000;
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Wait for animation
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, actionLabel]);

  return (
    <div className={`toast toast-${type} ${visible ? 'toast-enter' : 'toast-exit'}`}>
      <span className="toast-icon">
        {type === 'success' && '✓'}
        {type === 'error' && '✕'}
        {type === 'info' && 'ℹ'}
      </span>
      <span className="toast-message">{message}</span>
      {actionLabel && onAction && (
        <button
          className="toast-action-btn"
          onClick={() => {
            onAction();
            if (onClose) onClose();
          }}
        >
          {actionLabel}
        </button>
      )}
      <button className="toast-close" onClick={onClose}>×</button>
    </div>
  );
}
