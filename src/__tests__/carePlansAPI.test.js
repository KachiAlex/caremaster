/**
 * Tests for Care Plans API
 * Verifies that care plan operations work correctly
 */

import { createCarePlan, updateCarePlan } from '../api/carePlansAPI';

// Mock dependencies
jest.mock('../backend/config', () => ({
  db: {}
}));

jest.mock('backend/database', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' }))
}));

describe('Care Plans API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCarePlan', () => {
    test('should create a care plan successfully', async () => {
      const mockDocRef = { id: 'careplan-123' };
      const { addDoc, collection } = require('backend/database');
      addDoc.mockResolvedValue(mockDocRef);
      collection.mockReturnValue({});

      const carePlanData = {
        clientId: 'Client-doc-id',
        diagnosis: 'Hypertension',
        careObjectives: ['Manage blood pressure'],
        dailyCareActivities: ['Medication administration']
      };

      const result = await createCarePlan(carePlanData);

      expect(result.id).toBe('careplan-123');
      expect(addDoc).toHaveBeenCalled();
      expect(collection).toHaveBeenCalled();
    });

    test('should handle errors when creating care plan', async () => {
      const { addDoc, collection } = require('backend/database');
      collection.mockReturnValue({});
      addDoc.mockRejectedValue(new Error('Firestore error'));

      const carePlanData = {
        clientId: 'Client-doc-id',
        diagnosis: 'Hypertension'
      };

      await expect(createCarePlan(carePlanData)).rejects.toThrow();
    });
  });

  describe('updateCarePlan', () => {
    test('should update a care plan successfully', async () => {
      const { updateDoc, doc, getDoc } = require('backend/database');
      updateDoc.mockResolvedValue();
      doc.mockReturnValue({});
      
      // Mock getDoc to return a document that exists
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ clientId: 'Client-123', diagnosis: 'Hypertension' })
      });

      const updateData = {
        diagnosis: 'Hypertension - Controlled',
        careObjectives: ['Manage blood pressure', 'Monitor daily']
      };

      const result = await updateCarePlan('careplan-123', updateData);

      expect(result.id).toBe('careplan-123');
      expect(updateDoc).toHaveBeenCalled();
      expect(getDoc).toHaveBeenCalled();
    });

    test('should handle errors when updating care plan', async () => {
      const { updateDoc, doc, getDoc } = require('backend/database');
      doc.mockReturnValue({});
      
      // Mock getDoc to return a document that exists
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ clientId: 'Client-123', diagnosis: 'Hypertension' })
      });
      
      updateDoc.mockRejectedValue(new Error('Firestore error'));

      const updateData = {
        diagnosis: 'Hypertension - Controlled'
      };

      await expect(updateCarePlan('careplan-123', updateData)).rejects.toThrow();
    });
  });
});

