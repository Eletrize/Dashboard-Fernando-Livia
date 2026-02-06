// ALL_LIGHT_IDS agora está definido em script.js (carregado primeiro)

// === MAPEAMENTO DE DISPOSITIVOS ===
// Varanda (Ambiente 1)
const VARANDA_LUZES = ["44", "95", "96", "41", "45", "40", "31"];
const VARANDA_CORTINAS = ["109", "115", "116"];
const VARANDA_AC = "110";
const VARANDA_TV = "111";

// Living (Ambiente 2)
const LIVING_LUZES = ["57", "61", "75", "76", "49", "58", "20"];
const LIVING_CORTINAS = ["119"];
const LIVING_AC = "167";

// Receiver/Música
const RECEIVER = "15";

// Área íntima
const AREA_INTIMA_BALIZADORES = "82";

// Piscina (inclui luz da página Piscina > Iluminação)
const PISCINA_LUZES = ["35", "36", "37", "42", "270"];

// Cenário Vinho
const VINHO_LUZES_ON = ["20", "75", "76"]; // Arandela, Spots Adega, LED Movel Adega

// Cenário Jantar
const JANTAR_VARANDA_LUZES_ON = ["31", "40", "45", "96", "95"]; // Lustre, Spots Movel, LED Movel, LED Movel Pia, LED Pia

let masterConfirmCallback = null;

function showPopup(message, onConfirm) {
  const popup = document.getElementById("confirmation-popup");
  const messageEl = document.getElementById("popup-message");
  const confirmBtn = document.getElementById("popup-confirm");
  const cancelBtn = document.getElementById("popup-cancel");
  const overlay = popup;

  if (!popup || !messageEl || !confirmBtn || !cancelBtn) {
    return;
  }

  messageEl.textContent = message;
  masterConfirmCallback = onConfirm;

  popup.style.display = "flex";

  confirmBtn.onclick = () => {
    if (typeof masterConfirmCallback === "function") {
      masterConfirmCallback();
    }
  };
  cancelBtn.onclick = hidePopup;
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      hidePopup();
    }
  };
}

function hidePopup() {
  const popup = document.getElementById("confirmation-popup");
  if (!popup) return;
  popup.style.display = "none";
  const confirmBtn = document.getElementById("popup-confirm");
  if (confirmBtn) confirmBtn.onclick = null;
  masterConfirmCallback = null;
}

// Função placeholder para manter compatibilidade
function updateMasterLightToggleState() {
  // Intencionalmente vazia
}

function handleMasterLightToggle() {
  const btn = document.getElementById("master-light-toggle-btn");
  if (!btn) return;
  const action = btn.dataset.action;

  const message =
    action === "on"
      ? "Você tem certeza que gostaria de ligar tudo?"
      : "Você tem certeza que gostaria de desligar tudo?";

  showPopup(message, () => executeMasterLightToggle(action));
}

function executeMasterLightToggle(action) {
  // Dispositivos 264 e 265: MasterONOFF-RelayBoard-01 e 02
  // Button 1 (push 1) = Master ON
  // Button 2 (push 2) = Master OFF
  const relayDevices = ["264", "265"];
  const buttonValue = action === "on" ? "1" : "2";

  const promises = relayDevices.map((deviceId) =>
    sendHubitatCommand(deviceId, "push", buttonValue)
  );

  Promise.all(promises)
    .then(() => {
      if (Array.isArray(ALL_LIGHT_IDS)) {
        ALL_LIGHT_IDS.forEach((id) => {
          if (typeof setStoredState === "function") {
            setStoredState(id, action);
          }
        });
      }

      setTimeout(() => {
        updateMasterLightToggleState();
        if (typeof updateDeviceStatesFromServer === "function") {
          updateDeviceStatesFromServer();
        }
      }, 1000);

      hidePopup();
    })
    .catch((err) => {
      console.error(`Erro no master light toggle (${action}):`, err);
      hidePopup();
    });
}

