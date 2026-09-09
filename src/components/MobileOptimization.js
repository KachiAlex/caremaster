import React, { useEffect } from 'react';

const MobileOptimization = () => {
  useEffect(() => {
    // Add mobile-specific meta tags and viewport settings
    const addMobileMetaTags = () => {
      // Check if meta tags already exist
      let viewportMeta = document.querySelector('meta[name="viewport"]');
      let themeMeta = document.querySelector('meta[name="theme-color"]');
      let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-capable"]');

      // Set viewport for mobile optimization
      if (!viewportMeta) {
        viewportMeta = document.createElement('meta');
        viewportMeta.name = 'viewport';
        document.head.appendChild(viewportMeta);
      }
      viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

      // Set theme color for mobile browsers
      if (!themeMeta) {
        themeMeta = document.createElement('meta');
        themeMeta.name = 'theme-color';
        document.head.appendChild(themeMeta);
      }
      themeMeta.content = '#3B82F6'; // Blue theme color

      // Enable web app mode for iOS
      if (!appleMeta) {
        appleMeta = document.createElement('meta');
        appleMeta.name = 'apple-mobile-web-app-capable';
        document.head.appendChild(appleMeta);
      }
      appleMeta.content = 'yes';

      // Add Apple touch icon meta
      let appleTouchIcon = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (!appleTouchIcon) {
        appleTouchIcon = document.createElement('meta');
        appleTouchIcon.name = 'apple-mobile-web-app-status-bar-style';
        document.head.appendChild(appleTouchIcon);
      }
      appleTouchIcon.content = 'default';

      // Add Apple touch icon
      let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
      if (!appleIcon) {
        appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        appleIcon.sizes = '180x180';
        appleIcon.href = '/favicon.ico';
        document.head.appendChild(appleIcon);
      }

      // Add manifest for PWA
      let manifestLink = document.querySelector('link[rel="manifest"]');
      if (!manifestLink) {
        manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        manifestLink.href = '/manifest.json';
        document.head.appendChild(manifestLink);
      }
    };

    // Prevent zoom on input focus (iOS), delegated so it also covers inputs
    // mounted later
    const handleFocusIn = (event) => {
      if (!event.target.matches('input, textarea, select')) return;
      if (window.innerWidth >= 768) return;
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      }
    };

    const handleFocusOut = (event) => {
      if (!event.target.matches('input, textarea, select')) return;
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
      }
    };

    // Add mobile-specific CSS
    const addMobileCSS = () => {
      const style = document.createElement('style');
      style.textContent = `
        /* Mobile optimizations */
        @media (max-width: 768px) {
          /* Prevent horizontal scroll */
          body {
            overflow-x: hidden;
          }
          
          /* Touch-friendly button sizes */
          button, .btn {
            min-height: 44px;
            min-width: 44px;
          }
          
          /* Improve touch targets */
          input, textarea, select {
            min-height: 44px;
          }
          
          /* Better scrolling on iOS */
          .overflow-y-auto {
            -webkit-overflow-scrolling: touch;
          }
          
          /* Prevent text selection on UI elements */
          button, .no-select {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
          }
          
          /* Optimize for mobile viewport */
          .mobile-full-height {
            height: 100vh;
            height: 100dvh; /* Dynamic viewport height for mobile */
          }
          
          /* Better touch feedback */
          .touch-manipulation {
            touch-action: manipulation;
          }

          /* Tap targets should not delay or swallow scroll gestures */
          button, a, .btn {
            touch-action: manipulation;
          }
          
          /* Prevent pull-to-refresh on mobile */
          body {
            overscroll-behavior: none;
          }
        }
        
        /* Landscape mobile optimizations */
        @media (max-width: 768px) and (orientation: landscape) {
          .mobile-landscape-hide {
            display: none !important;
          }
          
          .mobile-landscape-compact {
            padding: 0.5rem !important;
          }
        }
        
        /* iOS specific fixes */
        @supports (-webkit-touch-callout: none) {
          input, textarea {
            font-size: 16px; /* Prevents zoom on iOS */
          }
        }
      `;
      document.head.appendChild(style);
      return style;
    };

    // Initialize mobile optimizations
    addMobileMetaTags();
    const mobileStyle = addMobileCSS();
    document.addEventListener('focusin', handleFocusIn, { passive: true });
    document.addEventListener('focusout', handleFocusOut, { passive: true });

    // Add mobile detection class to body
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      document.body.classList.add('mobile-device');
    }

    // Handle orientation changes. Mobile browsers fire resize while scrolling
    // (URL bar collapsing), so the write is batched into a frame and skipped
    // when the value is unchanged.
    let frame = null;
    let lastVh = null;
    const updateViewportHeight = () => {
      frame = null;
      const vh = window.innerHeight * 0.01;
      if (vh === lastVh) return;
      lastVh = vh;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    const handleOrientationChange = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(updateViewportHeight);
    };

    window.addEventListener('orientationchange', handleOrientationChange, { passive: true });
    window.addEventListener('resize', handleOrientationChange, { passive: true });
    updateViewportHeight(); // Initial call

    // Cleanup
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      if (frame !== null) window.cancelAnimationFrame(frame);
      mobileStyle.remove();
    };
  }, []);

  return null; // This component doesn't render anything
};

export default MobileOptimization;
