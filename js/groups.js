/* ================================================
   groups.js — Nhóm Chat Riêng
   ================================================ */

let myGroups = {};         // { groupId: { name, memberCount, ... } }
let activeGroupId = null;  // Nhóm đang mở
let groupChatRef = null;   // Firebase listener cho chat nhóm
let selectedFriendUids = new Set(); // Danh sách bạn được chọn khi tạo nhóm

/* =============================================
   KHỞI TẠO
   ============================================= */
function initGroups() {
  if (!currentUser || !isFirebaseConfigured) return;
  listenToMyGroups();
}

/* =============================================
   LẮNG NGHE CÁC NHÓM CỦA MÌNH
   ============================================= */
function listenToMyGroups() {
  if (!currentUser) return;
  const myUid = currentUser.uid;

  // Lắng nghe tất cả groups mà mình là member
  db.ref('groups').on('value', (snapshot) => {
    myGroups = {};
    snapshot.forEach(child => {
      const g = child.val();
      if (g && g.members && g.members[myUid]) {
        myGroups[child.key] = {
          ...g,
          id: child.key,
          memberCount: Object.keys(g.members || {}).length
        };
      }
    });
    renderGroupList();
  });
}

/* =============================================
   TẠO NHÓM MỚI
   ============================================= */
async function createGroup() {
  if (!currentUser || !isFirebaseConfigured) return;
  const nameInput = document.getElementById('group-name-input');
  if (!nameInput) return;

  const groupName = nameInput.value.trim();
  if (!groupName) {
    showToast('Nhập tên nhóm!', 'error');
    return;
  }
  if (selectedFriendUids.size === 0) {
    showToast('Chọn ít nhất 1 thành viên!', 'error');
    return;
  }

  const myUid = currentUser.uid;
  const groupRef = db.ref('groups').push();
  const groupId  = groupRef.key;

  const members = {
    [myUid]: {
      name: currentUser.displayName || 'Ẩn danh',
      avatar: currentUser.photoURL || '',
      joinedAt: firebase.database.ServerValue.TIMESTAMP
    }
  };

  // Thêm các bạn được chọn
  selectedFriendUids.forEach(uid => {
    const f = myFriends[uid];
    if (f) {
      members[uid] = {
        name: f.name || 'Bạn bè',
        avatar: f.avatar || '',
        joinedAt: firebase.database.ServerValue.TIMESTAMP
      };
    }
  });

  await groupRef.set({
    name: groupName,
    type: 'group',
    createdBy: myUid,
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    members
  });

  closeCreateGroupModal();
  showToast(`🎉 Tạo nhóm "${groupName}" thành công!`, 'success');

  // Tự động mở nhóm vừa tạo
  openGroupChat(groupId);
}

/* =============================================
   MỞ NHÓM CHAT
   ============================================= */
function openGroupChat(groupId) {
  activeGroupId = groupId;

  // Cập nhật UI danh sách nhóm (highlight active)
  document.querySelectorAll('.group-item').forEach(el => {
    el.classList.toggle('active', el.dataset.gid === groupId);
  });

  // Tắt listener cũ
  if (groupChatRef) groupChatRef.off();

  // Hiện khu vực chat
  const chatSection = document.getElementById('group-chat-section');
  const placeholder = document.getElementById('group-chat-placeholder');
  if (chatSection)  chatSection.classList.remove('hidden');
  if (placeholder)  placeholder.classList.add('hidden');

  // Cập nhật header
  const group = myGroups[groupId];
  const headerName = document.getElementById('group-chat-header-name');
  if (headerName && group) {
    const icon = group.type === 'dm' ? '💬' : '👥';
    headerName.textContent = `${icon} ${group.name}`;
  }

  // Xóa tin nhắn cũ
  const msgContainer = document.getElementById('group-chat-messages');
  if (msgContainer) msgContainer.innerHTML = '';

  // Lắng nghe chat nhóm
  groupChatRef = db.ref(`groups/${groupId}/chat`)
    .orderByChild('timestamp')
    .limitToLast(80);

  groupChatRef.on('child_added', (snap) => {
    appendGroupMessage(snap.val());
  });

  // Focus input
  setTimeout(() => {
    const input = document.getElementById('group-chat-input');
    if (input) input.focus();
  }, 100);
}

/* =============================================
   GỬI TIN NHẮN NHÓM
   ============================================= */
function sendGroupMessage() {
  if (!currentUser || !activeGroupId || !isFirebaseConfigured) return;

  const input = document.getElementById('group-chat-input');
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  db.ref(`groups/${activeGroupId}/chat`).push({
    uid: currentUser.uid,
    name: currentUser.displayName || 'Ẩn danh',
    avatar: currentUser.photoURL || '',
    text: text,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  });

  input.value = '';
  input.focus();
}

/* =============================================
   HIỂN THỊ TIN NHẮN NHÓM
   ============================================= */
