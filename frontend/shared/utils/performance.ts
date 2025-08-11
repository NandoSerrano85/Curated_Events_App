// Performance optimization utilities

// Debounce function
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): T => {
  let timeout: NodeJS.Timeout | null = null;
  
  return ((...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  }) as T;
};

// Throttle function
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T => {
  let inThrottle: boolean;
  
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
};

// Lazy loading utility for images
export const lazyLoadImage = (
  img: HTMLImageElement,
  src: string,
  placeholder?: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (placeholder) {
      img.src = placeholder;
    }

    const tempImg = new Image();
    tempImg.onload = () => {
      img.src = src;
      img.classList.remove('lazy-loading');
      img.classList.add('lazy-loaded');
      resolve();
    };
    tempImg.onerror = reject;
    tempImg.src = src;
  });
};

// Intersection Observer wrapper
export class IntersectionObserverWrapper {
  private observer: IntersectionObserver | null = null;
  private callbacks = new Map<Element, (entry: IntersectionObserverEntry) => void>();

  constructor(options: IntersectionObserverInit = {}) {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const callback = this.callbacks.get(entry.target);
          if (callback) {
            callback(entry);
          }
        });
      }, {
        rootMargin: '50px',
        threshold: 0.1,
        ...options,
      });
    }
  }

  observe(element: Element, callback: (entry: IntersectionObserverEntry) => void) {
    if (!this.observer) return;
    
    this.callbacks.set(element, callback);
    this.observer.observe(element);
  }

  unobserve(element: Element) {
    if (!this.observer) return;
    
    this.callbacks.delete(element);
    this.observer.unobserve(element);
  }

  disconnect() {
    if (!this.observer) return;
    
    this.observer.disconnect();
    this.callbacks.clear();
  }
}

// Create a global intersection observer instance
export const globalIntersectionObserver = new IntersectionObserverWrapper();

// Bundle splitting utilities
export const loadModule = async <T = any>(
  moduleLoader: () => Promise<{ default: T }>
): Promise<T> => {
  const startTime = performance.now();
  
  try {
    const module = await moduleLoader();
    const loadTime = performance.now() - startTime;
    
    if (process.env.NODE_ENV === 'development') {
      console.debug(`Module loaded in ${loadTime.toFixed(2)}ms`);
    }
    
    return module.default;
  } catch (error) {
    console.error('Failed to load module:', error);
    throw error;
  }
};

// Preload critical resources
export const preloadResource = (
  href: string,
  as: 'script' | 'style' | 'font' | 'image' | 'fetch' = 'fetch',
  crossOrigin?: 'anonymous' | 'use-credentials'
) => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = as;
  link.href = href;
  
  if (crossOrigin) {
    link.crossOrigin = crossOrigin;
  }
  
  document.head.appendChild(link);
};

// Prefetch resources for future navigation
export const prefetchResource = (href: string) => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  document.head.appendChild(link);
};

// Image optimization utilities
export const getOptimizedImageUrl = (
  originalUrl: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
  } = {}
): string => {
  const { width, height, quality = 80, format = 'webp' } = options;
  
  // This would integrate with your image optimization service
  // For example, with Next.js Image Optimization API or a CDN like Cloudinary
  const params = new URLSearchParams();
  
  if (width) params.append('w', width.toString());
  if (height) params.append('h', height.toString());
  params.append('q', quality.toString());
  params.append('f', format);
  
  // Example with Next.js Image API
  return `/api/images?url=${encodeURIComponent(originalUrl)}&${params.toString()}`;
};

// Generate responsive image srcSet
export const generateSrcSet = (
  baseUrl: string,
  sizes: number[] = [320, 640, 768, 1024, 1280, 1536]
): string => {
  return sizes
    .map(size => `${getOptimizedImageUrl(baseUrl, { width: size })} ${size}w`)
    .join(', ');
};

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private observer: PerformanceObserver | null = null;
  private metrics: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  constructor() {
    this.setupObserver();
  }

  private setupObserver() {
    if (!('PerformanceObserver' in window)) return;

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric(entry.name, entry.duration || entry.startTime);
        }
      });

      this.observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
    } catch (error) {
      console.warn('PerformanceObserver not supported:', error);
    }
  }

  recordMetric(name: string, value: number) {
    this.metrics.set(name, value);
    
    // Send to analytics in production
    if (process.env.NODE_ENV === 'production') {
      // This would send to your analytics service
      console.debug(`Performance metric: ${name} = ${value}ms`);
    }
  }

  measure(name: string, startMark: string, endMark?: string) {
    if (!('performance' in window) || !performance.measure) return;
    
    try {
      performance.measure(name, startMark, endMark);
    } catch (error) {
      console.warn('Performance measure failed:', error);
    }
  }

  mark(name: string) {
    if (!('performance' in window) || !performance.mark) return;
    
    try {
      performance.mark(name);
    } catch (error) {
      console.warn('Performance mark failed:', error);
    }
  }

  getMetrics(): Map<string, number> {
    return new Map(this.metrics);
  }

  clearMetrics() {
    this.metrics.clear();
    
    if ('performance' in window && performance.clearMarks) {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }
}

// Create global performance monitor instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// HOC for performance monitoring
export const withPerformanceTracking = <P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) => {
  const name = componentName || Component.displayName || Component.name || 'Component';
  
  return React.forwardRef<any, P>((props, ref) => {
    React.useEffect(() => {
      performanceMonitor.mark(`${name}-mount-start`);
      
      return () => {
        performanceMonitor.mark(`${name}-unmount`);
        performanceMonitor.measure(`${name}-mount-time`, `${name}-mount-start`, `${name}-unmount`);
      };
    }, []);

    return <Component {...props} ref={ref} />;
  });
};

// Memory management utilities
export const cleanupUnusedObjects = () => {
  // Force garbage collection in development (if available)
  if (process.env.NODE_ENV === 'development' && 'gc' in window) {
    (window as any).gc();
  }
};

// Check if user prefers reduced motion
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Get user's connection information
export const getConnectionInfo = () => {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return null;
  }

  const connection = (navigator as any).connection;
  
  return {
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData,
  };
};

// Adaptive loading based on network conditions
export const shouldLoadHighQuality = (): boolean => {
  const connection = getConnectionInfo();
  
  if (!connection) return true; // Default to high quality if no info
  
  // Load high quality on fast connections
  return connection.effectiveType === '4g' && 
         connection.downlink > 1.5 && 
         !connection.saveData;
};