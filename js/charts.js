/**
 * ============================================================
 *  PoseAlert — js/charts.js
 *  Khởi tạo và cập nhật biểu đồ Chart.js:
 *  - Doughnut chart: tỷ lệ tư thế toàn phiên
 *  - Line chart: lịch sử % ngồi đúng theo thời gian (mỗi 5 giây)
 *  Phụ thuộc: config.js, state.js
 * ============================================================
 */

// ------------------------------------------------------------
// Entry point
// ------------------------------------------------------------

/**
 * initCharts()
 * Khởi tạo (hoặc tái khởi tạo) cả hai biểu đồ.
 * Gọi khi trang load và mỗi khi restart app.
 */
function initCharts() {
  initDoughnutChart();
  initLineChart();
}

// ------------------------------------------------------------
// Biểu đồ tròn (Doughnut)
// ------------------------------------------------------------

/**
 * initDoughnutChart()
 * Tạo biểu đồ tròn hiển thị tỷ lệ 4 loại tư thế.
 * Destroy chart cũ nếu đã tồn tại (tránh lỗi "Canvas is already in use").
 */
function initDoughnutChart() {
  if (doughnutChart) {
    doughnutChart.destroy();
    doughnutChart = null;
  }

  const labels = Object.keys(POSE_CONFIG);
  const colors = ["#00ff88", "#ff4757", "#ffd700", "#ff6b35"];

  chartData.labels = labels;
  chartData.colors = colors;

  const ctx2d = document.getElementById("doughnut-chart").getContext("2d");

  doughnutChart = new Chart(ctx2d, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: [1, 0, 0, 0],
        backgroundColor: colors,
        borderColor: "#111827",
        borderWidth: 3,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      cutout: "65%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: c => " " + c.label + ": " + c.parsed.toFixed(1) + "%"
          }
        }
      }
    }
  });

  // Vẽ legend tùy chỉnh (xóa cũ trước để tránh trùng khi restart)
  const legendEl = document.getElementById("chart-legend");
  legendEl.innerHTML = "";
  labels.forEach((label, i) => {
    const item = document.createElement("div");
    item.className = "legend-item";
    item.innerHTML =
      '<div class="legend-dot" style="background:' + colors[i] + '"></div>' +
      "<span>" + label + "</span>";
    legendEl.appendChild(item);
  });
}

/**
 * updateDoughnutChart()
 * Cập nhật dữ liệu biểu đồ tròn theo thống kê hiện tại.
 * Phân chia badPct đều cho 3 loại tư thế sai.
 */
function updateDoughnutChart() {
  if (!doughnutChart || stats.totalSeconds === 0) return;

  const goodPct = (stats.goodSeconds / stats.totalSeconds) * 100;
  const badPct  = 100 - goodPct;

  doughnutChart.data.datasets[0].data = [
    goodPct,
    badPct / 3,
    badPct / 3,
    badPct / 3,
  ];
  doughnutChart.update("none"); // Không animation để tránh giật
}

// ------------------------------------------------------------
// Biểu đồ đường (Line)
// ------------------------------------------------------------

/**
 * initLineChart()
 * Tạo biểu đồ đường theo dõi % ngồi đúng qua thời gian.
 * Destroy chart cũ và reset dữ liệu nếu cần.
 */
function initLineChart() {
  if (lineChart) {
    lineChart.destroy();
    lineChart = null;
  }
  lineChartLabels.length = 0;
  lineChartData.length   = 0;

  const ctx2d = document.getElementById("line-chart").getContext("2d");

  lineChart = new Chart(ctx2d, {
    type: "line",
    data: {
      labels: lineChartLabels,
      datasets: [{
        label: "% Ngồi đúng",
        data: lineChartData,
        borderColor: "#00ff88",
        backgroundColor: "rgba(0,255,136,0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointBackgroundColor: "#00ff88",
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 0, max: 100,
          ticks: { color: "#7986a3", font: { size: 10 }, callback: v => v + "%" },
          grid:  { color: "rgba(255,255,255,0.05)" },
        },
        x: {
          ticks: { color: "#7986a3", font: { size: 9 }, maxRotation: 0 },
          grid:  { color: "rgba(255,255,255,0.05)" },
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}

/**
 * startLineChartTracking()
 * Thêm điểm dữ liệu mỗi 5 giây, giữ tối đa 20 điểm gần nhất.
 */
function startLineChartTracking() {
  lineDataInterval = setInterval(() => {
    if (!isRunning) return;

    const goodPct = stats.totalSeconds > 0
      ? Math.round((stats.goodSeconds / stats.totalSeconds) * 100) : 0;

    const e = stats.totalSeconds;
    const m = Math.floor(e / 60).toString().padStart(2, "0");
    const s = (e % 60).toString().padStart(2, "0");

    lineChartLabels.push(m + ":" + s);
    lineChartData.push(goodPct);

    // Giữ tối đa 20 điểm
    if (lineChartLabels.length > 20) {
      lineChartLabels.shift();
      lineChartData.shift();
    }

    lineChart.update("none");
  }, 5000);
}
