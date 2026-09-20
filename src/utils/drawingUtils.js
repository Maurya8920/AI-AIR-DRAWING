/**
 * Drawing utility functions for canvas rendering and optimized image export.
 */

/**
 * Draw a smooth line through an array of points using quadratic Bézier curves.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{ x: number, y: number }>} points
 * @param {string} color - CSS color
 * @param {number} size - Line width in pixels
 */
export function drawSmoothLine(ctx, points, color, size) {
  if (!points || points.length < 2) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'source-over';

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
  } else {
    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }
    // Last segment
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  ctx.stroke();
  ctx.restore();
}

/**
 * Draw the last segment of a stroke (incremental drawing).
 */
export function drawLineSegment(ctx, from, to, color, size) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw hand landmarks and connections on an overlay canvas.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} landmarks - Normalized landmarks
 * @param {number} w - Canvas width
 * @param {number} h - Canvas height
 */
export function drawHandLandmarks(ctx, landmarks, w, h) {
  if (!landmarks || landmarks.length < 21) return;

  // Connections between landmarks
  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8],       // Index
    [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
    [0, 13], [13, 14], [14, 15], [15, 16], // Ring
    [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
    [5, 9], [9, 13], [13, 17],             // Palm
  ];

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  // Draw connections (skeleton bones) with vivid glow
  ctx.strokeStyle = 'rgba(127, 210, 255, 0.9)';
  ctx.lineWidth = 3;
  ctx.shadowColor = 'rgba(127, 210, 255, 0.6)';
  ctx.shadowBlur = 8;

  for (const [i, j] of connections) {
    const x1 = (1 - landmarks[i].x) * w;
    const y1 = landmarks[i].y * h;
    const x2 = (1 - landmarks[j].x) * w;
    const y2 = landmarks[j].y * h;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Draw landmark joints
  for (let i = 0; i < landmarks.length; i++) {
    const x = (1 - landmarks[i].x) * w;
    const y = landmarks[i].y * h;
    const isTip = [4, 8, 12, 16, 20].includes(i);
    const radius = i === 8 ? 9 : isTip ? 6 : 4;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);

    if (i === 8) {
      // Index fingertip — warm glowing pointer
      ctx.fillStyle = '#FF8A1F';
      ctx.shadowColor = '#FF8A1F';
      ctx.shadowBlur = 18;
    } else if (isTip) {
      // Other fingertips
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 10;
    } else {
      // Joints
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.shadowColor = 'rgba(127, 210, 255, 0.8)';
      ctx.shadowBlur = 6;
    }

    ctx.fill();
  }

  ctx.restore();
}

/**
 * Export canvas as WebP (quality 0.8, max width 1280px, falling back to JPEG).
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Object} options
 * @param {number} options.quality - Image quality (default 0.8)
 * @param {number} options.maxWidth - Max width in px (default 1280)
 * @param {string} options.bgColor - Background color (default '#ffffff')
 * @returns {string} Data URL (image/webp or image/jpeg)
 */
export function exportCanvasToOptimizedImage(
  canvas,
  { quality = 0.8, maxWidth = 1280, bgColor = '#ffffff' } = {}
) {
  if (!canvas) return '';

  const scale = canvas.width > maxWidth ? maxWidth / canvas.width : 1;
  const targetWidth = Math.round(canvas.width * scale);
  const targetHeight = Math.round(canvas.height * scale);

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = targetWidth;
  exportCanvas.height = targetHeight;
  const ctx = exportCanvas.getContext('2d');

  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

  // Try WebP first
  let dataUrl = exportCanvas.toDataURL('image/webp', quality);
  if (!dataUrl.startsWith('data:image/webp')) {
    // Fallback to JPEG if WebP unsupported
    dataUrl = exportCanvas.toDataURL('image/jpeg', quality);
  }

  return dataUrl;
}

/**
 * Create a small thumbnail (~320px wide) from the drawing canvas.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number} targetWidth - Width in px (default 320)
 * @param {string} bgColor - Background color (default '#ffffff')
 * @returns {string} Thumbnail data URL
 */
export function createCanvasThumbnail(canvas, targetWidth = 320, bgColor = '#ffffff') {
  if (!canvas) return '';

  const aspect = canvas.height / (canvas.width || 1);
  const targetHeight = Math.max(1, Math.round(targetWidth * aspect));

  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = targetWidth;
  thumbCanvas.height = targetHeight;
  const ctx = thumbCanvas.getContext('2d');

  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

  let thumbUrl = thumbCanvas.toDataURL('image/webp', 0.8);
  if (!thumbUrl.startsWith('data:image/webp')) {
    thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.8);
  }

  return thumbUrl;
}

/**
 * Backwards-compatible export to PNG.
 */
export function exportCanvasToPNG(canvas, bgColor = 'white') {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = canvas.width;
  exportCanvas.height = canvas.height;
  const ctx = exportCanvas.getContext('2d');

  if (bgColor === 'white') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  }

  ctx.drawImage(canvas, 0, 0);
  return exportCanvas.toDataURL('image/png');
}

/**
 * Trigger a download of a data URL as a file.
 */
export function downloadDataURL(dataURL, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
