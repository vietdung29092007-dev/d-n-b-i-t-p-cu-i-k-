/* ================================================
   friends.js — Hệ thống Kết Bạn
   ================================================ */

let friendsRef = null;
let friendReqRef = null;
let myFriends = {};      // { uid: { name, avatar, online } }
let pendingRequests = {}; // { fromUid: { name, avatar, timestamp } }
let myBlocks = {};      // { uid: true } - users I blocked
let myBlockedBy = {};   // { uid: true } - users who blocked me
let friendStatusRefs = {}; // { uid: ref }

/* =============================================
   KHỞI TẠO
   ============================================= */
function initFriends() {
  if (!currentUser || !isFirebaseConfigured) return;
  listenToBlocks();
  listenToFriends();
  listenToFriendRequests();
}

function listenToBlocks() {
  if (!currentUser) return;
  const myUid = currentUser.uid;

  db.ref(`blocks/${myUid}`).on('value', (snap) => {
    myBlocks = snap.val() || {};
    renderFriendList();
  });

  db.ref(`blockedBy/${myUid}`).on('value', (snap) => {
    myBlockedBy = snap.val() || {};
    renderFriendList();
  });
}

/* =============================================
   LƯU USER PROFILE (để có thể tìm kiếm)
   ============================================= */
function saveUserProfile(user) {
  if (!isFirebaseConfigured || !user) return;

  const profileData = {
    uid: user.uid,
    displayName: user.displayName || user.email || 'Ẩn danh',
    email: user.email || '',
    avatar: user.photoURL || '',
    online: true,
    updatedAt: firebase.database.ServerValue.TIMESTAMP
  };

  console.log('[Friends] Saving user profile:', profileData);

  db.ref('users/' + user.uid).update(profileData)
    .then(() => console.log('[Friends] ✅ Profile saved to /users/' + user.uid))
    .catch(err => console.error('[Friends] ❌ Failed to save profile:', err));

  // Đặt offline khi disconnect
  db.ref('users/' + user.uid + '/online').onDisconnect().set(false);
}

/* =============================================
   TÌM KIẾM NGƯỜI DÙNG
   ============================================= */
async function searchUsers(query) {
  if (!query || query.trim().length < 2) return [];
  if (!currentUser || !isFirebaseConfigured) return [];
  const q = query.trim().toLowerCase();

  console.log('[Friends] Searching users with query:', q);

  try {
    const snapshot = await db.ref('users').once('value');
    const allUsers = snapshot.val();
    console.log('[Friends] Total users in DB:', allUsers ? Object.keys(allUsers).length : 0, allUsers);

    if (!allUsers) {
      console.warn('[Friends] /users node is empty or no permission to read.');
      return [];
    }

    const results = [];
    snapshot.forEach(child => {
      const u = child.val();
      if (!u) return;
      if (u.uid === currentUser.uid) return; // bỏ bản thân

      const nameMatch  = (u.displayName || '').toLowerCase().includes(q);
      const emailMatch = (u.email || '').toLowerCase().includes(q);

      if (nameMatch || emailMatch) {
        results.push(u);
      }
    });

    console.log('[Friends] Search results:', results.length, results);
    return results.slice(0, 10);
  } catch (err) {
    console.error('[Friends] ❌ searchUsers error:', err);
    return [];
  }
}

/* =============================================
   GỬI LỜI MỜI KẾT BẠN
   ============================================= */
async function sendFriendRequest(targetUid, targetName, targetAvatar) {
  if (!currentUser || !isFirebaseConfigured) return;
  const myUid = currentUser.uid;

  // Kiểm tra đã là bạn chưa
  if (myFriends[targetUid]) {
    showToast('Đã là bạn bè rồi!', 'info');
    return;
  }

  // Ghi lời mời vào /friendRequests/{targetUid}/{myUid}
  await db.ref(`friendRequests/${targetUid}/${myUid}`).set({
    fromUid: myUid,
    fromName: currentUser.displayName || 'Ẩn danh',
    fromAvatar: currentUser.photoURL || '',
    timestamp: firebase.database.ServerValue.TIMESTAMP
  });

  // Đánh dấu mình đã gửi vào /friends/{myUid}/{targetUid}
  await db.ref(`friends/${myUid}/${targetUid}`).set({
    status: 'pending',
    direction: 'sent',
    name: targetName,
    avatar: targetAvatar,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  });

  showToast('✅ Đã gửi lời mời kết bạn!', 'success');
}