function appendGroupMessage(msg) {
  const container = document.getElementById('group-chat-messages');
  if (!container) return;

  const isMe = currentUser && msg.uid === currentUser.uid;
  const time  = msg.timestamp
    ? new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '';

  const div = document.createElement('div');
  div.className = `chat-msg ${isMe ? 'chat-msg-me' : ''}`;
  div.innerHTML = `
    <img class="chat-avatar" src="${msg.avatar || ''}" alt=""
         onerror="this.style.display='none'"/>
    <div class="chat-bubble">
      <div class="chat-meta">
        <span class="chat-name">${escapeHtml(msg.name || 'Ẩn danh')}</span>
        <span class="chat-time">${time}</span>
      </div>
      <div class="chat-text">${escapeHtml(msg.text || '')}</div>
    </div>
  `;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;

  // Giới hạn tin nhắn hiển thị
  while (container.children.length > 80) {
    container.removeChild(container.firstChild);
  }
}

/* =============================================
   RỜI NHÓM
   ============================================= */
async function leaveGroup(groupId) {
  if (!currentUser || !isFirebaseConfigured) return;
  if (!confirm('Bạn muốn rời khỏi nhóm này?')) return;

  await db.ref(`groups/${groupId}/members/${currentUser.uid}`).remove();

  if (activeGroupId === groupId) {
    activeGroupId = null;
    const chatSection = document.getElementById('group-chat-section');
    const placeholder = document.getElementById('group-chat-placeholder');
    if (chatSection) chatSection.classList.add('hidden');
    if (placeholder) placeholder.classList.remove('hidden');
    if (groupChatRef) { groupChatRef.off(); groupChatRef = null; }
  }

  showToast('Đã rời nhóm.', 'info');
}

/* =============================================
   RENDER DANH SÁCH NHÓM
   ============================================= */
function renderGroupList() {
  const container = document.getElementById('group-list');
  if (!container) return;

  const groups = Object.entries(myGroups);
  if (groups.length === 0) {
    container.innerHTML = '<p class="log-empty">Chưa có nhóm nào...</p>';
    return;
  }

  container.innerHTML = groups.map(([gid, g]) => {
    const icon = g.type === 'dm' ? '💬' : '👥';
    const isActive = gid === activeGroupId;
    return `
      <div class="group-item ${isActive ? 'active' : ''}" data-gid="${gid}"
           onclick="openGroupChat('${gid}')">
        <div class="group-icon">${icon}</div>
        <div class="group-info">
          <span class="group-name">${escapeHtml(g.name || 'Nhóm')}</span>
          <span class="group-member-count">${g.memberCount || 1} thành viên</span>
        </div>
      </div>
    `;
  }).join('');
}

/* =============================================
   MODAL TẠO NHÓM
   ============================================= */
function openCreateGroupModal() {
  const modal = document.getElementById('modal-create-group');
  if (modal) modal.classList.remove('hidden');
  const nameInput = document.getElementById('group-name-input');
  if (nameInput) { nameInput.value = ''; nameInput.focus(); }
  selectedFriendUids.clear();
  renderFriendPicker();
}

function closeCreateGroupModal() {
  const modal = document.getElementById('modal-create-group');
  if (modal) modal.classList.add('hidden');
  selectedFriendUids.clear();
}

/* =============================================
   RENDER DANH SÁCH BẠN ĐỂ CHỌN (trong modal tạo nhóm)
   ============================================= */
function renderFriendPicker() {
  const container = document.getElementById('friend-picker');
  if (!container) return;

  const friends = Object.entries(myFriends);
  if (friends.length === 0) {
    container.innerHTML = '<p class="log-empty">Chưa có bạn bè để thêm vào nhóm.</p>';
    return;
  }

  container.innerHTML = friends.map(([uid, f]) => {
    const selected = selectedFriendUids.has(uid);
    return `
      <div class="friend-pick-item ${selected ? 'selected' : ''}"
           onclick="toggleFriendPick('${uid}')" data-uid="${uid}">
        <img class="friend-pick-avatar" src="${f.avatar || ''}"
             alt="" onerror="this.style.display='none'"/>
        <span class="friend-pick-name">${escapeHtml(f.name || 'Bạn bè')}</span>
        <span class="friend-pick-check">${selected ? '✓' : ''}</span>
      </div>
    `;
  }).join('');
}

function toggleFriendPick(uid) {
  if (selectedFriendUids.has(uid)) {
    selectedFriendUids.delete(uid);
  } else {
    selectedFriendUids.add(uid);
  }
  renderFriendPicker();
}

/* =============================================
   XỬ LÝ PHÍM ENTER TRONG GROUP CHAT INPUT
   ============================================= */
function handleGroupChatKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendGroupMessage();
  }
}

/* Khởi tạo keydown listener sau khi DOM ready */
document.addEventListener('DOMContentLoaded', () => {
  const gcInput = document.getElementById('group-chat-input');
  if (gcInput) gcInput.addEventListener('keydown', handleGroupChatKeydown);
});
