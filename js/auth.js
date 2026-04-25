// =============================================
// 구글 로그인 / 로그아웃
// =============================================

// 구글 로그인
async function signInWithGoogle() {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/chat.html'
    }
  })
  if (error) {
    console.error('로그인 오류:', error)
    showToast('로그인 중 오류가 발생했습니다.', 'error')
  }
}

// 이메일 로그인
async function signInWithEmail() {
  const email = document.getElementById('loginEmail')?.value
  const password = document.getElementById('loginPassword')?.value

  if (!email || !password) {
    showToast('이메일과 비밀번호를 입력해주세요.', 'error')
    return
  }

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    console.error('로그인 오류:', error)
    showToast('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.', 'error')
    return
  }

  window.location.href = 'chat.html'
}

// 이메일 회원가입
async function signUpWithEmail() {
  const name = document.getElementById('signupName')?.value
  const email = document.getElementById('signupEmail')?.value
  const password = document.getElementById('signupPassword')?.value

  if (!name || !email || !password) {
    showToast('모든 항목을 입력해주세요.', 'error')
    return
  }
  
  if (password.length < 6) {
    showToast('비밀번호는 6자 이상이어야 합니다.', 'error')
    return
  }

  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name
      }
    }
  })

  if (error) {
    console.error('회원가입 오류:', error)
    showToast('회원가입 중 오류가 발생했습니다: ' + error.message, 'error')
    return
  }

  showToast('회원가입이 완료되었습니다! 잠시 후 로그인 화면으로 이동합니다.')
  setTimeout(() => {
    window.location.href = 'index.html'
  }, 2000)
}

// 로그아웃
async function signOut() {
  const { error } = await supabaseClient.auth.signOut()
  if (error) {
    showToast('로그아웃 중 오류가 발생했습니다.', 'error')
    return
  }
  window.location.href = 'index.html'
}

// 네비게이션 유저 정보 표시 및 관리자 메뉴 렌더링
async function loadUserInfo() {
  const user = await getCurrentUser()
  if (!user) return

  const userName = document.getElementById('userName')
  const userAvatar = document.getElementById('userAvatar')

  if (userName) userName.textContent = user.user_metadata?.full_name || user.email.split('@')[0]
  if (userAvatar) userAvatar.src = user.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.email)

  // 관리자 권한 확인 후 네비게이션에 링크 추가
  const { data: profile } = await supabaseClient
    .from('user_profiles')
    .select('status')
    .eq('id', user.id)
    .single()

  if (profile && profile.status === 'admin') {
    const navLinks = document.querySelector('.nav-links')
    if (navLinks && !document.getElementById('adminNavBtn')) {
      const adminLink = document.createElement('a')
      adminLink.href = 'admin.html'
      adminLink.id = 'adminNavBtn'
      adminLink.textContent = '관리자'
      navLinks.appendChild(adminLink)
    }
  }
}