/* =============================================
   CHẤP NHẬN LỜI MỜI
   ============================================= */
async function acceptFriendRequest(fromUid) {
  if (!currentUser || !isFirebaseConfigured) return;
  const myUid = currentUser.uid;
  const req = pendingRequests[fromUid];
  if (!req) return;

  const batch = {};

  // Thêm vào /friends của cả 2
  batch[`friends/${myUid}/${fromUid}`] = {
    status: 'accepted',
    name: req.fromName,
    avatar: req.fromAvatar,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  };
  batch[`friends/${fromUid}/${myUid}`] = {
    status: 'accepted',
    name: currentUser.displayName || 'Ẩn danh',
    avatar: currentUser.photoURL || '',
    timestamp: firebase.database.ServerValue.TIMESTAMP
  };

  // Xóa lời mời
  batch[`friendRequests/${myUid}/${fromUid}`] = null;

  await db.ref().update(batch);
  showToast('🎉 Kết bạn thành công!', 'success');
}

/* =============================================
   TỪ CHỐI LỜI MỜI
   ============================================= */
async function declineFriendRequest(fromUid) {
  if (!currentUser || !isFirebaseConfigured) return;
  const myUid = currentUser.uid;

  // Xóa lời mời
  await db.ref(`friendRequests/${myUid}/${fromUid}`).remove();

  // Xóa trạng thái pending phía người gửi
  await db.ref(`friends/${fromUid}/${myUid}`).remove();

  showToast('Đã từ chối lời mời.', 'info');
  delete pendingRequests[fromUid];
  renderFriendRequests();
}

/* =============================================
   XÓA BẠN
   ============================================= */
async function removeFriend(friendUid) {
  if (!currentUser || !isFirebaseConfigured) return;
  const myUid = currentUser.uid;
  if (!confirm('Xóa bạn bè?')) return;

  const batch = {};
  batch[`friends/${myUid}/${friendUid}`] = null;
  batch[`friends/${friendUid}/${myUid}`] = null;
  await db.ref().update(batch);

  showToast('Đã xóa bạn bè.', 'info');
}

/* =============================================
   LẮNG NGHE DANH SÁCH BẠN BÈ
   ============================================= */
function listenToFriends() {
  if (!currentUser) return;
  const myUid = currentUser.uid;

  db.ref(`friends/${myUid}`).on('value', (snapshot) => {
    myFriends = {};
    snapshot.forEach(child => {
      const data = child.val();
      if (data && data.status === 'accepted') {
        myFriends[child.key] = data;
      }
    });
    renderFriendList();
    // Cập nhật friend-picker trong modal tạo nhóm
    if (typeof renderFriendPicker === 'function') renderFriendPicker();
  });
}

/* =============================================
   LẮNG NGHE LỜI MỜI KẾT BẠN ĐẾN
   ============================================= */
function listenToFriendRequests() {
  if (!currentUser) return;
  const myUid = currentUser.uid;

  db.ref(`friendRequests/${myUid}`).on('value', (snapshot) => {
    pendingRequests = {};
    snapshot.forEach(child => {
      pendingRequests[child.key] = child.val();
    });
    renderFriendRequests();
    updateFriendBadge();
  });
}

/* =============================================
   RENDER LỜI MỜI ĐẾN
   ============================================= */
function renderFriendRequests() {
  const container = document.getElementById('friend-requests-list');
  const section   = document.getElementById('friend-requests-section');
  if (!container || !section) return;

  const reqs = Object.entries(pendingRequests);

  if (reqs.length === 0) {
    section.classList.add('hidden');
    return;
  }
  section.classList.remove('hidden');

  container.innerHTML = reqs.map(([uid, req]) => `
    <div class="friend-req-item" id="req-${uid}">
      <img class="friend-req-avatar" src="${req.fromAvatar || ''}"
           alt="" onerror="this.style.display='none'"/>
      <span class="friend-req-name">${escapeHtml(req.fromName || 'Ẩn danh')}</span>
      <div class="friend-req-actions">
        <button class="btn-accept" onclick="acceptFriendRequest('${uid}')">✓</button>
        <button class="btn-decline" onclick="declineFriendRequest('${uid}')">✕</button>
      </div>
    </div>
  `).join('');
}

