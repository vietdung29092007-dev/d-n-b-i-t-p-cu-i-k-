/**
 * ============================================================
 *  PoseAlert — js/audio.js
 *  Hệ thống âm thanh dùng Web Audio API (Synthesizer)
 * ============================================================
 */

let audioCtx = null;

// Khởi tạo AudioContext (chỉ chạy khi có tương tác đầu tiên)
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

/**
 * Tiếng "tíc" nhẹ khi click nút
 */
function playClickSound() {
  try {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.05);
  } catch(e) {}
}

/**
 * Tiếng chuông báo hoàn thành (Arpeggio đi lên)
 */
function playSuccessSound() {
  try {
    initAudio();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = "sine";
      const startTime = audioCtx.currentTime + (i * 0.1);
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
      
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  } catch(e) {}
}

/**
 * Tiếng "pop" nhẹ khi có tin nhắn mới
 */
function playMessageSound() {
  try {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.15);
  } catch(e) {}
}

/**
 * Âm thanh chuông cảnh báo tư thế sai (A5 xuống A4)
 */
function playAlertSound() {
  try {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);

    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.0);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 1.0);
  } catch (e) {
    console.warn("Không thể phát âm thanh cảnh báo:", e);
  }
}

// Lắng nghe sự kiện click toàn cục để Resume AudioContext và phát tiếng Click
document.addEventListener('click', (e) => {
  initAudio();
  
  // Phát tiếng tíc nếu click vào button hoặc thẻ a có class btn
  const isButton = e.target.closest('button');
  const isLinkBtn = e.target.closest('a.btn-start, a.btn-stop, a.btn-login');
  const isQuestBtn = e.target.closest('.quest-claim-btn');
  const isChatBtn = e.target.closest('.chat-btn, .btn-attach, .friend-action-btn');
  
  if (isButton || isLinkBtn || isQuestBtn || isChatBtn) {
    playClickSound();
  }
});

/**
 * Âm thanh Pomodoro
 * - "break" (nghỉ): nốt đi lên (C5 → E5 → G5)
 * - "work" (học):   nốt đi xuống (G5 → E5 → C5)
 */
function playPomodoroSound(type) {
  try {
    initAudio();
    const gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);

    const notes = type === "break" ? [523, 659, 784] : [784, 659, 523];

    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      osc.connect(gainNode);
      osc.type            = "sine";
      osc.frequency.value = freq;

      const t = audioCtx.currentTime + i * 0.25;
      gainNode.gain.setValueAtTime(0.2, t);
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.start(t);
      osc.stop(t + 0.25);
    });
  } catch (e) {
    console.warn("Không thể phát âm thanh Pomodoro:", e);
  }
}
