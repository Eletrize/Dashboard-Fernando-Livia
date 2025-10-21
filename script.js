// ========================================
// DETECÇÃO DE DISPOSITIVOS
// ========================================

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
      "🍎 iPad Mini 6 detectado - aplicando fixes específicos",
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
  // 2. Largura máxima < 768px (breakpoint de tablet)
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
      `📱 Dispositivo mobile detectado (${isApple ? "Apple" : "Android"})`
    );
  }
}

// Função para detectar se está na página de controle remoto da TV
function isOnTVControlPage() {
  return (
    window.location.pathname.includes("ambiente1-tv") ||
    window.location.hash.includes("ambiente1-tv")
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

  // Regra prioritária: Celulares em landscape no controle remoto são bloqueados
  if (isMobile && isLandscape && onTVPage) {
    const overlay = showOrientationOverlay();
    overlay.classList.add("active");
    document.documentElement.dataset.layoutState = "mobile-blocked";
    console.log("📵 Celular em landscape no controle remoto - bloqueado");
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

// Monitorar mudanças de orientação
window.addEventListener("orientationchange", updateDeviceStyles);
window.addEventListener("resize", updateDeviceStyles);

// ========================================
// CONFIGURAÇÕES GERAIS
// ========================================

// IDs de todos os dispositivos de iluminação (atualizados com devices.json)
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
  "322", // Denon AVR - Receiver (para atualização de volume)
];

// ID do dispositivo de Ar Condicionado (MolSmart - GW3 - AC)
const AC_DEVICE_ID = "278"; // Ambiente 1 - Ar Condicionado

// Configurações de timeout e retry
const NETWORK_CONFIG = {
  HEALTH_CHECK_TIMEOUT: 5000, // 5s para health check
  FETCH_TIMEOUT_PER_ATTEMPT: 15000, // 15s por tentativa
  MAX_RETRY_ATTEMPTS: 3, // 3 tentativas máximo
  RETRY_DELAY_BASE: 1000, // 1s base para backoff
  RETRY_DELAY_MAX: 5000, // 5s máximo entre tentativas
};

// Funções de toggle para ícones nos cards da home
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

// Botões dos cômodos nas páginas internas
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
        `✅ Comando ${newState} enviado com sucesso para dispositivo ${deviceId}`
      );
    })
    .catch((error) => {
      console.error(
        `❌ Erro ao enviar comando para dispositivo ${deviceId}:`,
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
  if (!action || !deviceId) return;

  // Obter os dois botões (ON e OFF)
  const tileElement = el.closest(".piscina-control-tile");
  if (!tileElement) return;

  const onBtn = tileElement.querySelector(".piscina-control-btn--on");
  const offBtn = tileElement.querySelector(".piscina-control-btn--off");

  // Remover classe active de ambos
  if (onBtn) onBtn.classList.remove("active");
  if (offBtn) offBtn.classList.remove("active");

  // Adicionar classe active ao botão clicado
  if (action === "on" && onBtn) {
    onBtn.classList.add("active");
  } else if (action === "off" && offBtn) {
    offBtn.classList.add("active");
  }

  // Marcar comando recente
  recentCommands.set(deviceId, Date.now());

  console.log(
    `Enviando comando ${action} para dispositivo piscina ${deviceId}`
  );

  // Send to Hubitat
  sendHubitatCommand(deviceId, action)
    .then(() => {
      console.log(
        `✅ Comando ${action} enviado com sucesso para dispositivo ${deviceId}`
      );
    })
    .catch((error) => {
      console.error(
        `❌ Erro ao enviar comando para dispositivo ${deviceId}:`,
        error
      );
      // Em caso de erro, remover a classe active
      if (action === "on" && onBtn) {
        onBtn.classList.remove("active");
      } else if (action === "off" && offBtn) {
        offBtn.classList.remove("active");
      }
    });
}
// ========================================
// CONTROLE DE PODER DA TV
// ========================================

let tvPowerState = "off"; // Estado inicial: desligado

function updateTVPowerState(newState) {
  tvPowerState = newState;

  // Selecionar botões ON e OFF
  const btnOn = document.querySelector(".tv-btn--power-on");
  const btnOff = document.querySelector(".tv-btn--power-off");

  // Selecionar todos os outros controles
  const otherControls = document.querySelectorAll(
    ".tv-volume-canais-wrapper, .tv-commands-grid, .tv-directional-pad, .tv-numpad, .tv-logo-section"
  );

  // Selecionar títulos das seções de controle
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

    // Mostrar títulos
    titles.forEach((title) => {
      title.style.opacity = "1";
    });

    console.log("📺 TV LIGADA - Controles visíveis");
  } else {
    // TV desligada
    btnOff?.classList.add("active");
    btnOn?.classList.remove("active");

    // Escurecer e desabilitar outros controles
    otherControls.forEach((control) => {
      control.style.opacity = "0.15";
      control.style.pointerEvents = "none";
    });

    // Apagar títulos
    titles.forEach((title) => {
      title.style.opacity = "0.2";
    });

    console.log("📺 TV DESLIGADA - Controles desabilitados");
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
  el.style.transform = "scale(0.95)";
  setTimeout(() => {
    el.style.transform = "";
  }, 150);

  // Marcar comando recente
  recentCommands.set(deviceId, Date.now());

  console.log(`Enviando comando TV ${command} para dispositivo ${deviceId}`);

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

// Controle do Slider de Volume
function initVolumeSlider() {
  const slider = document.getElementById("tv-volume-slider");
  const display = document.getElementById("tv-volume-display");
  const DENON_DEVICE_ID = "322"; // ID do Denon AVR no Hubitat

  if (!slider || !display) {
    console.log("⚠️ Slider ou display não encontrado");
    return;
  }

  console.log("🎚️ Inicializando slider de volume do Denon AVR");

  // Definir o device ID no slider
  slider.dataset.deviceId = DENON_DEVICE_ID;

  // Remover event listeners antigos para evitar duplicação
  const newSlider = slider.cloneNode(true);
  slider.parentNode.replaceChild(newSlider, slider);

  // Pegar referência ao novo slider
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

    console.log(
      `🎚️ Volume display atualizado: ${value} (${percentage.toFixed(1)}%)`
    );
  });

  // Enviar comando ao soltar o slider
  updatedSlider.addEventListener("change", (e) => {
    const value = e.target.value;

    console.log(`🔊 Volume alterado para: ${value} - enviando para Denon AVR`);

    // Enviar comando setVolume para o Denon AVR
    sendHubitatCommand(DENON_DEVICE_ID, "setVolume", value)
      .then(() => {
        console.log(`✅ Volume do Denon definido para ${value}`);
      })
      .catch((error) => {
        console.error(`❌ Erro ao definir volume do Denon:`, error);
      });
  });

  console.log("✅ Slider de volume do Denon AVR inicializado com sucesso");
}

// Função para atualizar o volume do Denon a partir do servidor
async function updateDenonVolumeFromServer() {
  const DENON_DEVICE_ID = "322";
  const slider = document.getElementById("tv-volume-slider");
  const display = document.getElementById("tv-volume-display");

  if (!slider || !display) return;

  try {
    const pollingUrl = isProduction
      ? `${POLLING_URL}?devices=${DENON_DEVICE_ID}`
      : null;

    if (!pollingUrl) {
      console.log("❌ Não é possível buscar volume em desenvolvimento");
      return;
    }

    const response = await fetch(pollingUrl);
    if (!response.ok) throw new Error(`Polling failed: ${response.status}`);

    const data = await response.json();

    // Processar resposta para pegar o volume
    let volume = null;

    if (data.devices && data.devices[DENON_DEVICE_ID]) {
      volume = data.devices[DENON_DEVICE_ID].volume;
    } else if (Array.isArray(data.data)) {
      const denonData = data.data.find((d) => d.id === DENON_DEVICE_ID);
      if (denonData && denonData.attributes) {
        volume = denonData.attributes.volume;
      }
    }

    if (volume !== null && volume !== undefined) {
      const volumeValue = parseInt(volume);
      slider.value = volumeValue;
      display.textContent = volumeValue;

      const max = slider.max || 100;
      const percentage = (volumeValue / max) * 100;
      slider.style.setProperty("--volume-progress", percentage + "%");

      console.log(`🔊 Volume do Denon atualizado: ${volumeValue}`);
    }
  } catch (error) {
    console.error("❌ Erro ao buscar volume do Denon:", error);
  }
}

// Função para atualizar a UI do volume do Denon (chamada pelo polling)
function updateDenonVolumeUI(volume) {
  const slider = document.getElementById("tv-volume-slider");
  const display = document.getElementById("tv-volume-display");

  console.log("🔊 updateDenonVolumeUI chamada com volume:", volume);

  if (!slider || !display) {
    console.warn("⚠️ Slider ou display não encontrado na página");
    return;
  }

  const volumeValue = parseInt(volume);
  console.log(
    `🔊 Volume recebido: ${volume}, convertido: ${volumeValue}, slider atual: ${slider.value}`
  );

  // Só atualizar se o valor for diferente do atual para evitar conflitos
  if (parseInt(slider.value) !== volumeValue) {
    slider.value = volumeValue;
    display.textContent = volumeValue;

    const max = slider.max || 100;
    const percentage = (volumeValue / max) * 100;
    slider.style.setProperty("--volume-progress", percentage + "%");

    console.log(`✅ Volume do Denon atualizado via polling: ${volumeValue}`);
  } else {
    console.log(`ℹ️ Volume já está em ${volumeValue}, não atualizando`);
  }
} // Inicializar estado ao carregar
document.addEventListener("DOMContentLoaded", () => {
  updateTVPowerState("off");
  initVolumeSlider();

  // Re-inicializar quando a página mudar (para SPAs)
  window.addEventListener("hashchange", () => {
    setTimeout(() => {
      initVolumeSlider();
    }, 100);
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
      `🔧 setRoomControlUI: Atualizando imagem ${img.src} → ${newSrc} (estado: ${state})`
    );
    img.src = newSrc;
  } else {
    console.warn(
      `⚠️ setRoomControlUI: Imagem não encontrada para elemento com classes: ${el.className}`
    );
    // Debug: mostrar todos os elementos filhos para diagnóstico
    console.log(
      `🔍 Elementos filhos:`,
      Array.from(el.children).map((child) => child.className)
    );
  }
}

function deviceStateKey(deviceId) {
  return `deviceState:${deviceId}`;
}

function getStoredState(deviceId) {
  try {
    const key = deviceStateKey(deviceId);
    const value = localStorage.getItem(key);
    return value;
  } catch (e) {
    return null;
  }
}

function setStoredState(deviceId, state) {
  try {
    const key = deviceStateKey(deviceId);
    localStorage.setItem(key, state);
  } catch (e) {
    console.warn(`❌ Erro ao salvar estado ${deviceId}:`, e);
  }
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
  console.log("🏠 Inicializando página de cômodo...");
  const controls = document.querySelectorAll(
    '.room-control[data-device-id]:not([data-no-sync="true"]), .control-card[data-device-id]:not([data-no-sync="true"])'
  );
  console.log(
    `🏠 Encontrados ${controls.length} controles de cômodo para inicializar`
  );

  controls.forEach((el, index) => {
    const deviceId = el.dataset.deviceId;
    // SEMPRE usar estado salvo do carregamento global
    const savedState = getStoredState(deviceId);
    const fallbackState = el.dataset.state || "off";
    const finalState = savedState !== null ? savedState : fallbackState;

    console.log(
      `🔄 Controle ${index + 1}/${controls.length} - ID:${deviceId}, classes:"${
        el.className
      }"`
    );
    console.log(
      `   → salvo="${savedState}", fallback="${fallbackState}", final="${finalState}"`
    );
    setRoomControlUI(el, finalState);
  });

  // Forçar atualização de botões master também
  setTimeout(updateAllMasterButtons, 50);

  // Rename label on Sinuca page: Iluminação -> Bar (UI-only)
  try {
    const route = (window.location.hash || "").replace("#", "");
    if (route === "ambiente5") {
      document.querySelectorAll(".room-control-label").forEach((l) => {
        const t = (l.textContent || "").trim().toLowerCase();
        if (t.startsWith("ilumin")) l.textContent = "Bar";
      });
    }
  } catch (_) {}
}

// === CONTROLADOR DE AR CONDICIONADO ===

// Função para inicializar o controle de AR quando a página de conforto for carregada
function initAirConditionerControl() {
  const fanLevels = ["low", "medium", "high"];
  const temperatures = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];

  const state = {
    minTemp: 17,
    maxTemp: 30,
    temperature: 22,
    mode: "cool", // Sempre cool
    powerOn: false,
    fanLevel: "medium",
    deviceId: AC_DEVICE_ID, // ID do dispositivo ar-condicionado
  };

  // Configurações de modo - apenas Cool
  const modeConfig = {
    cool: {
      minTemp: 17,
      maxTemp: 30,
      defaultTemp: 22,
      color: "rgba(59, 130, 246, 0.95)", // Azul
    },
  };

  // Timer para debounce da temperatura
  let temperatureDebounceTimer = null;

  const root = document.querySelector('[data-component="ac-control"]');

  if (!root) {
    console.warn("Componente de controle de ar-condicionado não encontrado.");
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
    console.warn("Seção de temperatura não encontrada");
  }

  // Constantes do arco
  const ARC_LENGTH = 251.2; // Comprimento do arco SVG path
  const ARC_START_ANGLE = 180; // Graus (esquerda)
  const ARC_END_ANGLE = 0; // Graus (direita)
  const ARC_RADIUS = 80; // Raio do arco no viewBox
  const ARC_CENTER_X = 100; // Centro X no viewBox
  const ARC_CENTER_Y = 100; // Centro Y no viewBox

  let geometry = calculateGeometry();
  let isDragging = false;
  // Controle de sincronização inicial (evita UI desatualizada ao reentrar)
  let initialSyncDone = false;

  function calculateGeometry() {
    const rect = wrapper.getBoundingClientRect();
    const svgElement = progressArc.closest("svg");
    const svgRect = svgElement.getBoundingClientRect();

    // O viewBox é 0 0 200 120
    // O arco path é: M 20,100 A 80,80 0 0,1 180,100
    // Isso significa que o centro do arco está em (100, 100) no viewBox
    // O raio é 80

    // Calcular a escala do SVG
    const scaleX = svgRect.width / 200; // viewBox width = 200
    const scaleY = svgRect.height / 120; // viewBox height = 120

    return {
      rect,
      svgRect,
      svgElement,
      // Centro do arco em coordenadas da página
      centerX: svgRect.left + 100 * scaleX, // X=100 no viewBox
      centerY: svgRect.top + 100 * scaleY, // Y=100 no viewBox
      radius: 80 * scaleX, // Raio 80 no viewBox, usando escala X
    };
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function angleFromTemperature(temperature) {
    const ratio =
      (temperature - state.minTemp) / (state.maxTemp - state.minTemp);
    // 180° (esquerda/18°C) para 0° (direita/30°C)
    return 180 - ratio * 180;
  }

  function temperatureFromAngle(angle) {
    const ratio = (180 - angle) / 180;
    const temp = state.minTemp + ratio * (state.maxTemp - state.minTemp);
    return Math.round(clamp(temp, state.minTemp, state.maxTemp));
  }

  function updateKnobPosition(angle) {
    if (!knob) return;

    // Converte ângulo para radianos
    const radians = (angle * Math.PI) / 180;

    // Calcula as coordenadas no arco usando o raio e centro corretos
    const radius = geometry.radius;

    // IMPORTANTE: Para o arco superior, Y deve ser NEGATIVO (para cima)
    // Posição absoluta na página
    const x = geometry.centerX + radius * Math.cos(radians);
    const y = geometry.centerY - radius * Math.sin(radians); // NEGATIVO para ir para cima!

    // Converte para posição relativa ao wrapper
    const wrapperRect = wrapper.getBoundingClientRect();
    const relativeX = x - wrapperRect.left;
    const relativeY = y - wrapperRect.top;

    // Centraliza o knob
    knob.style.left = `${relativeX}px`;
    knob.style.top = `${relativeY}px`;
    knob.style.transform = "translate(-50%, -50%)";
  }

  function updateProgress(angle) {
    if (!progressArc) return;

    // Calcula o progresso (0 a 1)
    const progress = (180 - angle) / 180;
    // Offset: começa cheio e vai diminuindo conforme progride
    const offset = ARC_LENGTH - progress * ARC_LENGTH;

    // Garante que o offset não seja negativo e não ultrapasse o comprimento
    const clampedOffset = Math.max(0, Math.min(ARC_LENGTH, offset));
    progressArc.style.strokeDashoffset = clampedOffset;
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
        // Se é a temperatura mínima, esconde o anterior
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
        // Se é a temperatura máxima, esconde o seguinte
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
        sendHubitatCommand(state.deviceId, tempCommand);
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

    // Limita ao arco superior (0° a 180°)
    // 0° = direita, 90° = cima, 180° = esquerda
    // Queremos apenas o arco superior, então limitamos ângulos > 180°
    if (angle > 180) {
      // Se está fora do arco superior, mapeia para a extremidade mais próxima
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

    // NÃO envia comando para o Hubitat (modo fixo em Cool)
    // sendHubitatCommand(state.deviceId, mode);

    // Atualiza os limites de temperatura conforme o modo
    const config = modeConfig[mode];
    state.minTemp = config.minTemp;
    state.maxTemp = config.maxTemp;

    // Define a temperatura padrão do modo
    state.temperature = config.defaultTemp;

    // Atualiza a cor do arco de progresso e knob
    updateModeColors(config.color);

    // Atualiza os botões de modo
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
      button.toggleAttribute("disabled", !isOn);
    });

    fanButtons.forEach((button) => {
      button.toggleAttribute("disabled", !isOn);
    });

    // Desabilita os botões de aleta quando o AC está desligado
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

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!state.powerOn) return;
      const mode = button.dataset.mode;
      if (mode) {
        setMode(mode);
      }
    });
  });

  if (powerButton) {
    powerButton.addEventListener("click", togglePower);
  }

  // Botões de aleta
  const aletaButtons = Array.from(root.querySelectorAll("[data-aleta-button]"));

  function setAletaState(aleta) {
    if (!state.powerOn) return;

    aletaButtons.forEach((btn) => {
      const isActive = btn.dataset.aleta === aleta;
      btn.setAttribute("aria-pressed", isActive.toString());
    });

    // Envia comandos para o Hubitat (modo Cool fixo)
    if (aleta === "moving") {
      console.log(
        "🔵 ALETA MOVIMENTO: Executando comando swing (mover aletas)"
      );
      sendHubitatCommand(state.deviceId, "swing");
    } else if (aleta === "parada") {
      console.log("� ALETA PARADA: Executando comando sweep (parar aletas)");
      sendHubitatCommand(state.deviceId, "sweep");
    }
  }

  aletaButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!state.powerOn) return;
      setAletaState(btn.dataset.aleta);
    });
  });

  window.addEventListener("resize", () => {
    geometry = calculateGeometry();
    const angle = angleFromTemperature(state.temperature);
    updateKnobPosition(angle);
  });

  // Inicializa (sem enviar comandos no primeiro render)
  setPowerState(state.powerOn, { silent: true });
  setMode(state.mode);
  setFanLevel(state.fanLevel);
  updateTemperature(state.temperature, { silent: true });

  // Recalcula geometria após renderização inicial (múltiplas tentativas para garantir)
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
      // Potência
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

      // Ventilação
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

  // Buscar último status do AC via webhook e aplicar na UI (modo silencioso)
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

      // Potência
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

      // Ventilação
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

      // Recalcula posição do knob após aplicar
      recalculate();
    } catch (e) {
      console.warn("Falha ao sincronizar AC via webhook:", e);
    }
  })();

  // Garantir sincronização: tenta também via polling após um pequeno atraso
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
      ["Escrit��rio", "Escritório"],
      ["Programa��ǜo", "Programação"],
      ["Recep��ǜo", "Recepção"],
      ["Refeit��rio", "Refeitório"],
      ["Funcionǭrios", "Funcionários"],
      ["Ilumina��o", "Iluminação"],
      ["Ilumina��ǜo", "Iluminação"],
      ["PainǸis", "Painéis"],
      ["Armǭrio", "Armário"],
      ["Ambientǜo", "Ambiente"],
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

