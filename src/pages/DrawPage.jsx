import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCamera } from '../hooks/useCamera';
import { useHandTracking } from '../hooks/useHandTracking';
import {
  detectGesture,
  createGestureStabilizer,
  getFingerStates,
  GESTURES,
} from '../utils/gestureDetection';
import { mediapipeToCanvas, smoothPoint } from '../utils/coordinateUtils';
import {
  exportCanvasToOptimizedImage,
  createCanvasThumbnail,
  exportCanvasToPNG,
  downloadDataURL,
} from '../utils/drawingUtils';
import { createDrawing } from '../services/api';
import { useAuth } from '../context/AuthContext';

import CameraView from '../components/CameraView';
import DrawingCanvas from '../components/DrawingCanvas';
import Toolbar from '../components/Toolbar';
import StatusPanel from '../components/StatusPanel';
import GestureGuide from '../components/GestureGuide';
import Toast from '../components/Toast';

/**
 * DrawPage — the full camera + canvas + hand tracking drawing experience.
 * Incorporates 1s hold-to-clear with 300ms grace period and circular indicator,
 * undo/redo (Ctrl+Z), optimized WebP storage, touchless TOOLS selection,
 * and real-time vision debug HUD.
 */
export default function DrawPage() {
  // App state
  const [appState, setAppState] = useState('idle'); // idle | loading | active
  const [gesture, setGesture] = useState(GESTURES.NONE);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#FF8A1F');
  const [brushSize, setBrushSize] = useState(5);
  const [canvasSize, setCanvasSize] = useState({ width: 1280, height: 720 });
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [clearProgress, setClearProgress] = useState(0); // 0 to 100%
  const [toolHover, setToolHover] = useState({ id: null, progress: 0 }); // TOOLS mode dwell
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    handDetected: false,
    fingers: {
      thumb: false,
      index: false,
      middle: false,
      ring: false,
      pinky: false,
      angles: { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 },
    },
    rawGesture: 'none',
    stableGesture: 'none',
    holdProgress: 0,
    cooldownText: 'Ready',
  });

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Refs
  const canvasAreaRef = useRef(null);
  const toolCursorRef = useRef(null);
  const toolHoverRef = useRef({ id: null, startTime: 0, triggered: false });
  const cameraViewRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const smoothingHistoryRef = useRef([]);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const gestureStabilizerRef = useRef(createGestureStabilizer(3));
  const gestureCooldownRef = useRef({});
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const brushSizeRef = useRef(brushSize);
  const isPausedRef = useRef(false);
  const holdStartRef = useRef(null);
  const lastClearSeenTimeRef = useRef(0);
  const showDebugRef = useRef(false);
  const handleSaveLocalRef = useRef(null);
  const handleSaveCloudRef = useRef(null);
  const isAuthenticatedRef = useRef(isAuthenticated);
  const prevFingerStatesRef = useRef({});
  const lastToolsOrDrawTimeRef = useRef(0);
  const lastRingAndPinkyStrictUpTimeRef = useRef(0);

  useEffect(() => { isAuthenticatedRef.current = isAuthenticated; }, [isAuthenticated]);
  useEffect(() => { showDebugRef.current = showDebug; }, [showDebug]);

  // Hooks
  const {
    videoRef,
    cameraStatus,
    cameraError,
    facingMode,
    startCamera,
    switchCamera,
  } = useCamera();

  const {
    initialize: initHandTracking,
    startTracking,
    setOnResults,
    isLoading: isModelLoading,
    error: trackingError,
    fps,
    handDetected,
    delegateUsed,
  } = useHandTracking();

  // Keep refs synced with state
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);

  // Notify on errors
  useEffect(() => {
    if (cameraError) {
      setToast({ message: `Camera error: ${cameraError}`, type: 'error' });
    }
  }, [cameraError]);

  useEffect(() => {
    if (trackingError) {
      setToast({ message: trackingError, type: 'error' });
    }
  }, [trackingError]);

  /**
   * Check if a gesture action is on cooldown (prevents rapid re-triggers).
   */
  const isOnCooldown = useCallback((gestureName, cooldownMs = 1500) => {
    const now = Date.now();
    const last = gestureCooldownRef.current[gestureName] || 0;
    if (now - last < cooldownMs) return true;
    gestureCooldownRef.current[gestureName] = now;
    return false;
  }, []);

  /**
   * Helper to download the current drawing locally as a PNG.
   */
  const downloadPNGLocally = useCallback(() => {
    const canvas = drawingCanvasRef.current?.getCanvas();
    if (!canvas) return false;
    const dataURL = exportCanvasToPNG(canvas);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    downloadDataURL(dataURL, `air-drawing-${timestamp}.png`);
    return true;
  }, []);

  /**
   * Handle local PNG file download.
   */
  const handleSaveLocal = useCallback(() => {
    const success = downloadPNGLocally();
    if (success) {
      setToast({ message: 'Drawing downloaded as PNG!', type: 'success' });
    }
  }, [downloadPNGLocally]);

  useEffect(() => {
    handleSaveLocalRef.current = handleSaveLocal;
  }, [handleSaveLocal]);

  /**
   * Handle save to cloud (backend with 320px thumbnail).
   * If not logged in: downloads locally and prompts user to sign in with a button.
   */
  const handleSaveCloud = useCallback(async () => {
    if (!isAuthenticatedRef.current) {
      downloadPNGLocally();
      setToast({
        message: 'Sign in to save drawings to your gallery',
        type: 'info',
        actionLabel: 'Sign In',
        onAction: () => navigate('/login', { state: { from: location } }),
      });
      return;
    }
    if (saving) return;

    const canvas = drawingCanvasRef.current?.getCanvas();
    if (!canvas) return;

    setSaving(true);
    try {
      const imageData = exportCanvasToOptimizedImage(canvas, { quality: 0.8, maxWidth: 1280 });
      const thumbnail = createCanvasThumbnail(canvas, 320);

      await createDrawing({
        title: `Air Drawing ${new Date().toLocaleString()}`,
        imageData,
        thumbnail,
        brushColor: color,
        brushSize: brushSize,
      });
      setToast({ message: '✓ Drawing saved to your gallery!', type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Failed to save drawing', type: 'error' });
    } finally {
      setSaving(false);
    }
  }, [downloadPNGLocally, navigate, location, saving, color, brushSize]);

  useEffect(() => {
    handleSaveCloudRef.current = handleSaveCloud;
  }, [handleSaveCloud]);

  /**
   * Handle manual clear action — pushes snapshot to undo stack first so it is undoable.
   */
  const handleClear = useCallback(() => {
    drawingCanvasRef.current?.saveSnapshot();
    drawingCanvasRef.current?.clear();
    setToast({ message: 'Canvas cleared (press Ctrl+Z to undo)', type: 'info' });
  }, []);

  /**
   * Handle undo & redo
   */
  const handleUndo = useCallback(() => {
    drawingCanvasRef.current?.undo();
  }, []);

  const handleRedo = useCallback(() => {
    drawingCanvasRef.current?.redo();
  }, []);

  /**
   * Keyboard shortcuts: Ctrl+Z / Cmd+Z for Undo, Ctrl+Y or Shift+Ctrl+Z for Redo.
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  /**
   * Per-frame hand tracking callback — runs outside React render for 60fps.
   */
  const handleTrackingResults = useCallback(
    (landmarks) => {
      // 1. Draw hand skeleton overlay whenever hand is detected
      if (cameraViewRef.current) {
        if (landmarks && landmarks.length >= 21) {
          cameraViewRef.current.drawLandmarks(landmarks);
        } else {
          cameraViewRef.current.clearOverlay();
        }
      }

      const now = performance.now();

      // Check cooldown state without modifying timestamps
      const lastClearCooldown = gestureCooldownRef.current[GESTURES.CLEAR];
      const isClearOnCooldown = lastClearCooldown ? (now - lastClearCooldown) < 1500 : false;
      if (lastClearCooldown && (now - lastClearCooldown) >= 1500) {
        gestureCooldownRef.current[GESTURES.CLEAR] = null;
      }
      const clearCooldownMsLeft = isClearOnCooldown ? Math.max(0, 1500 - (now - lastClearCooldown)) : 0;
      const cooldownText = isClearOnCooldown
        ? `${(clearCooldownMsLeft / 1000).toFixed(1)}s`
        : 'Ready';

      if (!landmarks || landmarks.length < 21) {
        if (isDrawingRef.current) {
          isDrawingRef.current = false;
          lastPointRef.current = null;
          smoothingHistoryRef.current = [];
        }
        // Reset holdStartRef to null only if gesture has NOT been "clear" for > 300ms
        if (holdStartRef.current !== null) {
          const timeSinceClear = now - lastClearSeenTimeRef.current;
          if (timeSinceClear > 300) {
            holdStartRef.current = null;
            lastClearSeenTimeRef.current = 0;
            setClearProgress(0);
          }
        }
        if (toolCursorRef.current) {
          toolCursorRef.current.style.display = 'none';
        }
        if (toolHoverRef.current.id) {
          toolHoverRef.current = { id: null, startTime: 0, triggered: false };
          setToolHover({ id: null, progress: 0 });
        }
        if (showDebugRef.current) {
          setDebugInfo({
            handDetected: false,
            fingers: {
              thumb: false,
              index: false,
              middle: false,
              ring: false,
              pinky: false,
              angles: { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 },
            },
            rawGesture: 'none',
            stableGesture: 'none',
            holdProgress: 0,
            cooldownText,
          });
        }
        return;
      }

      // 2. Classify raw gesture & compute finger angles with hysteresis
      const fingerStates = getFingerStates(landmarks, prevFingerStatesRef.current);
      prevFingerStatesRef.current = fingerStates;

      const rawGesture = detectGesture(landmarks, prevFingerStatesRef.current);
      const stableGesture = gestureStabilizerRef.current(rawGesture);

      setGesture((prev) => (prev !== stableGesture ? stableGesture : prev));

      // Track recent TOOLS or DRAW time (prevent accidental clears while switching):
      // "Do not start CLEAR if the stable gesture was TOOLS or DRAW in the last 500ms"
      if (
        stableGesture === GESTURES.TOOLS ||
        stableGesture === GESTURES.DRAW ||
        rawGesture === GESTURES.TOOLS ||
        rawGesture === GESTURES.DRAW
      ) {
        lastToolsOrDrawTimeRef.current = now;
      }

      // Check if index fingertip cursor is inside the toolbar area:
      // "Never trigger CLEAR while the index fingertip cursor is inside the toolbar area."
      const indexTip = landmarks[8];
      let isCursorInToolbar = false;
      if (canvasAreaRef.current && indexTip) {
        const rect = canvasAreaRef.current.getBoundingClientRect();
        const localX = (1 - indexTip.x) * rect.width;
        const localY = indexTip.y * rect.height;
        const screenX = rect.left + localX;
        const screenY = rect.top + localY;
        const elem = document.elementFromPoint(screenX, screenY);
        isCursorInToolbar = Boolean(
          elem?.closest('.camera-toolbar') ||
          elem?.closest('.toolbar') ||
          localY > (rect.height - 110)
        );
      }

      // Track when ring and pinky were strictly UP (> 160 deg):
      // "If ring or pinky is not UP for more than 150ms, reset the hold to 0."
      if (fingerStates.ringStrict && fingerStates.pinkyStrict) {
        lastRingAndPinkyStrictUpTimeRef.current = now;
      }

      // 3. ✋ CLEAR gesture logic:
      // - Strict: All four fingers (index, middle, ring, pinky) must be clearly UP (angle > 160) on every counted frame.
      // - Do not start CLEAR if stable gesture was TOOLS or DRAW in the last 500ms.
      // - Never trigger CLEAR while cursor is inside toolbar area.
      // - If ring or pinky is not UP for > 150ms, reset hold to 0.
      const isClearCandidate =
        fingerStates.allFourStrict &&
        (stableGesture === GESTURES.CLEAR || rawGesture === GESTURES.CLEAR);
      const recentToolsOrDraw = (now - lastToolsOrDrawTimeRef.current) < 500;
      let currentHoldPercent = 0;

      if (isCursorInToolbar) {
        // Inside toolbar: Never start or trigger CLEAR
        if (holdStartRef.current !== null) {
          holdStartRef.current = null;
          setClearProgress(0);
        }
      } else if (isClearCandidate && !isClearOnCooldown) {
        lastClearSeenTimeRef.current = now;

        if (holdStartRef.current === null) {
          if (!recentToolsOrDraw) {
            holdStartRef.current = now;
          }
        }

        if (holdStartRef.current !== null) {
          const timeSinceRingPinkyStrict = now - lastRingAndPinkyStrictUpTimeRef.current;
          if (timeSinceRingPinkyStrict > 150) {
            // Ring or pinky not UP for > 150ms -> reset hold to 0
            holdStartRef.current = null;
            setClearProgress(0);
          } else {
            const elapsed = now - holdStartRef.current;
            const progress = Math.min(1, Math.max(0, elapsed / 1000));
            currentHoldPercent = Math.round(progress * 100);
            setClearProgress(currentHoldPercent);

            if (progress >= 1) {
              drawingCanvasRef.current?.saveSnapshot();
              drawingCanvasRef.current?.clear();

              holdStartRef.current = null;
              gestureCooldownRef.current[GESTURES.CLEAR] = now;
              setClearProgress(0);
              currentHoldPercent = 0;
              setToast({ message: 'Canvas cleared (Ctrl+Z to Undo)', type: 'info' });
            }
          }
        }

        // Suspend drawing while in clear gesture
        if (isDrawingRef.current) {
          isDrawingRef.current = false;
          lastPointRef.current = null;
          smoothingHistoryRef.current = [];
        }

        if (showDebugRef.current) {
          setDebugInfo({
            handDetected: true,
            fingers: fingerStates,
            rawGesture,
            stableGesture,
            holdProgress: currentHoldPercent,
            cooldownText,
          });
        }
        return;
      } else {
        // Not in clear candidate on this frame
        if (holdStartRef.current !== null) {
          const timeSinceRingPinkyStrict = now - lastRingAndPinkyStrictUpTimeRef.current;
          const timeSinceClearSeen = now - lastClearSeenTimeRef.current;

          if (timeSinceRingPinkyStrict > 150 || timeSinceClearSeen > 300) {
            holdStartRef.current = null;
            setClearProgress(0);
            currentHoldPercent = 0;
          } else {
            const elapsed = now - holdStartRef.current;
            const progress = Math.min(1, Math.max(0, elapsed / 1000));
            currentHoldPercent = Math.round(progress * 100);
            setClearProgress(currentHoldPercent);
          }
        }
      }

      // Update debug HUD for non-clear frames
      if (showDebugRef.current) {
        setDebugInfo({
          handDetected: true,
          fingers: fingerStates,
          rawGesture,
          stableGesture,
          holdProgress: currentHoldPercent,
          cooldownText,
        });
      }

      // 4. 👍 SAVE gesture (thumb up, others down, angle-invariant)
      if (stableGesture === GESTURES.SAVE) {
        const lastSaveCooldown = gestureCooldownRef.current[GESTURES.SAVE] || 0;
        if (now - lastSaveCooldown >= 1500) {
          gestureCooldownRef.current[GESTURES.SAVE] = now;
          handleSaveCloudRef.current?.();
        }
        return;
      }

      // 5. ✊ PAUSE gesture (closed fist)
      if (stableGesture === GESTURES.PAUSE) {
        isPausedRef.current = true;
        if (isDrawingRef.current) {
          isDrawingRef.current = false;
          lastPointRef.current = null;
          smoothingHistoryRef.current = [];
        }
        if (toolCursorRef.current) {
          toolCursorRef.current.style.display = 'none';
        }
        return;
      } else {
        isPausedRef.current = false;
      }

      // 6. ✌️ TOOLS mode (index + middle up, ring + pinky down)
      // Never draw ink in TOOLS mode. Touchless 700ms dwell selection.
      if (stableGesture === GESTURES.TOOLS) {
        if (isDrawingRef.current) {
          isDrawingRef.current = false;
          lastPointRef.current = null;
          smoothingHistoryRef.current = [];
        }

        const indexTip = landmarks[8];
        const canvasAreaEl = canvasAreaRef.current;

        if (canvasAreaEl && indexTip) {
          const rect = canvasAreaEl.getBoundingClientRect();
          const localX = (1 - indexTip.x) * rect.width;
          const localY = indexTip.y * rect.height;
          const screenX = rect.left + localX;
          const screenY = rect.top + localY;

          // Position glowing cursor dot
          if (toolCursorRef.current) {
            toolCursorRef.current.style.display = 'flex';
            toolCursorRef.current.style.left = `${localX}px`;
            toolCursorRef.current.style.top = `${localY}px`;
          }

          // Hit test buttons under cursor
          const elem = document.elementFromPoint(screenX, screenY);
          const toolBtn = elem?.closest('[data-tool-id]');

          if (toolBtn) {
            const toolId = toolBtn.getAttribute('data-tool-id');

            if (toolHoverRef.current.id === toolId) {
              const elapsed = now - toolHoverRef.current.startTime;
              const progress = Math.min(100, Math.round((elapsed / 700) * 100));

              if (progress >= 100 && !toolHoverRef.current.triggered) {
                toolHoverRef.current.triggered = true;
                toolBtn.click();
                setToolHover({ id: toolId, progress: 100 });
              } else if (!toolHoverRef.current.triggered) {
                setToolHover({ id: toolId, progress });
              }
            } else {
              toolHoverRef.current = {
                id: toolId,
                startTime: now,
                triggered: false,
              };
              setToolHover({ id: toolId, progress: 0 });
            }
          } else {
            if (toolHoverRef.current.id) {
              toolHoverRef.current = { id: null, startTime: 0, triggered: false };
              setToolHover({ id: null, progress: 0 });
            }
          }
        }
        return;
      } else {
        // Not in TOOLS mode
        if (toolCursorRef.current) {
          toolCursorRef.current.style.display = 'none';
        }
        if (toolHoverRef.current.id) {
          toolHoverRef.current = { id: null, startTime: 0, triggered: false };
          setToolHover({ id: null, progress: 0 });
        }
      }

      // 7. ☝️ DRAW mode (index up, middle/ring/pinky down, thumb ignored)
      if (stableGesture === GESTURES.DRAW && !isPausedRef.current) {
        const indexTip = landmarks[8];

        const dims = cameraViewRef.current?.getOverlayDimensions();
        if (!dims) return;

        const rawPoint = mediapipeToCanvas(indexTip, dims.width, dims.height);
        const smoothed = smoothPoint(rawPoint, smoothingHistoryRef.current, 5);

        if (!isDrawingRef.current) {
          isDrawingRef.current = true;
          drawingCanvasRef.current?.saveSnapshot();
          lastPointRef.current = smoothed;
          return;
        }

        if (lastPointRef.current) {
          const currentTool = toolRef.current;
          if (currentTool === 'eraser') {
            drawingCanvasRef.current?.erase(smoothed, brushSizeRef.current * 3);
          } else {
            drawingCanvasRef.current?.drawSegment(
              lastPointRef.current,
              smoothed,
              colorRef.current,
              brushSizeRef.current
            );
          }
        }

        lastPointRef.current = smoothed;
      } else {
        if (isDrawingRef.current) {
          isDrawingRef.current = false;
          lastPointRef.current = null;
          smoothingHistoryRef.current = [];
        }
      }
    },
    [isOnCooldown, handleSaveLocal]
  );

  /**
   * Start — initialize camera and hand tracking.
   */
  const handleStart = useCallback(async () => {
    setAppState('loading');
    await initHandTracking();
    await startCamera();
    setAppState('active');
  }, [initHandTracking, startCamera]);

  /**
   * Once active, wire up tracking.
   */
  useEffect(() => {
    if (appState !== 'active' || !videoRef.current) return;

    setOnResults(handleTrackingResults);

    const video = videoRef.current;
    const startWhenReady = () => {
      if (video.readyState >= 2) {
        startTracking(video);
      } else {
        video.addEventListener('loadeddata', () => startTracking(video), { once: true });
      }
    };
    startWhenReady();
  }, [appState, videoRef, setOnResults, handleTrackingResults, startTracking]);

  const handleCanvasResize = useCallback((w, h) => {
    setCanvasSize({ width: w, height: h });
  }, []);

  // Prevent scrolling on touch devices while drawing
  useEffect(() => {
    if (appState === 'active') {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      return () => {
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      };
    }
  }, [appState]);

  // Auto-start on mount
  useEffect(() => {
    handleStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ───────────────────────── RENDER ─────────────────────────

  return (
    <div className="app">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <header className="app-header draw-header">
        <div className="draw-header-row">
          <h1 className="app-title">
            <span className="title-ai">AI</span> AIR DRAWING
          </h1>
          <button
            className={`debug-toggle-btn ${showDebug ? 'active' : ''}`}
            onClick={() => setShowDebug((prev) => !prev)}
            title="Toggle Real-Time Vision Debug HUD"
          >
            <span className="debug-toggle-dot" />
            Debug HUD {showDebug ? 'ON' : 'OFF'}
          </button>
        </div>
        <p className="app-subtitle">Draw freely in 3D air space</p>
      </header>

      {/* Main area */}
      <main className="app-main">
        {/* Side panel — left (desktop) */}
        <aside className="side-panel left-panel">
          <StatusPanel
            cameraStatus={cameraStatus}
            handDetected={handDetected}
            gesture={gesture}
            fps={fps}
            brushSize={brushSize}
            color={color}
            isModelLoading={isModelLoading}
            delegateUsed={delegateUsed}
          />
        </aside>

        {/* Center — camera + canvas + floating toolbar */}
        <div className="canvas-area" ref={canvasAreaRef}>
          {/* Loading overlay */}
          {(isModelLoading || cameraStatus === 'loading') && (
            <div className="loading-overlay">
              <div className="loading-spinner" />
              <p>{isModelLoading ? 'Loading AI Vision model...' : 'Starting camera...'}</p>
            </div>
          )}

          {/* Error overlay */}
          {(cameraError || trackingError) && (
            <div className="error-overlay">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <p>{cameraError || trackingError}</p>
              <button className="retry-btn" onClick={() => startCamera()}>
                Retry
              </button>
            </div>
          )}

          {/* ✋ Circular Hold-to-Clear Indicator */}
          {clearProgress > 0 && (
            <div className="clear-progress-overlay">
              <div className="clear-progress-card">
                <svg className="clear-progress-ring" width="110" height="110" viewBox="0 0 110 110">
                  <circle
                    cx="55"
                    cy="55"
                    r="46"
                    className="clear-progress-bg"
                    strokeWidth="6"
                    fill="none"
                  />
                  <circle
                    cx="55"
                    cy="55"
                    r="46"
                    className="clear-progress-fill"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={2 * Math.PI * 46}
                    strokeDashoffset={2 * Math.PI * 46 * (1 - clearProgress / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="clear-progress-center">
                  <span className="clear-progress-icon">✋</span>
                  <span className="clear-progress-percent">{clearProgress}%</span>
                  <span className="clear-progress-label">Hold 1s to Clear</span>
                </div>
              </div>
            </div>
          )}

          {/* Gesture indicator chip */}
          {handDetected && gesture !== GESTURES.NONE && clearProgress === 0 && (
            <div className={`gesture-indicator gesture-${gesture}`}>
              {gesture === GESTURES.DRAW && '☝️ Drawing'}
              {gesture === GESTURES.TOOLS && '✌️ Tools Menu'}
              {gesture === GESTURES.CLEAR && '✋ Clear (Hold 1s)'}
              {gesture === GESTURES.SAVE && '👍 Saving...'}
              {gesture === GESTURES.PAUSE && '✊ Paused'}
            </div>
          )}

          {/* ✌️ Glowing Tools Cursor Dot (Index fingertip landmark 8 in TOOLS mode) */}
          <div
            ref={toolCursorRef}
            className="tool-cursor-dot"
            style={{ display: 'none' }}
          >
            <div className="tool-cursor-halo" />
            <div className="tool-cursor-center" />
          </div>

          {/* 🐛 Real-Time Vision Debug HUD Overlay */}
          {showDebug && (
            <div className="studio-debug-panel">
              <div className="debug-header">
                <span className="debug-title">VISION DEBUG</span>
                <span className={`debug-badge ${debugInfo.handDetected ? 'online' : 'offline'}`}>
                  {debugInfo.handDetected ? '● Hand Detected' : '○ No Hand'}
                </span>
              </div>
              <div className="debug-stats-row">
                <div className="debug-stat-cell">
                  <span className="debug-stat-label">Raw</span>
                  <strong className="debug-stat-val">{debugInfo.rawGesture}</strong>
                </div>
                <div className="debug-stat-cell">
                  <span className="debug-stat-label">Stable</span>
                  <strong className="debug-stat-val">{debugInfo.stableGesture}</strong>
                </div>
                <div className="debug-stat-cell">
                  <span className="debug-stat-label">Hold</span>
                  <strong className="debug-stat-val">{debugInfo.holdProgress ?? clearProgress}%</strong>
                </div>
                <div className="debug-stat-cell">
                  <span className="debug-stat-label">Cool</span>
                  <strong className="debug-stat-val">{debugInfo.cooldownText}</strong>
                </div>
              </div>
              <div className="debug-fingers-grid">
                <span className={`debug-finger-chip ${debugInfo.fingers.thumb ? 'up' : 'down'}`}>
                  Thumb {debugInfo.fingers.thumb ? 'UP' : 'DN'} {Math.round(debugInfo.fingers.angles?.thumb || 0)}°
                </span>
                <span className={`debug-finger-chip ${debugInfo.fingers.index ? 'up' : 'down'}`}>
                  Index {debugInfo.fingers.index ? 'UP' : 'DN'} {Math.round(debugInfo.fingers.angles?.index || 0)}°
                </span>
                <span className={`debug-finger-chip ${debugInfo.fingers.middle ? 'up' : 'down'}`}>
                  Mid {debugInfo.fingers.middle ? 'UP' : 'DN'} {Math.round(debugInfo.fingers.angles?.middle || 0)}°
                </span>
                <span className={`debug-finger-chip ${debugInfo.fingers.ring ? 'up' : 'down'}`}>
                  Ring {debugInfo.fingers.ring ? 'UP' : 'DN'} {Math.round(debugInfo.fingers.angles?.ring || 0)}°
                </span>
                <span className={`debug-finger-chip ${debugInfo.fingers.pinky ? 'up' : 'down'}`}>
                  Pinky {debugInfo.fingers.pinky ? 'UP' : 'DN'} {Math.round(debugInfo.fingers.angles?.pinky || 0)}°
                </span>
              </div>
            </div>
          )}

          <CameraView
            ref={cameraViewRef}
            videoRef={videoRef}
            onCanvasResize={handleCanvasResize}
          />
          <DrawingCanvas
            ref={drawingCanvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
          />

          {/* Floating Toolbar inside camera area */}
          <Toolbar
            tool={tool}
            onToolChange={setTool}
            color={color}
            onColorChange={setColor}
            brushSize={brushSize}
            onBrushSizeChange={setBrushSize}
            onClear={handleClear}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onSave={handleSaveLocal}
            onSaveCloud={handleSaveCloud}
            savingCloud={saving}
            isAuthenticated={isAuthenticated}
            onSwitchCamera={switchCamera}
            facingMode={facingMode}
            hoverInfo={toolHover}
          />
        </div>

        {/* Side panel — right (desktop) */}
        <aside className="side-panel right-panel">
          <GestureGuide />
        </aside>
      </main>
    </div>
  );
}
