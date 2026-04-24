// =============================================
// 일정 공유 기능
// =============================================

let currentUser = null

// 초기화
async function initSchedule() {
  currentUser = await checkAuth()
  if (!currentUser) return

  await loadUserInfo()
  await loadSchedules()
}

// 일정 목록 불러오기
async function loadSchedules() {
  const { data: schedules, error } = await supabaseClient
    .from('schedules')
    .select('*')
    .order('start_date', { ascending: true })

  if (error) {
    showToast('일정을 불러오지 못했습니다.', 'error')
    return
  }

  renderSchedules(schedules)
}

// 일정 렌더링
function renderSchedules(schedules) {
  const list = document.getElementById('scheduleList')
  list.innerHTML = ''

  // 지난 일정 / 예정 일정 분류
  const now = new Date()
  const upcoming = schedules.filter(s => new Date(s.start_date) >= now)
  const past = schedules.filter(s => new Date(s.start_date) < now)

  if (schedules.length === 0) {
    list.innerHTML = `
      <div style="text-align:center; padding:60px; color:#9ca3af;">
        <div style="font-size:3rem; margin-bottom:15px;">📅</div>
        <p>등록된 일정이 없습니다.</p>
      </div>
    `
    return
  }

  if (upcoming.length > 0) {
    list.innerHTML += `<div style="font-weight:700; color:#4F46E5; margin-bottom:12px; font-size:1rem;">📌 예정된 일정</div>`
    upcoming.forEach(schedule => {
      list.appendChild(createScheduleElement(schedule))
    })
  }

  if (past.length > 0) {
    list.innerHTML += `<div style="font-weight:700; color:#9ca3af; margin:20px 0 12px; font-size:1rem;">✅ 지난 일정</div>`
    past.forEach(schedule => {
      list.appendChild(createScheduleElement(schedule, true))
    })
  }
}

// 일정 요소 생성
function createScheduleElement(schedule, isPast = false) {
  const div = document.createElement('div')
  div.className = 'schedule-item'
  div.style.borderLeftColor = schedule.color || '#4F46E5'
  if (isPast) div.style.opacity = '0.6'

  const startDate = formatDate(schedule.start_date)
  const endDate = schedule.end_date ? ` ~ ${formatDate(schedule.end_date)}` : ''
  const isOwner = schedule.user_id === currentUser.id

  div.innerHTML = `
    <div>
      <div class="schedule-title">${schedule.title}</div>
      <div class="schedule-date">🗓️ ${startDate}${endDate}</div>
      ${schedule.description ? `<div style="font-size:0.85rem; color:#6b7280; margin-top:5px;">${schedule.description}</div>` : ''}
    </div>
    <div style="display:flex; gap:8px; flex-shrink:0;">
      ${isOwner ? `
        <button class="btn btn-secondary" style="padding:6px 12px; font-size:0.8rem;" onclick="openEditModal('${schedule.id}', '${escapeAttr(schedule.title)}', '${escapeAttr(schedule.description || '')}', '${schedule.start_date}', '${schedule.end_date || ''}', '${schedule.color}')">✏️</button>
        <button class="btn btn-danger" style="padding:6px 12px; font-size:0.8rem;" onclick="deleteSchedule('${schedule.id}')">🗑️</button>
      ` : ''}
    </div>
  `
  return div
}

// 일정 추가
async function addSchedule() {
  const title = document.getElementById('scheduleTitle').value.trim()
  const description = document.getElementById('scheduleDescription').value.trim()
  const startDate = document.getElementById('startDate').value
  const endDate = document.getElementById('endDate').value
  const color = document.getElementById('scheduleColor').value

  if (!title) {
    showToast('일정 제목을 입력해주세요.', 'error')
    return
  }
  if (!startDate) {
    showToast('시작 날짜를 선택해주세요.', 'error')
    return
  }

  const { error } = await supabaseClient
    .from('schedules')
    .insert({
      user_id: currentUser.id,
      title,
      description,
      start_date: startDate,
      end_date: endDate || null,
      color
    })

  if (error) {
    showToast('일정 추가에 실패했습니다.', 'error')
    return
  }

  closeModal('addScheduleModal')
  clearScheduleForm()
  showToast('일정이 추가되었습니다! 🎉')
  await loadSchedules()
}

// 일정 수정 모달 열기
function openEditModal(id, title, description, startDate, endDate, color) {
  document.getElementById('editScheduleId').value = id
  document.getElementById('editScheduleTitle').value = title
  document.getElementById('editScheduleDescription').value = description
  document.getElementById('editStartDate').value = startDate ? startDate.slice(0, 16) : ''
  document.getElementById('editEndDate').value = endDate ? endDate.slice(0, 16) : ''
  document.getElementById('editScheduleColor').value = color || '#4F46E5'
  openModal('editScheduleModal')
}

// 일정 수정
async function updateSchedule() {
  const id = document.getElementById('editScheduleId').value
  const title = document.getElementById('editScheduleTitle').value.trim()
  const description = document.getElementById('editScheduleDescription').value.trim()
  const startDate = document.getElementById('editStartDate').value
  const endDate = document.getElementById('editEndDate').value
  const color = document.getElementById('editScheduleColor').value

  if (!title || !startDate) {
    showToast('제목과 시작 날짜는 필수입니다.', 'error')
    return
  }

  const { error } = await supabaseClient
    .from('schedules')
    .update({ title, description, start_date: startDate, end_date: endDate || null, color })
    .eq('id', id)
    .eq('user_id', currentUser.id)

  if (error) {
    showToast('일정 수정에 실패했습니다.', 'error')
    return
  }

  closeModal('editScheduleModal')
  showToast('일정이 수정되었습니다! ✅')
  await loadSchedules()
}

// 일정 삭제
async function deleteSchedule(id) {
  if (!confirm('일정을 삭제하시겠습니까?')) return

  const { error } = await supabaseClient
    .from('schedules')
    .delete()
    .eq('id', id)
    .eq('user_id', currentUser.id)

  if (error) {
    showToast('삭제에 실패했습니다.', 'error')
    return
  }

  showToast('일정이 삭제되었습니다.')
  await loadSchedules()
}

// 폼 초기화
function clearScheduleForm() {
  document.getElementById('scheduleTitle').value = ''
  document.getElementById('scheduleDescription').value = ''
  document.getElementById('startDate').value = ''
  document.getElementById('endDate').value = ''
  document.getElementById('scheduleColor').value = '#4F46E5'
}

// HTML 속성 이스케이프
function escapeAttr(str) {
  return str.replace(/'/g, "&#39;").replace(/"/g, '&quot;')
}

// 모달 열기/닫기
function openModal(id) {
  document.getElementById(id).classList.add('active')
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active')
}

// 실행
initSchedule()
