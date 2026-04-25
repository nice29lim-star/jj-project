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

    if (insertError) {
      alert('프로필 생성 에러: ' + insertError.message)
    }

    if (!insertError) profile = newProfile
  } else if (error && error.code !== 'PGRST116') {
    alert('프로필 조회 에러: ' + error.message)
  }

  // 권한이 대기중인 경우
  if (!profile || profile.status === 'pending') {
    if (window.location.pathname.indexOf('pending.html') === -1) {
      window.location.href = 'pending.html'
    }
    return user // 접속 차단을 위해 pending.html로 보냈지만 user 객체 자체는 반환
  }

  // 승인된 유저라면 뱃지 알림 시스템 초기화
  initUnreadBadge(user.id);

  return user
}

// =============================================
// 채팅 읽지 않은 알림(숫자 배지) 시스템
// =============================================
async function initUnreadBadge(userId) {
  // 네비게이션 바에 뱃지 요소 주입
  const navLinks = document.querySelectorAll('.nav-links a');
  navLinks.forEach(link => {
    if (link.href.includes('chat.html') || link.textContent.includes('채팅')) {
      if (!document.getElementById('globalChatBadge')) {
        const badge = document.createElement('span');
        badge.id = 'globalChatBadge';
        badge.style.cssText = 'background: #ef4444; color: white; border-radius: 50%; padding: 2px 6px; font-size: 0.7rem; margin-left: 5px; display: none; font-weight: bold;';
        link.appendChild(badge);
      }
    }
  });

  // 채팅 페이지에 있다면 바로 시간 갱신
  if (window.location.pathname.includes('chat.html')) {
    localStorage.setItem('lastChatVisit', new Date().toISOString());
    localStorage.setItem('unreadChatCount', '0');
  } else {
    // 채팅 페이지가 아니라면 마지막 접속 이후의 안 읽은 메시지 개수 조회
    const lastVisit = localStorage.getItem('lastChatVisit') || new Date(Date.now() - 3*24*60*60*1000).toISOString(); // 기본 3일 전
    const { count } = await supabaseClient
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', lastVisit)
      .neq('user_id', userId);
      
    if (count !== null) {
      localStorage.setItem('unreadChatCount', count);
    }
  }
  
  updateBadgeDisplay();

  // 실시간 새 메시지 감지
  supabaseClient.channel('global-notifications')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      if (payload.new.user_id === userId) return; // 내 메시지 무시
      
      if (window.location.pathname.includes('chat.html')) {
        // 채팅방에 있을 때는 안 읽은 개수를 올리지 않고 시간만 갱신
        localStorage.setItem('lastChatVisit', new Date().toISOString());
      } else {
        // 다른 페이지에 있을 때
        let count = parseInt(localStorage.getItem('unreadChatCount') || '0');
        localStorage.setItem('unreadChatCount', count + 1);
        updateBadgeDisplay();
        
        // 브라우저 탭 제목 깜빡임 효과나 작은 토스트
        if (typeof showToast === 'function') {
          showToast('💬 새 채팅 메시지가 도착했습니다!');
        }
      }
    }).subscribe();
}

function updateBadgeDisplay() {
  const badge = document.getElementById('globalChatBadge');
  if (!badge) return;
  const count = parseInt(localStorage.getItem('unreadChatCount') || '0');
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
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