// --- Funções para a página do Escritório ---

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

// (removido) setupThermostat: não utilizado após retirada da página "escritorio"

// --- Controle do Hubitat ---

// Detecta se está em produção (Cloudflare Pages) ou desenvolvimento
// VERIFICAÇÃO DE CACHE FORÇADA - DEVE SER PRIMEIRA COISA A EXECUTAR
(function () {
  console.log("🧹 VERIFICANDO NECESSIDADE DE LIMPEZA DE CACHE...");

  try {
    var lastCacheClear = localStorage.getItem("last_cache_clear");
    var now = Date.now();
    var oneHour = 60 * 60 * 1000; // 1 hora

    if (!lastCacheClear || now - parseInt(lastCacheClear) > oneHour) {
      console.log("🧹 Cache expirado, forçando reload completo...");
      localStorage.setItem("last_cache_clear", now.toString());

      // Limpar todos os caches possíveis
      if ("caches" in window) {
        caches.keys().then(function (names) {
          names.forEach(function (name) {
            caches.delete(name);
          });
        });
      }

      // Forçar reload sem cache
      setTimeout(function () {
        location.reload(true);
      }, 100);
      return;
    }
  } catch (e) {
    console.warn("⚠️ Erro na verificação de cache:", e);
  }
})();

const isProductionOriginal = !["localhost", "127.0.0.1", "::1"].includes(
  location.hostname
);
// TEMPORÁRIO: Forçar produção para debug mobile
const isProduction = true;
console.log("🔍 DEBUG PRODUÇÃO (FORÇADO):", {
  hostname: location.hostname,
  isProductionOriginal: isProductionOriginal,
  isProduction: isProduction,
  isMobile:
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ),
});

