import { storage } from '../backend/config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'backend/storage';

/**
 * Client Document Upload Utility
 * 
 * Handles file uploads for Client documents (ID cards, referral letters, medical records)
 * Integrated with CareMaster Cloudflare R2 backend storage.
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

/**
 * Validate file before upload
 * @param {File} file - File to validate
 * @returns {Object} Validation result { valid: boolean, error: string }
 */
export const validateFile = (file) => {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
    };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'File type not allowed. Please upload PDF, Word, or image files.'
    };
  }

  return { valid: true, error: null };
};

/**
 * Upload Client document to R2 storage via backend
 * @param {File} file - File to upload
 * @param {string} clientId - Client ID (registration number or UUID)
 * @param {string} institutionId - Institution ID
 * @param {string} documentType - Type of document (profile_photo, id_card, referral_letter, etc)
 * @returns {Promise<Object>} Upload result with URL
 */
export const uploadClientDocument = async (
  file,
  clientId,
  institutionId,
  documentType
) => {
  try {
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${documentType}_${timestamp}_${safeFileName}`;
    
    // Path structure: clients/{institutionId}/{clientId}/documents/{fileName}
    const storagePath = `clients/${institutionId}/${clientId}/documents/${fileName}`;

    // Create reference
    const storageRef = ref(storage, storagePath);

    // Upload
    const result = await uploadBytes(storageRef, file);

    return {
      success: true,
      url: result.downloadURL,
      key: storagePath,
      documentType,
      originalName: file.name,
      uploadedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error uploading ${documentType}:`, error);
    throw error;
  }
};

/**
 * Delete a document from storage
 */
export const deleteClientDocument = async (storagePath) => {
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

export const getDocumentTypeLabel = (documentType) => {
  const labels = {
    profile_photo: 'Profile Photo',
    government_id: 'Government ID',
    id_card: 'ID Card',
    referral_letter: 'Referral Letter',
    medical_record: 'Medical Record',
    insurance_card: 'Insurance Card',
    clinical_note: 'Clinical Note',
    care_instruction: 'Care Instruction',
    other: 'Document'
  };
  return labels[documentType] || documentType.replace(/_/g, ' ');
};

export default {
  validateFile,
  uploadClientDocument,
  deleteClientDocument,
  getDocumentTypeLabel
};
