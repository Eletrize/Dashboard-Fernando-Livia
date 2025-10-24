// 🎉 VERSÃO 1.0.0 - MARCO DE PRODUÇÃO
const CACHE_NAME = "eletrize-v1.0.0-" + Date.now();
const DISABLE_CACHE = false; // ✅ CACHE INTELIGENTE ATIVADO

// Estratégias de cache inteligentes
const CACHE_STRATEGIES = {
  // Assets críticos: sempre cache primeiro, depois rede
  CRITICAL: "cache-first",
  // Assets dinâmicos: rede primeiro, depois cache
  DYNAMIC: "network-first",
  // Dados voláteis: sempre rede, nunca cache
  VOLATILE: "network-only",
};

// Configuração inteligente de cache
const CACHE_CONFIG = {
  // Assets críticos - carregados primeiro
  critical: [
    "/styles.css",
    "/script.js",
    "/manifest.json",
    "/images/pwa/app-icon-512-transparent.png",
    "/images/icons/icon-rotatephone.svg",
    "/images/icons/icon-small-light-on.svg",
    "/images/icons/icon-small-light-off.svg",
    "/images/icons/icon-small-tv-on.svg",
    "/images/icons/icon-small-tv-off.svg",
    "/images/icons/icon-small-shader-on.svg",
    "/images/icons/icon-small-shader-off.svg",
    "/images/icons/icon-small-telamovel-on.svg",
    "/images/icons/icon-small-telamovel-off.svg",
    "/images/icons/icon-small-smartglass-on.svg",
    "/images/icons/icon-small-smartglass-off.svg",
    "/images/Images/photo-varanda.jpg",
    "/images/Images/photo-living.jpg",
    "/images/Images/photo-piscina.jpg",
    "/images/Images/photo-externo.jpg",
    "/images/Images/photo-servico.jpg",
    "/images/Images/photo-circulacao.jpg",
    "/images/Images/photo-suitei.jpg",
    "/images/Images/photo-suiteii.jpg",
    "/images/Images/photo-suitemaster.jpg",
  ],

  // Assets dinâmicos - atualizados quando possível
  dynamic: ["/index.html"],

  // Dados voláteis - nunca cachear
  volatile: ["/polling", "/hubitat-proxy", "/webhook"],

  // Configurações de tempo
  maxAge: {
    critical: 24 * 60 * 60 * 1000, // 24h
    dynamic: 60 * 60 * 1000, // 1h
    volatile: 0, // nunca
  },

  // Limites de cache
  maxEntries: {
    critical: 50,
    dynamic: 20,
    volatile: 0,
  },
};

// Cache inteligente com versioning
class SmartCache {
  constructor() {
    this.version = "1.0.0";
    this.cache = null;
  }

  async init() {
    this.cache = await caches.open(CACHE_NAME);
    console.log("🧠 SmartCache inicializado v" + this.version);
  }

  async getStrategy(url) {
    const pathname = new URL(url).pathname;

    if (CACHE_CONFIG.critical.some((pattern) => pathname.includes(pattern))) {
      return CACHE_STRATEGIES.CRITICAL;
    }

    if (CACHE_CONFIG.dynamic.some((pattern) => pathname.includes(pattern))) {
      return CACHE_STRATEGIES.DYNAMIC;
    }

    if (CACHE_CONFIG.volatile.some((pattern) => pathname.includes(pattern))) {
      return CACHE_STRATEGIES.VOLATILE;
    }

    // Default: cache-first para assets estáticos
    return CACHE_STRATEGIES.CRITICAL;
  }

  async isExpired(request, response) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Verificar se é asset crítico
    const isCritical = CACHE_CONFIG.critical.some((pattern) =>
      pathname.includes(pattern)
    );
    const isDynamic = CACHE_CONFIG.dynamic.some((pattern) =>
      pathname.includes(pattern)
    );

    if (isCritical) {
      const maxAge = CACHE_CONFIG.maxAge.critical;
      const cachedTime = new Date(
        response.headers.get("sw-cache-time") || 0
      ).getTime();
      return Date.now() - cachedTime > maxAge;
    }

    if (isDynamic) {
      const maxAge = CACHE_CONFIG.maxAge.dynamic;
      const cachedTime = new Date(
        response.headers.get("sw-cache-time") || 0
      ).getTime();
      return Date.now() - cachedTime > maxAge;
    }

