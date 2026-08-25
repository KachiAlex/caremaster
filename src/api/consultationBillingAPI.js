/**
 * Consultation Billing API
 *
 * Handles the hybrid subscription + pay-per-consult model:
 *
 *  1. Every telemedicine appointment is logged in `consultationLogs`.
 *  2. On scheduling/starting a consultation, quota is checked:
 *       - If the client has an active subscription with remaining quota → mark as
 *         "covered_by_subscription", decrement consultationsUsed on the subscription.
 *       - If quota is exhausted OR subscription is expired/absent → generate a
 *         per-consult bill in `bills` (linked to the consultation log).
 *  3. When a call ends, the log is finalised (duration, status = completed).
 *  4. Admin/institution can view per-client consultation logs and billing status.
 */

import { collection, doc, addDoc, updateDoc, getDoc, getDocs, query, where, orderBy, limit, serverTimestamp, increment, writeBatch } from '../services/databaseCompat';
import { BILL_STATUS, SERVICE_TYPE } from './autoBillingAPI';
import { notificationsAPI } from './notificationsAPI';
import { collection, query, getDocs, getDoc, updateDoc, addDoc, where, doc, serverTimestamp, increment } from 'backend/database';
import { db } from '../backend/config';

// ─── Collection names ────────────────────────────────────────────────────────
const CONSULTATION_LOGS_COLLECTION = 'consultationLogs';
const BILLS_COLLECTION = 'bills';
const CLIENT_SUBSCRIPTIONS_COLLECTION = 'clientSubscriptions';
const BILLING_PLANS_COLLECTION = 'billingPlans';

// ─── Log statuses ────────────────────────────────────────────────────────────
export const CONSULTATION_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show'
};

