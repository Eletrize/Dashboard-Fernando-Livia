/**
 * IMAGE LAZY CONVERSION UTILITY
 * Converter automático de imagens para usar lazy loading
 * Adiciona data-src e loading="lazy" nas imagens
 */

class ImageLazyConverter {
  constructor() {
    this.criticalImages = new Set([
      'icon-home.svg',
      'icon-scenes.svg',
      'icon-music.svg',
      'icon-tv.svg',
      'icon-devices.svg',
      'icon-settings.svg',
      'app-icon',
      'arrow-up.svg',
      'icon-stop.svg'
    ]);

    this.volatileImages = new Set([
      'icon-small-light',
      'icon-small-tv',
      'icon-small-shader',
      'icon-small-fan',
      'album',
      'cover'
    ]);
  }

  /**
   * Converter todas as imagens da página para lazy loading
   */
  convertAll() {
    console.log('🖼️ Iniciando conversão de imagens para lazy loading...');

    const images = document.querySelectorAll('img');
    let converted = 0;

    images.forEach((img, index) => {
      if (this.shouldBeLazy(img)) {
        this.convertImage(img);
        converted++;
      }
    });

    console.log(`✅ ${converted}/${images.length} imagens convertidas para lazy loading`);
    return { total: images.length, converted };
  }

  /**
   * Verificar se imagem deve ser carregada preguiçosamente
   */
  shouldBeLazy(img) {
    // Já tem data-src (já configurada)
    if (img.hasAttribute('data-src')) {
      return false;
    }

    const src = img.getAttribute('src');
    if (!src || src.startsWith('data:')) {
      return false;
    }

    // Verificar se é imagem crítica
    if (this.isCritical(src)) {
      return false;
    }

    return true;
  }

  /**
   * Verificar se imagem é crítica
   */
  isCritical(src) {
    for (const critical of this.criticalImages) {
      if (src.includes(critical)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Converter imagem para lazy loading
   */
  convertImage(img) {
    const src = img.getAttribute('src');

    if (!src) return;

    // Usar um placeholder minúsculo (1x1 pixel transparente)
    const placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3C/svg%3E';

    // Configurar lazy loading
    img.setAttribute('data-src', src);
    img.setAttribute('src', placeholder);
    img.setAttribute('loading', 'lazy');

    // Se é SVG volátil, marcar como tal
    if (this.isVolatile(src)) {
      img.classList.add('volatile-image');
    }
  }

  /**
   * Verificar se imagem é volátil (muda frequentemente)
   */
  isVolatile(src) {
    for (const volatile of this.volatileImages) {
      if (src.includes(volatile)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Obter estatísticas
   */
  getStats() {
    const images = document.querySelectorAll('img');
    const lazyImages = document.querySelectorAll('img[data-src]');
    const criticalImages = document.querySelectorAll('img:not([data-src])');

    return {
      total: images.length,
      lazy: lazyImages.length,
      critical: criticalImages.length,
      percentage: ((lazyImages.length / images.length) * 100).toFixed(1) + '%'
    };
  }
}

// Inicializar conversor automaticamente
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const converter = new ImageLazyConverter();
    converter.convertAll();
    window.imageConverter = converter;
  });
} else {
  const converter = new ImageLazyConverter();
  converter.convertAll();
  window.imageConverter = converter;
}

// Expor funções globais
window.getImageStats = () => window.imageConverter?.getStats();
