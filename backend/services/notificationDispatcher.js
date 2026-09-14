/**
 * Server-side notification dispatcher.
 *
 * Creates notification rows in the PostgreSQL `notifications` table when
 * care-relevant records are created or updated. This guarantees notifications
 * fire even if the actor's browser is closed — the backend handles it.
 *
 * Usage (from backend/routes/data.js):
 *   const { dispatchTableNotifications } = require('../services/notificationDispatcher');
 *   await dispatchTableNotifications('appointments', record, req.user, 'create');
 */

const db = require('../utils/database');
const { logger } = require('../utils/logger');
const { shouldNotify } = require('../routes/notificationPreferences');
const webPush = require('./webPush');

// Notification type constants (mirror the frontend)
const TYPE = {
  TASK: 'task',
  APPOINTMENT: 'appointment',
  CONSULTATION: 'consultation',
  MEDICATION: 'medication',
  PRESCRIPTION: 'prescription',
  DIAGNOSTIC: 'diagnostic',
  PHARMACY: 'pharmacy',
  EMERGENCY: 'emergency',
  MESSAGE: 'message',
  SYSTEM: 'system',
};

const PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

/**
 * Insert a notification row for a single user.
 */
async function createNotification(userId, data) {
  if (!userId) return null;

  // Check user's notification preferences — skip if muted
  const allowed = await shouldNotify(userId, data.type);
  if (!allowed) {
    return null;
  }

  try {
    const [row] = await db('notifications').insert({
      user_id: String(userId),
      title: data.title || 'Notification',
      message: data.message || '',
      type: data.type || TYPE.SYSTEM,
      priority: data.priority || 'normal',
      read: false,
      data: data.metadata ? JSON.stringify(data.metadata) : null,
      institution_id: data.institutionId || null,
      created_at: new Date(),
      read_at: null,
    }).returning(['id', 'user_id', 'title', 'message', 'type', 'priority', 'read', 'data', 'created_at']);

    // Fire a web push notification to the user's subscribed devices.
    // Only push high/critical priority to avoid noise.
    const priority = (data.priority || '').toLowerCase();
    if (priority === 'high' || priority === 'critical' || priority === 'urgent') {
      webPush.sendPushNotification(userId, {
        title: data.title || 'Care Master',
        body: data.message || '',
        priority,
        data: {
          notificationId: row?.id,
          navigateTo: data.metadata?.navigateTo,
        },
      }).catch(() => {}); // Non-blocking — don't fail the request if push fails
    }

    return row;
  } catch (err) {
    logger.error(`notificationDispatcher.createNotification error for user ${userId}:`, err);
    return null;
  }
}

/**
 * Fetch users by type within an institution.
 */
async function getUsersByType(institutionId, types) {
  if (!institutionId || !types?.length) return [];
  try {
    return await db('users')
      .where({ institution_id: institutionId })
      .whereIn('user_type', types)
      .select('id', 'email', 'user_type', 'first_name', 'last_name');
  } catch (err) {
    logger.error('notificationDispatcher.getUsersByType error:', err);
    return [];
  }
}

/**
 * Fetch a client record by ID to resolve the assigned doctor / caregiver.
 */
async function getClientById(clientId) {
  if (!clientId) return null;
  try {
    const [client] = await db('clients').where({ id: clientId }).select('id', 'name', 'assigned_doctor', 'assigned_caregiver', 'institution_id');
    return client || null;
  } catch (err) {
    logger.error('notificationDispatcher.getClientById error:', err);
    return null;
  }
}

/**
 * Fetch a user by ID (for resolving names of assigned doctors etc.).
 */
async function getUserById(userId) {
  if (!userId) return null;
  try {
    const [user] = await db('users').where({ id: userId }).select('id', 'email', 'user_type', 'first_name', 'last_name', 'institution_id');
    return user || null;
  } catch (err) {
    logger.error('notificationDispatcher.getUserById error:', err);
    return null;
  }
}

/**
 * Resolve a user's display name from a DB row.
 */