/* =============================================
   RENDER DANH SÁCH BẠN BÈ
   ============================================= */
function renderFriendList() {
  const container = document.getElementById('friend-list');
  if (!container) return;

  // Lọc bỏ bạn bè bị chặn
  const friends = Object.entries(myFriends).filter(([uid]) => !myBlocks[uid] && !myBlockedBy[uid]);
  if (friends.length === 0) {
    container.innerHTML = '<p class="log-empty">Chưa có bạn bè. Tìm bạn ngay!</p>';
    return;
  }

  container.innerHTML = friends.map(([uid, f]) => `
    <div class="friend-item" data-uid="${uid}">
      <div class="friend-avatar-wrap">
        <img class="friend-avatar" src="${f.avatar || ''}"
             alt="" onerror="this.style.display='none'"/>
        <span class="friend-online-dot" id="fdot-${uid}"></span>
      </div>
      <div class="friend-info">
        <span class="friend-name">${escapeHtml(f.name || 'Bạn bè')}</span>
        <span class="friend-status-text" id="fstatus-${uid}">—</span>
      </div>
      <div class="friend-actions-row" style="display:flex;gap:0.3rem;align-items:center;">
        <button class="btn-call-friend" title="Gọi video" onclick="event.stopPropagation(); callFriend('${uid}', '${escapeHtml(f.name || 'Bạn bè')}', '${f.avatar || ''}')" style="padding:0.25rem 0.45rem;border:1px solid rgba(0,255,136,0.3);border-radius:6px;background:rgba(0,255,136,0.08);color:var(--accent-green);font-size:0.7rem;cursor:pointer;">
          📞
        </button>
        <button class="btn-chat-friend" title="Nhắn tin" onclick="event.stopPropagation(); openDMWithFriend('${uid}', '${escapeHtml(f.name || 'Bạn bè')}', '${f.avatar || ''}')">
          💬
        </button>
        <button class="btn-block-friend" title="Chặn" onclick="event.stopPropagation(); blockUser('${uid}')" style="padding:0.25rem 0.45rem;border:1px solid rgba(255,71,87,0.3);border-radius:6px;background:rgba(255,71,87,0.08);color:var(--accent-red);font-size:0.7rem;cursor:pointer;">
          🚫
        </button>
        <button class="btn-report-friend" title="Báo cáo" onclick="event.stopPropagation(); reportUser('${uid}')" style="padding:0.25rem 0.45rem;border:1px solid rgba(255,159,67,0.3);border-radius:6px;background:rgba(255,159,67,0.08);color:#ff9f43;font-size:0.7rem;cursor:pointer;">
          🚩
        </button>
      </div>
    </div>
  `).join('');

  // Kích hoạt status check sau khi render
  listenToFriendsStatus();
}

function listenToFriendsStatus() {
  // Gỡ bỏ listener cũ
  Object.entries(friendStatusRefs).forEach(([uid, ref]) => ref.off());
  friendStatusRefs = {};

  Object.keys(myFriends).forEach(uid => {
    // Không nghe nếu bị chặn
    if (myBlocks[uid] || myBlockedBy[uid]) return;

    const statusRef = db.ref(`users/${uid}`);
    friendStatusRefs[uid] = statusRef;

    statusRef.on('value', (snap) => {
      const u = snap.val();
      if (!u) return;

      const isOnline = u.online === true;
      const dot = document.getElementById(`fdot-${uid}`);
      const statusText = document.getElementById(`fstatus-${uid}`);

      if (dot) {
        dot.style.backgroundColor = isOnline ? 'var(--accent-green, #00ff88)' : 'var(--text-secondary, #708090)';
        dot.classList.toggle('online', isOnline);
      }

      if (statusText) {
        statusText.textContent = isOnline ? 'Online' : 'Offline';
        statusText.style.color = isOnline ? 'var(--accent-green, #00ff88)' : 'var(--text-secondary, #a0aec0)';
      }
    });
  });
}

