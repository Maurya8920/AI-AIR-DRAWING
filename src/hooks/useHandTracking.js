import { useRef, useCallback, useState, useEffect } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

/**
 * Custom hook for real-time hand tracking using MediaPipe Tasks Vision HandLandmarker.
 *
 * Uses requestAnimationFrame loop with refs to avoid React re-renders per frame.
 * Tries GPU delegate first, automatically falls back to CPU if GPU is unavailable.
 */
export function useHandTracking() {
  const handLandmarkerRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastTimestampRef = useRef(-1);
  const fpsCounterRef = useRef({ frames: 0, lastTime: performance.now(), fps: 0 });
  const onResultsCallbackRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);
  const [fps, setFps] = useState(0);
  const [handDetected, setHandDetected] = useState(false);
  const [delegateUsed, setDelegateUsed] = useState('GPU');

  /**
   * Initialize the HandLandmarker model with GPU -> CPU fallback.
   */
  const initialize = useCallback(async () => {
    if (handLandmarkerRef.current) return; // Already initialized

    setIsLoading(true);
    setError(null);

    const modelUrl =
      'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
      );

      let handLandmarker = null;

      // 1. Try GPU delegate
      try {
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelUrl,
            delegate: 'GPU',
          },
          numHands: 1,
          runningMode: 'VIDEO',
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        setDelegateUsed('GPU');
      } catch (gpuErr) {
        console.warn('⚠️ MediaPipe GPU delegate failed, falling back to CPU:', gpuErr);
        // 2. Fallback to CPU delegate
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelUrl,
            delegate: 'CPU',
          },
          numHands: 1,
          runningMode: 'VIDEO',
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        setDelegateUsed('CPU');
      }

      handLandmarkerRef.current = handLandmarker;
      setIsLoading(false);
    } catch (err) {
      console.error('HandLandmarker init error:', err);
      setError('Hand tracking model failed to load. Please check your connection and reload.');
      setIsLoading(false);
    }
  }, []);

  /**
   * Set the callback that will be called with each frame's results.
   */
  const setOnResults = useCallback((callback) => {
    onResultsCallbackRef.current = callback;
  }, []);

  /**
   * Start the detection loop on a given video element.
   */
  const startTracking = useCallback(
    (videoElement) => {
      if (!handLandmarkerRef.current || !videoElement) return;

      setIsRunning(true);
      lastTimestampRef.current = -1;

      const detect = () => {
        if (!handLandmarkerRef.current || !videoElement || videoElement.paused || videoElement.ended) {
          animFrameRef.current = requestAnimationFrame(detect);
          return;
        }

        const now = performance.now();

        // Only process if we have a new frame
        if (videoElement.currentTime !== lastTimestampRef.current) {
          lastTimestampRef.current = videoElement.currentTime;

          try {
            const results = handLandmarkerRef.current.detectForVideo(videoElement, now);

            const hasHand = results.landmarks && results.landmarks.length > 0;
            setHandDetected(hasHand);

            if (onResultsCallbackRef.current) {
              onResultsCallbackRef.current(
                hasHand ? results.landmarks[0] : null,
                hasHand ? results.handednesses[0] : null
              );
            }
          } catch {
            // Silently skip frame errors
          }
        }

        // FPS counter
        const counter = fpsCounterRef.current;
        counter.frames++;
        const elapsed = now - counter.lastTime;
        if (elapsed >= 1000) {
          const currentFps = Math.round((counter.frames * 1000) / elapsed);
          counter.frames = 0;
          counter.lastTime = now;
          counter.fps = currentFps;
          setFps(currentFps);
        }

        animFrameRef.current = requestAnimationFrame(detect);
      };

      animFrameRef.current = requestAnimationFrame(detect);
    },
    []
  );

  /**
   * Stop the detection loop.
   */
  const stopTracking = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsRunning(false);
    setHandDetected(false);
  }, []);

  /**
   * Cleanup on unmount.
   */
  useEffect(() => {
    return () => {
      stopTracking();
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
    };
  }, [stopTracking]);

  return {
    initialize,
    startTracking,
    stopTracking,
    setOnResults,
    isLoading,
    isRunning,
    error,
    fps,
    handDetected,
    delegateUsed,
  };
}
