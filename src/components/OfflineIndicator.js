// Offline Indicator Component
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import pwaService from '../services/pwaService';

const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(false);
  const [queuedRequests, setQueuedRequests] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowIndicator(false);
      // Hide indicator after a few seconds when back online
      setTimeout(() => {
        setShowIndicator(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial status
    if (!navigator.onLine) {
      setShowIndicator(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Listen for queued requests
    const checkQueuedRequests = async () => {
      try {
        const requests = await pwaService.getQueuedRequests();
        setQueuedRequests(requests.length);
      } catch (error) {
        console.error('Failed to check queued requests:', error);
      }
    };

    // Check queued requests periodically
    const interval = setInterval(checkQueuedRequests, 5000);
    checkQueuedRequests(); // Initial check

    return () => clearInterval(interval);
  }, []);

  const handleRetrySync = async () => {
    try {
      await pwaService.syncOfflineData();
      setQueuedRequests(0);
    } catch (error) {
      console.error('Failed to sync offline data:', error);
    }
  };

  if (!showIndicator) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-sm w-full mx-4">
      <div className={`rounded-lg shadow-lg p-3 transition-all duration-300 ${
        isOnline 
          ? 'bg-green-100 border border-green-200' 
          : 'bg-red-100 border border-red-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              isOnline ? 'bg-green-200' : 'bg-red-200'
            }`}>
              {isOnline ? (
                <Wifi className="w-3 h-3 text-green-600" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-600" />
              )}
            </div>
            <div>
              <p className={`text-sm font-medium ${
                isOnline ? 'text-green-800' : 'text-red-800'
              }`}>
                {isOnline ? 'Back Online' : 'You\'re Offline'}
              </p>
              <p className={`text-xs ${
                isOnline ? 'text-green-600' : 'text-red-600'
              }`}>
                {isOnline 
                  ? 'Syncing your data...' 
                  : queuedRequests > 0 
                    ? `${queuedRequests} actions queued` 
                    : 'Some features may be limited'
                }
              </p>
            </div>
          </div>
          
          {!isOnline && queuedRequests > 0 && (
            <button
              onClick={handleRetrySync}
              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-200 rounded transition-colors"
              title="Retry sync"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {!isOnline && (
          <div className="mt-2 pt-2 border-t border-red-200">
            <div className="flex items-center justify-between text-xs text-red-600">
              <span>Available offline:</span>
              <div className="flex items-center space-x-3">
                <span>📋 View data</span>
                <span>💬 Read messages</span>
                <span>📅 Check schedule</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;
