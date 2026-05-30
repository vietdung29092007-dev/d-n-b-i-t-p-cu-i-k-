/**
 * ============================================================
 *  PoseAlert — js/stats.js
 *  Theo dõi thống kê phiên: giây ngồi đúng/sai, đồng hồ phiên
 *  Phụ thuộc: state.js, ui.js, charts.js
 * ============================================================
 */

/**
 * startStatTracking()
 * Chạy mỗi giây khi app đang hoạt động:
 * - Tăng counter tổng, tốt/xấu
 * - Cập nhật đồng hồ phiên ở header
 * - Cập nhật 3 số liệu thống kê (% tốt, % xấu, số cảnh báo)
 * - Cập nhật biểu đồ tròn
 */
function startStatTracking() {
  try {
    setInterval(() => {
      try {
        if (!isRunning) return;

        if (stats) {
          stats.totalSeconds++;
          if (currentPoseIsGood) {
            stats.goodSeconds++;
          } else {
            stats.badSeconds++;
          }
        }

        updateSessionClock();
        updateStatDisplay();
        updateDoughnutChart();
      } catch (err) {
        console.error("❌ Lỗi trong vòng lặp startStatTracking:", err);
      }
    }, 1000);
  } catch (err) {
    console.error("❌ Lỗi startStatTracking:", err);
  }
}

/**
 * updateStatDisplay()
 * Cập nhật 3 thẻ số liệu: % ngồi đúng, % tư thế sai, số lần cảnh báo.
 */
function updateStatDisplay() {
  try {
    const goodPct = (stats && stats.totalSeconds > 0)
      ? Math.round((stats.goodSeconds / stats.totalSeconds) * 100) : 0;

    const statGoodEl = document.getElementById("stat-good");
    const statBadEl = document.getElementById("stat-bad");
    const statAlertsEl = document.getElementById("stat-alerts");

    if (statGoodEl) statGoodEl.textContent = goodPct + "%";
    if (statBadEl) statBadEl.textContent = (100 - goodPct) + "%";
    if (statAlertsEl) statAlertsEl.textContent = (stats && stats.alertCount) || 0;
  } catch (err) {
    console.error("❌ Lỗi updateStatDisplay:", err);
  }
}
