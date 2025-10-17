# 🔧 Configuração das Variáveis do Cloudflare Pages

Este documento explica como configurar as variáveis de ambiente necessárias para o funcionamento do Dashboard.

## 📋 Variáveis Necessárias

### Opção 1: Usar URL Completa (Recomendado)

Esta opção é mais simples e garante que você está usando o endpoint correto do Hubitat.

#### **HUBITAT_FULL_URL**
```
https://cloud.hubitat.com/api/88fdad30-2497-4de1-b131-12fc4903ae67/apps/214/devices/all?access_token=0aa81379-277a-42cb-95be-a4fb67e353f0
```

#### **HUBITAT_BASE_URL** (para comandos)
```
https://cloud.hubitat.com/api/88fdad30-2497-4de1-b131-12fc4903ae67/apps/214/devices
```

#### **HUBITAT_ACCESS_TOKEN**
```
0aa81379-277a-42cb-95be-a4fb67e353f0
```

---

### Opção 2: Usar Base URL + Token

Se preferir separar a URL base do token:

#### **HUBITAT_BASE_URL**
```
https://cloud.hubitat.com/api/88fdad30-2497-4de1-b131-12fc4903ae67/apps/214/devices
```

#### **HUBITAT_ACCESS_TOKEN**
```
0aa81379-277a-42cb-95be-a4fb67e353f0
```

---

## 🌐 Como Configurar no Cloudflare Pages

### Via Dashboard Web

1. Acesse: https://dash.cloudflare.com
2. Vá em **Pages** → Selecione seu projeto
3. Clique em **Settings** → **Environment variables**
4. Clique em **Add variable**
5. Adicione cada variável:
   - Nome: `HUBITAT_FULL_URL`
   - Valor: (cole a URL completa)
   - Environment: **Production** e **Preview**
6. Repita para as outras variáveis
7. Após adicionar todas, faça um **Redeploy** do projeto

### Via Wrangler CLI

Execute no terminal (PowerShell):

```powershell
# Opção 1: URL Completa
wrangler pages secret put HUBITAT_FULL_URL
# Cole: https://cloud.hubitat.com/api/88fdad30-2497-4de1-b131-12fc4903ae67/apps/214/devices/all?access_token=0aa81379-277a-42cb-95be-a4fb67e353f0

# Configurar Base URL (necessário para comandos)
wrangler pages secret put HUBITAT_BASE_URL
# Cole: https://cloud.hubitat.com/api/88fdad30-2497-4de1-b131-12fc4903ae67/apps/214/devices

# Configurar Token
wrangler pages secret put HUBITAT_ACCESS_TOKEN
# Cole: 0aa81379-277a-42cb-95be-a4fb67e353f0
```

---

## ✅ Como Funciona

### Função de Polling (`/functions/polling`)
- **Prioridade 1**: Usa `HUBITAT_FULL_URL` se existir
- **Prioridade 2**: Usa `HUBITAT_BASE_URL/devices/all?access_token=HUBITAT_ACCESS_TOKEN`
- **Resultado**: Retorna JSON completo com todos os atributos dos dispositivos (incluindo volume do Denon)

### Função de Comandos (`/functions/hubitat-proxy`)
- Usa `HUBITAT_BASE_URL/devices/{deviceId}/{command}/{value}?access_token=HUBITAT_ACCESS_TOKEN`
- **Exemplo**: Para definir volume 50 no Denon (ID 322):
  - `.../devices/322/setVolume/50?access_token=...`

---

## 🔍 Testando a Configuração

### Testar Polling
Acesse no navegador:
```
https://seu-site.pages.dev/functions/polling
```

Deve retornar JSON com:
```json
{
  "success": true,
  "source": "hubitat",
  "deviceCount": 2,
  "data": [
    {
      "id": "322",
      "name": "Denon AVR",
      "attributes": {
        "switch": "on",
        "volume": "46",
        "mute": "unmuted",
        ...
      }
    },
    ...
  ]
}
```

### Testar Comando
Acesse no navegador:
```
https://seu-site.pages.dev/functions/hubitat-proxy?device=322&command=setVolume&value=50
```

---

## 📝 Notas Importantes

1. **Segurança**: As variáveis de ambiente são seguras e não ficam expostas no código cliente
2. **Cache**: O polling desabilita cache (`cacheTtl: 0`) para sempre pegar dados atualizados
3. **CORS**: As functions já incluem headers CORS para permitir acesso do frontend
4. **Logs**: Os comandos são logados no Cloudflare Dashboard → Functions → Logs

---

## 🆘 Troubleshooting

### "Variável não configurada"
- Verifique se digitou o nome EXATAMENTE como está aqui (maiúsculas/minúsculas)
- Faça redeploy após adicionar variáveis

### "Volume não atualiza"
- Verifique se `HUBITAT_FULL_URL` está configurada
- Abra o Console (F12) e veja os logs com 🔊
- Teste a URL diretamente no navegador

### "Comando não funciona"
- Verifique se `HUBITAT_BASE_URL` termina com `/devices`
- Teste a URL do comando diretamente no navegador
