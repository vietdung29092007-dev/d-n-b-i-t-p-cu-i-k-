/**
 * ============================================================
 *  PoseAlert — js/pose-classifier.js
 *  Phân loại tư thế ngồi bằng thuật toán hình học trên keypoints
 *  Phụ thuộc: config.js, state.js
 * ============================================================
 *
 *  17 Keypoints (MoveNet COCO):
 *         0-mũi
 *        / \
 *   1-mắtT  2-mắtP
 *   3-taiT  4-taiP
 *   5-vaiT ——— 6-vaiP
 *   |               |
 *  11-hôngT ——— 12-hôngP
 */

// ------------------------------------------------------------
// Hàm điều phối chính: gọi từng detector theo thứ tự ưu tiên
// ------------------------------------------------------------

/**
 * classifyPose(keypoints) → { name, confidence }
 * Kiểm tra lần lượt: Mắt quá gần → Cúi đầu → Vẹo lưng → Ngồi đúng
 */
function classifyPose(keypoints) {
  const minScore      = POSE_THRESHOLDS.minKeypointScore;
  const nose          = keypoints[0];
  const leftEye       = keypoints[1];
  const rightEye      = keypoints[2];
  const leftEar       = keypoints[3];
  const rightEar      = keypoints[4];
  const leftShoulder  = keypoints[5];
  const rightShoulder = keypoints[6];

  const hasShoulders = leftShoulder.score > minScore && rightShoulder.score > minScore;
  const hasNose      = nose.score > minScore;
  const hasEyes      = leftEye.score > minScore && rightEye.score > minScore;
  const hasEars      = leftEar.score > minScore && rightEar.score > minScore;

  // Không thấy vai → không đủ dữ liệu
  if (!hasShoulders) return { name: "Ngồi đúng", confidence: 0.5 };

  const canvasWidth = ctx.canvas.width;

  // Ưu tiên 1: Mắt quá gần
  if (hasEyes || hasEars) {
    const result = detectTooClose(keypoints, canvasWidth);
    if (result.detected) return { name: "Mắt quá gần", confidence: result.confidence };
  }

  // Ưu tiên 2: Cúi đầu
  if (hasNose) {
    const result = detectHeadBow(keypoints);
    if (result.detected) return { name: "Cúi đầu", confidence: result.confidence };
  }

  // Ưu tiên 3: Vẹo lưng
  const result = detectSpineTilt(keypoints);
  if (result.detected) return { name: "Vẹo lưng", confidence: result.confidence };

  // Mặc định: Ngồi đúng
  return { name: "Ngồi đúng", confidence: 0.9 };
}

// ------------------------------------------------------------
// Detector 1: Cúi đầu
// ------------------------------------------------------------

/**
 * detectHeadBow(keypoints) → { detected, confidence?, ratio }
 *
 * Nguyên lý: Khi ngồi thẳng, mũi ở cao hơn vai nhiều.
 *            Khi cúi đầu, mũi hạ xuống gần hoặc ngang vai.
 *
 * Công thức: ratio = (vai.y − mũi.y) / rộng_vai
 *            ratio < ngưỡng → cúi đầu
 */
function detectHeadBow(keypoints) {
  const nose          = keypoints[0];
  const leftShoulder  = keypoints[5];
  const rightShoulder = keypoints[6];

  const midShoulderY  = (leftShoulder.y + rightShoulder.y) / 2;
  const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);

  if (shoulderWidth < 10) return { detected: false }; // Tránh chia cho 0

  const ratio     = (midShoulderY - nose.y) / shoulderWidth;
  const threshold = POSE_THRESHOLDS.headBowRatio;

  if (ratio < threshold) {
    const confidence = Math.min(0.95, 0.6 + (threshold - ratio) * 0.5);
    return { detected: true, confidence, ratio };
  }

  return { detected: false, ratio };
}

