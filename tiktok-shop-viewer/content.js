// ============================================================
// TikTok Shop Viewer — content script
// Mục đích: video TikTok Shop bị chặn xem trên web ("Xem trong
// ứng dụng TikTok"). Script này lấy link CDN trực tiếp của video
// qua tikwm.com (API ẩn dạng snaptik) và phát ngay trong modal,
// không cần tải file về máy.
// ============================================================

const TIKWM_ENDPOINT = 'https://tikwm.com/api/?url=';

function getVideoIdFromPath() {
  const match = location.pathname.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
}

function buildCanonicalVideoUrl() {
  // tikwm chấp nhận URL TikTok đầy đủ, dùng nguyên URL hiện tại là ổn nhất
  // (giữ đúng username + video id, tránh lỗi format)
  return location.href.split('?')[0];
}

// ---------- Nút nổi ----------
function ensureButton() {
  const existing = document.getElementById('ttsv-btn');
  const videoId = getVideoIdFromPath();

  if (!videoId) {
    if (existing) existing.remove();
    return;
  }
  if (existing) return; // đã có rồi

  const btn = document.createElement('div');
  btn.id = 'ttsv-btn';
  btn.textContent = '▶ Xem video (bypass block)';
  Object.assign(btn.style, {
    position: 'fixed',
    top: '80px',
    right: '20px',
    background: '#FE2C55',
    color: 'white',
    padding: '12px 22px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    zIndex: '2147483647',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    fontFamily: 'Arial, sans-serif',
    userSelect: 'none',
    transition: 'background 0.15s ease',
  });

  btn.addEventListener('mouseenter', () => (btn.style.background = '#cc1f3f'));
  btn.addEventListener('mouseleave', () => (btn.style.background = '#FE2C55'));
  btn.addEventListener('click', () => openViewer(buildCanonicalVideoUrl()));

  document.body.appendChild(btn);
}

// ---------- Modal viewer ----------
function openViewer(tiktokUrl) {
  closeViewer(); // đảm bảo không có modal cũ còn sót

  const overlay = document.createElement('div');
  overlay.id = 'ttsv-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    background: 'rgba(0,0,0,0.85)',
    zIndex: '2147483647',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Arial, sans-serif',
  });

  const box = document.createElement('div');
  Object.assign(box.style, {
    position: 'relative',
    width: 'min(420px, 90vw)',
    maxHeight: '90vh',
    background: '#111',
    borderRadius: '12px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  });

  const closeBtn = document.createElement('div');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    position: 'absolute',
    top: '8px',
    right: '12px',
    color: '#fff',
    fontSize: '22px',
    cursor: 'pointer',
    zIndex: '10',
    textShadow: '0 1px 4px rgba(0,0,0,0.8)',
  });
  closeBtn.addEventListener('click', closeViewer);

  const status = document.createElement('div');
  status.id = 'ttsv-status';
  status.textContent = 'Đang lấy link video…';
  Object.assign(status.style, {
    color: '#fff',
    padding: '40px 20px',
    textAlign: 'center',
    fontSize: '14px',
  });

  box.appendChild(closeBtn);
  box.appendChild(status);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeViewer();
  });

  fetchDirectLink(tiktokUrl)
    .then((result) => renderVideo(box, status, result))
    .catch((err) => renderError(status, err));
}

function closeViewer() {
  const overlay = document.getElementById('ttsv-overlay');
  if (overlay) overlay.remove();
}

// ---------- Gọi tikwm API ----------
async function fetchDirectLink(tiktokUrl) {
  const endpoint = TIKWM_ENDPOINT + encodeURIComponent(tiktokUrl);
  const res = await fetch(endpoint, { method: 'GET' });

  if (!res.ok) {
    throw new Error(`tikwm trả lỗi HTTP ${res.status}`);
  }

  const json = await res.json();

  if (json.code !== 0 || !json.data || !json.data.play) {
    throw new Error(json.msg || 'tikwm không trả về link video hợp lệ');
  }

  return {
    playUrl: json.data.play,       // không watermark
    wmPlayUrl: json.data.wmplay,   // có watermark (fallback)
    title: json.data.title || '',
    author: json.data.author ? json.data.author.nickname : '',
    isShopVideo: !!(json.data.anchors_extras &&
      json.data.anchors_extras.indexOf('is_ec_video') !== -1),
  };
}

// ---------- Render kết quả ----------
function renderVideo(box, statusEl, result) {
  statusEl.remove();

  const video = document.createElement('video');
  video.src = result.playUrl;
  video.controls = true;
  video.autoplay = true;
  video.loop = true;
  video.playsInline = true;
  Object.assign(video.style, {
    width: '100%',
    maxHeight: '75vh',
    display: 'block',
    background: '#000',
  });

  // Fallback: nếu link không-watermark lỗi (hết hạn/sai), thử bản có watermark
  video.addEventListener('error', () => {
    if (result.wmPlayUrl && video.src !== result.wmPlayUrl) {
      video.src = result.wmPlayUrl;
    }
  });

  const info = document.createElement('div');
  Object.assign(info.style, {
    color: '#ccc',
    fontSize: '13px',
    padding: '10px 16px',
    background: '#1a1a1a',
  });
  const shopTag = result.isShopVideo
    ? ' · <span style="color:#FE2C55;font-weight:bold;">TikTok Shop</span>'
    : '';
  info.innerHTML = `<strong>${escapeHtml(result.author)}</strong>${shopTag}<br>${escapeHtml(result.title)}`;

  box.appendChild(video);
  box.appendChild(info);
}

function renderError(statusEl, err) {
  statusEl.textContent = `Không lấy được video: ${err.message}`;
  statusEl.style.color = '#ff6b6b';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ---------- Khởi chạy + theo dõi SPA navigation ----------
ensureButton();

let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    ensureButton();
  }
}).observe(document.body, { childList: true, subtree: true });
