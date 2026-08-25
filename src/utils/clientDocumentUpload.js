// Client Document Upload Utility
// Stub functions for document upload functionality

/**
 * Upload client document
 * @param {File} file - The file to upload
 * @param {string} clientId - The client ID
 * @returns {Promise<string>} - URL of uploaded document
 */
export const uploadClientDocument = async (file, clientId) => {
  // TODO: Implement document upload to Backend Storage
  console.warn('uploadClientDocument not yet implemented');
  return Promise.resolve(null);
};

/**
 * Validate file before upload
 * @param {File} file - The file to validate
 * @returns {Object} - Validation result with isValid and error message
 */
export const validateFile = (file) => {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }
  
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size exceeds 10MB limit' };
  }
  
  // Check file type
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'File type not allowed. Please upload PDF, DOC, DOCX, JPG, or PNG files.' };
  }
  
  return { isValid: true, error: null };
};

