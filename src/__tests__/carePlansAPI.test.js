/**
 * Tests for Care Plans API Logging Integration
 * Verifies that care plan operations are properly logged to patient logs
 */

import { createCarePlan, updateCarePlan } from '../api/carePlansAPI';
import { logCarePlanUpdate } from '../utils/patientLogger';

// Mock dependencies
jest.mock('../utils/patientLogger');
jest.mock('../firebase/config', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' }))
}));

describe('Care Plans API Logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockClinicianInfo = {
    id: 'doctor-123',
    name: 'Dr. Jane Smith',
    role: 'doctor',
    email: 'jane@hospital.com',
    institutionId: 'institution-123'
  };

  describe('createCarePlan', () => {
    test('should log care plan creation to patient logs', async () => {
      const mockDocRef = { id: 'careplan-123' };
      const { addDoc } = require('firebase/firestore');
      addDoc.mockResolvedValue(mockDocRef);
      
      const { collection, getDoc, doc } = require('firebase/firestore');
      collection.mockReturnValue({});
      doc.mockReturnValue({});
      
      // Mock patient document
      const mockPatientDoc = {
        exists: () => true,
        data: () => ({ patientId: 'UC-2025-0001' })
      };
      getDoc.mockResolvedValue(mockPatientDoc);
      
      logCarePlanUpdate.mockResolvedValue('log-789');

      const carePlanData = {
        clientId: 'patient-doc-id',
        diagnosis: 'Hypertension',
        careObjectives: ['Manage blood pressure'],
        dailyCareActivities: ['Medication administration']
      };

      await createCarePlan(carePlanData, mockClinicianInfo);

      expect(logCarePlanUpdate).toHaveBeenCalled();
      const logCall = logCarePlanUpdate.mock.calls[0];
      expect(logCall[0]).toBe('UC-2025-0001'); // patientSimpleId
      expect(logCall[1]).toEqual(mockClinicianInfo);
      expect(logCall[2].action).toBe('created');
    });

    test('should not log if clinician info not provided', async () => {
      const mockDocRef = { id: 'careplan-123' };
      const { addDoc } = require('firebase/firestore');
      addDoc.mockResolvedValue(mockDocRef);
      
      const { collection } = require('firebase/firestore');
      collection.mockReturnValue({});

      const carePlanData = {
        clientId: 'patient-doc-id',
        diagnosis: 'Hypertension'
      };

      await createCarePlan(carePlanData);

      expect(logCarePlanUpdate).not.toHaveBeenCalled();
    });
  });

  describe('updateCarePlan', () => {
    test('should log care plan update to patient logs', async () => {
      const { updateDoc, getDoc, doc } = require('firebase/firestore');
      updateDoc.mockResolvedValue();
      doc.mockReturnValue({});
      
      // Mock existing care plan
      const mockCarePlanDoc = {
        exists: () => true,
        data: () => ({
          clientId: 'patient-doc-id',
          diagnosis: 'Hypertension'
        })
      };
      getDoc.mockResolvedValueOnce(mockCarePlanDoc);
      
      // Mock patient document
      const mockPatientDoc = {
        exists: () => true,
        data: () => ({ patientId: 'UC-2025-0001' })
      };
      getDoc.mockResolvedValueOnce(mockPatientDoc);
      
      logCarePlanUpdate.mockResolvedValue('log-999');

      const updateData = {
        diagnosis: 'Hypertension - Controlled',
        careObjectives: ['Manage blood pressure', 'Monitor daily']
      };

      await updateCarePlan('careplan-123', updateData, mockClinicianInfo);

      expect(logCarePlanUpdate).toHaveBeenCalled();
      const logCall = logCarePlanUpdate.mock.calls[0];
      expect(logCall[0]).toBe('UC-2025-0001');
      expect(logCall[1]).toEqual(mockClinicianInfo);
      expect(logCall[2].action).toBe('updated');
    });
  });
});

