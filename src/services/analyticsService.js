import logger from '../utils/logger';
import { collection, addDoc, serverTimestamp } from 'backend/database';
import { db } from '../backend/config';

const ANALYTICS_COLLECTION = 'analytics_events';

const analyticsCollectionRef = collection(db, ANALYTICS_COLLECTION);

export const trackAdminEvent = async (eventType, payload = {}) => {
  if (!eventType) {
    logger.warn('trackAdminEvent called without eventType', { payload });
    return;
  }

  try {
    await addDoc(analyticsCollectionRef, {
      event_type: eventType,
      eventType,
      institution_id: payload.institutionId || null,
      user_id: payload.userId || payload.archivedBy || payload.restoredBy || payload.deletedBy || payload.createdBy || null,
      details: payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    logger.warn('Failed to record analytics event', { error, eventType, payload });
  }
};

export default {
  trackAdminEvent
};

