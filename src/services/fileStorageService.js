import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  uploadBytesResumable,
  getMetadata
} from 'firebase/storage';
import { storage } from '../firebase/config';
import logger from '../utils/logger';

class FileStorageService {
  constructor() {
    this.storage = storage;
  }

  // Upload a single file
  async uploadFile(file, path, onProgress = null) {
    try {
      logger.debug('Uploading file', { fileName: file.name, path });
      
      const storageRef = ref(this.storage, path);
      
      // Create upload task
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            // Progress tracking
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) {
              onProgress(progress);
            }
            logger.debug('Upload progress', { progress: Math.round(progress) });
          },
          (error) => {
            logger.error('Upload failed', error);
            reject(error);
          },
          async () => {
            try {
              // Upload completed, get download URL
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              logger.info('File uploaded successfully', { 
                fileName: file.name, 
                downloadURL,
                path 
              });
              
              resolve({
                name: file.name,
                size: file.size,
                type: file.type,
                downloadURL,
                path,
                uploadedAt: new Date().toISOString()
              });
            } catch (error) {
              logger.error('Failed to get download URL', error);
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      logger.error('File upload error', error);
      throw error;
    }
  }

  // Upload multiple files
  async uploadFiles(files, basePath, onProgress = null) {
    try {
      const uploadPromises = files.map((file, index) => {
        const filePath = `${basePath}/${Date.now()}_${index}_${file.name}`;
        return this.uploadFile(file, filePath, (progress) => {
          if (onProgress) {
            onProgress(index, progress);
          }
        });
      });

      const results = await Promise.all(uploadPromises);
      logger.info('Multiple files uploaded', { count: results.length });
      return results;
    } catch (error) {
      logger.error('Multiple file upload error', error);
      throw error;
    }
  }

  // Delete a file
  async deleteFile(path) {
    try {
      const fileRef = ref(this.storage, path);
      await deleteObject(fileRef);
      logger.info('File deleted successfully', { path });
      return true;
    } catch (error) {
      logger.error('File deletion error', error);
      throw error;
    }
  }

  // Get file metadata
  async getFileMetadata(path) {
    try {
      const fileRef = ref(this.storage, path);
      const metadata = await getMetadata(fileRef);
      return metadata;
    } catch (error) {
      logger.error('Get file metadata error', error);
      throw error;
    }
  }

  // Generate unique file path
  generateFilePath(userId, category, fileName) {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `users/${userId}/${category}/${timestamp}_${sanitizedFileName}`;
  }

  // Upload medical documents
  async uploadMedicalDocuments(userId, files, onProgress = null) {
    try {
      const basePath = `users/${userId}/medical-documents`;
      return await this.uploadFiles(files, basePath, onProgress);
    } catch (error) {
      logger.error('Medical documents upload error', error);
      throw error;
    }
  }

  // Upload medication documents
  async uploadMedicationDocuments(userId, files, onProgress = null) {
    try {
      const basePath = `users/${userId}/medication-documents`;
      return await this.uploadFiles(files, basePath, onProgress);
    } catch (error) {
      logger.error('Medication documents upload error', error);
      throw error;
    }
  }

  // Upload profile documents
  async uploadProfileDocuments(userId, files, onProgress = null) {
    try {
      const basePath = `users/${userId}/profile-documents`;
      return await this.uploadFiles(files, basePath, onProgress);
    } catch (error) {
      logger.error('Profile documents upload error', error);
      throw error;
    }
  }

  // Validate file type
  validateFileType(file, allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']) {
    return allowedTypes.includes(file.type);
  }

  // Validate file size
  validateFileSize(file, maxSize = 5 * 1024 * 1024) { // 5MB default
    return file.size <= maxSize;
  }

  // Get file extension
  getFileExtension(fileName) {
    return fileName.split('.').pop().toLowerCase();
  }

  // Check if file is image
  isImageFile(file) {
    return file.type.startsWith('image/');
  }

  // Check if file is PDF
  isPDFFile(file) {
    return file.type === 'application/pdf';
  }

  // Check if file is document
  isDocumentFile(file) {
    const documentTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    return documentTypes.includes(file.type);
  }
}

// Create and export singleton instance
const fileStorageService = new FileStorageService();
export default fileStorageService;
