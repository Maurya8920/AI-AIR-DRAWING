import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook to manage camera access with front/back switching.
 */
export function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraStatus, setCameraStatus] = useState('idle'); // idle | loading | connected | error
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' = front, 'environment' = back

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(
    async (facing = facingMode) => {
      setCameraStatus('loading');
      setCameraError(null);

      // Stop any existing stream
      stopCamera();

      try {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const constraints = {
          video: {
            facingMode: { ideal: facing },
            width: { ideal: isMobile ? 640 : 1280 },
            height: { ideal: isMobile ? 480 : 720 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Wait for video to be ready
          await new Promise((resolve, reject) => {
            videoRef.current.onloadedmetadata = () => {
              videoRef.current
                .play()
                .then(resolve)
                .catch(reject);
            };
            videoRef.current.onerror = reject;
          });
        }

        setCameraStatus('connected');
        setFacingMode(facing);
      } catch (err) {
        console.error('Camera error:', err);
        let message = 'Failed to access camera.';

        if (err.name === 'NotAllowedError') {
          message = 'Camera permission denied. Please allow camera access and try again.';
        } else if (err.name === 'NotFoundError') {
          message = 'No camera detected. Please connect a camera and try again.';
        } else if (err.name === 'NotReadableError') {
          message = 'Camera is in use by another application.';
        } else if (err.name === 'OverconstrainedError') {
          message = 'Selected camera mode not supported. Trying default camera...';
          // Fallback: try without facing constraint
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1280 }, height: { ideal: 720 } },
              audio: false,
            });
            streamRef.current = fallbackStream;
            if (videoRef.current) {
              videoRef.current.srcObject = fallbackStream;
              await videoRef.current.play();
            }
            setCameraStatus('connected');
            return;
          } catch {
            message = 'Failed to access any camera.';
          }
        }

        setCameraError(message);
        setCameraStatus('error');
      }
    },
    [facingMode, stopCamera]
  );

  const switchCamera = useCallback(() => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    startCamera(newFacing);
  }, [facingMode, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return {
    videoRef,
    cameraStatus,
    cameraError,
    facingMode,
    startCamera,
    stopCamera,
    switchCamera,
  };
}
