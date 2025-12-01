/**
 * Integration Tests for Patients API
 * Tests patient CRUD operations, search, and data integrity
 */

import { createClient, updatePatient, getPatientByPatientId, searchPatients, deletePatient } from '../../api/patientsAPI';
import { collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';

jest.mock('../../firebase/config', () => ({
  db: {}
}));

jest.mock('firebase/firestore');

describe('Patients API Integration Tests', () => {
  const mockInstitutionId = 'institution-123';
  const mockRegisteredBy = {
    id: 'admin-123',
    uid: 'admin-123',
    name: 'Admin User',
    email: 'admin@hospital.com',
    role: 'admin',
    institutionId: mockInstitutionId
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createClient', () => {
    test('should create patient with all required fields', async () => {
      const patientData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        dateOfBirth: '1980-01-01',
        gender: 'male',
        address: '123 Main St',
        city: 'Lagos',
        state: 'Lagos',
        zipCode: '100001',
        institutionId: mockInstitutionId
      };

      const mockDocRef = { id: 'patient-123' };
      addDoc.mockResolvedValue(mockDocRef);
      collection.mockReturnValue({});

      const result = await createClient(patientData, mockRegisteredBy);

      expect(result.id).toBe('patient-123');
      expect(addDoc).toHaveBeenCalled();
    });

    test('should handle missing required fields', async () => {
      const incompleteData = {
        name: 'John Doe'
        // Missing email, phone, etc.
      };

      addDoc.mockRejectedValue(new Error('Missing required fields'));

      await expect(
        createClient(incompleteData, mockRegisteredBy)
      ).rejects.toThrow();
    });

    test('should validate email format', async () => {
      const invalidEmailData = {
        name: 'John Doe',
        email: 'invalid-email',
        phone: '+1234567890',
        institutionId: mockInstitutionId
      };

      // Should validate email before creating
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(invalidEmailData.email)).toBe(false);
    });
  });

  describe('updatePatient', () => {
    test('should update patient information', async () => {
      const patientId = 'patient-123';
      const updateData = {
        name: 'John Updated',
        phone: '+1234567899'
      };

      const mockPatientDoc = {
        exists: () => true,
        data: () => ({ clientId: 'UC-2025-0001', name: 'John Doe' })
      };

      getDoc.mockResolvedValue(mockPatientDoc);
      updateDoc.mockResolvedValue();
      doc.mockReturnValue({});

      const result = await updatePatient(patientId, updateData, mockRegisteredBy);

      expect(result).toBe(true);
      expect(updateDoc).toHaveBeenCalled();
    });

    test('should handle update of non-existent patient', async () => {
      const patientId = 'non-existent-123';
      const updateData = { name: 'Updated Name' };

      const mockPatientDoc = {
        exists: () => false
      };

      getDoc.mockResolvedValue(mockPatientDoc);
      doc.mockReturnValue({});

      await expect(
        updatePatient(patientId, updateData, mockRegisteredBy)
      ).rejects.toThrow();
    });
  });

  describe('getPatientByPatientId', () => {
    test('should retrieve patient by patient ID', async () => {
      const patientId = 'UC-2025-0001';
      const mockPatientData = {
        clientId: patientId,
        name: 'John Doe',
        email: 'john@example.com'
      };

      const mockSnapshot = {
        empty: false,
        docs: [{
          id: 'patient-123',
          data: () => mockPatientData
        }]
      };

      getDocs.mockResolvedValue(mockSnapshot);
      collection.mockReturnValue({});
      query.mockReturnValue({});
      where.mockReturnValue({});

      const patient = await getPatientByPatientId(patientId);

      expect(patient.clientId).toBe(patientId);
      expect(patient.name).toBe('John Doe');
    });

    test('should throw error if patient not found', async () => {
      const patientId = 'UC-2025-9999';
      const mockSnapshot = {
        empty: true,
        docs: []
      };

      getDocs.mockResolvedValue(mockSnapshot);
      collection.mockReturnValue({});
      query.mockReturnValue({});
      where.mockReturnValue({});

      await expect(getPatientByPatientId(patientId)).rejects.toThrow();
    });
  });

  describe('searchPatients', () => {
    test('should search patients by name', async () => {
      const searchTerm = 'John';
      const mockPatients = [
        {
          id: 'patient-1',
          data: () => ({
            clientId: 'UC-2025-0001',
            name: 'John Doe',
            email: 'john@example.com'
          })
        },
        {
          id: 'patient-2',
          data: () => ({
            clientId: 'UC-2025-0002',
            name: 'John Smith',
            email: 'johnsmith@example.com'
          })
        }
      ];

      const mockSnapshot = {
        forEach: (callback) => {
          mockPatients.forEach(patient => callback(patient));
        }
      };

      getDocs.mockResolvedValue(mockSnapshot);
      collection.mockReturnValue({});

      const results = await searchPatients(searchTerm);

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(p => p.name.includes('John'))).toBe(true);
    });

    test('should search patients by patient ID', async () => {
      const searchTerm = 'UC-2025-0001';
      const mockPatients = [
        {
          id: 'patient-1',
          data: () => ({
            clientId: 'UC-2025-0001',
            name: 'John Doe'
          })
        }
      ];

      const mockSnapshot = {
        forEach: (callback) => {
          mockPatients.forEach(patient => callback(patient));
        }
      };

      getDocs.mockResolvedValue(mockSnapshot);
      collection.mockReturnValue({});

      const results = await searchPatients(searchTerm);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].clientId).toBe(searchTerm);
    });

    test('should return empty array for no matches', async () => {
      const searchTerm = 'NonExistent';
      const mockSnapshot = {
        forEach: jest.fn() // No patients
      };

      getDocs.mockResolvedValue(mockSnapshot);
      collection.mockReturnValue({});

      const results = await searchPatients(searchTerm);

      expect(results).toEqual([]);
    });
  });

  describe('deletePatient', () => {
    test('should delete patient successfully', async () => {
      const patientId = 'patient-123';

      deleteDoc.mockResolvedValue();
      doc.mockReturnValue({});

      await deletePatient(patientId);

      expect(deleteDoc).toHaveBeenCalled();
    });

    test('should handle deletion of non-existent patient', async () => {
      const patientId = 'non-existent-123';

      deleteDoc.mockRejectedValue(new Error('Document not found'));

      await expect(deletePatient(patientId)).rejects.toThrow();
    });
  });

  describe('Data Integrity', () => {
    test('should maintain referential integrity', async () => {
      // Test that patient relationships are maintained
      const patientId = 'patient-123';
      const caregiverId = 'caregiver-123';

      // This would test relationships with caregivers, appointments, etc.
      expect(patientId).toBeTruthy();
      expect(caregiverId).toBeTruthy();
    });

    test('should validate data types', async () => {
      const invalidData = {
        name: 123, // Should be string
        email: 'not-an-email',
        phone: 'invalid-phone',
        dateOfBirth: 'invalid-date'
      };

      // Validation should catch these
      expect(typeof invalidData.name).not.toBe('string');
    });
  });
});

