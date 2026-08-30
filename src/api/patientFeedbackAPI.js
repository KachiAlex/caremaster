import { 
  collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, query, where, orderBy, serverTimestamp
} from 'backend/database';
import { db } from '../backend/config';

const PATIENT_FEEDBACK_COLLECTION = 'clientFeedback';

export async function createClientFeedback(feedback) {
  if (!feedback || !feedback.clientId || !feedback.caregiverId || !feedback.weekOf) {
    throw new Error('clientId, caregiverId and weekOf are required');
  }
  
  const payload = {
    ...feedback,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  
  const ref = await addDoc(collection(db, PATIENT_FEEDBACK_COLLECTION), payload);
  const savedDoc = await getDoc(ref);
  return { id: ref.id, ...savedDoc.data() };
}

export async function updateClientFeedback(feedbackId, updates) {
  if (!feedbackId || !updates) throw new Error('feedbackId and updates required');
  const ref = doc(db, PATIENT_FEEDBACK_COLLECTION, feedbackId);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() };
}

export async function deleteClientFeedback(feedbackId) {
  if (!feedbackId) throw new Error('feedbackId required');
  const ref = doc(db, PATIENT_FEEDBACK_COLLECTION, feedbackId);
  await deleteDoc(ref);
  return true;
}

export async function getClientFeedbackByCaregiver(caregiverId, dateRange = {}) {
  if (!caregiverId) throw new Error('caregiverId required');
  
  let q = query(
    collection(db, PATIENT_FEEDBACK_COLLECTION),
    where('caregiverId', '==', caregiverId),
    orderBy('weekOf', 'desc')
  );
  
  if (dateRange.startDate && dateRange.endDate) {
    q = query(
      collection(db, PATIENT_FEEDBACK_COLLECTION),
      where('caregiverId', '==', caregiverId),
      where('weekOf', '>=', dateRange.startDate),
      where('weekOf', '<=', dateRange.endDate),
      orderBy('weekOf', 'desc')
    );
  }
  
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getClientFeedbackByClient(clientId, dateRange = {}) {
  if (!clientId) throw new Error('clientId required');
  
  let q = query(
    collection(db, PATIENT_FEEDBACK_COLLECTION),
    where('clientId', '==', clientId),
    orderBy('weekOf', 'desc')
  );
  
  if (dateRange.startDate && dateRange.endDate) {
    q = query(
      collection(db, PATIENT_FEEDBACK_COLLECTION),
      where('clientId', '==', clientId),
      where('weekOf', '>=', dateRange.startDate),
      where('weekOf', '<=', dateRange.endDate),
      orderBy('weekOf', 'desc')
    );
  }
  
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAllClientFeedback(dateRange = {}) {
  let q = query(
    collection(db, PATIENT_FEEDBACK_COLLECTION),
    orderBy('weekOf', 'desc')
  );
  
  if (dateRange.startDate && dateRange.endDate) {
    q = query(
      collection(db, PATIENT_FEEDBACK_COLLECTION),
      where('weekOf', '>=', dateRange.startDate),
      where('weekOf', '<=', dateRange.endDate),
      orderBy('weekOf', 'desc')
    );
  }
  
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Calculate caregiver rating based on feedback
export function calculateCaregiverRating(feedbackList) {
  if (!feedbackList || feedbackList.length === 0) return 0;
  
  const totalFeedback = feedbackList.length;
  const totalScore = feedbackList.reduce((sum, feedback) => {
    const scores = [
      feedback.punctuality || 0,
      feedback.communication || 0,
      feedback.careQuality || 0,
      feedback.responsiveness || 0,
      feedback.overallSatisfaction || 0
    ];
    return sum + (scores.reduce((a, b) => a + b, 0) / scores.length);
  }, 0);
  
  return Math.round((totalScore / totalFeedback) * 10) / 10; // Round to 1 decimal place
}

// Get feedback statistics
export function getFeedbackStatistics(feedbackList) {
  if (!feedbackList || feedbackList.length === 0) {
    return {
      totalFeedback: 0,
      averageRating: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      trends: {
        punctuality: [],
        communication: [],
        careQuality: [],
        responsiveness: [],
        overallSatisfaction: []
      }
    };
  }
  
  const totalFeedback = feedbackList.length;
  const averageRating = calculateCaregiverRating(feedbackList);
  
  // Calculate rating distribution
  const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  feedbackList.forEach(feedback => {
    const scores = [
      feedback.punctuality,
      feedback.communication,
      feedback.careQuality,
      feedback.responsiveness,
      feedback.overallSatisfaction
    ].filter(s => typeof s === 'number' && !isNaN(s));
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    if (avgScore >= 5) ratingDistribution[5]++;
    else if (avgScore >= 4) ratingDistribution[4]++;
    else if (avgScore >= 3) ratingDistribution[3]++;
    else if (avgScore >= 2) ratingDistribution[2]++;
    else ratingDistribution[1]++;
  });
  
  // Calculate trends (weekly averages)
  const trends = {
    punctuality: [],
    communication: [],
    careQuality: [],
    responsiveness: [],
    overallSatisfaction: []
  };
  
  // Group by week and calculate averages
  const weeklyData = {};
  feedbackList.forEach(feedback => {
    const weekKey = feedback.weekOf;
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = {
        punctuality: [],
        communication: [],
        careQuality: [],
        responsiveness: [],
        overallSatisfaction: []
      };
    }
    
    weeklyData[weekKey].punctuality.push(feedback.punctuality);
    weeklyData[weekKey].communication.push(feedback.communication);
    weeklyData[weekKey].careQuality.push(feedback.careQuality);
    weeklyData[weekKey].responsiveness.push(feedback.responsiveness);
    weeklyData[weekKey].overallSatisfaction.push(feedback.overallSatisfaction);
  });
  
  // Calculate weekly averages
  Object.keys(weeklyData).sort().forEach(week => {
    const weekData = weeklyData[week];
    trends.punctuality.push(
      weekData.punctuality.reduce((a, b) => a + b, 0) / weekData.punctuality.length
    );
    trends.communication.push(
      weekData.communication.reduce((a, b) => a + b, 0) / weekData.communication.length
    );
    trends.careQuality.push(
      weekData.careQuality.reduce((a, b) => a + b, 0) / weekData.careQuality.length
    );
    trends.responsiveness.push(
      weekData.responsiveness.reduce((a, b) => a + b, 0) / weekData.responsiveness.length
    );
    trends.overallSatisfaction.push(
      weekData.overallSatisfaction.reduce((a, b) => a + b, 0) / weekData.overallSatisfaction.length
    );
  });
  
  return {
    totalFeedback,
    averageRating,
    ratingDistribution,
    trends
  };
}
