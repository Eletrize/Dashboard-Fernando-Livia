// ========================================
// DEBUG UTILITIES
// ========================================

function isDebugEnabled() {
  if (typeof window === "undefined") return false;
  return Boolean(window.__DASHBOARD_DEBUG__);
}

function debugLog(messageOrFactory, ...args) {
  if (!isDebugEnabled()) return;

  if (typeof messageOrFactory === "function") {
    try {
      const result = messageOrFactory();

      if (Array.isArray(result)) {
        console.log(...result);
      } else {
        console.log(result);
      }
    } catch (error) {
      console.error("Debug log failure:", error);
    }

    return;
  }

  // Pegar o device ID do atributo HTML (15 para Varanda, 16 para Piscina)
  const DEVICE_ID = slider.dataset.deviceId || "15";

  console.log(messageOrFactory, ...args);
}

if (typeof window !== "undefined") {
  window.debugLog = debugLog;
  window.isDebugEnabled = isDebugEnabled;
}

const CONTROL_SELECTOR =
  ".room-control[data-device-id], .control-card[data-device-id]";
const MASTER_BUTTON_SELECTOR = ".room-master-btn[data-device-ids]";
const deviceControlCache = new Map();
const masterButtonCache = new Set();
const deviceStateMemory = new Map();
const DEVICE_STATE_STORAGE_PREFIX = "deviceState:";
const DEVICE_STATE_MAX_QUOTA_ERRORS = 1;
let deviceStateStorageDisabled = false;
let deviceStateCleanupInProgress = false;
let deviceStateQuotaErrors = 0;
let deviceStateQuotaWarningShown = false;
let controlCachePrimed = false;
let domObserverInstance = null;
let fallbackSyncTimer = null;
let pendingControlSyncHandle = null;
let pendingControlSyncForce = false; // ========================================

const ROOM_IMAGE_BASES = [
  "photo-varanda",
  "photo-living",
  "photo-piscina",
  "photo-externo",
  "photo-servico",
  "photo-circulacao",
  "photo-suitei",
  "photo-suiteii",
  "photo-suitemaster",
];

const ROOM_IMAGE_WIDTHS = [480, 720, 960, 1440, 1920, 2560];
const CRITICAL_IMAGE_BASES = ROOM_IMAGE_BASES.slice(0, 3);

const ICON_ASSET_PATHS = [
  "images/icons/icon-tv.svg",
  "images/icons/icon-htv.svg",
  "images/icons/icon-musica.svg",
  "images/icons/icon-curtain.svg",
  "images/icons/icon-firetv.svg",
  "images/icons/icon-conforto.svg",
  "images/icons/ar-condicionado.svg",
  "images/icons/icon-piscina.svg",
  "images/icons/icon-telao-led.svg",
  "images/icons/icon-small-light-off.svg",
  "images/icons/icon-small-light-on.svg",
  "images/icons/icon-small-smartglass-off.svg",
  "images/icons/icon-small-smartglass-on.svg",
  "images/icons/icon-small-shader-off.svg",
  "images/icons/icon-small-shader-on.svg",
  "images/icons/icon-small-tv-off.svg",
  "images/icons/icon-small-tv-on.svg",
  "images/icons/icon-small-telamovel-off.svg",
  "images/icons/icon-small-telamovel-on.svg",
  "images/icons/icon-ac-power.svg",
  "images/icons/icon-ac-fan.svg",
  "images/icons/icon-ac-cool.svg",
  "images/icons/icon-ac-heat.svg",
  "images/icons/icon-ac-auto.svg",
  "images/icons/icon-ac-aleta-moving.svg",
  "images/icons/icon-ac-aleta-parada.svg",
  "images/icons/icon-ac-aleta-alta.svg",
  "images/icons/icon-ac-aleta-baixa.svg",
  "images/icons/icon-rotatephone.svg",
  "images/icons/icon-settings.svg",
  "images/icons/icon-home.svg",
  "images/icons/back-button.svg",
  "images/icons/Eletrize.svg",
  "images/icons/Fullscreen.svg",
  "images/icons/icon-limpar.svg",
  "images/icons/icon-mouse.svg",
  "images/icons/Instagram.svg",
  "images/icons/whatsapp.svg",
  "images/icons/icon-volume.svg",
  "images/icons/icon-mute.svg",
  "images/icons/icon-next-track.svg",
  "images/icons/icon-previous-track.svg",
  "images/icons/icon-play.svg",
  "images/icons/icon-pause.svg",
  "images/icons/icon-stop.svg",
  "images/icons/Encerrar-expediente.svg",
  "images/icons/iniciar-expediente.svg",
  "images/icons/icon-scenes.svg",
  "images/icons/pageselector.svg",
];

function buildRoomAssetList() {
  const assets = [];
  ROOM_IMAGE_BASES.forEach((base) => {
    ROOM_IMAGE_WIDTHS.forEach((width) =>
      assets.push(`images/optimized/${base}-${width}.webp`)
    );
    assets.push(`images/Images/${base}.jpg`);
  });
  return assets;
}

const AssetPreloader = (() => {
  const queues = {
    critical: new Set(),
    background: new Set(),
  };

  function add(url, { priority = "background" } = {}) {
    if (!url) return;
    const key = priority === "critical" ? "critical" : "background";
    queues[key].add(url);
  }

  function startQueue(priority, { weight = 0, offset = 0 } = {}) {
    if (typeof window === "undefined") {
      return Promise.resolve();
    }
    const list = Array.from(queues[priority] || []);
    if (!list.length) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let completed = 0;
      const total = list.length;

      const update = (url) => {
        completed += 1;
        if (weight > 0) {
          const percent =
            offset + Math.min(weight, Math.round((completed / total) * weight));
          updateProgress(
            percent,
            `Pré-carregando mídia (${completed}/${total})`
          );
        }

        if (completed === total) {
          resolve();
        }
      };

      list.forEach((url) => {
        const img = new Image();
        img.decoding = "async";
        img.loading = "eager";
        img.onload = img.onerror = () => update(url);
        img.src = url;
      });
    });
  }

  return {
    add,
    startQueue,
  };
})();

ROOM_IMAGE_BASES.forEach((base) => {
  ROOM_IMAGE_WIDTHS.forEach((width) => {
    const priority =
      CRITICAL_IMAGE_BASES.includes(base) && width <= 720
        ? "critical"
        : "background";
    AssetPreloader.add(`images/optimized/${base}-${width}.webp`, { priority });
  });
  AssetPreloader.add(`images/Images/${base}.jpg`, { priority: "background" });
});

AssetPreloader.add("images/pwa/app-icon-420.webp", { priority: "critical" });
AssetPreloader.add("images/pwa/app-icon-192.png", { priority: "background" });
AssetPreloader.add("images/pwa/app-icon-512-transparent.png", {
  priority: "background",
});
ICON_ASSET_PATHS.forEach((asset) =>
  AssetPreloader.add(asset, { priority: "background" })
);

let assetPreloadComplete = false;
let assetPreloadPromise = null;

if (typeof window !== "undefined") {
  assetPreloadPromise = AssetPreloader.startQueue("critical", {
    weight: 30,
    offset: 0,
  })
    .catch((error) => {
      console.warn("Falha ao pré-carregar mídia crítica", error);
    })
    .finally(() => {
      assetPreloadComplete = true;
      AssetPreloader.startQueue("background", {
        weight: 15,
        offset: 30,
      }).catch((error) =>
        console.warn("Falha ao pré-carregar mídia adicional", error)
      );
    });

  window.__assetPreloadPromise = assetPreloadPromise;
window.queueAssetForPreload = (url, priority) =>
  AssetPreloader.add(url, { priority });
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  const mql =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(display-mode: standalone)")
      : null;
  return Boolean(
    (mql && mql.matches) || window.navigator?.standalone === true
  );
}

async function requestPersistentStorage() {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    typeof navigator.storage.persist !== "function"
  ) {
    return;
  }
  try {
    const alreadyPersisted = await navigator.storage.persisted();
    if (alreadyPersisted) {
      return;
    }
    await navigator.storage.persist();
  } catch (error) {
    console.warn("Não foi possível garantir armazenamento persistente:", error);
  }
}

const fullscreenManager = (() => {
  let attempted = false;

  function canRequestFullscreen() {
    return (
      typeof document !== "undefined" &&
      typeof document.documentElement.requestFullscreen === "function"
    );
  }

  function enterFullscreen() {
    if (attempted || !canRequestFullscreen()) return;
    attempted = true;
    document.documentElement
      .requestFullscreen({ navigationUI: "hide" })
      .catch((error) => {
        console.warn("Não foi possível entrar em tela cheia automaticamente", error);
      });

    if (screen?.orientation?.lock) {
      screen.orientation.lock("landscape").catch(() => {});
    }
  }

  function setupAutoFullscreen() {
    if (!isStandaloneMode() || !canRequestFullscreen()) return;

    const handler = () => {
      document.removeEventListener("click", handler);
      document.removeEventListener("touchend", handler);
      enterFullscreen();
    };

    document.addEventListener("click", handler, { once: true });
    document.addEventListener("touchend", handler, { once: true });
  }

  if (typeof window !== "undefined") {
    window.addEventListener("DOMContentLoaded", setupAutoFullscreen);
  }

  return { enterFullscreen };
})();

if (typeof window !== "undefined") {
  window.requestPersistentStorage = requestPersistentStorage;
  window.fullscreenManager = fullscreenManager;

  window.addEventListener("DOMContentLoaded", () => {
    if (isStandaloneMode()) {
      requestPersistentStorage();
    }
  });
}

// DETECÃƒâ€¡ÃƒÆ’O DE DISPOSITIVOS
// ========================================

const MUSIC_PAGE_ROUTES = [
  "ambiente1-musica",
  "ambiente2-musica",
  "ambiente3-musica",
];

function isMusicPageActive(hash = window.location.hash) {
  const isActive = MUSIC_PAGE_ROUTES.some((route) => hash.includes(route));
  console.log("🎵 isMusicPageActive check:", { hash, isActive });
  return isActive;
}

function queryActiveMusic(selector) {
  const activePage = document.querySelector(".page.active");
  if (!activePage) return null;
  return activePage.querySelector(selector);
}

// Detectar iPad Mini 6 especificamente
function detectIPadMini6() {
  const userAgent = navigator.userAgent.toLowerCase();
  const isIPad = /ipad/.test(userAgent);

  // Verificar tamanho: iPad Mini 6 tem 2048x1536 (portrait)
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;

  // iPad Mini 6: ~1024x768 em modo reportado pelo navegador (scaled)
  const isIPadMini6 =
    isIPad &&
    ((screenWidth === 1024 && screenHeight === 768) ||
      (screenWidth === 768 && screenHeight === 1024));

  if (isIPadMini6) {
    document.documentElement.dataset.device = "ipad-mini-6";
    console.log(
      "Ã°Å¸ÂÅ½ iPad Mini 6 detectado - aplicando fixes específicos",
      `Screen: ${screenWidth}x${screenHeight}`,
      `Inner: ${window.innerWidth}x${window.innerHeight}`,
      `DPR: ${window.devicePixelRatio}`
    );
    return true;
  }

  return false;
}

// Detectar se é um celular (não tablet)
function isMobilePhone() {
  const userAgent = navigator.userAgent.toLowerCase();

  // Considerar celular se:
  // 1. iPhone ou Android com tela pequena
  // 2. Largura mÃƒÂ¡xima < 768px (breakpoint de tablet)
  const isIPhone = /iphone/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  const isSmallScreen = window.innerWidth < 768;

  // iPad e tablets maiores não são celulares
  const isTablet = /ipad|galaxy tab|sm-t/.test(userAgent);

  return (isIPhone || (isAndroid && isSmallScreen)) && !isTablet;
}

// Detectar dispositivo geral (Apple, Android ou Desktop)
function detectDevice() {
  const userAgent = navigator.userAgent.toLowerCase();

  const isApple =
    /ipad|iphone|mac os x/.test(userAgent) && navigator.maxTouchPoints > 1;
  const isAndroid = /android/.test(userAgent);

  if (isApple || isAndroid) {
    document.documentElement.dataset.device = "mobile";
    console.log(
      `Ã°Å¸â€œÂ± Dispositivo mobile detectado (${
        isApple ? "Apple" : "Android"
      })`
    );
  }
}

// Função para detectar se está na página de controle remoto da TV
function isOnTVControlPage() {
  return (
    window.location.pathname.includes("ambiente1-tv") ||
    window.location.hash.includes("ambiente1-tv") ||
    window.location.pathname.includes("ambiente1-htv") ||
    window.location.hash.includes("ambiente1-htv")
  );
}

