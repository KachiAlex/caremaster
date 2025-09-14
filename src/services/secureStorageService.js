import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import encryptionService from './encryptionService';
import errorHandler from '../utils/errorHandler';
import logger from '../utils/logger';
import secureConfigService from './secureConfigService';

class SecureStorageService {
  constructor() {
    this.encryptionEnabled = secureConfigService.isFeatureEnabled('dataEncryption');
    this.auditLoggingEnabled = secureConfigService.isFeatureEnabled('auditLogging');
  }

  // Store sensitive data with encryption
  async storeSecureData(collectionName, docId, data, options = {}) {
    try {
      const { encrypt = true, audit = true } = options;
      
      // Prepare data for storage
      let dataToStore = { ...data };
      
      // Encrypt sensitive fields if enabled
      if (encrypt && this.encryptionEnabled) {
        dataToStore = encryptionService.encryptHealthData(dataToStore);
        dataToStore._encrypted = true;
      }

      // Add metadata
      dataToStore._metadata = {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        version: 1,
        encrypted: encrypt && this.encryptionEnabled
      };

      // Store in Firestore
      const docRef = doc(db, collectionName, docId);
      await setDoc(docRef, dataToStore);

      // Audit log
      if (audit && this.auditLoggingEnabled) {
        await this.logAuditEvent('CREATE', collectionName, docId, {
          encrypted: encrypt && this.encryptionEnabled,
          dataSize: JSON.stringify(data).length
        });
      }

      logger.info('Secure data stored', { 
        collection: collectionName, 
        docId,
        encrypted: encrypt && this.encryptionEnabled 
      });

      return docId;
    } catch (error) {
      logger.error('Failed to store secure data', { 
        collection: collectionName, 
        docId, 
        error: error.message 
      });
      errorHandler.handleError(error, { 
        context: 'store_secure_data', 
        collection: collectionName, 
        docId 
      });
      throw error;
    }
  }

  // Retrieve and decrypt sensitive data
  async getSecureData(collectionName, docId, options = {}) {
    try {
      const { decrypt = true, audit = true } = options;
      
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      let data = docSnap.data();
      
      // Decrypt if data is encrypted
      if (decrypt && data._encrypted && this.encryptionEnabled) {
        data = encryptionService.decryptHealthData(data);
        delete data._encrypted;
      }

      // Remove metadata
      delete data._metadata;

      // Audit log
      if (audit && this.auditLoggingEnabled) {
        await this.logAuditEvent('READ', collectionName, docId, {
          encrypted: data._encrypted || false
        });
      }

      logger.debug('Secure data retrieved', { 
        collection: collectionName, 
        docId,
        decrypted: decrypt && data._encrypted 
      });

      return data;
    } catch (error) {
      logger.error('Failed to get secure data', { 
        collection: collectionName, 
        docId, 
        error: error.message 
      });
      errorHandler.handleError(error, { 
        context: 'get_secure_data', 
        collection: collectionName, 
        docId 
      });
      throw error;
    }
  }