function displayName(user) {
  if (!user) return 'Unknown';
  return [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.email || 'User';
}

/**
 * Main dispatch function — called after a record is created or updated.
 * Examines the table + record + action and creates appropriate notifications.
 *
 * @param {string} tableName - PostgreSQL table name (e.g. 'appointments')
 * @param {object} record - The created/updated record (snake_case DB row)
 * @param {object} actorUser - The authenticated user from req.user
 * @param {string} action - 'create' or 'update'
 */
async function dispatchTableNotifications(tableName, record, actorUser, action) {
  if (!record || !actorUser) return;

  try {
    const institutionId = record.institution_id || actorUser.institution_id || null;
    const actorName = displayName(actorUser);

    switch (tableName) {
      // ─── Appointments (care visit requests) ───────────────────────────
      case 'appointments': {
        if (action === 'create') {
          // Client created a care visit request → notify admins
          if (record.status === 'pending' || record.status === 'requested') {
            const admins = await getUsersByType(institutionId, ['admin', 'institution-admin', 'institution_admin', 'InstitutionAdmin']);
            const clientName = record.title || actorName;
            for (const admin of admins) {
              await createNotification(admin.id, {
                type: TYPE.APPOINTMENT,
                title: 'New Care Visit Request',
                message: `${clientName} requested a care visit${record.scheduled_at ? ` for ${new Date(record.scheduled_at).toLocaleDateString()}` : ''}.`,
                metadata: {
                  navigateTo: '/institution-admin/dashboard',
                  appointmentId: record.id,
                  clientName,
                },
              });
            }
          }
        } else if (action === 'update') {
          // Admin scheduled/assigned → notify client + caregiver
          if (record.status === 'scheduled') {
            // Notify caregiver
            if (record.caregiver_id) {
              await createNotification(record.caregiver_id, {
                type: TYPE.TASK,
                title: 'Care Visit Assigned',
                message: `You have been assigned a care visit with ${record.title || 'a client'}${record.scheduled_at ? ` on ${new Date(record.scheduled_at).toLocaleDateString()}` : ''}.`,
                metadata: {
                  navigateTo: '/caregiver/tasks',
                  appointmentId: record.id,
                },
              });
            }
            // Notify client
            if (record.patient_id) {
              await createNotification(record.patient_id, {
                type: TYPE.APPOINTMENT,
                title: 'Care Visit Scheduled',
                message: `Your care visit has been scheduled${record.scheduled_at ? ` for ${new Date(record.scheduled_at).toLocaleDateString()} at ${new Date(record.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}.`,
                metadata: {
                  navigateTo: '/appointments',
                  appointmentId: record.id,
                },
              });
            }
          } else if (record.status === 'completed') {
            // Notify client + admin
            if (record.patient_id) {
              await createNotification(record.patient_id, {
                type: TYPE.APPOINTMENT,
                title: 'Care Visit Completed',
                message: `Your care visit has been marked as completed.`,
                metadata: {
                  navigateTo: '/appointments',
                  appointmentId: record.id,
                },
              });
            }
          } else if (record.status === 'cancelled') {
            if (record.patient_id) {
              await createNotification(record.patient_id, {
                type: TYPE.APPOINTMENT,
                title: 'Care Visit Cancelled',
                message: `Your care visit has been cancelled.`,
                metadata: {
                  navigateTo: '/appointments',
                  appointmentId: record.id,
                },
              });
            }
          }
        }
        break;
      }

      // ─── Telemedicine appointments (video consultation requests) ────────
      case 'telemedicine_appointments': {
        if (action === 'create' && record.status === 'requested') {
          const admins = await getUsersByType(institutionId, ['admin', 'institution-admin', 'institution_admin', 'InstitutionAdmin']);
          const clientName = record.client_name || actorName;
          for (const admin of admins) {
            await createNotification(admin.id, {
              type: TYPE.CONSULTATION,
              title: 'New Video Consultation Request',
              message: `${clientName} requested a video consultation${record.reason ? `: ${record.reason.substring(0, 80)}` : '.'}`,
              metadata: {
                navigateTo: '/institution-admin/dashboard',
                appointmentId: record.id,
                clientName,
              },
            });
          }
        } else if (action === 'update' && record.status === 'scheduled') {
          // Notify doctor
          if (record.doctor_id) {
            await createNotification(record.doctor_id, {
              type: TYPE.CONSULTATION,
              title: 'Video Consultation Assigned',
              message: `You have been assigned a video consultation with ${record.client_name || 'a client'}${record.appointment_date ? ` on ${new Date(record.appointment_date).toLocaleDateString()}` : ''}.`,
              metadata: {
                navigateTo: '/telemedicine',
                appointmentId: record.id,
              },
            });
          }
          // Notify client
          if (record.client_id) {
            await createNotification(record.client_id, {
              type: TYPE.CONSULTATION,
              title: 'Video Consultation Scheduled',
              message: `Your video consultation has been scheduled with ${record.doctor_name || 'a doctor'}${record.appointment_date ? ` on ${new Date(record.appointment_date).toLocaleDateString()} at ${new Date(record.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}.`,
              metadata: {
                navigateTo: '/telemedicine',
                appointmentId: record.id,
              },
            });
          }
        }
        break;
      }

      // ─── Care tasks ────────────────────────────────────────────────────
      case 'care_tasks': {
        if (action === 'create' && record.caregiver_id) {
          await createNotification(record.caregiver_id, {
            type: TYPE.TASK,
            title: 'New Task Assigned',
            message: `You have been assigned a new task: ${record.title || 'Untitled task'}${record.due_date ? ` due ${new Date(record.due_date).toLocaleDateString()}` : ''}.`,
            metadata: {
              navigateTo: '/caregiver/tasks',
              taskId: record.id,
            },
          });
        } else if (action === 'update' && record.status === 'completed') {
          // Notify client + admin
          if (record.patient_id || record.client_id) {
            const clientId = record.patient_id || record.client_id;
            await createNotification(clientId, {
              type: TYPE.TASK,
              title: 'Task Completed',
              message: `Task "${record.title || 'Untitled'}" has been completed.`,
              metadata: {
                navigateTo: '/dashboard',
                taskId: record.id,
              },
            });
          }
          const admins = await getUsersByType(institutionId, ['admin', 'institution-admin', 'institution_admin', 'InstitutionAdmin']);
          for (const admin of admins) {
            await createNotification(admin.id, {
              type: TYPE.TASK,
              title: 'Task Completed',
              message: `Caregiver completed task "${record.title || 'Untitled'}".`,
              metadata: {
                navigateTo: '/institution-admin/dashboard',
                taskId: record.id,
              },
            });
          }
        }
        break;
      }

      // ─── Assignments (caregiver assigned to client) ────────────────────
      case 'assignments': {
        if (action === 'create') {
          // Notify caregiver
          if (record.caregiver_id) {
            await createNotification(record.caregiver_id, {
              type: TYPE.TASK,
              title: 'New Client Assignment',
              message: `You have been assigned to ${record.client_name || record.client_email || 'a client'}.`,
              metadata: {
                navigateTo: '/caregiver',
                assignmentId: record.id,
              },
            });
          }
          // Notify client
          if (record.patient_id || record.client_id) {
            const clientId = record.patient_id || record.client_id;
            await createNotification(clientId, {
              type: TYPE.SYSTEM,
              title: 'Caregiver Assigned',
              message: `${record.caregiver_name || 'A caregiver'} has been assigned to you.`,
              metadata: {
                navigateTo: '/client-caregivers',
                assignmentId: record.id,
              },
            });
          }
        }
        break;
      }

      // ─── Messages ──────────────────────────────────────────────────────
      case 'messages': {
        if (action === 'create') {
          const recipientId = record.receiver_id || record.recipient_id;
          if (recipientId) {
            await createNotification(recipientId, {
              type: TYPE.MESSAGE,
              title: 'New Message',
              message: `${actorName} sent you a message`,
              metadata: {
                navigateTo: '/messages',
                messageId: record.id,
                conversationId: record.conversation_id,
              },
            });
          }
        }
        break;
      }

      // ─── Vital signs (abnormal values alert) ───────────────────────────
      case 'vital_signs': {
        if (action === 'create') {
          const alerts = checkAbnormalVitals(record);
          if (alerts.length > 0) {
            const recipients = new Set();
            // Notify assigned caregiver
            if (record.recorded_by) recipients.add(record.recorded_by);
            // Notify admins + doctors
            const staff = await getUsersByType(institutionId, ['admin', 'institution-admin', 'institution_admin', 'InstitutionAdmin', 'doctor']);
            staff.forEach((u) => recipients.add(u.id));

            for (const alert of alerts) {
              for (const userId of recipients) {
                await createNotification(userId, {
                  type: TYPE.EMERGENCY,
                  title: `Abnormal Vital Signs Alert`,
                  message: alert.message,
                  metadata: {
                    navigateTo: '/vital-signs',
                    patientId: record.patient_id,
                    vitalSignId: record.id,
                  },
                });
              }
            }
          }
        }
        break;
      }

      // ─── Prescriptions ─────────────────────────────────────────────────
      case 'prescriptions': {
        if (action === 'create' && record.patient_id) {
          await createNotification(record.patient_id, {
            type: TYPE.PRESCRIPTION,
            title: 'New Prescription',
            message: `You have a new prescription: ${record.medication_name || 'Medication'} ${record.dosage || ''} ${record.frequency || ''}.`,
            metadata: {
              navigateTo: '/medications',
              prescriptionId: record.id,
            },
          });
        }
        break;
      }

      // ─── Care logs ─────────────────────────────────────────────────────
      case 'care_logs': {
        if (action === 'create') {
          // Notify client + admins
          if (record.patient_id) {
            await createNotification(record.patient_id, {
              type: TYPE.SYSTEM,
              title: 'New Care Log Entry',
              message: `${actorName} recorded a care log entry: ${(record.notes || '').substring(0, 100)}`,
              metadata: {
                navigateTo: '/dashboard',
                careLogId: record.id,
              },
            });
          }
          const admins = await getUsersByType(institutionId, ['admin', 'institution-admin', 'institution_admin', 'InstitutionAdmin']);
          for (const admin of admins) {
            await createNotification(admin.id, {
              type: TYPE.SYSTEM,
              title: 'New Care Log Entry',
              message: `${actorName} recorded a care log for ${record.patient_id ? 'a client' : 'a patient'}.`,
              metadata: {
                navigateTo: '/institution-admin/dashboard',
                careLogId: record.id,
              },
            });
          }
        }
        break;
      }

      // ─── Nurse Reports (tiered notifications based on codes & feedback) ─────
      case 'nurse_reports': {
        if (action === 'create') {
          const priorityCode = (record.priority_code || 'green').toLowerCase();
          const patientName = record.client_name || 'a client';
          
          // Determine notification priority based on the report's priority code
          let priority = PRIORITY.LOW;
          let titlePrefix = 'Nurse Report: ';
          
          if (priorityCode === 'red') {
            priority = PRIORITY.CRITICAL;
            titlePrefix = 'CRITICAL Nurse Report: ';
          } else if (priorityCode === 'orange') {
            priority = PRIORITY.HIGH;
            titlePrefix = 'URGENT Nurse Report: ';
          } else if (priorityCode === 'yellow') {
            priority = PRIORITY.MEDIUM;
            titlePrefix = 'Status Change Report: ';
          }
          
          const title = `${titlePrefix}${patientName}`;
          const message = `${record.nurse_name || 'A nurse'} submitted a ${record.report_type || 'report'} for ${patientName}. Priority: ${priorityCode.toUpperCase()}.`;

          // For code red: notify the specific assigned doctor + admins.
          // For other codes: notify all admins + doctors (existing behavior).
          const recipients = new Set();

          if (priorityCode === 'red') {
            // Look up the client's assigned doctor
            if (record.patient_id) {
              const client = await getClientById(record.patient_id);
              if (client && client.assigned_doctor) {
                recipients.add(String(client.assigned_doctor));
              }
            }
            // Always notify admins for code red
            const admins = await getUsersByType(institutionId, ['admin', 'institution-admin', 'institution_admin', 'InstitutionAdmin']);
            admins.forEach((u) => recipients.add(u.id));

            // If no assigned doctor was found, fall back to all doctors
            if (recipients.size === 0 || (recipients.size === admins.length && !record.patient_id)) {
              const doctors = await getUsersByType(institutionId, ['doctor', 'Doctor']);
              doctors.forEach((u) => recipients.add(u.id));
            }
          } else {
            // Non-red codes: notify admins + doctors (existing behavior)
            const staff = await getUsersByType(institutionId, ['admin', 'institution-admin', 'institution_admin', 'InstitutionAdmin', 'doctor']);
            staff.forEach((u) => recipients.add(u.id));
          }

          for (const userId of recipients) {
            await createNotification(userId, {
              type: priorityCode === 'red' ? TYPE.EMERGENCY : TYPE.SYSTEM,
              title,
              message,
              priority,
              metadata: {
                navigateTo: '/institution-admin/dashboard',
                reportId: record.id,
                patientId: record.patient_id,
                priorityCode,
                isCodeRed: priorityCode === 'red',
              },
            });
          }
        } else if (action === 'update' && record.feedback_status === 'acknowledged') {
          // Notify the nurse that their report was seen
          if (record.nurse_id) {
            await createNotification(record.nurse_id, {
              type: TYPE.SYSTEM,
              title: 'Nurse Report Acknowledged',
              message: `Doctor ${record.acknowledged_by || 'on duty'} has reviewed and acknowledged your report for ${record.client_name || 'the client'}.`,
              priority: PRIORITY.MEDIUM,
              metadata: {
                navigateTo: '/caregiver/tasks',
                reportId: record.id,
              },
            });
          }
        }
        break;
      }

      // ─── Emergency alerts (SOS button) ────────────────────────────────
      case 'emergency_alerts': {
        if (action === 'create') {
          const institutionId = record.institution_id || actorUser.institution_id || null;
          const severity = (record.severity || 'critical').toLowerCase();
          const emergencyType = record.type || record.metadata?.emergencyType || 'Emergency';
          const description = record.description || record.metadata?.description || '';
          const location = record.location || record.metadata?.location || '';
          const triggeredByName = record.metadata?.triggeredByName || actorName;
          const contactNumber = record.metadata?.contactNumber || '';

          // Resolve the client to get their name and assigned doctor
          let clientName = 'Unknown Client';
          let assignedDoctorId = null;
          if (record.patient_id) {
            const client = await getClientById(record.patient_id);
            if (client) {
              clientName = client.name || clientName;
              assignedDoctorId = client.assigned_doctor || null;
            }
          }

          const title = `🚨 EMERGENCY ALERT: ${emergencyType} — ${clientName}`;
          const messageParts = [
            `${triggeredByName} triggered an emergency alert for ${clientName}.`,
            `Severity: ${severity.toUpperCase()}.`,
            description ? `Details: ${description}` : '',
            location ? `Location: ${location}` : '',
            contactNumber ? `Contact: ${contactNumber}` : '',
          ].filter(Boolean);
          const message = messageParts.join(' ');

          const metadata = {
            navigateTo: '/institution-admin/dashboard',
            emergencyId: record.id,
            emergencyType,
            clientName,
            clientId: record.patient_id,
            severity,
            triggeredByName,
            description,
            location,
            contactNumber,
            isEmergency: true,
          };

          // Recipients: all doctors + nurses + admins in the institution
          const recipients = new Set();
          const staff = await getUsersByType(institutionId, [
            'admin', 'institution-admin', 'institution_admin', 'InstitutionAdmin',
            'doctor', 'nurse', 'Doctor', 'Nurse',
          ]);
          staff.forEach((u) => recipients.add(u.id));

          // Also notify the assigned doctor specifically (in case their user_type
          // doesn't match the list above)
          if (assignedDoctorId) {
            recipients.add(String(assignedDoctorId));
          }

          for (const userId of recipients) {
            await createNotification(userId, {
              type: TYPE.EMERGENCY,
              title,
              message,
              priority: PRIORITY.CRITICAL,
              institutionId,
              metadata,
            });
          }
        }
        break;
      }

      default:
        // No notification rules for this table
        break;
    }
  } catch (err) {
    // Never let notification failures break the main request
    logger.error(`notificationDispatcher.dispatchTableNotifications error for ${tableName}/${action}:`, err);
  }
}

/**
 * Check vital sign values for abnormal readings.
 */
function checkAbnormalVitals(record) {
  const alerts = [];

  // Blood pressure
  const systolic = parseInt(record.blood_pressure_systolic);
  const diastolic = parseInt(record.blood_pressure_diastolic);
  if (!isNaN(systolic) && !isNaN(diastolic)) {
    if (systolic > 140 || diastolic > 90) {
      alerts.push({ message: `High blood pressure detected: ${systolic}/${diastolic} mmHg` });
    } else if (systolic < 90 || diastolic < 60) {
      alerts.push({ message: `Low blood pressure detected: ${systolic}/${diastolic} mmHg` });
    }
  }

  // Heart rate
  const heartRate = parseInt(record.heart_rate);
  if (!isNaN(heartRate)) {
    if (heartRate > 100) {
      alerts.push({ message: `High heart rate detected: ${heartRate} bpm` });
    } else if (heartRate < 60) {
      alerts.push({ message: `Low heart rate detected: ${heartRate} bpm` });
    }
  }

  // Temperature (assume Fahrenheit)
  const temp = parseFloat(record.temperature);
  if (!isNaN(temp)) {
    if (temp > 100.4) {
      alerts.push({ message: `Fever detected: ${temp}°F` });
    } else if (temp < 97.0) {
      alerts.push({ message: `Low temperature detected: ${temp}°F` });
    }
  }

  // Oxygen saturation
  const o2 = parseFloat(record.oxygen_saturation);
  if (!isNaN(o2) && o2 < 92) {
    alerts.push({ message: `Low oxygen saturation detected: ${o2}%` });
  }

  return alerts;
}

module.exports = {
  dispatchTableNotifications,
  createNotification,
  getUsersByType,
  TYPE,
  PRIORITY,
};
