// =============================================
// Supabase 설정
// =============================================
const SUPABASE_URL = 'https://xprywdjdglzfholzphea.supabase.co'
const SUPABASE_KEY = 'sb_publishable_umyz19_alo8pvYfaaflr7g_7TqlVazW'

// Supabase 클라이언트 초기화
const { createClient } = supabase
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY)

// =============================================
// 공통 유틸리티 함수
// =============================================

// 현재 로그인한 유저 가져오기
async function getCurrentUser() {
  const { data: { user } } = await supabaseClient.auth.getUser()
  return user
}

// 로그인 상태 확인 및 승인 권한 체크 후 리디렉션
async function checkAuth() {
  const user = await getCurrentUser()
  if (!user) {
    window.location.href = 'index.html'
    return null
  }

  // user_profiles 테이블에서 내 프로필 조회
  let { data: profile, error } = await supabaseClient
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // 프로필이 없다면 (최초 로그인)
  if (!profile && error?.code === 'PGRST116') {
    const { data: newProfile, error: insertError } = await supabaseClient
      .from('user_profiles')
      .insert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email.split('@')[0],
        status: 'pending'
      })
      .select()
      .single()

    if (!insertError) profile = newProfile
  }

  // 권한이 대기중인 경우
  if (!profile || profile.status === 'pending') {
    if (window.location.pathname.indexOf('pending.html') === -1) {
      window.location.href = 'pending.html'
    }
    return user // 접속 차단을 위해 pending.html로 보냈지만 user 객체 자체는 반환
  }

  return user
}

// 날짜 포맷
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 토스트 메시지
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast')
  if (!toast) return
  toast.textContent = message
  toast.className = `toast show ${type}`
  setTimeout(() => {
    toast.className = 'toast'
  }, 3000)
}

// 파일 크기 포맷
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
