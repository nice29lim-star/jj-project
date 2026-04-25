// =============================================
// 실시간 채팅 기능
// =============================================

let currentRoomId = null
let currentUser = null
let realtimeSubscription = null
let userCache = {} // 사용자 이름 캐시

// 초기화
async function initChat() {
  currentUser = await checkAuth()
  if (!currentUser) return

  await loadUserInfo()
  await loadRooms()
}

// 채팅방 목록 불러오기
async function loadRooms() {
  const { data: rooms, error } = await supabaseClient
    .from('chat_rooms')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    showToast('채팅방 목록을 불러오지 못했습니다.', 'error')
    return
  }

  renderRooms(rooms)
}

// 채팅방 목록 렌더링
function renderRooms(rooms) {
  const roomList = document.getElementById('roomList')
  roomList.innerHTML = ''

  if (rooms.length === 0) {
    roomList.innerHTML = '<p style="color:#9ca3af; text-align:center; padding:20px; font-size:0.85rem;">채팅방이 없습니다.<br>새 채팅방을 만들어보세요!</p>'
    return
  }

  rooms.forEach(room => {
    const div = document.createElement('div')
    div.className = `room-item ${room.id === currentRoomId ? 'active' : ''}`
    div.innerHTML = `
      <div style="font-weight:600;">💬 ${room.name}</div>
      ${room.description ? `<div style="font-size:0.75rem; color:#9ca3af; margin-top:3px;">${room.description}</div>` : ''}
    `
    div.onclick = () => enterRoom(room)
    roomList.appendChild(div)
  })
}

// 채팅방 입장
async function enterRoom(room) {
  currentRoomId = room.id

  // 채팅방 제목 업데이트
  document.getElementById('currentRoomName').textContent = room.name
  document.getElementById('chatInputArea').style.display = 'flex'
  document.getElementById('onlineUsersContainer').style.display = 'flex'

  // 활성 채팅방 표시
  document.querySelectorAll('.room-item').forEach(el => el.classList.remove('active'))
  event.currentTarget.classList.add('active')

  // 프로필 정보가 없으면 가져오기
  let profile = await supabaseClient.from('user_profiles').select('name').eq('id', currentUser.id).single()
  if (profile.data) userCache[currentUser.id] = profile.data.name

  // 메시지 불러오기
  await loadMessages(room.id)

  // 실시간 구독 (기존 구독 해제 후 재구독)
  if (realtimeSubscription) {
    supabaseClient.removeChannel(realtimeSubscription)
  }

  realtimeSubscription = supabaseClient
    .channel(`room-${room.id}`, {
      config: {
        presence: { key: currentUser.id }
      }
    })
    
  // 접속자 정보 동기화 처리
  realtimeSubscription.on('presence', { event: 'sync' }, () => {
    const newState = realtimeSubscription.presenceState()
    const onlineNames = []
    for (const id in newState) {
      if (newState[id][0] && newState[id][0].name) {
        onlineNames.push(newState[id][0].name)
      }
    }
    document.getElementById('onlineUsersList').textContent = onlineNames.join(', ') || '나'
  })

  // 메시지 실시간 수신 처리
  realtimeSubscription.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `room_id=eq.${room.id}`
    }, async (payload) => {
      // 새로운 사용자가 보낸 메시지라면 이름 정보 가져오기
      if (!userCache[payload.new.user_id]) {
        const { data } = await supabaseClient.from('user_profiles').select('name').eq('id', payload.new.user_id).single()
        if (data) userCache[payload.new.user_id] = data.name
      }
      appendMessage(payload.new)
    })
    
  // 구독 시작
  realtimeSubscription.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await realtimeSubscription.track({
        name: userCache[currentUser.id] || currentUser.email.split('@')[0],
        online_at: new Date().toISOString()
      })
    }
  })
}

// 메시지 불러오기
async function loadMessages(roomId) {
  const { data: messages, error } = await supabaseClient
    .from('messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })

  if (error) {
    showToast('메시지를 불러오지 못했습니다.', 'error')
    return
  }

  // 사용자 정보 한 번에 캐싱하기
  const userIds = [...new Set(messages.map(m => m.user_id))]
  const missingIds = userIds.filter(id => !userCache[id])
  
  if (missingIds.length > 0) {
    const { data: profiles } = await supabaseClient
      .from('user_profiles')
      .select('id, name')
      .in('id', missingIds)
      
    if (profiles) {
      profiles.forEach(p => userCache[p.id] = p.name)
    }
  }

  const chatMessages = document.getElementById('chatMessages')
  chatMessages.innerHTML = ''
  messages.forEach(msg => appendMessage(msg))
  scrollToBottom()
}

// 메시지 추가
function appendMessage(msg) {
  const chatMessages = document.getElementById('chatMessages')
  const isMe = msg.user_id === currentUser.id
  const userName = isMe ? '나' : (userCache[msg.user_id] || '멤버')

  const div = document.createElement('div')
  div.className = `message ${isMe ? 'mine' : ''}`
  div.innerHTML = `
    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(userName.slice(0, 2))}&background=4F46E5&color=fff" alt="avatar">
    <div class="message-content">
      <div class="message-name">${escapeHtml(userName)}</div>
      <div class="message-bubble">${escapeHtml(msg.content)}</div>
      <div style="font-size:0.7rem; color:#9ca3af; margin-top:3px; ${isMe ? 'text-align:right;' : ''}">${formatDate(msg.created_at)}</div>
    </div>
  `
  chatMessages.appendChild(div)
  scrollToBottom()
}

// 메시지 전송
async function sendMessage() {
  const input = document.getElementById('messageInput')
  const content = input.value.trim()

  if (!content || !currentRoomId) return

  input.value = ''

  const { error } = await supabaseClient
    .from('messages')
    .insert({
      room_id: currentRoomId,
      user_id: currentUser.id,
      content: content
    })

  if (error) {
    showToast('메시지 전송에 실패했습니다.', 'error')
    input.value = content
  }
}

// 채팅방 만들기
async function createRoom() {
  const name = document.getElementById('roomName').value.trim()
  const description = document.getElementById('roomDescription').value.trim()

  if (!name) {
    showToast('채팅방 이름을 입력해주세요.', 'error')
    return
  }

  const { error } = await supabaseClient
    .from('chat_rooms')
    .insert({
      name: name,
      description: description,
      created_by: currentUser.id
    })

  if (error) {
    showToast('채팅방 생성에 실패했습니다.', 'error')
    return
  }

  closeModal('createRoomModal')
  document.getElementById('roomName').value = ''
  document.getElementById('roomDescription').value = ''
  showToast('채팅방이 생성되었습니다! 🎉')
  await loadRooms()
}

// 스크롤 맨 아래로
function scrollToBottom() {
  const chatMessages = document.getElementById('chatMessages')
  chatMessages.scrollTop = chatMessages.scrollHeight
}

// XSS 방지
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// 엔터키로 메시지 전송
function handleKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

// 모달 열기/닫기
function openModal(id) {
  document.getElementById(id).classList.add('active')
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active')
}

// 실행
initChat()
