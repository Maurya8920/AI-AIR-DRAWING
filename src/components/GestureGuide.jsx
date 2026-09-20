import { useState } from 'react';

/**
 * GestureGuide — collapsible panel showing gesture → action mappings.
 */
export default function GestureGuide() {
  const [collapsed, setCollapsed] = useState(false);

  const gestures = [
    { emoji: '☝️', label: 'Draw', desc: 'Index finger up' },
    { emoji: '✌️', label: 'Tools', desc: 'Two fingers up' },
    { emoji: '✋', label: 'Clear', desc: 'Open palm' },
    { emoji: '👍', label: 'Save', desc: 'Thumbs up' },
    { emoji: '✊', label: 'Pause', desc: 'Closed fist' },
  ];

  return (
    <div className={`gesture-guide ${collapsed ? 'collapsed' : ''}`}>
      <button
        className="gesture-guide-toggle"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span>GESTURES</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`toggle-arrow ${collapsed ? 'rotated' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {!collapsed && (
        <div className="gesture-list">
          {gestures.map((g) => (
            <div key={g.label} className="gesture-item">
              <span className="gesture-emoji">{g.emoji}</span>
              <div className="gesture-info">
                <span className="gesture-label">{g.label}</span>
                <span className="gesture-desc">{g.desc}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
