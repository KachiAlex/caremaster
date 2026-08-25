import { storage } from '../backend/config';
import { uploadBytes, getDownloadURL, deleteObject } from 'backend/storage';
/**
 * Client Document Upload Utility
 * 
 * Handles file uploads for Client documents (ID cards, referral letters, medical records)
 */


const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf']
};

/**
 * Validate file before upload
 * @param {File} file - File to validate
 * @returns {Object} Validation result
 */
export const validateFile = (file) => {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
    };
  }

  // Check file type
  if (!ALLOWED_TYPES[file.type]) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${Object.keys(ALLOWED_TYPES).join(', ')}`
    };
  }

  return { valid: true };
};

/**
 * Upload Client document
 * @param {File} file - File to upload
 * @param {string} clientId - Client ID
 * @param {string} institutionId - Institution ID
 * @param {string} documentType - Type of document (id_card, referral_letter, medical_record)
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Upload result with download URL
 */
export const uploadClientDocument = async (
  file,
  clientId,
  institutionId,
  documentType,
  onProgress = null
) => {
  try {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Create storage path
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${documentType}_${timestamp}.${fileExtension}`;
    const storagePath = `clients/${institutionId}/${clientId}/documents/${fileName}`;

    // Create storage reference
    const storageRef = ref(storage, storagePath);

    // Upload file
    const snapshot = await uploadBytes(storageRef, file);

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      success: true,
      fileName,
      downloadURL,
      storagePath,
      fileSize: file.size,
      fileType: file.type,
      uploadedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error uploading Client document:', error);
    throw error;
  }
};

/**
 * Upload multiple Client documents
 * @param {Array<File>} files - Files to upload
 * @param {string} clientId - Client ID
 * @param {string} institutionId - Institution ID
 * @param {string} documentType - Type of document
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Array>} Array of upload results
 */
export const uploadMultipleDocuments = async (
  files,
  clientId,
  institutionId,
  documentType,
  onProgress = null
) => {
  const uploadPromises = files.map((file, index) => {
    return uploadClientDocument(
      file,
      clientId,
      institutionId,
      `${documentType}_${index + 1}`,
      onProgress
    );
  });

  return Promise.all(uploadPromises);
};

/**
 * Delete Client document
 * @param {string} storagePath - Storage path of the document
 * @returns {Promise<void>}
 */
export const deletePatientDocument = async (storagePath) => {
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting Client document:', error);
    throw error;
  }
};

/**
 * Get document type label
 * @param {string} documentType - Document type
 * @returns {string} Human-readable label
 */
export const getDocumentTypeLabel = (documentType) => {
  const labels = {
    id_card: 'ID Card',
    referral_letter: 'Referral Letter',
    medical_record: 'Medical Record',
    insurance_card: 'Insurance Card',
    other: 'Other Document'
  };
  return labels[documentType] || documentType;
};

export default {
  validateFile,
  uploadClientDocument,
  uploadMultipleDocuments,
  deletePatientDocument,
  getDocumentTypeLabel,
  MAX_FILE_SIZE,
  ALLOWED_TYPES
};

