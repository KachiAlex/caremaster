import { useState, useEffect } from 'react';

/**
 * Custom hook for responsive design breakpoints matching Tailwind CSS
 * @returns {object} - Object with boolean properties for each breakpoint
 */
const useResponsive = () => {
  const [breakpoints, setBreakpoints] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isLarge: false,
    isXLarge: false,
    // Specific checks
    isSm: false,  // >= 640px
    isMd: false,  // >= 768px
    isLg: false,  // >= 1024px
    isXl: false,  // >= 1280px
    is2Xl: false, // >= 1536px
    // Width value
    width: window.innerWidth,
    height: window.innerHeight,
    // Orientation
    isLandscape: window.innerWidth > window.innerHeight,
    isPortrait: window.innerWidth <= window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setBreakpoints({
        // Basic breakpoints
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        isLarge: width >= 1280,
        isXLarge: width >= 1536,
        
        // Tailwind breakpoints
        isSm: width >= 640,
        isMd: width >= 768,
        isLg: width >= 1024,
        isXl: width >= 1280,
        is2Xl: width >= 1536,
        
        // Dimensions
        width,
        height,
        
        // Orientation
        isLandscape: width > height,
        isPortrait: width <= height,
      });
    };

    // Set initial values
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return breakpoints;
};

export default useResponsive;

