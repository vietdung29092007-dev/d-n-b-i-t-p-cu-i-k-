/**
 * ============================================================
 *  PoseAlert — js/alert-timer.js
 *  Timer đếm ngược 30 giây khi phát hiện tư thế sai,
 *  popup cảnh báo, và âm thanh chuông
 *  Phụ thuộc: config.js, state.js, ui.js
 * ============================================================
 */

// ------------------------------------------------------------
// Timer đếm ngược
// ------------------------------------------------------------

const BAD_POSE_ADVICE = {
  "Cúi đầu": {
    harm: "Gây thoái hóa đốt sống cổ sớm, chèn ép dây thần kinh và có nguy cơ thoát vị đĩa đệm.",
    fix: "Giữ đầu thẳng, thả lỏng vai và nhìn thẳng về phía trước."
  },
  "Vẹo lưng": {
    harm: "Gây biến dạng, cong vẹo cột sống vĩnh viễn và đau thần kinh tọa mãn tính.",
    fix: "Ngồi thẳng lưng, thả lỏng vai và đặt hai chân chạm sàn cân bằng."
  },
  "Mắt quá gần": {
    harm: "Gây suy giảm thị lực nghiêm trọng, biến chứng cận thị nặng và tổn thương võng mạc.",
    fix: "Đẩy màn hình ra xa (khoảng 50-60cm), giữ cằm ngang và ngồi thẳng lưng."
  },
  default: {
    harm: "Tàn phá vóc dáng, gây tổn thương hệ cơ xương khớp toàn thân và tích tụ mệt mỏi dai dẳng.",
    fix: "Điều chỉnh lại tư thế ngay: Thẳng lưng, thả lỏng vai và nhìn thẳng."
  }
};

/**
 * startBadPoseTimer(poseName)
 * Bắt đầu đếm giây nếu chưa chạy. Sau BAD_POSE_ALERT_SECONDS giây
 * liên tục ngồi sai → kích hoạt cảnh báo và reset về 0.
 */
function startBadPoseTimer(poseName) {
  try {
    if (badPoseInterval) return; // Đã đang chạy, không chạy lại

    badPoseInterval = setInterval(() => {
      try {
        badPoseTimer++;

        // Cập nhật thanh tiến độ và nhãn đếm ngược
        const pct = (badPoseTimer / (BAD_POSE_ALERT_SECONDS || 30)) * 100;
        const timerBar = document.getElementById("timer-bar");
        const timerCountdown = document.getElementById("timer-countdown");
        
        if (timerBar) timerBar.style.width = pct + "%";
        if (timerCountdown) {
          timerCountdown.textContent = badPoseTimer + " / " + (BAD_POSE_ALERT_SECONDS || 30) + " giây";
        }

        // Đủ 30 giây → cảnh báo!
        if (badPoseTimer >= (BAD_POSE_ALERT_SECONDS || 30)) {
          triggerAlert(poseName);
          resetBadPoseTimer();
        }
      } catch (err) {
        console.error("❌ Lỗi trong vòng lặp startBadPoseTimer:", err);
      }
    }, 1000);
  } catch (err) {
    console.error("❌ Lỗi startBadPoseTimer:", err);
  }
}

/**
 * resetBadPoseTimer()
 * Dừng timer và đặt lại về 0.
 * Gọi khi: ngồi đúng / đã cảnh báo xong / dừng app.
 */
function resetBadPoseTimer() {
  try {
    clearInterval(badPoseInterval);
    badPoseInterval = null;
    badPoseTimer    = 0;
    
    const timerBar = document.getElementById("timer-bar");
    const timerCountdown = document.getElementById("timer-countdown");
    
    if (timerBar) timerBar.style.width = "0%";
    if (timerCountdown) timerCountdown.textContent = "0 / " + (BAD_POSE_ALERT_SECONDS || 30) + " giây";
  } catch (err) {
    console.error("❌ Lỗi resetBadPoseTimer:", err);
  }
}

// ------------------------------------------------------------
// Kích hoạt cảnh báo
// ------------------------------------------------------------

/**
 * triggerAlert(poseName)
 * Tăng đếm cảnh báo, hiện popup và phát âm thanh.
 */
function triggerAlert(poseName) {
  try {
    if (stats) stats.alertCount++;
    updateStatDisplay();

    const alertTitleEl = document.getElementById("alert-title");
    const alertMessageEl = document.getElementById("alert-message");
    const alertOverlayEl = document.getElementById("alert-overlay");
    
    const poseLabel = (poseName || "sai tư thế").toLowerCase();
    const advice = BAD_POSE_ADVICE[poseName] || BAD_POSE_ADVICE.default;
    const message =
      "So với tư thế ngồi đúng chuẩn, bạn đang " + poseLabel + " trong " +
      (BAD_POSE_ALERT_SECONDS || 30) + " giây liên tục.\n\n" +
      "Tác hại: " + advice.harm + "\n" +
      "Cách sửa: " + advice.fix;

    if (alertTitleEl) alertTitleEl.textContent = "⚠️ Cảnh báo Tư thế!";
    if (alertMessageEl) alertMessageEl.textContent = message;
    if (alertOverlayEl) alertOverlayEl.classList.remove("hidden");
    
    playAlertSound();
    addAlertLog(poseName);
  } catch (err) {
    console.error("❌ Lỗi triggerAlert:", err);
  }
}

/**
 * closeAlert()
 * Đóng popup cảnh báo (gọi từ onclick trên nút "Đã hiểu").
 */
function closeAlert() {
  try {
    const alertOverlayEl = document.getElementById("alert-overlay");
    if (alertOverlayEl) alertOverlayEl.classList.add("hidden");
  } catch (err) {
    console.error("❌ Lỗi closeAlert:", err);
  }
}

// ------------------------------------------------------------
// Âm thanh chuông cảnh báo
// ------------------------------------------------------------

/**
 * playAlertSound()
 * Tạo âm thanh chuông nhẹ bằng Web Audio API (không cần file .mp3).
 * Âm thanh: nốt A5 (880 Hz) giảm dần xuống A4 (440 Hz), kéo dài 1 giây.
 */
function playAlertSound() {
  try {
    const audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode   = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.0);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 1.0);
  } catch (e) {
    console.warn("Không thể phát âm thanh:", e);
  }
}
