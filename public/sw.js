const CACHE = 'dju-life-v1';

// 앱 셸(shell) — 설치 시 미리 캐시
const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL))
  );
  self.skipWaiting();
});

// ── Activate: 이전 캐시 삭제 ─────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: Stale-While-Revalidate ────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = request.url;

  // 외부 API(Firestore, Kakao Maps, OpenRouter)는 캐시하지 않음
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('googleapis.com') ||
    url.includes('dapi.kakao.com') ||
    url.includes('openrouter.ai')
  ) return;

  e.respondWith(
    caches.match(request).then(cached => {
      // 백그라운드에서 네트워크 갱신
      const networkFetch = fetch(request)
        .then(response => {
          if (response.ok) {
            caches.open(CACHE).then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        // 캐시 있으면 즉시 반환 + 백그라운드 갱신
        networkFetch.catch(() => {});
        return cached;
      }

      // 캐시 없으면 네트워크, 실패 시 index.html 반환(오프라인 fallback)
      return networkFetch.then(r => r || caches.match('/index.html'));
    })
  );
});
