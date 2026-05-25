/**
 * ============================================================
 *  PoseAlert — js/app.js
 *  Logic điều phối chính: khởi động/dừng app, vòng lặp nhận diện,
 *  smoothing và khởi chạy khi trang load
 *  Phụ thuộc: tất cả các module còn lại
 * ============================================================
 */

// ============================================================
// KHỞI ĐỘNG & DỪNG ỨNG DỤNG
// ============================================================

/**
 * startApp()
 * Được gọi khi người dùng nhấn nút "▶ Bắt đầu".
 * Thứ tự: tải MoveNet → bật camera → thiết lập canvas → khởi UI → vào vòng lặp
 */
async function startApp() {
  updateStatus("Đang tải model AI...", "");
  try {
    // 1. Tải MoveNet SINGLEPOSE_LIGHTNING (nhanh, phù hợp realtime)
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
    );
    console.log("✅ MoveNet model đã tải xong!");

    // 2. Khởi động webcam qua getUserMedia
    video       = document.getElementById("webcam-video");
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: "user" },
      audio: false,
    });
    video.srcObject = mediaStream;

    await new Promise(resolve => {
      video.onloadedmetadata = () => { video.play(); resolve(); };
    });
    console.log("✅ Camera đã khởi động!");

    // 3. Thiết lập canvas
    const canvas  = document.getElementById("canvas");
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    ctx           = canvas.getContext("2d");

    // 4. Ẩn overlay "chờ khởi động"
    document.getElementById("camera-overlay").classList.add("hidden");

    // 5. Khởi tạo UI và biểu đồ
    initPoseResultBars();
    initCharts();

    // 6. Bắt đầu đo thống kê và biểu đồ đường
    stats.sessionStartTime = new Date();
    startStatTracking();
    startLineChartTracking();

    // 7. Đổi nút Bắt đầu → Dừng
    document.getElementById("btn-start").classList.add("hidden");
    document.getElementById("btn-stop").classList.remove("hidden");

    // 8. Reset smoothing buffer và khởi động vòng lặp
    poseHistory = [];
    isRunning   = true;
    updateStatus("Đang nhận diện...", "active");
    window.requestAnimationFrame(predictionLoop);

  } catch (err) {
    console.error("❌ Lỗi khởi động:", err);
    updateStatus("Lỗi! Kiểm tra camera.", "");
    alert(
      "Không thể khởi động!\n\n" +
      "Lý do: " + err.message + "\n\n" +
      "Hãy kiểm tra:\n" +
      "1. Cho phép truy cập camera\n" +
      "2. Kết nối internet để tải model"
    );
  }
}

/**
 * stopApp()
 * Dừng camera, vòng lặp và các interval.
 */
function stopApp() {
  isRunning = false;

  // Giải phóng camera
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  if (video) video.srcObject = null;

  clearInterval(badPoseInterval);
  clearInterval(lineDataInterval);
  resetBadPoseTimer();

  document.getElementById("btn-start").classList.remove("hidden");
  document.getElementById("btn-stop").classList.add("hidden");
  document.getElementById("camera-overlay").classList.remove("hidden");
  document.querySelector(".camera-overlay .overlay-content p").textContent =
    "Đã dừng. Nhấn Bắt đầu để tiếp tục.";

  updateStatus("Đã dừng", "");
}

// ============================================================
// VÒNG LẶP NHẬN DIỆN (~30 FPS)
// ============================================================

/**
 * predictionLoop()
 * Chạy liên tục qua requestAnimationFrame.
 * Mỗi frame: ước tính pose → vẽ → phân loại → cập nhật UI.
 */
async function predictionLoop() {
  if (!isRunning) return;
  await predict();
  window.requestAnimationFrame(predictionLoop);
}

/**
 * predict()
 * Gọi MoveNet ước tính pose, vẽ frame, rồi phân loại tư thế.
 */
async function predict() {
  if (!detector || !video || video.readyState < 2) return;

  const poses = await detector.estimatePoses(video);

  // Vẽ camera + skeleton lên canvas
  drawFrame(poses);

  // Phân loại và cập nhật UI nếu phát hiện người
  if (poses.length > 0) {
    const raw      = classifyPose(poses[0].keypoints);
    const smoothed = smoothPoseResult(raw);
    updateUI(buildPrediction(smoothed));
  }
}

// ============================================================
// SMOOTHING & FORMAT PREDICTION
// ============================================================

/**
 * smoothPoseResult(result) → { name, confidence }
 * Majority vote trên N frame gần nhất để tránh nhấp nháy.
 */
function smoothPoseResult(result) {
  poseHistory.push(result);
  if (poseHistory.length > POSE_SMOOTHING_FRAMES) poseHistory.shift();

  // Đếm số lần xuất hiện mỗi tư thế
  const counts = {};
  poseHistory.forEach(r => { counts[r.name] = (counts[r.name] || 0) + 1; });

  // Tìm tư thế xuất hiện nhiều nhất
  let dominantPose = result.name;
  let maxCount     = 0;
  Object.entries(counts).forEach(([name, count]) => {
    if (count > maxCount) { maxCount = count; dominantPose = name; }
  });

  // Confidence trung bình của tư thế dominant
  const dominantResults = poseHistory.filter(r => r.name === dominantPose);
  const avgConf = dominantResults.reduce((sum, r) => sum + r.confidence, 0) / dominantResults.length;

  return { name: dominantPose, confidence: avgConf };
}

/**
 * buildPrediction(result) → [{className, probability}, ...]
 * Chuyển kết quả smoothed thành định dạng mảng cho updateUI().
 */
function buildPrediction(result) {
  const poseNames    = Object.keys(POSE_CONFIG);
  const remainingProb = (1 - result.confidence) / Math.max(1, poseNames.length - 1);

  return poseNames.map(name => ({
    className:   name,
    probability: name === result.name ? result.confidence : remainingProb,
  }));
}

// ============================================================
// KHỞI CHẠY KHI TRANG TẢI XONG
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  initCharts();          // Vẽ biểu đồ trống để giao diện không bị trống
  updatePomodoroDisplay(); // Hiển thị đồng hồ Pomodoro ban đầu (25:00)

  console.log("🚀 PoseAlert đã khởi động! (MoveNet Pose Estimation)");
  console.log("📋 Nhấn 'Bắt đầu' để sử dụng — không cần URL model!");
});
