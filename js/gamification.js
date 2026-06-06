/* ================================================
   gamification.js — Logic Chuỗi Lửa & Nhiệm Vụ Hàng Ngày
   ================================================ */

// Mẫu dữ liệu nhiệm vụ mặc định
const DEFAULT_QUESTS = {
  quest_duration: {
    title: "Tân binh tập trung",
    desc: "Học tổng cộng 25 phút trong ngày",
    current: 0,
    target: 25,
    completed: false
  },
  quest_posture: {
    title: "Chiến thần cột sống",
    desc: "Có 1 phiên học (≥ 5 phút) đúng tư thế > 80%",
    current: 0,
    target: 1,
    completed: false
  },
  quest_pomodoro: {
    title: "Bền bỉ",
    desc: "Hoàn thành 3 chu kỳ Pomodoro",
    current: 0,
    target: 3,
    completed: false
  }
};

let currentStreak = 0;
let todayQuests = null;

// Lấy chuỗi ngày tháng dạng YYYY-MM-DD theo giờ địa phương
function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Khởi tạo Gamification khi đăng nhập
async function initGamification() {
  if (!currentUser || !isFirebaseConfigured) return;
  const uid = currentUser.uid;
  const todayStr = getLocalDateString();

  try {
    // 1. Tải thông tin Chuỗi lửa (Streak)
    const streakSnap = await db.ref(`users/${uid}/gamification/streak`).once('value');
    let streakData = streakSnap.val() || { current: 0, lastStudyDate: '', longest: 0 };
    
    // Kiểm tra reset streak nếu lỡ mất ngày
    if (streakData.lastStudyDate) {
      const lastDate = new Date(streakData.lastStudyDate);
      const todayDate = new Date(todayStr);
      const diffTime = Math.abs(todayDate - lastDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 1) {
        // Mất chuỗi
        streakData.current = 0;
        await db.ref(`users/${uid}/gamification/streak/current`).set(0);
      }
    }
    currentStreak = streakData.current;
    renderStreak(currentStreak);

    // 2. Tải thông tin Nhiệm vụ (Quests) của ngày hôm nay
    const questsSnap = await db.ref(`users/${uid}/gamification/quests/${todayStr}`).once('value');
    if (questsSnap.exists()) {
      todayQuests = questsSnap.val();
    } else {
      todayQuests = JSON.parse(JSON.stringify(DEFAULT_QUESTS)); // clone
      await db.ref(`users/${uid}/gamification/quests/${todayStr}`).set(todayQuests);
    }
    renderQuests(todayQuests);

  } catch (err) {
    console.error("Lỗi khởi tạo Gamification:", err);
  }
}

// Gọi hàm này sau mỗi phiên học (autoSaveSession)
async function updateGamification(sessionData) {
  if (!currentUser || !isFirebaseConfigured) return;
  const uid = currentUser.uid;
  const todayStr = getLocalDateString();

  try {
    // 1. Cập nhật Chuỗi lửa (Streak)
    const streakSnap = await db.ref(`users/${uid}/gamification/streak`).once('value');
    let streakData = streakSnap.val() || { current: 0, lastStudyDate: '', longest: 0 };

    if (streakData.lastStudyDate !== todayStr) {
      streakData.current += 1;
      streakData.lastStudyDate = todayStr;
      if (streakData.current > streakData.longest) {
        streakData.longest = streakData.current;
      }
      await db.ref(`users/${uid}/gamification/streak`).set(streakData);
      currentStreak = streakData.current;
      renderStreak(currentStreak);
    }

    // 2. Cập nhật Nhiệm vụ (Quests)
    if (!todayQuests) todayQuests = JSON.parse(JSON.stringify(DEFAULT_QUESTS));
    
    let isQuestsUpdated = false;

    // Quest 1: Học 25 phút
    if (!todayQuests.quest_duration.completed) {
      todayQuests.quest_duration.current += sessionData.durationMinutes;
      if (todayQuests.quest_duration.current >= todayQuests.quest_duration.target) {
        todayQuests.quest_duration.current = todayQuests.quest_duration.target;
        todayQuests.quest_duration.completed = true;
      }
      isQuestsUpdated = true;
    }

    // Quest 2: Tư thế đúng > 80% (trong phiên >= 5p)
    if (!todayQuests.quest_posture.completed && sessionData.durationMinutes >= 5) {
      if (sessionData.goodPosturePct > 80) {
        todayQuests.quest_posture.current = 1;
        todayQuests.quest_posture.completed = true;
        isQuestsUpdated = true;
      }
    }

    // Quest 3: Pomodoro
    if (!todayQuests.quest_pomodoro.completed && sessionData.pomodoroCompleted > 0) {
      todayQuests.quest_pomodoro.current += sessionData.pomodoroCompleted;
      if (todayQuests.quest_pomodoro.current >= todayQuests.quest_pomodoro.target) {
        todayQuests.quest_pomodoro.current = todayQuests.quest_pomodoro.target;
        todayQuests.quest_pomodoro.completed = true;
      }
      isQuestsUpdated = true;
    }

    if (isQuestsUpdated) {
      await db.ref(`users/${uid}/gamification/quests/${todayStr}`).set(todayQuests);
      renderQuests(todayQuests);
    }

  } catch (err) {
    console.error("Lỗi cập nhật Gamification:", err);
  }
}

// Render Chuỗi Lửa UI
function renderStreak(streak) {
  const streakEl = document.getElementById('user-streak');
  if (streakEl) {
    streakEl.innerHTML = `🔥 ${streak} Ngày`;
    // Đổi màu nếu streak cao
    if (streak >= 3 && streak < 7) {
      streakEl.style.color = '#ff9800'; // Cam
      streakEl.style.textShadow = '0 0 10px rgba(255,152,0,0.5)';
    } else if (streak >= 7) {
      streakEl.style.color = '#ff3d00'; // Đỏ rực rỡ
      streakEl.style.textShadow = '0 0 15px rgba(255,61,0,0.8)';
    } else {
      streakEl.style.color = 'var(--text-secondary)';
      streakEl.style.textShadow = 'none';
    }
  }
}

// Render Nhiệm vụ UI
function renderQuests(quests) {
  const listEl = document.getElementById('quest-list');
  if (!listEl) return;

  let html = '';
  Object.keys(quests).forEach(key => {
    const q = quests[key];
    const pct = Math.min(100, Math.round((q.current / q.target) * 100));
    const isCompleted = q.completed;

    html += `
      <div class="quest-item ${isCompleted ? 'completed' : ''}">
        <div class="quest-info">
          <div class="quest-title">${isCompleted ? '✅' : '🎯'} ${q.title}</div>
          <div class="quest-desc">${q.desc}</div>
        </div>
        <div class="quest-progress">
          <div class="progress-bar-wrap">
            <div class="progress-bar" style="width: ${pct}%"></div>
          </div>
          <div class="progress-text">${Math.round(q.current)}/${q.target}</div>
        </div>
      </div>
    `;
  });

  listEl.innerHTML = html;
}
