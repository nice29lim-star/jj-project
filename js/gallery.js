// =============================================
// 사진 업로드 / 갤러리 기능
// =============================================

let currentUser = null

// 초기화
async function initGallery() {
  currentUser = await checkAuth()
  if (!currentUser) return

  await loadUserInfo()
  await loadPhotos()
  setupDragAndDrop()
}

// 사진 목록 불러오기
async function loadPhotos() {
  const { data: photos, error } = await supabaseClient
    .from('photos')
    .select('*')
    .order('uploaded_at', { ascending: false })

  if (error) {
    showToast('사진을 불러오지 못했습니다.', 'error')
    return
  }

  renderPhotos(photos)
}

// 사진 렌더링
function renderPhotos(photos) {
  const grid = document.getElementById('galleryGrid')
  grid.innerHTML = ''

  if (photos.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:60px; color:#9ca3af;">
        <div style="font-size:3rem; margin-bottom:15px;">🖼️</div>
        <p>아직 업로드된 사진이 없습니다.</p>
      </div>
    `
    return
  }

  photos.forEach(photo => {
    const div = document.createElement('div')
    div.className = 'photo-card'
    div.innerHTML = `
      <img src="${photo.file_url}" alt="${photo.file_name}" onclick="previewImage('${photo.file_url}', '${photo.file_name}')">
      <div class="photo-info">
        <div style="font-weight:600; color:#374151; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${photo.file_name}</div>
        <div>${formatFileSize(photo.file_size || 0)} · ${formatDate(photo.uploaded_at)}</div>
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button class="btn btn-primary" style="padding:5px 10px; font-size:0.75rem;" onclick="downloadPhoto('${photo.file_url}', '${photo.file_name}')">⬇️ 다운로드</button>
          ${photo.user_id === currentUser.id ? `<button class="btn btn-danger" style="padding:5px 10px; font-size:0.75rem;" onclick="deletePhoto('${photo.id}')">🗑️ 삭제</button>` : ''}
        </div>
      </div>
    `
    grid.appendChild(div)
  })
}

// 파일 선택 시
function handleFileSelect(event) {
  const files = event.target.files
  uploadFiles(files)
}

// 드래그 앤 드롭 설정
function setupDragAndDrop() {
  const uploadArea = document.getElementById('uploadArea')

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault()
    uploadArea.style.background = '#EEF2FF'
    uploadArea.style.borderColor = '#4F46E5'
  })

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.background = '#f8f9ff'
    uploadArea.style.borderColor = '#4F46E5'
  })

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault()
    uploadArea.style.background = '#f8f9ff'
    const files = e.dataTransfer.files
    uploadFiles(files)
  })
}

// 파일 업로드 (Supabase Storage)
async function uploadFiles(files) {
  if (!files || files.length === 0) return

  const uploadArea = document.getElementById('uploadArea')
  uploadArea.innerHTML = '<p style="color:#4F46E5;">⏳ 업로드 중...</p>'

  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      showToast(`${file.name}은 이미지 파일이 아닙니다.`, 'error')
      continue
    }

    const fileName = `${currentUser.id}/${Date.now()}_${file.name}`

    // Supabase Storage에 업로드
    const { data, error: uploadError } = await supabaseClient.storage
      .from('photos')
      .upload(fileName, file)

    if (uploadError) {
      showToast(`${file.name} 업로드 실패`, 'error')
      continue
    }

    // 공개 URL 가져오기
    const { data: { publicUrl } } = supabaseClient.storage
      .from('photos')
      .getPublicUrl(fileName)

    // DB에 저장
    const { error: dbError } = await supabaseClient
      .from('photos')
      .insert({
        user_id: currentUser.id,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size
      })

    if (dbError) {
      showToast(`${file.name} DB 저장 실패`, 'error')
      continue
    }

    showToast(`${file.name} 업로드 완료! 🎉`)
  }

  // 업로드 영역 복원
  uploadArea.innerHTML = `
    <div style="font-size:2.5rem;">📸</div>
    <p><strong>클릭하거나 사진을 드래그하세요</strong></p>
    <p>JPG, PNG, GIF 지원</p>
  `

  await loadPhotos()
}

// 이미지 미리보기
function previewImage(url, name) {
  const modal = document.getElementById('imagePreviewModal')
  const img = document.getElementById('previewImg')
  const title = document.getElementById('previewTitle')
  const downloadBtn = document.getElementById('previewDownload')

  img.src = url
  title.textContent = name
  downloadBtn.onclick = () => downloadPhoto(url, name)
  modal.classList.add('active')
}

// 미리보기 닫기
function closePreview() {
  document.getElementById('imagePreviewModal').classList.remove('active')
}

// 다운로드
function downloadPhoto(url, name) {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.target = '_blank'
  a.click()
  showToast('다운로드 시작! ⬇️')
}

// 사진 삭제
async function deletePhoto(photoId) {
  if (!confirm('사진을 삭제하시겠습니까?')) return

  const { error } = await supabaseClient
    .from('photos')
    .delete()
    .eq('id', photoId)
    .eq('user_id', currentUser.id)

  if (error) {
    showToast('삭제에 실패했습니다.', 'error')
    return
  }

  showToast('사진이 삭제되었습니다.')
  await loadPhotos()
}

// 실행
initGallery()
