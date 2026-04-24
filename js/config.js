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

// 로그인 상태 확인 후 리디렉션
async function checkAuth() {
  const user = await getCurrentUser()
  if (!user) {
    window.location.href = 'index.html'
    return null
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