function handleMasterCurtainToggle(action) {
  const message =
    action === "open"
      ? "Você tem certeza que gostaria de subir todas as cortinas?"
      : "Você tem certeza que gostaria de descer todas as cortinas?";

  showPopup(message, () => executeMasterCurtainToggle(action));
}

function executeMasterCurtainToggle(action) {
  const curtainIds = Array.isArray(window.ALL_CURTAIN_IDS)
    ? window.ALL_CURTAIN_IDS
    : [];
  const promises = curtainIds.map((id) => sendCurtainCommand(id, action));

  Promise.all(promises)
    .then(() => {
      hidePopup();
    })
    .catch((err) => {
      console.error(`Master curtain toggle ${action} failed:`, err);
      hidePopup();
    });
}

function handleMasterCurtainsOpen() {
  showPopup("Você tem certeza que gostaria de abrir todas as cortinas?", () => {
    executeMasterCurtainsAction("open");
  });
}

function handleMasterCurtainsClose() {
  showPopup("Você tem certeza que gostaria de fechar todas as cortinas?", () => {
    executeMasterCurtainsAction("close");
  });
}

function executeMasterCurtainsAction(action) {
  const deviceId = "44"; // Virtual Button "Todas-Cortinas"
  const pushButton = action === "open" ? "1" : "3"; // 1 = abrir, 3 = fechar

  const btnId =
    action === "open"
      ? "master-curtains-open-btn"
      : "master-curtains-close-btn";
  const btn = document.getElementById(btnId);
  if (btn) btn.classList.add("loading");

  sendHubitatCommand(deviceId, "push", pushButton)
    .then(() => {
      hidePopup();
    })
    .catch((error) => {
      console.error(`Erro ao executar comando master curtinas ${action}:`, error);
      if (typeof showErrorMessage === "function") {
        showErrorMessage(
          `Erro ao ${action === "open" ? "abrir" : "fechar"} cortinas: ${
            error.message
          }`
        );
      }
    })
    .finally(() => {
      if (btn) btn.classList.remove("loading");
    });
}

function setSceneButtonLoading(buttonId, isLoading) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.classList.toggle("loading", Boolean(isLoading));
}

async function sendCommandToMany(deviceIds, command, value) {
  const ids = Array.isArray(deviceIds) ? deviceIds : [deviceIds];
  return Promise.all(ids.map((id) => sendHubitatCommand(id, command, value)));
}

function syncLightStates(deviceIds, state) {
  if (!Array.isArray(deviceIds)) return;
  deviceIds.forEach((id) => {
    if (typeof setStoredState === "function") {
      setStoredState(id, state);
    }
    if (typeof updateDeviceUI === "function") {
      updateDeviceUI(id, state, true);
    }
  });
}

async function turnOnAC(deviceId) {
  if (!deviceId) return;
  try {
    await sendHubitatCommand(deviceId, "initialize");
  } catch (_error) {
    // Segue com "on" mesmo se initialize falhar.
  }
  await sendHubitatCommand(deviceId, "on");
}

function syncCurtainsClosed(deviceIds) {
  if (!Array.isArray(deviceIds)) return;

  if (typeof setCurtainState === "function") {
    deviceIds.forEach((id) => setCurtainState(id, "closed"));
  }

  if (typeof updateIndividualCurtainButtons === "function") {
    updateIndividualCurtainButtons(deviceIds, "close");
  }
}

function refreshStatesAfterScene() {
  if (typeof updateDeviceStatesFromServer === "function") {
    updateDeviceStatesFromServer();
  }
}

// === CENÁRIO DORMIR ===
// Envia command scene1 para o dispositivo 197
function handleCenarioDormir() {
  showPopup("Executar cenário Dormir?", executeCenarioDormir);
}

