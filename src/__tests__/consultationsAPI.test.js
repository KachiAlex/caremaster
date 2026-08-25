/**
 * Tests for Consultation API
 * Verifies that consultations are created correctly
 */

import { createConsultation } from '../api/consultationsAPI';

// Mock dependencies
jest.mock('../api/clientActivitiesAPI', () => ({
  logClientActivity: jest.fn().mockResolvedValue('log-activity-id')
}));

jest.mock('../api/notificationsAPI', () => ({
  notificationsAPI: {
    createNotification: jest.fn().mockResolvedValue('notification-id')
  }
}));

jest.mock('../api/autoBillingAPI', () => ({
  generateBillFromConsultation: jest.fn().mockResolvedValue('bill-id')
}));

jest.mock('../backend/config', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' }))
}));

describe('Consultation API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create consultation successfully', async () => {
    const mockDocRef = { id: 'consultation-123' };
    const { addDoc, collection, getDocs, query, where } = require('firebase/firestore');
    addDoc.mockResolvedValue(mockDocRef);
    collection.mockReturnValue({});
    query.mockReturnValue({});
    where.mockReturnValue({});
    getDocs.mockResolvedValue({ docs: [] }); // Empty admins list

    const consultationData = {
      clientId: 'Client-doc-id',
      clientName: 'John Doe',
      doctorId: 'doctor-123',
      doctorName: 'Dr. Jane Smith',
      doctorRole: 'doctor',
      doctorEmail: 'jane@hospital.com',
      institutionId: 'institution-123',
      consultationType: 'in-person',
      chiefComplaint: 'Headache',
      assessment: 'Migraine'
    };

    const result = await createConsultation(consultationData);

    expect(result.id).toBe('consultation-123');
    expect(addDoc).toHaveBeenCalled();
    expect(collection).toHaveBeenCalled();
  });

  test('should throw error if required fields are missing', async () => {
    const consultationData = {
      clientName: 'John Doe',
      // Missing clientId and doctorId
      doctorName: 'Dr. Jane Smith'
    };

    // validateAPIRequest throws APIError with "Validation failed" message
    await expect(createConsultation(consultationData)).rejects.toThrow();
  });

  test('should handle errors when creating consultation', async () => {
    const { addDoc, collection } = require('firebase/firestore');
    collection.mockReturnValue({});
    addDoc.mockRejectedValue(new Error('Firestore error'));

    const consultationData = {
      clientId: 'Client-doc-id',
      clientName: 'John Doe',
      doctorId: 'doctor-123',
      doctorName: 'Dr. Jane Smith',
      institutionId: 'institution-123',
      consultationType: 'in-person',
      chiefComplaint: 'Headache'
    };

    await expect(createConsultation(consultationData)).rejects.toThrow();
  });
});

