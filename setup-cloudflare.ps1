# Script de setup para Cloudflare Workers (PowerShell)

Write-Host "🚀 Configurando Dashboard Vila Estampa para Cloudflare Workers" -ForegroundColor Green
Write-Host ""

# Verificar se wrangler está instalado
$wranglerInstalled = Get-Command wrangler -ErrorAction SilentlyContinue
if (-not $wranglerInstalled) {
    Write-Host "❌ Wrangler CLI não encontrado. Instalando..." -ForegroundColor Red
    npm install -g wrangler
} else {
    Write-Host "✅ Wrangler CLI encontrado" -ForegroundColor Green
}

# Login no Cloudflare
Write-Host ""
Write-Host "📡 Fazendo login no Cloudflare..." -ForegroundColor Cyan
wrangler login

# Configurar variáveis secretas
Write-Host ""
Write-Host "🔐 Configurando variáveis de ambiente secretas..." -ForegroundColor Yellow
Write-Host "Você será solicitado a inserir cada variável uma por uma:" -ForegroundColor Yellow

Write-Host ""
Write-Host "1️⃣ HUBITAT_ACCESS_TOKEN (token de acesso do Hubitat):" -ForegroundColor White
wrangler secret put HUBITAT_ACCESS_TOKEN

Write-Host ""
Write-Host "2️⃣ HUBITAT_BASE_URL (ex: http://192.168.1.100/apps/api/123/devices):" -ForegroundColor White
wrangler secret put HUBITAT_BASE_URL

Write-Host ""
Write-Host "3️⃣ WEBHOOK_SHARED_SECRET (chave secreta para webhooks):" -ForegroundColor White
wrangler secret put WEBHOOK_SHARED_SECRET

Write-Host ""
Write-Host "✅ Configuração concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Para fazer deploy:" -ForegroundColor Cyan
Write-Host "   npm run deploy" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Para testar localmente:" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor White