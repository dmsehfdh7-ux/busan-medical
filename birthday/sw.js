const CACHE = 'chaechae-bday-v3';
const PHOTOS = ['./photos/sq.js', ...Array.from({ length: 11 }, (_, i) => `./photos/p${String(i + 1).padStart(2, '0')}.js`)];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html', './manifest.json', ...PHOTOS])).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  const isPhoto = e.request.url.includes('/photos/');
  const fromNet = () => fetch(e.request).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return res; });
  // 사진은 캐시 우선(무거움), 나머지(화면·코드)는 항상 새 버전 우선, 오프라인일 때만 캐시
  e.respondWith(isPhoto
    ? caches.match(e.request).then(r => r || fromNet())
    : fromNet().catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
