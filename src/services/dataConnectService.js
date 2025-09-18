import { getDataConnect } from 'firebase/data-connect';
import { 
  connectorConfig, 
  getUserProfile, 
  getCurrentUser,
  getMyMedications,
  addNewVitalSign,
  updateMedicationNotes,
  listCaregiversForClientProfile,
  getClientProfile,
  getClientMedications,
  getClientVitalSigns,
  getClientAppointments,
  getCaregiverClients
} from '@dataconnect/generated';
import errorHandler from '../utils/errorHandler';
import logger from '../utils/logger';

// Initialize Data Connect
const dataConnect = getDataConnect(connectorConfig);

class DataConnectService {
  constructor() {
    this.dataConnect = dataConnect;
  }

  // Helper method to check if Data Connect is available
  _checkDataConnect() {
    if (!this.dataConnect) {
      const error = new Error('Data Connect service is not available');
      throw error;
    }
  }

  // Helper method for unimplemented queries
  _throwUnimplementedError(queryName) {
    const error = new Error(`Data Connect query '${queryName}' not implemented - using Firestore fallback`);
    logger.warn(`Data Connect query not implemented: ${queryName}`);
    throw error;
  }

  // User Management Methods
  async getUserProfile(userId) {
    try {
      logger.debug(`Executing Data Connect getUserProfile`, { userId });
      
      const result = await getUserProfile(this.dataConnect, { userId });
      
      logger.info(`Data Connect getUserProfile successful`, { 
        resultCount: result.data?.users?.length || 0 
      });
      
      return result;
    } catch (error) {
      logger.error(`Data Connect getUserProfile failed`, { error, userId });
      errorHandler.handleError(error, { 
        context: 'data_connect_getUserProfile', 
        userId 
      });
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      logger.debug(`Executing Data Connect getCurrentUser`);
      
      const result = await getCurrentUser(this.dataConnect);
      
      logger.info(`Data Connect getCurrentUser successful`, { 
        resultCount: result.data?.users?.length || 0 
      });
      
      return result;
    } catch (error) {
      logger.error(`Data Connect getCurrentUser failed`, { error });
      errorHandler.handleError(error, { 
        context: 'data_connect_getCurrentUser'
      });
      throw error;
    }
  }

  async getAllUsers() {
    // TODO: Add GetAllUsers query to Data Connect schema
    throw new Error('GetAllUsers query not implemented in Data Connect schema');
  }

  async createUserProfile(userData) {
    return this.executeMutation('CreateUserProfile', userData);
  }

  async updateUserProfile(userId, userData) {
    return this.executeMutation('UpdateUserProfile', { userId, ...userData });
  }

  // Elderly Profile Methods
  async getElderlyProfile(userId) {
    return this.executeQuery('GetElderlyProfile', { userId });
  }

  async getCurrentElderlyProfile() {
    return this.executeQuery('GetCurrentElderlyProfile');
  }

  async createElderlyProfile(profileData) {
    return this.executeMutation('CreateElderlyProfile', profileData);
  }

  async updateElderlyProfile(profileId, profileData) {
    return this.executeMutation('UpdateElderlyProfile', { profileId, ...profileData });
  }

  // Medication Methods
  async getMedications(clientProfileId) {
    try {
      logger.debug(`Executing Data Connect getClientMedications`, { clientProfileId });
      
      const result = await getClientMedications(this.dataConnect, { clientProfileId });
      
      logger.info(`Data Connect getClientMedications successful`, { 
        resultCount: result.data?.medications?.length || 0 
      });
      
      return result;
    } catch (error) {
      logger.error(`Data Connect getClientMedications failed`, { error, clientProfileId });
      // Re-throw the actual error instead of masking it
      throw error;
    }
  }

  async getCurrentUserMedications() {
    try {
      logger.debug(`Executing Data Connect getMyMedications`);
      
      const result = await getMyMedications(this.dataConnect);
      
      logger.info(`Data Connect getMyMedications successful`, { 
        resultCount: result.data?.medications?.length || 0 
      });
      
      return result;
    } catch (error) {
      logger.error(`Data Connect getMyMedications failed`, { error });
      // Re-throw the actual error instead of masking it
      throw error;
    }
  }

  async getActiveMedications(elderlyProfileId) {
    return this.executeQuery('GetActiveMedications', { elderlyProfileId });
  }

  async getMedicationById(medicationId) {
    return this.executeQuery('GetMedicationById', { medicationId });
  }

  async createMedication(medicationData) {
    return this.executeMutation('CreateMedication', medicationData);
  }

  async updateMedication(medicationId, medicationData) {
    return this.executeMutation('UpdateMedication', { medicationId, ...medicationData });
  }

  async deleteMedication(medicationId) {
    return this.executeMutation('DeleteMedication', { medicationId });
  }

