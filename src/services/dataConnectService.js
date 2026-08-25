// DataConnect compatibility stub — Firebase Data Connect is no longer used.
// All data operations now go through the backend REST API / database stubs.

class DataConnectService {
  _throwUnimplementedError(queryName) {
    throw new Error(`Data Connect query '${queryName}' not available — using database fallback`);
  }

  async executeQuery(name, variables) {
    this._throwUnimplementedError(name);
  }

  async executeMutation(name, variables) {
    this._throwUnimplementedError(name);
  }

  async getUserProfile(userId) { this._throwUnimplementedError('getUserProfile'); }
  async getCurrentUser() { this._throwUnimplementedError('getCurrentUser'); }
  async getAllUsers() { this._throwUnimplementedError('getAllUsers'); }
  async createUserProfile(userData) { this._throwUnimplementedError('createUserProfile'); }
  async updateUserProfile(userId, userData) { this._throwUnimplementedError('updateUserProfile'); }
  async getElderlyProfile(userId) { this._throwUnimplementedError('getElderlyProfile'); }
  async getCurrentElderlyProfile() { this._throwUnimplementedError('getCurrentElderlyProfile'); }
  async createElderlyProfile(profileData) { this._throwUnimplementedError('createElderlyProfile'); }
  async updateElderlyProfile(profileId, profileData) { this._throwUnimplementedError('updateElderlyProfile'); }
  async getMedications(clientProfileId) { this._throwUnimplementedError('getMedications'); }
  async getCurrentUserMedications() { this._throwUnimplementedError('getCurrentUserMedications'); }
  async getActiveMedications(elderlyProfileId) { this._throwUnimplementedError('getActiveMedications'); }
  async getMedicationById(medicationId) { this._throwUnimplementedError('getMedicationById'); }
  async createMedication(medicationData) { this._throwUnimplementedError('createMedication'); }
  async updateMedication(medicationId, medicationData) { this._throwUnimplementedError('updateMedication'); }
  async deleteMedication(medicationId) { this._throwUnimplementedError('deleteMedication'); }
  async getMedicationLogs(medicationId) { this._throwUnimplementedError('getMedicationLogs'); }
  async getRecentMedicationLogs(elderlyProfileId, limit) { this._throwUnimplementedError('getRecentMedicationLogs'); }
  async logMedicationDose(doseData) { this._throwUnimplementedError('logMedicationDose'); }
  async getVitalSigns(elderlyProfileId) { this._throwUnimplementedError('getVitalSigns'); }
  async getCurrentUserVitalSigns() { this._throwUnimplementedError('getCurrentUserVitalSigns'); }
  async getVitalSignsByType(elderlyProfileId, type) { this._throwUnimplementedError('getVitalSignsByType'); }
  async getRecentVitalSigns(elderlyProfileId, limit) { this._throwUnimplementedError('getRecentVitalSigns'); }
  async getVitalSignsByDateRange(elderlyProfileId, startDate, endDate) { this._throwUnimplementedError('getVitalSignsByDateRange'); }
  async createVitalSign(vitalSignData) { this._throwUnimplementedError('createVitalSign'); }
  async updateVitalSign(vitalSignId, vitalSignData) { this._throwUnimplementedError('updateVitalSign'); }
  async deleteVitalSign(vitalSignId) { this._throwUnimplementedError('deleteVitalSign'); }
  async getAppointments(elderlyProfileId) { this._throwUnimplementedError('getAppointments'); }
  async getCurrentUserAppointments() { this._throwUnimplementedError('getCurrentUserAppointments'); }
  async getUpcomingAppointments(elderlyProfileId, limit) { this._throwUnimplementedError('getUpcomingAppointments'); }
  async getAppointmentsByDateRange(elderlyProfileId, startDate, endDate) { this._throwUnimplementedError('getAppointmentsByDateRange'); }
  async getAppointmentById(appointmentId) { this._throwUnimplementedError('getAppointmentById'); }
  async createAppointment(appointmentData) { this._throwUnimplementedError('createAppointment'); }
  async updateAppointment(appointmentId, appointmentData) { this._throwUnimplementedError('updateAppointment'); }
  async deleteAppointment(appointmentId) { this._throwUnimplementedError('deleteAppointment'); }
  async getCaregiverRelationships(elderlyProfileId) { this._throwUnimplementedError('getCaregiverRelationships'); }
  async getCurrentUserCaregivers() { this._throwUnimplementedError('getCurrentUserCaregivers'); }
  async getCaregiverPatients(caregiverId) { this._throwUnimplementedError('getCaregiverPatients'); }
  async getCurrentCaregiverPatients() { this._throwUnimplementedError('getCurrentCaregiverPatients'); }
  async createCaregiverRelationship(relationshipData) { this._throwUnimplementedError('createCaregiverRelationship'); }
  async updateCaregiverRelationship(relationshipId, relationshipData) { this._throwUnimplementedError('updateCaregiverRelationship'); }
  async deleteCaregiverRelationship(relationshipId) { this._throwUnimplementedError('deleteCaregiverRelationship'); }
  async batchExecute(operations) { this._throwUnimplementedError('batchExecute'); }
}

const dataConnectService = new DataConnectService();
export default dataConnectService;
