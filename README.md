# JJ Project

실시간 채팅, 사진 공유, 일정 관리 앱

## 기능
- 💬 실시간 채팅방 생성 및 대화
- 🖼️ 사진 업로드 / 미리보기 / 다운로드
- 📅 일정 공유 및 관리
- 🔐 구글 소셜 로그인

## 기술 스택
- Frontend: HTML, CSS, JavaScript
- Backend: Supabase (PostgreSQL + Realtime + Auth + Storage)
- 배포: Vercel

## 설정

### Supabase
1. `js/config.js`에서 SUPABASE_URL, SUPABASE_KEY 확인
2. Supabase Storage에서 `photos` 버킷 생성 (Public 설정)
3. Authentication > Providers > Google 활성화

### Vercel 배포
1. GitHub에 푸시
2. Vercel에서 GitHub 레포 연결
3. 자동 배포 완료

### Supabase Storage 버킷 설정
Supabase 대시보드 > Storage > New Bucket
- 이름: photos
- Public bucket: ON
