import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '../atoms';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  showDetails?: boolean;
  level?: 'page' | 'component' | 'critical';
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.state.errorId || `error_${Date.now()}`;
    
    this.setState({
      error,
      errorInfo,
      errorId,
    });

    // Log error for monitoring
    this.logError(error, errorInfo, errorId);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId);
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    const errorReport = {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      level: this.props.level || 'component',
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Boundary Caught Error [${errorId}]`);
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Error Report:', errorReport);
      console.groupEnd();
    }

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      try {
        // This would be replaced with actual monitoring service (e.g., Sentry, LogRocket)
        fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorReport),
        }).catch(reportingError => {
          console.error('Failed to report error:', reportingError);
        });
      } catch (reportingError) {
        console.error('Failed to report error:', reportingError);
      }
    }
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private renderErrorDetails = () => {
    if (!this.props.showDetails || process.env.NODE_ENV === 'production') {
      return null;
    }

    const { error, errorInfo, errorId } = this.state;

    return (
      <details className="mt-4 p-4 bg-gray-50 rounded-lg border">
        <summary className="cursor-pointer font-medium text-gray-700 mb-2">
          Technical Details (Error ID: {errorId})
        </summary>
        <div className="text-sm space-y-2">
          <div>
            <strong>Error:</strong>
            <pre className="mt-1 p-2 bg-white border rounded text-xs overflow-x-auto">
              {error?.message}
            </pre>
          </div>
          {error?.stack && (
            <div>
              <strong>Stack Trace:</strong>
              <pre className="mt-1 p-2 bg-white border rounded text-xs overflow-x-auto max-h-32 overflow-y-auto">
                {error.stack}
              </pre>
            </div>
          )}
          {errorInfo?.componentStack && (
            <div>
              <strong>Component Stack:</strong>
              <pre className="mt-1 p-2 bg-white border rounded text-xs overflow-x-auto max-h-32 overflow-y-auto">
                {errorInfo.componentStack}
              </pre>
            </div>
          )}
        </div>
      </details>
    );
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { level = 'component' } = this.props;
      const isPageLevel = level === 'page';
      const isCritical = level === 'critical';

      return (
        <div className={`flex flex-col items-center justify-center p-8 ${isPageLevel ? 'min-h-screen' : 'min-h-64'} bg-white`}>
          <div className="text-center max-w-md">
            {/* Error Icon */}
            <div className={`mx-auto ${isCritical ? 'h-16 w-16 text-red-500' : 'h-12 w-12 text-orange-500'} mb-4`}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            </div>

            {/* Error Title */}
            <h2 className={`${isCritical ? 'text-2xl' : 'text-xl'} font-semibold text-gray-900 mb-2`}>
              {isCritical ? 'Critical Error' : isPageLevel ? 'Page Error' : 'Something went wrong'}
            </h2>

            {/* Error Message */}
            <p className="text-gray-600 mb-6">
              {isCritical 
                ? 'A critical error has occurred. Please contact support if this problem persists.'
                : isPageLevel 
                ? 'We encountered an error while loading this page. Please try again or return to the home page.'
                : 'This component encountered an error. You can try refreshing the page or continue browsing.'
              }
            </p>

            {/* Error ID */}
            {this.state.errorId && (
              <p className="text-xs text-gray-400 mb-6">
                Error ID: {this.state.errorId}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {!isCritical && (
                <Button
                  onClick={this.handleRetry}
                  variant="primary"
                  size="md"
                >
                  Try Again
                </Button>
              )}
              
              <Button
                onClick={this.handleReload}
                variant="outline"
                size="md"
              >
                Refresh Page
              </Button>
              
              {isPageLevel && (
                <Button
                  onClick={this.handleGoHome}
                  variant="ghost"
                  size="md"
                >
                  Go Home
                </Button>
              )}
            </div>

            {/* Error Details */}
            {this.renderErrorDetails()}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Hook for programmatically triggering error boundary
export const useErrorHandler = () => {
  return (error: Error) => {
    throw error;
  };
};