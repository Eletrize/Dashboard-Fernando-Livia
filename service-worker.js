const CACHE_VERSION = 'v1.0.3';
const CACHE_NAME = `eletrize-${CACHE_VERSION}`;
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/styles.css?v=1.0.3',
  '/script.js?v=1.0.3',
  '/scenes.js?v=1.0.3',
  '/fonts-raleway.css',
  '/images/pwa/app-icon-192.png',
  '/images/pwa/app-icon-512-transparent.png',
  '/images/Images/photo-varanda.jpg',
  '/images/Images/photo-living.jpg',
  '/images/Images/photo-piscina.jpg',
  '/images/Images/photo-externo.jpg',
  '/images/Images/photo-servico.jpg',
  '/images/Images/photo-circulacao.jpg',
  '/images/Images/photo-suitei.jpg',
  '/images/Images/photo-suiteii.jpg',
  '/images/Images/photo-suitemaster.jpg',
  '/images/icons/ar-condicionado.svg',
  '/images/icons/icon-conforto.svg',
  '/images/icons/icon-curtain.svg',
  '/images/icons/icon-firetv.svg',
  '/images/icons/icon-htv.svg',
  '/images/icons/icon-musica.svg',
  '/images/icons/icon-piscina.svg',
  '/images/icons/icon-telao-led.svg',
  '/images/icons/icon-tv.svg',
  '/images/icons/icon-small-light-off.svg',
  '/images/icons/icon-small-light-on.svg',
  '/images/icons/icon-small-smartglass-off.svg',
  '/images/icons/icon-small-smartglass-on.svg',
  '/images/icons/icon-small-shader-off.svg',
  '/images/icons/icon-small-shader-on.svg',
  '/images/icons/icon-small-tv-off.svg',
  '/images/icons/icon-small-tv-on.svg',
  '/images/icons/icon-small-telamovel-off.svg',
  '/images/icons/icon-small-telamovel-on.svg',
  '/images/icons/icon-ac-power.svg',
  '/images/icons/icon-ac-fan.svg',
  '/images/icons/icon-ac-cool.svg',
  '/images/icons/icon-ac-heat.svg',
  '/images/icons/icon-ac-auto.svg',
  '/images/icons/icon-ac-aleta-moving.svg',
  '/images/icons/icon-ac-aleta-parada.svg',
  '/images/icons/icon-ac-aleta-alta.svg',
  '/images/icons/icon-ac-aleta-baixa.svg',
  '/images/icons/icon-settings.svg',
  '/images/icons/icon-home.svg',
  '/images/icons/icon-rotatephone.svg',
  '/images/icons/icon-limpar.svg',
  '/images/icons/icon-mouse.svg',
  '/images/icons/Eletrize.svg',
  '/images/icons/Fullscreen.svg',
  '/images/icons/Instagram.svg',
  '/images/icons/whatsapp.svg',
  '/images/icons/icon-volume.svg',
  '/images/icons/icon-mute.svg',
  '/images/icons/icon-next-track.svg',
  '/images/icons/icon-previous-track.svg',
  '/images/icons/icon-play.svg',
  '/images/icons/icon-pause.svg',
  '/images/icons/icon-stop.svg',
  '/images/icons/Encerrar-expediente.svg',
  '/images/icons/iniciar-expediente.svg',
  '/images/icons/icon-scenes.svg',
  '/images/icons/pageselector.svg'
];
const DEBUG_SW = false;

function log(...args) {
  if (DEBUG_SW) {
    console.log('[SW]', ...args);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((error) => log('precache error', error))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isHubitat =
    /cloud\.hubitat\.com$/i.test(url.hostname) || /\/apps\/api\//i.test(url.pathname);

  if (!isSameOrigin || isHubitat) {
    return;
  }

  const isHTMLRequest =
    request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');

  if (isHTMLRequest) {
    event.respondWith(htmlNetworkFirst(request));
    return;
  }

  if (url.pathname.endsWith('.css') || url.pathname.endsWith('.js')) {
    event.respondWith(staleWhileRevalidate(event, request));
    return;
  }

  if (url.pathname.startsWith('/images/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(event, request));
});

function htmlNetworkFirst(request) {
  return fetch(request)
    .then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    })
    .catch((error) => {
      log('html fetch failed', request.url, error);
      return caches.match(request);
    });
}

function staleWhileRevalidate(event, request) {
  return caches.match(request).then((cached) => {
    const fetchPromise = fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch((error) => {
        log('network error', request.url, error);
        if (cached) {
          return cached;
        }
        throw error;
      });

    if (cached) {
      event.waitUntil(fetchPromise.catch(() => null));
      return cached;
    }

    return fetchPromise;
  });
}

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) {
      return cached;
    }

    return fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch((error) => {
        log('cacheFirst network error', request.url, error);
        throw error;
      });
  });
}
