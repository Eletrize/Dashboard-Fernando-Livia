/**
 * LAZY LOADING SYSTEM
 * Sistema avançado de carregamento preguiçoso para otimizar performance
 * 
 * Características:
 * - Lazy load de imagens com Intersection Observer
 * - Skeleton loaders (placeholders bonitos)
 * - Componentes carregados sob demanda
 * - Monitoramento de conexão
 * - Fallbacks e tratamento de erros
 */

class LazyLoadingSystem {
  constructor() {
    this.observers = new Map();
    this.loadedImages = new Set();
    this.loadedComponents = new Map();
    this.isOnline = navigator.onLine;
    this.componentCache = new Map();
    
    // Configurações
    this.config = {
      imageThreshold: 0.1, // 10% de visibilidade para começar a carregar
      rootMargin: '50px', // Começar a carregar 50px antes de ficar visível
      maxConcurrentLoads: 3, // Máximo de imagens carregando simultaneamente
      retryAttempts: 3,
      retryDelay: 1000, // ms
      enableSkeletonLoader: true,
      skeletonLoaderDuration: 300, // ms
      prefetchCritical: true,
      enableNetworkOptimization: true,
    };

    this.loadingQueue = [];
    this.activeLoads = 0;

    // Event listeners
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    document.addEventListener('DOMContentLoaded', () => this.initialize());

    console.log('🚀 LazyLoadingSystem iniciado');
  }

  /**
   * Inicializar sistema de lazy loading
   */
  initialize() {
    console.log('📦 Inicializando Lazy Loading...');

    // 1. Carregar imagens críticas
    this.loadCriticalImages();

    // 2. Setup Intersection Observer para imagens
    this.setupImageObserver();

    // 3. Setup Intersection Observer para componentes
    this.setupComponentObserver();

    // 4. Pré-carregar recursos críticos em background
    if (this.config.prefetchCritical) {
      this.prefetchCriticalResources();
    }

    console.log('✅ Lazy Loading inicializado');
  }

