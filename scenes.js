// ALL_LIGHT_IDS agora está definido em script.js (carregado primeiro)
const ALL_CURTAIN_IDS = [
  "38", // Cortina Ambiente 5
  "39", // Cortina Ambiente 3 (exemplo)
  "40", // Cortina Ambiente 3 (exemplo adicional)
  "41", // Cortina adicional (exemplo)
  "42", // Cortina Ambiente 2 (exemplo)
  "43", // Cortina adicional (exemplo)
  // ID 44: Todas-Cortinas (Virtual Button - master)
];
let masterConfirmCallback = null;

function showPopup(message, onConfirm) {
  const popup = document.getElementById("confirmation-popup");
  const messageEl = document.getElementById("popup-message");
  const confirmBtn = document.getElementById("popup-confirm");
  const cancelBtn = document.getElementById("popup-cancel");
  const overlay = popup;

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
  popup.style.display = "none";
  const confirmBtn = document.getElementById("popup-confirm");
  confirmBtn.onclick = null;
  masterConfirmCallback = null;
}

// DEPRECATED: função removida com novos cenários de expediente
// function updateMasterLightToggleState() {
//     const btn = document.getElementById('master-light-toggle-btn');
//     if (!btn) return;
//     // ... código comentado
// }

function handleMasterLightToggle() {
  const btn = document.getElementById("master-light-toggle-btn");
  const action = btn.dataset.action;

  const message =
    action === "on"
      ? "Você tem certeza que gostaria de ligar tudo?"
      : "Você tem certeza que gostaria de desligar tudo?";

  showPopup(message, () => executeMasterLightToggle(action));
}