// Função para criar/mostrar overlay de orientação
function showOrientationOverlay() {
  let overlay = document.getElementById("orientation-overlay");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "orientation-overlay";
    overlay.innerHTML = `
      <div class="orientation-overlay-content">
        <img src="images/icons/icon-rotatephone.svg" alt="Rotacione o dispositivo" class="orientation-icon">
        <p class="orientation-message">Rotacione o dispositivo</p>
      </div>
    `;
    document.body.appendChild(overlay);

    // Adicionar estilos dinamicamente se não existirem
    if (!document.getElementById("orientation-overlay-styles")) {
      const style = document.createElement("style");
      style.id = "orientation-overlay-styles";
      style.innerHTML = `
        #orientation-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.95);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          z-index: 10000;
          align-items: center;
          justify-content: center;
        }

        #orientation-overlay.active {
          display: flex;
        }

        .orientation-overlay-content {
          text-align: center;
          color: #fff;
        }

        .orientation-icon {
          width: 120px;
          height: 120px;
          margin-bottom: 20px;
          animation: rotate 2s infinite;
          filter: brightness(0) invert(1);
        }

        .orientation-message {
          font-size: 24px;
          font-weight: 600;
          letter-spacing: 0.5px;
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }

        @keyframes rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
          .orientation-icon {
            width: 80px;
            height: 80px;
          }

          .orientation-message {
            font-size: 18px;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  return overlay;
}

// Função para aplicar estilos baseado em orientação e localização
function updateDeviceStyles() {
  const isMobile = isMobilePhone();
  const isLandscape = window.innerWidth > window.innerHeight;
  const onTVPage = isOnTVControlPage();

  // Regra prioritÃƒÂ¡ria: Celulares em landscape no controle remoto são bloqueados
  if (isMobile && isLandscape && onTVPage) {
    const overlay = showOrientationOverlay();
    overlay.classList.add("active");
    document.documentElement.dataset.layoutState = "mobile-blocked";
    console.log(
      "Ã°Å¸â€œÂµ Celular em landscape no controle remoto - bloqueado"
    );
  } else {
    const overlay = showOrientationOverlay();
    overlay.classList.remove("active");
    document.documentElement.dataset.layoutState = "default";
  }
}

// Executar detecção ao carregar
detectIPadMini6();
detectDevice();
updateDeviceStyles();

// Monitorar mudanÃƒÂ§as de orientação
window.addEventListener("orientationchange", updateDeviceStyles);
window.addEventListener("resize", updateDeviceStyles);

// ========================================
// CONFIGURAÃƒâ€¡Ãƒâ€¢ES GERAIS
// ========================================

// IDs de todos os dispositivos de iluminaÃƒÂ§ÃƒÂ£o (atualizados com devices.json)
const ALL_LIGHT_IDS = [
  "231", // Ambiente 1 - Luz 1 (Escritorio-Pendente)
  "232", // Ambiente 1 - Luz 2 (Escritorio-Trilho)
  "233", // Ambiente 2 - Luz 1 (Escritorio-Lustre)
  "234", // Ambiente 2 - Luz 2 (Escritorio-Balizador)
  "259", // Ambiente 3 - Luz 1 (Cinema-Iluminacao)
  "260", // Ambiente 3 - Luz 2 (Cinema-Balizadores)
  "261", // Ambiente 4 - Luz 1 (Recepcao-Lustre)
  "262", // Ambiente 4 - Luz 2 (Recepcao-Lavabo)
  "263", // Ambiente 5 - Luz 1 (Recepcao-JardimExterno)
  "256", // Ambiente 5 - Luz 2 (Funcionarios-LuzVermelha)
  "257", // Ambiente 6 - Luz 1 (Funcionarios-Banheiro)
  "258", // Ambiente 6 - Luz 2 (Funcionarios-Paineis)
  "15", // Denon AVR - Receiver (para atualização de volume)
];

// Mapeamento de IDs de Ar Condicionado por ambiente
const AC_DEVICE_IDS = {
  "ambiente1": "110",  // Varanda
  "ambiente2": "167",  // Living
  "ambiente7": "182",  // Suíte I
  "ambiente8": "188",  // Suíte II
  "ambiente9": "180",  // Suíte Master
};

// ID do dispositivo de Ar Condicionado atual (será atualizado dinamicamente)
let AC_DEVICE_ID = "110"; // Padrão: Ambiente 1 - Varanda

// Função para obter o ID do AC baseado na rota atual
function getACDeviceIdForCurrentRoute() {
  const currentRoute = (window.location.hash || "").replace("#", "");
  // Extrair o ambiente da rota (ex: "ambiente7-conforto" -> "ambiente7")
  const match = currentRoute.match(/^(ambiente\d+)/);
  if (match) {
    const ambiente = match[1];
    if (AC_DEVICE_IDS[ambiente]) {
      return AC_DEVICE_IDS[ambiente];
    }
  }
  return "110"; // Fallback para ambiente1
}

// ========================================
// INICIALIZAÇÃO DE DISPOSITIVOS VARANDA (ambiente1)
// ========================================

// IDs dos dispositivos da Varanda que possuem o comando "initialize"
const VARANDA_INITIALIZE_DEVICE_IDS = [
  "15",   // Varanda Denon (Denon AVR)
  "29",   // Varanda Denon (Denon HEOS Speaker)
  "109",  // Varanda Cortinas Gourmet
  "110",  // Varanda AC
  "111",  // Varanda TV
  "114",  // Varanda HTV
  "115",  // Varanda Cortina Esquerda
  "116",  // Varanda Cortina Direita
];

// Flag para evitar inicialização duplicada
let varandaInitialized = false;
let lastVarandaInitTime = 0;
const VARANDA_INIT_COOLDOWN = 30000; // 30 segundos entre inicializações

// Função para enviar comando initialize para todos os dispositivos da Varanda
async function initializeVarandaDevices() {
  const now = Date.now();
  
  // Verificar cooldown para evitar spam de comandos
  if (now - lastVarandaInitTime < VARANDA_INIT_COOLDOWN) {
    console.log("⏳ [initializeVarandaDevices] Cooldown ativo, ignorando inicialização");
    return;
  }
  
  console.log("🚀 [initializeVarandaDevices] Iniciando dispositivos da Varanda...");
  lastVarandaInitTime = now;
  
  const results = await Promise.allSettled(
    VARANDA_INITIALIZE_DEVICE_IDS.map(async (deviceId) => {
      try {
        console.log(`🔧 [initializeVarandaDevices] Enviando initialize para dispositivo ${deviceId}`);
        await sendHubitatCommand(deviceId, "initialize");
        console.log(`✅ [initializeVarandaDevices] Dispositivo ${deviceId} inicializado com sucesso`);
        return { deviceId, success: true };
      } catch (error) {
        console.error(`❌ [initializeVarandaDevices] Erro ao inicializar dispositivo ${deviceId}:`, error);
        return { deviceId, success: false, error };
      }
    })
  );
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.length - successful;
  
  console.log(`🏁 [initializeVarandaDevices] Inicialização concluída: ${successful} sucesso, ${failed} falhas`);
}

// Função para verificar se estamos entrando no ambiente1 (Varanda)
function isEnteringVaranda(hash) {
  const route = (hash || "").replace("#", "");
  // Verifica se é a página principal do ambiente1 (não subpáginas)
  return route === "ambiente1";
}

// Configurações de timeout e retry
const NETWORK_CONFIG = {
  HEALTH_CHECK_TIMEOUT: 5000, // 5s para health check
  FETCH_TIMEOUT_PER_ATTEMPT: 15000, // 15s por tentativa
  MAX_RETRY_ATTEMPTS: 3, // 3 tentativas mÃƒÂ¡ximo
  RETRY_DELAY_BASE: 1000, // 1s base para backoff
  RETRY_DELAY_MAX: 5000, // 5s mÃƒÂ¡ximo entre tentativas
};

// FunÃƒÂ§ÃƒÂµes de toggle para ÃƒÂ­cones nos cards da home
function toggleTelamovelIcon(el) {
  const img = el.querySelector("img");
  if (el.dataset.state === "off") {
    img.src = "images/icons/icon-small-telamovel-on.svg";
    el.dataset.state = "on";
  } else {
    img.src = "images/icons/icon-small-telamovel-off.svg";
    el.dataset.state = "off";
  }
}

function toggleSmartglassIcon(el) {
  const img = el.querySelector("img");
  if (el.dataset.state === "off") {
    img.src = "images/icons/icon-small-smartglass-on.svg";
    el.dataset.state = "on";
  } else {
    img.src = "images/icons/icon-small-smartglass-off.svg";
    el.dataset.state = "off";
  }
}

function toggleShaderIcon(el) {
  const img = el.querySelector("img");
  if (el.dataset.state === "off") {
    img.src = "images/icons/icon-small-shader-on.svg";
    el.dataset.state = "on";
  } else {
    img.src = "images/icons/icon-small-shader-off.svg";
    el.dataset.state = "off";
  }
}

function toggleLightIcon(el) {
  const img = el.querySelector("img");
  const deviceIdsAttr = el.dataset.deviceIds;
  const deviceIds = deviceIdsAttr ? deviceIdsAttr.split(",") : [];

  if (el.dataset.state === "off") {
    img.src = "images/icons/icon-small-light-on.svg";
    el.dataset.state = "on";
    deviceIds.forEach((id) => sendHubitatCommand(id, "on"));
  } else {
    img.src = "images/icons/icon-small-light-off.svg";
    el.dataset.state = "off";
    deviceIds.forEach((id) => sendHubitatCommand(id, "off"));
  }
}

function toggleTvIcon(el) {
  const img = el.querySelector("img");
  if (el.dataset.state === "off") {
    img.src = "images/icons/icon-small-tv-on.svg";
    el.dataset.state = "on";
  } else {
    img.src = "images/icons/icon-small-tv-off.svg";
    el.dataset.state = "off";
  }
}

// BotÃƒÂµes dos cÃƒÂ´modos nas páginas internas
function toggleRoomControl(el) {
  const ICON_ON = "images/icons/icon-small-light-on.svg";
  const ICON_OFF = "images/icons/icon-small-light-off.svg";
  // Suporta tanto room-control-icon quanto control-icon
  const img = el.querySelector(".room-control-icon, .control-icon");
  const isOff = (el.dataset.state || "off") === "off";
  const newState = isOff ? "on" : "off";
  const deviceId = el.dataset.deviceId;

  if (!deviceId) return;

  // Marcar comando recente para proteger contra polling
  recentCommands.set(deviceId, Date.now());

  // Atualizar UI imediatamente
  el.dataset.state = newState;
  if (img) img.src = newState === "on" ? ICON_ON : ICON_OFF;

  // Persist locally
  setStoredState(deviceId, newState);

  console.log(`Enviando comando ${newState} para dispositivo ${deviceId}`);

  // Send to Hubitat
  sendHubitatCommand(deviceId, newState === "on" ? "on" : "off")
    .then(() => {
      console.log(
        `Ã¢Å“â€¦ Comando ${newState} enviado com sucesso para dispositivo ${deviceId}`
      );
    })
    .catch((error) => {
      console.error(
        `⚠️Erro ao enviar comando para dispositivo ${deviceId}:`,
        error
      );
      // Em caso de erro, reverter o estado visual
      const revertState = newState === "on" ? "off" : "on";
      el.dataset.state = revertState;
      if (img) img.src = revertState === "on" ? ICON_ON : ICON_OFF;
      setStoredState(deviceId, revertState);
    });
}

function togglePoolControl(el, action) {
  const deviceId = el.dataset.deviceId;
  if (!action || !deviceId) {
    console.error(" togglePoolControl: action ou deviceId ausente");
    return;
  }

  console.log(` Enviando comando "${action}" para dispositivo piscina ${deviceId}`);

  // Enviar comando para Hubitat
  sendHubitatCommand(deviceId, action)
    .then(() => {
      console.log(` Comando "${action}" enviado com sucesso para dispositivo ${deviceId}`);
    })
    .catch((error) => {
      console.error(` Erro ao enviar comando para dispositivo ${deviceId}:`, error);
    });
}
// ========================================
// CONTROLE DE PODER DA TV
// ========================================

let tvPowerState = "off"; // Estado inicial: desligado

// ========================================
// TUNING DE CANAL (SEQUÊNCIA DE NÚMEROS)
// ========================================

const pendingChannelSequences = new Map(); // deviceId -> { cancelled: boolean }

function cancelPendingChannelSequence(deviceId) {
  const existing = pendingChannelSequences.get(String(deviceId));
  if (existing) {
    existing.cancelled = true;
    pendingChannelSequences.delete(String(deviceId));
  }
}

function delayMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendCommandSequence(deviceId, commands, intervalMs) {
  const id = String(deviceId);
  cancelPendingChannelSequence(id);

  const token = { cancelled: false };
  pendingChannelSequences.set(id, token);

  try {
    for (let i = 0; i < commands.length; i += 1) {
      if (token.cancelled) return;
      await sendHubitatCommand(id, commands[i]);
      if (i < commands.length - 1) {
        await delayMs(intervalMs);
      }
    }
  } finally {
    if (pendingChannelSequences.get(id) === token) {
      pendingChannelSequences.delete(id);
    }
  }
}

function updateTVPowerState(newState) {
  tvPowerState = newState;

  // Selecionar botÃƒÂµes ON e OFF
  const btnOn = document.querySelector(".tv-btn--power-on");
  const btnOff = document.querySelector(".tv-btn--power-off");

  // Selecionar todos os outros controles
  const otherControls = document.querySelectorAll(
    ".tv-volume-canais-wrapper, .tv-commands-grid, .tv-directional-pad, .tv-numpad, .tv-logo-section"
  );

  // Selecionar tÃƒÂ­tulos das seÃƒÂ§ÃƒÂµes de controle
  const titles = document.querySelectorAll(".tv-section-title");

  if (newState === "on") {
    // TV ligada
    btnOn?.classList.add("active");
    btnOff?.classList.remove("active");

    // Mostrar outros controles
    otherControls.forEach((control) => {
      control.style.opacity = "1";
      control.style.pointerEvents = "auto";
    });

    // Mostrar tÃƒÂ­tulos
    titles.forEach((title) => {
      title.style.opacity = "1";
    });

    console.log("Ã°Å¸â€œÂº TV LIGADA - Controles visÃƒÂ­veis");
  } else {
    // TV desligada
    btnOff?.classList.add("active");
    btnOn?.classList.remove("active");

    // Escurecer e desabilitar outros controles
    otherControls.forEach((control) => {
      control.style.opacity = "0.15";
      control.style.pointerEvents = "none";
    });

    // Apagar tÃƒÂ­tulos
    titles.forEach((title) => {
      title.style.opacity = "0.2";
    });

    console.log("Ã°Å¸â€œÂº TV DESLIGADA - Controles desabilitados");
  }
}

// Controle de TV
function tvCommand(el, command) {
  const deviceId = el.dataset.deviceId;
  if (!command || !deviceId) return;

  // Controlar estado de poder
  if (command === "on") {
    updateTVPowerState("on");
  } else if (command === "off") {
    updateTVPowerState("off");
  }

  // Feedback visual
  el.style.transform = "scale(0.92)";
  el.style.background = "rgba(255, 255, 255, 0.15)";
  el.style.borderColor = "rgba(255, 255, 255, 0.3)";
  setTimeout(() => {
    el.style.transform = "";
    el.style.background = "";
    el.style.borderColor = "";
  }, 200);

  // Marcar comando recente
  recentCommands.set(deviceId, Date.now());

  console.log(`📺 Enviando comando ${command} para dispositivo ${deviceId}`);

  // Atalho: GloboNews (canal 267) no HTV da varanda (deviceId=114)
  // Envia 2 → 6 → 7 com 0,05s entre cada dígito.
  if (command === "globonews") {
    console.log(`📺 GloboNews: sintonizando canal 267 (device ${deviceId})`);
    // Cancelar qualquer sequência anterior para evitar comandos duplicados
    sendCommandSequence(deviceId, ["num2", "num6", "num7"], 50).catch(
      (error) => {
        console.error("❌ Erro ao sintonizar GloboNews (267):", error);
      }
    );
    return;
  }

  // Atalho: BBB (canal 1) no HTV
  // Envia num1 direto.
  if (command === "bbb") {
    console.log(`📺 BBB: sintonizando canal 1 (device ${deviceId})`);
    sendHubitatCommand(deviceId, "num1")
      .then(() => console.log(`✅ BBB canal 1 sintonizado (device ${deviceId})`))
      .catch((error) => console.error("❌ Erro ao sintonizar BBB (1):", error));
    return;
  }

  // Enviar para Hubitat
  sendHubitatCommand(deviceId, command)
    .then(() => {
      console.log(
        `✅ Comando TV ${command} enviado com sucesso para dispositivo ${deviceId}`
      );
    })
    .catch((error) => {
      console.error(
        `❌ Erro ao enviar comando TV para dispositivo ${deviceId}:`,
        error
      );
    });
}

// Macro para ligar HTV + TV + Receiver de uma vez

// Macro para ligar TV e Receiver e setar input SAT/CBL
function htvMacroOn() {
  const TV_ID = "111";
  const RECEIVER_ID = "15";

  console.log("🎬 Macro HTV: Inicializando, ligando TV, setando HDMI 2 e input SAT/CBL...");

  // Inicializa TV primeiro
  sendHubitatCommand(TV_ID, "initialize")
    .then(() => {
      console.log("✅ TV inicializada");
      // Liga TV (ou confirma que está ligada)
      return sendHubitatCommand(TV_ID, "on");
    })
    .then(() => {
      console.log("✅ TV ligada");
      // Seta HDMI 2 na TV
      return sendHubitatCommand(TV_ID, "hdmi2");
    })
    .then(() => {
      console.log("✅ HDMI 2 selecionado na TV");
      console.log("⏳ Aguardando 4 segundos antes de setar input SAT/CBL...");
      // Aguardar 4 segundos antes de setar input SAT/CBL
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(sendHubitatCommand(RECEIVER_ID, "setInputSource", "SAT/CBL"));
        }, 4000);
      });
    })
    .then(() => {
      console.log("✅ Input SAT/CBL selecionado no Receiver");
    })
    .catch((error) => {
      console.error("❌ Erro na macro HTV:", error);
      // Mesmo com erro, tentar setar o input (caso TV já esteja ligada)
      console.log("🔄 Tentando setar input SAT/CBL mesmo com erro anterior...");
      sendHubitatCommand(RECEIVER_ID, "setInputSource", "SAT/CBL")
        .then(() => console.log("✅ Input SAT/CBL selecionado no Receiver (recuperação)"))
        .catch((err) => console.error("❌ Erro ao setar input:", err));
    });
}

// Versão anterior da função (mantida para referência)
function htvMacroOn_old() {
  const TV_ID = "111";
  const RECEIVER_ID = "15";

  console.log("🎬 Macro HTV: Ligando TV, setando HDMI 2 e input SAT/CBL...");

  // Liga TV (ou confirma que está ligada)
  sendHubitatCommand(TV_ID, "on")
    .then(() => {
      console.log("✅ TV ligada");
      // Seta HDMI 2 na TV
      return sendHubitatCommand(TV_ID, "hdmi2");
    })
    .then(() => {
      console.log("✅ HDMI 2 selecionado na TV");
      console.log("⏳ Aguardando 4 segundos antes de setar input SAT/CBL...");
      // Aguardar 4 segundos antes de setar input SAT/CBL
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(sendHubitatCommand(RECEIVER_ID, "setInputSource", "SAT/CBL"));
        }, 4000);
      });
    })
    .then(() => {
      console.log("✅ Input SAT/CBL selecionado no Receiver");
    })
    .catch((error) => {
      console.error("❌ Erro na macro HTV:", error);
      // Mesmo com erro, tentar setar o input (caso TV já esteja ligada)
      console.log("🔄 Tentando setar input SAT/CBL mesmo com erro anterior...");
      sendHubitatCommand(RECEIVER_ID, "setInputSource", "SAT/CBL")
        .then(() => console.log("✅ Input SAT/CBL selecionado no Receiver (recuperação)"))
        .catch((err) => console.error("❌ Erro ao setar input:", err));
    });
}

// Macro para ligar Telão da Piscina
function telaoMacroOn() {
  const TELAO_ID = "157";
  const RECEIVER_ID = "16";

  console.log("🎬 Macro Telão: Ligando Telão e setando input SAT/CBL...");

  // Liga Telão e seta input SAT/CBL no receiver
  Promise.all([
    sendHubitatCommand(TELAO_ID, "on"),
    sendHubitatCommand(RECEIVER_ID, "setInputSource", "SAT/CBL")
  ])
    .then(() => {
      console.log("✅ Telão ligado e input SAT/CBL selecionado");
    })
    .catch((error) => {
      console.error("❌ Erro na macro Telão:", error);
    });
}

// Macro para desligar Telão da Piscina (Receiver Zona 2 + Telão)
function telaoMacroOff() {
  const TELAO_ID = "157";
  const RECEIVER_ID = "16"; // Zona 2 do receiver (Piscina)

  console.log("🎬 Macro Telão: Desligando Receiver Zona 2 e Telão...");

  Promise.all([
    sendHubitatCommand(RECEIVER_ID, "off"),
    sendHubitatCommand(TELAO_ID, "off")
  ])
    .then(() => {
      console.log("✅ Receiver Zona 2 e Telão desligados");
    })
    .catch((error) => {
      console.error("❌ Erro ao desligar Telão:", error);
    });
}

// Macro para desligar TV e Receiver
function htvMacroOff() {
  const TV_ID = "111";
  const RECEIVER_ID = "15";

  console.log("🎬 Macro HTV: Desligando TV e Receiver...");

  Promise.all([
    sendHubitatCommand(TV_ID, "off"),
    sendHubitatCommand(RECEIVER_ID, "off")
  ])
    .then(() => {
      console.log("✅ TV e Receiver desligados");
    })
    .catch((error) => {
      console.error("❌ Erro ao desligar TV/Receiver:", error);
    });
}

// ============================================
// MACROS SUÍTE MASTER (sem Receiver)
// ============================================

// Macro para ligar HTV Suíte Master: Liga TV, aguarda 3s, seleciona HDMI2
function suiteMasterHtvOn() {
  const TV_ID = "183"; // TV Samsung Suíte Master

  console.log("🎬 Macro Suíte Master HTV: Ligando TV e selecionando HDMI2...");

  sendHubitatCommand(TV_ID, "on")
    .then(() => {
      console.log("✅ TV Suíte Master ligada");
      console.log("⏳ Aguardando 3 segundos antes de selecionar HDMI2...");
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(sendHubitatCommand(TV_ID, "hdmi2"));
        }, 3000);
      });
    })
    .then(() => {
      console.log("✅ HDMI2 selecionado na TV Suíte Master");
    })
    .catch((error) => {
      console.error("❌ Erro na macro Suíte Master HTV:", error);
    });
}

// Macro para desligar HTV Suíte Master: Apenas desliga TV
function suiteMasterHtvOff() {
  const TV_ID = "183"; // TV Samsung Suíte Master

  console.log("🎬 Macro Suíte Master HTV: Desligando TV...");

  sendHubitatCommand(TV_ID, "off")
    .then(() => {
      console.log("✅ TV Suíte Master desligada");
    })
    .catch((error) => {
      console.error("❌ Erro ao desligar TV Suíte Master:", error);
    });
}

// Macro para ligar TV Suíte Master: Apenas liga TV (apps internos)
function suiteMasterTvOn() {
  const TV_ID = "183"; // TV Samsung Suíte Master

  console.log("🎬 Macro Suíte Master TV: Ligando TV...");

  sendHubitatCommand(TV_ID, "on")
    .then(() => {
      console.log("✅ TV Suíte Master ligada");
    })
    .catch((error) => {
      console.error("❌ Erro ao ligar TV Suíte Master:", error);
    });
}

// Macro para desligar TV Suíte Master: Apenas desliga TV
function suiteMasterTvOff() {
  const TV_ID = "183"; // TV Samsung Suíte Master

  console.log("🎬 Macro Suíte Master TV: Desligando TV...");

  sendHubitatCommand(TV_ID, "off")
    .then(() => {
      console.log("✅ TV Suíte Master desligada");
    })
    .catch((error) => {
      console.error("❌ Erro ao desligar TV Suíte Master:", error);
    });
}

// ============================================
// MACROS SUÍTE I (sem Receiver) - TV: 184
// ============================================

// Macro para ligar HTV Suíte I: Liga TV, aguarda 3s, seleciona HDMI2
function suite1HtvOn() {
  const TV_ID = "184"; // TV Samsung Suíte I

  console.log("🎬 Macro Suíte I HTV: Ligando TV e selecionando HDMI2...");

  sendHubitatCommand(TV_ID, "on")
    .then(() => {
      console.log("✅ TV Suíte I ligada");
      console.log("⏳ Aguardando 3 segundos antes de selecionar HDMI2...");
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(sendHubitatCommand(TV_ID, "hdmi2"));
        }, 3000);
      });
    })
    .then(() => {
      console.log("✅ HDMI2 selecionado na TV Suíte I");
    })
    .catch((error) => {
      console.error("❌ Erro na macro Suíte I HTV:", error);
    });
}

// Macro para desligar HTV Suíte I: Apenas desliga TV
function suite1HtvOff() {
  const TV_ID = "184"; // TV Samsung Suíte I

  console.log("🎬 Macro Suíte I HTV: Desligando TV...");

  sendHubitatCommand(TV_ID, "off")
    .then(() => {
      console.log("✅ TV Suíte I desligada");
    })
    .catch((error) => {
      console.error("❌ Erro ao desligar TV Suíte I:", error);
    });
}

// Macro para ligar TV Suíte I: Apenas liga TV (apps internos)
function suite1TvOn() {
  const TV_ID = "184"; // TV Samsung Suíte I

  console.log("🎬 Macro Suíte I TV: Ligando TV...");

  sendHubitatCommand(TV_ID, "on")
    .then(() => {
      console.log("✅ TV Suíte I ligada");
    })
    .catch((error) => {
      console.error("❌ Erro ao ligar TV Suíte I:", error);
    });
}

// Macro para desligar TV Suíte I: Apenas desliga TV
function suite1TvOff() {
  const TV_ID = "184"; // TV Samsung Suíte I

  console.log("🎬 Macro Suíte I TV: Desligando TV...");

  sendHubitatCommand(TV_ID, "off")
    .then(() => {
      console.log("✅ TV Suíte I desligada");
    })
    .catch((error) => {
      console.error("❌ Erro ao desligar TV Suíte I:", error);
    });
}

// ============================================
// MACROS SUÍTE II (sem Receiver) - TV: 185
// ============================================

// Macro para ligar HTV Suíte II: Liga TV, aguarda 3s, seleciona HDMI2
function suite2HtvOn() {
  const TV_ID = "185"; // TV Samsung Suíte II

  console.log("🎬 Macro Suíte II HTV: Ligando TV e selecionando HDMI2...");

  sendHubitatCommand(TV_ID, "on")
    .then(() => {
      console.log("✅ TV Suíte II ligada");
      console.log("⏳ Aguardando 3 segundos antes de selecionar HDMI2...");
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(sendHubitatCommand(TV_ID, "hdmi2"));
        }, 3000);
      });
    })
    .then(() => {
      console.log("✅ HDMI2 selecionado na TV Suíte II");
    })
    .catch((error) => {
      console.error("❌ Erro na macro Suíte II HTV:", error);
    });
}

// Macro para desligar HTV Suíte II: Apenas desliga TV
function suite2HtvOff() {
  const TV_ID = "185"; // TV Samsung Suíte II

  console.log("🎬 Macro Suíte II HTV: Desligando TV...");

  sendHubitatCommand(TV_ID, "off")
    .then(() => {
      console.log("✅ TV Suíte II desligada");
    })
    .catch((error) => {
      console.error("❌ Erro ao desligar TV Suíte II:", error);
    });
}

// Macro para ligar TV Suíte II: Apenas liga TV (apps internos)
function suite2TvOn() {
  const TV_ID = "185"; // TV Samsung Suíte II

  console.log("🎬 Macro Suíte II TV: Ligando TV...");

  sendHubitatCommand(TV_ID, "on")
    .then(() => {
      console.log("✅ TV Suíte II ligada");
    })
    .catch((error) => {
      console.error("❌ Erro ao ligar TV Suíte II:", error);
    });
}

// Macro para desligar TV Suíte II: Apenas desliga TV
function suite2TvOff() {
  const TV_ID = "185"; // TV Samsung Suíte II

  console.log("🎬 Macro Suíte II TV: Desligando TV...");

  sendHubitatCommand(TV_ID, "off")
    .then(() => {
      console.log("✅ TV Suíte II desligada");
    })
    .catch((error) => {
      console.error("❌ Erro ao desligar TV Suíte II:", error);
    });
}

// ============================================

// Macro para ligar TV + Receiver de uma vez

// Macro para ligar TV e Receiver e setar input TV
function tvMacroOn() {
  const TV_ID = "111";
  const RECEIVER_ID = "15";

  console.log("🎬 Macro TV: Ligando TV, depois setando input TV...");

  // Liga TV
  sendHubitatCommand(TV_ID, "on")
    .then(() => {
      console.log("✅ TV ligada");
      console.log("⏳ Aguardando 4 segundos antes de setar input TV...");
      // Aguardar 4 segundos antes de setar input TV
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(sendHubitatCommand(RECEIVER_ID, "setInputSource", "TV"));
        }, 4000);
      });
    })
    .then(() => {
      console.log("✅ Input TV selecionado no Receiver");
    })
    .catch((error) => {
      console.error("❌ Erro na macro TV:", error);
    });
}

// Macro para desligar TV e Receiver
function tvMacroOff() {
  const TV_ID = "111";
  const RECEIVER_ID = "15";

  console.log("🎬 Macro TV: Desligando TV e Receiver...");

  Promise.all([
    sendHubitatCommand(TV_ID, "off"),
    sendHubitatCommand(RECEIVER_ID, "off")
  ])
    .then(() => {
      console.log("✅ TV e Receiver desligados");
    })
    .catch((error) => {
      console.error("❌ Erro ao desligar TV/Receiver:", error);
    });
}

// Macro para ativar Fire TV (HDMI 2 + BD no Receiver)
function fireTVMacro() {
  const TV_ID = "111";
  const RECEIVER_ID = "15";

  console.log("🎬 Macro Fire TV: Selecionando HDMI 2 e setando Receiver para BD...");

  // Enviar comando HDMI 2 para TV
  sendHubitatCommand(TV_ID, "hdmi2")
    .then(() => {
      console.log("✅ HDMI 2 selecionado na TV");
      // Setar input BD no Receiver
      return sendHubitatCommand(RECEIVER_ID, "setInputSource", "BD");
    })
    .then(() => {
      console.log("✅ Input BD selecionado no Receiver");
    })
    .catch((error) => {
      console.error("❌ Erro na macro Fire TV:", error);
    });
}

// Controle do Slider de Volume
function initVolumeSlider() {
  const slider = document.getElementById("tv-volume-slider");
  const display = document.getElementById("tv-volume-display");

  if (!slider || !display) {
    console.log("Slider ou display nao encontrado");
    return;
  }

  // Pegar o device ID do atributo HTML (15 para Varanda, 16 para Piscina)
  const DEVICE_ID = slider.dataset.deviceId || "15";

  console.log("Inicializando slider de volume (Device ID: " + DEVICE_ID + ")");

  // Remover event listeners antigos para evitar duplicacao
  const newSlider = slider.cloneNode(true);
  slider.parentNode.replaceChild(newSlider, slider);

  // Pegar referencia ao novo slider
  const updatedSlider = document.getElementById("tv-volume-slider");

  // Buscar volume atual do Denon e atualizar o slider
  updateDenonVolumeFromServer();

  // Atualizar display quando slider mudar
  updatedSlider.addEventListener("input", (e) => {
    const value = e.target.value;
    const max = e.target.max || 100;
    const percentage = (value / max) * 100;

    display.textContent = value;
    updatedSlider.style.setProperty("--volume-progress", percentage + "%");

    console.log("Volume display atualizado: " + value + " (" + percentage.toFixed(1) + "%)");
  });

  // Enviar comando ao soltar o slider
  updatedSlider.addEventListener("change", (e) => {
    const value = e.target.value;
    const deviceId = e.target.dataset.deviceId || "15";

    console.log("Volume alterado para: " + value + " - enviando para Device " + deviceId);

    // Enviar comando setVolume para o Denon AVR
    sendHubitatCommand(deviceId, "setVolume", value)
      .then(() => {
        console.log("Volume do Device " + deviceId + " definido para " + value);
      })
      .catch((error) => {
        console.error("Erro ao definir volume do Device " + deviceId + ":", error);
      });
  });

  console.log("Slider de volume inicializado com sucesso (Device ID: " + DEVICE_ID + ")");
}

// Função para atualizar o volume do Denon a partir do servidor
async function updateDenonVolumeFromServer() {
  const tvSlider = document.getElementById("tv-volume-slider");
  const DENON_DEVICE_ID = tvSlider?.dataset?.deviceId || "15";
  const tvDisplay = document.getElementById("tv-volume-display");
  const musicSlider =
    typeof queryActiveMusic === "function"
      ? queryActiveMusic("#music-volume-slider")
      : document.querySelector("#music-volume-slider");

  try {
    const pollingUrl = isProduction
      ? `${POLLING_URL}?devices=${DENON_DEVICE_ID}`
      : null;

    if (!pollingUrl) {
      console.log(
        "⚠️não é possível buscar volume em desenvolvimento"
      );
      return;
    }

    const response = await fetch(pollingUrl);
    if (!response.ok) throw new Error(`Polling failed: ${response.status}`);

    const data = await response.json();

    // Processar resposta para pegar o volume e o estado de energia
    let volume = null;
    let powerState = null;

    if (data.devices && data.devices[DENON_DEVICE_ID]) {
      const devicePayload = data.devices[DENON_DEVICE_ID];
      volume =
        devicePayload.volume ??
        devicePayload.level ??
        (devicePayload.attributes && devicePayload.attributes.volume);
      powerState = getDenonPowerStateFromDevice(devicePayload);
    } else if (Array.isArray(data.data)) {
      const denonData = data.data.find((d) => String(d.id) === DENON_DEVICE_ID);
      if (denonData) {
        if (denonData.attributes) {
          if (Array.isArray(denonData.attributes)) {
            const volumeAttr = denonData.attributes.find(
              (attr) => attr?.name === "volume"
            );
            volume =
              volumeAttr?.currentValue ??
              volumeAttr?.value ??
              denonData.volume ??
              volume;
          } else if (typeof denonData.attributes === "object") {
            volume = denonData.attributes.volume ?? denonData.volume ?? volume;
          }
        } else if (denonData.volume !== undefined) {
          volume = denonData.volume;
        }
        powerState = getDenonPowerStateFromDevice(denonData);
      }
    }

    if (volume !== null && volume !== undefined) {
      const volumeValue = parseInt(volume, 10);

      if (tvSlider) {
        const maxTv = parseInt(tvSlider.max || "100", 10);
        const percentageTv = (volumeValue / maxTv) * 100;
        tvSlider.value = volumeValue;
        tvSlider.style.setProperty("--volume-progress", percentageTv + "%");
      }

      if (tvDisplay) {
        tvDisplay.textContent = volumeValue;
      }

      if (musicSlider) {
        const maxMusic = parseInt(musicSlider.max || "100", 10);
        const percentageMusic = (volumeValue / maxMusic) * 100;
        musicSlider.value = volumeValue;
        musicSlider.style.setProperty(
          "--volume-percent",
          percentageMusic + "%"
        );
      }

      console.log("[Denon] Volume atualizado:", volumeValue);
    }

    if (powerState) {
      applyDenonPowerState(powerState);
    }
  } catch (error) {
    console.error("⚠️Erro ao buscar volume do Denon:", error);
  }
}

// Função para atualizar a UI do volume do Denon (chamada pelo polling)
function updateDenonVolumeUI(volume) {
  const tvSlider = document.getElementById("tv-volume-slider");
  const tvDisplay = document.getElementById("tv-volume-display");
  const musicSlider =
    typeof queryActiveMusic === "function"
      ? queryActiveMusic("#music-volume-slider")
      : document.querySelector("#music-volume-slider");

  debugLog(() => ["updateDenonVolumeUI chamada", { volume }]);

  if (!tvSlider && !musicSlider) {
    debugLog(() => "updateDenonVolumeUI: nenhum controle encontrado na página");
    return;
  }

  const volumeValue = parseInt(volume, 10);
  debugLog(() => [
    "updateDenonVolumeUI: estado atual",
    {
      recebido: volume,
      convertido: volumeValue,
      tvSlider: tvSlider ? tvSlider.value : "n/a",
      musicSlider: musicSlider ? musicSlider.value : "n/a",
    },
  ]);

  const lastCmd = recentCommands.get("15");
  if (lastCmd && Date.now() - lastCmd < COMMAND_PROTECTION_MS) {
    debugLog(
      () => "updateDenonVolumeUI: comando manual recente, ignorando polling"
    );
    return;
  }

  let updated = false;

  if (tvSlider) {
    const currentTv = parseInt(tvSlider.value, 10);
    const maxTv = tvSlider.max || 100;
    const percentageTv = (volumeValue / maxTv) * 100;
    if (currentTv !== volumeValue) {
      tvSlider.value = volumeValue;
      tvSlider.style.setProperty("--volume-progress", percentageTv + "%");
      updated = true;
    }
    if (tvDisplay) {
      tvDisplay.textContent = volumeValue;
    }
  }

  if (musicSlider) {
    const currentMusic = parseInt(musicSlider.value, 10);
    const maxMusic = musicSlider.max || 100;
    const percentageMusic = (volumeValue / maxMusic) * 100;
    if (currentMusic !== volumeValue) {
      musicSlider.value = volumeValue;
      musicSlider.style.setProperty("--volume-percent", percentageMusic + "%");
      if (typeof updateVolumeBar === "function") updateVolumeBar();
      updated = true;
    }
  }

  if (updated) {
    debugLog(() => ["updateDenonVolumeUI: volume sincronizado", { volumeValue }]);
  }
}

function normalizeDenonPowerState(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim().toLowerCase();
  if (["on", "1", "true", "online"].includes(normalized)) return "on";
  if (["off", "0", "false", "offline", "standby"].includes(normalized))
    return "off";
  return null;
}

function getDenonPowerStateFromDevice(device) {
  if (!device || typeof device !== "object") return null;

  const directCandidates = [
    device.switch,
    device.state,
    device.power,
    device.status,
  ];

  for (const candidate of directCandidates) {
    const normalized = normalizeDenonPowerState(candidate);
    if (normalized) return normalized;
  }

  const attrs = device.attributes;

  if (Array.isArray(attrs)) {
    for (const attr of attrs) {
      if (!attr) continue;
      const attrName = String(attr.name || attr.attribute || "").toLowerCase();
      if (!attrName) continue;
      if (["switch", "power", "status", "state"].includes(attrName)) {
        const normalized = normalizeDenonPowerState(
          attr.currentValue ?? attr.value
        );
        if (normalized) return normalized;
      }
    }
  } else if (attrs && typeof attrs === "object") {
    const keys = ["switch", "power", "status", "state"];
    for (const key of keys) {
      if (key in attrs) {
        const normalized = normalizeDenonPowerState(attrs[key]);
        if (normalized) return normalized;
      }
    }
  }

  return null;
}

function applyDenonPowerState(rawState) {
  const normalized = normalizeDenonPowerState(rawState);
  if (!normalized) return;

  if (typeof recentCommands !== "undefined") {
    const lastCmd = recentCommands.get("15");
    if (lastCmd && Date.now() - lastCmd < COMMAND_PROTECTION_MS) {
      console.log(
        "[Denon] Ignorando sincronizacao de power por comando recente"
      );
      return;
    }
  }

  const desiredOn = normalized === "on";

  window.musicPlayerUI = window.musicPlayerUI || {};
  window.musicPlayerUI.currentPowerState = normalized;

  if (
    window.musicPlayerUI &&
    typeof window.musicPlayerUI.isPowerOn === "function" &&
    window.musicPlayerUI.isPowerOn() === desiredOn
  ) {
    return;
  }

  if (
    window.musicPlayerUI &&
    typeof window.musicPlayerUI.setPower === "function"
  ) {
    window.musicPlayerUI.setPower(desiredOn);
  }
}
// Inicializar estado ao carregar
document.addEventListener("DOMContentLoaded", () => {
  updateTVPowerState("off");
  initVolumeSlider();

  // Re-inicializar quando a página mudar (para SPAs)
  window.addEventListener("hashchange", () => {
    setTimeout(() => {
      initVolumeSlider();
    }, 100);
  });

  // Listener para inicialização de dispositivos da Varanda (ambiente1)
  window.addEventListener("hashchange", () => {
    const newHash = window.location.hash;
    console.log("🏠 [hashchange] Verificando se é ambiente1:", newHash);
    
    if (isEnteringVaranda(newHash)) {
      console.log("🏠 [hashchange] Entrando na Varanda - iniciando dispositivos...");
      // Pequeno delay para garantir que a página carregou
      setTimeout(() => {
        initializeVarandaDevices();
      }, 500);
    }
  });

  // Listener específico para página de música
  window.addEventListener("hashchange", () => {
    console.log("🎵 [hashchange] Hash mudou para:", window.location.hash);
    const isMusicActive = isMusicPageActive();
    console.log("🎵 [hashchange] isMusicPageActive:", isMusicActive);
    
    if (isMusicActive) {
      console.log("🎵 [hashchange] Iniciando player de música em 300ms...");
      setTimeout(() => {
        console.log("🎵 [hashchange] Executando initMusicPlayerUI...");
        initMusicPlayerUI();
        // Living (ambiente2-musica) não tem metadata - device 198 não suporta HEOS
        const hash = window.location.hash;
        if (!hash.includes('ambiente2-musica')) {
          updateDenonMetadata();
          startMusicMetadataPolling();
        } else {
          console.log("🎵 [hashchange] Living detectado - sem polling de metadata");
          stopMusicMetadataPolling();
        }
      }, 300);
    } else {
      stopMusicMetadataPolling();
    }
  });
});

function setRoomControlUI(el, state) {
  const ICON_ON = "images/icons/icon-small-light-on.svg";
  const ICON_OFF = "images/icons/icon-small-light-off.svg";
  const normalized = state === "on" ? "on" : "off";

  el.dataset.state = normalized;

  // Suporta tanto room-control-icon quanto control-icon (mesmo seletor do toggleRoomControl)
  const img = el.querySelector(".room-control-icon, .control-icon");
  if (img) {
    const newSrc = normalized === "on" ? ICON_ON : ICON_OFF;
    console.log(
      `Ã°Å¸â€Â§ setRoomControlUI: Atualizando imagem ${img.src} Ã¢â€ â€™ ${newSrc} (estado: ${state})`
    );
    img.src = newSrc;
  } else {
    console.warn(
      `Ã¢Å¡Â Ã¯Â¸Â setRoomControlUI: Imagem não encontrada para elemento com classes: ${el.className}`
    );
    // Debug: mostrar todos os elementos filhos para diagnÃƒÂ³stico
    console.log(
      `Ã°Å¸â€Â Elementos filhos:`,
      Array.from(el.children).map((child) => child.className)
    );
  }
}

function deviceStateKey(deviceId) {
  return `${DEVICE_STATE_STORAGE_PREFIX}${deviceId}`;
}

function getStoredState(deviceId) {
  if (deviceStateMemory.has(deviceId)) {
    return deviceStateMemory.get(deviceId);
  }

  if (deviceStateStorageDisabled) {
    return null;
  }

  try {
    const key = deviceStateKey(deviceId);
    const value = localStorage.getItem(key);

    if (value !== null && value !== undefined) {
      deviceStateMemory.set(deviceId, value);
    }

    return value;
  } catch (error) {
    debugLog(() => ["getStoredState fallback", deviceId, error]);
    return null;
  }
}

function setStoredState(deviceId, state) {
  deviceStateMemory.set(deviceId, state);

  if (deviceStateStorageDisabled) {
    return;
  }

  const key = deviceStateKey(deviceId);

  try {
    localStorage.setItem(key, state);
    deviceStateQuotaErrors = 0;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      handleDeviceStateQuotaError(deviceId, key, state, error);
    } else {
      console.warn(`Erro ao salvar estado ${deviceId}:`, error);
    }
  }
}

function isQuotaExceededError(error) {
  if (!error) return false;
  return (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error.code === 22 ||
    error.code === 1014
  );
}

function handleDeviceStateQuotaError(deviceId, key, state, error) {
  if (deviceStateStorageDisabled) {
    return;
  }

  if (!deviceStateQuotaWarningShown) {
    console.warn(
      `Persistencia de estados sem espaco para ${deviceId}. Tentando limpeza...`,
      error
    );
    deviceStateQuotaWarningShown = true;
  } else {
    debugLog(() => [
      "QuotaExceeded repetido",
      { deviceId, message: error?.message }
    ]);
  }

  let removedEntries = 0;
  if (!deviceStateCleanupInProgress) {
    deviceStateCleanupInProgress = true;
    try {
      const excluded = new Set([key]);
      removedEntries = purgeDeviceStateEntries(excluded);
      if (removedEntries > 0) {
        console.info(`Estados antigos removidos do localStorage: ${removedEntries}`);
      }
    } finally {
      deviceStateCleanupInProgress = false;
    }
  }

  if (removedEntries === 0) {
    disableDeviceStatePersistence(
      "Sem espaco restante no localStorage e nenhum estado para remover",
      error
    );
    return;
  }

  try {
    localStorage.setItem(key, state);
    deviceStateQuotaErrors = 0;
  } catch (retryError) {
    deviceStateQuotaErrors += 1;
    const attempt = Math.min(
      deviceStateQuotaErrors,
      DEVICE_STATE_MAX_QUOTA_ERRORS
    );

    if (attempt >= DEVICE_STATE_MAX_QUOTA_ERRORS) {
      disableDeviceStatePersistence(
        "localStorage sem espaco suficiente para estados",
        retryError
      );
    } else {
      console.warn(
        `Persistencia de estados ainda sem espaco (tentativa ${attempt}/${DEVICE_STATE_MAX_QUOTA_ERRORS})`,
        retryError
      );
    }
  }
}

function purgeDeviceStateEntries(excludeKeys = new Set()) {
  if (typeof localStorage === "undefined") return 0;

  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const currentKey = localStorage.key(i);
    if (
      currentKey &&
      currentKey.startsWith(DEVICE_STATE_STORAGE_PREFIX) &&
      !excludeKeys.has(currentKey)
    ) {
      keysToRemove.push(currentKey);
    }
  }

  keysToRemove.forEach((keyName) => {
    try {
      localStorage.removeItem(keyName);
    } catch (removeError) {
      console.warn("Erro ao remover estado persistido:", keyName, removeError);
    }

    const deviceId = keyName.substring(DEVICE_STATE_STORAGE_PREFIX.length);
    if (deviceId) {
      deviceStateMemory.delete(deviceId);
    }
  });

  return keysToRemove.length;
}

function disableDeviceStatePersistence(reason, error) {
  if (deviceStateStorageDisabled) {
    return;
  }

  deviceStateStorageDisabled = true;
  console.warn(`Persistencia de estados desativada: ${reason}`, error);
}

function registerControlElement(el) {
  if (!el || !el.dataset) return false;
  const deviceId = el.dataset.deviceId;
  if (!deviceId) return false;

  let registry = deviceControlCache.get(deviceId);
  if (!registry) {
    registry = new Set();
    deviceControlCache.set(deviceId, registry);
  }

  if (registry.has(el)) return false;
  registry.add(el);
  return true;
}

function unregisterControlElement(el) {
  if (!el || !el.dataset) return false;
  const deviceId = el.dataset.deviceId;
  if (!deviceId) return false;

  const registry = deviceControlCache.get(deviceId);
  if (!registry) return false;
  const removed = registry.delete(el);
  if (registry.size === 0) {
    deviceControlCache.delete(deviceId);
  }
  return removed;
}

function registerMasterButton(btn) {
  if (!btn) return false;
  if (masterButtonCache.has(btn)) return false;
  masterButtonCache.add(btn);
  return true;
}

function unregisterMasterButton(btn) {
  if (!btn) return false;
  return masterButtonCache.delete(btn);
}

function collectControlsFromNode(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  let changed = false;

  if (node.matches && node.matches(CONTROL_SELECTOR)) {
    changed = registerControlElement(node) || changed;
  }

  if (node.matches && node.matches(MASTER_BUTTON_SELECTOR)) {
    changed = registerMasterButton(node) || changed;
  }

  if (typeof node.querySelectorAll === "function") {
    node.querySelectorAll(CONTROL_SELECTOR).forEach(function (el) {
      changed = registerControlElement(el) || changed;
    });

    node.querySelectorAll(MASTER_BUTTON_SELECTOR).forEach(function (btn) {
      changed = registerMasterButton(btn) || changed;
    });
  }

  return changed;
}

function removeControlsFromNode(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  let changed = false;

  if (node.matches && node.matches(CONTROL_SELECTOR)) {
    changed = unregisterControlElement(node) || changed;
  }

  if (node.matches && node.matches(MASTER_BUTTON_SELECTOR)) {
    changed = unregisterMasterButton(node) || changed;
  }

  if (typeof node.querySelectorAll === "function") {
    node.querySelectorAll(CONTROL_SELECTOR).forEach(function (el) {
      changed = unregisterControlElement(el) || changed;
    });

    node.querySelectorAll(MASTER_BUTTON_SELECTOR).forEach(function (btn) {
      changed = unregisterMasterButton(btn) || changed;
    });
  }

  return changed;
}

function primeControlCaches(options) {
  const config = options || {};
  const root =
    config.root && typeof config.root.querySelectorAll === "function"
      ? config.root
      : document;
  const force = Boolean(config.force);

  if (controlCachePrimed && !force) {
    return;
  }

  root.querySelectorAll(CONTROL_SELECTOR).forEach(function (el) {
    registerControlElement(el);
  });

  root.querySelectorAll(MASTER_BUTTON_SELECTOR).forEach(function (btn) {
    registerMasterButton(btn);
  });

  controlCachePrimed = true;
}

function pruneStaleEntries() {
  deviceControlCache.forEach(function (registry, deviceId) {
    registry.forEach(function (el) {
      if (!el.isConnected) {
        registry.delete(el);
      }
    });

    if (registry.size === 0) {
      deviceControlCache.delete(deviceId);
    }
  });

  masterButtonCache.forEach(function (btn) {
    if (!btn.isConnected) {
      masterButtonCache.delete(btn);
    }
  });
}

function scheduleControlSync(forceMasterUpdate) {
  if (forceMasterUpdate) {
    pendingControlSyncForce = true;
  }

  if (pendingControlSyncHandle !== null) {
    return;
  }

  var runSync = function () {
    pendingControlSyncHandle = null;
    var force = pendingControlSyncForce;
    pendingControlSyncForce = false;
    syncAllVisibleControls(force);
  };

  if (typeof window !== "undefined") {
    if (typeof window.requestIdleCallback === "function") {
      pendingControlSyncHandle = window.requestIdleCallback(runSync, {
        timeout: 120,
      });
      return;
    }

    if (typeof window.requestAnimationFrame === "function") {
      pendingControlSyncHandle = window.requestAnimationFrame(function () {
        runSync();
      });
      return;
    }
  }

  pendingControlSyncHandle = setTimeout(runSync, 32);
}

async function fetchDeviceState(deviceId) {
  try {
    const url = urlDeviceInfo(deviceId);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Hubitat state fetch failed: ${resp.status}`);
    const data = await resp.json();
    // Maker API returns attributes array; prefer currentValue, fallback to value
    const attr = Array.isArray(data.attributes)
      ? data.attributes.find((a) => a.name === "switch")
      : null;
    const state = attr?.currentValue || attr?.value || "off";
    return state;
  } catch (error) {
    console.error(`Error fetching state for device ${deviceId}:`, error);
    return "off"; // fallback
  }
}