// ─── Billing modes ───────────────────────────────────────────────────────────
export const BILLING_MODE = {
  COVERED: 'covered_by_subscription',   // within quota
  PAY_PER_CONSULT: 'pay_per_consult',   // quota exhausted / no active sub
  FREE: 'free'                          // plan has unlimited consultations
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal: fetch the client's active subscription + its billing plan
// ─────────────────────────────────────────────────────────────────────────────
const getActiveSubscriptionWithPlan = async (clientId) => {
  try {
    const q = query(
      collection(db, CLIENT_SUBSCRIPTIONS_COLLECTION),
      where('clientId', '==', clientId),
      where('status', '==', 'active')
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;

    // Sort client-side to avoid composite index requirement
    const sorted = snap.docs.sort((a, b) => {
      const aTime = a.data().createdAt?.toMillis?.() || 0;
      const bTime = b.data().createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
    const subDoc = sorted[0];
    const sub = { id: subDoc.id, ...subDoc.data() };

    // Normalise dates
    sub.endDate = sub.endDate?.toDate?.() || (sub.endDate ? new Date(sub.endDate) : null);
    sub.startDate = sub.startDate?.toDate?.() || (sub.startDate ? new Date(sub.startDate) : null);

    // Check if subscription has expired
    if (sub.endDate && sub.endDate < new Date()) {
      // Mark as expired in Database but don't block the read
      updateDoc(doc(db, CLIENT_SUBSCRIPTIONS_COLLECTION, sub.id), {
        status: 'expired',
        updatedAt: serverTimestamp()
      }).catch(() => {});
      return null;
    }

    // Fetch plan details
    if (sub.planId) {
      const planDoc = await getDoc(doc(db, BILLING_PLANS_COLLECTION, sub.planId));
      if (planDoc.exists()) {
        sub.plan = { id: planDoc.id, ...planDoc.data() };
      }
    }

    return sub;
  } catch (err) {
    console.error('consultationBillingAPI: getActiveSubscriptionWithPlan error', err);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal: determine billing mode for this consultation
// ─────────────────────────────────────────────────────────────────────────────
const resolveBillingMode = (subscription) => {
  if (!subscription) return { mode: BILLING_MODE.PAY_PER_CONSULT, subscription: null };

  const plan = subscription.plan || {};
  const included = plan.consultationsIncluded ?? null; // null = unlimited

  if (included === null || included === -1) {
    return { mode: BILLING_MODE.FREE, subscription };
  }

  const used = subscription.consultationsUsed || 0;
  if (used < included) {
    return { mode: BILLING_MODE.COVERED, subscription, remaining: included - used };
  }

  return { mode: BILLING_MODE.PAY_PER_CONSULT, subscription };
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC: Log a consultation and determine/apply billing
// Called when an appointment is created (scheduled) or a call starts.
// ─────────────────────────────────────────────────────────────────────────────
export const logAndBillConsultation = async (appointmentData) => {
  const {
    appointmentId,
    clientId,
    clientName,
    doctorId,
    doctorName,
    doctorSpecialty,
    appointmentDate,
    type = 'video',
    reason = '',
    institutionId,
    status = CONSULTATION_STATUS.SCHEDULED
  } = appointmentData;

  try {
    const subscription = await getActiveSubscriptionWithPlan(clientId);
    const { mode, remaining } = resolveBillingMode(subscription);

    const plan = subscription?.plan || {};
    const perConsultFee = plan.perConsultFee ?? subscription?.plan?.perConsultFee ?? 0;
    const currency = plan.currency || subscription?.currency || 'NGN';

    // ── 1. Write the consultation log ────────────────────────────────────────
    const logData = {
      appointmentId: appointmentId || null,
      clientId,
      clientName,
      doctorId: doctorId || null,
      doctorName: doctorName || 'To be assigned',
      doctorSpecialty: doctorSpecialty || 'General Practice',
      appointmentDate: appointmentDate instanceof Date ? appointmentDate : new Date(appointmentDate || Date.now()),
      type,
      reason,
      institutionId: institutionId || subscription?.institutionId || null,
      status,
      billingMode: mode,
      subscriptionId: subscription?.id || null,
      subscriptionPlanName: plan.name || subscription?.planName || null,
      billId: null,
      billStatus: null,
      fee: mode === BILLING_MODE.PAY_PER_CONSULT ? perConsultFee : 0,
      currency,
      durationMinutes: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const logRef = await addDoc(collection(db, CONSULTATION_LOGS_COLLECTION), logData);
    const logId = logRef.id;

    // ── 2. Subscription quota: decrement if covered ──────────────────────────
    if (mode === BILLING_MODE.COVERED && subscription) {
      await updateDoc(doc(db, CLIENT_SUBSCRIPTIONS_COLLECTION, subscription.id), {
        consultationsUsed: increment(1),
        updatedAt: serverTimestamp()
      });

      // Notify when quota is nearly exhausted (1 left)
      if (remaining === 1) {
        notificationsAPI.createNotification({
          userId: clientId,
          type: 'billing',
          title: 'Consultation quota almost used',
          message: `You have used all included consultations in your ${plan.name || 'current'} plan. Your next consultation will be billed separately.`,
          priority: 'high'
        }).catch(() => {});
      }
    }

    // ── 3. Pay-per-consult: generate a bill ──────────────────────────────────
    let bill = null;
    if (mode === BILLING_MODE.PAY_PER_CONSULT && perConsultFee > 0) {
      const billData = {
        clientId,
        clientName,
        institutionId: institutionId || subscription?.institutionId || null,
        consultationLogId: logId,
        appointmentId: appointmentId || null,
        serviceType: SERVICE_TYPE.CONSULTATION,
        billingMode: BILLING_MODE.PAY_PER_CONSULT,
        items: [{
          description: `Telemedicine Consultation${doctorName ? ` — ${doctorName}` : ''}${doctorSpecialty ? ` (${doctorSpecialty})` : ''}`,
          quantity: 1,
          unitPrice: perConsultFee,
          total: perConsultFee,
          date: new Date().toISOString()
        }],
        subtotal: perConsultFee,
        discount: 0,
        total: perConsultFee,
        currency,
        status: BILL_STATUS.PENDING,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7-day due
        notes: reason ? `Reason: ${reason}` : '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        paidAt: null,
        paymentMethod: null
      };

      const billRef = await addDoc(collection(db, BILLS_COLLECTION), billData);
      bill = { id: billRef.id, ...billData };

      // Link bill back to the log
      await updateDoc(logRef, {
        billId: billRef.id,
        billStatus: BILL_STATUS.PENDING,
        updatedAt: serverTimestamp()
      });

      // Notify client of new bill
      notificationsAPI.createNotification({
        userId: clientId,
        type: 'billing',
        title: 'Consultation invoice generated',
        message: `A charge of ${currency} ${perConsultFee.toLocaleString()} has been raised for your telemedicine consultation${doctorName ? ` with ${doctorName}` : ''}.`,
        priority: 'medium'
      }).catch(() => {});
    }

    return {
      logId,
      billingMode: mode,
      bill,
      subscriptionId: subscription?.id || null,
      remaining: mode === BILLING_MODE.COVERED ? (remaining - 1) : null
    };
  } catch (err) {
    console.error('consultationBillingAPI: logAndBillConsultation error', err);
    throw err;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC: Finalise a consultation log when the call ends
// ─────────────────────────────────────────────────────────────────────────────
export const finaliseConsultation = async (logId, { durationSeconds = 0, status = CONSULTATION_STATUS.COMPLETED } = {}) => {
  if (!logId) return;
  try {
    await updateDoc(doc(db, CONSULTATION_LOGS_COLLECTION, logId), {
      status,
      durationMinutes: Math.ceil(durationSeconds / 60),
      endedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.error('consultationBillingAPI: finaliseConsultation error', err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC: Get all consultation logs for a client
// ─────────────────────────────────────────────────────────────────────────────
export const getConsultationLogsByClient = async (clientId) => {
  try {
    const q = query(
      collection(db, CONSULTATION_LOGS_COLLECTION),
      where('clientId', '==', clientId)
    );
    const snap = await getDocs(q);
    const logs = [];
    snap.forEach(d => {
      const data = d.data();
      logs.push({
        id: d.id,
        ...data,
        appointmentDate: data.appointmentDate?.toDate?.() || new Date(data.appointmentDate || 0),
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        endedAt: data.endedAt?.toDate?.() || data.endedAt
      });
    });
    return logs.sort((a, b) => (b.appointmentDate - a.appointmentDate));
  } catch (err) {
    console.error('consultationBillingAPI: getConsultationLogsByClient error', err);
    return [];
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC: Get all consultation logs for an institution (admin view)
// ─────────────────────────────────────────────────────────────────────────────
export const getConsultationLogsByInstitution = async (institutionId, options = {}) => {
  try {
    let q = query(
      collection(db, CONSULTATION_LOGS_COLLECTION),
      where('institutionId', '==', institutionId)
    );
    if (options.clientId) {
      q = query(q, where('clientId', '==', options.clientId));
    }
    if (options.billingMode) {
      q = query(q, where('billingMode', '==', options.billingMode));
    }
    const snap = await getDocs(q);
    const logs = [];
    snap.forEach(d => {
      const data = d.data();
      logs.push({
        id: d.id,
        ...data,
        appointmentDate: data.appointmentDate?.toDate?.() || new Date(data.appointmentDate || 0),
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        endedAt: data.endedAt?.toDate?.() || data.endedAt
      });
    });
    return logs.sort((a, b) => (b.appointmentDate - a.appointmentDate));
  } catch (err) {
    console.error('consultationBillingAPI: getConsultationLogsByInstitution error', err);
    return [];
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC: Get subscription quota summary for a client (for UI display)
// ─────────────────────────────────────────────────────────────────────────────
export const getConsultationQuotaSummary = async (clientId) => {
  try {
    const subscription = await getActiveSubscriptionWithPlan(clientId);
    if (!subscription) {
      return {
        hasActiveSubscription: false,
        planName: null,
        included: 0,
        used: 0,
        remaining: 0,
        isUnlimited: false,
        perConsultFee: null,
        currency: 'NGN',
        subscriptionEndDate: null
      };
    }

    const plan = subscription.plan || {};
    const included = plan.consultationsIncluded ?? null;
    const used = subscription.consultationsUsed || 0;
    const isUnlimited = included === null || included === -1;

    return {
      hasActiveSubscription: true,
      planName: plan.name || subscription.planName || 'Unknown Plan',
      included: isUnlimited ? null : included,
      used,
      remaining: isUnlimited ? null : Math.max(0, included - used),
      isUnlimited,
      perConsultFee: plan.perConsultFee ?? 0,
      currency: plan.currency || subscription.currency || 'NGN',
      subscriptionEndDate: subscription.endDate
    };
  } catch (err) {
    console.error('consultationBillingAPI: getConsultationQuotaSummary error', err);
    return null;
  }
};
