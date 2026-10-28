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
const { shouldNotify, getEmailRecipient } = require('../routes/notificationPreferences');
const webPush = require('./webPush');
const emailService = require('./emailService');
const sseManager = require('../sse');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
 * Resolve the correct in-app destination for a message notification based on
 * the RECIPIENT's role. The generic '/messages' is the client portal route —
 * staff get bounced out of it, so they need their own messaging surfaces.
 * The resolved URL is stored in the notification and sent in the web-push
 * payload so both in-app clicks and OS-notification taps land correctly.
 */
function resolveMessageNavigateTo(user, metadata) {
  const convId = metadata?.conversationId;
  const role = user?.user_type;
  const instId = user?.institution_id;
  const staffRoles = ['caregiver', 'doctor', 'nurse', 'pharmacist'];
  const adminRoles = ['admin', 'institution-admin', 'institution_admin', 'InstitutionAdmin'];

  if (staffRoles.includes(role)) {
    if (instId) {
      return `/institution-caregiver/dashboard?institution=${instId}&tab=messages${convId ? `&conversation=${convId}` : ''}`;
    }
    return `/service-provider/messages${convId ? `?conversation=${convId}` : ''}`;
  }
  if (adminRoles.includes(role)) {
    return instId
      ? `/institution-admin/dashboard?institution=${instId}&tab=messages${convId ? `&conversation=${convId}` : ''}`
      : '/admin';
  }
  return `/messages${convId ? `?conversation=${convId}` : ''}`;
}

// Throttle chat emails — a busy conversation shouldn't spam the recipient's
// inbox. Other notification types are low-frequency enough to send each time.
const MESSAGE_EMAIL_THROTTLE_MS = 5 * 60 * 1000;
const lastMessageEmailAt = new Map(); // `${userId}:${conversationId}` -> timestamp

/**
 * Email a copy of an in-app notification to the recipient, honouring their
 * notification preferences. Best-effort: never throws, never blocks the
 * notification insert.
 */
async function sendNotificationEmailCopy(userId, data, metadata) {
  try {
    if (data.type === TYPE.MESSAGE) {
      const key = `${userId}:${metadata?.conversationId || 'messages'}`;
      const last = lastMessageEmailAt.get(key) || 0;
      if (Date.now() - last < MESSAGE_EMAIL_THROTTLE_MS) return;
      lastMessageEmailAt.set(key, Date.now());
      // Bound the map so it can't grow forever on a long-running server
      if (lastMessageEmailAt.size > 5000) lastMessageEmailAt.clear();
    }

    const recipient = await getEmailRecipient(userId, data.type);
    if (!recipient) return;

    await emailService.sendNotificationEmail({
      to: recipient.email,
      userName: recipient.name,
      title: data.title,
      message: data.message,
      actionUrl: metadata?.navigateTo,
    });
  } catch (err) {
    logger.error(`notificationDispatcher email for user ${userId} failed:`, err);
  }
}

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
    let metadata = data.metadata;
    // Message notifications carry a generic '/messages' destination —
    // rewrite it for the recipient's role before storing/pushing.
    if (data.type === TYPE.MESSAGE && metadata?.navigateTo) {
      const recipient = await getUserById(userId);
      metadata = { ...metadata, navigateTo: resolveMessageNavigateTo(recipient, metadata) };
    }

    const [row] = await db('notifications').insert({
      user_id: String(userId),
      title: data.title || 'Notification',
      message: data.message || '',
      type: data.type || TYPE.SYSTEM,
      priority: data.priority || 'normal',
      read: false,
      data: metadata ? JSON.stringify(metadata) : null,
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
          navigateTo: metadata?.navigateTo,
          conversationId: metadata?.conversationId,
        },
      }).catch(() => {}); // Non-blocking — don't fail the request if push fails
    }

    // Email a copy of the notification — fire-and-forget so SMTP latency or
    // failures never slow down or break the write path.
    sendNotificationEmailCopy(userId, data, metadata).catch(() => {});

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

// All user_type spellings used for tenant admins and platform super-admins.
const ADMIN_USER_TYPES = [
  'admin', 'institution-admin', 'institution_admin', 'InstitutionAdmin', 'institutionAdmin',
];
const SUPER_ADMIN_USER_TYPES = ['super-admin', 'superadmin', 'super_admin'];

/**
 * Resolve who should receive admin-action notifications for a record.
 * Tenant-tagged records notify that tenant's admins. Untagged records
 * (e.g. a standalone client's video-consultation request, which every
 * institution admin can see and schedule) notify all admins + super-admins
 * so the request can't sit unseen.
 */