async function refreshRoomControlFromHubitat(el) {
  return;
}

function initRoomPage() {
  debugLog(() => ["initRoomPage: start"]);

  const root = document.getElementById("spa-root") || document;
  primeControlCaches({ root: root, force: true });
  pruneStaleEntries();
  syncAllVisibleControls(true);

  // Rename label on Sinuca page: Iluminacao -> Bar (UI-only)
  try {
    const route = (window.location.hash || "").replace("#", "");
    if (route === "ambiente5") {
      document
        .querySelectorAll(".room-control-label")
        .forEach(function (label) {
          const text = (label.textContent || "").trim().toLowerCase();
          if (text.startsWith("ilumin")) {
            label.textContent = "Bar";
          }
        });
    }
  } catch (error) {
    debugLog(() => ["initRoomPage rename fallback", error]);
  }

  // Garantir atualizacao de botoes master apos o layout estabilizar
  const masterUpdate = function () {
    updateAllMasterButtons(true);
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(masterUpdate, { timeout: 200 });
  } else {
    setTimeout(masterUpdate, 50);
  }
}

// === CONTROLADOR DE AR CONDICIONADO ===

// Função para inicializar o controle de AR quando a página de conforto for carregada
function initAirConditionerControl() {
  const fanLevels = ["low", "medium", "high"];
  const temperatures = [18, 19, 20, 21, 22, 23, 24, 25];

  // Detectar a página atual para aplicar configuração correta
  const currentRoute = (window.location.hash || "").replace("#", "");
  const isAmbiente1 = currentRoute.includes("ambiente1-conforto");
  
  // Atualizar o ID do AC para o ambiente atual
  AC_DEVICE_ID = getACDeviceIdForCurrentRoute();
  console.log(`🌡️ AC inicializado para ambiente: ${currentRoute}, Device ID: ${AC_DEVICE_ID}`);

  // Configurações específicas por ambiente - todos usam 18-25
  const tempConfig = { minTemp: 18, maxTemp: 25, defaultTemp: 22 };

  const state = {
    minTemp: tempConfig.minTemp,
    maxTemp: tempConfig.maxTemp,
    temperature: tempConfig.defaultTemp,
    mode: "cool", // Sempre cool
    powerOn: false,
    fanLevel: "medium",
    deviceId: AC_DEVICE_ID, // ID do dispositivo ar-condicionado (dinâmico)
  };

  // Configurações de modo - apenas Cool
  const modeConfig = {
    cool: {
      minTemp: tempConfig.minTemp,
      maxTemp: tempConfig.maxTemp,
      defaultTemp: tempConfig.defaultTemp,
      color: "rgba(59, 130, 246, 0.95)", // Azul
    },
  };

  // Timer para debounce da temperatura
  let temperatureDebounceTimer = null;

  const root = document.querySelector('[data-component="ac-control"]');

  if (!root) {
    console.warn(
      "Componente de controle de ar-condicionado não encontrado."
    );
    return;
  }

  const knobWrapper = root.querySelector('[data-role="knob"]');
  const knob = knobWrapper ? knobWrapper.querySelector(".ac-temp-knob") : null;
  const progressArc = root.querySelector('[data-role="progress-ring"]');
  const tempCurrent = root.querySelector('[data-role="temp-current"]');
  const tempPrev = root.querySelector('[data-role="temp-prev"]');
  const tempNext = root.querySelector('[data-role="temp-next"]');
  const liveRegion = root.querySelector('[data-role="temperature-live"]');
  const fanButtons = Array.from(root.querySelectorAll("[data-fan-button]"));
  const modeButtons = Array.from(root.querySelectorAll("[data-mode-button]"));
  const powerButton = root.querySelector('[data-role="power"]');
  const wrapper = root.querySelector(".ac-temp-wrapper");
  const temperatureSection = document.querySelector(".ac-temperature-section");

  if (!progressArc || !knob || !wrapper) {
    console.warn("Elementos essenciais do AC não encontrados");
    return;
  }

  if (!temperatureSection) {
    console.warn("SeÃƒÂ§ÃƒÂ£o de temperatura não encontrada");
  }

  // Constantes do arco
  const ARC_LENGTH = 251.2; // Comprimento aproximado do arco SVG path
  const ARC_START_ANGLE = 180; // Graus (esquerda)
  const ARC_END_ANGLE = 0; // Graus (direita)
  const ARC_RADIUS = 80; // Raio do arco no viewBox
  const ARC_CENTER_X = 100; // Centro X no viewBox
  const ARC_CENTER_Y = 100; // Centro Y no viewBox

  let geometry = calculateGeometry();
  let isDragging = false;
  // Controle de sincronizaÃƒÂ§ÃƒÂ£o inicial (evita UI desatualizada ao reentrar)
  let initialSyncDone = false;

  function calculateGeometry() {
    const rect = wrapper.getBoundingClientRect();
    const svgElement = progressArc.closest("svg");
    const svgRect = svgElement.getBoundingClientRect();
    const viewBox = svgElement?.viewBox?.baseVal;
    const vbWidth = viewBox ? viewBox.width : 200;
    const vbHeight = viewBox ? viewBox.height : 120;

    // O viewBox é 0 0 200 120
    // O arco path é: M 20,100 A 80,80 0 0,1 180,100
    // Isso significa que o centro do arco está em (100, 100) no viewBox
    // O raio é 80

    // Calcular a escala do SVG
    const scaleX = svgRect.width / vbWidth;
    const scaleY = svgRect.height / vbHeight;

    let arcLength = ARC_LENGTH;
    try {
      if (typeof progressArc.getTotalLength === "function") {
        arcLength = progressArc.getTotalLength();
      }
    } catch (error) {
      console.warn("Falha ao obter comprimento do arco", error);
    }

    let strokeWidth = 0;
    try {
      strokeWidth = parseFloat(
        window.getComputedStyle(progressArc).strokeWidth || "0"
      );
    } catch (error) {
      strokeWidth = 0;
    }

    const ctm =
      typeof progressArc.getScreenCTM === "function"
        ? progressArc.getScreenCTM()
        : typeof progressArc.getCTM === "function"
        ? progressArc.getCTM()
        : null;

    return {
      rect,
      svgRect,
      svgElement,
      viewBox: { width: vbWidth, height: vbHeight },
      // Centro do arco em coordenadas da página
      centerX: svgRect.left + 100 * scaleX, // X=100 no viewBox
      centerY: svgRect.top + 100 * scaleY, // Y=100 no viewBox
      radius: 80 * Math.min(scaleX, scaleY), // Ajusta para manter o raio coerente
      scaleX,
      scaleY,
      arcLength,
      strokeWidth,
      ctm,
    };
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function angleFromTemperature(temperature) {
    const ratio =
      (temperature - state.minTemp) / (state.maxTemp - state.minTemp);
    // 180Ã‚Â° (esquerda/18Ã‚Â°C) para 0Ã‚Â° (direita/30Ã‚Â°C)
    return 180 - ratio * 180;
  }

  function temperatureFromAngle(angle) {
    const ratio = (180 - angle) / 180;
    const temp = state.minTemp + ratio * (state.maxTemp - state.minTemp);
    return Math.round(clamp(temp, state.minTemp, state.maxTemp));
  }

  function updateKnobPosition(angle) {
    if (!knob || !progressArc) return;

    if (!geometry || !geometry.ctm) {
      geometry = calculateGeometry();
    }

    const ratio = clamp((180 - angle) / 180, 0, 1);
    const arcLength = geometry.arcLength ?? ARC_LENGTH;

    let svgPoint;
    try {
      const length = arcLength * ratio;
      svgPoint = progressArc.getPointAtLength(length);
    } catch (error) {
      svgPoint = null;
    }

    if (!svgPoint || !geometry.ctm) {
      // Fallback para trigonometria clÃƒÂ¡ssica
      const radians = (angle * Math.PI) / 180;
      const radius = geometry.radius;
      const x = geometry.centerX + radius * Math.cos(radians);
      const y = geometry.centerY - radius * Math.sin(radians);
      const wrapperRect = wrapper.getBoundingClientRect();

      knob.style.left = `${x - wrapperRect.left}px`;
      knob.style.top = `${y - wrapperRect.top}px`;
      knob.style.transform = "translate(-50%, -50%)";
      knob.classList.remove("is-hidden");
      return;
    }

    let screenPoint;
    const svgElement = geometry.svgElement;

    if (typeof DOMPoint === "function") {
      screenPoint = new DOMPoint(svgPoint.x, svgPoint.y).matrixTransform(
        geometry.ctm
      );
    } else if (svgElement && typeof svgElement.createSVGPoint === "function") {
      const point = svgElement.createSVGPoint();
      point.x = svgPoint.x;
      point.y = svgPoint.y;
      screenPoint = point.matrixTransform(geometry.ctm);
    } else {
      return;
    }

    const wrapperRect = wrapper.getBoundingClientRect();
    const relativeX = screenPoint.x - wrapperRect.left;
    const relativeY = screenPoint.y - wrapperRect.top;

    knob.style.left = `${relativeX}px`;
    knob.style.top = `${relativeY}px`;
    knob.style.transform = "translate(-50%, -50%)";
    knob.classList.remove("is-hidden");
  }

  function updateProgress(angle) {
    if (!progressArc) return;

    // Calcula o progresso (0 a 1)
    const progress = clamp((180 - angle) / 180, 0, 1);
    const arcLength = geometry.arcLength ?? ARC_LENGTH;
    // Offset: comeÃƒÂ§a cheio e vai diminuindo conforme progride
    const offset = arcLength - progress * arcLength;

    let dashOffset;
    if (progress <= 0) {
      dashOffset = arcLength + (geometry.strokeWidth || 0) + 1;
    } else if (progress >= 1) {
      dashOffset = 0;
    } else {
      dashOffset = Math.max(0, Math.min(arcLength, offset));
    }

    progressArc.style.strokeDasharray = arcLength;
    progressArc.style.strokeDashoffset = dashOffset;
  }

  function updateTemperatureDisplay() {
    if (!tempCurrent) return;

    const temp = state.temperature;

    // Atualiza temperatura atual
    tempCurrent.textContent = temp;

    // Atualiza temperatura anterior
    if (tempPrev) {
      if (temp > state.minTemp) {
        tempPrev.textContent = temp - 1;
        tempPrev.style.opacity = "1";
        tempPrev.style.visibility = "visible";
      } else {
        // Se é a temperatura mÃƒÂ­nima, esconde o anterior
        tempPrev.style.opacity = "0";
        tempPrev.style.visibility = "hidden";
      }
    }

    // Atualiza temperatura seguinte
    if (tempNext) {
      if (temp < state.maxTemp) {
        tempNext.textContent = temp + 1;
        tempNext.style.opacity = "1";
        tempNext.style.visibility = "visible";
      } else {
        // Se é a temperatura mÃƒÂ¡xima, esconde o seguinte
        tempNext.style.opacity = "0";
        tempNext.style.visibility = "hidden";
      }
    }
  }

  function updateTemperature(newTemp, options = {}) {
    const temperature = clamp(newTemp, state.minTemp, state.maxTemp);
    const angle = angleFromTemperature(temperature);

    state.temperature = temperature;

    if (liveRegion) {
      liveRegion.textContent = `Temperatura ajustada para ${temperature} graus.`;
    }

    updateKnobPosition(angle);
    updateProgress(angle);
    updateTemperatureDisplay();

    // Limpa o timer anterior se existir
    if (temperatureDebounceTimer) {
      clearTimeout(temperatureDebounceTimer);
    }

    // Configura novo timer de 1.5 segundos para enviar comando
    if (state.powerOn && !options.silent) {
      temperatureDebounceTimer = setTimeout(() => {
        const tempCommand = `temp${state.temperature}`;
        console.log(
          `Enviando comando de temperatura após 1.5s: ${tempCommand}`
        );
        
        // Para AC Living, enviar para o AC correto e salvar estado
        if (isLivingAC && livingSelectedAC) {
          const acIds = {
            living1: "167",
            living2: "166",
            livingBoth: ["167", "166"]
          };
          const selectedIds = acIds[livingSelectedAC];
          
          if (Array.isArray(selectedIds)) {
            // Enviar para múltiplos ACs (Ambos)
            selectedIds.forEach(id => {
              sendHubitatCommand(id, tempCommand);
            });
            // Salvar temperatura em ambos
            livingACStates.living1.temperature = state.temperature;
            livingACStates.living2.temperature = state.temperature;
            console.log(`🌡️ AC Living: Temperatura ${state.temperature}°C enviada para AMBOS`);
          } else {
            sendHubitatCommand(selectedIds, tempCommand);
            // Salvar temperatura do AC individual
            livingACStates[livingSelectedAC].temperature = state.temperature;
            console.log(`🌡️ AC Living: Temperatura ${state.temperature}°C enviada para ${livingSelectedAC}`);
          }
        } else {
          // AC normal (não Living)
          sendHubitatCommand(state.deviceId, tempCommand);
        }
        
        temperatureDebounceTimer = null;
      }, 1500);
    }
  }

  function getAngleFromPointer(event) {
    const pointerX =
      event.clientX ?? (event.touches && event.touches[0]?.clientX);
    const pointerY =
      event.clientY ?? (event.touches && event.touches[0]?.clientY);

    if (typeof pointerX !== "number" || typeof pointerY !== "number") {
      return null;
    }

    // Calcula a posição relativa ao centro do arco
    const deltaX = pointerX - geometry.centerX;
    const deltaY = geometry.centerY - pointerY; // INVERTIDO: centerY - pointerY (para cima é positivo)

    // Calcula o ângulo em radianos, depois converte para graus
    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    // Normaliza para 0-360
    if (angle < 0) angle += 360;

    // Limita ao arco superior (0Ã‚Â° a 180Ã‚Â°)
    // 0Ã‚Â° = direita, 90Ã‚Â° = cima, 180Ã‚Â° = esquerda
    // Queremos apenas o arco superior, entÃƒÂ£o limitamos ÃƒÂ¢ngulos > 180Ã‚Â°
    if (angle > 180) {
      // Se está fora do arco superior, mapeia para a extremidade mais prÃƒÂ³xima
      angle = angle > 270 ? 0 : 180;
    }

    return angle;
  }

  function handlePointerMove(event) {
    if (!state.powerOn || !isDragging) return;

    const angle = getAngleFromPointer(event);
    if (angle !== null) {
      const temperature = temperatureFromAngle(angle);
      updateTemperature(temperature);
    }
  }

  function startDragging(event) {
    if (!state.powerOn) return;

    event.preventDefault();
    isDragging = true;
    geometry = calculateGeometry();

    if (knob) {
      knob.classList.add("is-active");
    }

    handlePointerMove(event);

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", stopDragging);
    document.addEventListener("pointercancel", stopDragging);
  }

  function stopDragging() {
    isDragging = false;

    if (knob) {
      knob.classList.remove("is-active");
    }

    // Comando de temperatura agora é enviado via debounce em updateTemperature()
    // não precisa mais enviar aqui

    document.removeEventListener("pointermove", handlePointerMove);
    document.removeEventListener("pointerup", stopDragging);
    document.removeEventListener("pointercancel", stopDragging);
  }

  function setFanLevel(level) {
    if (!fanLevels.includes(level)) {
      return;
    }

    state.fanLevel = level;
    root.dataset.fanLevel = level;

    fanButtons.forEach((button) => {
      const isActive = button.dataset.fan === level;
      button.setAttribute("aria-pressed", isActive.toString());
    });
  }

  function setMode(mode) {
    if (!modeConfig[mode]) return;

    state.mode = mode;
    root.dataset.mode = mode;

    // NÃƒÆ’O envia comando para o Hubitat (modo fixo em Cool)
    // sendHubitatCommand(state.deviceId, mode);

    // Atualiza os limites de temperatura conforme o modo
    const config = modeConfig[mode];
    state.minTemp = config.minTemp;
    state.maxTemp = config.maxTemp;

    // Define a temperatura padrÃƒÂ£o do modo
    state.temperature = config.defaultTemp;

    // Atualiza a cor do arco de progresso e knob
    updateModeColors(config.color);

    // Atualiza os botÃƒÂµes de modo
    modeButtons.forEach((button) => {
      const isActive = button.dataset.mode === mode;
      button.setAttribute("aria-pressed", isActive.toString());
    });

    // Atualiza a temperatura com os novos limites
    updateTemperature(state.temperature);
  }

  function updateModeColors(color) {
    if (!progressArc) return;

    // Atualiza a cor do arco de progresso
    progressArc.style.stroke = color;

    // Atualiza a cor do glow do arco
    if (color.includes("59, 130, 246")) {
      // Azul (cool)
      progressArc.style.filter = "drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))";
    } else if (color.includes("249, 115, 22")) {
      // Laranja (heat)
      progressArc.style.filter = "drop-shadow(0 0 8px rgba(249, 115, 22, 0.5))";
    } else {
      // Branco (auto)
      progressArc.style.filter =
        "drop-shadow(0 0 8px rgba(255, 255, 255, 0.5))";
    }
  }

  function setPowerState(isOn, options = {}) {
    state.powerOn = isOn;
    console.log(
      "setPowerState chamado:",
      isOn,
      "temperatureSection:",
      temperatureSection
    );

    // Envia comando para o Hubitat (a menos que esteja em modo silencioso)
    if (!options.silent) {
      const command = isOn ? "on" : "off";
      sendHubitatCommand(state.deviceId, command);
    }

    if (powerButton) {
      powerButton.setAttribute("aria-pressed", isOn.toString());
      powerButton.setAttribute(
        "aria-label",
        isOn ? "Desligar o ar-condicionado" : "Ligar o ar-condicionado"
      );
    }

    modeButtons.forEach((button) => {
      // Para AC Living, não desabilita os botões de seleção (I, II, Ambos)
      const mode = button.dataset.mode;
      if (mode === 'living1' || mode === 'living2' || mode === 'livingBoth') {
        return; // Não desabilita esses botões
      }
      button.toggleAttribute("disabled", !isOn);
    });

    fanButtons.forEach((button) => {
      button.toggleAttribute("disabled", !isOn);
    });

    // Desabilita os botÃƒÂµes de aleta quando o AC está desligado
    aletaButtons.forEach((button) => {
      button.toggleAttribute("disabled", !isOn);
    });

    root.toggleAttribute("data-power-off", !isOn);

    // Controla o fade in/out do seletor de temperatura
    if (temperatureSection) {
      if (isOn) {
        console.log("Removendo power-off");
        temperatureSection.classList.add("power-on");
      } else {
        console.log("Adicionando power-off");
        temperatureSection.classList.remove("power-on");
      }
    }
  }

  function togglePower() {
    setPowerState(!state.powerOn);
  }

  // Event listeners
  if (knob) {
    knob.addEventListener("pointerdown", startDragging);
  }

  fanButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!state.powerOn) return;
      const level = button.dataset.fan;
      if (level) {
        setFanLevel(level);
      }
    });
  });

  // Verifica se é AC Living antes de adicionar handlers de modo
  const isLivingAC = root.hasAttribute('data-ac-living');
  let livingSelectedAC = null; // null, 'living1', 'living2', 'livingBoth'
  
  // ========================================
  // ESTADOS INDIVIDUAIS DOS ACs DO LIVING
  // ========================================
  // Cada AC tem seu próprio estado (power e temperatura)
  const livingACStates = {
    living1: { powerOn: false, temperature: 22 },  // AC I (ID 167)
    living2: { powerOn: false, temperature: 22 }   // AC II (ID 166)
  };
  
  // Função para atualizar o UI com o estado do AC selecionado
  function updateUIForSelectedAC(selectedMode) {
    if (selectedMode === 'livingBoth') {
      // Para "Ambos", mostrar estado combinado
      const ac1On = livingACStates.living1.powerOn;
      const ac2On = livingACStates.living2.powerOn;
      const bothOn = ac1On && ac2On;
      
      // Se ambos estão ligados, mostrar média das temperaturas
      // Se não, mostrar OFF
      state.powerOn = bothOn;
      if (bothOn) {
        state.temperature = Math.round((livingACStates.living1.temperature + livingACStates.living2.temperature) / 2);
      } else {
        state.temperature = 22; // Padrão
      }
    } else {
      // Para AC individual, mostrar seu estado salvo
      const acState = livingACStates[selectedMode];
      state.powerOn = acState.powerOn;
      state.temperature = acState.temperature;
    }
    
    // Atualizar UI visual
    if (powerButton) {
      powerButton.setAttribute("aria-pressed", state.powerOn.toString());
    }
    
    const angle = angleFromTemperature(state.temperature);
    updateKnobPosition(angle);
    updateProgress(angle);
    updateTemperatureDisplay();
    
    if (temperatureSection) {
      if (state.powerOn) {
        temperatureSection.classList.add("power-on");
      } else {
        temperatureSection.classList.remove("power-on");
      }
    }
    root.toggleAttribute("data-power-off", !state.powerOn);
    
    // Habilitar/desabilitar botões de aleta
    aletaButtons.forEach((btn) => {
      btn.toggleAttribute("disabled", !state.powerOn);
    });
    
    console.log(`🔄 AC Living: UI atualizada para ${selectedMode}`, { power: state.powerOn, temp: state.temperature });
  }
  
  // Função para salvar estado do AC atual
  function saveLivingACState() {
    if (!livingSelectedAC || livingSelectedAC === 'livingBoth') return;
    
    livingACStates[livingSelectedAC].powerOn = state.powerOn;
    livingACStates[livingSelectedAC].temperature = state.temperature;
    console.log(`💾 AC Living: Estado salvo para ${livingSelectedAC}`, livingACStates[livingSelectedAC]);
  }
  // ========================================

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.mode;
      
      // Para AC Living, os botões de seleção funcionam mesmo com power off
      if (isLivingAC && (mode === 'living1' || mode === 'living2' || mode === 'livingBoth')) {
        // Se clicar no mesmo botão já ativo, desativa
        if (livingSelectedAC === mode) {
          // Salvar estado antes de desativar
          saveLivingACState();
          
          livingSelectedAC = null;
          button.setAttribute('aria-pressed', 'false');
          
          // Desabilita power novamente
          if (powerButton) {
            powerButton.classList.add('ac-command-btn--disabled');
            powerButton.disabled = true;
          }
        } else {
          // ========================================
          // SALVAR ESTADO DO AC ATUAL E CARREGAR O NOVO
          // ========================================
          // Salvar estado do AC anterior (se houver)
          saveLivingACState();
          
          // Desativa todos os outros e ativa o clicado
          modeButtons.forEach(btn => {
            btn.setAttribute('aria-pressed', 'false');
          });
          
          livingSelectedAC = mode;
          button.setAttribute('aria-pressed', 'true');
          
          // Carregar e mostrar estado do AC selecionado
          updateUIForSelectedAC(mode);
          
          console.log(`🔄 AC Living: Trocando para ${mode}`);
          // ========================================
          
          // Habilita o botão power
          if (powerButton) {
            powerButton.classList.remove('ac-command-btn--disabled');
            powerButton.disabled = false;
          }
        }
        return; // Não executa a lógica padrão de modo
      }
      
      // Lógica padrão para outros ACs
      if (!state.powerOn) return;
      if (mode) {
        setMode(mode);
      }
    });
  });

  if (powerButton) {
    powerButton.addEventListener("click", togglePower);
  }

  // BotÃƒÂµes de aleta
  const aletaButtons = Array.from(root.querySelectorAll("[data-aleta-button]"));

  function setAletaState(aleta) {
    if (!state.powerOn) return;

    aletaButtons.forEach((btn) => {
      const isActive = btn.dataset.aleta === aleta;
      btn.setAttribute("aria-pressed", isActive.toString());
    });

    // Envia comandos para o Hubitat (modo Cool fixo)
    if (aleta === "moving") {
      console.log("ALETA MOVIMENTO: Executando comando swingOn (mover aletas)");
      sendHubitatCommand(state.deviceId, "swingOn");
    } else if (aleta === "windfree") {
      console.log("WINDFREE: Executando comando windfree");
      sendHubitatCommand(state.deviceId, "windfree");
    } else if (aleta === "parada") {
      console.log("ALETA PARADA: Executando comando swingOff (parar aletas)");
      sendHubitatCommand(state.deviceId, "swingOff");
    }
  }

  aletaButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!state.powerOn) return;
      setAletaState(btn.dataset.aleta);
    });
  });

  // === Lógica específica para AC Living (2 ACs: I, II, Ambos) ===
  if (isLivingAC) {
    // Estado inicial: nenhum AC selecionado, power desabilitado
    if (powerButton) {
      powerButton.classList.add('ac-command-btn--disabled');
      powerButton.disabled = true;
    }

    // Sobrescreve o togglePower para usar o AC selecionado
    const livingTogglePower = () => {
      if (!livingSelectedAC) {
        console.log("AC Living: Nenhum AC selecionado");
        return;
      }
      
      // IDs dos ACs do Living
      const acIds = {
        living1: "167", // AC I
        living2: "166", // AC II
        livingBoth: ["167", "166"] // Ambos
      };
      
      const selectedIds = acIds[livingSelectedAC];
      const newPowerState = !state.powerOn;
      const command = newPowerState ? "on" : "off";
      
      if (Array.isArray(selectedIds)) {
        // Enviar para múltiplos ACs (Ambos)
        selectedIds.forEach(id => {
          sendHubitatCommand(id, command);
        });
        // Atualizar estados de ambos os ACs
        livingACStates.living1.powerOn = newPowerState;
        livingACStates.living2.powerOn = newPowerState;
        console.log(`⚡ AC Living: Comando ${command} enviado para AMBOS os ACs`);
      } else {
        sendHubitatCommand(selectedIds, command);
        // Salvar estado do AC individual
        livingACStates[livingSelectedAC].powerOn = newPowerState;
        console.log(`⚡ AC Living: Comando ${command} enviado para ${livingSelectedAC}`);
      }
      
      // Atualiza estado visual
      state.powerOn = newPowerState;
      if (powerButton) {
        powerButton.setAttribute("aria-pressed", state.powerOn.toString());
      }
      
      // Habilita/desabilita botões de aleta
      aletaButtons.forEach((button) => {
        button.toggleAttribute("disabled", !state.powerOn);
      });
      
      // Atualiza atributo data-power-off no root
      root.toggleAttribute("data-power-off", !state.powerOn);
      
      if (temperatureSection) {
        if (state.powerOn) {
          temperatureSection.classList.add("power-on");
        } else {
          temperatureSection.classList.remove("power-on");
        }
      }
    };
    
    // Remove listener antigo e adiciona novo
    if (powerButton) {
      powerButton.removeEventListener("click", togglePower);
      powerButton.addEventListener("click", livingTogglePower);
    }
  }
  // === Fim da lógica específica do AC Living ===

  window.addEventListener("resize", () => {
    geometry = calculateGeometry();
    const angle = angleFromTemperature(state.temperature);
    updateKnobPosition(angle);
    updateProgress(angle);
  });

  // Inicializa (sem enviar comandos no primeiro render)
  setPowerState(state.powerOn, { silent: true });
  setMode(state.mode);
  setFanLevel(state.fanLevel);
  updateTemperature(state.temperature, { silent: true });

  // Recalcula geometria apÃƒÂ³s renderizaÃƒÂ§ÃƒÂ£o inicial (mÃƒÂºltiplas tentativas para garantir)
  const recalculate = () => {
    geometry = calculateGeometry();
    const angle = angleFromTemperature(state.temperature);
    updateKnobPosition(angle);
    updateProgress(angle);
  };

  setTimeout(recalculate, 50);
  setTimeout(recalculate, 150);
  setTimeout(recalculate, 300);

  // Fallback: buscar estado completo via /polling e aplicar valores ausentes
  async function applyACFromPolling({
    needPower = true,
    needTemp = true,
    needFan = true,
  } = {}) {
    try {
      const url = `/polling?devices=${encodeURIComponent(AC_DEVICE_ID)}`;
      const resp = await fetch(url, { cache: "no-store" });
      if (!resp.ok) return;
      const payload = await resp.json();
      const list = Array.isArray(payload?.data) ? payload.data : [];
      const device = list.find((d) => String(d?.id) === String(AC_DEVICE_ID));
      if (!device) return;

      // Normaliza atributos para um mapa { name: value }
      let attrsMap = {};
      if (Array.isArray(device.attributes)) {
        device.attributes.forEach((a) => {
          if (!a || !a.name) return;
          const key = String(a.name).toLowerCase();
          const v = a.currentValue ?? a.value;
          attrsMap[key] = v;
        });
      } else if (device.attributes && typeof device.attributes === "object") {
        Object.keys(device.attributes).forEach((k) => {
          attrsMap[String(k).toLowerCase()] = device.attributes[k];
        });
      }

      let applied = false;
      // PotÃƒÂªncia
      if (needPower) {
        const sw = String(attrsMap["switch"] ?? "").toLowerCase();
        if (sw) {
          setPowerState(sw === "on", { silent: true });
          applied = true;
        }
      }

      // Temperatura / setpoint
      if (needTemp) {
        let t =
          attrsMap["coolingsetpoint"] ??
          attrsMap["thermostatsetpoint"] ??
          attrsMap["setpoint"] ??
          attrsMap["temperature"];
        if (typeof t === "string") {
          const m = t.match(/(-?\d{1,2})/);
          if (m) t = parseInt(m[1], 10);
        }
        if (typeof t === "number" && !Number.isNaN(t)) {
          updateTemperature(Math.round(t), { silent: true });
          applied = true;
        }
      }

      // VentilaÃƒÂ§ÃƒÂ£o
      if (needFan) {
        let f =
          attrsMap["thermostatfanmode"] ??
          attrsMap["fan"] ??
          attrsMap["fanlevel"];
        if (typeof f === "string") {
          const val = f.toLowerCase();
          const mapped =
            val === "med" || val === "mid" || val === "auto"
              ? "medium"
              : val === "min"
              ? "low"
              : val === "max"
              ? "high"
              : val;
          if (["low", "medium", "high"].includes(mapped)) {
            setFanLevel(mapped);
            applied = true;
          }
        } else if (typeof f === "number") {
          if (f <= 1) {
            setFanLevel("low");
            applied = true;
          } else if (f === 2) {
            setFanLevel("medium");
            applied = true;
          } else if (f >= 3) {
            setFanLevel("high");
            applied = true;
          }
        }
      }

      recalculate();
      if (applied) initialSyncDone = true;
    } catch (e) {
      console.warn("Falha no fallback de polling do AC:", e);
    }
  }

  // Buscar ÃƒÂºltimo status do AC via webhook e aplicar na UI (modo silencioso)
  (async function syncFromWebhook() {
    try {
      const resp = await fetch("/webhook/eletr1z33333d4sh/status", {
        cache: "no-store",
      });
      if (!resp.ok) return;
      const data = await resp.json();
      const evt = data && data.lastACStatus;
      if (!evt) {
        return applyACFromPolling({
          needPower: true,
          needTemp: true,
          needFan: true,
        });
      }

      // Verifica se corresponde ao nosso dispositivo (quando presente)
      if (evt.deviceId && String(evt.deviceId) !== String(AC_DEVICE_ID)) {
        return applyACFromPolling({
          needPower: true,
          needTemp: true,
          needFan: true,
        });
      }

      const name = (evt.name || "").toLowerCase();
      const rawVal = evt.value;
      const val = (
        rawVal !== undefined && rawVal !== null ? String(rawVal) : ""
      ).toLowerCase();

      let desiredPower = null;
      let desiredTemp = null;
      let desiredFan = null;
      let desiredMode = null;

      // PotÃƒÂªncia
      if (
        name === "switch" ||
        name === "power" ||
        name === "ac" ||
        name === "acpower"
      ) {
        desiredPower = val === "on" || val === "true" || val === "1";
      }

      // Temperatura / setpoint
      if (name.includes("temp") || name.includes("setpoint")) {
        const m = val.match(/(-?\d{1,2})/);
        if (m) {
          const t = parseInt(m[1], 10);
          if (!Number.isNaN(t)) desiredTemp = t;
        } else if (typeof rawVal === "number") {
          desiredTemp = Math.round(rawVal);
        }
      }

      // VentilaÃƒÂ§ÃƒÂ£o
      if (name.includes("fan")) {
        if (
          [
            "low",
            "medium",
            "med",
            "mid",
            "high",
            "auto",
            "min",
            "max",
          ].includes(val)
        ) {
          desiredFan =
            val === "med" || val === "mid" || val === "auto"
              ? "medium"
              : val === "min"
              ? "low"
              : val === "max"
              ? "high"
              : val;
        } else {
          const n = parseInt(val, 10);
          if (!Number.isNaN(n)) {
            if (n <= 1) desiredFan = "low";
            else if (n === 2) desiredFan = "medium";
            else if (n >= 3) desiredFan = "high";
          }
        }
      }

      // Modo (o UI suporta apenas 'cool' visualmente)
      if (name.includes("mode")) {
        desiredMode = "cool";
      }

      // Aplica incrementos do evento (se houver), por cima do persistido
      if (desiredMode) setMode(desiredMode);
      if (typeof desiredTemp === "number")
        updateTemperature(desiredTemp, { silent: true });
      if (desiredFan) setFanLevel(desiredFan);
      if (desiredPower !== null)
        setPowerState(!!desiredPower, { silent: true });

      // Se faltou algum dado, completa pelo polling
      const needPower = desiredPower === null;
      const needTemp = !(typeof desiredTemp === "number");
      const needFan = !desiredFan;
      if (needPower || needTemp || needFan) {
        await applyACFromPolling({ needPower, needTemp, needFan });
      }

      // Recalcula posiÃƒÂ§ÃƒÂ£o do knob apÃƒÂ³s aplicar
      recalculate();
    } catch (e) {
      console.warn("Falha ao sincronizar AC via webhook:", e);
    }
  })();

  // Garantir sincronizaÃƒÂ§ÃƒÂ£o: tenta também via polling apÃƒÂ³s um pequeno atraso
  setTimeout(() => {
    try {
      applyACFromPolling({ needPower: true, needTemp: true, needFan: true });
    } catch (_) {}
  }, 1200);
}

