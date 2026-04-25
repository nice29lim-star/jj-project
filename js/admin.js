// =============================================
// 관리자 페이지 기능 (승인 처리)
// =============================================

let currentUser = null

async function initAdmin() {
  currentUser = await checkAuth()
  if (!currentUser) return

  // 관리자 권한 체크
  const { data: profile } = await supabaseClient
    .from('user_profiles')
    .select('status')
    .eq('id', currentUser.id)
    .single()

  if (!profile || profile.status !== 'admin') {
    alert('관리자 권한이 없습니다.')
    window.location.href = 'chat.html'
    return
  }

  await loadUserInfo()
  await loadUsers()
}

// 전체 유저 불러오기
async function loadUsers() {
  const { data: users, error } = await supabaseClient
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    showToast('유저 목록을 불러오는데 실패했습니다.', 'error')
    return
  }

  renderUsers(users)
}

// 유저 목록 렌더링
function renderUsers(users) {
  const tbody = document.getElementById('userList')
  tbody.innerHTML = ''

  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">가입된 회원이 없습니다.</td></tr>'
    return
  }

  users.forEach(user => {
    const tr = document.createElement('tr')
    
    let statusBadge = ''
    if (user.status === 'pending') statusBadge = '<span class="status-badge status-pending">승인 대기</span>'
    else if (user.status === 'approved') statusBadge = '<span class="status-badge status-approved">승인 완료</span>'
    else if (user.status === 'admin') statusBadge = '<span class="status-badge status-admin">관리자</span>'

    const date = formatDate(user.created_at).substring(0, 13) // 년월일까지만 표시

    tr.innerHTML = `
      <td>${user.name || '-'}</td>
      <td>${user.email || '-'}</td>
      <td>${date}</td>
      <td>${statusBadge}</td>
      <td>
        <select onchange="updateUserStatus('${user.id}', this.value)" style="padding:4px; border-radius:4px; border:1px solid #ddd;">
          <option value="pending" ${user.status === 'pending' ? 'selected' : ''}>대기중</option>
          <option value="approved" ${user.status === 'approved' ? 'selected' : ''}>승인</option>
          <option value="admin" ${user.status === 'admin' ? 'selected' : ''}>관리자</option>
        </select>
      </td>
    `
    tbody.appendChild(tr)
  })
}

// 유저 상태 변경
async function updateUserStatus(userId, newStatus) {
  if (!confirm(`해당 회원의 권한을 '${newStatus}'(으)로 변경하시겠습니까?`)) {
    loadUsers() // 롤백
    return
  }

  const { error } = await supabaseClient
    .from('user_profiles')
    .update({ status: newStatus })
    .eq('id', userId)

  if (error) {
    showToast('상태 변경에 실패했습니다.', 'error')
    loadUsers()
    return
  }

  showToast('상태가 변경되었습니다.')
  loadUsers()
}

// 실행
initAdmin()