// Detectar dispositivos móveis
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

// SOLUÇÃO: Desabilitar console.log em mobile para evitar travamentos
const ENABLE_DEBUG_LOGS = true; // Logs habilitados em desktop e mobile

// Sistema de detecção de cache desatualizado para mobile (TEMPORARIAMENTE DESABILITADO)
const APP_VERSION = "1.0.0"; // 🎉 MARCO v1.0 - SISTEMA TOTALMENTE FUNCIONAL
(function () {
  if (false && isMobile) {
    // DESABILITADO para debug
    try {
      var lastVersion = localStorage.getItem("app_version");
      var lastLoad = localStorage.getItem("last_mobile_load");
      var now = new Date().getTime();

      // Só recarregar se versão realmente mudou (não por tempo)
      if (lastVersion && lastVersion !== APP_VERSION) {
        console.log("📱 Nova versão detectada - forçando reload cache");
        console.log("📱 Versão anterior:", lastVersion, "Nova:", APP_VERSION);

        // Marcar que já foi recarregado para esta versão
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

        // Forçar reload apenas se não foi feito ainda para esta versão
        if (!localStorage.getItem("reload_done_" + APP_VERSION)) {
          setTimeout(function () {
            console.log("📱 Recarregando página para nova versão...");
            window.location.reload(true);
          }, 2000);
          return; // Não continuar inicialização
        }
      } else {
        // Primeira vez ou mesma versão - continuar normalmente
        localStorage.setItem("app_version", APP_VERSION);
        localStorage.setItem("last_mobile_load", now.toString());
        console.log("📱 Mobile cache OK - versão", APP_VERSION);
      }
    } catch (e) {
      console.warn("📱 Erro na verificação de versão mobile:", e);
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

// Debug mínimo apenas se necessário
if (ENABLE_DEBUG_LOGS) {
  safeLog("=== DASHBOARD ELETRIZE DEBUG ===");
  safeLog("🔍 isProduction:", isProduction, "isMobile:", isMobile);
}

safeLog("=== AMBIENTE DETECTADO ===", {
  isProduction,
  isMobile,
  isIOS,
  userAgent: navigator.userAgent.substring(0, 60) + "...",
});
const HUBITAT_PROXY_URL = "/hubitat-proxy";
const POLLING_URL = "/polling";
// (Removido: HUBITAT_DIRECT_URL / HUBITAT_ACCESS_TOKEN do frontend por segurança)

// Função para mostrar erro ao usuário
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
        <h3 style="margin-bottom: 12px; font-size: 1.4rem;">❌ Erro de Conexão</h3>
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

  // Remover automaticamente após 10 segundos
  setTimeout(() => {
    if (errorModal.parentElement) {
      errorModal.remove();
    }
  }, 10000);
}

// Fallback direto desativado por segurança (CORS e exposição de token)
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

// Função para testar configurações do Hubitat
async function testHubitatConnection() {
  console.log("🔧 Testando conexão com Hubitat...");

  try {
    // Testar com um dispositivo conhecido (231)
    const response = await fetch(`${POLLING_URL}?devices=231`);
    console.log("🔧 Status da resposta:", response.status);
    console.log(
      "🔧 Headers da resposta:",
      Object.fromEntries(response.headers.entries())
    );

    const responseText = await response.text();
    console.log("🔧 Conteúdo da resposta:", responseText.substring(0, 300));

    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log("✅ Conexão OK - Dados:", data);
        return true;
      } catch (e) {
        console.error("❌ Resposta não é JSON válido:", e);
        return false;
      }
    } else {
      console.error("❌ Erro HTTP:", response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error("❌ Erro na conexão:", error);
    return false;
  }
}

// Helpers de URL para endpoints comuns da API
function urlDeviceInfo(deviceId) {
  return `${HUBITAT_PROXY_URL}?device=${deviceId}`;
}

function urlSendCommand(deviceId, command, value) {
  return `${HUBITAT_PROXY_URL}?device=${deviceId}&command=${encodeURIComponent(
    command
  )}${value !== undefined ? `&value=${encodeURIComponent(value)}` : ""}`;
}

async function sendHubitatCommand(deviceId, command, value) {
  console.log(
    `Enviando comando: ${command} para dispositivo ${deviceId}${
      value !== undefined ? ` com valor ${value}` : ""
    }`
  );

  try {
    // Se estivermos em produção, tenta usar o proxy primeiro
    if (isProduction) {
      const proxyUrl = `${HUBITAT_PROXY_URL}?device=${deviceId}&command=${encodeURIComponent(
        command
      )}${value !== undefined ? `&value=${encodeURIComponent(value)}` : ""}`;

      try {
        const response = await fetch(proxyUrl);
        const text = await response.text();

        // Verifica se a resposta é HTML (indica que a Function não está funcionando)
        if (text.trim().startsWith("<!DOCTYPE") || text.includes("<html")) {
          throw new Error(
            "Function retornou HTML - fazendo fallback para API direta"
          );
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log("Comando enviado com sucesso via proxy");

        // Tenta parse JSON, mas aceita resposta vazia
        try {
          return JSON.parse(text);
        } catch {
          return null; // Comando executado mas sem resposta JSON
        }
      } catch (error) {
        console.log("Proxy falhou, tentando API direta:", error.message);
      }
    }

    throw new Error("Proxy indisponível e acesso direto desativado");
  } catch (error) {
    console.error("Erro ao enviar comando para o Hubitat:", error);
    throw error;
  }
}

// --- Cortinas (abrir/parar/fechar) ---
function sendCurtainCommand(deviceId, action, commandName) {
  const cmd = commandName || "push";

  // Correção específica para cortina interna (ID 39) - comandos invertidos
  let map;
  if (deviceId === "39") {
    // Cortina com comandos invertidos (exemplo: device ID 40)
    map = { open: 3, stop: 2, close: 1 };
    console.log(
      `🔄 Cortina com comandos invertidos (ID ${deviceId}): comando ${action} mapeado para valor ${map[action]}`
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
    const cmd = el?.dataset?.cmd || "push";
    if (!id) return;
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
    // Sobrescreve função original
    // eslint-disable-next-line no-global-assign
    sendHubitatCommand = _corsBypassSend;
  }
} catch (_) {
  /* ignore */
}

// --- Polling automático de estados ---

let pollingInterval = null;
const POLLING_INTERVAL_MS = 5000; // 5 segundos - otimizado para responsividade sem sobrecarregar

// Sistema para evitar conflitos entre comandos manuais e polling
const recentCommands = new Map(); // deviceId -> timestamp do último comando
const COMMAND_PROTECTION_MS = 8000; // 8 segundos de proteção após comando manual

// Sistema de loading para botões master
function setMasterButtonLoading(button, isLoading) {
  console.log(
    "🔄 setMasterButtonLoading chamada:",
    button,
    "loading:",
    isLoading
  );

  if (isLoading) {
    button.classList.add("loading");
    button.dataset.loading = "true";
    console.log("✅ Loading ativado - classes:", button.className);
  } else {
    button.classList.remove("loading");
    button.dataset.loading = "false";
    console.log("❌ Loading desativado - classes:", button.className);
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

function startPolling() {
  if (pollingInterval) return; // Já está rodando

  // Buscar estados iniciais imediatamente
  updateDeviceStatesFromServer();

  // Depois iniciar polling regular
  pollingInterval = setInterval(
    updateDeviceStatesFromServer,
    POLLING_INTERVAL_MS
  );
  console.log(
    "Polling iniciado - atualizando a cada",
    POLLING_INTERVAL_MS / 1000,
    "segundos"
  );
}

// Funções de proteção removidas para simplificar o sistema

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log("Polling parado");
  }
}

async function updateDeviceStatesFromServer() {
  try {
    // Limpar comandos antigos antes do polling
    cleanupExpiredCommands();

    const deviceIds = ALL_LIGHT_IDS.join(",");
    const pollingUrl = isProduction
      ? `${POLLING_URL}?devices=${deviceIds}`
      : null; // Em dev, pular polling por enquanto

    console.log("🔄 POLLING DEBUG:", {
      isProduction: isProduction,
      hostname: location.hostname,
      pollingUrl: pollingUrl,
      deviceIds: deviceIds,
      isMobile: isMobile,
    });

    if (!pollingUrl) {
      console.log("❌ POLLING BLOQUEADO - não está em produção");
      return;
    }

    const response = await fetch(pollingUrl);
    if (!response.ok) throw new Error(`Polling failed: ${response.status}`);

    const data = await response.json();

    // Normalizar se vier no formato novo { success, data:[...] }
    let devicesMap = data.devices;
    if (!devicesMap && Array.isArray(data.data)) {
      devicesMap = {};
      data.data.forEach((d) => {
        if (!d || !d.id) return;
        let state = "off";

        if (Array.isArray(d.attributes)) {
          // Formato antigo: attributes é array
          const sw = d.attributes.find((a) => a.name === "switch");
          state = sw?.currentValue || sw?.value || "off";
        } else if (d.attributes && typeof d.attributes === "object") {
          // Formato atual: attributes é objeto
          if (d.attributes.switch !== undefined) {
            state = d.attributes.switch;
          } else {
            // Pular dispositivos sem switch (botões, sensores, etc.)
            return;
          }
        }

        devicesMap[d.id] = { state, success: true };

        // Se for o Denon AVR (ID 322), também capturar o volume
        if (d.id === "322") {
          console.log("🔊 DEBUG Denon encontrado:", {
            id: d.id,
            attributes: d.attributes,
            volume: d.attributes?.volume,
          });

          if (d.attributes && d.attributes.volume !== undefined) {
            devicesMap[d.id].volume = d.attributes.volume;
            console.log(`🔊 Volume capturado do Denon: ${d.attributes.volume}`);
          } else {
            console.warn("⚠️ Denon encontrado mas sem atributo volume:", d);
          }
        }
      });
    }
    if (!devicesMap) {
      console.warn("Formato inesperado de resposta no polling:", data);
      return;
    }

    // Atualizar UI com os novos estados (respeitando comandos pendentes)
    Object.entries(devicesMap).forEach(([deviceId, deviceData]) => {
      if (deviceData.success) {
        // Só atualizar localStorage se o estado mudou
        const currentStored = getStoredState(deviceId);
        if (currentStored !== deviceData.state) {
          setStoredState(deviceId, deviceData.state);
        }

        // Atualizar UI (função já verifica se elemento está pendente)
        updateDeviceUI(deviceId, deviceData.state);

        // Se for o Denon AVR e tiver volume, atualizar o slider
        if (deviceId === "322") {
          console.log("🔊 DEBUG - Processando Denon no polling:", {
            deviceId,
            volume: deviceData.volume,
            hasVolume: deviceData.volume !== undefined,
          });

          if (deviceData.volume !== undefined) {
            updateDenonVolumeUI(deviceData.volume);
          } else {
            console.warn("⚠️ Denon sem volume no deviceData:", deviceData);
          }
        }
      }
    });

    // Atualizar todos os botões master (home e cenários)
    updateAllMasterButtons();
    if (typeof updateMasterLightToggleState === "function") {
      updateMasterLightToggleState();
    }
  } catch (error) {
    console.error("Erro no polling:", error);

    // Se é erro de JSON (Functions não funcionam), parar polling
    if (
      error.message.includes("JSON.parse") ||
      error.message.includes("unexpected character")
    ) {
      console.error("❌ PARANDO POLLING - Cloudflare Functions não funcionam");
      stopPolling();
      return;
    }

    // Outros erros: tentar novamente em 10 segundos
    setTimeout(() => {
      if (pollingInterval) {
        console.log("Tentando retomar polling após erro...");
      }
    }, 10000);
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

  // Verificar se há comando recente que deve ser respeitado
  if (!forceUpdate) {
    const lastCommand = recentCommands.get(deviceId);
    if (lastCommand && Date.now() - lastCommand < COMMAND_PROTECTION_MS) {
      return;
    }
  }

  // Atualizar controles de cômodo (room-control E control-card)
  const roomControls = document.querySelectorAll(
    `[data-device-id="${deviceId}"]`
  );
  console.log(
    `🔧 updateDeviceUI(${deviceId}, ${state}) - Encontrados ${roomControls.length} controles`
  );

  roomControls.forEach((el, index) => {
    console.log(
      `🔧 Controle ${index + 1}: classes="${el.className}", currentState="${
        el.dataset.state
      }"`
    );

    // Suporta tanto .room-control quanto .control-card
    if (
      el.classList.contains("room-control") ||
      el.classList.contains("control-card")
    ) {
      const currentState = el.dataset.state;
      if (currentState !== state || forceUpdate) {
        console.log(
          `🔄 Atualizando controle ${deviceId}: "${currentState}" → "${state}" (force=${forceUpdate})`
        );
        setRoomControlUI(el, state);
        // Salvar o estado atualizado
        setStoredState(deviceId, state);
      } else {
        console.log(
          `✓ Controle ${deviceId} já está no estado correto: "${state}"`
        );
      }
    } else {
      console.log(
        `⚠️ Elemento encontrado mas não é room-control nem control-card: ${el.className}`
      );
    }
  });

  // Atualizar botões master da home após qualquer mudança de dispositivo
  updateAllMasterButtons();
}

function updateAllMasterButtons() {
  const masterButtons = document.querySelectorAll(".room-master-btn");
  masterButtons.forEach((btn) => {
    const ids = (btn.dataset.deviceIds || "").split(",").filter(Boolean);
    if (ids.length > 0) {
      const masterState = anyOn(ids) ? "on" : "off";
      setMasterIcon(btn, masterState, false); // não forçar se pendente
    }
  });
}

// Funções auxiliares para botões master (movidas do HTML)
function anyOn(deviceIds) {
  return (deviceIds || []).some((id) => (getStoredState(id) || "off") === "on");
}

// Função auxiliar para verificar se alguma cortina está aberta
function anyCurtainOpen(curtainIds) {
  // Verifica se alguma cortina do grupo está aberta
  return (curtainIds || []).some((id) => {
    const state = getCurtainState(id);
    console.log(`🔍 Cortina ${id}: estado = ${state}`);
    return state === "open";
  });
}

// Função para obter o estado atual da cortina
function getCurtainState(curtainId) {
  // Buscar no localStorage ou usar um estado padrão
  const state = localStorage.getItem(`curtain_${curtainId}_state`) || "closed";
  return state; // retorna 'open' ou 'closed'
}

// Função para obter o último comando de cortina
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
    console.error("❌ Erro ao obter estado da cortina:", error);
    return "closed";
  }
}

function setMasterIcon(btn, state, forceUpdate = false) {
  // Não atualizar se estiver com comando pendente (exceto se forçado)
  if (!forceUpdate && btn.dataset.pending === "true") {
    console.log("🔒 Master button pendente, ignorando atualização");
    return;
  }

  const img = btn.querySelector("img");
  if (!img) return;

  const newSrc =
    state === "on"
      ? "images/icons/icon-small-light-on.svg"
      : "images/icons/icon-small-light-off.svg";
  const currentSrc = img.src;

  if (!currentSrc.includes(newSrc.split("/").pop())) {
    img.src = newSrc;
    btn.dataset.state = state;
    console.log(`🎨 Master icon atualizado: ${state}`);
  }
}

function initHomeMasters() {
  // Inicializar botões master de luzes
  document.querySelectorAll(".room-master-btn").forEach((btn) => {
    const ids = (btn.dataset.deviceIds || "").split(",").filter(Boolean);
    const state = anyOn(ids) ? "on" : "off";
    setMasterIcon(btn, state, true); // forçar na inicialização
  });

  // Inicializar botões master de cortinas
  document.querySelectorAll(".room-curtain-master-btn").forEach((btn) => {
    const curtainIds = (btn.dataset.curtainIds || "")
      .split(",")
      .filter(Boolean);
    const state = anyCurtainOpen(curtainIds) ? "open" : "close";
    setCurtainMasterIcon(btn, state, true); // forçar na inicialização
  });
}

// Função para definir o ícone do botão master de cortinas
function setCurtainMasterIcon(btn, state, forceUpdate = false) {
  // Não atualizar se estiver com comando pendente (exceto se forçado)
  if (!forceUpdate && btn.dataset.pending === "true") {
    console.log("🔒 Curtain master button pendente, ignorando atualização");
    return;
  }

  const img = btn.querySelector("img");
  if (!img) return;

  const newSrc =
    state === "open"
      ? "images/icons/curtain-open.svg"
      : "images/icons/curtain-closed.svg";
  const currentSrc = img.src;

  if (!currentSrc.includes(newSrc.split("/").pop())) {
    img.src = newSrc;
    btn.dataset.state = state;
    console.log(`🎨 Curtain master icon atualizado: ${state}`);
  }
}

// Função para definir o estado de loading do botão master de cortinas
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

// Função para atualizar ícones das cortinas individuais
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

// Função chamada pelo onclick dos botões master na home
function onHomeMasterClick(event, button) {
  console.log("🖱️ onHomeMasterClick chamada!", button);
  event.preventDefault();
  event.stopPropagation();

  // Verificar se já está carregando
  if (button.dataset.loading === "true") {
    console.log("⏸️ Botão já está carregando, ignorando clique");
    return;
  }

  const deviceIds = (button.dataset.deviceIds || "").split(",").filter(Boolean);
  console.log("🔍 Device IDs encontrados:", deviceIds);

  if (deviceIds.length === 0) {
    console.log("❌ Nenhum device ID encontrado");
    return;
  }

  // Determinar comando baseado no estado atual
  const currentState = anyOn(deviceIds) ? "on" : "off";
  const newCommand = currentState === "on" ? "off" : "on";
  console.log("🎯 Comando determinado:", currentState, "→", newCommand);

  // Ativar loading visual
  console.log("🔄 Ativando loading visual...");
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
    // Remover loading após comandos
    setTimeout(() => {
      setMasterButtonLoading(button, false);
    }, 1000); // 1 segundo de delay para feedback visual
  });
}

// Função chamada pelo onclick dos botões master de cortinas na home
function onHomeCurtainMasterClick(event, button) {
  console.log("🖱️ onHomeCurtainMasterClick chamada!", button);
  event.preventDefault();
  event.stopPropagation();

  // Verificar se já está carregando
  if (button.dataset.loading === "true") {
    console.log("⏸️ Botão de cortina já está carregando, ignorando clique");
    return;
  }

  const curtainIds = (button.dataset.curtainIds || "")
    .split(",")
    .filter(Boolean);
  console.log("🔍 Curtain IDs encontrados:", curtainIds);

  if (curtainIds.length === 0) {
    console.log("❌ Nenhum curtain ID encontrado");
    return;
  }

  // Determinar comando baseado no estado atual das cortinas
  console.log(
    "🔍 Verificando estados individuais das cortinas:",
    curtainIds.map((id) => ({ id, state: getCurtainState(id) }))
  );
  const currentState = anyCurtainOpen(curtainIds) ? "open" : "closed";
  const newCommand = currentState === "open" ? "close" : "open";
  console.log(
    "🎯 Comando de cortina determinado:",
    currentState,
    "→",
    newCommand
  );

  // Atualizar UI imediatamente (antes do loading)
  setCurtainMasterIcon(button, newCommand, true); // forçar atualização

  // Ativar loading visual
  console.log("🔄 Ativando loading visual no botão de cortina...");
  setCurtainMasterButtonLoading(button, true);

  // Atualizar ícones dos botões individuais imediatamente
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
    // Remover loading após comandos
    setTimeout(() => {
      setCurtainMasterButtonLoading(button, false);
    }, 1000); // 1 segundo de delay para feedback visual
  });
}

