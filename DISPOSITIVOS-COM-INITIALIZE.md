# Dispositivos com Comando INITIALIZE

## ✅ FUNCIONALIDADE IMPLEMENTADA

Todos os dispositivos listados abaixo **agora são inicializados automaticamente** durante a tela de loading do app.

### Como funciona:
1. Ao abrir o app, a tela de loading aparece
2. Após carregar os estados dos dispositivos, o sistema envia `initialize` para todos os IDs listados
3. Os comandos são enviados em lotes de 5 (para não sobrecarregar)
4. O progresso é mostrado na tela de loading
5. Após conclusão, o app fica pronto para uso

### Debug manual:
```javascript
// No console do navegador:
initializeAllDevices().then(console.log);
```

---

## 📊 Resumo Total
- **Total de dispositivos analisados**: 72
- **Dispositivos com `initialize`**: 32
- **Dispositivos sem `initialize`**: 40

---

## 🔌 GRUPOS POR FUNÇÃO

### 🎵 ÁUDIO (Denon AVR - 3 dispositivos)
| ID | Nome | Label | Status |
|---|---|---|---|
| 15 | Denon AVR | Varanda Denon | ✅ Online |
| 195 | Denon AVR | Denon Living | ❌ Offline |
| 29 | Denon HEOS Speaker | Varanda Denon | ✅ Online |

---

### ⌨️ KEYPADS (Controlart - Xport - IVOLV Keypad - 12 dispositivos)
| ID | Nome | Label | Status |
|---|---|---|---|
| 19 | KP 14 4X3 - 60-19-B0 | KP 14 4X3 - 60-19-B0 | ❌ Offline |
| 30 | KP 01 3X3 - 3D-23-84 | KP 01 3X3 - 3D-23-84 | ❌ Offline |
| 34 | KP 02 4X3 - 64-31-A7 | KP 02 4X3 - 64-31-A7 | ❌ Offline |
| 39 | KP 03 3X3 - 46-F4-32 | KP 03 3X3 - 46-F4-32 | ❌ Offline |
| 43 | KP 04 4X3 - 45-6D-3A | KP 04 4X3 - 45-6D-3A | ❌ Offline |
| 48 | KP 05 3X3 - 08-E9-EE | KP 05 3X3 - 08-E9-EE | ❌ Offline |
| 56 | KP 07 3X3 - 72-08-E3 | KP 07 3X3 - 72-08-E3 | ❌ Offline |
| 60 | KP 08 3X3 - 0A-06-B0 | KP 08 3X3 - 0A-06-B0 | ❌ Offline |
| 64 | KP 09 3X3 - 77-F9-77 | KP 09 3X3 - 77-F9-77 | ❌ Offline |
| 69 | KP 10 3x3 - 33-17-50 | KP 10 3x3 - 33-17-50 | ❌ Offline |
| 74 | KP 11 3X3 - 24-45-31 | KP 11 3X3 - 24-45-31 | ❌ Offline |
| 79 | KP 12 3X3 - 10-FD-01 | KP 12 3X3 - 10-FD-01 | ❌ Offline |

---

### 🪟 CORTINAS (Controlart - Xport - Curtain Controller - 6 dispositivos)
| ID | Nome | Label | Status |
|---|---|---|---|
| 109 | Curtain Controller | Varanda Cortinas Gourmet | ❌ Offline |
| 115 | Curtain Controller | Varanda Cortina Esquerda | ❌ Offline |
| 116 | Curtain Controller | Varanda Cortina Direita | ❌ Offline |
| 119 | Curtain Controller | Living Cortina | ❌ Offline |
| 161 | Curtain Controller | Piscina Deck | ❌ Offline |
| 162 | Curtain Controller | Piscina Toldo | ❌ Offline |

---

### ❄️ AR CONDICIONADO (ControlArt - Xport - IR para AC - 3 dispositivos)
| ID | Nome | Label | Status |
|---|---|---|---|
| 110 | IR para AC | Varanda AC | ❌ Offline |
| 166 | IR para AC | Jantar AC | ❌ Offline |
| 167 | IR para AC | Living AC | ❌ Offline |

---

### 📺 CONTROLES DE TV (IR - 3 dispositivos)
| ID | Nome | Label | Status |
|---|---|---|---|
| 111 | IR para TV | Varanda TV | ❌ Offline |
| 114 | IR HTV | Varanda HTV | ❌ Offline |
| 114 | IR HTV | Varanda HTV | ❌ Offline |

---

### ⚡ MONITORES DE ENERGIA (Shelly - 1 dispositivo)
| ID | Nome | Label | Status |
|---|---|---|---|
| 94 | Shelly Plus 2 PM | Varanda Shelly Pia | ✅ Online |

---

## 📋 LISTA CONSOLIDADA POR ID

```
IDs com initialize (32 total):
15, 19, 29, 30, 34, 39, 43, 48, 56, 60, 64, 69, 74, 79, 94, 109, 110, 111, 114, 115, 116, 119, 161, 162, 166, 167, 195
```

---

## 🔍 IDs SEM INITIALIZE (43 dispositivos)

