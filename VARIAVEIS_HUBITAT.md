# Variáveis do Hubitat - Configuração Genérica

## URL de exemplo:

https://cloud.hubitat.com/api/[SEU-UUID]/apps/[APP-ID]/devices?access_token=[SEU-TOKEN]

## Variáveis a serem extraídas:

### HUBITAT_ACCESS_TOKEN

[Seu token de acesso do Hubitat Maker API]

### HUBITAT_BASE_URL

https://cloud.hubitat.com/api/[SEU-UUID]/apps/[APP-ID]/devices

### HUBITAT_FULL_URL

https://cloud.hubitat.com/api/[SEU-UUID]

### WEBHOOK_SHARED_SECRET

(você deve definir uma chave secreta personalizada, ex: seu-cliente-2024-secret)

## Comandos para configurar no Cloudflare Workers:

```bash
wrangler secret put HUBITAT_ACCESS_TOKEN
# Digite: [seu-token-de-acesso]

wrangler secret put HUBITAT_BASE_URL
# Digite: https://cloud.hubitat.com/api/[seu-uuid]/apps/[app-id]/devices

wrangler secret put HUBITAT_FULL_URL
# Digite: https://cloud.hubitat.com/api/[seu-uuid]

wrangler secret put WEBHOOK_SHARED_SECRET
# Digite: sua-chave-secreta-personalizada
```