// === FIM DO CONTROLADOR DE AR CONDICIONADO ===

// Normalize mis-encoded Portuguese accents across the UI
window.normalizeAccents = function normalizeAccents(root) {
  try {
    const map = new Map([
      ["EscritÃ¯Â¿Â½Ã¯Â¿Â½rio", "EscritÃƒÂ³rio"],
      ["ProgramaÃ¯Â¿Â½Ã¯Â¿Â½Ã‡Å“o", "ProgramaÃƒÂ§ÃƒÂ£o"],
      ["RecepÃ¯Â¿Â½Ã¯Â¿Â½Ã‡Å“o", "RecepÃƒÂ§ÃƒÂ£o"],
      ["RefeitÃ¯Â¿Â½Ã¯Â¿Â½rio", "RefeitÃƒÂ³rio"],
      ["FuncionÃ‡Â­rios", "FuncionÃƒÂ¡rios"],
      ["IluminaÃ¯Â¿Â½Ã¯Â¿Â½o", "IluminaÃƒÂ§ÃƒÂ£o"],
      ["IluminaÃ¯Â¿Â½Ã¯Â¿Â½Ã‡Å“o", "IluminaÃƒÂ§ÃƒÂ£o"],
      ["PainÃ‡Â¸is", "Painéis"],
      ["ArmÃ‡Â­rio", "ArmÃƒÂ¡rio"],
      ["AmbientÃ‡Å“o", "Ambiente"],
    ]);
    const selector = ".page-title, .room-control-label, .room-card span";
    const scope = root || document;
    scope.querySelectorAll(selector).forEach((el) => {
      const before = el.textContent || "";
      let after = before;
      map.forEach((val, key) => {
        if (after.includes(key)) after = after.replaceAll(key, val);
      });
      if (after !== before) el.textContent = after;
    });
  } catch (_) {}
};

// --- FunÃƒÂ§ÃƒÂµes para a página do EscritÃƒÂ³rio ---

function toggleDevice(el, deviceType) {
  const img = el.querySelector(".control-icon");
  const stateEl = el.querySelector(".control-state");
  const currentState = el.dataset.state;
  let newState;
  let newLabel;

  const icons = {
    light: {
      on: "images/icons/icon-small-light-on.svg",
      off: "images/icons/icon-small-light-off.svg",
    },
    tv: {
      on: "images/icons/icon-small-tv-on.svg",
      off: "images/icons/icon-small-tv-off.svg",
    },
    shader: {
      on: "images/icons/icon-small-shader-on.svg",
      off: "images/icons/icon-small-shader-off.svg",
    },
  };

  if (!icons[deviceType]) return;

  let deviceId = el.dataset.deviceId || null;
  // Fallback por label para compatibilidade
  if (!deviceId) {
    const controlLabel = el
      .querySelector(".control-label")
      ?.textContent?.trim();
    if (controlLabel === "Pendente") {
      deviceId = "102";
    } else if (controlLabel === "Trilho") {
      deviceId = "101";
    }
  }

  if (currentState === "off" || currentState === "closed") {
    newState = "on";
    newLabel = deviceType === "shader" ? "Abertas" : "ON";
    img.src = icons[deviceType].on;
    if (deviceId) sendHubitatCommand(deviceId, "on");
  } else {
    newState = deviceType === "shader" ? "closed" : "off";
    newLabel = deviceType === "shader" ? "Fechadas" : "OFF";
    img.src = icons[deviceType].off;
    if (deviceId) sendHubitatCommand(deviceId, "off");
  }

  el.dataset.state = newState;
  if (stateEl) stateEl.textContent = newLabel;
}

// (removido) setupThermostat: não utilizado apÃƒÂ³s retirada da página "escritorio"

// --- Controle do Hubitat ---

async function brutalCacheClear() {
  const confirmationMessage =
    "Deseja realmente limpar todo o cache do aplicativo? Isso ira recarregar a pagina.";

  if (!window.confirm(confirmationMessage)) {
    console.log("Limpeza manual de cache cancelada pelo usuario.");
    return;
  }

  console.log("Iniciando limpeza manual de cache.");

  if (typeof showMobileDebug === "function") {
    showMobileDebug("Limpando cache...", "info");
  }

  const criticalKeys = ["hubitat_host", "hubitat_token"];
  const backup = {};

  try {
    criticalKeys.forEach((key) => {
      const value = localStorage.getItem(key);
      if (value !== null) {
        backup[key] = value;
      }
    });

    localStorage.clear();

    Object.keys(backup).forEach((key) => {
      localStorage.setItem(key, backup[key]);
    });
  } catch (error) {
    console.warn("Erro ao limpar localStorage:", error);
  }

  try {
    sessionStorage.clear();
  } catch (error) {
    console.warn("Erro ao limpar sessionStorage:", error);
  }

  if ("caches" in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    } catch (error) {
      console.warn("Erro ao limpar caches do navegador:", error);
    }
  }

  if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => registration.unregister())
      );
    } catch (error) {
      console.warn("Erro ao remover service workers:", error);
    }
  }

  try {
    const timestamp = Date.now();
    const cacheBuster =
      timestamp.toString() + "_" + Math.random().toString(36).substring(2, 10);

    localStorage.setItem("last_cache_clear", timestamp.toString());
    localStorage.setItem("app_cache_version", cacheBuster);
  } catch (error) {
    console.warn("Erro ao atualizar metadados de cache:", error);
  }

  if (typeof showMobileDebug === "function") {
    showMobileDebug("Cache limpo. Recarregando...", "success");
  }

  setTimeout(() => {
    window.location.reload();
  }, 400);
}

window.brutalCacheClear = brutalCacheClear;
const isProductionOriginal = !["localhost", "127.0.0.1", "::1"].includes(
  location.hostname
);
// TEMPORÃƒÂRIO: ForÃƒÂ§ar produÃƒÂ§ÃƒÂ£o para debug mobile
const isProduction = true;
console.log("Ã°Å¸â€Â DEBUG PRODUÇÃO’O (FORÇADO):", {
  hostname: location.hostname,
  isProductionOriginal: isProductionOriginal,
  isProduction: isProduction,
  isMobile:
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ),
});

// Detectar dispositivos mÃƒÂ³veis
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

// SOLUÃƒâ€¡ÃƒÆ’O: Desabilitar console.log em mobile para evitar travamentos
const ENABLE_DEBUG_LOGS = true; // Logs habilitados em desktop e mobile

// Sistema de detecção de cache desatualizado para mobile (TEMPORARIAMENTE DESABILITADO)
const APP_VERSION = "1.0.6"; // cache/version marker
(function () {
  if (false && isMobile) {
    // DESABILITADO para debug
    try {
      var lastVersion = localStorage.getItem("app_version");
      var lastLoad = localStorage.getItem("last_mobile_load");
      var now = new Date().getTime();

      // SÃƒÂ³ recarregar se versão realmente mudou (não por tempo)
      if (lastVersion && lastVersion !== APP_VERSION) {
        console.log(
          "Ã°Å¸â€œÂ± Nova versão detectada - forÃƒÂ§ando reload cache"
        );
        console.log(
          "Ã°Å¸â€œÂ± Versão anterior:",
          lastVersion,
          "Nova:",
          APP_VERSION
        );

        // Marcar que jÃƒÂ¡ foi recarregado para esta versão
        localStorage.setItem("app_version", APP_VERSION);
        localStorage.setItem("last_mobile_load", now.toString());
        localStorage.setItem("reload_done_" + APP_VERSION, "true");

        // Limpar caches exceto os marcadores de versão
        var itemsToKeep = [
          "app_version",
          "last_mobile_load",
          "reload_done_" + APP_VERSION,
        ];
        var keysToRemove = [];
        for (var i = 0; i < localStorage.length; i++) {
          var key = localStorage.key(i);
          if (
            key &&
            !itemsToKeep.includes(key) &&
            !key.startsWith("reload_done_")
          ) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));

        // ForÃƒÂ§ar reload apenas se não foi feito ainda para esta versão
        if (!localStorage.getItem("reload_done_" + APP_VERSION)) {
          setTimeout(function () {
            console.log(
              "Ã°Å¸â€œÂ± Recarregando página para nova versão..."
            );
            window.location.reload(true);
          }, 2000);
          return; // não continuar inicialização
        }
      } else {
        // Primeira vez ou mesma versão - continuar normalmente
        localStorage.setItem("app_version", APP_VERSION);
        localStorage.setItem("last_mobile_load", now.toString());
        console.log("Ã°Å¸â€œÂ± Mobile cache OK - versão", APP_VERSION);
      }
    } catch (e) {
      console.warn(
        "Ã°Å¸â€œÂ± Erro na verificaÃƒÂ§ÃƒÂ£o de versão mobile:",
        e
      );
    }
  }
})();

// Função de log segura para mobile
function safeLog() {
  if (ENABLE_DEBUG_LOGS && typeof console !== "undefined" && console.log) {
    try {
      console.log.apply(console, arguments);
    } catch (e) {
      // Silenciar se console falhar
    }
  }
}

// Sistema de debug visual para mobile (DESABILITADO - compatibilidade resolvida)
function showMobileDebug(message, type) {
  // Debug desabilitado - funcionalidade mobile estável
  return;
}

// Substituir console.log globalmente para mobile
if (!ENABLE_DEBUG_LOGS) {
  // Criar console mock silencioso para mobile
  window.console = window.console || {};
  window.console.log = function () {};
  window.console.error = function () {};
  window.console.warn = function () {};
}

// Debug mÃƒÂ­nimo apenas se necessÃƒÂ¡rio
if (ENABLE_DEBUG_LOGS) {
  safeLog("=== DASHBOARD ELETRIZE DEBUG ===");
  safeLog("Ã°Å¸â€Â isProduction:", isProduction, "isMobile:", isMobile);
}

safeLog("=== AMBIENTE DETECTADO ===", {
  isProduction,
  isMobile,
  isIOS,
  userAgent: navigator.userAgent.substring(0, 60) + "...",
});
const HUBITAT_PROXY_URL = "/hubitat-proxy";
const POLLING_URL = "/polling";
window.musicPlayerUI = window.musicPlayerUI || {};

// Hubitat Cloud (Maker API) configuration
const HUBITAT_CLOUD_ENABLED = true;
const HUBITAT_CLOUD_APP_BASE_URL =
  "https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/15";
const HUBITAT_CLOUD_ACCESS_TOKEN = "1d9b367b-e4cd-4042-b726-718b759a82ef";
const HUBITAT_CLOUD_DEVICES_BASE_URL = `${HUBITAT_CLOUD_APP_BASE_URL}/devices`;
const HUBITAT_CLOUD_DEVICE_IDS = new Set(["109", "115", "116", "119"]);

function useHubitatCloud(deviceId) {
  return (
    HUBITAT_CLOUD_ENABLED &&
    deviceId !== undefined &&
    HUBITAT_CLOUD_DEVICE_IDS.has(String(deviceId))
  );
}

// ========================================
// DISPOSITIVOS COM COMANDO INITIALIZE
// ========================================
// IDs dos dispositivos que possuem o comando "initialize"
// Devem ser inicializados durante o loading para garantir funcionamento
const DEVICES_WITH_INITIALIZE = [
  // 🎵 ÁUDIO (Denon AVR + HEOS)
  "15",   // Varanda Denon (Denon AVR)
  "29",   // Varanda Denon (HEOS Speaker)
  "198",  // Denon Living
  
  // ⌨️ KEYPADS (Controlart - Xport - IVOLV)
  "19",   // KP 14 4X3 - 60-19-B0
  "30",   // KP 01 3X3 - 3D-23-84
  "34",   // KP 02 4X3 - 64-31-A7
  "39",   // KP 03 3X3 - 46-F4-32
  "43",   // KP 04 4X3 - 45-6D-3A
  "48",   // KP 05 3X3 - 08-E9-EE
  "56",   // KP 07 3X3 - 72-08-E3
  "60",   // KP 08 3X3 - 0A-06-B0
  "64",   // KP 09 3X3 - 77-F9-77
  "69",   // KP 10 3x3 - 33-17-50
  "74",   // KP 11 3X3 - 24-45-31
  "79",   // KP 12 3X3 - 10-FD-01
  
  // 🪟 CORTINAS (Controlart - Xport - Curtain Controller)
  "109",  // Varanda Cortinas Gourmet
  "115",  // Varanda Cortina Esquerda
  "116",  // Varanda Cortina Direita
  "119",  // Living Cortina
  "161",  // Piscina Deck
  "162",  // Piscina Toldo
  
  // ❄️ AR CONDICIONADO (ControlArt - Xport - IR para AC)
  "110",  // Varanda AC
  "166",  // Jantar AC
  "167",  // Living AC
  
  // 📺 CONTROLES DE TV/HTV (IR)
  "111",  // Varanda TV
  "114",  // Varanda HTV
  
  // ⚡ SHELLY ENERGY MONITOR
  "94",   // Varanda Shelly Pia
];

// Função para inicializar todos os dispositivos que suportam initialize
async function initializeAllDevices(progressCallback) {
  if (!isProduction) {
    console.log("🔧 [initializeAllDevices] Modo DEV - inicialização de dispositivos ignorada");
    return { success: true, initialized: 0, failed: 0, skipped: DEVICES_WITH_INITIALIZE.length };
  }
  
  console.log(`🔧 [initializeAllDevices] Iniciando ${DEVICES_WITH_INITIALIZE.length} dispositivos...`);
  
  let initialized = 0;
  let failed = 0;
  const total = DEVICES_WITH_INITIALIZE.length;
  const batchSize = 5; // Enviar em lotes de 5 para não sobrecarregar
  const delayBetweenBatches = 300; // ms entre lotes
  
  // Processar em lotes
  for (let i = 0; i < total; i += batchSize) {
    const batch = DEVICES_WITH_INITIALIZE.slice(i, Math.min(i + batchSize, total));
    
    // Enviar comandos do lote em paralelo
    const promises = batch.map(async (deviceId) => {
      try {
        await sendHubitatCommand(deviceId, "initialize");
        console.log(`✅ [initializeAllDevices] Dispositivo ${deviceId} inicializado`);
        return { deviceId, success: true };
      } catch (error) {
        console.warn(`⚠️ [initializeAllDevices] Falha ao inicializar ${deviceId}:`, error.message);
        return { deviceId, success: false, error: error.message };
      }
    });
    
    const results = await Promise.allSettled(promises);
    
    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value.success) {
        initialized++;
      } else {
        failed++;
      }
    });
    
    // Atualizar progresso
    const progress = Math.round(((i + batch.length) / total) * 100);
    if (progressCallback) {
      progressCallback(progress, `Inicializando dispositivos ${Math.min(i + batchSize, total)}/${total}...`);
    }
    
    // Aguardar entre lotes (exceto no último)
    if (i + batchSize < total) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  console.log(`🔧 [initializeAllDevices] Concluído: ${initialized} inicializados, ${failed} falhas`);
  
  return { success: failed === 0, initialized, failed, total };
}

// Flag para evitar múltiplas inicializações
let devicesInitialized = false;

const TEXT_MOJIBAKE_REGEX = /[\u00C3\u00C2\u00E2\uFFFD]/;
const TEXT_MOJIBAKE_REPLACEMENTS = [
  ["\u00e2\u0080\u0099", "Ã¢â‚¬â„¢"],
  ["\u00e2\u0080\u0098", "Ã¢â‚¬Ëœ"],
  ["\u00e2\u0080\u009c", "Ã¢â‚¬Å“"],
  ["\u00e2\u0080\u009d", "Ã¢â‚¬Â"],
  ["\u00e2\u0080\u0093", "Ã¢â‚¬â€œ"],
  ["\u00e2\u0080\u0094", "Ã¢â‚¬â€"],
  ["\u00e2\u0080\u00a6", "Ã¢â‚¬Â¦"],
  ["\u00e2\u0080\u00a2", "Ã¢â‚¬Â¢"],
  ["\u00c2\u00ba", "Ã‚Âº"],
  ["\u00c2\u00aa", "Ã‚Âª"],
  ["\u00c2\u00b0", "Ã‚Â°"],
  ["\u00c2\u00a9", "Ã‚Â©"],
  ["\u00c2\u00ae", "Ã‚Â®"],
];
const UTF8_DECODER =
  typeof TextDecoder !== "undefined"
    ? new TextDecoder("utf-8", { fatal: false })
    : null;

function hasMojibake(str) {
  return TEXT_MOJIBAKE_REGEX.test(str);
}

function decodeLatin1ToUtf8(str) {
  if (!UTF8_DECODER) return null;

  const bytes = new Uint8Array(str.length);

  for (let i = 0; i < str.length; i += 1) {
    const code = str.charCodeAt(i);
    if (code > 255) {
      return null;
    }
    bytes[i] = code;
  }

  try {
    return UTF8_DECODER.decode(bytes);
  } catch (_error) {
    return null;
  }
}

function normalizePortugueseText(value) {
  if (value === null || value === undefined) return value;

  let text = String(value);
  if (!text.trim()) return text.trim();

  const original = text;
  text = text.trim();

  if (hasMojibake(text)) {
    const decoded = decodeLatin1ToUtf8(text);
    if (decoded && decoded.trim()) {
      text = decoded.trim();
    }
  }

  text = text
    .replace(/\u00C2\u00A0/g, " ")
    .replace(/\u00C2(?=[^\w\s])/g, "")
    .replace(/\u00C2\s/g, " ")
    .replace(/\uFFFD/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([!?.,;:])/g, "$1")
    .replace(/([(\[{])\s+/g, "$1")
    .replace(/\s+([\)\]}])/g, "$1");

  TEXT_MOJIBAKE_REPLACEMENTS.forEach(([wrong, right]) => {
    if (text.includes(wrong)) {
      text = text.split(wrong).join(right);
    }
  });

  return text || original.trim();
}

function interpretPlaybackStatus(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).toLowerCase();

  if (
    normalized === "playing" ||
    normalized === "play" ||
    normalized === "buffering" ||
    normalized === "resume" ||
    normalized === "run" ||
    normalized === "start" ||
    normalized === "on"
  ) {
    return true;
  }

  if (
    normalized === "paused" ||
    normalized === "pause" ||
    normalized === "stopped" ||
    normalized === "stop" ||
    normalized === "idle" ||
    normalized === "standby" ||
    normalized === "off"
  ) {
    return false;
  }

  return null;
}

if (typeof window.musicPlayerUI.currentPlaying !== "boolean") {
  window.musicPlayerUI.currentPlaying = false;
}
// (Removido: HUBITAT_DIRECT_URL / HUBITAT_ACCESS_TOKEN do frontend por seguranÃƒÂ§a)

