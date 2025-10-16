// 🎉 VERSÃO 1.0.0 - MARCO DE PRODUÇÃO
const CACHE_NAME = 'eletrize-v1.0.0-' + Date.now();
const DISABLE_CACHE = true; // Flag para desabilitar cache completamente

console.log('🚫 SERVICE WORKER: Cache desabilitado para debug de problemas');

const ASSETS = []; // Array vazio - sem cache

// Detectar mobile para logs
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
console.log('📱 Service Worker - Mobile:', isMobile);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isHubitat = /cloud\.hubitat\.com$/i.test(url.hostname) || /\/apps\/api\//i.test(url.pathname);

  // Nunca interceptar/cachear chamadas ao Hubitat ou cross-origin
  if (!isSameOrigin || isHubitat) {
    return; // Deixa o browser lidar com CORS naturalmente
  }

  // CACHE COMPLETAMENTE DESABILITADO - SEMPRE BUSCAR DA REDE
  if (DISABLE_CACHE) {
    console.log('🚫 Cache desabilitado, buscando da rede:', req.url);
    event.respondWith(
      fetch(req, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    );
    return;
  }

  // Network-first para HTML, CSS, JS para sempre ter versão mais nova
  if (req.mode === 'navigate' || 
      (req.headers.get('accept') || '').includes('text/html') ||
      req.url.includes('.css') || 
      req.url.includes('.js')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first para assets estáticos do mesmo domínio
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => cached);
    })
  );
});