/* =============================================
   CHẶN & BÁO CÁO NGƯỜI DÙNG
   ============================================= */
async function blockUser(targetUid) {
  if (!currentUser || !isFirebaseConfigured) return;
  const name = myFriends[targetUid]?.name || 'người dùng này';
  if (!confirm(`Bạn có chắc muốn chặn ${name}? Cả hai sẽ không thể nhắn tin hay gọi điện.`)) return;

  const myUid = currentUser.uid;
  const batch = {};

  batch[`blocks/${myUid}/${targetUid}`] = true;
  batch[`blockedBy/${targetUid}/${myUid}`] = true;

  // Hủy kết bạn
  batch[`friends/${myUid}/${targetUid}`] = null;
  batch[`friends/${targetUid}/${myUid}`] = null;

  // Xóa lời mời kết bạn (nếu có)
  batch[`friendRequests/${myUid}/${targetUid}`] = null;
  batch[`friendRequests/${targetUid}/${myUid}`] = null;

  try {
    await db.ref().update(batch);
    showToast(`🚫 Đã chặn ${name}.`, 'info');
  } catch (err) {
    console.error('Block fail:', err);
    showToast('Lỗi khi chặn người dùng!', 'error');
  }
}

async function unblockUser(targetUid) {
  if (!currentUser || !isFirebaseConfigured) return;
  const myUid = currentUser.uid;
  const batch = {};
  batch[`blocks/${myUid}/${targetUid}`] = null;
  batch[`blockedBy/${targetUid}/${myUid}`] = null;

  try {
    await db.ref().update(batch);
    showToast(`Đã mở chặn.`, 'info');
  } catch (err) {
    console.error('Unblock fail:', err);
  }
}

function reportUser(targetUid) {
  if (!currentUser || !isFirebaseConfigured) return;
  const name = myFriends[targetUid]?.name || 'người dùng này';
  const reason = prompt(`Nhập lý do báo cáo ${name} (ví dụ: gửi tin nhắn rác, quấy rối, ngôn từ thù ghét...):`);
  if (reason === null) return;
  if (!reason.trim()) {
    showToast('Vui lòng nhập lý do báo cáo!', 'error');
    return;
  }

  db.ref(`reports/${targetUid}`).push({
    reporterUid: currentUser.uid,
    reporterName: currentUser.displayName || 'Ẩn danh',
    reason: reason.trim(),
    timestamp: firebase.database.ServerValue.TIMESTAMP
  }).then(() => {
    showToast('⚠️ Đã gửi báo cáo thành công! Admin sẽ xem xét.', 'success');
  }).catch(err => {
    console.error('Report fail:', err);
    showToast('Lỗi khi gửi báo cáo!', 'error');
  });
}

/* =============================================
   CẬP NHẬT BADGE SỐ LỜI MỜI
   ============================================= */
