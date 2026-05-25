/**
 * ============================================================
 *  PoseAlert — js/config.js
 *  Tất cả hằng số cấu hình của ứng dụng
 * ============================================================
 */

// ---- Cấu hình tư thế ----
// Mỗi tư thế có icon, class CSS cho thanh %, và cờ isGood
const POSE_CONFIG = {
  "Ngồi đúng":    { icon: "✅", barClass: "good",  isGood: true  },
  "Cúi đầu":      { icon: "🙇", barClass: "bad-1", isGood: false },
  "Vẹo lưng":     { icon: "↩️", barClass: "bad-2", isGood: false },
  "Mắt quá gần":  { icon: "👀", barClass: "bad-3", isGood: false },
};

// ---- Ngưỡng phát hiện tư thế sai ----
// Có thể điều chỉnh các giá trị này để phù hợp với góc camera
const POSE_THRESHOLDS = {
  headBowRatio: 0.5,         // Cúi đầu khi (khoảng cách mũi-vai / rộng vai) < ngưỡng
  shoulderTiltAngle: 12,     // Vẹo vai khi góc nghiêng > ngưỡng (độ)
  lateralOffsetRatio: 0.3,   // Nghiêng người khi lệch ngang vai-hông > ngưỡng
  faceCloseRatio: 0.40,      // Mắt quá gần khi rộng mặt / rộng canvas > ngưỡng
  minKeypointScore: 0.3,     // Độ tin cậy tối thiểu của keypoint
};

// ---- Cấu hình cảnh báo ----
const BAD_POSE_ALERT_SECONDS = 30; // Cảnh báo sau bao nhiêu giây ngồi sai liên tục

// ---- Cấu hình Pomodoro ----
const POMODORO_WORK_MINUTES  = 25; // Thời gian tập trung (phút)
const POMODORO_BREAK_MINUTES = 5;  // Thời gian nghỉ (phút)

// ---- Cấu hình Smoothing ----
const POSE_SMOOTHING_FRAMES = 5; // Số frame để lấy trung bình tư thế (tránh nhấp nháy)

// ---- Kết nối khung xương (17 keypoints COCO) ----
// Mỗi cặp [i, j] = đường nối giữa keypoint thứ i và j
const SKELETON_CONNECTIONS = [
  [0, 1], [0, 2], [1, 3], [2, 4],   // Đầu
  [5, 6],                             // Vai
  [5, 7], [7, 9],                     // Tay trái
  [6, 8], [8, 10],                    // Tay phải
  [5, 11], [6, 12],                   // Thân
  [11, 12],                           // Hông
  [11, 13], [13, 15],                 // Chân trái
  [12, 14], [14, 16],                 // Chân phải
];