function executeMasterLightToggle(action) {
  // Usar machine rules dos relay boards para otimização:
  // Dispositivos 264 e 265: MasterONOFF-RelayBoard-01 e 02
  // Button 1 (push 1) = Master ON para ambos os relay boards
  // Button 2 (push 2) = Master OFF para ambos os relay boards

  const relayDevices = ["264", "265"]; // Ambos os relay boards
  const buttonValue = action === "on" ? "1" : "2"; // Button 1 = ON, Button 2 = OFF

  console.log(
    `🎯 Executando master ${action} via relay boards otimizados (devices ${relayDevices.join(
      ", "
    )}, button ${buttonValue})`
  );

  // Enviar comandos para ambos os relay boards em paralelo
  const promises = relayDevices.map((deviceId) => {
    console.log(`📡 Enviando push ${buttonValue} para device ${deviceId}`);
    return sendHubitatCommand(deviceId, "push", buttonValue);
  });

  Promise.all(promises)
    .then(() => {
      console.log(
        `✅ Master light toggle ${action} enviado com sucesso para ambos os relay boards`
      );

      // Atualizar estados locais de todos os dispositivos após comando bem-sucedido
      ALL_LIGHT_IDS.forEach((id) => {
        setStoredState(id, action);
      });

      // Forçar atualização da UI após 1 segundo para dar tempo dos relay boards processarem
      setTimeout(() => {
        updateMasterLightToggleState();
        // Forçar polling para sincronizar estados reais
        if (typeof updateDeviceStatesFromServer === "function") {
          updateDeviceStatesFromServer();
        }
      }, 1000);

      hidePopup();
    })
    .catch((err) => {
      console.error(
        `❌ Master light toggle ${action} falhou em um ou mais relay boards:`,
        err
      );
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
  const promises = ALL_CURTAIN_IDS.map((id) => sendCurtainCommand(id, action));

  Promise.all(promises)
    .then(() => {
      console.log(`Master curtain toggle ${action} complete.`);
      hidePopup();
    })
    .catch((err) => {
      console.error(`Master curtain toggle ${action} failed:`, err);
      hidePopup();
    });
}

// Funções para controlar todas as cortinas via botão virtual do Hubitat (ID 44)
function handleMasterCurtainsOpen() {
  showPopup("Você tem certeza que gostaria de abrir todas as cortinas?", () => {
    executeMasterCurtainsAction("open");
  });
}

function handleMasterCurtainsClose() {
  showPopup(
    "Você tem certeza que gostaria de fechar todas as cortinas?",
    () => {
      executeMasterCurtainsAction("close");
    }
  );
}

function executeMasterCurtainsAction(action) {
  const deviceId = "44"; // Virtual Button "Todas-Cortinas"
  const pushButton = action === "open" ? "1" : "3"; // 1 = abrir, 3 = fechar

  console.log(
    `🎬 Executando ação master curtinas: ${action} (ID: ${deviceId}, push: ${pushButton})`
  );

  // Adicionar feedback visual (loading)
  const btnId =
    action === "open"
      ? "master-curtains-open-btn"
      : "master-curtains-close-btn";
  const btn = document.getElementById(btnId);
  if (btn) {
    btn.classList.add("loading");
  }

  // Enviar comando para o Virtual Button
  sendHubitatCommand(deviceId, "push", pushButton)
    .then(() => {
      console.log(`✅ Comando master curtinas ${action} executado com sucesso`);
      hidePopup();
    })
    .catch((error) => {
      console.error(
        `❌ Erro ao executar comando master curtinas ${action}:`,
        error
      );
      showErrorMessage(
        `Erro ao ${action === "open" ? "abrir" : "fechar"} cortinas: ${
          error.message
        }`
      );
    })
    .finally(() => {
      // Remover feedback visual
      if (btn) {
        btn.classList.remove("loading");
      }
    });
}

// === CENÁRIOS GENÉRICOS ===

function handleCenario1() {
  showPopup(
    "Executar Cenário 1? Esta ação será configurada de acordo com as necessidades do cliente.",
    executeCenario1
  );
}

function executeCenario1() {
  console.log("🌅 Iniciando cenário: Cenário 1");

  // Exemplo: Definir IDs dos dispositivos por ambiente
  const ambiente2Lights = ["7", "8", "9"]; // Ambiente 2: exemplo de IDs
  const ambiente3Lights = ["11", "12", "13"]; // Ambiente 3: exemplo de IDs
  const ambiente4Barra = ["36"]; // Ambiente 4: exemplo de ID
  const ambiente3Curtains = ["39", "40"]; // Cortinas do Ambiente 3 (exemplo)

  // Adicionar feedback visual
  const btn = document.getElementById("cenario-1-btn");
  if (btn) btn.classList.add("loading");

  const promises = [];

  // Acender luzes do Ambiente 2
  ambiente2Lights.forEach((deviceId) => {
    console.log(`💡 Ligando Ambiente 2 device ${deviceId}`);
    promises.push(sendHubitatCommand(deviceId, "on"));
    setStoredState(deviceId, "on");
  });

  // Acender luzes do Ambiente 3
  ambiente3Lights.forEach((deviceId) => {
    console.log(`💡 Ligando Ambiente 3 device ${deviceId}`);
    promises.push(sendHubitatCommand(deviceId, "on"));
    setStoredState(deviceId, "on");
  });

  // Acender Barra LED do Ambiente 4
  ambiente4Barra.forEach((deviceId) => {
    console.log(`💡 Ligando Ambiente 4 Barra LED ${deviceId}`);
    promises.push(sendHubitatCommand(deviceId, "on"));
    setStoredState(deviceId, "on");
  });

  // Abrir cortinas do Ambiente 3
  ambiente3Curtains.forEach((deviceId) => {
    console.log(`🪟 Abrindo cortina Ambiente 3 ${deviceId}`);
    promises.push(sendCurtainCommand(deviceId, "open"));
  });

  Promise.all(promises)
    .then(() => {
      console.log("✅ Cenário 1 executado com sucesso");
      setTimeout(() => {
        if (typeof syncAllVisibleControls === "function") {
          syncAllVisibleControls(true);
        }
      }, 500);
      hidePopup();
    })
    .catch((error) => {
      console.error("❌ Erro ao executar Cenário 1:", error);
      if (typeof showErrorMessage === "function") {
        showErrorMessage(`Erro ao executar cenário 1: ${error.message}`);
      }
    })
    .finally(() => {
      if (btn) btn.classList.remove("loading");
    });
}

function handleCenario2() {
  showPopup(
    "Executar Cenário 2? Esta ação será configurada de acordo com as necessidades do cliente.",
    executeCenario2
  );
}

function executeCenario2() {
  console.log("🌙 Iniciando cenário: Cenário 2");

  // Exemplo: Definir IDs dos dispositivos
  const lightsToKeepOn = [
    "35", // Ambiente 4: exemplo
    "37", // Ambiente 4: exemplo
    "49", // Ambiente 6: exemplo
  ];

  // Todos os outros dispositivos devem ser apagados
  const devicesToTurnOff = ALL_LIGHT_IDS.filter(
    (id) => !lightsToKeepOn.includes(id)
  );

  // Adicionar feedback visual
  const btn = document.getElementById("cenario-2-btn");
  if (btn) btn.classList.add("loading");

  const promises = [];

  // Ligar luzes especificadas
  lightsToKeepOn.forEach((deviceId) => {
    console.log(`💡 Ligando luz ${deviceId}`);
    promises.push(sendHubitatCommand(deviceId, "on"));
    setStoredState(deviceId, "on");
  });

  // Apagar todas as demais luzes
  devicesToTurnOff.forEach((deviceId) => {
    console.log(`🔌 Desligando device ${deviceId}`);
    promises.push(sendHubitatCommand(deviceId, "off"));
    setStoredState(deviceId, "off");
  });

  // Fechar todas as cortinas
  ALL_CURTAIN_IDS.forEach((deviceId) => {
    console.log(`🪟 Fechando cortina ${deviceId}`);
    promises.push(sendCurtainCommand(deviceId, "close"));
  });

  Promise.all(promises)
    .then(() => {
      console.log("✅ Cenário 2 executado com sucesso");
      setTimeout(() => {
        if (typeof syncAllVisibleControls === "function") {
          syncAllVisibleControls(true);
        }
      }, 500);
      hidePopup();
    })
    .catch((error) => {
      console.error("❌ Erro ao executar Cenário 2:", error);
      if (typeof showErrorMessage === "function") {
        showErrorMessage(`Erro ao executar cenário 2: ${error.message}`);
      }
    })
    .finally(() => {
      if (btn) btn.classList.remove("loading");
    });
}

function initScenesPage() {
  updateMasterLightToggleState();
}