// ------------------------------------------------------------
// Detector 2: Vẹo lưng / nghiêng người
// ------------------------------------------------------------

/**
 * detectSpineTilt(keypoints) → { detected, confidence?, angle?, offsetRatio? }
 *
 * Nguyên lý 1: Vai nghiêng → góc atan2(dy/dx) > ngưỡng độ
 * Nguyên lý 2: Trung tâm vai lệch ngang so với trung tâm hông
 */
function detectSpineTilt(keypoints) {
  const leftShoulder  = keypoints[5];
  const rightShoulder = keypoints[6];
  const leftHip       = keypoints[11];
  const rightHip      = keypoints[12];
  const minScore      = POSE_THRESHOLDS.minKeypointScore;

  // Kiểm tra 1: Góc nghiêng vai
  const shoulderDy         = Math.abs(leftShoulder.y - rightShoulder.y);
  const shoulderDx         = Math.abs(leftShoulder.x - rightShoulder.x);
  const shoulderTiltAngle  = Math.atan2(shoulderDy, shoulderDx) * (180 / Math.PI);

  if (shoulderTiltAngle > POSE_THRESHOLDS.shoulderTiltAngle) {
    const confidence = Math.min(0.95, 0.6 + (shoulderTiltAngle - POSE_THRESHOLDS.shoulderTiltAngle) * 0.02);
    return { detected: true, confidence, angle: shoulderTiltAngle };
  }

  // Kiểm tra 2: Lệch ngang vai–hông (nếu thấy hông)
  if (leftHip.score > minScore && rightHip.score > minScore) {
    const midShoulderX  = (leftShoulder.x + rightShoulder.x) / 2;
    const midHipX       = (leftHip.x + rightHip.x) / 2;
    const lateralOffset = Math.abs(midShoulderX - midHipX);
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);

    if (shoulderWidth > 10) {
      const offsetRatio = lateralOffset / shoulderWidth;
      if (offsetRatio > POSE_THRESHOLDS.lateralOffsetRatio) {
        const confidence = Math.min(0.95, 0.6 + (offsetRatio - POSE_THRESHOLDS.lateralOffsetRatio) * 1.0);
        return { detected: true, confidence, offsetRatio };
      }
    }
  }

  return { detected: false };
}

// ------------------------------------------------------------
// Detector 3: Mắt / mặt quá gần màn hình
// ------------------------------------------------------------

/**
 * detectTooClose(keypoints, canvasWidth) → { detected, confidence?, faceRatio? }
 *
 * Nguyên lý: Khi lại gần camera, mặt chiếm tỷ lệ lớn hơn trong khung hình.
 *            faceRatio = rộng_mặt / rộng_canvas > ngưỡng → quá gần
 */
function detectTooClose(keypoints, canvasWidth) {
  const leftEye  = keypoints[1];
  const rightEye = keypoints[2];
  const leftEar  = keypoints[3];
  const rightEar = keypoints[4];
  const minScore = POSE_THRESHOLDS.minKeypointScore;

  let faceWidth = 0;

  // Ưu tiên tai (phản ánh kích thước mặt chính xác hơn)
  if (leftEar.score > minScore && rightEar.score > minScore) {
    faceWidth = Math.abs(leftEar.x - rightEar.x);
  } else if (leftEye.score > minScore && rightEye.score > minScore) {
    faceWidth = Math.abs(leftEye.x - rightEye.x) * 2.5; // khoảng mắt × 2.5 ≈ rộng mặt
  }

  if (faceWidth === 0 || canvasWidth === 0) return { detected: false };

  const faceRatio = faceWidth / canvasWidth;

  if (faceRatio > POSE_THRESHOLDS.faceCloseRatio) {
    const confidence = Math.min(0.95, 0.6 + (faceRatio - POSE_THRESHOLDS.faceCloseRatio) * 2.0);
    return { detected: true, confidence, faceRatio };
  }

  return { detected: false, faceRatio };
}
