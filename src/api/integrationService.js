import { 
  getPatientsByCaregiver, 
  getPatientsByDoctor, 
  assignPatientToCaregiver, 
  assignPatientToDoctor,
  addMedicalRecord 
} from './patientsAPI';
import { 
  createAppointment, 
  getAppointmentsByPatient, 
  getAppointmentsByDoctor, 
  getAppointmentsByCaregiver,
  getTodaysAppointments,
  getUpcomingAppointments 
} from './appointmentsAPI';
import { 
  createConversation, 
  getOrCreateConversation, 
  sendMessage, 
  getMessagesByType,
  sendNotificationMessage 
} from './messagesAPI';
import { 
  createCareTask, 
  getCareTasksByPatient, 
  getCareTasksByCaregiver, 
  getTodaysCareTasks,
  completeCareTask 
} from './careTasksAPI';
import { getUserById } from './usersAPI';

// Integration service to connect all roles and manage workflows

// Patient-Caregiver Integration
export const PatientCaregiverIntegration = {
  // Assign patient to caregiver
  async assignPatient(patientId, caregiverId) {
    try {
      await assignPatientToCaregiver(patientId, caregiverId);
      
      // Create conversation between patient and caregiver
      const conversation = await getOrCreateConversation(
        patientId, 
        caregiverId, 
        'care'
      );
      
      // Send welcome message
      await sendMessage(conversation.id, 'system', {
        text: 'You have been assigned a new caregiver. You can now communicate directly.',
        messageType: 'system'
      });
      
      return { success: true, conversationId: conversation.id };
    } catch (error) {
      console.error('Error in patient-caregiver assignment:', error);
      throw error;
    }
  },

  // Get patient-caregiver relationship data
  async getPatientCaregiverData(patientId, caregiverId) {
    try {
      const [patient, caregiver, tasks, appointments, conversations] = await Promise.all([
        getUserById(patientId),
        getUserById(caregiverId),
        getCareTasksByPatient(patientId),
        getAppointmentsByPatient(patientId),
        getOrCreateConversation(patientId, caregiverId, 'care')
      ]);

      return {
        patient,
        caregiver,
        tasks: tasks.filter(task => task.caregiverId === caregiverId),
        appointments: appointments.filter(apt => apt.caregiverId === caregiverId),
        conversation: conversations
      };
    } catch (error) {
      console.error('Error fetching patient-caregiver data:', error);
      throw error;
    }
  }
};

// Patient-Doctor Integration
export const PatientDoctorIntegration = {
  // Assign patient to doctor
  async assignPatient(patientId, doctorId) {
    try {
      await assignPatientToDoctor(patientId, doctorId);
      
      // Create conversation between patient and doctor
      const conversation = await getOrCreateConversation(
        patientId, 
        doctorId, 
        'medical'
      );
      
      // Send welcome message
      await sendMessage(conversation.id, 'system', {
        text: 'You have been assigned a new doctor. You can now communicate about medical matters.',
        messageType: 'system'
      });
      
      return { success: true, conversationId: conversation.id };
    } catch (error) {
      console.error('Error in patient-doctor assignment:', error);
      throw error;
    }
  },

  // Get patient-doctor relationship data
  async getPatientDoctorData(patientId, doctorId) {
    try {
      const [patient, doctor, appointments, medicalHistory, conversations] = await Promise.all([
        getUserById(patientId),
        getUserById(doctorId),
        getAppointmentsByPatient(patientId),
        // getPatientMedicalHistory(patientId), // This would need to be implemented
        getOrCreateConversation(patientId, doctorId, 'medical')
      ]);

      return {
        patient,
        doctor,
        appointments: appointments.filter(apt => apt.doctorId === doctorId),
        medicalHistory,
        conversation: conversations
      };
    } catch (error) {
      console.error('Error fetching patient-doctor data:', error);
      throw error;
    }
  }
};

// Caregiver-Doctor Integration
export const CaregiverDoctorIntegration = {
  // Create shared care plan
  async createSharedCarePlan(patientId, caregiverId, doctorId, carePlanData) {
    try {
      // Create care tasks based on doctor's recommendations
      const careTasks = [];
      for (const task of carePlanData.tasks) {
        const taskId = await createCareTask({
          ...task,
          patientId,
          caregiverId,
          doctorId,
          carePlanId: carePlanData.id,
          priority: task.priority || 'medium'
        });
        careTasks.push(taskId);
      }

      // Create conversation for care coordination
      const conversation = await getOrCreateConversation(
        caregiverId, 
        doctorId, 
        'medical'
      );

      // Send care plan message
      await sendMessage(conversation.id, doctorId, {
        text: `New care plan created for patient. Tasks assigned: ${careTasks.length}`,
        messageType: 'medical',
        metadata: { carePlanId: carePlanData.id, taskIds: careTasks }
      });

      return { success: true, taskIds: careTasks, conversationId: conversation.id };
    } catch (error) {
      console.error('Error creating shared care plan:', error);
      throw error;
    }
  },

  // Get coordination data between caregiver and doctor
  async getCoordinationData(caregiverId, doctorId, patientId = null) {
    try {
      const [caregiver, doctor, sharedPatients, conversations] = await Promise.all([
        getUserById(caregiverId),
        getUserById(doctorId),
        patientId ? [patientId] : this.getSharedPatients(caregiverId, doctorId),
        getOrCreateConversation(caregiverId, doctorId, 'medical')
      ]);

      return {
        caregiver,
        doctor,
        sharedPatients,
        conversation: conversations
      };
    } catch (error) {
      console.error('Error fetching coordination data:', error);
      throw error;
    }
  },

  // Get patients shared between caregiver and doctor
  async getSharedPatients(caregiverId, doctorId) {
    try {
      const [caregiverPatients, doctorPatients] = await Promise.all([
        getPatientsByCaregiver(caregiverId),
        getPatientsByDoctor(doctorId)
      ]);

      // Find intersection of patients
      const sharedPatients = caregiverPatients.filter(cp => 
        doctorPatients.some(dp => dp.id === cp.id)
      );

      return sharedPatients;
    } catch (error) {
      console.error('Error getting shared patients:', error);
      throw error;
    }
  }
};