// Função especial para atualizar estados após comandos master
function updateStatesAfterMasterCommand(deviceIds, command) {
  console.log(`🎯 Atualizando estados após master ${command} para:`, deviceIds);

  // Atualizar todos os dispositivos affected
  deviceIds.forEach((deviceId) => {
    updateDeviceUI(deviceId, command, true);
  });

  // Forçar atualização de todos os masters
  setTimeout(() => {
    const masterButtons = document.querySelectorAll(".room-master-btn");
    masterButtons.forEach((btn) => {
      const ids = (btn.dataset.deviceIds || "").split(",").filter(Boolean);
      if (ids.some((id) => deviceIds.includes(id))) {
        const masterState = anyOn(ids) ? "on" : "off";
        setMasterIcon(btn, masterState, true); // forçar atualização
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
      loader.style.display = "flex"; // Forçar display
      updateProgress(0, "Iniciando carregamento...");
      console.log("📱 Loader exibido");
    } else {
      console.warn("⚠️ Elemento loader não encontrado");
    }
  } catch (error) {
    console.error("❌ Erro ao mostrar loader:", error);
  }
}

function hideLoader() {
  try {
    const loader = document.getElementById("global-loader");
    if (loader) {
      const delay = 500; // Tempo padrão para desktop e mobile
      setTimeout(() => {
        loader.classList.add("hidden");
        // Esconder completamente após transição
        setTimeout(() => {
          loader.style.display = "none";
        }, 500);
        console.log("📱 Loader escondido");
      }, delay);
    }
  } catch (error) {
    console.error("❌ Erro ao esconder loader:", error);
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
    console.log(`📊 Progresso: ${percentage}% - ${text || "Carregando..."}`);
  } catch (error) {
    console.warn("⚠️ Erro ao atualizar progresso:", error);
  }
}

// Carregamento global de todos os estados dos dispositivos
async function loadAllDeviceStatesGlobally() {
  console.log("🌍 Iniciando carregamento global de estados...");
  console.log(
    "🌍 ALL_LIGHT_IDS disponível:",
    !!ALL_LIGHT_IDS,
    "Length:",
    ALL_LIGHT_IDS ? ALL_LIGHT_IDS.length : "undefined"
  );
  console.log("🌍 DEBUG CARREGAMENTO:", {
    isProduction: isProduction,
    hostname: location.hostname,
    isMobile: isMobile,
    userAgent: navigator.userAgent.substring(0, 100),
  });

  // Mobile e desktop usam EXATAMENTE o mesmo carregamento
  console.log("🌍 Carregamento universal (desktop e mobile idênticos)");

  if (!isProduction) {
    console.log("💻 MODO DESENVOLVIMENTO ATIVO - carregando do localStorage");
    console.log("💻 ISSO PODE SER O PROBLEMA NO MOBILE!");
    console.log("📋 Dispositivos a carregar:", ALL_LIGHT_IDS.length);
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
        console.warn(`❌ Erro ao processar ${deviceId}:`, e);
      }

      const progress = 20 + ((index + 1) / ALL_LIGHT_IDS.length) * 80;
      updateProgress(
        progress,
        `Dispositivo ${index + 1}/${ALL_LIGHT_IDS.length}...`
      );
    });

    console.log(
      `✅ Carregamento completo: ${loadedCount}/${ALL_LIGHT_IDS.length} dispositivos`
    );
    updateProgress(100, "Carregamento concluído!");
    return true;
  }

  try {
    console.log("🌍 MODO PRODUÇÃO ATIVO - buscando do servidor");
    updateProgress(10, "Testando conectividade...");

    // Teste rápido de conectividade
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
      console.log("🏥 Health check:", healthCheck.ok ? "OK" : "FAIL");
    } catch (healthError) {
      console.warn(
        "⚠️ Health check falhou, continuando mesmo assim:",
        healthError.message
      );
    }

    updateProgress(20, "Conectando com servidor...");

    const deviceIds = ALL_LIGHT_IDS.join(",");
    console.log(
      `📡 Buscando estados de ${ALL_LIGHT_IDS.length} dispositivos no servidor...`
    );
    console.log("📡 URL será:", `${POLLING_URL}?devices=${deviceIds}`);

    updateProgress(30, "Enviando solicitação...");

    // Função de retry com backoff exponencial
    const fetchWithRetry = async (
      url,
      options,
      maxRetries = NETWORK_CONFIG.MAX_RETRY_ATTEMPTS
    ) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`📡 Tentativa ${attempt}/${maxRetries} para ${url}`);
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
                `⏰ Timeout de ${
                  timeout / 1000
                }s atingido na tentativa ${attempt}`
              );
              controller.abort();
            }, timeout);
            options.signal = controller.signal;
          }

          const response = await fetch(url, options);
          if (timeoutId) clearTimeout(timeoutId);

          console.log(`📡 Tentativa ${attempt} - Status: ${response.status}`);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          return response;
        } catch (error) {
          console.warn(`❌ Tentativa ${attempt} falhou:`, error.message);

          if (attempt === maxRetries) {
            throw new Error(
              `Falha após ${maxRetries} tentativas: ${error.message}`
            );
          }

          // Aguardar antes do retry (backoff exponencial)
          const delay = Math.min(
            NETWORK_CONFIG.RETRY_DELAY_BASE * Math.pow(2, attempt - 1),
            NETWORK_CONFIG.RETRY_DELAY_MAX
          );
          console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
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
      cache: "no-cache", // Forçar busca fresca
      mode: "cors",
    };

    const requestUrl = `${POLLING_URL}?devices=${deviceIds}`;
    console.log("📡 Fazendo fetch com retry para:", requestUrl);

    const response = await fetchWithRetry(requestUrl, fetchOptions);

    console.log("📡 Resposta recebida, status:", response.status);
    updateProgress(50, "Recebendo dados...");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let data;
    let responseText = "";
    try {
      console.log("📡 Parseando resposta JSON...");

      // Debug: Capturar o texto da resposta primeiro
      responseText = await response.text();
      console.log(
        "📡 Resposta recebida (texto):",
        responseText.substring(0, 500)
      ); // Primeiros 500 chars

      if (!responseText) {
        throw new Error("Resposta vazia do servidor");
      }

      // Verificar se é HTML (Functions não estão funcionando)
      if (
        responseText.trim().startsWith("<!DOCTYPE html") ||
        responseText.trim().startsWith("<html")
      ) {
        console.error(
          "❌ CRÍTICO: Cloudflare Functions não estão funcionando!"
        );
        console.error(
          "❌ O servidor está retornando HTML em vez de executar as Functions."
        );
        console.error(
          "❌ Implementando fallback automático para API direta do Hubitat..."
        );

        // FALLBACK AUTOMÁTICO: Usar API direta do Hubitat
        console.log("🔄 Tentando API direta do Hubitat como fallback...");
        updateProgress(60, "Usando API direta como fallback...");

        try {
          const fallbackData = await loadAllDeviceStatesDirect(ALL_LIGHT_IDS);
          console.log("✅ Fallback bem-sucedido:", fallbackData);

          // Processar dados do fallback
          const deviceEntries = Object.entries(fallbackData.devices);
          let processedCount = 0;

          deviceEntries.forEach(([deviceId, deviceData]) => {
            if (deviceData.success) {
              setStoredState(deviceId, deviceData.state);
              updateDeviceUI(deviceId, deviceData.state, true);
              console.log(
                `✅ Device ${deviceId}: ${deviceData.state} (direto)`
              );
            } else {
              const storedState = getStoredState(deviceId) || "off";
              updateDeviceUI(deviceId, storedState, true);
              console.log(
                `⚠️ Device ${deviceId}: usando estado salvo "${storedState}"`
              );
            }

            processedCount++;
            const progress = 60 + (processedCount / deviceEntries.length) * 35;
            updateProgress(
              progress,
              `Processando ${processedCount}/${deviceEntries.length}...`
            );
          });

          updateProgress(100, "Carregamento via API direta concluído!");

          // Forçar atualização dos botões master
          setTimeout(() => {
            updateAllMasterButtons();
            console.log("🔄 Botões master atualizados após fallback");
          }, 100);

          console.log("✅ Fallback automático concluído com sucesso");
          return true;
        } catch (fallbackError) {
          console.error("❌ Fallback também falhou:", fallbackError);

          // Último recurso: usar estados salvos
          console.log("📦 Usando estados salvos como último recurso...");
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
      console.log("📡 JSON parseado com sucesso");
    } catch (jsonError) {
      console.error("❌ Erro ao parsear JSON:", jsonError);
      console.error(
        "❌ Conteúdo da resposta que falhou:",
        responseText?.substring(0, 200)
      );
      throw new Error(`Resposta inválida do servidor: ${jsonError.message}`);
    }
    console.log("📡 Estados recebidos:", data);

    // Normalização do formato de resposta:
    // Formato antigo esperado: { devices: { id: { state, success } } }
    // Novo formato (Cloudflare Function refatorada): { success:true, data:[ { id, attributes:[{name:'switch', currentValue:'on'}] } ] }
    if (!data.devices) {
      try {
        if (Array.isArray(data.data)) {
          console.log(
            "🔄 Normalizando",
            data.data.length,
            "dispositivos do formato novo..."
          );
          const mapped = {};
          data.data.forEach((d, index) => {
            if (!d || !d.id) {
              console.warn(`⚠️ Dispositivo ${index} inválido:`, d);
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
                console.log(`📋 Device ${d.id}: switch=${state}`);
              } else {
                console.log(
                  `🔘 Device ${d.id}: não é lâmpada (sem atributo 'switch'), pulando...`
                );
                return; // Pular dispositivos sem switch (botões, sensores, etc.)
              }
            } else {
              console.warn(
                `⚠️ Device ${d.id}: attributes inválido:`,
                d.attributes
              );
            }

            mapped[d.id] = { state, success: true };
          });
          data.devices = mapped;
          console.log(
            "🔄 Resposta normalizada para formato devices (",
            Object.keys(mapped).length,
            "dispositivos )"
          );
          console.log("🔍 Estados finais mapeados:", mapped);
        } else {
          throw new Error(
            "Formato de resposta inesperado: falta campo devices e data[]"
          );
        }
      } catch (normError) {
        console.error("❌ Falha ao normalizar resposta:", normError);
        throw normError;
      }
    }

    updateProgress(70, "Processando estados...");

    // Processar dispositivos com progresso
    const deviceEntries = Object.entries(data.devices || {});
    console.log(`🔍 Processando ${deviceEntries.length} dispositivos...`);
    let processedCount = 0;

    deviceEntries.forEach(([deviceId, deviceData]) => {
      if (deviceData.success) {
        setStoredState(deviceId, deviceData.state);
        updateDeviceUI(deviceId, deviceData.state, true); // forceUpdate = true
        console.log(`✅ Device ${deviceId}: ${deviceData.state}`);
      } else {
        console.warn(`⚠️ Falha no device ${deviceId}:`, deviceData.error);
        // Usar estado salvo como fallback
        const storedState = getStoredState(deviceId) || "off";
        updateDeviceUI(deviceId, storedState, true); // forceUpdate = true
      }

      processedCount++;
      const progress = 70 + (processedCount / deviceEntries.length) * 25;
      updateProgress(
        progress,
        `Aplicando estado ${processedCount}/${deviceEntries.length}...`
      );
    });

    updateProgress(95, "Finalizando sincronização...");

    // Forçar atualização de todos os botões master após carregamento
    setTimeout(() => {
      updateAllMasterButtons();
      console.log("🔄 Botões master atualizados após carregamento global");
    }, 100);

    updateProgress(100, "Estados carregados com sucesso!");
    console.log("✅ Carregamento global concluído com sucesso");
    return true;
  } catch (error) {
    console.error("❌ Erro no carregamento global:", error);

    // Tentar diagnóstico automático da conexão
    try {
      console.log("🔧 Executando diagnóstico da conexão...");
      const connectionTest = await testHubitatConnection();
      if (!connectionTest) {
        showErrorMessage(
          "Falha na conexão com Hubitat. Verifique se as configurações foram alteradas no painel do Cloudflare."
        );
      }
    } catch (diagError) {
      console.error("Erro no diagnóstico:", diagError);
    }

    // Tratamento inteligente de erro com retry automático
    if (error.name === "AbortError") {
      console.warn("⏱️ Timeout após múltiplas tentativas");
      updateProgress(60, "Timeout - usando backup...");
      showErrorMessage(
        "Timeout na conexão. Verifique sua internet e tente novamente."
      );
    } else if (error.message.includes("Falha após")) {
      console.warn("🔄 Múltiplas tentativas falharam");
      updateProgress(60, "Falhas múltiplas - modo backup...");
      showErrorMessage(
        "Servidor temporariamente indisponível. Usando dados salvos."
      );
    } else if (error.name === "TypeError" && error.message.includes("fetch")) {
      console.warn("🌐 Problema de conectividade de rede");
      updateProgress(60, "Sem rede - modo offline...");
      showErrorMessage("Sem conexão com a internet. Modo offline ativado.");
    } else if (error.message.includes("HTTP 5")) {
      console.warn("🔥 Erro no servidor (5xx)");
      updateProgress(60, "Erro servidor - backup...");
      showErrorMessage(
        "Problema no servidor. Usando últimos dados conhecidos."
      );
    } else {
      console.warn("❌ Erro desconhecido no carregamento:", error.message);
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

    const offlineMsg = "Carregamento concluído (modo offline)";
    updateProgress(100, offlineMsg);
    return false;
  }
}

