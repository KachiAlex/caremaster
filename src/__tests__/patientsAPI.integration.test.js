/**
 * Integration Tests for Client API
 * Tests Client registration, updates, and logging integration
 */

import { createClient, updatePatient, getPatientByPatientId, searchPatients } from '../api/patientsAPI';
import { logPatientRegistration, logPatientProfileUpdate } from '../utils/patientLogger';
import { generateClientId } from '../utils/clientIdGenerator';

// Mock dependencies
jest.mock('../utils/clientIdGenerator');
jest.mock('../utils/patientLogger');
jest.mock('../firebase/config', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' }))
}));

describe('Client API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockRegisteredBy = {
    id: 'admin-123',
    uid: 'admin-123',
    name: 'Admin User',
    email: 'admin@hospital.com',
    role: 'admin',
    institutionId: 'institution-123'
  };

  describe('createClient', () => {
    test('should create Client with generated ID and log registration', async () => {
      const mockPatientId = 'UC-2025-0001';
      const mockDocRef = { id: 'firestore-doc-123' };
      const mockLogId = 'log-456';

      generateClientId.mockResolvedValue(mockPatientId);
      const { addDoc } = require('firebase/firestore');
      addDoc.mockResolvedValue(mockDocRef);
      logPatientRegistration.mockResolvedValue(mockLogId);

      const { collection } = require('firebase/firestore');
      collection.mockReturnValue({});

      const clientData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        institutionId: 'institution-123'
      };

      const result = await createClient(clientData, mockRegisteredBy);

      expect(result.clientId).toBe(mockPatientId);
      expect(result.id).toBe('firestore-doc-123');
      expect(generateClientId).toHaveBeenCalledWith('institution-123');
      expect(logPatientRegistration).toHaveBeenCalledWith(
        mockPatientId,
        mockRegisteredBy,
        expect.objectContaining({
          name: 'John Doe',
          registrationMethod: 'hospital_registration'
        })
      );
    });

    test('should handle logging errors gracefully', async () => {
      const mockPatientId = 'UC-2025-0001';
      const mockDocRef = { id: 'firestore-doc-123' };

      generateClientId.mockResolvedValue(mockPatientId);
      const { addDoc } = require('firebase/firestore');
      addDoc.mockResolvedValue(mockDocRef);
      logPatientRegistration.mockRejectedValue(new Error('Logging failed'));

      const { collection } = require('firebase/firestore');
      collection.mockReturnValue({});

      const clientData = {
        name: 'John Doe',
        email: 'john@example.com',
        institutionId: 'institution-123'
      };

      // Should still succeed even if logging fails
      const result = await createClient(clientData, mockRegisteredBy);
      expect(result.clientId).toBe(mockPatientId);
    });
  });

  describe('updatePatient', () => {
    test('should update Client and log profile update', async () => {
      const mockLogId = 'log-789';
      const mockPatientDoc = {
        exists: () => true,
        data: () => ({ clientId: 'UC-2025-0001', name: 'John Doe' })
      };

      const { updateDoc, getDoc, doc } = require('firebase/firestore');
      updateDoc.mockResolvedValue();
      getDoc.mockResolvedValue(mockPatientDoc);
      doc.mockReturnValue({});
      logPatientProfileUpdate.mockResolvedValue(mockLogId);

      const updateData = {
        name: 'John Updated',
        phone: '+1234567890'
      };

      const result = await updatePatient('firestore-doc-123', updateData, mockRegisteredBy);

      expect(result).toBe(true);
      expect(updateDoc).toHaveBeenCalled();
      expect(logPatientProfileUpdate).toHaveBeenCalledWith(
        'UC-2025-0001',
        mockRegisteredBy,
        updateData
      );
    });

    test('should handle missing clientId gracefully', async () => {
      const mockPatientDoc = {
        exists: () => true,
        data: () => ({ name: 'John Doe' }) // No clientId field
      };

      const { updateDoc, getDoc, doc } = require('firebase/firestore');
      updateDoc.mockResolvedValue();
      getDoc.mockResolvedValue(mockPatientDoc);
      doc.mockReturnValue({});
      logPatientProfileUpdate.mockResolvedValue('log-789');

      const updateData = { name: 'John Updated' };

      // Should use Firestore doc ID as fallback
      const result = await updatePatient('firestore-doc-123', updateData, mockRegisteredBy);

      expect(result).toBe(true);
      expect(logPatientProfileUpdate).toHaveBeenCalledWith(
        'firestore-doc-123', // Falls back to doc ID
        mockRegisteredBy,
        updateData
      );
    });
  });

  describe('getPatientByPatientId', () => {
    test('should retrieve Client by simple Client ID', async () => {
      const mockPatientData = {
        clientId: 'UC-2025-0001',
        name: 'John Doe',
        email: 'john@example.com'
      };

      const mockSnapshot = {
        empty: false,
        docs: [{
          id: 'firestore-doc-123',
          data: () => mockPatientData
        }]
      };

      const { getDocs, collection, query, where } = require('firebase/firestore');
      getDocs.mockResolvedValue(mockSnapshot);
      collection.mockReturnValue({});
      query.mockReturnValue({});
      where.mockReturnValue({});

      const Client = await getPatientByPatientId('UC-2025-0001');

      expect(client.clientId).toBe('UC-2025-0001');
      expect(client.name).toBe('John Doe');
      expect(where).toHaveBeenCalledWith('clientId', '==', 'UC-2025-0001');
    });

    test('should throw error if Client not found', async () => {
      const mockSnapshot = {
        empty: true,
        docs: []
      };

      const { getDocs, collection, query, where } = require('firebase/firestore');
      getDocs.mockResolvedValue(mockSnapshot);
      collection.mockReturnValue({});
      query.mockReturnValue({});
      where.mockReturnValue({});

      await expect(getPatientByPatientId('UC-2025-9999')).rejects.toThrow('not found');
    });
  });

  describe('searchPatients', () => {
    test('should search clients by Client ID', async () => {
      const mockPatients = [
        {
          id: 'doc-1',
          data: () => ({
            clientId: 'UC-2025-0001',
            name: 'John Doe',
            email: 'john@example.com'
          })
        }
      ];

      const mockSnapshot = {
        forEach: (callback) => {
          mockPatients.forEach(Client => callback(Client));
        }
      };

      const { getDocs, collection, query, where, orderBy, limit } = require('firebase/firestore');
      getDocs.mockResolvedValue(mockSnapshot);
      collection.mockReturnValue({});
      query.mockReturnValue({});
      where.mockReturnValue({});
      orderBy.mockReturnValue({});
      limit.mockReturnValue({});

      const results = await searchPatients('UC-2025-0001');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].clientId).toBe('UC-2025-0001');
    });

    test('should search clients by name', async () => {
      const mockPatients = [
        {
          id: 'doc-1',
          data: () => ({
            clientId: 'UC-2025-0001',
            name: 'John Doe',
            fullName: 'John Doe',
            email: 'john@example.com'
          })
        }
      ];

      const mockSnapshot = {
        forEach: (callback) => {
          mockPatients.forEach(Client => callback(Client));
        }
      };

      const { getDocs, collection } = require('firebase/firestore');
      getDocs.mockResolvedValue(mockSnapshot);
      collection.mockReturnValue({});

      const results = await searchPatients('John');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('John');
    });
  });
});