    return false;
  }

  async handleRequest(request) {
    const strategy = await this.getStrategy(request.url);

    switch (strategy) {
      case CACHE_STRATEGIES.CRITICAL:
        return this.cacheFirst(request);
      case CACHE_STRATEGIES.DYNAMIC:
        return this.networkFirst(request);
      case CACHE_STRATEGIES.VOLATILE:
        return this.networkOnly(request);
      default:
        return this.cacheFirst(request);
    }
  }

  async cacheFirst(request) {
    try {
      const cachedResponse = await this.cache.match(request);

      if (cachedResponse && !(await this.isExpired(request, cachedResponse))) {
        console.log("✅ Cache hit (não expirado):", request.url);
        return cachedResponse;
      }

      console.log("🔄 Cache miss ou expirado, buscando rede:", request.url);
      const networkResponse = await fetch(request);

      if (networkResponse.ok) {
        // Clonar resposta e adicionar timestamp
        const responseToCache = networkResponse.clone();
        const responseWithTimestamp = new Response(responseToCache.body, {
          status: responseToCache.status,
          statusText: responseToCache.statusText,
          headers: {
            ...Object.fromEntries(responseToCache.headers.entries()),
            "sw-cache-time": new Date().toISOString(),
          },
        });

        await this.cache.put(request, responseWithTimestamp);
        console.log("💾 Resposta cacheada:", request.url);
      }

      return networkResponse;
    } catch (error) {
      console.warn("⚠️ Erro em cache-first:", error);
      // Fallback para cache mesmo expirado
      const cachedResponse = await this.cache.match(request);
      if (cachedResponse) {
        console.log("� Fallback para cache expirado:", request.url);
        return cachedResponse;
      }
      throw error;
    }
  }

  async networkFirst(request) {
    try {
      console.log("🌐 Tentando rede primeiro:", request.url);
      const networkResponse = await fetch(request);

      if (networkResponse.ok) {
        // Cachear versão atual
        const responseToCache = networkResponse.clone();
        const responseWithTimestamp = new Response(responseToCache.body, {
          status: responseToCache.status,
          statusText: responseToCache.statusText,
          headers: {
            ...Object.fromEntries(responseToCache.headers.entries()),
            "sw-cache-time": new Date().toISOString(),
          },
        });

        await this.cache.put(request, responseWithTimestamp);
        console.log("💾 Resposta da rede cacheada:", request.url);
        return networkResponse;
      }
    } catch (error) {
      console.warn("⚠️ Rede falhou, tentando cache:", error);
    }

    // Fallback para cache
    const cachedResponse = await this.cache.match(request);
    if (cachedResponse) {
      console.log("🔄 Usando cache como fallback:", request.url);
      return cachedResponse;
    }

    throw new Error("Rede e cache falharam");
  }

  async networkOnly(request) {
    console.log("🚫 Network-only (sem cache):", request.url);
    return fetch(request);
  }

  async cleanup() {
    // Limpar entradas antigas baseado em maxEntries
    const keys = await this.cache.keys();
    const criticalKeys = keys.filter((request) =>
      CACHE_CONFIG.critical.some((pattern) =>
        new URL(request.url).pathname.includes(pattern)
      )
    );
    const dynamicKeys = keys.filter((request) =>
      CACHE_CONFIG.dynamic.some((pattern) =>
        new URL(request.url).pathname.includes(pattern)
      )
    );

    // Remover excesso de entradas críticas
    if (criticalKeys.length > CACHE_CONFIG.maxEntries.critical) {
      const toDelete = criticalKeys.slice(
        0,
        criticalKeys.length - CACHE_CONFIG.maxEntries.critical
      );
      await Promise.all(toDelete.map((request) => this.cache.delete(request)));
      console.log(`🧹 Removidas ${toDelete.length} entradas críticas antigas`);
    }

    // Remover excesso de entradas dinâmicas
    if (dynamicKeys.length > CACHE_CONFIG.maxEntries.dynamic) {
      const toDelete = dynamicKeys.slice(
        0,
        dynamicKeys.length - CACHE_CONFIG.maxEntries.dynamic
      );
      await Promise.all(toDelete.map((request) => this.cache.delete(request)));
      console.log(`🧹 Removidas ${toDelete.length} entradas dinâmicas antigas`);
    }
  }
}

// Instância global do cache inteligente
const smartCache = new SmartCache();

console.log("🧠 CACHE INTELIGENTE ATIVADO - Estratégias:");
console.log(
  "  📌 CRITICAL (cache-first):",
  CACHE_CONFIG.critical.length,
  "assets"
);
console.log(
  "  🔄 DYNAMIC (network-first):",
  CACHE_CONFIG.dynamic.length,
  "assets"
);
console.log(
  "  🚫 VOLATILE (network-only):",
  CACHE_CONFIG.volatile.length,
  "endpoints"
);

const ASSETS = []; // Array vazio - cache inteligente gerencia tudo

// Detectar mobile para logs
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
console.log("📱 Service Worker - Mobile:", isMobile);

self.addEventListener("install", (event) => {
  console.log("🚀 Service Worker instalando...");
  event.waitUntil(
    smartCache.init().then(() => {
      // Pre-cache assets críticos na instalação
      const criticalRequests = CACHE_CONFIG.critical.map(
        (url) => new Request(url, { mode: "no-cors" })
      );

      return Promise.all(
        criticalRequests.map((request) =>
          smartCache.handleRequest(request).catch((err) => {
            console.warn("⚠️ Falha ao pre-cachear:", request.url, err.message);
          })
        )
      ).then(() => self.skipWaiting());
    })
  );
});

self.addEventListener("activate", (event) => {
  console.log("🎯 Service Worker ativando...");
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => {
              console.log("🗑️ Removendo cache antigo:", k);
              return caches.delete(k);
            })
        )
      )
      .then(() => {
        console.log("✅ Service Worker ativado, limpando cache antigo...");
        return smartCache.cleanup().then(() => self.clients.claim());
      })
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isHubitat =
    /cloud\.hubitat\.com$/i.test(url.hostname) ||
    /\/apps\/api\//i.test(url.pathname);

  // Nunca interceptar/cachear chamadas ao Hubitat ou cross-origin
  if (!isSameOrigin || isHubitat) {
    console.log("🚫 Ignorando (Hubitat/cross-origin):", req.url);
    return; // Deixa o browser lidar com CORS naturalmente
  }

  console.log("🧠 Processando com cache inteligente:", req.url);
  event.respondWith(smartCache.handleRequest(req));
});

// Limpeza periódica de cache
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEANUP_CACHE") {
    console.log("🧹 Recebida solicitação de limpeza de cache");
    smartCache.cleanup();
  }
});
