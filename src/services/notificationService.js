/**
 * Central notification dispatch service.
 *
 * Provides role-aware helpers that wrap notificationsAPI.createNotification
 * with a consistent schema:
 *   { userId, type, title, message, priority, metadata: { navigateTo, ... }, deduplicationKey }
 *
 * Usage:
 *   import { notifyAdmins, notifyCaregiver, notifyClient } from '../services/notificationService';
 *   await notifyAdmins(institutionId, { title, message, type, priority, navigateTo });
 */

import {
  notificationsAPI,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
} from '../api/notificationsAPI';
import { collection, query, where, getDocs } from 'backend/database';
import { db } from '../backend/config';

/**
 * Resolve the authenticated user's database ID from a user object.
 * Works with both the Firebase auth user and the merged userProfile.
 */
export function resolveUserId(userOrProfile) {
  if (!userOrProfile) return null;
  return (
    userOrProfile.id ||
    userOrProfile.uid ||
    userOrProfile.userId ||
    userOrProfile.firebaseUid ||
    null
  );
}

/**
 * Fetch all users of given types within an institution.
 * @param {string} institutionId
 * @param {string[]} types - e.g. ['admin', 'institution_admin']
 * @returns {Promise<Array<{id, email, userType}>>}
 */
async function getUsersByType(institutionId, types) {
  if (!institutionId || !types?.length) return [];
  try {
    const q = query(
      collection(db, 'users'),
      where('institutionId', '==', institutionId),
      where('userType', 'in', types)
    );
    const snap = await getDocs(q);
    const users = [];
    snap.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    return users;
  } catch (err) {
    console.error('notificationService.getUsersByType error:', err);
    return [];
  }
}

/**
 * Core create function — normalizes the schema so every notification
 * has a consistent shape that NotificationPanel can consume.
 */
async function create(data) {
  const {
    userId,
    type = NOTIFICATION_TYPES.SYSTEM,
    title,
    message,
    priority = NOTIFICATION_PRIORITIES.MEDIUM,
    navigateTo,
    deduplicationKey,
    metadata = {},
    ...extra
  } = data;

  if (!userId) {
    console.warn('notificationService.create: missing userId', data);
    return null;
  }

  try {
    return await notificationsAPI.createNotification({
      userId,
      type,
      title,
      message,
      priority,
      metadata: {
        ...metadata,
        ...(navigateTo ? { navigateTo } : {}),
      },
      ...(deduplicationKey ? { deduplicationKey } : {}),
      ...extra,
    });
  } catch (err) {
    console.error('notificationService.create error:', err);
    return null;
  }
}

/**
 * Notify all institution admins of an event.
 * @param {string} institutionId
 * @param {Object} notif - { title, message, type, priority, navigateTo, deduplicationKey, metadata }
 */
export async function notifyAdmins(institutionId, notif) {
  const admins = await getUsersByType(institutionId, [
    'admin',
    'institution_admin',
    'institutionAdmin',
  ]);
  if (!admins.length) return [];
  return Promise.all(
    admins.map((admin) =>
      create({ ...notif, userId: admin.id, deduplicationKey: notif.deduplicationKey ? `${notif.deduplicationKey}:${admin.id}` : undefined })
    )
  );
}

/**
 * Notify a specific user (e.g. caregiver, doctor, client).
 */
export async function notifyUser(userId, notif) {
  return create({ ...notif, userId });
}

/**
 * Notify a caregiver by their user ID.
 */
export async function notifyCaregiver(caregiverUserId, notif) {
  return create({ ...notif, userId: caregiverUserId });
}

/**
 * Notify a client by their user ID.
 */
export async function notifyClient(clientUserId, notif) {
  return create({ ...notif, userId: clientUserId });
}

/**
 * Notify all doctors in an institution.
 */
export async function notifyDoctors(institutionId, notif) {
  const doctors = await getUsersByType(institutionId, ['doctor']);
  if (!doctors.length) return [];
  return Promise.all(
    doctors.map((doctor) =>
      create({ ...notif, userId: doctor.id, deduplicationKey: notif.deduplicationKey ? `${notif.deduplicationKey}:${doctor.id}` : undefined })
    )
  );
}

/**
 * Notify all caregivers in an institution.
 */
export async function notifyCaregivers(institutionId, notif) {
  const caregivers = await getUsersByType(institutionId, ['caregiver']);
  if (!caregivers.length) return [];
  return Promise.all(
    caregivers.map((cg) =>
      create({ ...notif, userId: cg.id, deduplicationKey: notif.deduplicationKey ? `${notif.deduplicationKey}:${cg.id}` : undefined })
    )
  );
}

export { NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES };
export default {
  create,
  notifyAdmins,
  notifyUser,
  notifyCaregiver,
  notifyClient,
  notifyDoctors,
  notifyCaregivers,
  resolveUserId,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
};
