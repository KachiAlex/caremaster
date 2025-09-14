import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import errorHandler from '../utils/errorHandler';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.props.name || 'Unknown'
    };

    const handledError = errorHandler.handleError(error, {
      ...errorData,
      critical: true,
      context: 'error_boundary'
    });

    this.setState({
      error,
      errorInfo,
      errorId: handledError.id
    });

    // Report to monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  reportError = async (error, errorInfo) => {
    try {
      // This would integrate with error monitoring services like Sentry
      console.error('Error Boundary caught an error:', error, errorInfo);
      
      // Example: Report to external service
      // await fetch('/api/errors/boundary', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     error: error.message,
      //     stack: error.stack,
      //     componentStack: errorInfo.componentStack,
      //     errorId: this.state.errorId,
      //     timestamp: new Date().toISOString(),
      //     userAgent: navigator.userAgent,
      //     url: window.location.href
      //   })
      // });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom error UI
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              {/* Error Icon */}
              <div className="flex justify-center">
                <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </div>

              {/* Error Message */}
              <div className="mt-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  Oops! Something went wrong
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  We're sorry, but something unexpected happened. Our team has been notified.
                </p>
                
                {this.state.errorId && (
                  <p className="mt-2 text-xs text-gray-500">
                    Error ID: {this.state.errorId}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-3">
                <button
                  onClick={this.handleRetry}
                  className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Home
                </button>
              </div>

              {/* Development Error Details */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mt-6 p-4 bg-gray-100 rounded-md">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    Development Error Details:
                  </h3>
                  <pre className="text-xs text-gray-600 overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}

              {/* Support Information */}
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                  If this problem persists, please contact support with the Error ID above.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