// Verificar compatibilidade com mobile
function checkMobileCompatibility() {
  const issues = [];
  const warnings = [];

  // APIs críticas (falha total se não existirem)
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
    warnings.push("LocalStorage não suportado (sem persistência)");
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
    console.warn("⚠️ Avisos de compatibilidade:", warnings);
  }

  if (issues.length > 0) {
    console.error("❌ Problemas críticos detectados:", issues);
    return false;
  }

  console.log("✅ Compatibilidade mobile verificada");
  return true;
}

// Observador para sincronizar novos elementos no DOM
function setupDomObserver() {
  // Verificar se MutationObserver está disponível
  if (typeof MutationObserver === "undefined") {
    console.warn("⚠️ MutationObserver não disponível - usando fallback");
    // Fallback: verificar mudanças periodicamente
    setInterval(() => {
      syncAllVisibleControls();
    }, 5000);
    return;
  }

  try {
    const observer = new MutationObserver((mutations) => {
      let needsUpdate = false;

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Verificar se adicionou controles de dispositivos
            const controls = node.querySelectorAll
              ? node.querySelectorAll(
                  ".control-card[data-device-id], .room-control[data-device-id], .room-master-btn[data-device-ids]"
                )
              : [];

            if (
              controls.length > 0 ||
              node.matches?.(
                ".control-card[data-device-id], .room-control[data-device-id], .room-master-btn[data-device-ids]"
              )
            ) {
              needsUpdate = true;
              console.log(
                "🔍 Novos controles adicionados ao DOM, inicializando página de cômodo..."
              );
            }
          }
        });
      });

      if (needsUpdate) {
        // Aguardar um pouco para DOM estar estável
        setTimeout(() => {
          console.log(
            "🔄 DOM estabilizado, inicializando controles de cômodo..."
          );
          initRoomPage(); // Inicializar página de cômodo primeiro
          syncAllVisibleControls(); // Depois sincronizar todos os controles
        }, 50);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log("👁️ Observador DOM configurado para sincronização automática");
  } catch (error) {
    console.error("❌ Erro ao configurar MutationObserver:", error);
    console.warn("📱 Usando fallback para compatibilidade mobile");

    // Fallback: verificar mudanças a cada 5 segundos
    setInterval(() => {
      syncAllVisibleControls();
    }, 5000);
  }
}

