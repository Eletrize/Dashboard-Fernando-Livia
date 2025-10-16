# Dashboard Eletrize - Base Genérica

Dashboard modular para controle de automação residencial via Hubitat. Este é um template base pronto para ser customizado para qualquer cliente.

## 📋 Visão Geral

Este dashboard oferece:

- ✅ 6 ambientes genéricos configuráveis
- ✅ Controle de luzes, ar condicionado e cortinas
- ✅ 2 cenários customizáveis
- ✅ Interface PWA instalável
- ✅ Design glassmorphism responsivo
- ✅ Integração com Hubitat via Cloudflare Functions

## 🚀 Setup Rápido para Novo Cliente

### 1. Personalização Básica

#### 1.1 Informações do Projeto

Edite `package.json`:

```json
{
  "name": "dashboard-[nome-cliente]",
  "description": "Dashboard de automação para [Nome Cliente]"
}
```

Edite `wrangler.toml`:

```toml
name = "dashboard-[nome-cliente]"
PROJECT_NAME = "Dashboard [Nome Cliente]"
```

#### 1.2 Branding

- **Logo**: Substitua `images/icons/Eletrize.svg` pelo logo do cliente
- **Ícone PWA**: Substitua os arquivos em `images/pwa/` com os ícones do cliente
- **Título**: Edite `index.html` e atualize todas as ocorrências de "Dashboard Eletrize"

#### 1.3 Fotos dos Ambientes

Edite o objeto `ROOM_PHOTOS` em `index.html` (linha ~370):

```javascript
const ROOM_PHOTOS = {
  ambiente1: "images/fotos/ambiente1.jpg",
  ambiente2: "images/fotos/ambiente2.jpg",
  ambiente3: "images/fotos/ambiente3.jpg",
  ambiente4: "images/fotos/ambiente4.jpg",
  ambiente5: "images/fotos/ambiente5.jpg",
  ambiente6: "images/fotos/ambiente6.jpg",
};
```

### 2. Configuração dos Ambientes

#### 2.1 Nomes dos Ambientes

Edite o array `rooms` em `index.html` (linha ~440):

```javascript
const rooms = [
  { name: "Sala de Estar", route: "ambiente1" },
  { name: "Quarto Principal", route: "ambiente2" },
  { name: "Escritório", route: "ambiente3" },
  { name: "Cozinha", route: "ambiente4" },
  { name: "Sala de Jantar", route: "ambiente5" },
  { name: "Garagem", route: "ambiente6" },
];
```

#### 2.2 Dispositivos de Cada Ambiente

Para cada ambiente, edite as páginas correspondentes em `index.html`:

**Exemplo - Ambiente 1 (começando na linha ~1180):**

```html
<!-- Luzes -->
<div
  class="control-card"
  data-state="off"
  data-device-id="7"
  onclick="toggleRoomControl(this)"
>
  <div class="control-label">Lustre Principal</div>
</div>
<div
  class="control-card"
  data-state="off"
  data-device-id="8"
  onclick="toggleRoomControl(this)"
>
  <div class="control-label">Spots Embutidos</div>
</div>

<!-- Cortina -->
<article
  class="curtain-tile"
  data-device-id="42"
  data-environment="Sala de Estar"
>
  <h3 class="curtain-tile__title">Cortina Principal</h3>
</article>
```

**IDs de Dispositivos**: Substitua `data-device-id="X"` pelos IDs reais do Hubitat.

#### 2.3 Array de Cortinas

Edite `CURTAIN_SECTIONS` em `index.html` (linha ~378):

```javascript
const CURTAIN_SECTIONS = [
  {
    key: "ambiente1",
    name: "Sala de Estar",
    curtains: [{ deviceId: "42", title: "Cortina Principal" }],
  },
  // ... repita para cada ambiente que tenha cortinas
];
```

### 3. Configuração dos Cenários

Edite `scenes.js` para personalizar os dois cenários:

#### Cenário 1 (linha ~163):

```javascript
function executeCenario1() {
  console.log("🌅 Iniciando cenário: Bom Dia");

  const salaLights = ["7", "8"]; // IDs das luzes da sala
  const quartoLights = ["11", "12"]; // IDs das luzes do quarto
  const cortinasAbrir = ["42", "43"]; // IDs das cortinas para abrir

  // ... customize a lógica
}
```

#### Cenário 2 (linha ~217):

```javascript
function executeCenario2() {
  console.log("🌙 Iniciando cenário: Boa Noite");

  const lightsToKeepOn = ["35", "49"]; // Luzes que ficam acesas

  // ... customize a lógica
}
```

**Atualize os rótulos** em `index.html` (linha ~620):

