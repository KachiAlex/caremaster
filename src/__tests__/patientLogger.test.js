/**
 * Unit Tests for Patient Logger
 * Tests the logging of patient activities and retrieval of logs
 */

import {
  logPatientInteraction,
  logPatientRegistration,
  logPatientProfileUpdate,
  logVitalSigns,
  logMedicationAdministered,
  logConsultation,
  logCarePlanUpdate,
  getPatientLogs,
  getLogsByCategory
} from '../utils/patientLogger';
import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

// Mock Firebase Firestore
jest.mock('../firebase/config', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' }))
}));

describe('Patient Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockClinicianInfo = {
    id: 'clinician-123',
    name: 'Dr. Jane Smith',
    role: 'doctor',
    email: 'jane@hospital.com',
    institutionId: 'institution-123'
  };

  describe('logPatientInteraction', () => {
    test('should log patient interaction with all required fields', async () => {
      const mockDocRef = { id: 'log-123' };
      addDoc.mockResolvedValue(mockDocRef);
      collection.mockReturnValue({});

      const logData = {
        patientId: 'UC-2025-0001',
        clinicianId: 'clinician-123',
        clinicianName: 'Dr. Jane Smith',
        clinicianRole: 'doctor',
        action: 'test_action',
        category: 'test',
        description: 'Test activity description',
        details: { testData: 'value' }
      };

      const logId = await logPatientInteraction(logData);

      expect(logId).toBe('log-123');
      expect(addDoc).toHaveBeenCalled();
      expect(collection).toHaveBeenCalledWith(db, 'patientLogs');

      const callArgs = addDoc.mock.calls[0][1];
      expect(callArgs.patientId).toBe('UC-2025-0001');
      expect(callArgs.clinicianId).toBe('clinician-123');
      expect(callArgs.clinicianName).toBe('Dr. Jane Smith');
      expect(callArgs.clinicianRole).toBe('doctor');
      expect(callArgs.action).toBe('test_action');
      expect(callArgs.description).toBe('Test activity description');
      expect(callArgs.details).toEqual({ testData: 'value' });
    });

    test('should throw error if required fields are missing', async () => {
      await expect(
        logPatientInteraction({ patientId: null, clinicianId: '123', clinicianName: 'Test', clinicianRole: 'doctor', action: 'test' })
      ).rejects.toThrow('Missing required log fields');

      await expect(
        logPatientInteraction({ patientId: 'UC-2025-0001', clinicianId: null, clinicianName: 'Test', clinicianRole: 'doctor', action: 'test' })
      ).rejects.toThrow('Missing required log fields');
    });
  });

  describe('logPatientRegistration', () => {
    test('should log patient registration', async () => {
      const mockDocRef = { id: 'log-456' };
      addDoc.mockResolvedValue(mockDocRef);
      collection.mockReturnValue({});

      const patientData = {
        name: 'John Doe',
        email: 'john@example.com'
      };

      const logId = await logPatientRegistration(
        'UC-2025-0001',
        mockClinicianInfo,
        patientData
      );

      expect(logId).toBe('log-456');
      expect(addDoc).toHaveBeenCalled();

      const callArgs = addDoc.mock.calls[0][1];
      expect(callArgs.action).toBe('patient_registered');
      expect(callArgs.category).toBe('registration');
      expect(callArgs.description).toContain('John Doe');
      expect(callArgs.details.patientName).toBe('John Doe');
    });
  });

  describe('logPatientProfileUpdate', () => {
    test('should log profile update with changed fields', async () => {
      const mockDocRef = { id: 'log-789' };
      addDoc.mockResolvedValue(mockDocRef);
      collection.mockReturnValue({});

      const updatedFields = {
        name: 'John Updated',
        phone: '+1234567890'
      };

      const logId = await logPatientProfileUpdate(
        'UC-2025-0001',
        mockClinicianInfo,
        updatedFields
      );

      expect(logId).toBe('log-789');
      expect(addDoc).toHaveBeenCalled();

      const callArgs = addDoc.mock.calls[0][1];
      expect(callArgs.action).toBe('profile_updated');
      expect(callArgs.category).toBe('profile');
      expect(callArgs.description).toContain('name, phone');
      expect(callArgs.details.changes).toEqual(updatedFields);
    });
  });

  describe('logVitalSigns', () => {
    test('should log vital signs recording', async () => {
      const mockDocRef = { id: 'log-vitals' };
      addDoc.mockResolvedValue(mockDocRef);
      collection.mockReturnValue({});

      const vitalSignData = {
        type: 'Blood Pressure',
        value: '120/80',
        unit: 'mmHg',
        status: 'normal'
      };

      const logId = await logVitalSigns(
        'UC-2025-0001',
        mockClinicianInfo,
        vitalSignData
      );

      expect(logId).toBe('log-vitals');
      expect(addDoc).toHaveBeenCalled();

      const callArgs = addDoc.mock.calls[0][1];
      expect(callArgs.action).toBe('vital_signs_recorded');
      expect(callArgs.category).toBe('vital_signs');
      expect(callArgs.description).toContain('Blood Pressure');
      expect(callArgs.details).toEqual(vitalSignData);
    });
  });

  describe('logMedicationAdministered', () => {
    test('should log medication administration', async () => {
      const mockDocRef = { id: 'log-med' };
      addDoc.mockResolvedValue(mockDocRef);
      collection.mockReturnValue({});

      const medicationData = {
        medicationName: 'Aspirin',
        dose: '100mg',
        route: 'oral'
      };

      const logId = await logMedicationAdministered(
        'UC-2025-0001',
        mockClinicianInfo,
        medicationData
      );

      expect(logId).toBe('log-med');
      expect(addDoc).toHaveBeenCalled();

      const callArgs = addDoc.mock.calls[0][1];
      expect(callArgs.action).toBe('medication_administered');
      expect(callArgs.category).toBe('medication');
      expect(callArgs.description).toContain('Aspirin');
      expect(callArgs.details).toEqual(medicationData);
    });
  });

  describe('logConsultation', () => {
    test('should log consultation', async () => {
      const mockDocRef = { id: 'log-consult' };
      addDoc.mockResolvedValue(mockDocRef);
      collection.mockReturnValue({});

      const consultationData = {
        consultationType: 'in-person',
        chiefComplaint: 'Headache',
        assessment: 'Migraine'
      };

      const logId = await logConsultation(
        'UC-2025-0001',
        mockClinicianInfo,
        consultationData
      );

      expect(logId).toBe('log-consult');
      expect(addDoc).toHaveBeenCalled();

      const callArgs = addDoc.mock.calls[0][1];
      expect(callArgs.action).toBe('consultation_conducted');
      expect(callArgs.category).toBe('consultation');
      expect(callArgs.description).toContain('Consultation');
      expect(callArgs.details).toEqual(consultationData);
    });
  });

  describe('logCarePlanUpdate', () => {
    test('should log care plan update', async () => {
      const mockDocRef = { id: 'log-careplan' };
      addDoc.mockResolvedValue(mockDocRef);
      collection.mockReturnValue({});

      const carePlanData = {
        planName: 'Post-Surgery Recovery',
        action: 'created'
      };

      const logId = await logCarePlanUpdate(
        'UC-2025-0001',
        mockClinicianInfo,
        carePlanData
      );

      expect(logId).toBe('log-careplan');
      expect(addDoc).toHaveBeenCalled();

      const callArgs = addDoc.mock.calls[0][1];
      expect(callArgs.action).toBe('care_plan_updated');
      expect(callArgs.category).toBe('care_plan');
      expect(callArgs.description).toContain('Post-Surgery Recovery');
      expect(callArgs.details).toEqual(carePlanData);
    });
  });

  describe('getPatientLogs', () => {
    test('should retrieve patient logs', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          patientId: 'UC-2025-0001',
          action: 'vital_signs_recorded',
          category: 'vital_signs',
          description: 'Vital signs recorded',
          timestamp: { toDate: () => new Date() },
          dateTime: new Date().toISOString()
        },
        {
          id: 'log-2',
          patientId: 'UC-2025-0001',
          action: 'medication_administered',
          category: 'medication',
          description: 'Medication administered',
          timestamp: { toDate: () => new Date() },
          dateTime: new Date().toISOString()
        }
      ];

      const mockSnapshot = {
        forEach: (callback) => {
          mockLogs.forEach(log => callback({ id: log.id, data: () => log }));
        }
      };

      getDocs.mockResolvedValue(mockSnapshot);
      collection.mockReturnValue({});
      query.mockReturnValue({});
      where.mockReturnValue({});
      orderBy.mockReturnValue({});
      limit.mockReturnValue({});

      const logs = await getPatientLogs('UC-2025-0001');

      expect(logs).toHaveLength(2);
      expect(logs[0].id).toBe('log-1');
      expect(logs[1].id).toBe('log-2');
      expect(getDocs).toHaveBeenCalled();
    });

    test('should filter logs by category', async () => {
      const mockSnapshot = {
        forEach: (callback) => {
          callback({
            id: 'log-1',
            data: () => ({
              patientId: 'UC-2025-0001',
              action: 'vital_signs_recorded',
              category: 'vital_signs',
              description: 'Vital signs recorded',
              timestamp: { toDate: () => new Date() },
              dateTime: new Date().toISOString()
            })
          });
        }
      };

      getDocs.mockResolvedValue(mockSnapshot);
      collection.mockReturnValue({});
      query.mockReturnValue({});
      where.mockReturnValue({});
      orderBy.mockReturnValue({});
      limit.mockReturnValue({});

      const logs = await getLogsByCategory('UC-2025-0001', 'vital_signs');

      expect(logs).toHaveLength(1);
      expect(logs[0].category).toBe('vital_signs');
    });

    test('should handle errors gracefully', async () => {
      getDocs.mockRejectedValue(new Error('Firestore error'));

      collection.mockReturnValue({});
      query.mockReturnValue({});
      where.mockReturnValue({});
      orderBy.mockReturnValue({});
      limit.mockReturnValue({});

      await expect(getPatientLogs('UC-2025-0001')).rejects.toThrow();
    });
  });
});

