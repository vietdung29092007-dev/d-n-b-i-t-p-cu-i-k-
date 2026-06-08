/**
 * ============================================================
 *  PoseAlert — js/pomodoro.js
 *  Pomodoro Timer: 25 phút học / 5 phút nghỉ
 *  Phụ thuộc: config.js, state.js
 * ============================================================
 */

// ------------------------------------------------------------
// Điều khiển Pomodoro
// ------------------------------------------------------------

/**
 * togglePomodoro()
 * Bật/tắt (Start/Pause) Pomodoro timer.
 * Khi hết giờ: tự động chuyển phase học ↔ nghỉ.
 */
function togglePomodoro() {
  if (pomodoroIsRunning) {
    // Đang chạy → Pause
    clearInterval(pomodoroInterval);
    pomodoroIsRunning = false;
    document.getElementById("btn-pomo-start").textContent = "▶ Tiếp tục";
    return;
  }

  // Chưa chạy → Start
  pomodoroIsRunning = true;
  document.getElementById("btn-pomo-start").textContent = "⏸ Pause";

  pomodoroInterval = setInterval(() => {
    pomodoroSeconds--;

    if (pomodoroSeconds <= 0) {
      _onPomodoroPhaseEnd();
      return;
    }

    updatePomodoroDisplay();
  }, 1000);
}

/**
 * resetPomodoro()
 * Dừng và đặt lại Pomodoro về trạng thái ban đầu (25:00 / học).
 */
function resetPomodoro() {
  clearInterval(pomodoroInterval);
  pomodoroIsRunning = false;
  pomodoroIsWork    = true;
  pomodoroSeconds   = POMODORO_WORK_MINUTES * 60;
  updatePomodoroDisplay();
  document.getElementById("btn-pomo-start").textContent = "▶ Bắt đầu";
}

// ------------------------------------------------------------
// Hiển thị
// ------------------------------------------------------------

/**
 * updatePomodoroDisplay()
 * Cập nhật đồng hồ MM:SS và nhãn phase (học/nghỉ).
 */
function updatePomodoroDisplay() {
  try {
    const m = Math.floor((pomodoroSeconds || 0) / 60).toString().padStart(2, "0");
    const s = ((pomodoroSeconds || 0) % 60).toString().padStart(2, "0");

    const pomodoroTimeEl = document.getElementById("pomodoro-time");
    const pomodoroPhaseEl = document.getElementById("pomodoro-phase");

    if (pomodoroTimeEl) {
      pomodoroTimeEl.textContent = m + ":" + s;
      pomodoroTimeEl.style.color = pomodoroIsWork ? "var(--accent-orange)" : "var(--accent-green)";
    }
    if (pomodoroPhaseEl) {
      pomodoroPhaseEl.textContent = pomodoroIsWork ? "🎯 Tập trung học" : "☕ Nghỉ ngơi";
    }
  } catch (err) {
    console.error("❌ Lỗi updatePomodoroDisplay:", err);
  }
}

/**
 * showPomodoroAlert(title, message)
 * Hiện popup thông báo hết giờ (dùng lại popup cảnh báo tư thế).
 */
function showPomodoroAlert(title, message) {
  try {
    const alertTitleEl = document.getElementById("alert-title");
    const alertMessageEl = document.getElementById("alert-message");
    const alertOverlayEl = document.getElementById("alert-overlay");

    if (alertTitleEl) alertTitleEl.textContent = title || "Thông báo";
    if (alertMessageEl) alertMessageEl.textContent = message || "";
    if (alertOverlayEl) alertOverlayEl.classList.remove("hidden");
  } catch (err) {
    console.error("❌ Lỗi showPomodoroAlert:", err);
  }
}

// Đã chuyển playPomodoroSound sang js/audio.js
// ------------------------------------------------------------
// Hàm nội bộ
// ------------------------------------------------------------

/**
 * _onPomodoroPhaseEnd()
 * Xử lý khi hết một phase (học hoặc nghỉ): chuyển sang phase kế tiếp.
 */
function _onPomodoroPhaseEnd() {
  clearInterval(pomodoroInterval);
  pomodoroIsRunning = false;
  document.getElementById("btn-pomo-start").textContent = "▶ Bắt đầu";

  if (pomodoroIsWork) {
    // Hết giờ học → Nghỉ 5 phút
    pomodoroCycles++;
    document.getElementById("pomo-cycles").textContent = pomodoroCycles;
    pomodoroIsWork  = false;
    pomodoroSeconds = POMODORO_BREAK_MINUTES * 60;
    playPomodoroSound("break");
    showPomodoroAlert("🎉 Nghỉ ngơi 5 phút!", "Bạn đã học được 25 phút. Đứng dậy vận động và thư giãn mắt nhé!");
  } else {
    // Hết giờ nghỉ → Học tiếp
    pomodoroIsWork  = true;
    pomodoroSeconds = POMODORO_WORK_MINUTES * 60;
    playPomodoroSound("work");
    showPomodoroAlert("📚 Bắt đầu phiên học mới!", "Hết giờ nghỉ. Bắt đầu 25 phút học tập trung!");
  }

  updatePomodoroDisplay();
}
