const CACHE_NAME = 'juken-v1';
const SHELL = ['/', '/index.html', '/manifest.json', '/icon.svg'];

// インストール時：アプリの骨格をキャッシュ
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(SHELL))
  );
  self.skipWaiting();
});

// 古いキャッシュを削除
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// リクエスト時：キャッシュ優先（API通信はネットワーク直行）
self.addEventListener('fetch', e => {
  // Claude APIへのリクエストはキャッシュしない
  if (e.request.url.includes('anthropic.com') ||
      e.request.url.includes('wikimedia.org') ||
      e.request.url.includes('fonts.googleapis.com') ||
      e.request.url.includes('fonts.gstatic.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }
  // それ以外はキャッシュ → ネット
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
