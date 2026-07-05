const CACHE_NAME = 'juken-v2';
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

// リクエスト時：HTMLはネットワーク優先、静的資産はキャッシュ優先（API通信はネットワーク直行）
self.addEventListener('fetch', e => {
  // Claude APIへのリクエストはキャッシュしない
  if (e.request.url.includes('anthropic.com') ||
      e.request.url.includes('wikimedia.org') ||
      e.request.url.includes('fonts.googleapis.com') ||
      e.request.url.includes('fonts.gstatic.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }
  // HTML本体はネットワーク優先（常に最新版を取得。オフライン時のみキャッシュにフォールバック）
  if (e.request.mode === 'navigate' || e.request.url.endsWith('.html') || e.request.url.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // それ以外（アイコン等静的資産）はキャッシュ優先
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
