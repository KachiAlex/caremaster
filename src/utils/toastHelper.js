// Toast Helper Utility
// Provides consistent toast notifications with longer visibility

import { toast } from 'react-toastify';

// Default toast configurations
const DEFAULT_CONFIG = {
  error: {
    autoClose: 8000, // 8 seconds for errors
    style: { fontSize: '14px', minWidth: '350px' },
    bodyStyle: { fontSize: '14px' }
  },
  success: {
    autoClose: 6000, // 6 seconds for success
    style: { fontSize: '14px', minWidth: '300px' }
  },
  warning: {
    autoClose: 7000, // 7 seconds for warnings
    style: { fontSize: '14px', minWidth: '300px' }
  },
  info: {
    autoClose: 6000, // 6 seconds for info
    style: { fontSize: '14px', minWidth: '300px' }
  }
};

// Enhanced toast functions with longer durations
export const showToast = {
  error: (message, options = {}) => {
    return toast.error(message, {
      ...DEFAULT_CONFIG.error,
      ...options
    });
  },
  
  success: (message, options = {}) => {
    return toast.success(message, {
      ...DEFAULT_CONFIG.success,
      ...options
    });
  },
  
  warning: (message, options = {}) => {
    return toast.warning(message, {
      ...DEFAULT_CONFIG.warning,
      ...options
    });
  },
  
  info: (message, options = {}) => {
    return toast.info(message, {
      ...DEFAULT_CONFIG.info,
      ...options
    });
  }
};

export default showToast;

