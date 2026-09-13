import { useEffect } from 'react';

/**
 * MobileOptimization — non-rendering component that applies runtime
 * mobile-specific fixes (orientation changes, viewport units, body classes).
 *
 * CSS-based mobile optimizations are in src/index.css.
 * Meta-tag based optimizations are in public/index.html.
 */
const MobileOptimization = () => {
  useEffect(() => {
    // Add mobile detection class to body for targetted styling
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      document.body.classList.add('mobile-device');
    }

    // Handle orientation changes and viewport height (vh) units for mobile
    const handleViewportUpdate = () => {
      // Update custom --vh property for elements that need true viewport height
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    window.addEventListener('orientationchange', handleViewportUpdate);
    window.addEventListener('resize', handleViewportUpdate);
    handleViewportUpdate(); // Initial call

    return () => {
      window.removeEventListener('orientationchange', handleViewportUpdate);
      window.removeEventListener('resize', handleViewportUpdate);
    };
  }, []);

  return null;
};

export default MobileOptimization;
