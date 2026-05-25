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
  setInterval(() => {
    if (!isRunning) return;

    stats.totalSeconds++;
    updateSessionClock();

    if (currentPoseIsGood) {
      stats.goodSeconds++;
    } else {
      stats.badSeconds++;
    }

    updateStatDisplay();
    updateDoughnutChart();
  }, 1000);
}

/**
 * updateStatDisplay()
 * Cập nhật 3 thẻ số liệu: % ngồi đúng, % tư thế sai, số lần cảnh báo.
 */
function updateStatDisplay() {
  const goodPct = stats.totalSeconds > 0
    ? Math.round((stats.goodSeconds / stats.totalSeconds) * 100) : 0;

  document.getElementById("stat-good").textContent   = goodPct + "%";
  document.getElementById("stat-bad").textContent    = (100 - goodPct) + "%";
  document.getElementById("stat-alerts").textContent = stats.alertCount;
}
