import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useResponsive } from '../hooks';

/**
 * ResponsiveModal - A mobile-optimized modal component
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Function to call when modal is closed
 * @param {string} title - Modal title
 * @param {string} size - Modal size: 'sm', 'md', 'lg', 'xl', 'full'
 * @param {boolean} showCloseButton - Whether to show the close button
 * @param {React.ReactNode} children - Modal content
 * @param {React.ReactNode} header - Custom header content
 * @param {React.ReactNode} footer - Footer content
 * @param {string} headerClassName - Additional header classes
 * @param {string} bodyClassName - Additional body classes
 * @param {string} footerClassName - Additional footer classes
 * @param {boolean} fullScreenOnMobile - Whether to make modal full screen on mobile
 * @param {boolean} preventBackgroundScroll - Whether to prevent background scroll
 */
const ResponsiveModal = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  showCloseButton = true,
  children,
  header,
  footer,
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  fullScreenOnMobile = true,
  preventBackgroundScroll = true,
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

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (!isOpen || !preventBackgroundScroll) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen, preventBackgroundScroll]);

  if (!isOpen) return null;

  // Size classes
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-full mx-4',
  };

  const modalSizeClass = fullScreenOnMobile && isMobile 
    ? 'w-full h-full max-w-none rounded-none' 
    : `w-full ${sizeClasses[size] || sizeClasses.md}`;

  const handleBackdropClick = (e) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose?.();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 animate-fade-in p-0 md:p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div 
        className={`bg-white ${modalSizeClass} ${
          fullScreenOnMobile && isMobile ? 'max-h-screen' : 'max-h-[90vh] md:rounded-xl'
        } overflow-hidden shadow-2xl animate-scale-in flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || header || showCloseButton) && (
          <div className={`flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 shrink-0 ${headerClassName}`}>
            <div className="flex-1 min-w-0">
              {header || (
                title && (
                  <h2 
                    id="modal-title" 
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
                aria-label="Close modal"
              >
                <X className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className={`flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 smooth-scroll ${bodyClassName}`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={`px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 bg-gray-50 shrink-0 safe-area-bottom ${footerClassName}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponsiveModal;

