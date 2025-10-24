# Cache Inteligente - Dashboard Eletrize

## O que é o Cache Inteligente?

O Cache Inteligente é um sistema avançado de cacheamento implementado no Dashboard Eletrize que resolve o problema de carregamento lento em dispositivos limitados (celulares antigos, conexões lentas).

### Funcionalidades

- **3 Estratégias de Cache**:

  - 🔴 **Crítico (Cache-First)**: Ícones, imagens, CSS - carregam instantaneamente
  - 🟡 **Dinâmico (Network-First)**: HTML, dados dinâmicos - sempre atualizados
  - 🟢 **Volátil (Network-Only)**: APIs, dados em tempo real - nunca cacheados

- **Limpeza Automática**: Remove entradas antigas automaticamente
- **TTL Configurável**: Tempo de vida personalizado por tipo de conteúdo
- **Monitoramento Online/Offline**: Adapta comportamento baseado na conectividade
- **Debug Integrado**: Funções de diagnóstico disponíveis no console

## Como Usar

### Diagnóstico no Carregamento

Ao abrir o dashboard, o sistema mostra automaticamente estatísticas do cache no console:

```
📊 Diagnóstico de Cache Inteligente:
  📦 Status: ativo
  🌐 Online: ✅
  📁 Caches: 3
  📄 Entradas: 24
  💾 Tamanho: 2.1 MB
✅ Cache inteligente funcionando - carregamento será mais rápido na próxima visita!
```

### Debug Manual

Abra o console do navegador (F12) e use estas funções:

```javascript
// Ver estatísticas detalhadas do cache
debugCache();

// Limpar todo o cache
clearAppCache();
```

### Estratégias de Cache

#### 🔴 Crítico (Cache-First)

- **Quando usar**: Recursos essenciais que não mudam frequentemente
- **Exemplos**: Ícones, imagens estáticas, CSS, JavaScript
- **Comportamento**: Carrega do cache primeiro, só busca na rede se não existir
- **Benefício**: Carregamento instantâneo em visitas subsequentes

#### 🟡 Dinâmico (Network-First)

- **Quando usar**: Conteúdo que pode mudar mas precisa estar atualizado
- **Exemplos**: Páginas HTML, configurações
- **Comportamento**: Tenta carregar da rede primeiro, usa cache como fallback
- **Benefício**: Sempre mostra conteúdo atualizado

#### 🟢 Volátil (Network-Only)

- **Quando usar**: Dados em tempo real que nunca devem ser cacheados
- **Exemplos**: Estados de dispositivos, APIs de polling
- **Comportamento**: Sempre busca na rede, nunca usa cache
- **Benefício**: Dados sempre frescos

## Benefícios

1. **Carregamento Mais Rápido**: Recursos críticos carregam instantaneamente
2. **Menos Consumo de Dados**: Reduz downloads desnecessários
3. **Melhor Experiência Offline**: Funciona mesmo sem internet
4. **Adaptável**: Comportamento inteligente baseado na conectividade
5. **Debug Fácil**: Ferramentas integradas para monitoramento

## Configuração Técnica

O sistema é configurado automaticamente, mas pode ser personalizado editando `CACHE_CONFIG` no `service-worker.js`:

```javascript
const CACHE_CONFIG = {
  critical: [
    /* recursos críticos */
  ],
  dynamic: [
    /* recursos dinâmicos */
  ],
  volatile: [
    /* endpoints voláteis */
  ],
};
```

## Solução de Problemas

### Cache não está funcionando

1. Verifique se o Service Worker está registrado
2. Use `debugCache()` para ver estatísticas
3. Limpe o cache com `clearAppCache()` e recarregue

### Carregamento lento na primeira visita

- Normal: O cache está sendo preenchido
- Solução: Aguardar o preenchimento ou verificar conectividade

### Dados desatualizados

- Verifique se o recurso está na categoria correta
- Use `clearAppCache()` para forçar atualização
