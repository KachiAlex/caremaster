import { addDoc, collection, serverTimestamp } from 'backend/database';
import { db } from '../backend/config';
import logger from '../utils/logger';

const ANALYTICS_COLLECTION = 'analyticsEvents';

const analyticsCollectionRef = collection(db, ANALYTICS_COLLECTION);

export const trackAdminEvent = async (eventType, payload = {}) => {
  if (!eventType) {
    logger.warn('trackAdminEvent called without eventType', { payload });
    return;
  }

  try {
    await addDoc(analyticsCollectionRef, {
      eventType,
      createdAt: serverTimestamp(),
      ...payload
    });
  } catch (error) {
    logger.warn('Failed to record analytics event', { error, eventType, payload });
  }
};

export default {
  trackAdminEvent
};