  /**
   * Carregar imagens criticamente importantes (above the fold)
   */
  loadCriticalImages() {
    const criticalSelectors = [
      'nav img', // Ícones de navegação
      '.room-card img:not([data-lazy])', // Primeira página
      '.hero img',
      '[data-critical-image]'
    ];

    criticalSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(img => {
        this.loadImage(img, true); // Force load
      });
    });

    console.log('🎯 Imagens críticas carregadas');
  }

  /**
   * Setup Intersection Observer para imagens
   */
  setupImageObserver() {
    const options = {
      root: null,
      rootMargin: `${this.config.rootMargin}px`,
      threshold: this.config.imageThreshold
    };

    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          
          // Se está em view e tem data-src, carregar
          if (img.dataset.src) {
            this.loadImageLazy(img);
            imageObserver.unobserve(img);
          }
        }
      });
    }, options);

    // Observar todas as imagens com data-src
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });

    this.observers.set('images', imageObserver);
    console.log('👁️ Intersection Observer para imagens configurado');
  }

  /**
   * Setup Intersection Observer para componentes
   */
  setupComponentObserver() {
    const options = {
      root: null,
      rootMargin: '100px',
      threshold: 0.1
    };

    const componentObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const component = entry.target;
          
          if (component.dataset.lazyComponent && !component.dataset.loaded) {
            this.loadComponent(component);
            componentObserver.unobserve(component);
          }
        }
      });
    }, options);

    // Observar todos os componentes lazy
    document.querySelectorAll('[data-lazy-component]').forEach(comp => {
      componentObserver.observe(comp);
    });

    this.observers.set('components', componentObserver);
    console.log('👁️ Intersection Observer para componentes configurado');
  }

  /**
   * Carregar imagem com suporte a skeleton loader
   */
  async loadImageLazy(img, forceCritical = false) {
    if (this.loadedImages.has(img)) return;

    const src = img.dataset.src;
    const alt = img.alt || 'Imagem';
    
    if (!src) return;

    // Criar skeleton loader se habilitado
    if (this.config.enableSkeletonLoader && !forceCritical) {
      this.createSkeletonLoader(img);
    }

    // Adicionar à fila de carregamento
    this.queueImageLoad(img, src, alt);
  }

  /**
   * Fila de carregamento com limite de concorrência
   */
  async queueImageLoad(img, src, alt) {
    return new Promise((resolve) => {
      this.loadingQueue.push({ img, src, alt, resolve });
      this.processLoadingQueue();
    });
  }

  /**
   * Processar fila de carregamento
   */
  async processLoadingQueue() {
    if (this.activeLoads >= this.config.maxConcurrentLoads || this.loadingQueue.length === 0) {
      return;
    }

    this.activeLoads++;
    const { img, src, alt, resolve } = this.loadingQueue.shift();

    try {
      await this.loadImage(img, false, src, alt);
      resolve();
    } catch (error) {
      console.error(`❌ Erro ao carregar imagem ${src}:`, error);
      resolve();
    } finally {
      this.activeLoads--;
      this.processLoadingQueue(); // Continuar processando fila
    }
  }

  /**
   * Carregar imagem com retry automático
   */
  async loadImage(img, isCritical = false, src = null, alt = null) {
    src = src || img.dataset.src || img.src;
    
    if (this.loadedImages.has(img)) return true;

    let lastError;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        await this.loadImageWithTimeout(src, 5000);
        
        // Sucesso - aplicar imagem
        img.src = src;
        img.classList.add('lazy-loaded');
        img.classList.remove('lazy-loading');
        
        // Remover skeleton loader se houver
        const skeleton = img.previousElementSibling;
        if (skeleton?.classList.contains('skeleton-loader')) {
          skeleton.remove();
        }

        this.loadedImages.add(img);

        console.log(`✅ Imagem carregada: ${src.substring(src.lastIndexOf('/') + 1)}`);
        return true;

      } catch (error) {
        lastError = error;
        
        if (attempt < this.config.retryAttempts - 1) {
          // Retry com delay exponencial
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Falha após todos os retries
    console.warn(`⚠️ Falha ao carregar imagem após ${this.config.retryAttempts} tentativas: ${src}`);
    img.classList.add('lazy-error');
    
    return false;
  }

  /**
   * Carregar imagem com timeout
   */
  loadImageWithTimeout(src, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout ao carregar imagem: ${src}`));
      }, timeout);

      img.onload = () => {
        clearTimeout(timeoutId);
        resolve();
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error(`Erro ao carregar imagem: ${src}`));
      };

      img.src = src;
    });
  }

  /**
   * Criar skeleton loader (placeholder animado)
   */
  createSkeletonLoader(img) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-loader';
    
    const { width, height } = img.getBoundingClientRect();
    skeleton.style.width = width ? `${width}px` : '100%';
    skeleton.style.height = height ? `${height}px` : '200px';
    
    // Inserir antes da imagem
    img.parentNode.insertBefore(skeleton, img);
    img.classList.add('lazy-loading');
  }

  /**
   * Carregar componente sob demanda
   */
  async loadComponent(container) {
    const componentName = container.dataset.lazyComponent;
    
    if (!componentName) return;

    console.log(`📦 Carregando componente: ${componentName}`);

    try {
      // Mostrar loading
      this.showComponentLoading(container);

      // Simular carregamento de componente
      // Em produção, aqui você faria import dinâmico
      const componentModule = await this.fetchComponentModule(componentName);

      // Renderizar componente
      if (componentModule && componentModule.render) {
        await componentModule.render(container);
      }

      container.dataset.loaded = 'true';
      container.classList.add('component-loaded');

      // Remover loading
      this.hideComponentLoading(container);

      console.log(`✅ Componente carregado: ${componentName}`);

    } catch (error) {
      console.error(`❌ Erro ao carregar componente ${componentName}:`, error);
      this.showComponentError(container);
    }
  }

  /**
   * Fetch do módulo de componente
   */
  async fetchComponentModule(componentName) {
    // Cache de componentes já carregados
    if (this.componentCache.has(componentName)) {
      return this.componentCache.get(componentName);
    }

    try {
      // Importação dinâmica (requer bundler como Webpack)
      const module = await import(`./${componentName}.js`);
      this.componentCache.set(componentName, module);
      return module;
    } catch (error) {
      console.warn(`⚠️ Componente ${componentName} não encontrado como módulo:`, error);
      return null;
    }
  }

  /**
   * Mostrar loading do componente
   */
  showComponentLoading(container) {
    const loader = document.createElement('div');
    loader.className = 'component-loader';
    loader.innerHTML = '<div class="spinner"></div><p>Carregando...</p>';
    container.appendChild(loader);
  }

  /**
   * Esconder loading do componente
   */
  hideComponentLoading(container) {
    const loader = container.querySelector('.component-loader');
    if (loader) {
      loader.remove();
    }
  }

  /**
   * Mostrar erro do componente
   */
  showComponentError(container) {
    const errorEl = document.createElement('div');
    errorEl.className = 'component-error';
    errorEl.innerHTML = '<p>❌ Erro ao carregar componente</p>';
    container.appendChild(errorEl);
  }

  /**
   * Pré-carregar recursos críticos em background
   */
  prefetchCriticalResources() {
    // Pré-carregar CSS críticos
    const criticalCSS = [
      'styles.css',
    ];

    // Pré-carregar scripts críticos
    const criticalScripts = [
      'script.js',
      'service-worker.js'
    ];

    if (this.isOnline && this.config.enableNetworkOptimization) {
      // Prefetch apenas se estiver online
      this.prefetchResources(criticalCSS);
      this.prefetchResources(criticalScripts);
    }
  }

  /**
   * Prefetch de recursos
   */
  prefetchResources(resources) {
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = resource;
      document.head.appendChild(link);
    });
  }

  /**
   * Monitorar estado online/offline
   */
  handleOnline() {
    console.log('🌐 Online detectado');
    this.isOnline = true;
    
    // Tentar carregar imagens pendentes
    this.retryFailedImages();
  }

  handleOffline() {
    console.log('📡 Offline detectado');
    this.isOnline = false;
  }

  /**
   * Retry de imagens que falharam
   */
  retryFailedImages() {
    document.querySelectorAll('img.lazy-error').forEach(img => {
      if (img.dataset.src) {
        img.classList.remove('lazy-error');
        this.loadImageLazy(img);
      }
    });
  }

  /**
   * Obter estatísticas
   */
  getStats() {
    return {
      totalImages: document.querySelectorAll('img[data-src]').length,
      loadedImages: this.loadedImages.size,
      pendingImages: document.querySelectorAll('img[data-src]:not(.lazy-loaded)').length,
      failedImages: document.querySelectorAll('img.lazy-error').length,
      loadedComponents: this.loadedComponents.size,
      isOnline: this.isOnline,
      queue: this.loadingQueue.length,
      activeLoads: this.activeLoads,
    };
  }

  /**
   * Debug - mostrar estatísticas
   */
  debug() {
    const stats = this.getStats();
    console.log('📊 LAZY LOADING STATS:', stats);
    return stats;
  }

  /**
   * Limpar observadores
   */
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    console.log('🧹 LazyLoadingSystem destruído');
  }
}

// Inicializar sistema globalmente
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.lazyLoadingSystem = new LazyLoadingSystem();
  });
} else {
  window.lazyLoadingSystem = new LazyLoadingSystem();
}

// Exponir funções globais de debug
window.debugLazyLoading = () => window.lazyLoadingSystem?.debug();
window.reloadPendingImages = () => window.lazyLoadingSystem?.retryFailedImages();
