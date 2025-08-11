// Performance and error monitoring utilities

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

interface ErrorReport {
  message: string;
  stack?: string;
  level: 'error' | 'warning' | 'info';
  timestamp: number;
  userId?: number;
  sessionId?: string;
  url: string;
  userAgent: string;
  additional?: Record<string, any>;
}

class MonitoringService {
  private metrics: PerformanceMetric[] = [];
  private sessionId: string;
  private isProduction: boolean;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isProduction = process.env.NODE_ENV === 'production';
    this.setupGlobalErrorHandlers();
    this.setupPerformanceObserver();
  }

  // Generate unique session ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Setup global error handlers
  private setupGlobalErrorHandlers(): void {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      this.reportError({
        message: event.message,
        stack: event.error?.stack,
        level: 'error',
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        additional: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        level: 'error',
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        additional: {
          type: 'unhandledrejection',
          reason: event.reason,
        },
      });
    });
  }

  // Setup Performance Observer for Web Vitals
  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      try {
        // Core Web Vitals
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric({
              name: entry.entryType === 'largest-contentful-paint' ? 'LCP' : entry.name,
              value: entry.startTime,
              unit: 'ms',
              timestamp: Date.now(),
              tags: {
                type: entry.entryType,
              },
            });
          }
        });

        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input'] });
      } catch (error) {
        console.warn('Performance Observer not fully supported:', error);
      }
    }
  }

  // Record performance metric
  public recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    if (this.isProduction) {
      // Send to monitoring service
      this.sendMetric(metric);
    } else {
      console.debug('📊 Performance Metric:', metric);
    }
  }

  // Report error
  public reportError(error: ErrorReport): void {
    if (this.isProduction) {
      // Send to error reporting service
      this.sendError(error);
    } else {
      console.error('🚨 Error Report:', error);
    }
  }

  // Track user action
  public trackAction(action: string, properties?: Record<string, any>): void {
    const event = {
      action,
      properties,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      url: window.location.href,
    };

    if (this.isProduction) {
      this.sendEvent(event);
    } else {
      console.debug('📈 User Action:', event);
    }
  }

  // Track page view
  public trackPageView(path: string, title?: string): void {
    this.trackAction('page_view', {
      path,
      title: title || document.title,
      referrer: document.referrer,
    });

    // Record page load time
    if (performance.timing) {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      this.recordMetric({
        name: 'page_load_time',
        value: loadTime,
        unit: 'ms',
        timestamp: Date.now(),
        tags: { path },
      });
    }
  }

  // Track API call performance
  public trackApiCall(endpoint: string, method: string, duration: number, status: number): void {
    this.recordMetric({
      name: 'api_call_duration',
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      tags: {
        endpoint,
        method,
        status: status.toString(),
      },
    });

    // Track errors
    if (status >= 400) {
      this.reportError({
        message: `API Error: ${method} ${endpoint} - ${status}`,
        level: status >= 500 ? 'error' : 'warning',
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        additional: {
          endpoint,
          method,
          status,
          duration,
        },
      });
    }
  }

  // Send metric to monitoring service
  private sendMetric(metric: PerformanceMetric): void {
    try {
      fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...metric,
          sessionId: this.sessionId,
        }),
      }).catch(error => {
        console.warn('Failed to send metric:', error);
      });
    } catch (error) {
      console.warn('Failed to send metric:', error);
    }
  }

  // Send error to reporting service
  private sendError(error: ErrorReport): void {
    try {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...error,
          sessionId: this.sessionId,
        }),
      }).catch(reportingError => {
        console.warn('Failed to send error report:', reportingError);
      });
    } catch (reportingError) {
      console.warn('Failed to send error report:', reportingError);
    }
  }

  // Send event to analytics service
  private sendEvent(event: any): void {
    try {
      fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }).catch(error => {
        console.warn('Failed to send analytics event:', error);
      });
    } catch (error) {
      console.warn('Failed to send analytics event:', error);
    }
  }

  // Get session metrics
  public getSessionMetrics(): PerformanceMetric[] {
    return this.metrics;
  }

  // Clear metrics
  public clearMetrics(): void {
    this.metrics = [];
  }
}

// Create singleton instance
export const monitoring = new MonitoringService();

// React hooks for monitoring
export const useMonitoring = () => {
  return {
    recordMetric: monitoring.recordMetric.bind(monitoring),
    reportError: monitoring.reportError.bind(monitoring),
    trackAction: monitoring.trackAction.bind(monitoring),
    trackPageView: monitoring.trackPageView.bind(monitoring),
    trackApiCall: monitoring.trackApiCall.bind(monitoring),
    getSessionMetrics: monitoring.getSessionMetrics.bind(monitoring),
  };
};

// Performance measurement utilities
export const measurePerformance = <T>(
  name: string,
  fn: () => T | Promise<T>
): T | Promise<T> => {
  const start = performance.now();
  
  const result = fn();
  
  if (result instanceof Promise) {
    return result.then(
      (value) => {
        const duration = performance.now() - start;
        monitoring.recordMetric({
          name,
          value: duration,
          unit: 'ms',
          timestamp: Date.now(),
        });
        return value;
      },
      (error) => {
        const duration = performance.now() - start;
        monitoring.recordMetric({
          name,
          value: duration,
          unit: 'ms',
          timestamp: Date.now(),
          tags: { error: 'true' },
        });
        throw error;
      }
    );
  } else {
    const duration = performance.now() - start;
    monitoring.recordMetric({
      name,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
    });
    return result;
  }
};

// Component performance HOC
export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) => {
  const WrappedComponent = (props: P) => {
    const name = componentName || Component.displayName || Component.name;
    
    React.useEffect(() => {
      const startTime = performance.now();
      
      return () => {
        const renderTime = performance.now() - startTime;
        monitoring.recordMetric({
          name: `component_render_time`,
          value: renderTime,
          unit: 'ms',
          timestamp: Date.now(),
          tags: { component: name },
        });
      };
    }, []);
    
    return <Component {...props} />;
  };
  
  WrappedComponent.displayName = `withPerformanceMonitoring(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};