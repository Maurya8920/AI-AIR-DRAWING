import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { drawHandLandmarks } from '../utils/drawingUtils';

/**
 * CameraView renders the mirrored video feed and a landmark overlay canvas.
 * The landmark overlay is drawn imperatively via ref methods to avoid re-renders.
 */
const CameraView = forwardRef(function CameraView(
  { videoRef, onCanvasResize },
  ref
) {
  const overlayCanvasRef = useRef(null);
  const containerRef = useRef(null);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    drawLandmarks(landmarks) {
      const canvas = overlayCanvasRef.current;
      if (!canvas || !landmarks) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawHandLandmarks(ctx, landmarks, canvas.width, canvas.height);
    },
    clearOverlay() {
      const canvas = overlayCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
    getOverlayDimensions() {
      const canvas = overlayCanvasRef.current;
      return canvas ? { width: canvas.width, height: canvas.height } : null;
    },
  }));

  // Sync canvas dimensions with the video display size
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncSize = () => {
      const container = containerRef.current;
      const overlay = overlayCanvasRef.current;
      if (!container || !overlay) return;

      const rect = container.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);

      if (overlay.width !== w || overlay.height !== h) {
        overlay.width = w;
        overlay.height = h;
        if (onCanvasResize) {
          onCanvasResize(w, h);
        }
      }
    };

    // Sync on video play and resize
    video.addEventListener('playing', syncSize);
    window.addEventListener('resize', syncSize);

    // Also sync periodically in case of layout shifts
    const interval = setInterval(syncSize, 1000);

    // Initial sync
    syncSize();

    return () => {
      video.removeEventListener('playing', syncSize);
      window.removeEventListener('resize', syncSize);
      clearInterval(interval);
    };
  }, [videoRef, onCanvasResize]);

  return (
    <div className="camera-view-container camera-container" ref={containerRef}>
      <video
        ref={videoRef}
        className="camera-video"
        autoPlay
        playsInline
        muted
      />
      <canvas ref={overlayCanvasRef} className="landmarks-canvas landmark-overlay" />
    </div>
  );
});

export default CameraView;
