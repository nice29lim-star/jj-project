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

// 로그아웃
async function signOut() {
  const { error } = await supabaseClient.auth.signOut()
  if (error) {
    showToast('로그아웃 중 오류가 발생했습니다.', 'error')
    return
  }
  window.location.href = 'index.html'
}

// 네비게이션 유저 정보 표시
async function loadUserInfo() {
  const user = await getCurrentUser()
  if (!user) return

  const userName = document.getElementById('userName')
  const userAvatar = document.getElementById('userAvatar')

  if (userName) userName.textContent = user.user_metadata?.full_name || user.email
  if (userAvatar) userAvatar.src = user.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.email)
}
