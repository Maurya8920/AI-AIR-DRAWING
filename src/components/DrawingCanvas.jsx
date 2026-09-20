import { useRef, forwardRef, useImperativeHandle, useCallback, useEffect } from 'react';
import { drawLineSegment } from '../utils/drawingUtils';

/**
 * DrawingCanvas is a transparent overlay canvas for user drawings.
 * Uses imperative API (refs) for performance — no re-renders during drawing.
 *
 * Preserves drawing content when resized (e.g. video load, window resize, orientation change).
 * Manages undo/redo via ImageData snapshots.
 */
const DrawingCanvas = forwardRef(function DrawingCanvas(
  { width, height },
  ref
) {
  const canvasRef = useRef(null);
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const MAX_HISTORY = 20;

  const getCtx = useCallback(() => {
    return canvasRef.current?.getContext('2d') || null;
  }, []);

  /**
   * Save current canvas state to undo stack.
   */
  const saveSnapshot = useCallback(() => {
    const ctx = getCtx();
    if (!ctx || !canvasRef.current) return;
    const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    undoStackRef.current.push(imageData);
    if (undoStackRef.current.length > MAX_HISTORY) {
      undoStackRef.current.shift();
    }
    // Clear redo when a new action is performed
    redoStackRef.current = [];
  }, [getCtx]);

  // Re-sync canvas sizes without erasing the drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !width || !height) return;
    if (canvas.width === width && canvas.height === height) return;

    let tempCanvas = null;
    if (canvas.width > 0 && canvas.height > 0) {
      tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(canvas, 0, 0);
    }

    canvas.width = width;
    canvas.height = height;

    if (tempCanvas) {
      const ctx = canvas.getContext('2d');
      ctx.drawImage(tempCanvas, 0, 0, width, height);
    }
  }, [width, height]);

  useImperativeHandle(ref, () => ({
    /**
     * Draw a line segment from point A to point B.
     */
    drawSegment(from, to, color, size) {
      const ctx = getCtx();
      if (!ctx) return;
      drawLineSegment(ctx, from, to, color, size);
    },

    /**
     * Erase at a given point.
     */
    erase(point, size) {
      const ctx = getCtx();
      if (!ctx) return;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(point.x, point.y, size / 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    },

    /**
     * Save a snapshot for undo (call before starting a stroke).
     */
    saveSnapshot,

    /**
     * Clear the entire canvas.
     */
    clear() {
      const ctx = getCtx();
      if (!ctx || !canvasRef.current) return;
      saveSnapshot();
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    },

    /**
     * Undo the last action.
     */
    undo() {
      const ctx = getCtx();
      if (!ctx || !canvasRef.current || undoStackRef.current.length === 0) return;
      // Save current state for redo
      const currentState = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
      redoStackRef.current.push(currentState);
      // Restore previous state
      const previousState = undoStackRef.current.pop();
      ctx.putImageData(previousState, 0, 0);
    },

    /**
     * Redo the last undone action.
     */
    redo() {
      const ctx = getCtx();
      if (!ctx || !canvasRef.current || redoStackRef.current.length === 0) return;
      // Save current for undo
      const currentState = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
      undoStackRef.current.push(currentState);
      // Restore redo state
      const redoState = redoStackRef.current.pop();
      ctx.putImageData(redoState, 0, 0);
    },

    /**
     * Get the underlying canvas element (for export).
     */
    getCanvas() {
      return canvasRef.current;
    },

    /**
     * Get the canvas context.
     */
    getCtx,
  }));

  return (
    <canvas
      ref={canvasRef}
      className="drawing-canvas"
      width={width || 640}
      height={height || 480}
    />
  );
});

export default DrawingCanvas;