function executeCenarioDormir() {
  const buttonId = "cenario-dormir-btn";
  setSceneButtonLoading(buttonId, true);

  sendHubitatCommand("197", "initialize")
    .then(() => {
      const curtainCommands = VARANDA_CORTINAS.map((id) =>
        sendCurtainCommand(id, "close")
      );

      return Promise.all([
        sendHubitatCommand("197", "scene1"),
        sendHubitatCommand(AREA_INTIMA_BALIZADORES, "on"),
        ...curtainCommands,
      ]);
    })
    .then(() => {
      if (typeof setStoredState === "function") {
        setStoredState(AREA_INTIMA_BALIZADORES, "on");
      }

      if (typeof updateDeviceUI === "function") {
        updateDeviceUI(AREA_INTIMA_BALIZADORES, "on", true);
      }

      syncCurtainsClosed(VARANDA_CORTINAS);
      refreshStatesAfterScene();
      hidePopup();
    })
    .catch((error) => {
      console.error("Erro ao executar Cenário Dormir:", error);
      if (typeof showErrorMessage === "function") {
        showErrorMessage(`Erro ao executar cenário Dormir: ${error.message}`);
      }
    })
    .finally(() => {
      setSceneButtonLoading(buttonId, false);
    });
}

// === CENÁRIO VINHO ===
function handleCenarioVinho() {
  showPopup("Executar cenário Vinho?", executeCenarioVinho);
}

async function executeCenarioVinho() {
  const buttonId = "cenario-vinho-btn";
  setSceneButtonLoading(buttonId, true);

  try {
    // 1) Desligar todas as luzes do Living
    await sendCommandToMany(LIVING_LUZES, "off");
    syncLightStates(LIVING_LUZES, "off");

    // 2) Acender Arandela, Spots Adega e LED Movel Adega
    await sendCommandToMany(VINHO_LUZES_ON, "on");
    syncLightStates(VINHO_LUZES_ON, "on");

    // 3) Ligar AR Living
    await turnOnAC(LIVING_AC);

    // 4) Fechar cortina Living
    await Promise.all(
      LIVING_CORTINAS.map((id) => sendCurtainCommand(id, "close"))
    );
    syncCurtainsClosed(LIVING_CORTINAS);

    refreshStatesAfterScene();
    hidePopup();
  } catch (error) {
    console.error("Erro ao executar Cenário Vinho:", error);
    if (typeof showErrorMessage === "function") {
      showErrorMessage(`Erro ao executar cenário Vinho: ${error.message}`);
    }
  } finally {
    setSceneButtonLoading(buttonId, false);
  }
}

// === CENÁRIO JANTAR ===
function handleCenarioJantar() {
  showPopup("Executar cenário Jantar?", executeCenarioJantar);
}

async function executeCenarioJantar() {
  const buttonId = "cenario-jantar-btn";
  setSceneButtonLoading(buttonId, true);

  try {
    // 1) Desligar todas as luzes da Varanda
    await sendCommandToMany(VARANDA_LUZES, "off");
    syncLightStates(VARANDA_LUZES, "off");

    // 2) Acender luzes da cena Jantar na Varanda
    await sendCommandToMany(JANTAR_VARANDA_LUZES_ON, "on");
    syncLightStates(JANTAR_VARANDA_LUZES_ON, "on");

    // 3) Acender todas as luzes da Piscina
    await sendCommandToMany(PISCINA_LUZES, "on");
    syncLightStates(PISCINA_LUZES, "on");

    // 4) Ligar AR da Varanda
    await turnOnAC(VARANDA_AC);

    refreshStatesAfterScene();
    hidePopup();
  } catch (error) {
    console.error("Erro ao executar Cenário Jantar:", error);
    if (typeof showErrorMessage === "function") {
      showErrorMessage(`Erro ao executar cenário Jantar: ${error.message}`);
    }
  } finally {
    setSceneButtonLoading(buttonId, false);
  }
}

function initScenesPage() {
  updateMasterLightToggleState();
}