async function getAdminRecipients(institutionId) {
  if (institutionId) {
    return getUsersByType(institutionId, ADMIN_USER_TYPES);
  }
  try {
    return await db('users')
      .whereIn('user_type', [...ADMIN_USER_TYPES, ...SUPER_ADMIN_USER_TYPES])
      .select('id', 'email', 'user_type', 'institution_id', 'first_name', 'last_name');
  } catch (err) {
    logger.error('notificationDispatcher.getAdminRecipients error:', err);
    return [];
  }
}

/**
 * In-app destination for an admin notification — institution admins land on
 * the Clients → Care Requests tab; super-admins land on their dashboard.
 */
function adminNavigateTo(admin) {
  if (SUPER_ADMIN_USER_TYPES.includes(admin?.user_type)) {
    return '/super-admin/dashboard';
  }
  const instParam = admin?.institution_id ? `institution=${admin.institution_id}&` : '';
  return `/institution-admin/dashboard?${instParam}tab=clients&subTab=care-requests`;
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
 * Resolve a loose identifier (users.id, users.firebase_uid, or clients.id)
 * to the canonical users.id so conversations/messages reference the auth
 * identity consistently.
 */
async function resolveCanonicalUserId(id) {
  if (!id) return null;
  const s = String(id);
  try {
    const candidates = [s];
    if (UUID_RE.test(s)) {
      const client = await db('clients').where({ id: s }).select('user_id').first();
      if (client?.user_id) candidates.push(String(client.user_id));
    }
    for (const candidate of candidates) {
      const user = UUID_RE.test(candidate)
        ? await db('users').where({ id: candidate }).select('id').first()
        : null;
      if (user) return String(user.id);
      const byUid = await db('users').where({ firebase_uid: candidate }).select('id').first();
      if (byUid) return String(byUid.id);
    }
    return null;
  } catch (err) {
    logger.error('notificationDispatcher.resolveCanonicalUserId error:', err);
    return null;
  }
}

/**
 * Find an existing direct conversation between two canonical users.id values,
 * or create one. Mirrors normalizeConversationData in routes/data.js so the
 * row has canonical participants, participant_details and institution_id.
 */
async function ensureDirectConversation(userA, userB, institutionId) {
  const participants = [String(userA), String(userB)];
  const existing = await db('conversations')
    .whereRaw('participants @> ?::jsonb', [JSON.stringify([participants[0]])])
    .whereRaw('participants @> ?::jsonb', [JSON.stringify([participants[1]])])
    .whereRaw('jsonb_array_length(participants) = 2')
    .first();
  if (existing) return existing;

  const users = await db('users').whereIn('id', participants)
    .select('id', 'first_name', 'last_name', 'email', 'user_type', 'institution_id');
  const byId = new Map(users.map(u => [String(u.id), u]));
  const details = participants.map(pid => {
    const u = byId.get(pid);
    return { id: pid, name: displayName(u), role: u?.user_type || 'unknown' };
  });
  const tenant = institutionId || byId.get(participants[0])?.institution_id
    || byId.get(participants[1])?.institution_id || null;

  const [created] = await db('conversations').insert({
    participants: JSON.stringify(participants),
    participant_details: JSON.stringify(details),
    conversation_type: 'general',
    institution_id: tenant,
    created_at: new Date(),
    updated_at: new Date(),
  }).returning('*');

  sseManager.emitTableEvent('conversations', created, {
    userIds: participants,
    institutionId: tenant,
  });
  return created;
}

/**
 * Post an admin's scheduling response as a real chat message in the
 * admin↔client conversation so it appears in the client's Messages tab
 * (and lets the client reply or call the admin back directly).
 * Returns the conversation_id, or null if no message could be sent.
 */
async function sendConsultationResponseMessage(record, actorUser) {
  try {
    const adminId = actorUser?.id ? String(actorUser.id) : null;
    const clientUserId = await resolveCanonicalUserId(record.client_id);
    if (!adminId || !clientUserId || adminId === clientUserId) return null;

    const conversation = await ensureDirectConversation(
      adminId, clientUserId, record.institution_id || actorUser.institution_id || null
    );

    const doctorName = record.doctor_name || 'a doctor';
    const apptDate = record.appointment_date ? new Date(record.appointment_date) : null;
    const apptTz = process.env.APP_TIMEZONE || 'Africa/Lagos';
    const dateStr = apptDate && !isNaN(apptDate.getTime())
      ? `${apptDate.toLocaleDateString([], { timeZone: apptTz })} at ${apptDate.toLocaleTimeString([], { timeZone: apptTz, hour: '2-digit', minute: '2-digit' })}`
      : 'a time to be confirmed';
    const text = `Your video consultation has been scheduled with ${doctorName} on ${dateStr} (${record.duration || 30} min). Reply here if you need to reschedule.`;

    const now = new Date();
    const [message] = await db('messages').insert({
      conversation_id: conversation.id,
      sender_id: adminId,
      sender_name: displayName(actorUser),
      receiver_id: clientUserId,
      text,
      content: text,
      message_type: 'text',
      read: false,
      institution_id: conversation.institution_id || record.institution_id || null,
      sent_at: now,
      created_at: now,
    }).returning('*');

    const preview = text.slice(0, 120);
    await db('conversations').where({ id: conversation.id }).update({
      last_message: preview,
      last_message_time: now,
      last_message_at: now,
      last_message_preview: preview,
      updated_at: now,
    });

    const userIds = [adminId, clientUserId];
    const instId = conversation.institution_id || record.institution_id || null;
    sseManager.emitTableEvent('messages', message, { userIds, institutionId: instId });
    sseManager.emitTableEvent('conversations', { ...conversation, last_message: preview, last_message_time: now }, { userIds, institutionId: instId });

    return conversation.id;
  } catch (err) {
    logger.error('notificationDispatcher.sendConsultationResponseMessage error:', err);
    return null;
  }
}

/**
 * A scheduled video consultation is also an assignment: create an
 * `assignments` row linking the client to the doctor so it shows up in the
 * admin Assignments view, the doctor's assigned clients, and the client's
 * care-team view. Idempotent — one row per telemedicine appointment, keyed
 * in metadata.
 */
async function createConsultationAssignment(record, actorUser) {
  try {
    const clientUserId = await resolveCanonicalUserId(record.client_id);
    const doctorUserId = await resolveCanonicalUserId(record.doctor_id);
    if (!clientUserId || !doctorUserId) return null;

    // Dedupe — one assignment per telemedicine appointment.
    const existing = await db('assignments')
      .whereRaw("metadata->>'telemedicineAppointmentId' = ?", [String(record.id)])
      .first();
    if (existing) return existing;

    // assignments.client_id holds the clients-table row id (that's what the
    // patient's row scope joins on), while patient_id holds the users.id.
    let clientDocId = null;
    if (UUID_RE.test(String(record.client_id))) {
      const direct = await db('clients').where({ id: String(record.client_id) }).select('id').first();
      if (direct) clientDocId = direct.id;
    }
    if (!clientDocId) {
      const byUser = await db('clients').where({ user_id: clientUserId }).select('id').first();
      clientDocId = byUser?.id || null;
    }

    const doctor = await getUserById(doctorUserId);
    const clientUser = await getUserById(clientUserId);
    const apptDate = record.appointment_date ? new Date(record.appointment_date) : null;
    const validDate = apptDate && !isNaN(apptDate.getTime()) ? apptDate : null;
    const now = new Date();

    const [assignment] = await db('assignments').insert({
      client_id: clientDocId || String(record.client_id),
      patient_id: clientUserId,
      client_name: record.client_name || displayName(clientUser),
      client_email: clientUser?.email || null,
      caregiver_id: doctorUserId,
      caregiver_name: record.doctor_name || displayName(doctor),
      caregiver_email: doctor?.email || null,
      assigned_by: String(actorUser.id),
      assigned_by_name: displayName(actorUser),
      assigned_to_role: 'doctor',
      assignment_type: 'video-consultation',
      type: 'doctor',
      title: 'Video Consultation',
      description: record.reason || 'Scheduled video consultation',
      start_date: validDate,
      end_date: validDate,
      due_date: validDate ? validDate.toISOString().slice(0, 10) : null,
      due_time: validDate ? validDate.toTimeString().slice(0, 5) : null,
      status: 'active',
      institution_id: record.institution_id || actorUser.institution_id || doctor?.institution_id || null,
      metadata: JSON.stringify({
        telemedicineAppointmentId: record.id,
        channelName: record.channel_name || null,
      }),
      created_at: now,
      updated_at: now,
    }).returning('*');

    sseManager.emitTableEvent('assignments', assignment, {
      userIds: [doctorUserId, clientUserId, String(actorUser.id)],
      institutionId: assignment.institution_id,
    });
    return assignment;
  } catch (err) {
    logger.error('notificationDispatcher.createConsultationAssignment error:', err);
    return null;
  }
}

/**
 * Keep the consultation's assignment row in step with the appointment —
 * a cancelled/completed consultation shouldn't linger as an active
 * assignment.
 */
async function syncConsultationAssignmentStatus(record) {
  try {
    if (!['cancelled', 'completed'].includes(record.status)) return;
    await db('assignments')
      .whereRaw("metadata->>'telemedicineAppointmentId' = ?", [String(record.id)])
      .whereNot('status', record.status)
      .update({ status: record.status, updated_at: new Date() });
  } catch (err) {
    logger.error('notificationDispatcher.syncConsultationAssignmentStatus error:', err);
  }
}

/**
 * Main dispatch function — called after a record is created or updated.
 * Examines the table + record + action and creates appropriate notifications.
 *
 * @param {string} tableName - PostgreSQL table name (e.g. 'appointments')
 * @param {object} record - The created/updated record (snake_case DB row)
 * @param {object} actorUser - The authenticated user from req.user
 * @param {string} action - 'create' or 'update'
 * @param {object} [previousRecord] - The row before an update, when available
 */
async function dispatchTableNotifications(tableName, record, actorUser, action, previousRecord) {
  if (!record || !actorUser) return;

  try {
    const institutionId = record.institution_id || actorUser.institution_id || null;
    const actorName = displayName(actorUser);

    switch (tableName) {
      // ─── Appointments (care visit requests) ───────────────────────────
      case 'appointments': {
        if (action === 'create') {
          // Client created a care visit request that still needs a caregiver
          // assigned → notify admins. Patients may submit with status
          // 'scheduled' when they picked a date, so key on the actor role +
          // missing assignee rather than status alone.
          const isPatientActor = ['client', 'patient', 'elderly', 'Client'].includes(actorUser.user_type);
          const needsAssignment = !record.caregiver_id;
          if (isPatientActor && needsAssignment) {
            const admins = await getAdminRecipients(institutionId);
            const clientName = record.title || actorName;
            for (const admin of admins) {
              await createNotification(admin.id, {
                type: TYPE.APPOINTMENT,
                title: 'New Care Visit Request',
                message: `${clientName} requested a care visit${record.scheduled_at ? ` for ${new Date(record.scheduled_at).toLocaleDateString()}` : ''}.`,
                priority: PRIORITY.MEDIUM,
                institutionId,
                metadata: {
                  navigateTo: adminNavigateTo(admin),
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
          const admins = await getAdminRecipients(institutionId);
          const clientName = record.client_name || actorName;
          const isUrgent = String(record.urgency || '').toLowerCase() === 'urgent';
          for (const admin of admins) {
            await createNotification(admin.id, {
              type: TYPE.CONSULTATION,
              title: 'New Video Consultation Request',
              message: `${clientName} requested a video consultation${record.reason ? `: ${record.reason.substring(0, 80)}` : '.'}`,
              priority: isUrgent ? PRIORITY.HIGH : PRIORITY.MEDIUM,
              institutionId,
              metadata: {
                navigateTo: adminNavigateTo(admin),
                appointmentId: record.id,
                clientId: record.client_id,
                clientName,
                urgency: record.urgency || 'normal',
              },
            });
          }
        } else if (action === 'update' && record.status === 'scheduled') {
          // Post the admin's response into an admin↔client conversation so it
          // shows in the client's Messages tab — only on the transition to
          // 'scheduled' (later edits/re-schedules don't re-send).
          let conversationId = null;
          if (previousRecord?.status !== 'scheduled') {
            conversationId = await sendConsultationResponseMessage(record, actorUser);
            // A scheduled consult is also a doctor assignment — create the
            // assignments row so it shows in the admin/doctor/client views.
            await createConsultationAssignment(record, actorUser);
          }

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
          // Notify client — deep-link into the conversation carrying the
          // scheduling response when one was created.
          if (record.client_id) {
            await createNotification(record.client_id, {
              type: TYPE.CONSULTATION,
              title: 'Video Consultation Scheduled',
              message: `Your video consultation has been scheduled with ${record.doctor_name || 'a doctor'}${record.appointment_date ? ` on ${new Date(record.appointment_date).toLocaleDateString()} at ${new Date(record.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}.`,
              metadata: {
                navigateTo: conversationId ? `/messages?conversation=${conversationId}` : '/telemedicine',
                appointmentId: record.id,
                conversationId: conversationId || undefined,
              },
            });
          }
        } else if (action === 'update' && ['cancelled', 'completed'].includes(record.status)) {
          // Keep the linked assignment in step — a cancelled or finished
          // consultation shouldn't linger as an active assignment.
          await syncConsultationAssignmentStatus(record);
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
