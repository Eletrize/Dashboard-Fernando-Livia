#!/bin/bash
# Script de setup para Cloudflare Workers

echo "🚀 Configurando Dashboard Vila Estampa para Cloudflare Workers"
echo ""

# Verificar se wrangler está instalado
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI não encontrado. Instalando..."
    npm install -g wrangler
else
    echo "✅ Wrangler CLI encontrado"
fi

# Login no Cloudflare
echo ""
echo "📡 Fazendo login no Cloudflare..."
wrangler login

# Configurar variáveis secretas
echo ""
echo "🔐 Configurando variáveis de ambiente secretas..."
echo "Você será solicitado a inserir cada variável uma por uma:"

echo ""
echo "1️⃣ HUBITAT_ACCESS_TOKEN (token de acesso do Hubitat):"
wrangler secret put HUBITAT_ACCESS_TOKEN

echo ""
echo "2️⃣ HUBITAT_BASE_URL (ex: http://192.168.1.100/apps/api/123/devices):"
wrangler secret put HUBITAT_BASE_URL

echo ""
echo "3️⃣ WEBHOOK_SHARED_SECRET (chave secreta para webhooks):"
wrangler secret put WEBHOOK_SHARED_SECRET

echo ""
echo "✅ Configuração concluída!"
echo ""
echo "🚀 Para fazer deploy:"
echo "   npm run deploy"
echo ""
echo "🔧 Para testar localmente:"
echo "   npm run dev"