  // Update sensitive data with encryption
  async updateSecureData(collectionName, docId, updateData, options = {}) {
    try {
      const { encrypt = true, audit = true } = options;
      
      // Prepare update data
      let dataToUpdate = { ...updateData };
      
      // Encrypt sensitive fields if enabled
      if (encrypt && this.encryptionEnabled) {
        dataToUpdate = encryptionService.encryptHealthData(dataToUpdate);
        dataToUpdate._encrypted = true;
      }

      // Add update metadata
      dataToUpdate._metadata = {
        updatedAt: serverTimestamp(),
        version: serverTimestamp() // Increment version
      };

      // Update in Firestore
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, dataToUpdate);

      // Audit log
      if (audit && this.auditLoggingEnabled) {
        await this.logAuditEvent('UPDATE', collectionName, docId, {
          encrypted: encrypt && this.encryptionEnabled,
          updateSize: JSON.stringify(updateData).length
        });
      }

      logger.info('Secure data updated', { 
        collection: collectionName, 
        docId,
        encrypted: encrypt && this.encryptionEnabled 
      });

      return docId;
    } catch (error) {
      logger.error('Failed to update secure data', { 
        collection: collectionName, 
        docId, 
        error: error.message 
      });
      errorHandler.handleError(error, { 
        context: 'update_secure_data', 
        collection: collectionName, 
        docId 
      });
      throw error;
    }
  }

  // Delete sensitive data with audit
  async deleteSecureData(collectionName, docId, options = {}) {
    try {
      const { audit = true } = options;
      
      // Audit log before deletion
      if (audit && this.auditLoggingEnabled) {
        await this.logAuditEvent('DELETE', collectionName, docId, {
          reason: 'User requested deletion'
        });
      }

      // Delete from Firestore
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);

      logger.info('Secure data deleted', { 
        collection: collectionName, 
        docId 
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete secure data', { 
        collection: collectionName, 
        docId, 
        error: error.message 
      });
      errorHandler.handleError(error, { 
        context: 'delete_secure_data', 
        collection: collectionName, 
        docId 
      });
      throw error;
    }
  }

  // Query secure data with encryption handling
  async querySecureData(collectionName, queryConstraints = [], options = {}) {
    try {
      const { decrypt = true, audit = true } = options;
      
      const collectionRef = collection(db, collectionName);
      const q = query(collectionRef, ...queryConstraints);
      const querySnapshot = await getDocs(q);

      const results = [];
      querySnapshot.forEach((doc) => {
        let data = { id: doc.id, ...doc.data() };
        
        // Decrypt if data is encrypted
        if (decrypt && data._encrypted && this.encryptionEnabled) {
          data = encryptionService.decryptHealthData(data);
          delete data._encrypted;
        }

        // Remove metadata
        delete data._metadata;
        
        results.push(data);
      });

      // Audit log
      if (audit && this.auditLoggingEnabled) {
        await this.logAuditEvent('QUERY', collectionName, null, {
          resultCount: results.length,
          queryConstraints: queryConstraints.length
        });
      }

      logger.debug('Secure data queried', { 
        collection: collectionName, 
        resultCount: results.length 
      });

      return results;
    } catch (error) {
      logger.error('Failed to query secure data', { 
        collection: collectionName, 
        error: error.message 
      });
      errorHandler.handleError(error, { 
        context: 'query_secure_data', 
        collection: collectionName 
      });
      throw error;
    }
  }

  // Batch operations with encryption
  async batchSecureOperations(operations, options = {}) {
    try {
      const { encrypt = true, audit = true } = options;
      const results = [];

      for (const operation of operations) {
        const { type, collection, docId, data } = operation;
        
        switch (type) {
          case 'CREATE':
            const createId = await this.storeSecureData(collection, docId, data, { encrypt, audit: false });
            results.push({ type, id: createId, success: true });
            break;
            
          case 'UPDATE':
            await this.updateSecureData(collection, docId, data, { encrypt, audit: false });
            results.push({ type, id: docId, success: true });
            break;
            
          case 'DELETE':
            await this.deleteSecureData(collection, docId, { audit: false });
            results.push({ type, id: docId, success: true });
            break;
            
          default:
            results.push({ type, id: docId, success: false, error: 'Unknown operation type' });
        }
      }

      // Batch audit log
      if (audit && this.auditLoggingEnabled) {
        await this.logAuditEvent('BATCH', 'multiple', null, {
          operationCount: operations.length,
          successCount: results.filter(r => r.success).length
        });
      }

      logger.info('Batch secure operations completed', { 
        operationCount: operations.length,
        successCount: results.filter(r => r.success).length 
      });

      return results;
    } catch (error) {
      logger.error('Batch secure operations failed', { error: error.message });
      errorHandler.handleError(error, { context: 'batch_secure_operations' });
      throw error;
    }
  }

  // Data anonymization for analytics
  async anonymizeData(data, fieldsToAnonymize = []) {
    try {
      const anonymized = { ...data };
      
      fieldsToAnonymize.forEach(field => {
        if (anonymized[field]) {
          // Hash the field value for anonymization
          anonymized[field] = encryptionService.hash(anonymized[field]);
        }
      });

      logger.debug('Data anonymized', { 
        fieldsAnonymized: fieldsToAnonymize.length 
      });

      return anonymized;
    } catch (error) {
      logger.error('Data anonymization failed', { error: error.message });
      errorHandler.handleError(error, { context: 'anonymize_data' });
      throw error;
    }
  }

  // Audit logging
  async logAuditEvent(action, collection, docId, details = {}) {
    try {
      const auditEntry = {
        action,
        collection,
        docId,
        userId: secureConfigService.get('auth.currentUser?.uid'),
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
        ipAddress: await this.getClientIP(),
        ...details
      };

      const auditRef = doc(collection(db, 'auditLogs'));
      await setDoc(auditRef, auditEntry);

      logger.debug('Audit event logged', { action, collection, docId });
    } catch (error) {
      logger.error('Failed to log audit event', { error: error.message });
      // Don't throw error for audit logging failures
    }
  }

  // Get client IP
  async getClientIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  }

  // Data retention and cleanup
  async cleanupExpiredData(collectionName, expirationDays = 365) {
    try {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() - expirationDays);

      const q = query(
        collection(db, collectionName),
        where('_metadata.createdAt', '<', expirationDate)
      );

      const querySnapshot = await getDocs(q);
      const deletePromises = [];

      querySnapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });

      await Promise.all(deletePromises);

      logger.info('Expired data cleaned up', { 
        collection: collectionName, 
        deletedCount: deletePromises.length 
      });

      return deletePromises.length;
    } catch (error) {
      logger.error('Data cleanup failed', { 
        collection: collectionName, 
        error: error.message 
      });
      errorHandler.handleError(error, { context: 'cleanup_expired_data' });
      throw error;
    }
  }
}

// Create singleton instance
const secureStorageService = new SecureStorageService();

export default secureStorageService;