// Sincronizar todos os controles visíveis com estados salvos
function syncAllVisibleControls(forceMasterUpdate = false) {
  console.log("🔄 Sincronizando todos os controles visíveis...");

  // Sincronizar controles de cômodo (room-control E control-card)
  const roomControls = document.querySelectorAll(
    ".room-control[data-device-id], .control-card[data-device-id]"
  );
  let updatedControls = 0;
  console.log(
    `🔄 Encontrados ${roomControls.length} controles para sincronizar`
  );

  roomControls.forEach((el, index) => {
    const deviceId = el.dataset.deviceId;
    const savedState = getStoredState(deviceId);
    const currentState = el.dataset.state;

    console.log(
      `🔄 Sync ${index + 1}/${
        roomControls.length
      } - ID:${deviceId}, atual:"${currentState}", salvo:"${savedState}"`
    );

    if (savedState && currentState !== savedState) {
      console.log(
        `🔄 Atualizando controle ${deviceId}: ${currentState} → ${savedState}`
      );
      setRoomControlUI(el, savedState);
      updatedControls++;
    } else if (savedState) {
      console.log(`✓ Controle ${deviceId} já está sincronizado`);
    }
  });

  // Atualizar botões master (forçar se necessário)
  const masterButtons = document.querySelectorAll(".room-master-btn");
  masterButtons.forEach((btn) => {
    const ids = (btn.dataset.deviceIds || "").split(",").filter(Boolean);
    if (ids.length > 0) {
      const masterState = anyOn(ids) ? "on" : "off";
      setMasterIcon(btn, masterState, forceMasterUpdate);
    }
  });

  console.log(
    `✅ Sincronização completa: ${updatedControls} controles atualizados`
  );
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
    console.log("📋 Estados de todos os dispositivos:");
    ALL_LIGHT_IDS.forEach((deviceId) => {
      const stored = getStoredState(deviceId);
      console.log(`  ${deviceId}: ${stored}`);
    });
  },
  testSetState: (deviceId, state) => {
    console.log(`🧪 Testando setState(${deviceId}, ${state})`);
    setStoredState(deviceId, state);
    updateDeviceUI(deviceId, state, true);
    console.log(`✅ Teste completo`);
  },
  clearAllStates: () => {
    console.log("🗑️ Limpando todos os estados salvos...");
    ALL_LIGHT_IDS.forEach((deviceId) => {
      try {
        localStorage.removeItem(deviceStateKey(deviceId));
      } catch (e) {}
    });
    console.log("✅ Estados limpos");
  },
  checkProtectedCommands: () => {
    console.log("🛡️ Comandos protegidos:");
    if (recentCommands.size === 0) {
      console.log("  ✅ Nenhum comando protegido");
      return;
    }
    const now = Date.now();
    recentCommands.forEach((timestamp, deviceId) => {
      const remaining = Math.max(0, COMMAND_PROTECTION_MS - (now - timestamp));
      const status = remaining > 0 ? "🔒 ATIVO" : "🔓 EXPIRADO";
      console.log(
        `  ${status} ${deviceId}: ${Math.ceil(remaining / 1000)}s restantes`
      );
    });
  },
  testMasterLoading: () => {
    console.log("🔄 Testando loading nos botões master...");
    const masters = document.querySelectorAll(".room-master-btn");
    const scenes = document.querySelectorAll(".scene-control-card");

    console.log("Botões master encontrados:", masters.length);
    console.log("Botões de cenário encontrados:", scenes.length);

    // Testar botões master da home
    masters.forEach((btn, index) => {
      console.log(`Testando botão master ${index + 1}:`, btn);
      setTimeout(() => {
        setMasterButtonLoading(btn, true);
        setTimeout(() => {
          setMasterButtonLoading(btn, false);
        }, 3000);
      }, index * 200);
    });

    // Testar botão de cenários também
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
    console.log("🏠 Status dos botões master:");
    document.querySelectorAll(".room-master-btn").forEach((btn, index) => {
      const ids = (btn.dataset.deviceIds || "").split(",").filter(Boolean);
      const route = btn.dataset.route || "unknown";
      const pending = btn.dataset.pending === "true";
      const currentState = btn.dataset.state || "unknown";
      const calculatedState = anyOn(ids) ? "on" : "off";
      const consistent = currentState === calculatedState;

      console.log(
        `  ${index + 1}. ${route}: ${currentState} (calc: ${calculatedState}) ${
          consistent ? "✅" : "❌"
        } ${pending ? "⏳" : "🔓"}`
      );
    });
  },
  fixMasterButtons: () => {
    console.log("🔧 Corrigindo todos os botões master...");
    document.querySelectorAll(".room-master-btn").forEach((btn) => {
      btn.dataset.pending = "false";
      const ids = (btn.dataset.deviceIds || "").split(",").filter(Boolean);
      const state = anyOn(ids) ? "on" : "off";
      setMasterIcon(btn, state, true);
    });
    console.log("✅ Botões master corrigidos!");
  },
  mobileInfo: () => {
    console.log("📱 Informações do dispositivo móvel:");
    console.log("  isMobile:", isMobile);
    console.log("  isIOS:", isIOS);
    console.log("  isProduction:", isProduction);
    console.log("  User Agent:", navigator.userAgent);
    console.log("  App Version:", APP_VERSION);
    try {
      console.log(
        "  Última carga:",
        new Date(parseInt(localStorage.getItem("last_mobile_load") || "0"))
      );
      console.log("  Versão cache:", localStorage.getItem("app_version"));
    } catch (e) {
      console.log("  localStorage indisponível");
    }
  },
  clearMobileCache: () => {
    console.log("🧹 Limpando cache mobile...");
    try {
      localStorage.removeItem("app_version");
      localStorage.removeItem("last_mobile_load");
      localStorage.removeItem("app_cache_version");
      sessionStorage.clear();
      console.log("✅ Cache mobile limpo! Recarregue a página.");
    } catch (e) {
      console.error("❌ Erro ao limpar cache:", e);
    }
  },
  forceMobileReload: () => {
    console.log("🔄 Forçando recarga mobile com limpeza de cache...");
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    setTimeout(() => {
      window.location.reload(true);
    }, 1000);
  },
  checkMobileCache: () => {
    console.log("🔍 Status do cache mobile:");
    try {
      const version = localStorage.getItem("app_version");
      const lastLoad = localStorage.getItem("last_mobile_load");
      const now = new Date().getTime();

      console.log("  App Version atual:", APP_VERSION);
      console.log("  Versão em cache:", version);
      console.log("  Cache válido:", version === APP_VERSION);

      if (lastLoad) {
        const age = Math.floor((now - parseInt(lastLoad)) / 60000); // minutos
        console.log("  Idade do cache:", age, "minutos");
        console.log("  Cache expirado:", age > 60);
      } else {
        console.log("  Primeira carga detectada");
      }
    } catch (e) {
      console.error("  Erro na verificação:", e);
    }
    console.log("  Screen:", `${screen.width}x${screen.height}`);
    console.log("  Viewport:", `${window.innerWidth}x${window.innerHeight}`);
    console.log(
      "  Connection:",
      navigator.connection
        ? `${navigator.connection.effectiveType} (${navigator.connection.downlink}Mbps)`
        : "Não disponível"
    );
    checkMobileCompatibility();
  },
  testMobileApi: async () => {
    console.log("🧪 Testando APIs para mobile...");
    try {
      const testUrl = isProduction ? "/functions/polling?devices=366" : "#test";
      // Configurar timeout compatível
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
      console.log("✅ Fetch test:", response.status, response.statusText);
    } catch (error) {
      console.error("❌ Fetch test failed:", error);
    }
  },
};

