# Dashboard Eletrize - Deploy no Cloudflare

## Pré-requisitos

- Conta no Cloudflare
- Wrangler CLI instalado: `npm install -g wrangler`
- Git configurado

## Configuração das Variáveis de Ambiente

### 1. Fazer login no Cloudflare

```bash
wrangler login
```

### 2. Configurar as variáveis secretas (uma por vez)

```bash
wrangler secret put HUBITAT_ACCESS_TOKEN
wrangler secret put HUBITAT_BASE_URL
wrangler secret put WEBHOOK_SHARED_SECRET
```

### Exemplos das variáveis:

- **HUBITAT_ACCESS_TOKEN**: Token de acesso do Hubitat (ex: `abc123-def456-ghi789`)
- **HUBITAT_BASE_URL**: URL base para comandos (ex: `http://192.168.1.100/apps/api/123/devices`)
- **WEBHOOK_SHARED_SECRET**: Chave secreta para webhooks (ex: `minha-chave-super-secreta`)

## Deploy

### Método 1: Cloudflare Pages (Recomendado)

```bash
# Instalar dependências
npm install

# Deploy para produção
wrangler pages deploy . --project-name dashboard-eletrize

# Para desenvolvimento local
npm run dev
```

### Método 2: Workers Sites

```bash
wrangler deploy
```

## Estrutura do Projeto

```
/
├── index.html          # Página principal
├── styles.css          # Estilos CSS
├── script.js           # JavaScript principal
├── functions/          # Cloudflare Functions
│   ├── hubitat-proxy.js
│   ├── polling.js
│   ├── webhook.js
│   └── test.js
├── images/            # Assets estáticos
├── fonts/             # Fontes
├── wrangler.toml      # Configuração Cloudflare
└── package.json       # Dependências NPM
```

## URLs das Functions

Após o deploy, as functions estarão disponíveis em:

- `/hubitat-proxy` - Proxy para comandos Hubitat
- `/polling` - Polling de status dos dispositivos
- `/webhook` - Recebimento de webhooks
- `/test` - Testes da API

## Verificação

1. Acesse o dashboard no domínio configurado
2. Teste a conectividade com Hubitat
3. Verifique os logs: `wrangler tail`

## Troubleshooting

- **Erro 500**: Verifique se todas as variáveis estão configuradas
- **CORS**: As functions já incluem headers CORS
- **Timeout**: Ajuste os timeouts no Hubitat se necessário