// Função para mostrar erro ao usuÃƒÂ¡rio
function showErrorMessage(message) {
  // Criar modal de erro
  const errorModal = document.createElement("div");
  errorModal.className = "error-modal";
  errorModal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 24px;
        max-width: 90vw;
        min-width: 320px;
        z-index: 10000;
        text-align: center;
    `;

  errorModal.innerHTML = `
        <h3 style="margin-bottom: 12px; font-size: 1.4rem;">⚠️Erro de Conexão</h3>
        <p style="margin-bottom: 20px; line-height: 1.5;">${message}</p>
        <button onclick="this.parentElement.remove()" style="
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 12px;
            cursor: pointer;
            font-weight: 600;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 6px 20px rgba(231, 76, 60, 0.4)'" 
           onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">Fechar</button>
    `;

  document.body.appendChild(errorModal);

  // Remover automaticamente apÃƒÂ³s 10 segundos
  setTimeout(() => {
    if (errorModal.parentElement) {
      errorModal.remove();
    }
  }, 10000);
}

// Fallback direto desativado por seguranÃƒÂ§a (CORS e exposiÃƒÂ§ÃƒÂ£o de token)
async function loadAllDeviceStatesDirect(deviceIds) {
  console.warn(
    "Fallback direto desativado. Usando apenas estados locais armazenados."
  );
  if (!Array.isArray(deviceIds)) {
    deviceIds =
      typeof deviceIds === "string"
        ? deviceIds.split(",").map((id) => id.trim())
        : [];
  }
  const devices = {};
  deviceIds.forEach((id) => {
    const state = getStoredState(id) || "off";
    updateDeviceUI(id, state, true);
    devices[id] = { state, success: false, error: "Direct polling disabled" };
  });
  return {
    timestamp: new Date().toISOString(),
    devices,
    fallback: true,
    disabled: true,
  };
}

// Função para testar Configurações do Hubitat
async function testHubitatConnection() {
  console.log("Ã°Å¸â€Â§ Testando Conexão com Hubitat...");

  try {
    // Testar com um dispositivo conhecido (231)
    const response = await fetch(`${POLLING_URL}?devices=231`);
    console.log("Ã°Å¸â€Â§ Status da resposta:", response.status);
    console.log(
      "Ã°Å¸â€Â§ Headers da resposta:",
      Object.fromEntries(response.headers.entries())
    );

    const responseText = await response.text();
    console.log(
      "Ã°Å¸â€Â§ ConteÃƒÂºdo da resposta:",
      responseText.substring(0, 300)
    );

    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log("Ã¢Å“â€¦ Conexão OK - Dados:", data);
        return true;
      } catch (e) {
        console.error("⚠️Resposta não é JSON vÃƒÂ¡lido:", e);
        return false;
      }
    } else {
      console.error("⚠️Erro HTTP:", response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error("⚠️Erro na Conexão:", error);
    return false;
  }
}

// Helpers de URL para endpoints comuns da API
function urlDeviceInfo(deviceId) {
  return `${HUBITAT_PROXY_URL}?device=${deviceId}`;
}

function urlSendCommand(deviceId, command, value) {
  if (useHubitatCloud(deviceId)) {
    let url = `${HUBITAT_CLOUD_DEVICES_BASE_URL}/${encodeURIComponent(
      deviceId
    )}`;

    if (command) {
      url += `/${encodeURIComponent(command)}`;

      if (value !== undefined && value !== null && value !== "") {
        url += `/${encodeURIComponent(value)}`;
      }
    }

    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}access_token=${encodeURIComponent(
      HUBITAT_CLOUD_ACCESS_TOKEN
    )}`;
  }

  return `${HUBITAT_PROXY_URL}?device=${deviceId}&command=${encodeURIComponent(
    command
  )}${value !== undefined ? `&value=${encodeURIComponent(value)}` : ""}`;
}

async function sendHubitatCommand(deviceId, command, value) {
  console.log(
    `📡 [sendHubitatCommand] Enviando comando: ${command} para dispositivo ${deviceId}${
      value !== undefined ? ` com valor ${value}` : ""
    }`
  );

  try {
    // Se estivermos em produção, tenta usar o proxy primeiro
    if (isProduction) {
      const proxyUrl = `${HUBITAT_PROXY_URL}?device=${deviceId}&command=${encodeURIComponent(
        command
      )}${value !== undefined ? `&value=${encodeURIComponent(value)}` : ""}`;

      console.log(`📡 [sendHubitatCommand] URL do proxy: ${proxyUrl}`);

      try {
        const response = await fetch(proxyUrl);
        const text = await response.text();

        console.log(`📡 [sendHubitatCommand] Resposta do proxy (status ${response.status}):`, text.substring(0, 200));

        // Verifica se a resposta é HTML (indica que a Function não está funcionando)
        if (text.trim().startsWith("<!DOCTYPE") || text.includes("<html")) {
          throw new Error(
            "Function retornou HTML - fazendo fallback para API direta"
          );
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log("📡 [sendHubitatCommand] Comando enviado com sucesso via proxy");

        // Tenta parse JSON, mas aceita resposta vazia
        try {
          return JSON.parse(text);
        } catch {
          return null; // Comando executado mas sem resposta JSON
        }
      } catch (error) {
        console.log("📡 [sendHubitatCommand] Proxy falhou:", error.message);
      }
    }

    throw new Error("Proxy indisponível e acesso direto desativado");
  } catch (error) {
    console.error("📡 [sendHubitatCommand] Erro ao enviar comando:", error);
    throw error;
  }
}

// --- Cortinas (abrir/parar/fechar) ---
function sendCurtainCommand(deviceId, action, commandName) {
  if (useHubitatCloud(deviceId)) {
    const commandMap = {
      open: "open",
      stop: "stop",
      close: "close",
    };
    const commandToSend = commandMap[action];
    if (!commandToSend) throw new Error("Ação de cortina inválida");
    return sendHubitatCommand(deviceId, commandToSend);
  }

  const cmd = commandName || "push";

  // Correção específica para cortina interna (ID 39) - comandos invertidos
  let map;
  if (String(deviceId) === "39") {
    // Cortina com comandos invertidos (exemplo: device ID 40)
    map = { open: 3, stop: 2, close: 1 };
    console.log(
      `🪟 Cortina com comandos invertidos (ID ${deviceId}): comando ${action} mapeado para valor ${map[action]}`
    );
  } else {
    // Padrão para todas as outras cortinas
    map = { open: 1, stop: 2, close: 3 };
  }

  const value = map[action];
  if (value === undefined) throw new Error("Ação de cortina inválida");
  return sendHubitatCommand(deviceId, cmd, value);
}

function curtainAction(el, action) {
  try {
    const id =
      el?.dataset?.deviceId ||
      el.closest("[data-device-id]")?.dataset?.deviceId;
    
    console.log(`🪟 curtainAction chamada: action=${action}, id=${id}, el=`, el);
    
    if (!id) {
      console.error("🪟 ERRO: ID do dispositivo não encontrado!");
      return;
    }
    
    // Suporte a comandos diretos push1, push2, push3, push4
    if (action.startsWith('push')) {
      console.log(`🪟 Cortina (ID ${id}): enviando comando direto ${action}`);
      return sendHubitatCommand(id, action)
        .then(result => {
          console.log(`🪟 Comando ${action} enviado com sucesso para ID ${id}:`, result);
        })
        .catch(err => {
          console.error(`🪟 ERRO ao enviar comando ${action} para ID ${id}:`, err);
        });
    }
    
    const cmd = el?.dataset?.cmd || "push";
    sendCurtainCommand(id, action, cmd);
  } catch (e) {
    console.error("Falha ao acionar cortina:", e);
  }
}

// Master on/off (Home quick toggle) removido completamente

// --- Override para contornar CORS no browser ao chamar Hubitat ---
// Envia comandos em modo no-cors (resposta opaca) e, em falha, faz um GET via Image.
try {
  if (typeof sendHubitatCommand === "function") {
    const _corsBypassSend = function (deviceId, command, value) {
      const baseUrl = urlSendCommand(deviceId, command, value);
      // Adiciona cache-buster para evitar SW/cache do navegador
      const url =
        baseUrl + (baseUrl.includes("?") ? "&" : "?") + `_ts=${Date.now()}`;
      console.log(`Enviando comando para o Hubitat (no-cors): ${url}`);
      try {
        return fetch(url, {
          mode: "no-cors",
          cache: "no-store",
          credentials: "omit",
          redirect: "follow",
          referrerPolicy: "no-referrer",
          keepalive: true,
        })
          .then(() => null)
          .catch((err) => {
            try {
              const beacon = new Image();
              beacon.referrerPolicy = "no-referrer";
              beacon.src = url;
            } catch (_) {
              /* ignore */
            }
            console.error("Erro ao enviar comando (CORS?):", err);
            return null;
          });
      } catch (e) {
        try {
          const beacon = new Image();
          beacon.referrerPolicy = "no-referrer";
          beacon.src = url;
        } catch (_) {
          /* ignore */
        }
        return Promise.resolve(null);
      }
    };
    // Sobrescreve Função original
    // eslint-disable-next-line no-global-assign
    sendHubitatCommand = _corsBypassSend;
  }
} catch (_) {
  /* ignore */
}

// --- Polling automÃƒÂ¡tico de estados ---

const POLLING_INTERVAL_BASE_MS = 5000;
const POLLING_INTERVAL_STEP_MS = 2000;
const POLLING_INTERVAL_MAX_MS = 20000;
let currentPollingInterval = POLLING_INTERVAL_BASE_MS;
let pollingTimerHandle = null;
let pollingActive = false;
let pollingFailureCount = 0;
let pollingPausedForVisibility = false;

// Sistema para evitar conflitos entre comandos manuais e polling
const recentCommands = new Map(); // deviceId -> timestamp do ÃƒÂºltimo comando
const COMMAND_PROTECTION_MS = 8000; // 8 segundos de proteÃƒÂ§ÃƒÂ£o apÃƒÂ³s comando manual

// Sistema de loading para botÃƒÂµes master
function setMasterButtonLoading(button, isLoading) {
  console.log(
    "Ã°Å¸â€â€ž setMasterButtonLoading chamada:",
    button,
    "loading:",
    isLoading
  );

  if (isLoading) {
    button.classList.add("loading");
    button.dataset.loading = "true";
    console.log("Ã¢Å“â€¦ Loading ativado - classes:", button.className);
  } else {
    button.classList.remove("loading");
    button.dataset.loading = "false";
    console.log("⚠️Loading desativado - classes:", button.className);
  }
}

function cleanupExpiredCommands() {
  const now = Date.now();
  for (const [deviceId, timestamp] of recentCommands.entries()) {
    if (now - timestamp > COMMAND_PROTECTION_MS) {
      recentCommands.delete(deviceId);
    }
  }
}

function scheduleNextPollingRun(delay) {
  if (!pollingActive) return;

  const safeDelay = Math.max(delay, 500);

  if (pollingTimerHandle !== null) {
    clearTimeout(pollingTimerHandle);
  }

  pollingTimerHandle = setTimeout(function () {
    pollingTimerHandle = null;
    updateDeviceStatesFromServer();
  }, safeDelay);

  debugLog(() => ["scheduleNextPollingRun", safeDelay]);
}

function startPolling() {
  if (pollingActive) return;

  if (!isProduction) {
    debugLog(() => ["Polling desativado em ambiente de desenvolvimento"]);
    return;
  }

  pollingActive = true;
  pollingFailureCount = 0;
  currentPollingInterval = POLLING_INTERVAL_BASE_MS;

  updateDeviceStatesFromServer();

  console.log(
    "Polling iniciado - intervalo base",
    POLLING_INTERVAL_BASE_MS / 1000,
    "segundos"
  );
}

function stopPolling() {
  if (!pollingActive) return;

  pollingActive = false;
  pollingFailureCount = 0;
  currentPollingInterval = POLLING_INTERVAL_BASE_MS;

  if (pollingTimerHandle !== null) {
    clearTimeout(pollingTimerHandle);
    pollingTimerHandle = null;
  }

  console.log("Polling parado");
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (pollingActive) {
        pollingPausedForVisibility = true;
        stopPolling();
      }
    } else if (pollingPausedForVisibility) {
      pollingPausedForVisibility = false;
      startPolling();
    }
  });
}

async function updateDeviceStatesFromServer(options = {}) {
  const skipSchedule = Boolean(options && options.skipSchedule);
  let hasStateChanges = false;
  let encounteredError = false;

  try {
    cleanupExpiredCommands();

    if (!isProduction) {
      debugLog(() => ["Polling skipped (dev mode)"]);
      return;
    }

    const deviceIds = ALL_LIGHT_IDS.join(",");
    const pollingUrl = `${POLLING_URL}?devices=${deviceIds}`;

    debugLog(() => [
      "pollingRequest",
      { interval: currentPollingInterval, url: pollingUrl },
    ]);

    const response = await fetch(pollingUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Polling failed: ${response.status}`);
    }

    const data = await response.json();
    let devicesMap = data.devices;

    if (!devicesMap && Array.isArray(data.data)) {
      devicesMap = {};
      data.data.forEach((device) => {
        if (!device || !device.id) {
          return;
        }

        let state = "off";

        if (Array.isArray(device.attributes)) {
          const switchAttr = device.attributes.find(
            (attribute) => attribute.name === "switch"
          );
          state = switchAttr?.currentValue || switchAttr?.value || "off";
        } else if (device.attributes && typeof device.attributes === "object") {
          if (device.attributes.switch !== undefined) {
            state = device.attributes.switch;
          } else {
            debugLog(() => ["Polling skip device (no switch)", device.id]);
            return;
          }
        }

        devicesMap[device.id] = { state, success: true };

        if (device.attributes && device.attributes.volume !== undefined) {
          devicesMap[device.id].volume = device.attributes.volume;
        }
      });
    }

    if (!devicesMap) {
      debugLog(() => ["Polling response sem devices", data]);
      return;
    }

    Object.entries(devicesMap).forEach(([deviceId, deviceData]) => {
      if (!deviceData) {
        return;
      }

      if (deviceData.success) {
        const previousState = getStoredState(deviceId);
        const nextState = deviceData.state;

        if (previousState !== nextState) {
          hasStateChanges = true;
        }

        setStoredState(deviceId, nextState);
        updateDeviceUI(deviceId, nextState);

        if (String(deviceId) === "15" && deviceData.volume !== undefined) {
          updateDenonVolumeUI(deviceData.volume);
        }
      } else {
        console.warn(`Falha no device ${deviceId}:`, deviceData.error);
      }
    });

    updateAllMasterButtons();
    if (typeof updateMasterLightToggleState === "function") {
      updateMasterLightToggleState();
    }
  } catch (error) {
    encounteredError = true;
    console.error("Erro no polling:", error);

    if (
      error.message.includes("JSON.parse") ||
      error.message.includes("unexpected character")
    ) {
      console.error("PARANDO POLLING - Cloudflare Functions não funcionam");
      stopPolling();
      return;
    }
  } finally {
    if (!skipSchedule && pollingActive) {
      if (encounteredError) {
        pollingFailureCount += 1;
        currentPollingInterval = Math.min(
          Math.round(currentPollingInterval * 1.5) || POLLING_INTERVAL_BASE_MS,
          POLLING_INTERVAL_MAX_MS
        );
      } else if (hasStateChanges) {
        pollingFailureCount = 0;
        currentPollingInterval = POLLING_INTERVAL_BASE_MS;
      } else {
        pollingFailureCount = 0;
        currentPollingInterval = Math.min(
          currentPollingInterval + POLLING_INTERVAL_STEP_MS,
          POLLING_INTERVAL_MAX_MS
        );
      }

      debugLog(() => [
        "pollingNextInterval",
        {
          encounteredError,
          hasStateChanges,
          nextInterval: currentPollingInterval,
          failureCount: pollingFailureCount,
        },
      ]);

      scheduleNextPollingRun(currentPollingInterval);
    }
  }
}

function updateDeviceUI(deviceId, state, forceUpdate = false) {
  // Verificar se o DOM está pronto
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () =>
      updateDeviceUI(deviceId, state, forceUpdate)
    );
    return;
  }

  // Verificar se hÃƒÂ¡ comando recente que deve ser respeitado
  if (!forceUpdate) {
    const lastCommand = recentCommands.get(deviceId);
    if (lastCommand && Date.now() - lastCommand < COMMAND_PROTECTION_MS) {
      return;
    }
  }

  // Atualizar controles de cÃƒÂ´modo (room-control E control-card)
  const roomControls = document.querySelectorAll(
    `[data-device-id="${deviceId}"]`
  );
  console.log(
    `Ã°Å¸â€Â§ updateDeviceUI(${deviceId}, ${state}) - Encontrados ${roomControls.length} controles`
  );

  roomControls.forEach((el, index) => {
    console.log(
      `Ã°Å¸â€Â§ Controle ${index + 1}: classes="${
        el.className
      }", currentState="${el.dataset.state}"`
    );

    // Suporta tanto .room-control quanto .control-card
    if (
      el.classList.contains("room-control") ||
      el.classList.contains("control-card")
    ) {
      const currentState = el.dataset.state;
      if (currentState !== state || forceUpdate) {
        console.log(
          `Ã°Å¸â€â€ž Atualizando controle ${deviceId}: "${currentState}" Ã¢â€ â€™ "${state}" (force=${forceUpdate})`
        );
        setRoomControlUI(el, state);
        // Salvar o estado atualizado
        setStoredState(deviceId, state);
      } else {
        console.log(
          `Ã¢Å“â€œ Controle ${deviceId} jÃƒÂ¡ está no estado correto: "${state}"`
        );
      }
    } else {
      console.log(
        `Ã¢Å¡Â Ã¯Â¸Â Elemento encontrado mas não é room-control nem control-card: ${el.className}`
      );
    }
  });

  // Atualizar botÃƒÂµes master da home apÃƒÂ³s qualquer mudanÃƒÂ§a de dispositivo
  if (String(deviceId) === "15") {
    applyDenonPowerState(state);
  }

  updateAllMasterButtons();
}

function updateAllMasterButtons(forceUpdate = false) {
  pruneStaleEntries();

  masterButtonCache.forEach(function (btn) {
    if (!btn.isConnected) {
      masterButtonCache.delete(btn);
      return;
    }

    const ids = (btn.dataset.deviceIds || "")
      .split(",")
      .map(function (id) {
        return id.trim();
      })
      .filter(Boolean);

    if (ids.length === 0) {
      return;
    }

    const masterState = anyOn(ids) ? "on" : "off";
    setMasterIcon(btn, masterState, forceUpdate);
  });
}

// FunÃƒÂ§ÃƒÂµes auxiliares para botÃƒÂµes master (movidas do HTML)
function anyOn(deviceIds) {
  return (deviceIds || []).some((id) => (getStoredState(id) || "off") === "on");
}

// Função para inicializar e sincronizar estados dos botÃƒÂµes master na home
function initHomeMasters() {
  console.log("🏠 Inicializando botões master da home...");
  
  // Aguardar um pouco para garantir que o DOM está pronto
  setTimeout(() => {
    const masterButtons = document.querySelectorAll(".room-master-btn");
    
    if (masterButtons.length === 0) {
      console.log("⚠️ Nenhum botão master encontrado");
      return;
    }
    
    console.log(`✅ Encontrados ${masterButtons.length} botões master`);
    
    masterButtons.forEach((btn) => {
      // Limpar estado de pending
      btn.dataset.pending = "false";
      
      // Obter IDs dos dispositivos
      const ids = (btn.dataset.deviceIds || "").split(",").filter(Boolean);
      
      if (ids.length === 0) return;
      
      // Calcular estado baseado nos dispositivos
      const state = anyOn(ids) ? "on" : "off";
      
      // Atualizar ícone do botão
      setMasterIcon(btn, state, true);
      
      const route = btn.dataset.route || "unknown";
      console.log(`  ${route}: ${ids.length} luzes, estado = ${state}`);
    });
    
    console.log("✅ Botões master sincronizados!");
  }, 100);
}

// Função auxiliar para verificar se alguma cortina está aberta
function anyCurtainOpen(curtainIds) {
  // Verifica se alguma cortina do grupo está aberta
  return (curtainIds || []).some((id) => {
    const state = getCurtainState(id);
    console.log(`Ã°Å¸â€Â Cortina ${id}: estado = ${state}`);
    return state === "open";
  });
}

// Função para obter o estado atual da cortina
function getCurtainState(curtainId) {
  // Buscar no localStorage ou usar um estado padrÃƒÂ£o
  const state = localStorage.getItem(`curtain_${curtainId}_state`) || "closed";
  return state; // retorna 'open' ou 'closed'
}

// Função para obter o ÃƒÂºltimo comando de cortina
function getLastCurtainCommand(curtainId) {
  const state = getCurtainState(curtainId);
  return state === "closed" ? "close" : "open"; // normalizar para comando
}

// Função para armazenar o estado da cortina
function setCurtainState(curtainId, state) {
  localStorage.setItem(`curtain_${curtainId}_state`, state);
}

// Função para obter estado da cortina
function getCurtainState(curtainId) {
  try {
    return localStorage.getItem(`curtain_${curtainId}_state`) || "closed";
  } catch (error) {
    console.error("⚠️Erro ao obter estado da cortina:", error);
    return "closed";
  }
}

function setMasterIcon(btn, state, forceUpdate = false) {
  if (!forceUpdate && btn.dataset.pending === "true") {
    debugLog(() => ["masterButtonPending", btn.dataset.deviceIds]);
    return;
  }

  const img = btn.querySelector("img");
  if (!img) return;

  const nextIcon =
    state === "on"
      ? "images/icons/icon-small-light-on.svg"
      : "images/icons/icon-small-light-off.svg";
  const currentSrc = img.src || "";

  if (!currentSrc.includes(nextIcon.split("/").pop())) {
    img.src = nextIcon;
    btn.dataset.state = state;
    debugLog(() => ["masterIconUpdated", state, btn.dataset.deviceIds]);
  }
}

function setCurtainMasterIcon(btn, state, forceUpdate = false) {
  if (!forceUpdate && btn.dataset.pending === "true") {
    debugLog(() => ["curtainMasterPending", btn.dataset.curtainIds]);
    return;
  }

  const img = btn.querySelector("img");
  if (!img) return;

  const nextIcon =
    state === "open"
      ? "images/icons/curtain-open.svg"
      : "images/icons/curtain-closed.svg";
  const currentSrc = img.src || "";

  if (!currentSrc.includes(nextIcon.split("/").pop())) {
    img.src = nextIcon;
    btn.dataset.state = state;
    debugLog(() => ["curtainMasterIconUpdated", state, btn.dataset.curtainIds]);
  }
}

// Função para definir o estado de loading do botÃƒÂ£o master de cortinas
function setCurtainMasterButtonLoading(btn, loading) {
  btn.dataset.loading = loading ? "true" : "false";
  if (loading) {
    btn.classList.add("loading");
    btn.dataset.pending = "true";
  } else {
    btn.classList.remove("loading");
    btn.dataset.pending = "false";
  }
}

// Função para atualizar ÃƒÂ­cones das cortinas individuais
function updateIndividualCurtainButtons(curtainIds, command) {
  curtainIds.forEach((curtainId) => {
    const button = document.querySelector(`[data-device-id="${curtainId}"]`);
    if (button && button.querySelector(".device-icon")) {
      const icon = button.querySelector(".device-icon");
      icon.src =
        command === "open"
          ? "images/icons/curtain-open.svg"
          : "images/icons/curtain-closed.svg";
      icon.alt = command === "open" ? "Cortina Aberta" : "Cortina Fechada";
    }
  });
}

// Função chamada pelo onclick dos botÃƒÂµes master na home
function onHomeMasterClick(event, button) {
  console.log("Ã°Å¸â€“Â±Ã¯Â¸Â onHomeMasterClick chamada!", button);
  event.preventDefault();
  event.stopPropagation();

  // Verificar se jÃƒÂ¡ está carregando
  if (button.dataset.loading === "true") {
    console.log(
      "Ã¢ÂÂ¸Ã¯Â¸Â BotÃƒÂ£o jÃƒÂ¡ está carregando, ignorando clique"
    );
    return;
  }

  const deviceIds = (button.dataset.deviceIds || "").split(",").filter(Boolean);
  console.log("Ã°Å¸â€Â Device IDs encontrados:", deviceIds);

  if (deviceIds.length === 0) {
    console.log("⚠️Nenhum device ID encontrado");
    return;
  }

  // Determinar comando baseado no estado atual
  const currentState = anyOn(deviceIds) ? "on" : "off";
  const newCommand = currentState === "on" ? "off" : "on";
  console.log(
    "Ã°Å¸Å½Â¯ Comando determinado:",
    currentState,
    "Ã¢â€ â€™",
    newCommand
  );

  // Ativar loading visual
  console.log("Ã°Å¸â€â€ž Ativando loading visual...");
  setMasterButtonLoading(button, true);

  // Atualizar UI imediatamente
  setMasterIcon(button, newCommand);

  // Enviar comandos para todos os dispositivos (master dos ambientes mantém comportamento original)
  const promises = deviceIds.map((deviceId) => {
    // Marcar comando recente
    recentCommands.set(deviceId, Date.now());
    setStoredState(deviceId, newCommand);
    return sendHubitatCommand(deviceId, newCommand);
  });

  // Aguardar conclusão de todos os comandos
  Promise.allSettled(promises).finally(() => {
    // Remover loading apÃƒÂ³s comandos
    setTimeout(() => {
      setMasterButtonLoading(button, false);
    }, 1000); // 1 segundo de delay para feedback visual
  });
}

// Função chamada pelo onclick dos botÃƒÂµes master de cortinas na home
function onHomeCurtainMasterClick(event, button) {
  console.log("Ã°Å¸â€“Â±Ã¯Â¸Â onHomeCurtainMasterClick chamada!", button);
  event.preventDefault();
  event.stopPropagation();

  // Verificar se jÃƒÂ¡ está carregando
  if (button.dataset.loading === "true") {
    console.log(
      "Ã¢ÂÂ¸Ã¯Â¸Â BotÃƒÂ£o de cortina jÃƒÂ¡ está carregando, ignorando clique"
    );
    return;
  }

  const curtainIds = (button.dataset.curtainIds || "")
    .split(",")
    .filter(Boolean);
  console.log("Ã°Å¸â€Â Curtain IDs encontrados:", curtainIds);

  if (curtainIds.length === 0) {
    console.log("⚠️Nenhum curtain ID encontrado");
    return;
  }

  // Determinar comando baseado no estado atual das cortinas
  console.log(
    "Ã°Å¸â€Â Verificando estados individuais das cortinas:",
    curtainIds.map((id) => ({ id, state: getCurtainState(id) }))
  );
  const currentState = anyCurtainOpen(curtainIds) ? "open" : "closed";
  const newCommand = currentState === "open" ? "close" : "open";
  console.log(
    "Ã°Å¸Å½Â¯ Comando de cortina determinado:",
    currentState,
    "Ã¢â€ â€™",
    newCommand
  );

  // Atualizar UI imediatamente (antes do loading)
  setCurtainMasterIcon(button, newCommand, true); // forÃƒÂ§ar atualizaÃƒÂ§ÃƒÂ£o

  // Ativar loading visual
  console.log("Ã°Å¸â€â€ž Ativando loading visual no botÃƒÂ£o de cortina...");
  setCurtainMasterButtonLoading(button, true);

  // Atualizar ÃƒÂ­cones dos botÃƒÂµes individuais imediatamente
  updateIndividualCurtainButtons(curtainIds, newCommand);

  // Enviar comandos para todas as cortinas
  const promises = curtainIds.map((curtainId) => {
    // Marcar comando recente
    recentCommands.set(curtainId, Date.now());
    // Armazenar o estado da cortina
    setCurtainState(curtainId, newCommand);
    return sendHubitatCommand(curtainId, newCommand);
  });

  // Aguardar conclusão de todos os comandos
  Promise.allSettled(promises).finally(() => {
    // Remover loading apÃƒÂ³s comandos
    setTimeout(() => {
      setCurtainMasterButtonLoading(button, false);
    }, 1000); // 1 segundo de delay para feedback visual
  });
}

// Função especial para atualizar estados apÃƒÂ³s comandos master
function updateStatesAfterMasterCommand(deviceIds, command) {
  console.log(
    `Ã°Å¸Å½Â¯ Atualizando estados apÃƒÂ³s master ${command} para:`,
    deviceIds
  );

  // Atualizar todos os dispositivos affected
  deviceIds.forEach((deviceId) => {
    updateDeviceUI(deviceId, command, true);
  });

  // ForÃƒÂ§ar atualizaÃƒÂ§ÃƒÂ£o de todos os masters
  setTimeout(() => {
    const masterButtons = document.querySelectorAll(".room-master-btn");
    masterButtons.forEach((btn) => {
      const ids = (btn.dataset.deviceIds || "").split(",").filter(Boolean);
      if (ids.some((id) => deviceIds.includes(id))) {
        const masterState = anyOn(ids) ? "on" : "off";
        setMasterIcon(btn, masterState, true); // forÃƒÂ§ar atualizaÃƒÂ§ÃƒÂ£o
      }
    });
  }, 100);
}

// === SISTEMA DE CARREGAMENTO GLOBAL ===

// Controle da tela de loading
function showLoader() {
  try {
    const loader = document.getElementById("global-loader");
    if (loader) {
      loader.classList.remove("hidden");
      loader.style.display = "flex"; // ForÃƒÂ§ar display
      updateProgress(0, "Iniciando carregamento...");
      console.log("Ã°Å¸â€œÂ± Loader exibido");
    } else {
      console.warn("Ã¢Å¡Â Ã¯Â¸Â Elemento loader não encontrado");
    }
  } catch (error) {
    console.error("⚠️Erro ao mostrar loader:", error);
  }
}