// Admin Integration - Monitor all relationships
export const AdminIntegration = {
  // Get comprehensive overview of all relationships
  async getSystemOverview() {
    try {
      // This would typically aggregate data from multiple sources
      // For now, we'll return a structure that can be expanded
      return {
        totalPatients: 0,
        totalCaregivers: 0,
        totalDoctors: 0,
        activeAssignments: 0,
        pendingTasks: 0,
        upcomingAppointments: 0,
        unreadMessages: 0
      };
    } catch (error) {
      console.error('Error getting system overview:', error);
      throw error;
    }
  },

  // Monitor patient-caregiver relationships
  async monitorPatientCaregiverRelationships() {
    try {
      // Implementation would involve checking for:
      // - Unassigned patients
      // - Overloaded caregivers
      // - Inactive relationships
      // - Communication gaps
      return [];
    } catch (error) {
      console.error('Error monitoring relationships:', error);
      throw error;
    }
  },

  // Get alerts and notifications for admin
  async getAdminAlerts() {
    try {
      const alerts = [];
      
      // Check for overdue tasks
      // Check for missed appointments
      // Check for inactive users
      // Check for system issues
      
      return alerts;
    } catch (error) {
      console.error('Error getting admin alerts:', error);
      throw error;
    }
  }
};

// Workflow Automation
export const WorkflowAutomation = {
  // Auto-assign patients based on criteria
  async autoAssignPatients() {
    try {
      // Implementation would involve:
      // - Finding unassigned patients
      // - Matching with available caregivers/doctors
      // - Creating assignments automatically
      return { assigned: 0, failed: 0 };
    } catch (error) {
      console.error('Error in auto-assignment:', error);
      throw error;
    }
  },

  // Send reminder notifications
  async sendReminders() {
    try {
      // Implementation would involve:
      // - Checking upcoming appointments
      // - Checking overdue tasks
      // - Sending appropriate reminders
      return { sent: 0 };
    } catch (error) {
      console.error('Error sending reminders:', error);
      throw error;
    }
  },

  // Escalate issues
  async escalateIssue(issueData) {
    try {
      // Implementation would involve:
      // - Determining escalation path
      // - Notifying appropriate personnel
      // - Creating incident reports
      return { escalated: true };
    } catch (error) {
      console.error('Error escalating issue:', error);
      throw error;
    }
  }
};

// Emergency Integration
export const EmergencyIntegration = {
  // Handle emergency alerts
  async handleEmergencyAlert(patientId, emergencyData) {
    try {
      // Get patient's assigned caregivers and doctors
      const [caregivers, doctors] = await Promise.all([
        getPatientsByCaregiver(patientId),
        getPatientsByDoctor(patientId)
      ]);

      // Send emergency notifications
      const notifications = [];
      for (const caregiver of caregivers) {
        const conversation = await getOrCreateConversation(
          patientId, 
          caregiver.id, 
          'emergency'
        );
        
        await sendMessage(conversation.id, 'system', {
          text: `EMERGENCY ALERT: ${emergencyData.message}`,
          messageType: 'emergency',
          priority: 'high',
          metadata: emergencyData
        });
        
        notifications.push({ type: 'caregiver', id: caregiver.id });
      }

      for (const doctor of doctors) {
        const conversation = await getOrCreateConversation(
          patientId, 
          doctor.id, 
          'emergency'
        );
        
        await sendMessage(conversation.id, 'system', {
          text: `EMERGENCY ALERT: ${emergencyData.message}`,
          messageType: 'emergency',
          priority: 'high',
          metadata: emergencyData
        });
        
        notifications.push({ type: 'doctor', id: doctor.id });
      }

      return { notificationsSent: notifications.length, notifications };
    } catch (error) {
      console.error('Error handling emergency alert:', error);
      throw error;
    }
  }
};

// Export all integration services
export const IntegrationService = {
  PatientCaregiver: PatientCaregiverIntegration,
  PatientDoctor: PatientDoctorIntegration,
  CaregiverDoctor: CaregiverDoctorIntegration,
  Admin: AdminIntegration,
  Workflow: WorkflowAutomation,
  Emergency: EmergencyIntegration
};
