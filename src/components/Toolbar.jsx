/**
 * Toolbar — floating glass drawing controls (pen, eraser, clear, undo, redo, colors, size, save).
 * Supports both mouse clicks and 700ms touchless TOOLS hover selection with progress rings.
 */

function ProgressRing({ active, progress }) {
  if (!active || progress <= 0) return null;
  const radius = 23;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <svg className="tool-btn-progress-ring" viewBox="0 0 52 52">
      <circle
        cx="26"
        cy="26"
        r={radius}
        className="btn-progress-bg"
        strokeWidth="3"
        fill="none"
      />
      <circle
        cx="26"
        cy="26"
        r={radius}
        className="btn-progress-fill"
        strokeWidth="3.5"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Toolbar({
  tool,
  onToolChange,
  color,
  onColorChange,
  brushSize,
  onBrushSizeChange,
  onClear,
  onUndo,
  onRedo,
  onSave,
  onSaveCloud,
  savingCloud = false,
  isAuthenticated = false,
  onSwitchCamera,
  facingMode,
  hoverInfo = null, // { id: string, progress: number }
}) {
  const brushSizes = [2, 5, 10, 20];

  const presetColors = [
    '#FF8A1F', // Warm Amber Glow (Signature)
    '#FFFFFF', // Crisp White
    '#7FA8B8', // Mist Blue
    '#38BDF8', // Ethereal Cyan
    '#34D399', // Pine Green
    '#F472B6', // Soft Rose
    '#FBBF24', // Amber Sun
    '#F87171', // Coral Red
  ];

  return (
    <div className="toolbar glass-toolbar camera-toolbar">
      {/* Tool select: Pen vs Eraser */}
      <div className="toolbar-group">
        <button
          className={`tool-btn ${tool === 'pen' ? 'active' : ''} ${hoverInfo?.id === 'pen' ? 'cursor-hovered' : ''}`}
          onClick={() => onToolChange('pen')}
          data-tool-id="pen"
          title="Pen"
        >
          <ProgressRing active={hoverInfo?.id === 'pen'} progress={hoverInfo?.progress} />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
          </svg>
        </button>
        <button
          className={`tool-btn ${tool === 'eraser' ? 'active' : ''} ${hoverInfo?.id === 'eraser' ? 'cursor-hovered' : ''}`}
          onClick={() => onToolChange('eraser')}
          data-tool-id="eraser"
          title="Eraser"
        >
          <ProgressRing active={hoverInfo?.id === 'eraser'} progress={hoverInfo?.progress} />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M20 20H7L3 16l9-9 8 8-4 4" />
            <path d="M6 11l4 4" />
          </svg>
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* History & Canvas Management */}
      <div className="toolbar-group">
        <button
          className={`tool-btn ${hoverInfo?.id === 'undo' ? 'cursor-hovered' : ''}`}
          onClick={onUndo}
          data-tool-id="undo"
          title="Undo (Ctrl+Z)"
        >
          <ProgressRing active={hoverInfo?.id === 'undo'} progress={hoverInfo?.progress} />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
        <button
          className={`tool-btn ${hoverInfo?.id === 'redo' ? 'cursor-hovered' : ''}`}
          onClick={onRedo}
          data-tool-id="redo"
          title="Redo (Ctrl+Y)"
        >
          <ProgressRing active={hoverInfo?.id === 'redo'} progress={hoverInfo?.progress} />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
          </svg>
        </button>
        <button
          className={`tool-btn ${hoverInfo?.id === 'clear' ? 'cursor-hovered' : ''}`}
          onClick={onClear}
          data-tool-id="clear"
          title="Clear Canvas"
        >
          <ProgressRing active={hoverInfo?.id === 'clear'} progress={hoverInfo?.progress} />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Preset Swatches & Custom Picker */}
      <div className="toolbar-group color-group">
        {presetColors.map((c) => {
          const isSelected = color.toLowerCase() === c.toLowerCase();
          const toolId = `color-${c}`;
          return (
            <button
              key={c}
              data-tool-id={toolId}
              className={`color-swatch ${isSelected ? 'active' : ''} ${hoverInfo?.id === toolId ? 'cursor-hovered' : ''}`}
              style={{ background: c }}
              onClick={() => onColorChange(c)}
              title={c}
            >
              <ProgressRing active={hoverInfo?.id === toolId} progress={hoverInfo?.progress} />
            </button>
          );
        })}
        <label
          className={`color-custom ${hoverInfo?.id === 'custom-color' ? 'cursor-hovered' : ''}`}
          data-tool-id="custom-color"
          title="Custom Color"
        >
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
          />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" opacity="0.3" />
          </svg>
        </label>
      </div>

      <div className="toolbar-divider" />

      {/* Brush Sizes */}
      <div className="toolbar-group size-group">
        {brushSizes.map((s) => {
          const toolId = `size-${s}`;
          return (
            <button
              key={s}
              data-tool-id={toolId}
              className={`size-btn ${brushSize === s ? 'active' : ''} ${hoverInfo?.id === toolId ? 'cursor-hovered' : ''}`}
              onClick={() => onBrushSizeChange(s)}
              title={`${s}px Width`}
            >
              <ProgressRing active={hoverInfo?.id === toolId} progress={hoverInfo?.progress} />
              <span
                className="size-dot"
                style={{
                  width: Math.min(s * 2, 22),
                  height: Math.min(s * 2, 22),
                }}
              />
            </button>
          );
        })}
      </div>

      <div className="toolbar-divider" />

      {/* Save & Camera Controls */}
      <div className="toolbar-group">
        <button
          className={`tool-btn ${hoverInfo?.id === 'save' ? 'cursor-hovered' : ''}`}
          onClick={onSave}
          data-tool-id="save"
          title="Download PNG"
        >
          <ProgressRing active={hoverInfo?.id === 'save'} progress={hoverInfo?.progress} />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
        {onSaveCloud && (
          <button
            className={`tool-btn cloud-save-btn ${savingCloud ? 'saving' : ''} ${hoverInfo?.id === 'cloud-save' ? 'cursor-hovered' : ''}`}
            onClick={onSaveCloud}
            data-tool-id="cloud-save"
            disabled={savingCloud}
            title={isAuthenticated ? 'Save to your account' : 'Sign in to save to cloud'}
          >
            <ProgressRing active={hoverInfo?.id === 'cloud-save'} progress={hoverInfo?.progress} />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
              {!savingCloud && <polyline points="16 16 12 12 8 16" />}
              {!savingCloud && <line x1="12" y1="12" x2="12" y2="20" />}
            </svg>
            {savingCloud && <span className="spinner spinner-small" />}
          </button>
        )}
        <button
          className={`tool-btn camera-switch-btn ${hoverInfo?.id === 'switch-camera' ? 'cursor-hovered' : ''}`}
          onClick={onSwitchCamera}
          data-tool-id="switch-camera"
          title={facingMode === 'user' ? 'Switch to Environment Camera' : 'Switch to Front Camera'}
        >
          <ProgressRing active={hoverInfo?.id === 'switch-camera'} progress={hoverInfo?.progress} />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <path d="M9 13l3-3 3 3" />
            <path d="M15 13l-3 3-3-3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