function updateFriendBadge() {
  const badge = document.getElementById('friend-req-badge');
  if (!badge) return;
  const count = Object.keys(pendingRequests).length;
  if (count > 0) {
    badge.textContent = count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

/* =============================================
   MỞ MODAL TÌM KIẾM BẠN
   ============================================= */
function openFindFriendModal() {
  const modal = document.getElementById('modal-find-friend');
  if (modal) modal.classList.remove('hidden');
  const input = document.getElementById('search-user-input');
  if (input) { input.value = ''; input.focus(); }
  const results = document.getElementById('search-results');
  if (results) results.innerHTML = '<p class="log-empty">Nhập tên để tìm kiếm...</p>';

  // Force sync profile mỗi lần mở modal (đảm bảo người khác tìm thấy bạn)
  if (currentUser && typeof saveUserProfile === 'function') {
    saveUserProfile(currentUser);
  }
}

function closeFindFriendModal() {
  const modal = document.getElementById('modal-find-friend');
  if (modal) modal.classList.add('hidden');
}

/* =============================================
   XỬ LÝ TÌM KIẾM (debounce 400ms)
   ============================================= */
let _searchTimer = null;
function onSearchInput() {
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(async () => {
    const q = document.getElementById('search-user-input')?.value || '';
    const container = document.getElementById('search-results');
    if (!container) return;

    if (q.trim().length < 2) {
      container.innerHTML = '<p class="log-empty">Nhập ít nhất 2 ký tự...</p>';
      return;
    }

    container.innerHTML = '<p class="log-empty">Đang tìm...</p>';
    const results = await searchUsers(q);

    if (results.length === 0) {
      container.innerHTML = '<p class="log-empty">Không tìm thấy người dùng.</p>';
      return;
    }

    container.innerHTML = results.map(u => {
      let btnClass = 'btn-add-friend';
      let btnText  = '+ Kết bạn';
      let btnClick = `sendFriendRequest('${u.uid}', '${escapeHtml(u.displayName)}', '${u.avatar}')`;

      if (myFriends[u.uid]) {
        btnClass += ' already'; btnText = '✓ Bạn bè'; btnClick = '';
      } else {
        // Kiểm tra đã gửi lời mời chưa (trong friends/{myUid}/{uid} với status pending)
        // Sẽ cập nhật động từ listener
      }

      return `
        <div class="search-result-item">
          <img class="search-result-avatar" src="${u.avatar || ''}"
               alt="" onerror="this.style.display='none'"/>
          <span class="search-result-name">${escapeHtml(u.displayName || 'Ẩn danh')}</span>
          <button class="${btnClass}" ${btnClick ? `onclick="${btnClick}"` : 'disabled'}>${btnText}</button>
        </div>
      `;
    }).join('');
  }, 400);
}

/* =============================================
   MỞ CHAT TRỰC TIẾP VỚI BẠN (DM)
   Tạo nhóm riêng 2 người nếu chưa có
   ============================================= */
async function openDMWithFriend(friendUid, friendName, friendAvatar) {
  if (!currentUser || !isFirebaseConfigured) return;
  const myUid = currentUser.uid;

  // ID phòng DM: sort 2 uid để luôn nhất quán
  const dmId = [myUid, friendUid].sort().join('_dm_');

  // Tạo nhóm DM nếu chưa tồn tại
  const snap = await db.ref(`groups/${dmId}`).once('value');
  if (!snap.exists()) {
    const batch = {};
    batch[`groups/${dmId}/name`] = `DM: ${friendName}`;
    batch[`groups/${dmId}/type`] = 'dm';
    batch[`groups/${dmId}/createdBy`] = myUid;
    batch[`groups/${dmId}/createdAt`] = firebase.database.ServerValue.TIMESTAMP;
    batch[`groups/${dmId}/members/${myUid}`] = {
      name: currentUser.displayName || 'Ẩn danh',
      avatar: currentUser.photoURL || '',
      joinedAt: firebase.database.ServerValue.TIMESTAMP
    };
    batch[`groups/${dmId}/members/${friendUid}`] = {
      name: friendName,
      avatar: friendAvatar,
      joinedAt: firebase.database.ServerValue.TIMESTAMP
    };
    await db.ref().update(batch);
  }

  // Chuyển sang tab nhóm và mở nhóm DM
  switchCommunityTab('groups');
  openGroupChat(dmId);
}

/* =============================================
   TOAST NOTIFICATION
   ============================================= */
function showToast(message, type = 'info') {
  let toast = document.getElementById('toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.style.cssText = `
      position: fixed; bottom: 1.5rem; right: 1.5rem;
      padding: 0.65rem 1rem;
      border-radius: 10px;
      font-size: 0.82rem;
      font-weight: 600;
      font-family: 'DM Sans', sans-serif;
      z-index: 99999;
      max-width: 280px;
      animation: slideUp 0.25s ease;
      pointer-events: none;
    `;
    document.body.appendChild(toast);
  }

  const colors = {
    success: 'background:rgba(0,255,136,0.15);border:1px solid rgba(0,255,136,0.4);color:#00ff88',
    info:    'background:rgba(0,212,255,0.12);border:1px solid rgba(0,212,255,0.35);color:#00d4ff',
    error:   'background:rgba(255,71,87,0.12);border:1px solid rgba(255,71,87,0.4);color:#ff4757'
  };
  toast.style.cssText += ';' + (colors[type] || colors.info);
  toast.textContent = message;
  toast.style.display = 'block';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.display = 'none'; }, 3000);
}
