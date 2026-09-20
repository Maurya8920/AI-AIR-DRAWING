import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { drawHandLandmarks } from '../utils/drawingUtils';

/**
 * CameraView renders the mirrored video feed and a landmark overlay canvas.
 * The landmark overlay is drawn imperatively via ref methods to avoid re-renders.
 * Canvas internal resolution matches the video stream resolution so hand landmarks
 * map 1:1 with high precision.
 */
const CameraView = forwardRef(function CameraView(
  { videoRef, onCanvasResize, width = 640, height = 480 },
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

  // Sync video resolution and report to parent
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncVideoDimensions = () => {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw && vh && onCanvasResize) {
        onCanvasResize(vw, vh);
      }
    };

    video.addEventListener('loadedmetadata', syncVideoDimensions);
    video.addEventListener('playing', syncVideoDimensions);
    window.addEventListener('resize', syncVideoDimensions);
    window.addEventListener('orientationchange', syncVideoDimensions);

    if (video.videoWidth && video.videoHeight) {
      syncVideoDimensions();
    }

    return () => {
      video.removeEventListener('loadedmetadata', syncVideoDimensions);
      video.removeEventListener('playing', syncVideoDimensions);
      window.removeEventListener('resize', syncVideoDimensions);
      window.removeEventListener('orientationchange', syncVideoDimensions);
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
      <canvas
        ref={overlayCanvasRef}
        className="landmarks-canvas landmark-overlay"
        width={width}
        height={height}
      />
    </div>
  );
});

export default CameraView;
