/**
 * Tests for Consultation API Logging Integration
 * Verifies that consultations are properly logged to Client logs
 */

import { createConsultation } from '../api/consultationsAPI';
import { logConsultation } from '../utils/patientLogger';

// Mock dependencies
jest.mock('../utils/patientLogger');
jest.mock('../firebase/config', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  getDoc: jest.fn(),
  doc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' }))
}));

describe('Consultation API Logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should log consultation to Client logs when created', async () => {
    const mockDocRef = { id: 'consultation-123' };
    const { addDoc } = require('firebase/firestore');
    addDoc.mockResolvedValue(mockDocRef);
    
    const { collection, getDoc, doc } = require('firebase/firestore');
    collection.mockReturnValue({});
    doc.mockReturnValue({});
    
    // Mock Client document
    const mockPatientDoc = {
      exists: () => true,
      data: () => ({ clientId: 'UC-2025-0001' })
    };
    getDoc.mockResolvedValue(mockPatientDoc);
    
    logConsultation.mockResolvedValue('log-456');

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

    await createConsultation(consultationData);

    expect(logConsultation).toHaveBeenCalled();
    const logCall = logConsultation.mock.calls[0];
    expect(logCall[0]).toBe('UC-2025-0001'); // patientSimpleId
    expect(logCall[1]).toEqual({
      id: 'doctor-123',
      name: 'Dr. Jane Smith',
      role: 'doctor',
      email: 'jane@hospital.com',
      institutionId: 'institution-123'
    });
  });

  test('should handle logging errors gracefully', async () => {
    const mockDocRef = { id: 'consultation-123' };
    const { addDoc } = require('firebase/firestore');
    addDoc.mockResolvedValue(mockDocRef);
    
    const { collection, getDoc, doc } = require('firebase/firestore');
    collection.mockReturnValue({});
    doc.mockReturnValue({});
    
    // Mock Client document
    const mockPatientDoc = {
      exists: () => true,
      data: () => ({ clientId: 'UC-2025-0001' })
    };
    getDoc.mockResolvedValue(mockPatientDoc);
    
    logConsultation.mockRejectedValue(new Error('Logging failed'));

    const consultationData = {
      clientId: 'Client-doc-id',
      clientName: 'John Doe',
      doctorId: 'doctor-123',
      doctorName: 'Dr. Jane Smith',
      doctorRole: 'doctor',
      institutionId: 'institution-123',
      consultationType: 'in-person',
      chiefComplaint: 'Headache'
    };

    // Should still succeed even if logging fails
    const result = await createConsultation(consultationData);
    expect(result.id).toBe('consultation-123');
  });
});

