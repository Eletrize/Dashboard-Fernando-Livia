# Hubitat Cloud API - Referência de Comandos

## Base URL
```
https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/15
```

## Access Token
```
access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

---

## Endpoints Disponíveis

### 1. Get Device Info
Obtém informações completas de um dispositivo.

**URL:**
```
GET /devices/[Device ID]?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

**Exemplo:**
```
https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/15/devices/111?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

---

### 2. Get Device Event History
Obtém histórico de eventos de um dispositivo.

**URL:**
```
GET /devices/[Device ID]/events?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

**Exemplo:**
```
https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/15/devices/111/events?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

---

### 3. Get Device Commands
Lista todos os comandos disponíveis para um dispositivo.

**URL:**
```
GET /devices/[Device ID]/commands?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

**Exemplo:**
```
https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/15/devices/111/commands?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

---

### 4. Get Device Capabilities
Lista todas as capabilities de um dispositivo.

**URL:**
```
GET /devices/[Device ID]/capabilities?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

**Exemplo:**
```
https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/15/devices/111/capabilities?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

---

### 5. Get Device Attribute
Obtém o valor de um atributo específico.

**URL:**
```
GET /devices/[Device ID]/attribute/[Attribute]?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

**Exemplo:**
```
https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/15/devices/15/attribute/volume?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

---

### 6. Send Device Command ⭐ **IMPORTANTE**
Envia um comando para um dispositivo.

**URL:**
```
GET /devices/[Device ID]/[Command]/[Secondary value]?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

**Estrutura:**
- `[Device ID]` - ID do dispositivo (ex: 111)
- `[Command]` - Nome do comando (ex: pushButton)
- `[Secondary value]` - Valor secundário/parâmetro (ex: 25) - **OPCIONAL**

**Exemplos:**

#### Comando sem parâmetro:
```
https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/15/devices/111/on?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

#### Comando com parâmetro (pushButton):
```
https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/15/devices/111/pushButton/25?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

#### Comando setVolume:
```
https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/15/devices/15/setVolume/50?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

---

### 7. Send POST URL
Envia um POST para uma URL codificada.

**URL:**
```
GET /postURL/[URL]?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

---

### 8. Set Hub Variable
Define o valor de uma variável do hub.

**URL:**
```
GET /hubvariables/[Variable Name]/[Value]?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

---

### 9. Get Modes List
Lista todos os modos disponíveis.

**URL:**
```
GET /modes?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

**Exemplo:**
```
https://cloud.hubitat.com/api/e45cb756-9028-44c2-8a00-e6fb3651856c/apps/15/modes?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

---

### 10. Set Mode
Define um modo específico.

**URL:**
```
GET /modes/[Mode ID]?access_token=1d9b367b-e4cd-4042-b726-718b759a82ef
```

---

## 📺 Comandos do Controle de TV (Device 111)

### Formato Correto para Device 111
O device 111 usa o comando `pushButton` com número do botão como parâmetro:

**Template:**
```
/devices/111/pushButton/[Número do Botão]?access_token=...
```

### Mapeamento de Botões TV:

| Botão | Número | URL Completa |
|-------|--------|--------------|
| ON | 25 | `/devices/111/pushButton/25?access_token=...` |
| OFF | 24 | `/devices/111/pushButton/24?access_token=...` |
| UP | 7 | `/devices/111/pushButton/7?access_token=...` |
| DOWN | 4 | `/devices/111/pushButton/4?access_token=...` |
| LEFT | 5 | `/devices/111/pushButton/5?access_token=...` |
| RIGHT | 6 | `/devices/111/pushButton/6?access_token=...` |
| OK | 3 | `/devices/111/pushButton/3?access_token=...` |
| BACK | 29 | `/devices/111/pushButton/29?access_token=...` |
| MENU | 8 | `/devices/111/pushButton/8?access_token=...` |
| HOME | 9 | `/devices/111/pushButton/9?access_token=...` |
| MUTE | 13 | `/devices/111/pushButton/13?access_token=...` |
| CH+ | 1 | `/devices/111/pushButton/1?access_token=...` |
| CH- | 0 | `/devices/111/pushButton/0?access_token=...` |
| Número 1 | 15 | `/devices/111/pushButton/15?access_token=...` |
| Número 2 | 16 | `/devices/111/pushButton/16?access_token=...` |
| Número 3 | 17 | `/devices/111/pushButton/17?access_token=...` |
| Número 4 | 18 | `/devices/111/pushButton/18?access_token=...` |
| Número 5 | 19 | `/devices/111/pushButton/19?access_token=...` |
| Número 6 | 20 | `/devices/111/pushButton/20?access_token=...` |
| Número 7 | 21 | `/devices/111/pushButton/21?access_token=...` |
| Número 8 | 22 | `/devices/111/pushButton/22?access_token=...` |
| Número 9 | 23 | `/devices/111/pushButton/23?access_token=...` |
| Número 0 | 14 | `/devices/111/pushButton/14?access_token=...` |

---

## 🎵 Comandos do Denon (Device 15)

### Volume:
```
/devices/15/setVolume/[0-100]?access_token=...
```

### Outros comandos:
- `/devices/15/mute?access_token=...`
- `/devices/15/unmute?access_token=...`
- `/devices/15/play?access_token=...`
- `/devices/15/pause?access_token=...`
- `/devices/15/nextTrack?access_token=...`
- `/devices/15/previousTrack?access_token=...`

---

## Notas Importantes

1. **Método HTTP:** Todos os comandos usam GET (não POST)
2. **URL Encoding:** Espaços e caracteres especiais devem ser codificados
3. **Access Token:** Sempre incluir no query string
4. **pushButton:** Comando usado para dispositivos de controle remoto virtual
5. **Secondary Value:** Parâmetro adicional usado em comandos como pushButton e setVolume