/* --- Music player UI handlers (simple local behavior for now) --- */
function initMusicPlayerUI() {
  const playBtn = document.getElementById('music-play');
  const pauseBtn = document.getElementById('music-pause');
  const nextBtn = document.getElementById('music-next');
  const prevBtn = document.getElementById('music-prev');
  const zone1Btn = document.getElementById('music-zone-1');
  const zone2Btn = document.getElementById('music-zone-2');
  const muteBtn = document.getElementById('music-mute');
  const volumeSlider = document.getElementById('music-volume-slider');
  const volumeSection = document.querySelector('.music-volume-section');
  const volumeIconUnmuted = document.querySelector('.volume-icon-unmuted');
  const volumeIconMuted = document.querySelector('.volume-icon-muted');
  const masterOnBtn = document.getElementById('music-master-on');
  const masterOffBtn = document.getElementById('music-master-off');
  const playerInner = document.querySelector('.music-player-inner');

  console.log('🎵 Inicializando player de música...', { playBtn, pauseBtn, zone1Btn, zone2Btn, masterOnBtn, masterOffBtn });

  if (!playBtn || !pauseBtn || !nextBtn || !prevBtn) {
    console.warn('⚠️ Botões de controle não encontrados');
    return;
  }

  // Estado do volume
  let isMuted = false;
  let volumeBeforeMute = 50;
  
  // Estado master power
  let isPowerOn = true;

  function setPlaying(isPlaying) {
    playBtn.disabled = isPlaying;
    pauseBtn.disabled = !isPlaying;
    playBtn.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
    pauseBtn.setAttribute('aria-pressed', isPlaying ? 'false' : 'true');
  }

  function setZone(zoneNum) {
    console.log('🎵 Alterando zona para:', zoneNum);
    if (zoneNum === 1) {
      zone1Btn.classList.add('music-zone-btn--active');
      zone1Btn.setAttribute('aria-pressed', 'true');
      zone2Btn.classList.remove('music-zone-btn--active');
      zone2Btn.setAttribute('aria-pressed', 'false');
      console.log('🎵 Zona 1 ativada');
    } else {
      zone2Btn.classList.add('music-zone-btn--active');
      zone2Btn.setAttribute('aria-pressed', 'true');
      zone1Btn.classList.remove('music-zone-btn--active');
      zone1Btn.setAttribute('aria-pressed', 'false');
      console.log('🎵 Zona 2 ativada');
    }
  }

  function setMuted(muted) {
    isMuted = muted;
    muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    volumeSection.setAttribute('data-muted', muted ? 'true' : 'false');
    
    if (volumeIconUnmuted && volumeIconMuted) {
      volumeIconUnmuted.style.display = muted ? 'none' : 'block';
      volumeIconMuted.style.display = muted ? 'block' : 'none';
    }

    if (muted) {
      volumeBeforeMute = parseInt(volumeSlider.value);
      volumeSlider.value = 0;
      console.log('🔇 Volume mutado. Volume anterior:', volumeBeforeMute);
    } else {
      volumeSlider.value = volumeBeforeMute;
      console.log('🔊 Volume desmutado. Volume restaurado:', volumeBeforeMute);
    }
  }

  playBtn.addEventListener('click', () => {
    console.log('▶️ Play clicked');
    setPlaying(true);
  });

  pauseBtn.addEventListener('click', () => {
    console.log('⏸️ Pause clicked');
    setPlaying(false);
  });

  nextBtn.addEventListener('click', () => {
    console.log('⏭️ Next clicked');
  });

  prevBtn.addEventListener('click', () => {
    console.log('⏮️ Previous clicked');
  });

  if (zone1Btn && zone2Btn) {
    console.log('🎵 Configurando event listeners das zonas');
    zone1Btn.addEventListener('click', (e) => {
      console.log('🎵 Zona 1 clicada');
      e.preventDefault();
      setZone(1);
    });

    zone2Btn.addEventListener('click', (e) => {
      console.log('🎵 Zona 2 clicada');
      e.preventDefault();
      setZone(2);
    });
  } else {
    console.warn('⚠️ Botões de zona não encontrados');
  }

  // Controle de volume
  if (muteBtn && volumeSlider) {
    muteBtn.addEventListener('click', () => {
      setMuted(!isMuted);
    });

    // Função para atualizar a barra de volume
    function updateVolumeBar() {
      const value = parseInt(volumeSlider.value);
      const percent = (value / 100) * 100;
      volumeSlider.style.setProperty('--volume-percent', percent + '%');
      console.log('🔊 Volume ajustado para:', value, '% -', percent + '%');
    }

    // Event listener para input (arrastar o slider)
    volumeSlider.addEventListener('input', (e) => {
      updateVolumeBar();
    });

    // Event listener para change (quando solta o slider)
    volumeSlider.addEventListener('change', (e) => {
      updateVolumeBar();
      const value = e.target.value;
      console.log('🔊 Volume finalizado em:', value);
    });

    // Garantir que o slider seja interativo
    volumeSlider.style.pointerEvents = 'auto';
    
    // Inicializar a barra com o valor padrão
    updateVolumeBar();
    
    console.log('🎵 Slider de volume configurado:', volumeSlider);
  } else {
    console.warn('⚠️ Botão mute ou slider não encontrados');
  }

  // Controle master On/Off
  function setMasterPower(powerOn) {
    isPowerOn = powerOn;
    
    if (powerOn) {
      masterOnBtn.classList.add('music-master-btn--active');
      masterOnBtn.setAttribute('aria-pressed', 'true');
      masterOffBtn.classList.remove('music-master-btn--active');
      masterOffBtn.setAttribute('aria-pressed', 'false');
      playerInner.classList.remove('power-off');
      console.log('⚡ Player ligado');
    } else {
      masterOffBtn.classList.add('music-master-btn--active');
      masterOffBtn.setAttribute('aria-pressed', 'true');
      masterOnBtn.classList.remove('music-master-btn--active');
      masterOnBtn.setAttribute('aria-pressed', 'false');
      playerInner.classList.add('power-off');
      console.log('⚫ Player desligado');
    }
  }

  if (masterOnBtn && masterOffBtn && playerInner) {
    masterOnBtn.addEventListener('click', () => {
      if (!isPowerOn) {
        setMasterPower(true);
      }
    });

    masterOffBtn.addEventListener('click', () => {
      if (isPowerOn) {
        setMasterPower(false);
      }
    });
  }

  // initialize
  setPlaying(false);
  setMasterPower(true); // Iniciar com o player ligado
  console.log('🎵 Player de música inicializado');
}