### 💡 SWITCHES GENÉRICOS (13 dispositivos)
| ID | Nome | Label | Tipo |
|---|---|---|---|
| 20 | Generic Component Switch | Arandelas | Switch |
| 31 | Generic Component Switch | Lustre | Switch |
| 35 | Generic Component Switch | Balizadores Piscina | Switch |
| 36 | Generic Component Switch | Balizadores Deck | Switch |
| 37 | Generic Component Switch | Corredor Serviço & Social | Switch |
| 40 | Generic Component Switch | Spots Móvel | Switch |
| 41 | Generic Component Switch | Spots Balcão | Switch |
| 42 | Generic Component Switch | Spots Beiral | Switch |
| 44 | Generic Component Switch | Spots Pia | Switch |
| 45 | Generic Component Switch | Led Móvel | Switch |
| 46 | Generic Component Switch | Barra Led | Switch |
| 49 | Generic Component Switch | Sanca | Switch |
| 57 | Generic Component Switch | Spots Hall | Switch |

### 🖥️ SWITCHES GENÉRICOS - CONTINUAÇÃO (8 dispositivos)
| ID | Nome | Label | Tipo |
|---|---|---|---|
| 58 | Generic Component Switch | Spots Living | Switch |
| 59 | Generic Component Switch | Spots Hall Externo | Switch |
| 61 | Generic Component Switch | Onix Hall | Switch |
| 65 | Generic Component Switch | Balizadores Hall Externo | Switch |
| 66 | Generic Component Switch | Barra LED Garagem | Switch |
| 70 | Generic Component Switch | Jardim Frontal | Switch |
| 75 | Generic Component Switch | Spots Adega | Switch |
| 76 | Generic Component Switch | Led Móvel Adega | Switch |

### 💡 SWITCHES GENÉRICOS - FINAL (2 dispositivos)
| ID | Nome | Label | Tipo |
|---|---|---|---|
| 77 | Generic Component Switch | Arandelas Corredor Social | Switch |
| 81 | Generic Component Switch | Spots | Switch |
| 82 | Generic Component Switch | Balizadores | Switch |

### ⚙️ KEYPADS SEM INITIALIZE (2 dispositivos)
| ID | Nome | Label | Status |
|---|---|---|---|
| 52 | KP 06 3X3 2D-17-A8 | KP 06 3X3 2D-17-A8 | ❌ Offline |
| 84 | KP 13 4X3 - 20-40-73 | KP 13 4X3 - 20-40-73 | ❌ Offline |

### ⚡ SHELLY ENERGY MONITORS (5 dispositivos)
| ID | Nome | Label | Status |
|---|---|---|---|
| 95 | Shelly Switch PM Component | LED Pia | ✅ Online |
| 96 | Shelly Switch PM Component | LED Móvel Pia | ✅ Online |
| 152 | Shelly Switch PM Component | Cascata | ✅ Online |
| 153 | Shelly Switch PM Component | Hidromassagem | ✅ Online |
| 157 | Shelly Switch PM Component | Telão LED | ✅ Online |

### 🪟 CORTINAS (MolSmart - 2 dispositivos)
| ID | Nome | Label | Status |
|---|---|---|---|
| 176 | MolSmart - GW3 - RF | SM Cortina | ❌ Offline |
| 192 | MolSmart - GW3 - 4 Buttons | S2 Cortina | ✅ Online |
| 193 | MolSmart - GW3 - 4 Buttons | S3 Cortina | ✅ Online |

### ❄️ AR CONDICIONADO (3 dispositivos)
| ID | Nome | Label | Status |
|---|---|---|---|
| 180 | Samsung AC IR | SM AC | ❌ Offline |
| 182 | Fujitsu AC IR | S2 AC | ✅ Online |
| 188 | Fujitsu AC IR | S3 AC | ✅ Online |

### 📺 TV / HTV (6 dispositivos)
| ID | Nome | Label | Status |
|---|---|---|---|
| 183 | TV LG IR | SM TV | ❌ Offline |
| 184 | TV LG IR | S2 TV | ❌ Offline |
| 185 | TV LG IR | S3 TV | ❌ Offline |
| 189 | HTV IR | SM HTV | ❌ Offline |
| 190 | HTV IR | S2 HTV | ❌ Offline |
| 191 | HTV IR | S3 HTV | ❌ Offline |

---

### 📋 Lista de IDs sem initialize:
```
20, 31, 35, 36, 37, 40, 41, 42, 44, 45, 46, 49, 52, 57, 58, 59, 61, 65, 66, 70, 75, 76, 77, 81, 82, 84, 95, 96, 152, 153, 157, 176, 180, 182, 183, 184, 185, 188, 189, 190, 191, 192, 193
```

---

## 🎯 OBSERVAÇÕES IMPORTANTES

1. **Keypads (ControlArt)**: Todos os 12 keypads têm `initialize` (necessário para sincronização inicial)
2. **Cortinas**: Todos os 6 controladores têm `initialize` (requerem inicialização de posição)
3. **Ar Condicionado**: Todos os 3 IR para AC têm `initialize` (requerem estado inicial)
4. **TVs/HTV**: Têm `initialize` (requerem sincronização de entrada/fonte)
5. **Audio**: Todos os Denon (AVR + HEOS) têm `initialize`
6. **Simples Switch**: Nenhum dos switches genéricos têm `initialize` (não necessário)
7. **Shelly Energy**: Apenas 1 de 5 tem `initialize` (ID 94 tem, 95-96, 152-153, 157 não têm)