function hideLoader() {
  try {
    const finalizeHide = () => {
      const loader = document.getElementById("global-loader");
      if (loader) {
        const delay = 500;
        setTimeout(() => {
          loader.classList.add("hidden");
          setTimeout(() => {
            loader.style.display = "none";
          }, 500);
          console.log("Loader escondido");
        }, delay);
      }
    };

    if (!assetPreloadComplete && assetPreloadPromise) {
      const pending = assetPreloadPromise;
      assetPreloadPromise = null;
      pending
        .catch((error) =>
          console.warn("Falha ao pré-carregar todos os assets", error)
        )
        .finally(finalizeHide);
      return;
    }

    finalizeHide();
  } catch (error) {
    console.error("Erro ao esconder loader:", error);
  }
}


function updateProgress(percentage, text) {
  try {
    const progressFill = document.getElementById("progress-fill");
    const progressText = document.getElementById("progress-text");
    const loaderText = document.querySelector(".loader-text");

    if (progressFill) {
      progressFill.style.width = percentage + "%";
    }

    if (progressText) {
      progressText.textContent = Math.round(percentage) + "%";
    }

    if (loaderText && text) {
      loaderText.textContent = text;
    }

    // Log para debug mobile
    console.log(
      `Ã°Å¸â€œÅ  Progresso: ${percentage}% - ${text || "Carregando..."}`
    );
  } catch (error) {
    console.warn("Ã¢Å¡Â Ã¯Â¸Â Erro ao atualizar progresso:", error);
  }
}

