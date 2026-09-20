/**
 * Coordinate conversion utilities for mapping MediaPipe landmarks
 * to canvas pixel coordinates with mirror handling.
 */

/**
 * Convert a normalized MediaPipe landmark to canvas pixel coordinates.
 * MediaPipe returns x,y in [0,1]. Video is CSS-mirrored (scaleX(-1)),
 * so we mirror the x coordinate: canvasX = (1 - landmark.x) * width.
 *
 * @param {Object} landmark - { x, y, z } normalized landmark
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels
 * @returns {{ x: number, y: number }}
 */
export function mediapipeToCanvas(landmark, canvasWidth, canvasHeight) {
  return {
    x: (1 - landmark.x) * canvasWidth,
    y: landmark.y * canvasHeight,
  };
}

/**
 * Moving-average smoothing filter to reduce jitter in fingertip tracking.
 *
 * @param {{ x: number, y: number }} newPoint - Latest point
 * @param {Array<{ x: number, y: number }>} history - Previous points buffer (mutated)
 * @param {number} windowSize - Number of points to average over
 * @returns {{ x: number, y: number }} Smoothed point
 */
export function smoothPoint(newPoint, history, windowSize = 5) {
  history.push({ ...newPoint });

  if (history.length > windowSize) {
    history.shift();
  }

  const sum = history.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  );

  return {
    x: sum.x / history.length,
    y: sum.y / history.length,
  };
}

/**
 * Calculate distance between two 2D points.
 */
export function distance2D(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}