```html
<div class="control-label">Bom Dia</div>
<!-- ... -->
<div class="control-label">Boa Noite</div>
```

### 4. Lista Completa de IDs

Atualize `ALL_LIGHT_IDS` em `script.js` (linha ~2) com TODOS os IDs de luzes:

```javascript
const ALL_LIGHT_IDS = [
  "7",
  "8",
  "9", // Sala de Estar
  "11",
  "12",
  "13", // Quarto Principal
  "35",
  "36",
  "37", // Cozinha
  // ... adicione todos os IDs
];
```

### 5. Configuração do Hubitat

#### 5.1 Obter Credenciais

1. Acesse seu Hubitat
2. Vá em **Apps** → **Maker API**
3. Copie a URL completa que contém:
   - UUID do hub
   - ID do app
   - Access token

#### 5.2 Configurar Secrets no Cloudflare

```bash
# Login no Cloudflare
wrangler login

# Configurar secrets (cole os valores quando solicitado)
wrangler secret put HUBITAT_ACCESS_TOKEN
wrangler secret put HUBITAT_BASE_URL
wrangler secret put HUBITAT_FULL_URL
wrangler secret put WEBHOOK_SHARED_SECRET
```

Veja `VARIAVEIS_HUBITAT.md` para mais detalhes.

### 6. Deploy

#### Desenvolvimento Local

```bash
npm install
npm run dev
```

#### Deploy para Produção

```bash
wrangler pages deploy . --project-name dashboard-[nome-cliente]
```

Veja `DEPLOY.md` para instruções completas.

## 📁 Estrutura de Arquivos

```
/
├── index.html              # Página principal (edite aqui os ambientes)
├── script.js              # Lógica de controle (edite IDs de dispositivos)
├── scenes.js              # Cenários (customize aqui)
├── styles.css             # Estilos (normalmente não precisa editar)
├── package.json           # Metadados do projeto
├── wrangler.toml          # Config Cloudflare
├── manifest.json          # Config PWA
├── functions/             # Cloudflare Functions (proxy Hubitat)
├── images/
│   ├── icons/            # Ícones da UI
│   ├── pwa/              # Ícones do app (substitua)
│   └── Images/           # Fotos dos ambientes (adicione aqui)
└── fonts/                # Fontes Raleway
```

## 🎨 Customização Avançada

### Cores e Tema

Edite `styles.css` para alterar:

- Cores de fundo (variáveis CSS no `:root`)
- Opacidades do glassmorphism
- Animações e transições

### Adicionar Mais Ambientes

1. Duplique uma página de ambiente em `index.html`
2. Renomeie as classes para `ambiente7-page`, `ambiente7-controls-wrapper`, etc.
3. Adicione ao array `rooms`
4. Adicione CSS para `.ambiente7-page` em `styles.css` (copie de outro ambiente)

### Remover Ambientes

1. Remova a entrada do array `rooms`
2. Remova a página correspondente de `index.html`
3. Opcional: remova CSS específico

### Controles Especiais

Para adicionar tipos diferentes de controles (ventiladores, TVs, etc.):

1. Adicione os ícones SVG em `images/icons/`
2. Crie controle similar aos existentes
3. Adicione handlers no `script.js`

## 🔧 Troubleshooting

### Dispositivos não respondem

- Verifique se os IDs estão corretos no Hubitat
- Confirme que as secrets do Cloudflare estão configuradas
- Veja os logs: `wrangler tail`

### Cortinas invertidas

Alguns dispositivos têm comandos invertidos. Edite `script.js` (linha ~1122):

```javascript
if (deviceId === "40") {
  // ID da cortina invertida
  map = { open: 3, stop: 2, close: 1 };
}
```

### Caracteres especiais não aparecem

O dashboard já tem correção automática para caracteres com encoding incorreto.
Edite `script.js` (linha ~717) se necessário adicionar mais correções.

## 📱 PWA - App Instalável

Para ativar a instalação como app:

1. Edite `manifest.json` com nome e descrição do cliente
2. Substitua os ícones em `images/pwa/`
3. O service worker (`service-worker.js`) já está configurado

## 🔐 Segurança

- ✅ Todas as credenciais ficam em secrets do Cloudflare
- ✅ Proxy server-side para ocultar tokens do cliente
- ✅ CORS configurado nas functions
- ✅ Nenhuma credencial exposta no código frontend

## 📞 Suporte

Para questões técnicas ou customizações especiais, consulte:

- `DEPLOY.md` - Instruções de deploy
- `VARIAVEIS_HUBITAT.md` - Setup do Hubitat
- `app-info-menu-snippets.md` - Componentes de UI

---

**Desenvolvido por Eletrize** 🔌
