/**
 * Integration Tests for Patient API
 * Tests patient registration, updates, and logging integration
 */

import { createPatient, updatePatient, getPatientByPatientId, searchPatients } from '../api/patientsAPI';
import { logPatientRegistration, logPatientProfileUpdate } from '../utils/patientLogger';
import { generatePatientId } from '../utils/patientIdGenerator';

// Mock dependencies
jest.mock('../utils/patientIdGenerator');
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

describe('Patient API Integration Tests', () => {
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

  describe('createPatient', () => {
    test('should create patient with generated ID and log registration', async () => {
      const mockPatientId = 'UC-2025-0001';
      const mockDocRef = { id: 'firestore-doc-123' };
      const mockLogId = 'log-456';

      generatePatientId.mockResolvedValue(mockPatientId);
      const { addDoc } = require('firebase/firestore');
      addDoc.mockResolvedValue(mockDocRef);
      logPatientRegistration.mockResolvedValue(mockLogId);

      const { collection } = require('firebase/firestore');
      collection.mockReturnValue({});

      const patientData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        institutionId: 'institution-123'
      };

      const result = await createPatient(patientData, mockRegisteredBy);

      expect(result.patientId).toBe(mockPatientId);
      expect(result.id).toBe('firestore-doc-123');
      expect(generatePatientId).toHaveBeenCalledWith('institution-123');
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

      generatePatientId.mockResolvedValue(mockPatientId);
      const { addDoc } = require('firebase/firestore');
      addDoc.mockResolvedValue(mockDocRef);
      logPatientRegistration.mockRejectedValue(new Error('Logging failed'));

      const { collection } = require('firebase/firestore');
      collection.mockReturnValue({});

      const patientData = {
        name: 'John Doe',
        email: 'john@example.com',
        institutionId: 'institution-123'
      };

      // Should still succeed even if logging fails
      const result = await createPatient(patientData, mockRegisteredBy);
      expect(result.patientId).toBe(mockPatientId);
    });
  });

  describe('updatePatient', () => {
    test('should update patient and log profile update', async () => {
      const mockLogId = 'log-789';
      const mockPatientDoc = {
        exists: () => true,
        data: () => ({ patientId: 'UC-2025-0001', name: 'John Doe' })
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

    test('should handle missing patientId gracefully', async () => {
      const mockPatientDoc = {
        exists: () => true,
        data: () => ({ name: 'John Doe' }) // No patientId field
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
    test('should retrieve patient by simple patient ID', async () => {
      const mockPatientData = {
        patientId: 'UC-2025-0001',
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

      const patient = await getPatientByPatientId('UC-2025-0001');

      expect(patient.patientId).toBe('UC-2025-0001');
      expect(patient.name).toBe('John Doe');
      expect(where).toHaveBeenCalledWith('patientId', '==', 'UC-2025-0001');
    });

    test('should throw error if patient not found', async () => {
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
    test('should search patients by patient ID', async () => {
      const mockPatients = [
        {
          id: 'doc-1',
          data: () => ({
            patientId: 'UC-2025-0001',
            name: 'John Doe',
            email: 'john@example.com'
          })
        }
      ];

      const mockSnapshot = {
        forEach: (callback) => {
          mockPatients.forEach(patient => callback(patient));
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
      expect(results[0].patientId).toBe('UC-2025-0001');
    });

    test('should search patients by name', async () => {
      const mockPatients = [
        {
          id: 'doc-1',
          data: () => ({
            patientId: 'UC-2025-0001',
            name: 'John Doe',
            fullName: 'John Doe',
            email: 'john@example.com'
          })
        }
      ];

      const mockSnapshot = {
        forEach: (callback) => {
          mockPatients.forEach(patient => callback(patient));
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