  // Medication Log Methods
  async getMedicationLogs(medicationId) {
    return this.executeQuery('GetMedicationLogs', { medicationId });
  }

  async getRecentMedicationLogs(elderlyProfileId, limit = 10) {
    return this.executeQuery('GetRecentMedicationLogs', { elderlyProfileId, limit });
  }

  async logMedicationDose(doseData) {
    return this.executeMutation('LogMedicationDose', doseData);
  }

  // Vital Signs Methods
  async getVitalSigns(elderlyProfileId) {
    return this.executeQuery('GetVitalSigns', { elderlyProfileId });
  }

  async getCurrentUserVitalSigns() {
    return this.executeQuery('GetCurrentUserVitalSigns');
  }

  async getVitalSignsByType(elderlyProfileId, type) {
    return this.executeQuery('GetVitalSignsByType', { elderlyProfileId, type });
  }

  async getRecentVitalSigns(elderlyProfileId, limit = 10) {
    return this.executeQuery('GetRecentVitalSigns', { elderlyProfileId, limit });
  }

  async getVitalSignsByDateRange(elderlyProfileId, startDate, endDate) {
    return this.executeQuery('GetVitalSignsByDateRange', { 
      elderlyProfileId, 
      startDate, 
      endDate 
    });
  }

  async createVitalSign(vitalSignData) {
    return this.executeMutation('CreateVitalSign', vitalSignData);
  }

  async updateVitalSign(vitalSignId, vitalSignData) {
    return this.executeMutation('UpdateVitalSign', { vitalSignId, ...vitalSignData });
  }

  async deleteVitalSign(vitalSignId) {
    return this.executeMutation('DeleteVitalSign', { vitalSignId });
  }

  // Appointment Methods
  async getAppointments(elderlyProfileId) {
    return this.executeQuery('GetAppointments', { elderlyProfileId });
  }

  async getCurrentUserAppointments() {
    return this.executeQuery('GetCurrentUserAppointments');
  }

  async getUpcomingAppointments(elderlyProfileId, limit = 5) {
    return this.executeQuery('GetUpcomingAppointments', { elderlyProfileId, limit });
  }

  async getAppointmentsByDateRange(elderlyProfileId, startDate, endDate) {
    return this.executeQuery('GetAppointmentsByDateRange', { 
      elderlyProfileId, 
      startDate, 
      endDate 
    });
  }

  async getAppointmentById(appointmentId) {
    return this.executeQuery('GetAppointmentById', { appointmentId });
  }

  async createAppointment(appointmentData) {
    return this.executeMutation('CreateAppointment', appointmentData);
  }

  async updateAppointment(appointmentId, appointmentData) {
    return this.executeMutation('UpdateAppointment', { appointmentId, ...appointmentData });
  }

  async deleteAppointment(appointmentId) {
    return this.executeMutation('DeleteAppointment', { appointmentId });
  }

  // Caregiver Relationship Methods
  async getCaregiverRelationships(elderlyProfileId) {
    return this.executeQuery('GetCaregiverRelationships', { elderlyProfileId });
  }

  async getCurrentUserCaregivers() {
    return this.executeQuery('GetCurrentUserCaregivers');
  }

  async getCaregiverPatients(caregiverId) {
    return this.executeQuery('GetCaregiverPatients', { caregiverId });
  }

  async getCurrentCaregiverPatients() {
    return this.executeQuery('GetCurrentCaregiverPatients');
  }

  async createCaregiverRelationship(relationshipData) {
    return this.executeMutation('CreateCaregiverRelationship', relationshipData);
  }

  async updateCaregiverRelationship(relationshipId, relationshipData) {
    return this.executeMutation('UpdateCaregiverRelationship', { 
      relationshipId, 
      ...relationshipData 
    });
  }

  async deleteCaregiverRelationship(relationshipId) {
    return this.executeMutation('DeleteCaregiverRelationship', { relationshipId });
  }

  // Utility Methods
  async batchExecute(operations) {
    try {
      logger.debug('Executing batch operations', { operationCount: operations.length });
      
      const results = await Promise.allSettled(
        operations.map(op => {
          if (op.type === 'query') {
            return this.executeQuery(op.name, op.variables);
          } else if (op.type === 'mutation') {
            return this.executeMutation(op.name, op.variables);
          }
          throw new Error(`Unknown operation type: ${op.type}`);
        })
      );
      
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      
      logger.info('Batch operations completed', { 
        successful: successful.length, 
        failed: failed.length 
      });
      
      return { successful, failed };
    } catch (error) {
      logger.error('Batch operations failed', { error });
      errorHandler.handleError(error, { context: 'data_connect_batch' });
      throw error;
    }
  }
}

// Create singleton instance
const dataConnectService = new DataConnectService();

export default dataConnectService;
