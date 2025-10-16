# Script automatizado com as variáveis do Hubitat pré-configuradas

Write-Host "🚀 Configurando Dashboard Vila Estampa com variáveis extraídas" -ForegroundColor Green
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

# Variáveis extraídas da URL fornecida
$HUBITAT_ACCESS_TOKEN = "138422cd-a48d-41dc-8beb-cb0327e65c24"
$HUBITAT_BASE_URL = "https://cloud.hubitat.com/api/ef4b8bb9-5b3f-43bc-aa4b-7af0c873ace3/apps/101/devices"
$HUBITAT_FULL_URL = "https://cloud.hubitat.com/api/ef4b8bb9-5b3f-43bc-aa4b-7af0c873ace3"

Write-Host ""
Write-Host "🔐 Configurando variáveis automaticamente..." -ForegroundColor Yellow

# HUBITAT_ACCESS_TOKEN
Write-Host ""
Write-Host "1️⃣ Configurando HUBITAT_ACCESS_TOKEN..." -ForegroundColor White
$HUBITAT_ACCESS_TOKEN | wrangler secret put HUBITAT_ACCESS_TOKEN

# HUBITAT_BASE_URL  
Write-Host ""
Write-Host "2️⃣ Configurando HUBITAT_BASE_URL..." -ForegroundColor White
$HUBITAT_BASE_URL | wrangler secret put HUBITAT_BASE_URL

# HUBITAT_FULL_URL
Write-Host ""
Write-Host "3️⃣ Configurando HUBITAT_FULL_URL..." -ForegroundColor White
$HUBITAT_FULL_URL | wrangler secret put HUBITAT_FULL_URL

# WEBHOOK_SHARED_SECRET (manual - usuário define)
Write-Host ""
Write-Host "4️⃣ Configurando WEBHOOK_SHARED_SECRET (defina sua chave secreta):" -ForegroundColor White
Write-Host "Sugestão: vila-estampa-2024-secret" -ForegroundColor Gray
wrangler secret put WEBHOOK_SHARED_SECRET

Write-Host ""
Write-Host "✅ Configuração concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Para fazer deploy:" -ForegroundColor Cyan
Write-Host "   wrangler pages deploy . --project-name dashboard-vila-estampa" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Para testar localmente:" -ForegroundColor Cyan
Write-Host "   wrangler pages dev ." -ForegroundColor White

Write-Host ""
Write-Host "📋 Variáveis configuradas:" -ForegroundColor Yellow
Write-Host "   HUBITAT_ACCESS_TOKEN: ✅" -ForegroundColor Green  
Write-Host "   HUBITAT_BASE_URL: ✅" -ForegroundColor Green
Write-Host "   HUBITAT_FULL_URL: ✅" -ForegroundColor Green
Write-Host "   WEBHOOK_SHARED_SECRET: ✅" -ForegroundColor Green