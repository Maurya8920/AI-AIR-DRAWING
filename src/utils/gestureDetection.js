/**
 * Gesture detection from MediaPipe hand landmarks.
 *
 * Landmark indices:
 *   Wrist: 0
 *   Thumb:  CMC=1, MCP=2, IP=3, TIP=4
 *   Index:  MCP=5, PIP=6, DIP=7, TIP=8
 *   Middle: MCP=9, PIP=10, DIP=11, TIP=12
 *   Ring:   MCP=13, PIP=14, DIP=15, TIP=16
 *   Pinky:  MCP=17, PIP=18, DIP=19, TIP=20
 */

export const LANDMARKS = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
};

export const GESTURES = {
  CLEAR: 'clear',     // ✋  Open palm (index, middle, ring, pinky all up, thumb optional)
  TOOLS: 'tools',     // ✌️  Two fingers (index + middle up, ring + pinky down)
  DRAW: 'draw',       // ☝️  Index finger only (index up, middle + ring + pinky down, thumb ignored)
  SAVE: 'save',       // 👍  Thumbs up (thumb up, index/middle/ring/pinky down)
  PAUSE: 'pause',     // ✊  Closed fist (all 4 down, thumb not up)
  NONE: 'none',       // Unrecognized
};

export const GESTURE_LABELS = {
  [GESTURES.CLEAR]: '✋ Clear (Hold 1s)',
  [GESTURES.TOOLS]: '✌️ Tools',
  [GESTURES.DRAW]: '☝️ Drawing',
  [GESTURES.SAVE]: '👍 Save',
  [GESTURES.PAUSE]: '✊ Pause',
  [GESTURES.NONE]: '— Waiting',
};

/**
 * 2D Euclidean distance between two points.
 */
export function dist2D(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 3D Euclidean distance between two points.
 */
export function dist3D(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Compute the angle (in degrees) at the PIP joint between vectors PIP->MCP and PIP->DIP, using x, y, z.
 */
export function computePipAngle(mcp, pip, dip) {
  const v1 = {
    x: mcp.x - pip.x,
    y: mcp.y - pip.y,
    z: (mcp.z || 0) - (pip.z || 0),
  };
  const v2 = {
    x: dip.x - pip.x,
    y: dip.y - pip.y,
    z: (dip.z || 0) - (pip.z || 0),
  };

  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

  if (mag1 === 0 || mag2 === 0) return 180;
  const cosVal = Math.min(1, Math.max(-1, dot / (mag1 * mag2)));
  return (Math.acos(cosVal) * 180) / Math.PI;
}

/**
 * Determine a finger's state (index, middle, ring, pinky) using PIP joint angle and tip-to-wrist distance.
 *
 * Rules:
 * - Finger is UP if angle > 160 degrees (straight).
 * - Finger is DOWN if angle < 130 degrees (bent).
 * - Between 130 and 160: keep the finger's previous state (hysteresis), so it does not flicker.
 * - Also require for UP: distance(tip, wrist) > distance(pip, wrist) * 1.1.
 */
export function evaluateFingerJoint(landmarks, finger, prevState = false) {
  const wrist = landmarks[LANDMARKS.WRIST];
  const mcpIdx = LANDMARKS[`${finger.toUpperCase()}_MCP`];
  const pipIdx = LANDMARKS[`${finger.toUpperCase()}_PIP`];
  const dipIdx = LANDMARKS[`${finger.toUpperCase()}_DIP`];
  const tipIdx = LANDMARKS[`${finger.toUpperCase()}_TIP`];

  const mcp = landmarks[mcpIdx];
  const pip = landmarks[pipIdx];
  const dip = landmarks[dipIdx];
  const tip = landmarks[tipIdx];

  const angle = computePipAngle(mcp, pip, dip);
  const tipToWrist = dist3D(tip, wrist);
  const pipToWrist = dist3D(pip, wrist);
  const distanceExtended = tipToWrist > pipToWrist * 1.1;

  let isUp = false;
  if (distanceExtended) {
    if (angle > 160) {
      isUp = true;
    } else if (angle < 130) {
      isUp = false;
    } else {
      // Between 130 and 160: hysteresis
      isUp = Boolean(prevState);
    }
  } else {
    isUp = false;
  }

  return {
    isUp,
    angle,
    isStrictlyUp: angle > 160 && distanceExtended,
    isUncertain: angle >= 130 && angle <= 160,
  };
}

/**
 * Evaluate thumb extension angle-independently.
 */
export function evaluateThumb(landmarks, handSize) {
  const thumbTip = landmarks[LANDMARKS.THUMB_TIP];
  const thumbIP = landmarks[LANDMARKS.THUMB_IP];
  const thumbMCP = landmarks[LANDMARKS.THUMB_MCP];
  const pinkyMCP = landmarks[LANDMARKS.PINKY_MCP];

  const tipToPinky = dist3D(thumbTip, pinkyMCP);
  const ipToPinky = dist3D(thumbIP, pinkyMCP);

  const angle = computePipAngle(thumbMCP, thumbIP, thumbTip);
  const isUp = (tipToPinky - ipToPinky) > handSize * 0.1;

  return {
    isUp,
    angle,
    isStrictlyUp: isUp,
    isUncertain: false,
  };
}

export function isFingerExtended(landmarks, finger, handSize, prevState = false) {
  if (finger === 'thumb') {
    return evaluateThumb(landmarks, handSize).isUp;
  }
  return evaluateFingerJoint(landmarks, finger, prevState).isUp;
}

export function isThumbUpAngleInvariant(landmarks, handSize) {
  return evaluateThumb(landmarks, handSize).isUp;
}

/**
 * Get individual up/down boolean state and angles for all 5 fingers with hysteresis.
 */
export function getFingerStates(landmarks, prevStates = {}) {
  if (!landmarks || landmarks.length < 21) {
    return {
      thumb: false,
      index: false,
      middle: false,
      ring: false,
      pinky: false,
      ringStrict: false,
      pinkyStrict: false,
      allFourStrict: false,
      angles: { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 },
      evals: {
        thumb: { isUp: false, angle: 0, isStrictlyUp: false, isUncertain: false },
        index: { isUp: false, angle: 0, isStrictlyUp: false, isUncertain: false },
        middle: { isUp: false, angle: 0, isStrictlyUp: false, isUncertain: false },
        ring: { isUp: false, angle: 0, isStrictlyUp: false, isUncertain: false },
        pinky: { isUp: false, angle: 0, isStrictlyUp: false, isUncertain: false },
      },
    };
  }

  const handSize = Math.max(0.01, dist3D(landmarks[LANDMARKS.WRIST], landmarks[LANDMARKS.MIDDLE_MCP]));

  const thumbEval = evaluateThumb(landmarks, handSize);
  const indexEval = evaluateFingerJoint(landmarks, 'index', prevStates.index);
  const middleEval = evaluateFingerJoint(landmarks, 'middle', prevStates.middle);
  const ringEval = evaluateFingerJoint(landmarks, 'ring', prevStates.ring);
  const pinkyEval = evaluateFingerJoint(landmarks, 'pinky', prevStates.pinky);

  return {
    thumb: thumbEval.isUp,
    index: indexEval.isUp,
    middle: middleEval.isUp,
    ring: ringEval.isUp,
    pinky: pinkyEval.isUp,
    ringStrict: ringEval.isStrictlyUp,
    pinkyStrict: pinkyEval.isStrictlyUp,
    allFourStrict:
      indexEval.isStrictlyUp &&
      middleEval.isStrictlyUp &&
      ringEval.isStrictlyUp &&
      pinkyEval.isStrictlyUp,
    angles: {
      thumb: thumbEval.angle,
      index: indexEval.angle,
      middle: middleEval.angle,
      ring: ringEval.angle,
      pinky: pinkyEval.angle,
    },
    evals: {
      thumb: thumbEval,
      index: indexEval,
      middle: middleEval,
      ring: ringEval,
      pinky: pinkyEval,
    },
  };
}

/**
 * Detect current gesture from hand landmarks with strict exclusivity and priority.
 *
 * 1. TOOLS: index + middle up AND ring + pinky down. If ring or pinky is in uncertain zone (130-160), prefer TOOLS over CLEAR.
 * 2. CLEAR: index, middle, ring, pinky ALL strictly up (angle > 160) on every counted frame. Thumb optional.
 * 3. DRAW: index up AND middle + ring + pinky down (ignore thumb)
 * 4. SAVE: thumb up AND index, middle, ring, pinky all down
 * 5. PAUSE: index, middle, ring, pinky all down and thumb not up
 */
export function detectGesture(landmarks, prevStates = {}) {
  if (!landmarks || landmarks.length < 21) return GESTURES.NONE;

  const states = getFingerStates(landmarks, prevStates);
  const { index, middle, ring, pinky, thumb, ringStrict, pinkyStrict, allFourStrict, evals } = states;

  // 1. Prefer TOOLS over CLEAR if index + middle are up and ring or pinky is uncertain or down:
  const ringUncertainOrDown = !ringStrict || evals.ring.isUncertain || !ring;
  const pinkyUncertainOrDown = !pinkyStrict || evals.pinky.isUncertain || !pinky;

  if (index && middle && (ringUncertainOrDown || pinkyUncertainOrDown)) {
    return GESTURES.TOOLS;
  }

  // 2. ✋ CLEAR: All four fingers (index, middle, ring, pinky) must be clearly UP (angle > 160)
  // Thumb stays optional.
  if (allFourStrict) {
    return GESTURES.CLEAR;
  }

  // 3. ✌️ TOOLS fallback
  if (index && middle && !ring && !pinky) {
    return GESTURES.TOOLS;
  }

  // 4. ☝️ DRAW: index up AND middle + ring + pinky down (ignore thumb)
  if (index && !middle && !ring && !pinky) {
    return GESTURES.DRAW;
  }

  // 5. 👍 SAVE: thumb up AND index, middle, ring, pinky all down
  if (!index && !middle && !ring && !pinky && thumb) {
    return GESTURES.SAVE;
  }

  // 6. ✊ PAUSE: index, middle, ring, pinky all down and thumb not up
  if (!index && !middle && !ring && !pinky && !thumb) {
    return GESTURES.PAUSE;
  }

  return GESTURES.NONE;
}

/**
 * Debounced gesture detector.
 * Does not block CLEAR: CLEAR is stabilized quickly (2 frames) so hold timer starts promptly.
 */
export function createGestureStabilizer(requiredFrames = 3) {
  let lastGesture = GESTURES.NONE;
  let currentCandidate = GESTURES.NONE;
  let candidateCount = 0;

  return function stabilize(rawGesture) {
    if (rawGesture === currentCandidate) {
      candidateCount++;
    } else {
      currentCandidate = rawGesture;
      candidateCount = 1;
    }

    // Fast-path for CLEAR so stabilizer doesn't delay hold start
    const framesNeeded = rawGesture === GESTURES.CLEAR ? 2 : requiredFrames;

    if (candidateCount >= framesNeeded) {
      lastGesture = currentCandidate;
    }

    return lastGesture;
  };
}
