import { useState, useEffect } from 'react';

/**
 * Custom hook to detect mobile devices and capabilities
 * @returns {object} - Mobile detection information
 */
const useMobileDetection = () => {
  const [mobileInfo, setMobileInfo] = useState({
    isMobile: false,
    isIOS: false,
    isAndroid: false,
    isSafari: false,
    isChrome: false,
    isTouchDevice: false,
    isPWA: false,
    isStandalone: false,
    devicePixelRatio: window.devicePixelRatio || 1,
    orientation: window.orientation || 0,
    isOnline: navigator.onLine,
  });

  useEffect(() => {
    const updateMobileInfo = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      
      // Check if iOS
      const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
      
      // Check if Android
      const isAndroid = /android/i.test(userAgent);
      
      // Check if mobile (either iOS or Android)
      const isMobile = isIOS || isAndroid || /webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      
      // Check browser
      const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
      const isChrome = /chrome/i.test(userAgent) && !/edge/i.test(userAgent);
      
      // Check if touch device
      const isTouchDevice = ('ontouchstart' in window) || 
                           (navigator.maxTouchPoints > 0) || 
                           (navigator.msMaxTouchPoints > 0);
      
      // Check if PWA
      const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                    window.navigator.standalone === true ||
                    document.referrer.includes('android-app://');
      
      // Check if running in standalone mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          window.navigator.standalone;
      
      setMobileInfo({
        isMobile,
        isIOS,
        isAndroid,
        isSafari,
        isChrome,
        isTouchDevice,
        isPWA,
        isStandalone,
        devicePixelRatio: window.devicePixelRatio || 1,
        orientation: window.orientation || 0,
        isOnline: navigator.onLine,
      });
    };

    // Initial update
    updateMobileInfo();

    // Listen for orientation changes
    const handleOrientationChange = () => {
      updateMobileInfo();
    };

    // Listen for online/offline changes
    const handleOnline = () => {
      setMobileInfo(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setMobileInfo(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return mobileInfo;
};

export default useMobileDetection;