// Initialize when SPA navigation might insert the music page
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initMusicPlayerUI, 100);
});

// Versão ultra-básica para browsers problemáticos
function initUltraBasicMode() {
  try {
    showMobileDebug("🚨 Inicializando modo ultra-básico...", "info");

    // Esconder loader de forma mais segura
    var loader = document.getElementById("global-loader");
    if (loader) {
      loader.style.display = "none";
      showMobileDebug("✅ Loader escondido em modo básico", "success");
    }

    // Definir estados básicos sem usar localStorage (pode falhar no mobile)
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
      "✅ Modo ultra-básico ativo - " +
        processedDevices +
        " dispositivos processados",
      "success"
    );

    // Verificar elementos básicos
    var controls = document.querySelectorAll(".room-control");
    var masters = document.querySelectorAll(".room-master-btn");
    showMobileDebug(
      "🔍 Encontrados " +
        controls.length +
        " controles e " +
        masters.length +
        " masters",
      "info"
    );

    return true; // Sucesso
  } catch (error) {
    showMobileDebug(
      "❌ ERRO CRÍTICO no modo ultra-básico: " + error.message,
      "error"
    );
    return false; // Falha
  }
}

// Função de inicialização simplificada para mobile COM POLLING ATIVO
function initSimpleMode() {
  console.log("📱 Inicializando modo simples com polling...");

  try {
    console.log("📱 Tentando mostrar loader...");
    showLoader();

    console.log("📱 Atualizando progresso...");
    updateProgress(10, "Modo simples com polling ativo...");

    console.log("📱 Processando", ALL_LIGHT_IDS.length, "dispositivos...");

    // Carregar estados básicos
    for (var i = 0; i < ALL_LIGHT_IDS.length; i++) {
      var deviceId = ALL_LIGHT_IDS[i];
      var progress = 10 + ((i + 1) / ALL_LIGHT_IDS.length) * 70; // Deixar 20% para polling

      console.log(
        "📱 Processando device",
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
        console.error("❌ Erro no device", deviceId + ":", e);
      }
    }

    console.log("📱 Configurando polling para modo simples...");
    updateProgress(85, "Ativando sincronização...");

    // Configurar observador DOM simplificado
    try {
      setupDomObserver();
      console.log("✅ Observador DOM configurado no modo simples");
    } catch (e) {
      console.warn("⚠️ Observador DOM falhou no modo simples:", e);
    }

    // Sincronizar controles visíveis
    updateProgress(90, "Sincronizando controles...");
    setTimeout(function () {
      try {
        syncAllVisibleControls();
        console.log("✅ Controles sincronizados no modo simples");
      } catch (e) {
        console.warn("⚠️ Sincronização falhou:", e);
      }
    }, 300);

    // IMPLEMENTAR POLLING NO MODO SIMPLES
    updateProgress(95, "Iniciando polling...");
    setTimeout(function () {
      if (isProduction) {
        console.log("🔄 Iniciando polling em modo simples...");
        try {
          startPolling(); // Ativar polling completo mesmo no modo simples
          console.log("✅ Polling ativo no modo simples");
        } catch (e) {
          console.error("❌ Erro ao iniciar polling no modo simples:", e);
        }
      } else {
        console.log(
          "💻 Modo desenvolvimento - polling não iniciado no modo simples"
        );
      }

      updateProgress(100, "Modo simples com polling ativo!");

      setTimeout(function () {
        console.log("📱 Escondendo loader...");
        hideLoader();
        console.log("✅ Modo simples com polling completo ativo");
      }, 1000);
    }, 2000); // Aguardar 2s para estabilizar antes do polling
  } catch (error) {
    console.error("❌ ERRO CRÍTICO no modo simples:", error);
    console.error("❌ Erro stack:", error.stack);
    console.error("❌ Erro linha:", error.lineNumber || "desconhecida");

    // Ativar modo ultra-básico como fallback
    console.log("🚨 Ativando modo ultra-básico...");
    initUltraBasicMode();
  }
}

// Tratamento de erros globais para debug mobile
window.onerror = function (message, source, lineno, colno, error) {
  console.error("🚨 ERRO GLOBAL DETECTADO:");
  console.error("📍 Mensagem:", message);
  console.error("📍 Arquivo:", source);
  console.error("📍 Linha:", lineno);
  console.error("📍 Coluna:", colno);
  console.error("📍 Erro:", error);

  // Tentar ativar modo ultra-básico
  setTimeout(function () {
    console.log("🚨 Tentando recuperação automática...");
    try {
      initUltraBasicMode();
    } catch (e) {
      console.error("💥 Falha na recuperação:", e);
    }
  }, 1000);

  return false; // Não impedir outros handlers
};

// Capturar promises rejeitadas
window.addEventListener("unhandledrejection", function (event) {
  console.error("🚨 PROMISE REJEITADA:", event.reason);
  console.error("🚨 Promise:", event.promise);
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

    // Timeout padrão para desktop e mobile (comportamento idêntico)
    var initDelay = 500;
    console.log("Delay de inicialização: " + initDelay + "ms (universal)");

    // Aguardar um pouco para UI carregar e então iniciar carregamento
    setTimeout(function () {
      console.log("Iniciando carregamento principal...");

      try {
        // Carregamento global de todos os estados (usando Promise)
        loadAllDeviceStatesGlobally()
          .then(function (success) {
            console.log("Carregamento global concluído, success:", success);

            // Delay final padrão para desktop e mobile
            var finalDelay = 800;
            setTimeout(function () {
              // Esconder loader
              hideLoader();

              // Configurar observador DOM
              setupDomObserver();

              // Inicializar página de cômodo e sincronizar controles já existentes
              var syncDelay = 100;
              setTimeout(() => {
                console.log(
                  "🏠 Inicializando controles de cômodos na inicialização..."
                );
                initRoomPage(); // Inicializar página de cômodo
                syncAllVisibleControls(); // Sincronizar todos os controles
              }, syncDelay);

              // Iniciar polling se estiver em produção
              if (isProduction) {
                var pollingDelay = 3000;
                console.log(
                  "✅ INICIANDO POLLING em " +
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
                console.log("❌ POLLING NÃO INICIADO - não está em produção:", {
                  isProduction: isProduction,
                  hostname: location.hostname,
                  isMobile: isMobile,
                });
              }

              console.log("Aplicação totalmente inicializada!");
              showMobileDebug("App totalmente inicializada!", "success");

              // Marcar que a inicialização foi concluída
              window.appFullyInitialized = true;
            }, finalDelay);
          })
          .catch(function (error) {
            console.error("Erro no carregamento global:", error);
            showMobileDebug("Erro no carregamento: " + error.message, "error");
            hideLoader();

            // Fallback para modo básico
            setTimeout(function () {
              try {
                initUltraBasicMode();
              } catch (ultraError) {
                console.error("Falha total na recuperação:", ultraError);
                updateProgress(100, "Erro crítico - recarregue a página");
                setTimeout(function () {
                  hideLoader();
                }, 3000);
              }
            }, 1000);
          });
      } catch (loadError) {
        console.error("Erro crítico na inicialização:", loadError);
        showMobileDebug("ERRO CRÍTICO: " + loadError.message, "error");

        // Modo de emergência
        try {
          initUltraBasicMode();
        } catch (emergencyError) {
          console.error("Falha no modo de emergência:", emergencyError);
          updateProgress(100, "Erro crítico - recarregue a página");
          setTimeout(hideLoader, 3000);
        }
      }
    }, initDelay);
  } catch (mainError) {
    console.error("ERRO CRITICO NA INICIALIZACAO PRINCIPAL:", mainError);
    showMobileDebug("ERRO PRINCIPAL: " + mainError.message, "error");

    // Último recurso - modo ultra-básico
    try {
      initUltraBasicMode();
    } catch (finalError) {
      console.error("FALHA TOTAL:", finalError);
      showMobileDebug("FALHA TOTAL: " + finalError.message, "error");
    }
  }
}

// Inicialização global da aplicação
window.addEventListener("DOMContentLoaded", function () {
  console.log("DOMContentLoaded executado, chamando initializeApp...");
  initializeApp();
});

// Fallback se DOMContentLoaded não funcionar
setTimeout(function () {
  if (!window.initializationStarted) {
    console.log(
      "Fallback: DOMContentLoaded não executou, forçando inicialização..."
    );
    initializeApp();
  }
}, 2000);

// Parar polling quando a página é fechada
window.addEventListener("beforeunload", stopPolling);

// Funções de debug disponíveis globalmente
window.testHubitatConnection = testHubitatConnection;
window.showErrorMessage = showErrorMessage;
