/**
 * preloadUtils.js
 * Utilities for preloading resources to improve performance
 */

/**
 * Preload an image by creating a new Image object
 * @param {string} src - Image source URL
 * @returns {Promise} - Promise that resolves when image is loaded or rejects on error
 */
export const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('No image source provided'));
      return;
    }
    
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
};

/**
 * Preload multiple images
 * @param {Array<string>} sources - Array of image source URLs
 * @param {Object} options - Options
 * @param {boolean} options.silent - If true, errors won't be logged (default: false)
 * @returns {Promise<Array>} - Promise that resolves when all images are loaded
 */
export const preloadImages = async (sources, options = {}) => {
  if (!sources || !Array.isArray(sources) || sources.length === 0) {
    return [];
  }
  
  const { silent = false } = options;
  
  const loadPromises = sources.map(src => 
    preloadImage(src).catch(error => {
      if (!silent) {
        console.warn(`Failed to preload image: ${src}`, error);
      }
      return null;
    })
  );
  
  return Promise.all(loadPromises);
};

/**
 * Preload CSS file
 * @param {string} href - CSS file URL
 * @returns {Promise} - Promise that resolves when CSS is loaded
 */
export const preloadCSS = (href) => {
  return new Promise((resolve, reject) => {
    if (!href) {
      reject(new Error('No CSS href provided'));
      return;
    }
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = href;
    
    link.onload = () => resolve(href);
    link.onerror = () => reject(new Error(`Failed to preload CSS: ${href}`));
    
    document.head.appendChild(link);
  });
};

/**
 * Preload a script
 * @param {string} src - Script URL
 * @returns {Promise} - Promise that resolves when script is preloaded
 */
export const preloadScript = (src) => {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('No script src provided'));
      return;
    }
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = src;
    
    link.onload = () => resolve(src);
    link.onerror = () => reject(new Error(`Failed to preload script: ${src}`));
    
    document.head.appendChild(link);
  });
};

/**
 * Prefetch a page to make future navigation faster
 * @param {string} url - URL to prefetch
 * @returns {Promise} - Promise that resolves when prefetch is complete
 */
export const prefetchPage = (url) => {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('No URL provided'));
      return;
    }
    
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    
    link.onload = () => resolve(url);
    link.onerror = () => reject(new Error(`Failed to prefetch page: ${url}`));
    
    document.head.appendChild(link);
  });
};

export default {
  preloadImage,
  preloadImages,
  preloadCSS,
  preloadScript,
  prefetchPage
};