// Carregamento global de todos os estados dos dispositivos
async function loadAllDeviceStatesGlobally() {
  console.log("Ã°Å¸Å’Â Iniciando carregamento global de estados...");
  console.log(
    "Ã°Å¸Å’Â ALL_LIGHT_IDS disponível:",
    !!ALL_LIGHT_IDS,
    "Length:",
    ALL_LIGHT_IDS ? ALL_LIGHT_IDS.length : "undefined"
  );
  console.log("Ã°Å¸Å’Â DEBUG CARREGAMENTO:", {
    isProduction: isProduction,
    hostname: location.hostname,
    isMobile: isMobile,
    userAgent: navigator.userAgent.substring(0, 100),
  });

  // Mobile e desktop usam EXATAMENTE o mesmo carregamento
  console.log("Ã°Å¸Å’Â Carregamento universal (desktop e mobile idênticos)");

  if (!isProduction) {
    console.log(
      "Ã°Å¸â€™Â» MODO DESENVOLVIMENTO ATIVO - carregando do localStorage"
    );
    console.log("Ã°Å¸â€™Â» ISSO PODE SER O PROBLEMA NO MOBILE!");
    console.log("Ã°Å¸â€œâ€¹ Dispositivos a carregar:", ALL_LIGHT_IDS.length);
    updateProgress(20, "Modo DEV - Estados salvos...");

    // Simular carregamento para melhor UX (mobile-friendly)
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (e) {
      // Fallback se Promise.resolve falhar
      console.warn("Promise fallback ativo");
    }

    let loadedCount = 0;
    ALL_LIGHT_IDS.forEach((deviceId, index) => {
      let storedState = "off";
      try {
        storedState = getStoredState(deviceId) || "off";
        updateDeviceUI(deviceId, storedState, true); // forceUpdate = true
        loadedCount++;
      } catch (e) {
        console.warn(`⚠️Erro ao processar ${deviceId}:`, e);
      }

      const progress = 20 + ((index + 1) / ALL_LIGHT_IDS.length) * 80;
      updateProgress(
        progress,
        `Dispositivo ${index + 1}/${ALL_LIGHT_IDS.length}...`
      );
    });

    console.log(
      `Ã¢Å“â€¦ Carregamento completo: ${loadedCount}/${ALL_LIGHT_IDS.length} dispositivos`
    );
    updateProgress(100, "Carregamento concluÃƒÂ­do!");
    return true;
  }

  try {
    console.log("Ã°Å¸Å’Â MODO PRODUÇÃO’O ATIVO - buscando do servidor");
    updateProgress(10, "Testando conectividade...");

    // Teste rÃƒÂ¡pido de conectividade
    try {
      const healthController = new AbortController();
      const healthTimeout = setTimeout(
        () => healthController.abort(),
        NETWORK_CONFIG.HEALTH_CHECK_TIMEOUT
      );

      const healthCheck = await fetch(POLLING_URL + "?health=1", {
        method: "GET",
        signal: healthController.signal,
        mode: "cors",
      });

      clearTimeout(healthTimeout);
      console.log("Ã°Å¸ÂÂ¥ Health check:", healthCheck.ok ? "OK" : "FAIL");
    } catch (healthError) {
      console.warn(
        "Ã¢Å¡Â Ã¯Â¸Â Health check falhou, continuando mesmo assim:",
        healthError.message
      );
    }

    updateProgress(20, "Conectando com servidor...");

    const deviceIds = ALL_LIGHT_IDS.join(",");
    console.log(
      `Ã°Å¸â€œÂ¡ Buscando estados de ${ALL_LIGHT_IDS.length} dispositivos no servidor...`
    );
    console.log(
      "Ã°Å¸â€œÂ¡ URL será:",
      `${POLLING_URL}?devices=${deviceIds}`
    );

    updateProgress(30, "Enviando solicitação...");

    // Função de retry com backoff exponencial
    const fetchWithRetry = async (
      url,
      options,
      maxRetries = NETWORK_CONFIG.MAX_RETRY_ATTEMPTS
    ) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(
            `Ã°Å¸â€œÂ¡ Tentativa ${attempt}/${maxRetries} para ${url}`
          );
          updateProgress(
            30 + (attempt - 1) * 5,
            `Tentativa ${attempt}/${maxRetries}...`
          );

          // Configurar timeout por tentativa
          let controller, timeoutId;
          const timeout = NETWORK_CONFIG.FETCH_TIMEOUT_PER_ATTEMPT;

          if (typeof AbortController !== "undefined") {
            controller = new AbortController();
            timeoutId = setTimeout(() => {
              console.warn(
                `Ã¢ÂÂ° Timeout de ${
                  timeout / 1000
                }s atingido na tentativa ${attempt}`
              );
              controller.abort();
            }, timeout);
            options.signal = controller.signal;
          }

          const response = await fetch(url, options);
          if (timeoutId) clearTimeout(timeoutId);

          console.log(
            `Ã°Å¸â€œÂ¡ Tentativa ${attempt} - Status: ${response.status}`
          );

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          return response;
        } catch (error) {
          console.warn(`⚠️Tentativa ${attempt} falhou:`, error.message);

          if (attempt === maxRetries) {
            throw new Error(
              `Falha apÃƒÂ³s ${maxRetries} tentativas: ${error.message}`
            );
          }

          // Aguardar antes do retry (backoff exponencial)
          const delay = Math.min(
            NETWORK_CONFIG.RETRY_DELAY_BASE * Math.pow(2, attempt - 1),
            NETWORK_CONFIG.RETRY_DELAY_MAX
          );
          console.log(
            `Ã¢ÂÂ³ Aguardando ${delay}ms antes da prÃƒÂ³xima tentativa...`
          );
          updateProgress(
            30 + attempt * 5,
            `Reagendando em ${delay / 1000}s...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    };

    // Configurações otimizadas para mobile
    const fetchOptions = {
      method: "GET",
      cache: "no-cache", // ForÃƒÂ§ar busca fresca
      mode: "cors",
    };

    const requestUrl = `${POLLING_URL}?devices=${deviceIds}`;
    console.log("Ã°Å¸â€œÂ¡ Fazendo fetch com retry para:", requestUrl);

    const response = await fetchWithRetry(requestUrl, fetchOptions);

    console.log("Ã°Å¸â€œÂ¡ Resposta recebida, status:", response.status);
    updateProgress(50, "Recebendo dados...");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let data;
    let responseText = "";
    try {
      console.log("Ã°Å¸â€œÂ¡ Parseando resposta JSON...");

      // Debug: Capturar o texto da resposta primeiro
      responseText = await response.text();
      console.log(
        "Ã°Å¸â€œÂ¡ Resposta recebida (texto):",
        responseText.substring(0, 500)
      ); // Primeiros 500 chars

      if (!responseText) {
        throw new Error("Resposta vazia do servidor");
      }

      // Verificar se é HTML (Functions não estÃƒÂ£o funcionando)
      if (
        responseText.trim().startsWith("<!DOCTYPE html") ||
        responseText.trim().startsWith("<html")
      ) {
        console.error(
          "⚠️CRÃƒÂTICO: Cloudflare Functions não estÃƒÂ£o funcionando!"
        );
        console.error(
          "⚠️O servidor está retornando HTML em vez de executar as Functions."
        );
        console.error(
          "⚠️Implementando fallback automÃƒÂ¡tico para API direta do Hubitat..."
        );

        // FALLBACK AUTOMÃƒÂTICO: Usar API direta do Hubitat
        console.log(
          "Ã°Å¸â€â€ž Tentando API direta do Hubitat como fallback..."
        );
        updateProgress(60, "Usando API direta como fallback...");

        try {
          const fallbackData = await loadAllDeviceStatesDirect(ALL_LIGHT_IDS);
          console.log("Ã¢Å“â€¦ Fallback bem-sucedido:", fallbackData);

          // Processar dados do fallback
          const deviceEntries = Object.entries(fallbackData.devices);
          let processedCount = 0;

          deviceEntries.forEach(([deviceId, deviceData]) => {
            if (deviceData.success) {
              setStoredState(deviceId, deviceData.state);
              updateDeviceUI(deviceId, deviceData.state, true);
              console.log(
                `Ã¢Å“â€¦ Device ${deviceId}: ${deviceData.state} (direto)`
              );
            } else {
              const storedState = getStoredState(deviceId) || "off";
              updateDeviceUI(deviceId, storedState, true);
              console.log(
                `Ã¢Å¡Â Ã¯Â¸Â Device ${deviceId}: usando estado salvo "${storedState}"`
              );
            }

            processedCount++;
            const progress = 60 + (processedCount / deviceEntries.length) * 35;
            updateProgress(
              progress,
              `Processando ${processedCount}/${deviceEntries.length}...`
            );
          });

          updateProgress(100, "Carregamento via API direta concluÃƒÂ­do!");

          // ForÃƒÂ§ar atualizaÃƒÂ§ÃƒÂ£o dos botÃƒÂµes master
          setTimeout(() => {
            updateAllMasterButtons();
            console.log(
              "Ã°Å¸â€â€ž BotÃƒÂµes master atualizados apÃƒÂ³s fallback"
            );
          }, 100);

          console.log(
            "Ã¢Å“â€¦ Fallback automÃƒÂ¡tico concluÃƒÂ­do com sucesso"
          );
          return true;
        } catch (fallbackError) {
          console.error("⚠️Fallback também falhou:", fallbackError);

          // ÃƒÅ¡ltimo recurso: usar estados salvos
          console.log(
            "Ã°Å¸â€œÂ¦ Usando estados salvos como ÃƒÂºltimo recurso..."
          );
          ALL_LIGHT_IDS.forEach((deviceId) => {
            const storedState = getStoredState(deviceId) || "off";
            updateDeviceUI(deviceId, storedState, true);
          });

          throw new Error(
            "Functions não funcionam e API direta também falhou - usando estados salvos"
          );
        }
      }

      // Tentar parsear o JSON
      data = JSON.parse(responseText);
      console.log("Ã°Å¸â€œÂ¡ JSON parseado com sucesso");
    } catch (jsonError) {
      console.error("⚠️Erro ao parsear JSON:", jsonError);
      console.error(
        "⚠️ConteÃƒÂºdo da resposta que falhou:",
        responseText?.substring(0, 200)
      );
      throw new Error(`Resposta invÃƒÂ¡lida do servidor: ${jsonError.message}`);
    }
    console.log("Ã°Å¸â€œÂ¡ Estados recebidos:", data);

    // NormalizaÃƒÂ§ÃƒÂ£o do formato de resposta:
    // Formato antigo esperado: { devices: { id: { state, success } } }
    // Novo formato (Cloudflare Function refatorada): { success:true, data:[ { id, attributes:[{name:'switch', currentValue:'on'}] } ] }
    if (!data.devices) {
      try {
        if (Array.isArray(data.data)) {
          console.log(
            "Ã°Å¸â€â€ž Normalizando",
            data.data.length,
            "dispositivos do formato novo..."
          );
          const mapped = {};
          data.data.forEach((d, index) => {
            if (!d || !d.id) {
              console.warn(`Ã¢Å¡Â Ã¯Â¸Â Dispositivo ${index} invÃƒÂ¡lido:`, d);
              return;
            }

            let state = "off";

            if (Array.isArray(d.attributes)) {
              // Formato antigo: attributes é array de objetos
              const sw = d.attributes.find((a) => a.name === "switch");
              if (sw) {
                state = sw?.currentValue || sw?.value || "off";
              }
            } else if (d.attributes && typeof d.attributes === "object") {
              // Formato atual: attributes é objeto direto com propriedades
              if (d.attributes.switch !== undefined) {
                state = d.attributes.switch;
                console.log(`Ã°Å¸â€œâ€¹ Device ${d.id}: switch=${state}`);
              } else {
                console.log(
                  `Ã°Å¸â€Ëœ Device ${d.id}: não é lÃƒÂ¢mpada (sem atributo 'switch'), pulando...`
                );
                return; // Pular dispositivos sem switch (botÃƒÂµes, sensores, etc.)
              }
            } else {
              console.warn(
                `Ã¢Å¡Â Ã¯Â¸Â Device ${d.id}: attributes invÃƒÂ¡lido:`,
                d.attributes
              );
            }

            mapped[d.id] = { state, success: true };
          });
          data.devices = mapped;
          console.log(
            "Ã°Å¸â€â€ž Resposta normalizada para formato devices (",
            Object.keys(mapped).length,
            "dispositivos )"
          );
          console.log("Ã°Å¸â€Â Estados finais mapeados:", mapped);
        } else {
          throw new Error(
            "Formato de resposta inesperado: falta campo devices e data[]"
          );
        }
      } catch (normError) {
        console.error("⚠️Falha ao normalizar resposta:", normError);
        throw normError;
      }
    }

    updateProgress(70, "Processando estados...");

    // Processar dispositivos com progresso
    const deviceEntries = Object.entries(data.devices || {});
    console.log(`Processando ${deviceEntries.length} dispositivos...`);
    let processedCount = 0;

    await processDeviceEntries(deviceEntries);

    function handleDeviceEntry(deviceId, deviceData) {
      if (deviceData.success) {
        setStoredState(deviceId, deviceData.state);
        updateDeviceUI(deviceId, deviceData.state, true); // forceUpdate = true
      } else {
        console.warn(`Falha no device ${deviceId}:`, deviceData.error);
        const storedState = getStoredState(deviceId) || "off";
        updateDeviceUI(deviceId, storedState, true); // forceUpdate = true
      }

      processedCount++;
      const progress = 70 + (processedCount / deviceEntries.length) * 25;
      updateProgress(
        progress,
        `Aplicando estado ${processedCount}/${deviceEntries.length}...`
      );
    }

    function scheduleChunk(callback) {
      if (
        typeof window !== "undefined" &&
        typeof window.requestIdleCallback === "function"
      ) {
        window.requestIdleCallback(callback, { timeout: 120 });
      } else {
        setTimeout(callback, 16);
      }
    }

    function processDeviceEntries(entries) {
      return new Promise((resolve) => {
        let index = 0;
        const CHUNK_SIZE = 20;

        const runChunk = (deadline) => {
          const hasDeadline =
            deadline && typeof deadline.timeRemaining === "function";
          let processedInChunk = 0;

          while (index < entries.length) {
            const current = entries[index++];
            handleDeviceEntry(current[0], current[1]);
            processedInChunk += 1;

            if (processedInChunk >= CHUNK_SIZE) {
              break;
            }

            if (hasDeadline && deadline.timeRemaining() <= 4) {
              break;
            }
          }

          if (index < entries.length) {
            scheduleChunk(runChunk);
          } else {
            resolve();
          }
        };

        runChunk();
      });
    }

    updateProgress(95, "Finalizando sincronizaÃƒÂ§ÃƒÂ£o...");

    // ForÃƒÂ§ar atualizaÃƒÂ§ÃƒÂ£o de todos os botÃƒÂµes master apÃƒÂ³s carregamento
    setTimeout(() => {
      updateAllMasterButtons();
      console.log(
        "Ã°Å¸â€â€ž BotÃƒÂµes master atualizados apÃƒÂ³s carregamento global"
      );
    }, 100);

    updateProgress(100, "Estados carregados com sucesso!");
    console.log("Ã¢Å“â€¦ Carregamento global concluÃƒÂ­do com sucesso");
    return true;
  } catch (error) {
    console.error("⚠️Erro no carregamento global:", error);

    // Tentar diagnÃƒÂ³stico automÃƒÂ¡tico da Conexão
    try {
      console.log("Ã°Å¸â€Â§ Executando diagnÃƒÂ³stico da Conexão...");
      const connectionTest = await testHubitatConnection();
      if (!connectionTest) {
        showErrorMessage(
          "Falha na Conexão com Hubitat. Verifique se as Configurações foram alteradas no painel do Cloudflare."
        );
      }
    } catch (diagError) {
      console.error("Erro no diagnÃƒÂ³stico:", diagError);
    }

    // Tratamento inteligente de erro com retry automÃƒÂ¡tico
    if (error.name === "AbortError") {
      console.warn("Ã¢ÂÂ±Ã¯Â¸Â Timeout apÃƒÂ³s mÃƒÂºltiplas tentativas");
      updateProgress(60, "Timeout - usando backup...");
      showErrorMessage(
        "Timeout na Conexão. Verifique sua internet e tente novamente."
      );
    } else if (error.message.includes("Falha apÃƒÂ³s")) {
      console.warn("Ã°Å¸â€â€ž MÃƒÂºltiplas tentativas falharam");
      updateProgress(60, "Falhas mÃƒÂºltiplas - modo backup...");
      showErrorMessage(
        "Servidor temporariamente indisponível. Usando dados salvos."
      );
    } else if (error.name === "TypeError" && error.message.includes("fetch")) {
      console.warn("Ã°Å¸Å’Â Problema de conectividade de rede");
      updateProgress(60, "Sem rede - modo offline...");
      showErrorMessage("Sem Conexão com a internet. Modo offline ativado.");
    } else if (error.message.includes("HTTP 5")) {
      console.warn("Ã°Å¸â€Â¥ Erro no servidor (5xx)");
      updateProgress(60, "Erro servidor - backup...");
      showErrorMessage(
        "Problema no servidor. Usando ÃƒÂºltimos dados conhecidos."
      );
    } else {
      console.warn("⚠️Erro desconhecido no carregamento:", error.message);
      updateProgress(60, "Erro geral - usando backup...");
      showErrorMessage("Erro no carregamento. Usando dados salvos localmente.");
    }

    // Fallback para localStorage
    ALL_LIGHT_IDS.forEach((deviceId, index) => {
      const storedState = getStoredState(deviceId) || "off";
      updateDeviceUI(deviceId, storedState, true); // forceUpdate = true

      const progress = 60 + ((index + 1) / ALL_LIGHT_IDS.length) * 35;
      updateProgress(
        progress,
        `Carregando backup ${index + 1}/${ALL_LIGHT_IDS.length}...`
      );
    });

    const offlineMsg = "Carregamento concluÃƒÂ­do (modo offline)";
    updateProgress(100, offlineMsg);
    return false;
  }
}

// Verificar compatibilidade com mobile
function checkMobileCompatibility() {
  const issues = [];
  const warnings = [];

  // APIs crÃƒÂ­ticas (falha total se não existirem)
  if (typeof fetch === "undefined") {
    issues.push("Fetch API não suportada");
  }

  if (typeof Promise === "undefined") {
    issues.push("Promises não suportadas");
  }

  // APIs opcionais (warnings apenas)
  if (typeof MutationObserver === "undefined") {
    warnings.push("MutationObserver não suportado (usar fallback)");
  }

  if (typeof AbortController === "undefined") {
    warnings.push("AbortController não suportado (sem timeout)");
  }

  if (typeof localStorage === "undefined") {
    warnings.push("LocalStorage não suportado (sem persistÃƒÂªncia)");
  }

  // Testar localStorage funcionamento
  try {
    const testKey = "__test_ls__";
    localStorage.setItem(testKey, "test");
    localStorage.removeItem(testKey);
  } catch (e) {
    warnings.push("LocalStorage bloqueado (modo privado?)");
  }

  if (warnings.length > 0) {
    console.warn("Ã¢Å¡Â Ã¯Â¸Â Avisos de compatibilidade:", warnings);
  }

  if (issues.length > 0) {
    console.error("⚠️Problemas crÃƒÂ­ticos detectados:", issues);
    return false;
  }

  console.log("Ã¢Å“â€¦ Compatibilidade mobile verificada");
  return true;
}

// Observador para sincronizar novos elementos no DOM
function setupDomObserver() {
  const root = document.getElementById("spa-root") || document.body;

  primeControlCaches({ root: root, force: true });
  pruneStaleEntries();
  scheduleControlSync(true);

  if (typeof MutationObserver === "undefined") {
    console.warn(
      "MutationObserver indisponivel - usando fallback de sincronizacao periodica"
    );
    if (fallbackSyncTimer) {
      clearInterval(fallbackSyncTimer);
    }
    fallbackSyncTimer = setInterval(function () {
      syncAllVisibleControls();
    }, 8000);
    return;
  }

  try {
    if (fallbackSyncTimer) {
      clearInterval(fallbackSyncTimer);
      fallbackSyncTimer = null;
    }

    if (domObserverInstance) {
      domObserverInstance.disconnect();
    }

    domObserverInstance = new MutationObserver(function (mutations) {
      let changed = false;

      mutations.forEach(function (mutation) {
        mutation.removedNodes.forEach(function (node) {
          if (removeControlsFromNode(node)) {
            changed = true;
          }
        });

        mutation.addedNodes.forEach(function (node) {
          if (collectControlsFromNode(node)) {
            changed = true;
          }
        });
      });

      if (changed) {
        scheduleControlSync(true);
      }
    });

    domObserverInstance.observe(root, {
      childList: true,
      subtree: true,
    });
  } catch (error) {
    console.error("Erro ao configurar MutationObserver:", error);
    console.warn("Usando fallback de sincronizacao periodica.");
    if (fallbackSyncTimer) {
      clearInterval(fallbackSyncTimer);
    }
    fallbackSyncTimer = setInterval(function () {
      syncAllVisibleControls();
    }, 8000);
  }
}

// Sincronizar todos os controles visÃƒÂ­veis com estados salvos
function syncAllVisibleControls(forceMasterUpdate = false) {
  pruneStaleEntries();

  debugLog(() => [
    "syncAllVisibleControls",
    { devices: deviceControlCache.size, force: forceMasterUpdate },
  ]);

  let updatedControls = 0;

  deviceControlCache.forEach(function (registry, deviceId) {
    if (!registry || registry.size === 0) {
      deviceControlCache.delete(deviceId);
      return;
    }

    const savedState = getStoredState(deviceId);
    const hasState = savedState !== null && savedState !== undefined;

    if (!hasState) {
      return;
    }

    registry.forEach(function (el) {
      if (!el.isConnected) {
        registry.delete(el);
        return;
      }

      const currentState = el.dataset.state;
      if (currentState !== savedState || forceMasterUpdate) {
        setRoomControlUI(el, savedState);
        updatedControls += 1;
      }
    });

    if (registry.size === 0) {
      deviceControlCache.delete(deviceId);
    }
  });

  masterButtonCache.forEach(function (btn) {
    if (!btn.isConnected) {
      masterButtonCache.delete(btn);
      return;
    }

    const ids = (btn.dataset.deviceIds || "")
      .split(",")
      .map(function (id) {
        return id.trim();
      })
      .filter(Boolean);

    if (ids.length === 0) {
      return;
    }

    const masterState = anyOn(ids) ? "on" : "off";
    setMasterIcon(btn, masterState, forceMasterUpdate);
  });

  debugLog(() => ["syncAllVisibleControls:updated", updatedControls]);
}

// Comandos de debug globais
window.debugEletrize = {
  forcePolling: updateDeviceStatesFromServer,
  reloadStates: loadAllDeviceStatesGlobally,
  syncControls: syncAllVisibleControls,
  showLoader: showLoader,
  hideLoader: hideLoader,
  checkDevice: (deviceId) => {
    const stored = getStoredState(deviceId);
    console.log(`Device ${deviceId}: stored=${stored}`);
  },
  checkAllDevices: () => {
    console.log("Ã°Å¸â€œâ€¹ Estados de todos os dispositivos:");
    ALL_LIGHT_IDS.forEach((deviceId) => {
      const stored = getStoredState(deviceId);
      console.log(`  ${deviceId}: ${stored}`);
    });
  },
  testSetState: (deviceId, state) => {
    console.log(`Ã°Å¸Â§Âª Testando setState(${deviceId}, ${state})`);
    setStoredState(deviceId, state);
    updateDeviceUI(deviceId, state, true);
    console.log(`Ã¢Å“â€¦ Teste completo`);
  },
  clearAllStates: () => {
    console.log("Limpando todos os estados salvos...");
    ALL_LIGHT_IDS.forEach((deviceId) => {
      deviceStateMemory.delete(deviceId);
      try {
        localStorage.removeItem(deviceStateKey(deviceId));
      } catch (e) {
        debugLog(() => ["Falha ao limpar estado local", deviceId, e]);
      }
    });
    console.log("Estados limpos");
  },
  checkProtectedCommands: () => {
    console.log("Ã°Å¸â€ºÂ¡Ã¯Â¸Â Comandos protegidos:");
    if (recentCommands.size === 0) {
      console.log("  Ã¢Å“â€¦ Nenhum comando protegido");
      return;
    }
    const now = Date.now();
    recentCommands.forEach((timestamp, deviceId) => {
      const remaining = Math.max(0, COMMAND_PROTECTION_MS - (now - timestamp));
      const status = remaining > 0 ? "Ã°Å¸â€â€™ ATIVO" : "Ã°Å¸â€â€œ EXPIRADO";
      console.log(
        `  ${status} ${deviceId}: ${Math.ceil(remaining / 1000)}s restantes`
      );
    });
  },
  testMasterLoading: () => {
    console.log("Ã°Å¸â€â€ž Testando loading nos botÃƒÂµes master...");
    const masters = document.querySelectorAll(".room-master-btn");
    const scenes = document.querySelectorAll(".scene-control-card");

    console.log("BotÃƒÂµes master encontrados:", masters.length);
    console.log("BotÃƒÂµes de cenÃƒÂ¡rio encontrados:", scenes.length);

    // Testar botÃƒÂµes master da home
    masters.forEach((btn, index) => {
      console.log(`Testando botÃƒÂ£o master ${index + 1}:`, btn);
      setTimeout(() => {
        setMasterButtonLoading(btn, true);
        setTimeout(() => {
          setMasterButtonLoading(btn, false);
        }, 3000);
      }, index * 200);
    });

    // Testar botÃƒÂ£o de cenÃƒÂ¡rios também
    scenes.forEach((btn, index) => {
      setTimeout(() => {
        setMasterButtonLoading(btn, true);
        setTimeout(() => {
          setMasterButtonLoading(btn, false);
        }, 3000);
      }, (masters.length + index) * 200);
    });
  },
  checkMasterButtons: () => {
    console.log("Ã°Å¸ÂÂ  Status dos botÃƒÂµes master:");
    document.querySelectorAll(".room-master-btn").forEach((btn, index) => {
      const ids = (btn.dataset.deviceIds || "").split(",").filter(Boolean);
      const route = btn.dataset.route || "unknown";
      const pending = btn.dataset.pending === "true";
      const currentState = btn.dataset.state || "unknown";
      const calculatedState = anyOn(ids) ? "on" : "off";
      const consistent = currentState === calculatedState;

      console.log(
        `  ${index + 1}. ${route}: ${currentState} (calc: ${calculatedState}) ${
          consistent ? "Ã¢Å“â€¦" : "Ã¢ÂÅ’"
        } ${pending ? "Ã¢ÂÂ³" : "Ã°Å¸â€â€œ"}`
      );
    });
  },
  fixMasterButtons: () => {
    console.log("Ã°Å¸â€Â§ Corrigindo todos os botÃƒÂµes master...");
    document.querySelectorAll(".room-master-btn").forEach((btn) => {
      btn.dataset.pending = "false";
      const ids = (btn.dataset.deviceIds || "").split(",").filter(Boolean);
      const state = anyOn(ids) ? "on" : "off";
      setMasterIcon(btn, state, true);
    });
    console.log("Ã¢Å“â€¦ BotÃƒÂµes master corrigidos!");
  },
  mobileInfo: () => {
    console.log("Ã°Å¸â€œÂ± InformaÃƒÂ§ÃƒÂµes do dispositivo mÃƒÂ³vel:");
    console.log("  isMobile:", isMobile);
    console.log("  isIOS:", isIOS);
    console.log("  isProduction:", isProduction);
    console.log("  User Agent:", navigator.userAgent);
    console.log("  App Version:", APP_VERSION);
    try {
      console.log(
        "  ÃƒÅ¡ltima carga:",
        new Date(parseInt(localStorage.getItem("last_mobile_load") || "0"))
      );
      console.log("  Versão cache:", localStorage.getItem("app_version"));
    } catch (e) {
      console.log("  localStorage indisponível");
    }
  },
  clearMobileCache: () => {
    console.log("Ã°Å¸Â§Â¹ Limpando cache mobile...");
    try {
      localStorage.removeItem("app_version");
      localStorage.removeItem("last_mobile_load");
      localStorage.removeItem("app_cache_version");
      sessionStorage.clear();
      console.log("Ã¢Å“â€¦ Cache mobile limpo! Recarregue a página.");
    } catch (e) {
      console.error("⚠️Erro ao limpar cache:", e);
    }
  },
  forceMobileReload: () => {
    console.log("Ã°Å¸â€â€ž ForÃƒÂ§ando recarga mobile com limpeza de cache...");
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    setTimeout(() => {
      window.location.reload(true);
    }, 1000);
  },
  checkMobileCache: () => {
    console.log("Ã°Å¸â€Â Status do cache mobile:");
    try {
      const version = localStorage.getItem("app_version");
      const lastLoad = localStorage.getItem("last_mobile_load");
      const now = new Date().getTime();

      console.log("  App Version atual:", APP_VERSION);
      console.log("  Versão em cache:", version);
      console.log("  Cache vÃƒÂ¡lido:", version === APP_VERSION);

      if (lastLoad) {
        const age = Math.floor((now - parseInt(lastLoad)) / 60000); // minutos
        console.log("  Idade do cache:", age, "minutos");
        console.log("  Cache expirado:", age > 60);
      } else {
        console.log("  Primeira carga detectada");
      }
    } catch (e) {
      console.error("  Erro na verificaÃƒÂ§ÃƒÂ£o:", e);
    }
    console.log("  Screen:", `${screen.width}x${screen.height}`);
    console.log("  Viewport:", `${window.innerWidth}x${window.innerHeight}`);
    console.log(
      "  Connection:",
      navigator.connection
        ? `${navigator.connection.effectiveType} (${navigator.connection.downlink}Mbps)`
        : "não disponível"
    );
    checkMobileCompatibility();
  },
  testMobileApi: async () => {
    console.log("Ã°Å¸Â§Âª Testando APIs para mobile...");
    try {
      const testUrl = isProduction ? `${POLLING_URL}?devices=366` : "#test";
      // Configurar timeout compatÃƒÂ­vel
      const fetchConfig = {
        method: "GET",
        cache: "no-cache",
      };

      // Adicionar timeout se AbortController for suportado
      if (typeof AbortController !== "undefined") {
        const testController = new AbortController();
        setTimeout(() => testController.abort(), 5000);
        fetchConfig.signal = testController.signal;
      }

      const response = await fetch(testUrl, fetchConfig);
      console.log("Ã¢Å“â€¦ Fetch test:", response.status, response.statusText);
    } catch (error) {
      console.error("⚠️Fetch test failed:", error);
    }
  },
};

/* --- Music player metadata update functions --- */

// Função para atualizar metadados do Denon
function updateDenonMetadata() {
  // Living (ambiente2-musica) usa device 198 que não tem metadata HEOS
  if (window.location.hash.includes('ambiente2-musica')) {
    console.log("🎵 [updateDenonMetadata] Living detectado - pulando (sem metadata)");
    return;
  }
  console.log("🎵 [updateDenonMetadata] INICIANDO - Hash atual:", window.location.hash);

  // Pedir ao Cloudflare function para retornar o JSON completo do Hubitat
  // (a function usa a variÃƒÂ¡vel HUBITAT_FULL_URL do ambiente quando configurada)
  fetch(`${POLLING_URL}?full=1`)
    .then(async (response) => {
      if (!response.ok) {
        const text = await response.text().catch(() => "<no body>");
        throw new Error(`HTTP error! status: ${response.status} - ${text}`);
      }
      // Tentar analisar JSON, mas capturar e mostrar texto cru se falhar
      try {
        return await response.json();
      } catch (err) {
        const rawText = await response
          .text()
          .catch(() => "<non-readable body>");
        throw new Error(`Invalid JSON response from polling: ${rawText}`);
      }
    })
    .then((data) => {
      console.log("Ã°Å¸Å½Âµ Resposta completa do Hubitat:", data);

      // Procurar o Denon AVR pelos metadados (ID 29) nos dados
      // O formato pode ser um array direto ou um objeto com propriedade devices
      const devices = Array.isArray(data) ? data : data.devices || [];
      // O ID do dispositivo que fornece metadados do Denon é 29
      const DENON_METADATA_DEVICE_ID = "29";
      let denonDevice = devices.find(
        (device) =>
          String(device.id) === DENON_METADATA_DEVICE_ID ||
          device.id === parseInt(DENON_METADATA_DEVICE_ID, 10)
      );
      // Fallback: procurar por dispositivos cujo nome/label contenha 'denon', 'receiver' ou 'av'
      if (!denonDevice) {
        denonDevice = devices.find((device) => {
          const name = String(device.name || device.label || "").toLowerCase();
          return (
            name.includes("denon") ||
            name.includes("receiver") ||
            name.includes("av")
          );
        });
        if (denonDevice)
          console.log(
            "Ã°Å¸â€Å½ Denon metadata device encontrado por name/label:",
            denonDevice
          );
      }

      if (denonDevice) {
        console.log("Denon encontrado:", denonDevice);
        const metadataPowerState = getDenonPowerStateFromDevice(denonDevice);
        if (metadataPowerState) {
          applyDenonPowerState(metadataPowerState);
        }
        console.log("Ã°Å¸Å½Âµ Atributos do Denon:", denonDevice.attributes);

        // Extrair metadados - o formato pode variar
        let artist = "Desconhecido";
        let track = "Sem tÃƒÂ­tulo";
        let album = "ÃƒÂlbum desconhecido";
        let albumArt = null;
        let playbackStatus = null;
        let trackDataRaw = null;
        let trackDataObj = null;

        // Tentar extrair de diferentes formatos possÃƒÂ­veis
        if (Array.isArray(denonDevice.attributes)) {
          // Formato array: [{name: "artist", currentValue: "..."}, ...]
          const artistAttr = denonDevice.attributes.find(
            (attr) => attr.name === "artist" || attr.name === "trackArtist"
          );
          const trackAttr = denonDevice.attributes.find(
            (attr) => attr.name === "trackDescription" || attr.name === "track"
          );
          const albumAttr = denonDevice.attributes.find(
            (attr) => attr.name === "albumName" || attr.name === "album"
          );
          const albumArtAttr = denonDevice.attributes.find(
            (attr) => {
              const name = attr.name?.toLowerCase();
              return (
                name === "albumarturl" ||
                name === "albumarturi" ||
                name === "currentalbumarturl" ||
                name === "currentalbumarturi" ||
                name === "enqueuedmetadataalbumarturl" ||
                name === "enqueuedmetadataalbumarturi" ||
                name === "albumart" ||
                name === "artworkurl" ||
                name === "imageurl"
              );
            }
          );
          const statusAttr = denonDevice.attributes.find((attr) => {
            const attrName = String(attr?.name || "").toLowerCase();
            return (
              attrName === "status" ||
              attrName === "playbackstatus" ||
              attrName === "playerstatus" ||
              attrName === "transportstate"
            );
          });
          const trackDataAttr = denonDevice.attributes.find(
            (attr) => attr.name === "trackData" || attr.name === "trackdata"
          );

          artist = artistAttr?.currentValue || artistAttr?.value || artist;
          track = trackAttr?.currentValue || trackAttr?.value || track;
          album = albumAttr?.currentValue || albumAttr?.value || album;
          
          // Extrair albumArt e processar (pode ser URL direta ou HTML)
          const rawAlbumArt = albumArtAttr?.currentValue || albumArtAttr?.value;
          if (rawAlbumArt && typeof rawAlbumArt === "string") {
            const albumArtValue = rawAlbumArt.trim();
            if (albumArtValue.startsWith('http://') || albumArtValue.startsWith('https://')) {
              albumArt = albumArtValue;
              console.log("🎵 [array] albumArt é URL direta:", albumArt);
            } else if (albumArtValue.includes('<img') || albumArtValue.includes('src=')) {
              const imgMatch = albumArtValue.match(/src=['"]([^'"]+)['"]/);
              albumArt = imgMatch ? imgMatch[1] : null;
              console.log("🎵 [array] albumArt extraído de HTML:", albumArt);
            } else {
              albumArt = albumArtValue;
              console.log("🎵 [array] albumArt valor direto:", albumArt);
            }
          }
          
          playbackStatus =
            statusAttr?.currentValue || statusAttr?.value || playbackStatus;
          trackDataRaw =
            trackDataAttr?.currentValue || trackDataAttr?.value || trackDataRaw;
        } else if (
          denonDevice.attributes &&
          typeof denonDevice.attributes === "object"
        ) {
          // Formato objeto: {artist: "...", trackDescription: "...", track: "...", album: "...", ...}
          artist = denonDevice.attributes.artist || artist;
          track = denonDevice.attributes.track || track;
          album = denonDevice.attributes.album || album;
          playbackStatus =
            denonDevice.attributes.status ||
            denonDevice.attributes.playbackStatus ||
            denonDevice.attributes.playerStatus ||
            denonDevice.attributes.transportState ||
            playbackStatus;
          trackDataRaw = denonDevice.attributes.trackData || trackDataRaw;

          // Para albumArt, verificar se já é uma URL ou se precisa extrair de tag HTML
          if (
            denonDevice.attributes.albumArt &&
            typeof denonDevice.attributes.albumArt === "string"
          ) {
            const albumArtValue = denonDevice.attributes.albumArt.trim();
            
            // Se já começa com http/https, é uma URL direta
            if (albumArtValue.startsWith('http://') || albumArtValue.startsWith('https://')) {
              albumArt = albumArtValue;
              console.log("🎵 albumArt é URL direta:", albumArt);
            } 
            // Senão, tentar extrair de tag HTML <img src="...">
            else if (albumArtValue.includes('<img') || albumArtValue.includes('src=')) {
              const imgMatch = albumArtValue.match(/src=['"]([^'"]+)['"]/);
              albumArt = imgMatch ? imgMatch[1] : null;
              console.log("🎵 albumArt extraído de HTML:", albumArt);
            }
            // Pode ser um caminho relativo ou outro formato
            else {
              albumArt = albumArtValue;
              console.log("🎵 albumArt valor direto:", albumArt);
            }
          }

          // Se não encontrou albumArt, tentar extrair do trackData JSON
          if (!albumArt && denonDevice.attributes.trackData) {
            try {
              const trackData =
                typeof denonDevice.attributes.trackData === "string"
                  ? JSON.parse(denonDevice.attributes.trackData)
                  : denonDevice.attributes.trackData;
              trackDataObj = trackData;
              albumArt = trackData.image_url || albumArt;
            } catch (e) {
              console.warn("Ã¢Å¡Â Ã¯Â¸Â Erro ao parsear trackData:", e);
            }
          }
        }

        if (!trackDataObj && trackDataRaw) {
          try {
            trackDataObj =
              typeof trackDataRaw === "string"
                ? JSON.parse(trackDataRaw)
                : trackDataRaw;
          } catch (e) {
            console.warn("Ã¢Å¡Â Ã¯Â¸Â Erro ao parsear trackData (raw):", e);
          }
        }

        if (
          !albumArt &&
          trackDataObj &&
          typeof trackDataObj.image_url === "string"
        ) {
          albumArt = trackDataObj.image_url;
        }

        let derivedPlaybackStatus = interpretPlaybackStatus(playbackStatus);
        if (derivedPlaybackStatus === null && trackDataObj) {
          const trackDataStatus =
            trackDataObj.play_state ||
            trackDataObj.player_state ||
            trackDataObj.state ||
            trackDataObj.status ||
            trackDataObj.transport_state;
          derivedPlaybackStatus = interpretPlaybackStatus(trackDataStatus);
        }

        if (derivedPlaybackStatus !== null) {
          window.musicPlayerUI.currentPlaying = derivedPlaybackStatus;
          if (
            window.musicPlayerUI &&
            typeof window.musicPlayerUI.setPlaying === "function"
          ) {
            window.musicPlayerUI.setPlaying(derivedPlaybackStatus);
          }
        }

        console.log("🎵 Metadados extraídos:", {
          artist,
          track,
          album,
          albumArt,
        });
        
        // Debug: se albumArt não foi encontrado, listar todos os atributos disponíveis
        if (!albumArt) {
          console.log("⚠️ Album art não encontrado. Atributos disponíveis no dispositivo 29:");
          if (Array.isArray(denonDevice.attributes)) {
            denonDevice.attributes.forEach(attr => {
              const name = attr.name?.toLowerCase() || '';
              if (name.includes('art') || name.includes('image') || name.includes('url') || name.includes('uri') || name.includes('album')) {
                console.log(`   - ${attr.name}: ${attr.currentValue || attr.value}`);
              }
            });
          } else if (denonDevice.attributes) {
            Object.keys(denonDevice.attributes).forEach(key => {
              const keyLower = key.toLowerCase();
              if (keyLower.includes('art') || keyLower.includes('image') || keyLower.includes('url') || keyLower.includes('uri') || keyLower.includes('album')) {
                console.log(`   - ${key}: ${denonDevice.attributes[key]}`);
              }
            });
          }
        }
        
        artist = normalizePortugueseText(artist);
        track = normalizePortugueseText(track);
        album = normalizePortugueseText(album);

        // Atualizar UI
        updateMusicPlayerUI(artist, track, album, albumArt);
      } else {
        console.log(
          "Ã¢Å¡Â Ã¯Â¸Â Denon AVR (ID 29) (metadados) não encontrado nos dados"
        );
        console.log(
          "Dispositivos disponÃƒÂ­veis:",
          devices.map((d) => ({ id: d.id, name: d.name || d.label }))
        );
      }
    })
    .catch((error) => {
      console.error("⚠️Erro ao buscar metadados do Denon:", error);
      // Tentar logar a resposta bruta para debug adicional via endpoint de polling
      fetch(`${POLLING_URL}?full=1`)
        .then((res) => res.text())
        .then((t) => console.log("Raw polling response (debug):", t))
        .catch((e) =>
          console.warn(
            "não foi possível obter resposta bruta de /polling:",
            e
          )
        );
    });
}

// Função para atualizar a UI do player com os metadados
function updateMusicPlayerUI(artist, track, album, albumArt) {
  artist = normalizePortugueseText(artist);
  track = normalizePortugueseText(track);
  album = normalizePortugueseText(album);

  // Obter elementos do DOM
  const artistElement = queryActiveMusic("#music-artist");
  const trackElement = queryActiveMusic("#music-track");
  const albumImgElement = queryActiveMusic(".music-album-img");
  const activePage = document.querySelector(".page.active");

  // Atualizar texto se os elementos existirem
  if (artistElement) artistElement.textContent = artist;
  if (activePage) {
    activePage
      .querySelectorAll(".music-artist-sync")
      .forEach((el) => (el.textContent = artist));
  }

  if (trackElement) trackElement.textContent = track;
  if (activePage) {
    activePage
      .querySelectorAll(".music-track-sync")
      .forEach((el) => (el.textContent = track));
  }

  syncMusicTrackMarquee();

  // Atualizar imagem do ÃƒÂ¡lbum
  if (albumImgElement) {
    if (albumArt && albumArt !== "null" && albumArt !== "") {
      albumImgElement.src = albumArt;
      albumImgElement.onerror = function () {
        // Se a imagem falhar, use placeholder
        this.src = "images/Images/photo-varanda.jpg";
      };
    } else {
      // Usar placeholder se não houver capa
      albumImgElement.src = "images/Images/photo-varanda.jpg";
    }
  }

  console.log(`Ã°Å¸Å½Âµ UI atualizada: "${track}" por ${artist} (${album})`);
}

// VariÃƒÂ¡vel global para o intervalo de polling de metadados
let musicMetadataInterval = null;

// Função para iniciar polling especÃƒÂ­fico de metadados do player
function startMusicMetadataPolling() {
  // Living (ambiente2-musica) não tem metadata - pular
  if (window.location.hash.includes('ambiente2-musica')) {
    console.log("🎵 Living detectado - sem polling de metadata");
    return;
  }
  // Parar polling anterior se existir
  stopMusicMetadataPolling();

  console.log("🎵 Iniciando polling de metadados a cada 3 segundos");

  // Iniciar novo polling a cada 3 segundos
  musicMetadataInterval = setInterval(() => {
    if (isMusicPageActive()) {
      updateDenonMetadata();
    } else {
      // Se saÃƒÂ­mos da página, parar o polling
      stopMusicMetadataPolling();
    }
  }, 3000);
}

// Função para parar o polling de metadados
function stopMusicMetadataPolling() {
  if (musicMetadataInterval) {
    clearInterval(musicMetadataInterval);
    musicMetadataInterval = null;
    console.log("Ã°Å¸Å½Âµ Polling de metadados parado");
  }
}

/* --- Music player UI handlers (simple local behavior for now) --- */

let musicTrackMarqueeListenersAttached = false;

function syncMusicTrackMarquee() {
  ensureMusicTrackMarqueeListeners();

  const activePage = document.querySelector(".page.active");
  if (!activePage) {
    return;
  }

  const trackElements = activePage.querySelectorAll(
    ".music-track-marquee__text:not(.music-track-marquee__text--clone)"
  );

  trackElements.forEach((trackElement) => {
    const marqueeContainer = trackElement.closest(".music-track-marquee");
    if (!marqueeContainer) {
      return;
    }

    const marqueeInner = marqueeContainer.querySelector(
      ".music-track-marquee__inner"
    );
    if (!marqueeInner) {
      return;
    }

    const cloneElement = marqueeContainer.querySelector(
      ".music-track-marquee__text--clone"
    );
    if (cloneElement) {
      cloneElement.textContent = trackElement.textContent || "";
    }

    marqueeContainer.classList.remove("music-track-marquee--active");
    marqueeContainer.style.removeProperty("--music-track-marquee-duration");

    requestAnimationFrame(() => {
      const containerWidth = marqueeContainer.clientWidth;
      const contentWidth = marqueeInner.scrollWidth;
      const shouldMarquee = contentWidth > containerWidth + 2;

      marqueeContainer.classList.toggle(
        "music-track-marquee--active",
        shouldMarquee
      );

      if (shouldMarquee) {
        const pixelsPerSecond = 80;
        const duration = Math.min(
          24,
          Math.max(10, contentWidth / pixelsPerSecond)
        );
        marqueeContainer.style.setProperty(
          "--music-track-marquee-duration",
          `${duration}s`
        );
      }
    });
  });
}

function ensureMusicTrackMarqueeListeners() {
  if (musicTrackMarqueeListenersAttached) {
    return;
  }

  const handleResize = () => syncMusicTrackMarquee();
  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", handleResize);

  musicTrackMarqueeListenersAttached = true;
}

// Fallback to convert legacy music markup into controls-only layout.
// This guarantees Varanda/Living/Piscina keep the new UI even if old HTML is cached.
function enforceMusicControlsOnlyLayout() {
  const activePage = document.querySelector(".page.active");
  if (!activePage) return;

  const playerContent = activePage.querySelector(
    ".music-player-card .music-player-content"
  );
  if (!playerContent) return;

  if (playerContent.classList.contains("music-player-content--controls-only")) {
    return;
  }

  const controlsBlock = playerContent.querySelector(".music-controls");
  const volumeBlock = playerContent.querySelector(".music-volume-section");
  const masterBlock = playerContent.querySelector(".music-master-controls");

  if (!controlsBlock || !volumeBlock || !masterBlock) {
    return;
  }

  playerContent
    .querySelectorAll(".music-primary, .music-info--desktop")
    .forEach((node) => node.remove());

  const shell = document.createElement("div");
  shell.className = "music-control-shell";

  const createPanel = (title, className, bodyNode) => {
    const panel = document.createElement("section");
    panel.className = className;

    const label = document.createElement("h2");
    label.className = "music-section-label";
    label.textContent = title;
    panel.appendChild(label);
    panel.appendChild(bodyNode);

    return panel;
  };

  shell.appendChild(
    createPanel(
      "Reproducao",
      "music-control-panel music-control-panel--transport",
      controlsBlock
    )
  );
  shell.appendChild(
    createPanel("Volume", "music-control-panel", volumeBlock)
  );
  shell.appendChild(
    createPanel("Energia", "music-control-panel", masterBlock)
  );

  playerContent.innerHTML = "";
  playerContent.classList.add("music-player-content--controls-only");
  playerContent.appendChild(shell);
}

function initMusicPlayerUI() {
  // Guard clause: verificar se estamos em uma página de música
  if (!isMusicPageActive()) {
    console.log(" Não está em página de música, ignorando initMusicPlayerUI");
    return;
  }

  enforceMusicControlsOnlyLayout();

  // Se for a página do Living (ambiente2-musica), inicializar apenas o slider de volume
  // pois o Living usa controles diferentes (device 198 sem metadata)
  const hash = window.location.hash;
  if (hash.includes('ambiente2-musica')) {
    console.log("🎵 Página de música do Living detectada - inicializando controles específicos");
    initLivingMusicVolumeSlider();
    return;
  }

  const playToggleBtn = queryActiveMusic("#music-play-toggle");
  const playTogglePlayIcon = playToggleBtn
    ? playToggleBtn.querySelector(".music-play-toggle__icon--play")
    : null;
  const playTogglePauseIcon = playToggleBtn
    ? playToggleBtn.querySelector(".music-play-toggle__icon--pause")
    : null;
  const nextBtn = queryActiveMusic("#music-next");
  const prevBtn = queryActiveMusic("#music-prev");
  const muteBtn = queryActiveMusic("#music-mute");
  const volumeSlider = queryActiveMusic("#music-volume-slider");
  const volumeSection = queryActiveMusic(".music-volume-section");
  const volumeIconUnmuted = queryActiveMusic(".volume-icon-unmuted");
  const volumeIconMuted = queryActiveMusic(".volume-icon-muted");
  const masterOnBtn = queryActiveMusic("#music-master-on");
  const masterOffBtn = queryActiveMusic("#music-master-off");
  const playerInner = queryActiveMusic(".music-player-inner");

  console.log("Ã°Å¸Å½Âµ Inicializando player de mÃƒÂºsica...", {
    playToggleBtn,
    masterOnBtn,
    masterOffBtn,
  });

  window.musicPlayerUI = window.musicPlayerUI || {};
  const initialPowerState =
    typeof window.musicPlayerUI.currentPowerState === "string"
      ? window.musicPlayerUI.currentPowerState
      : "on";

  if (!playToggleBtn || !nextBtn || !prevBtn) {
    console.warn("Ã¢Å¡Â Ã¯Â¸Â BotÃƒÂµes de controle não encontrados");
    return;
  }

  // Estado do volume
  let isMuted = false;
  let volumeBeforeMute = 50;
  // Guardar estado anterior de mute quando o master for desligado
  let previousMutedState = false;
  let isPlaying = false;

  // Estado master power
  let isPowerOn = initialPowerState === "on";

  function setPlaying(isPlayingValue) {
    isPlaying = !!isPlayingValue;
    playToggleBtn.setAttribute("aria-pressed", isPlaying ? "true" : "false");
    playToggleBtn.classList.toggle("is-playing", isPlaying);

    if (playTogglePlayIcon) {
      playTogglePlayIcon.style.display = isPlaying ? "none" : "block";
    }

    if (playTogglePauseIcon) {
      playTogglePauseIcon.style.display = isPlaying ? "block" : "none";
    }

    playToggleBtn.setAttribute("aria-label", isPlaying ? "Pausar" : "Tocar");
    window.musicPlayerUI.currentPlaying = isPlaying;
  }

  function setMuted(muted) {
    isMuted = muted;
    muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
    volumeSection.setAttribute("data-muted", muted ? "true" : "false");

    if (volumeIconUnmuted && volumeIconMuted) {
      volumeIconUnmuted.style.display = muted ? "none" : "block";
      volumeIconMuted.style.display = muted ? "block" : "none";
    }

    if (muted) {
      volumeBeforeMute = parseInt(volumeSlider.value);
      volumeSlider.value = 0;
      console.log(
        "Ã°Å¸â€â€¡ Volume mutado. Volume anterior:",
        volumeBeforeMute
      );
      // Atualiza a barra visual para 0% quando mutado
      if (typeof updateVolumeBar === "function") updateVolumeBar();
    } else {
      volumeSlider.value = volumeBeforeMute;
      console.log(
        "Ã°Å¸â€Å  Volume desmutado. Volume restaurado:",
        volumeBeforeMute
      );
      // Atualiza a barra visual para o valor restaurado
      if (typeof updateVolumeBar === "function") updateVolumeBar();
    }
  }

  // Device IDs (default) Ã¢â‚¬â€ podem ser sobrescritos por data-* no HTML da página ativa
  let DENON_CMD_DEVICE_ID = "15"; // Denon AVR - comandos (volume/mute/power)
  let DENON_MUSIC_DEVICE_ID = "29"; // Denon HEOS - metadados/transport (play/pause/next/prev)

  // Tentar detectar overrides a partir dos atributos data-*
  try {
    const metadataContainer = queryActiveMusic(".music-player-card");
    const ctrlFromEl =
      queryActiveMusic("#music-mute") ||
      queryActiveMusic("#music-volume-slider") ||
      queryActiveMusic("#music-master-on") ||
      queryActiveMusic("#music-master-off");

    if (
      metadataContainer &&
      metadataContainer.dataset &&
      metadataContainer.dataset.metadataDeviceId
    ) {
      DENON_MUSIC_DEVICE_ID = String(
        metadataContainer.dataset.metadataDeviceId
      );
    }

    if (ctrlFromEl && ctrlFromEl.dataset && ctrlFromEl.dataset.deviceId) {
      DENON_CMD_DEVICE_ID = String(ctrlFromEl.dataset.deviceId);
    }
  } catch (e) {
    console.warn(
      "não foi possível ler overrides de IDs de Denon via data-*:",
      e
    );
  }

  playToggleBtn.addEventListener("click", () => {
    const action = isPlaying ? "pause" : "play";
    console.log(
      "Ã°Å¸Å½Âµ Toggle play/pause -> enviando comando",
      action,
      "para device",
      DENON_MUSIC_DEVICE_ID
    );

    sendHubitatCommand(DENON_MUSIC_DEVICE_ID, action)
      .then(() => {
        console.log("Ã¢Å“â€¦ Comando " + action + " enviado com sucesso");
        setPlaying(!isPlaying);
      })
      .catch((err) =>
        console.error("⚠️Erro ao enviar comando " + action + ":", err)
      );
  });

  nextBtn.addEventListener("click", () => {
    console.log(
      "Ã¢ÂÂ­Ã¯Â¸Â Next clicked - enviando comando para device",
      DENON_MUSIC_DEVICE_ID
    );
    sendHubitatCommand(DENON_MUSIC_DEVICE_ID, "nextTrack")
      .then(() => console.log("Ã¢Å“â€¦ Comando nextTrack enviado com sucesso"))
      .catch((err) =>
        console.error("⚠️Erro ao enviar comando nextTrack:", err)
      );
  });

  prevBtn.addEventListener("click", () => {
    console.log(
      "Ã¢ÂÂ®Ã¯Â¸Â Previous clicked - enviando comando para device",
      DENON_MUSIC_DEVICE_ID
    );
    sendHubitatCommand(DENON_MUSIC_DEVICE_ID, "previousTrack")
      .then(() =>
        console.log("Ã¢Å“â€¦ Comando previousTrack enviado com sucesso")
      )
      .catch((err) =>
        console.error("⚠️Erro ao enviar comando previousTrack:", err)
      );
  });

  window.musicPlayerUI.setPlaying = setPlaying;
  window.musicPlayerUI.isPlaying = () => isPlaying;

  // Controle de volume
  if (muteBtn && volumeSlider) {
    muteBtn.addEventListener("click", () => {
      const newMutedState = !isMuted;
      const command = newMutedState ? "mute" : "unmute";
      console.log(
        `Ã°Å¸â€â€¡ Mute button clicked - enviando comando "${command}" para device ${DENON_CMD_DEVICE_ID}`
      );

      sendHubitatCommand(DENON_CMD_DEVICE_ID, command)
        .then(() => {
          console.log(`Ã¢Å“â€¦ Comando ${command} enviado com sucesso`);
          setMuted(newMutedState);
        })
        .catch((err) =>
          console.error(`⚠️Erro ao enviar comando ${command}:`, err)
        );
    });

    // Função para atualizar a barra de volume
    function updateVolumeBar() {
      const value = parseInt(volumeSlider.value);
      const percent = (value / 100) * 100;
      volumeSlider.style.setProperty("--volume-percent", percent + "%");
      console.log(
        "Ã°Å¸â€Å  Volume ajustado para:",
        value,
        "% -",
        percent + "%"
      );
    }

    // Event listener para input (arrastar o slider)
    volumeSlider.addEventListener("input", (e) => {
      updateVolumeBar();
    });

    // Event listener para change (quando solta o slider)
    volumeSlider.addEventListener("change", (e) => {
      updateVolumeBar();
      const value = e.target.value;
      console.log("Ã°Å¸â€Å  Volume finalizado em:", value);
    });

    // If there's a separate music slider, wire it to send commands to Denon (device 15)
    const musicSlider = queryActiveMusic("#music-volume-slider");
    if (musicSlider) {
      musicSlider.addEventListener("input", (e) => {
        // update visual bar for music slider
        const v = parseInt(e.target.value);
        musicSlider.style.setProperty(
          "--volume-percent",
          (v / 100) * 100 + "%"
        );
      });

      musicSlider.addEventListener("change", (e) => {
        const value = e.target.value;
        console.log(
          `Ã°Å¸â€Å  Music slider changed -> sending setVolume ${value} to Denon (${DENON_CMD_DEVICE_ID})`
        );
        // Mark recent command to prevent polling overwrite
        recentCommands.set(DENON_CMD_DEVICE_ID, Date.now());
        // Send command
        sendHubitatCommand(DENON_CMD_DEVICE_ID, "setVolume", value)
          .then(() =>
            console.log("Ã¢Å“â€¦ setVolume sent to Denon via music slider")
          )
          .catch((err) =>
            console.error(
              "⚠️Error sending setVolume from music slider:",
              err
            )
          );
      });
    }

    // Garantir que o slider seja interativo
    volumeSlider.style.pointerEvents = "auto";

    // Inicializar a barra com o valor padrÃƒÂ£o
    updateVolumeBar();

    console.log("Ã°Å¸Å½Âµ Slider de volume configurado:", volumeSlider);
  } else {
    console.warn("Ã¢Å¡Â Ã¯Â¸Â BotÃƒÂ£o mute ou slider não encontrados");
  }

  // Controle master On/Off
  function setMasterPower(powerOn) {
    isPowerOn = powerOn;
    window.musicPlayerUI.currentPowerState = powerOn ? "on" : "off";

    if (powerOn) {
      masterOnBtn.classList.add("music-master-btn--active");
      masterOnBtn.setAttribute("aria-pressed", "true");
      masterOffBtn.classList.remove("music-master-btn--active");
      masterOffBtn.setAttribute("aria-pressed", "false");
      playerInner.classList.remove("power-off");
      console.log("Ã¢Å¡Â¡ Player ligado");
      // Restaurar estado de mute que havia antes do power-off
      setMuted(previousMutedState);
    } else {
      masterOffBtn.classList.add("music-master-btn--active");
      masterOffBtn.setAttribute("aria-pressed", "true");
      masterOnBtn.classList.remove("music-master-btn--active");
      masterOnBtn.setAttribute("aria-pressed", "false");
      playerInner.classList.add("power-off");
      console.log("Ã¢Å¡Â« Player desligado");
      // Salvar estado atual de mute e forÃƒÂ§ar mute enquanto estiver desligado
      previousMutedState = isMuted;
      setMuted(true);
    }
  }

  if (masterOnBtn && masterOffBtn && playerInner) {
    masterOnBtn.addEventListener("click", () => {
      if (!isPowerOn) {
        console.log(
          `Power ON clicked - enviando comando "on" para device ${DENON_CMD_DEVICE_ID}`
        );
        recentCommands.set(DENON_CMD_DEVICE_ID, Date.now());
        sendHubitatCommand(DENON_CMD_DEVICE_ID, "on")
          .then(() => {
            console.log("Ã¢Å“â€¦ Comando on enviado com sucesso");
            setMasterPower(true);
          })
          .catch((err) =>
            console.error("⚠️Erro ao enviar comando on:", err)
          );
      }
    });

    masterOffBtn.addEventListener("click", () => {
      if (isPowerOn) {
        console.log(
          `Power OFF clicked - enviando comando "off" para device ${DENON_CMD_DEVICE_ID}`
        );
        recentCommands.set(DENON_CMD_DEVICE_ID, Date.now());
        sendHubitatCommand(DENON_CMD_DEVICE_ID, "off")
          .then(() => {
            console.log("Ã¢Å“â€¦ Comando off enviado com sucesso");
            setMasterPower(false);
          })
          .catch((err) =>
            console.error("⚠️Erro ao enviar comando off:", err)
          );
      }
    });
  }

  window.musicPlayerUI.setPower = (powerOnValue) =>
    setMasterPower(normalizeDenonPowerState(powerOnValue) === "on");
  window.musicPlayerUI.isPowerOn = () => isPowerOn;

  // initialize
  setPlaying(Boolean(window.musicPlayerUI.currentPlaying));
  setMasterPower(initialPowerState === "on");

  // Buscar metadados iniciais do Denon
  updateDenonMetadata();
  updateDenonVolumeFromServer();

  // Iniciar polling de metadados
  startMusicMetadataPolling();

  syncMusicTrackMarquee();

  console.log("Ã°Å¸Å½Âµ Player de mÃƒÂºsica inicializado");
}

// Initialize when SPA navigation might insert the music page
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(initMusicPlayerUI, 100);
});

// Versão ultra-bÃƒÂ¡sica para browsers problemÃƒÂ¡ticos
function initUltraBasicMode() {
  try {
    showMobileDebug("Ã°Å¸Å¡Â¨ Inicializando modo ultra-bÃƒÂ¡sico...", "info");

    // Esconder loader de forma mais segura
    var loader = document.getElementById("global-loader");
    if (loader) {
      loader.style.display = "none";
      showMobileDebug("Ã¢Å“â€¦ Loader escondido em modo bÃƒÂ¡sico", "success");
    }

    // Definir estados bÃƒÂ¡sicos sem usar localStorage (pode falhar no mobile)
    var processedDevices = 0;
    ALL_LIGHT_IDS.forEach(function (deviceId) {
      try {
        var controls = document.querySelectorAll(
          '[data-device-id="' + deviceId + '"]'
        );
        controls.forEach(function (control) {
          if (control.classList.contains("room-control")) {
            control.dataset.state = "off";
            var img = control.querySelector(".room-control-icon");
            if (img) {
              img.src = "images/icons/icon-small-light-off.svg";
            }
            processedDevices++;
          }
        });
      } catch (e) {
        showMobileDebug(
          "Erro no dispositivo " + deviceId + ": " + e.message,
          "error"
        );
      }
    });

    showMobileDebug(
      "Ã¢Å“â€¦ Modo ultra-bÃƒÂ¡sico ativo - " +
        processedDevices +
        " dispositivos processados",
      "success"
    );

    // Verificar elementos bÃƒÂ¡sicos
    var controls = document.querySelectorAll(".room-control");
    var masters = document.querySelectorAll(".room-master-btn");
    showMobileDebug(
      "Ã°Å¸â€Â Encontrados " +
        controls.length +
        " controles e " +
        masters.length +
        " masters",
      "info"
    );

    return true; // Sucesso
  } catch (error) {
    showMobileDebug(
      "⚠️ERRO CRÃƒÂTICO no modo ultra-bÃƒÂ¡sico: " + error.message,
      "error"
    );
    return false; // Falha
  }
}

// Função de inicialização simplificada para mobile COM POLLING ATIVO
function initSimpleMode() {
  console.log("Ã°Å¸â€œÂ± Inicializando modo simples com polling...");

  try {
    console.log("Ã°Å¸â€œÂ± Tentando mostrar loader...");
    showLoader();

    console.log("Ã°Å¸â€œÂ± Atualizando progresso...");
    updateProgress(10, "Modo simples com polling ativo...");

    console.log(
      "Ã°Å¸â€œÂ± Processando",
      ALL_LIGHT_IDS.length,
      "dispositivos..."
    );

    // Carregar estados bÃƒÂ¡sicos
    for (var i = 0; i < ALL_LIGHT_IDS.length; i++) {
      var deviceId = ALL_LIGHT_IDS[i];
      var progress = 10 + ((i + 1) / ALL_LIGHT_IDS.length) * 70; // Deixar 20% para polling

      console.log(
        "Ã°Å¸â€œÂ± Processando device",
        deviceId,
        "- progresso:",
        progress + "%"
      );
      updateProgress(
        progress,
        "Carregando " + (i + 1) + "/" + ALL_LIGHT_IDS.length + "..."
      );

      try {
        updateDeviceUI(deviceId, "off", true);
      } catch (e) {
        console.error("⚠️Erro no device", deviceId + ":", e);
      }
    }

    console.log("Ã°Å¸â€œÂ± Configurando polling para modo simples...");
    updateProgress(85, "Ativando sincronizaÃƒÂ§ÃƒÂ£o...");

    // Configurar observador DOM simplificado
    try {
      setupDomObserver();
      console.log("Ã¢Å“â€¦ Observador DOM configurado no modo simples");
    } catch (e) {
      console.warn("Ã¢Å¡Â Ã¯Â¸Â Observador DOM falhou no modo simples:", e);
    }

    // Sincronizar controles visÃƒÂ­veis
    updateProgress(90, "Sincronizando controles...");
    setTimeout(function () {
      try {
        scheduleControlSync(true);
        console.log("Ã¢Å“â€¦ Controles sincronizados no modo simples");
      } catch (e) {
        console.warn("Ã¢Å¡Â Ã¯Â¸Â SincronizaÃƒÂ§ÃƒÂ£o falhou:", e);
      }
    }, 300);

    // IMPLEMENTAR POLLING NO MODO SIMPLES
    updateProgress(95, "Iniciando polling...");
    setTimeout(function () {
      if (isProduction) {
        console.log("Ã°Å¸â€â€ž Iniciando polling em modo simples...");
        try {
          startPolling(); // Ativar polling completo mesmo no modo simples
          console.log("Ã¢Å“â€¦ Polling ativo no modo simples");
        } catch (e) {
          console.error("⚠️Erro ao iniciar polling no modo simples:", e);
        }
      } else {
        console.log(
          "Ã°Å¸â€™Â» Modo desenvolvimento - polling não iniciado no modo simples"
        );
      }

      updateProgress(100, "Modo simples com polling ativo!");

      setTimeout(function () {
        console.log("Ã°Å¸â€œÂ± Escondendo loader...");
        hideLoader();
        console.log("Ã¢Å“â€¦ Modo simples com polling completo ativo");
      }, 1000);
    }, 2000); // Aguardar 2s para estabilizar antes do polling
  } catch (error) {
    console.error("⚠️ERRO CRÃƒÂTICO no modo simples:", error);
    console.error("⚠️Erro stack:", error.stack);
    console.error("⚠️Erro linha:", error.lineNumber || "desconhecida");

    // Ativar modo ultra-bÃƒÂ¡sico como fallback
    console.log("Ã°Å¸Å¡Â¨ Ativando modo ultra-bÃƒÂ¡sico...");
    initUltraBasicMode();
  }
}

// Tratamento de erros globais para debug mobile
window.onerror = function (message, source, lineno, colno, error) {
  console.error("Ã°Å¸Å¡Â¨ ERRO GLOBAL DETECTADO:");
  console.error("Ã°Å¸â€œÂ Mensagem:", message);
  console.error("Ã°Å¸â€œÂ Arquivo:", source);
  console.error("Ã°Å¸â€œÂ Linha:", lineno);
  console.error("Ã°Å¸â€œÂ Coluna:", colno);
  console.error("Ã°Å¸â€œÂ Erro:", error);

  // Tentar ativar modo ultra-bÃƒÂ¡sico
  setTimeout(function () {
    console.log("Ã°Å¸Å¡Â¨ Tentando recuperaÃƒÂ§ÃƒÂ£o automÃƒÂ¡tica...");
    try {
      initUltraBasicMode();
    } catch (e) {
      console.error("Ã°Å¸â€™Â¥ Falha na recuperaÃƒÂ§ÃƒÂ£o:", e);
    }
  }, 1000);

  return false; // não impedir outros handlers
};

// Capturar promises rejeitadas
window.addEventListener("unhandledrejection", function (event) {
  console.error("Ã°Å¸Å¡Â¨ PROMISE REJEITADA:", event.reason);
  console.error("Ã°Å¸Å¡Â¨ Promise:", event.promise);
});

console.log("Script carregado, configurando DOMContentLoaded...");

// Função de inicialização unificada (mobile e desktop idênticos)
// Função de inicialização unificada (mobile e desktop idênticos)
function initializeApp() {
  console.log("DASHBOARD ELETRIZE INICIALIZANDO");
  console.log("Mobile detectado:", isMobile);

  // Marcar que a inicialização foi iniciada
  window.initializationStarted = true;

  // Debug visual para mobile
  showMobileDebug("DASHBOARD ELETRIZE INICIALIZANDO", "info");

  // Envolver tudo em try-catch para capturar qualquer erro
  try {
    console.log("Iniciando carregamento (comportamento unificado)...");
    showLoader();

    // Timeout padrÃƒÂ£o para desktop e mobile (comportamento idÃƒÂªntico)
    var initDelay = 500;
    console.log(
      "Delay de inicialização: " + initDelay + "ms (universal)"
    );

    // Aguardar um pouco para UI carregar e entÃƒÂ£o iniciar carregamento
    setTimeout(function () {
      console.log("Iniciando carregamento principal...");

      try {
        // Carregamento global de todos os estados (usando Promise)
        loadAllDeviceStatesGlobally()
          .then(function (success) {
            console.log("Carregamento global concluído, success:", success);

            // ========================================
            // INICIALIZAÇÃO DE DISPOSITIVOS
            // ========================================
            // Enviar comando initialize para todos os dispositivos que suportam
            if (!devicesInitialized && isProduction) {
              console.log("🔧 Iniciando inicialização de dispositivos...");
              updateProgress(85, "Inicializando dispositivos...");
              
              initializeAllDevices(function(progress, message) {
                // Mapear progresso de 85% a 95%
                var mappedProgress = 85 + Math.round(progress * 0.10);
                updateProgress(mappedProgress, message);
              }).then(function(result) {
                devicesInitialized = true;
                console.log("🔧 Inicialização de dispositivos concluída:", result);
                updateProgress(95, "Dispositivos prontos!");
                finishLoading();
              }).catch(function(error) {
                console.error("⚠️ Erro na inicialização de dispositivos:", error);
                devicesInitialized = true; // Marcar como feito para não travar
                finishLoading();
              });
            } else {
              finishLoading();
            }
            
            function finishLoading() {
            // Delay final padrão para desktop e mobile
            var finalDelay = 800;
            setTimeout(function () {
              // Esconder loader
              hideLoader();

              // Configurar observador DOM
              setupDomObserver();

              // Inicializar página de cÃƒÂ´modo e sincronizar controles jÃƒÂ¡ existentes
              var syncDelay = 100;
              setTimeout(() => {
                console.log(
                  "Ã°Å¸ÂÂ  Inicializando controles de cÃƒÂ´modos na inicialização..."
                );
                initRoomPage(); // Inicializar pagina de comodo
                scheduleControlSync(true); // Sincronizar todos os controles
              }, syncDelay);

              // Iniciar polling se estiver em produÃƒÂ§ÃƒÂ£o
              if (isProduction) {
                var pollingDelay = 3000;
                console.log(
                  "Ã¢Å“â€¦ INICIANDO POLLING em " +
                    pollingDelay / 1000 +
                    " segundos (universal)",
                  {
                    isProduction: isProduction,
                    hostname: location.hostname,
                    isMobile: isMobile,
                  }
                );
                setTimeout(startPolling, pollingDelay);
              } else {
                console.log(
                  "⚠️POLLING NÃƒÆ’O INICIADO - não está em produÃƒÂ§ÃƒÂ£o:",
                  {
                    isProduction: isProduction,
                    hostname: location.hostname,
                    isMobile: isMobile,
                  }
                );
              }

              console.log("Aplicação totalmente inicializada!");
              showMobileDebug("App totalmente inicializada!", "success");

              // Marcar que a inicialização foi concluída
              window.appFullyInitialized = true;
            }, finalDelay);
            } // Fim da função finishLoading
          })
          .catch(function (error) {
            console.error("Erro no carregamento global:", error);
            showMobileDebug("Erro no carregamento: " + error.message, "error");
            hideLoader();

            // Fallback para modo bÃƒÂ¡sico
            setTimeout(function () {
              try {
                initUltraBasicMode();
              } catch (ultraError) {
                console.error("Falha total na recuperaÃƒÂ§ÃƒÂ£o:", ultraError);
                updateProgress(100, "Erro crÃƒÂ­tico - recarregue a página");
                setTimeout(function () {
                  hideLoader();
                }, 3000);
              }
            }, 1000);
          });
      } catch (loadError) {
        console.error("Erro crÃƒÂ­tico na inicialização:", loadError);
        showMobileDebug("ERRO CRÃƒÂTICO: " + loadError.message, "error");

        // Modo de emergÃƒÂªncia
        try {
          initUltraBasicMode();
        } catch (emergencyError) {
          console.error("Falha no modo de emergÃƒÂªncia:", emergencyError);
          updateProgress(100, "Erro crÃƒÂ­tico - recarregue a página");
          setTimeout(hideLoader, 3000);
        }
      }
    }, initDelay);
  } catch (mainError) {
    console.error("ERRO CRITICO NA INICIALIZACAO PRINCIPAL:", mainError);
    showMobileDebug("ERRO PRINCIPAL: " + mainError.message, "error");

    // ÃƒÅ¡ltimo recurso - modo ultra-bÃƒÂ¡sico
    try {
      initUltraBasicMode();
    } catch (finalError) {
      console.error("FALHA TOTAL:", finalError);
      showMobileDebug("FALHA TOTAL: " + finalError.message, "error");
    }
  }
}

// inicialização global da aplicaÃƒÂ§ÃƒÂ£o
window.addEventListener("DOMContentLoaded", function () {
  console.log("DOMContentLoaded executado, chamando initializeApp...");
  initializeApp();
});

// Fallback se DOMContentLoaded não funcionar
setTimeout(function () {
  if (!window.initializationStarted) {
    console.log(
      "Fallback: DOMContentLoaded não executou, forÃƒÂ§ando inicialização..."
    );
    initializeApp();
  }
}, 2000);

// Parar polling quando a página é fechada
window.addEventListener("beforeunload", stopPolling);

// Funções de debug disponíveis globalmente
window.testHubitatConnection = testHubitatConnection;
window.showErrorMessage = showErrorMessage;
window.initializeAllDevices = initializeAllDevices; // Para debug manual

// Funções master de cortinas (abrir/fechar todas)
function handleMasterCurtainsOpen() {
  console.log("🎬 Abrindo todas as cortinas...");
  const btn = document.getElementById("master-curtains-open-btn");
  if (btn) {
    btn.classList.add("loading");
  }
  
  // Encontrar todas as cortinas
  const curtainButtons = document.querySelectorAll('.curtain-tile__btn[data-device-id]');
  const curtainIds = new Set();
  
  curtainButtons.forEach(button => {
    const id = button.dataset.deviceId;
    if (id && !curtainIds.has(id)) {
      curtainIds.add(id);
      curtainAction(button, 'open');
    }
  });
  
  setTimeout(() => {
    if (btn) {
      btn.classList.remove("loading");
    }
  }, 2000);
  
  console.log(`✅ Comando de abertura enviado para ${curtainIds.size} cortinas`);
}

function handleMasterCurtainsClose() {
  console.log("🎬 Fechando todas as cortinas...");
  const btn = document.getElementById("master-curtains-close-btn");
  if (btn) {
    btn.classList.add("loading");
  }
  
  // Encontrar todas as cortinas
  const curtainButtons = document.querySelectorAll('.curtain-tile__btn[data-device-id]');
  const curtainIds = new Set();
  
  curtainButtons.forEach(button => {
    const id = button.dataset.deviceId;
    if (id && !curtainIds.has(id)) {
      curtainIds.add(id);
      curtainAction(button, 'close');
    }
  });
  
  setTimeout(() => {
    if (btn) {
      btn.classList.remove("loading");
    }
  }, 2000);
  
  console.log(`✅ Comando de fechamento enviado para ${curtainIds.size} cortinas`);
}

// ============================================
// CONTROLES DE MÚSICA DO LIVING (Device 198)
// ============================================

// Função para controle de música do Living (Denon 198)
function livingMusicCommand(button, command) {
  const DEVICE_ID = "198";
  
  // Feedback visual
  if (button) {
    button.style.transform = "scale(0.92)";
    button.style.opacity = "0.7";
    setTimeout(() => {
      button.style.transform = "";
      button.style.opacity = "";
    }, 200);
  }
  
  console.log("🎵 Living Music: enviando comando " + command + " para device " + DEVICE_ID);
  
  sendHubitatCommand(DEVICE_ID, command)
    .then(() => {
      console.log("✅ Comando " + command + " enviado com sucesso");
    })
    .catch((error) => {
      console.error("❌ Erro ao enviar comando " + command + ":", error);
    });
}

// Ligar música Living
function livingMusicOn(button) {
  livingMusicCommand(button, "on");
  
  // Atualizar estado visual dos botões
  const onBtn = button;
  const offBtn = button?.parentElement?.querySelector('.music-master-btn--off');
  
  if (onBtn) {
    onBtn.classList.add('music-master-btn--active');
    onBtn.setAttribute('aria-pressed', 'true');
  }
  if (offBtn) {
    offBtn.classList.remove('music-master-btn--active');
    offBtn.setAttribute('aria-pressed', 'false');
  }
}

// Desligar música Living
function livingMusicOff(button) {
  livingMusicCommand(button, "off");
  
  // Atualizar estado visual dos botões
  const offBtn = button;
  const onBtn = button?.parentElement?.querySelector('.music-master-btn--on');
  
  if (offBtn) {
    offBtn.classList.add('music-master-btn--active');
    offBtn.setAttribute('aria-pressed', 'true');
  }
  if (onBtn) {
    onBtn.classList.remove('music-master-btn--active');
    onBtn.setAttribute('aria-pressed', 'false');
  }
}

// Mute toggle música Living
function livingMusicMute(button) {
  const isMuted = button?.getAttribute('aria-pressed') === 'true';
  const command = isMuted ? "unmute" : "mute";
  
  livingMusicCommand(button, command);
  
  // Toggle estado visual
  if (button) {
    button.setAttribute('aria-pressed', isMuted ? 'false' : 'true');
    const unmutedIcon = button.querySelector('.volume-icon-unmuted');
    const mutedIcon = button.querySelector('.volume-icon-muted');
    
    if (unmutedIcon && mutedIcon) {
      unmutedIcon.style.display = isMuted ? 'block' : 'none';
      mutedIcon.style.display = isMuted ? 'none' : 'block';
    }
  }
}

// Play/Pause toggle música Living
function livingMusicPlayPause(button) {
  const isPlaying = button?.getAttribute('aria-pressed') === 'true';
  const command = isPlaying ? "pause" : "play";
  
  livingMusicCommand(button, command);
  
  // Toggle estado visual
  if (button) {
    button.setAttribute('aria-pressed', isPlaying ? 'false' : 'true');
    button.classList.toggle('is-playing', !isPlaying);
    
    const playIcon = button.querySelector('.music-play-toggle__icon--play');
    const pauseIcon = button.querySelector('.music-play-toggle__icon--pause');
    
    if (playIcon && pauseIcon) {
      playIcon.style.display = isPlaying ? 'block' : 'none';
      pauseIcon.style.display = isPlaying ? 'none' : 'block';
    }
  }
}

// Inicializar slider de volume do Living (chamado quando a página é navegada)
function initLivingMusicVolumeSlider() {
  const slider = document.getElementById('music-volume-slider-living');
  if (!slider) return;
  
  const DEVICE_ID = "198";
  
  // Remover event listeners antigos
  const newSlider = slider.cloneNode(true);
  slider.parentNode.replaceChild(newSlider, slider);
  
  const updatedSlider = document.getElementById('music-volume-slider-living');
  if (!updatedSlider) return;

  // Garantir que o slider esteja interativo mesmo se algum estilo global bloquear
  updatedSlider.style.pointerEvents = 'auto';
  const sliderContainer = updatedSlider.closest('.music-volume-slider-container');
  if (sliderContainer) {
    sliderContainer.style.pointerEvents = 'auto';
  }
  // Atualizar a barra visual durante o arrasto
  const updateVisualBar = (value) => {
    const percent = Math.max(0, Math.min(100, parseInt(value, 10) || 0));
    updatedSlider.style.setProperty('--volume-percent', `${percent}%`);
  };
  updateVisualBar(updatedSlider.value);
  
  // Enviar comando ao soltar o slider
  updatedSlider.addEventListener('input', (e) => {
    updateVisualBar(e.target.value);
  });
  updatedSlider.addEventListener('change', (e) => {
    const value = e.target.value;
    updateVisualBar(value);
    console.log("🔊 Living Music Volume: " + value);
    
    sendHubitatCommand(DEVICE_ID, "setVolume", value)
      .then(() => {
        console.log("✅ Volume do Living definido para " + value);
      })
      .catch((error) => {
        console.error("❌ Erro ao definir volume:", error);
      });
  });
  
  console.log("✅ Slider de volume do Living inicializado");
}

// Exportar funções usadas em onclick="" no HTML (necessário para IIFE)
window.toggleRoomControl = toggleRoomControl;
window.togglePoolControl = togglePoolControl;
window.fireTVMacro = fireTVMacro;
window.htvMacroOn = htvMacroOn;
window.htvMacroOff = htvMacroOff;
window.telaoMacroOn = telaoMacroOn;
window.telaoMacroOff = telaoMacroOff;
window.tvMacroOn = tvMacroOn;
window.tvMacroOff = tvMacroOff;
window.suiteMasterHtvOn = suiteMasterHtvOn;
window.suiteMasterHtvOff = suiteMasterHtvOff;
window.suiteMasterTvOn = suiteMasterTvOn;
window.suiteMasterTvOff = suiteMasterTvOff;
window.suite1HtvOn = suite1HtvOn;
window.suite1HtvOff = suite1HtvOff;
window.suite1TvOn = suite1TvOn;
window.suite1TvOff = suite1TvOff;
window.suite2HtvOn = suite2HtvOn;
window.suite2HtvOff = suite2HtvOff;
window.suite2TvOn = suite2TvOn;
window.suite2TvOff = suite2TvOff;
window.tvCommand = tvCommand;
window.curtainAction = curtainAction;
window.spaNavigate = spaNavigate;
window.handleMasterCurtainsOpen = handleMasterCurtainsOpen;
window.handleMasterCurtainsClose = handleMasterCurtainsClose;
window.livingMusicCommand = livingMusicCommand;
window.livingMusicOn = livingMusicOn;
window.livingMusicOff = livingMusicOff;
window.livingMusicMute = livingMusicMute;
window.livingMusicPlayPause = livingMusicPlayPause;
window.initLivingMusicVolumeSlider = initLivingMusicVolumeSlider;

// ============================================
// CONTROLE DE VOLUME VIA BOTÕES (incrementa/decrementa slider)
// ============================================

// Variáveis para controle de repetição ao segurar o botão
let volumeRepeatInterval = null;
let volumeRepeatTimeout = null;

// Função para ajustar volume do slider
function adjustVolumeSlider(button, direction) {
  // Encontrar o slider mais próximo (mesmo módulo de volume)
  const volumeSection = button.closest('.tv-volume-with-buttons');
  if (!volumeSection) return;
  
  const slider = volumeSection.querySelector('.tv-volume-slider');
  if (!slider) return;
  
  // Obter valor atual e calcular novo valor
  let currentValue = parseInt(slider.value) || 0;
  let newValue = direction === 'up' ? currentValue + 1 : currentValue - 1;
  
  // Limitar ao range do slider
  newValue = Math.max(parseInt(slider.min) || 0, Math.min(parseInt(slider.max) || 100, newValue));
  
  // Atualizar valor do slider
  slider.value = newValue;
  
  // Atualizar barra visual
  const percent = (newValue / 100) * 100;
  slider.style.setProperty('--volume-progress', percent + '%');
  
  // Atualizar display de valor se existir
  const volumeDisplay = slider.closest('.tv-control-section')?.querySelector('.tv-volume-value');
  if (volumeDisplay) {
    volumeDisplay.textContent = newValue;
  }
  
  // Disparar evento change para enviar comando ao Hubitat
  slider.dispatchEvent(new Event('change', { bubbles: true }));
  
  // Feedback visual no botão
  button.style.transform = 'scale(0.92)';
  button.style.opacity = '0.8';
  setTimeout(() => {
    button.style.transform = '';
    button.style.opacity = '';
  }, 100);
  
  console.log('🔊 Volume ajustado via botão:', direction, '-> Novo valor:', newValue);
}

// Iniciar repetição ao segurar o botão
function startVolumeRepeat(button, direction) {
  // Limpar qualquer repetição anterior
  stopVolumeRepeat();
  
  // Primeiro ajuste imediato
  adjustVolumeSlider(button, direction);
  
  // Após 400ms de segurar, iniciar repetição rápida
  volumeRepeatTimeout = setTimeout(() => {
    volumeRepeatInterval = setInterval(() => {
      adjustVolumeSlider(button, direction);
    }, 80); // Repetir a cada 80ms enquanto segura
  }, 400);
}

// Parar repetição
function stopVolumeRepeat() {
  if (volumeRepeatTimeout) {
    clearTimeout(volumeRepeatTimeout);
    volumeRepeatTimeout = null;
  }
  if (volumeRepeatInterval) {
    clearInterval(volumeRepeatInterval);
    volumeRepeatInterval = null;
  }
}

// Exportar funções
window.adjustVolumeSlider = adjustVolumeSlider;
window.startVolumeRepeat = startVolumeRepeat;
window.stopVolumeRepeat = stopVolumeRepeat;

