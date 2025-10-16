import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useResponsive } from '../hooks';

/**
 * ResponsiveDrawer - A mobile-optimized drawer/side panel component
 * @param {boolean} isOpen - Whether the drawer is open
 * @param {function} onClose - Function to call when drawer is closed
 * @param {string} title - Drawer title
 * @param {string} position - Drawer position: 'left', 'right', 'top', 'bottom'
 * @param {boolean} showCloseButton - Whether to show the close button
 * @param {React.ReactNode} children - Drawer content
 * @param {React.ReactNode} header - Custom header content
 * @param {React.ReactNode} footer - Footer content
 * @param {string} size - Drawer size: 'sm', 'md', 'lg', 'full'
 */
const ResponsiveDrawer = ({
  isOpen,
  onClose,
  title,
  position = 'right',
  showCloseButton = true,
  children,
  header,
  footer,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
}) => {
  const { isMobile } = useResponsive();

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (!isOpen) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Position classes
  const positionClasses = {
    left: 'left-0 top-0 h-full animate-slide-in-left',
    right: 'right-0 top-0 h-full animate-slide-in-right',
    top: 'top-0 left-0 w-full animate-slide-down',
    bottom: 'bottom-0 left-0 w-full animate-slide-up',
  };

  // Size classes based on position
  const sizeClasses = {
    horizontal: {
      sm: 'max-w-xs',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-2xl',
      full: 'w-full',
    },
    vertical: {
      sm: 'max-h-[30vh]',
      md: 'max-h-[50vh]',
      lg: 'max-h-[70vh]',
      xl: 'max-h-[85vh]',
      full: 'h-full',
    },
  };

  const isHorizontal = position === 'left' || position === 'right';
  const sizeClass = isHorizontal 
    ? sizeClasses.horizontal[size] || sizeClasses.horizontal.md
    : sizeClasses.vertical[size] || sizeClasses.vertical.md;

  const handleBackdropClick = (e) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose?.();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9998] bg-black bg-opacity-50 animate-fade-in"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "drawer-title" : undefined}
    >
      <div 
        className={`fixed bg-white shadow-2xl ${positionClasses[position]} ${sizeClass} ${
          isMobile ? 'w-full' : ''
        } flex flex-col safe-area-inset`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || header || showCloseButton) && (
          <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 shrink-0">
            <div className="flex-1 min-w-0">
              {header || (
                title && (
                  <h2 
                    id="drawer-title" 
                    className="text-lg md:text-xl font-semibold text-gray-900 truncate"
                  >
                    {title}
                  </h2>
                )
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="ml-3 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                aria-label="Close drawer"
              >
                <X className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 smooth-scroll">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 bg-gray-50 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
  @keyframes slide-in-left {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(0);
    }
  }
  
  @keyframes slide-in-right {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }
  
  .animate-slide-in-left {
    animation: slide-in-left 0.3s ease-out;
  }
  
  .animate-slide-in-right {
    animation: slide-in-right 0.3s ease-out;
  }
`;
if (typeof document !== 'undefined') {
  document.head.appendChild(style);
}

export default ResponsiveDrawer;

