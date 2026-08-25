/**
 * Radiology & Imaging API
 * 
 * Phase 2 Implementation - Complete radiology workflow:
 * - Imaging request management (X-ray, CT, MRI, ultrasound)
 * - Image storage and retrieval
 * - Radiologist reporting workflow
 * - Status tracking (requested → scheduled → completed → reviewed)
 * - PACS integration support
 * - DICOM support (framework)
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp
} from 'backend/database';
import { notificationsAPI } from './notificationsAPI';
import { generateBillFromImaging } from './autoBillingAPI';
import { db } from '../backend/config';

const IMAGING_REQUESTS_COLLECTION = 'imagingRequests';
const IMAGING_RESULTS_COLLECTION = 'imagingResults';
const IMAGING_IMAGES_COLLECTION = 'imagingImages';

// Imaging types
export const IMAGING_TYPE = {
  XRAY: 'xray',
  CT: 'ct',
  MRI: 'mri',
  ULTRASOUND: 'ultrasound',
  MAMMOGRAPHY: 'mammography',
  ECHOCARDIOGRAM: 'echocardiogram',
  DOPPLER: 'doppler',
  OTHER: 'other'
};

// Imaging status
export const IMAGING_STATUS = {
  REQUESTED: 'requested',
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  REVIEWED: 'reviewed',
  CANCELLED: 'cancelled'
};

// Priority levels
export const IMAGING_PRIORITY = {
  ROUTINE: 'routine',
  URGENT: 'urgent',
  STAT: 'stat', // Immediate
  EMERGENCY: 'emergency'
};

/**
 * Create imaging request
 */
export const createImagingRequest = async (requestData) => {
  try {
    const {
      clientId,
      clientName,
      institutionId,
      doctorId,
      doctorName,
      imagingType,
      bodyPart,
      clinicalIndication,
      priority = IMAGING_PRIORITY.ROUTINE,
      scheduledDate = null,
      notes = '',
      relatedConsultationId = null
    } = requestData;

    if (!clientId || !institutionId || !doctorId || !imagingType) {
      throw new Error('Missing required fields: clientId, institutionId, doctorId, imagingType');
    }

    const imagingRequest = {
      clientId,
      clientName,
      institutionId,
      doctorId,
      doctorName,
      imagingType,
      bodyPart: bodyPart || '',
      clinicalIndication: clinicalIndication || '',
      priority,
      status: scheduledDate ? IMAGING_STATUS.SCHEDULED : IMAGING_STATUS.REQUESTED,
      scheduledDate: scheduledDate || null,
      notes,
      relatedConsultationId,
      completedAt: null,
      reviewedAt: null,
      radiologistId: null,
      radiologistName: null,
      reportId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const requestRef = await addDoc(collection(db, IMAGING_REQUESTS_COLLECTION), imagingRequest);

    // Send notification to radiology department
    try {
      await notificationsAPI.createNotification({
        userId: 'radiology-staff', // Would be sent to all radiology staff
        type: 'imaging_request',
        title: 'New Imaging Request',
        message: `${imagingType.toUpperCase()} requested for ${clientName}`,
        priority: priority === IMAGING_PRIORITY.EMERGENCY || priority === IMAGING_PRIORITY.STAT ? 'high' : 'medium',
        data: {
          requestId: requestRef.id,
          clientId,
          imagingType,
          priority
        },
        institutionId
      });
    } catch (notifError) {
      console.warn('Failed to send imaging request notification:', notifError);
    }

    // Auto-generate bill for imaging request (Phase 2: Auto-billing integration)
    try {
      const shouldAutoBill = requestData.autoBilling !== false;
      if (shouldAutoBill) {
        await generateBillFromImaging(requestRef.id, {
          notes: `Auto-generated bill for ${imagingType} imaging`
        });
        console.log('✅ Auto-bill generated for imaging request:', requestRef.id);
      }
    } catch (billingError) {
      console.warn('Could not auto-generate bill for imaging request:', billingError);
    }

    return {
      id: requestRef.id,
      ...imagingRequest
    };
  } catch (error) {
    console.error('Error creating imaging request:', error);
    throw error;
  }
};

/**
 * Update imaging request status
 */
export const updateImagingRequestStatus = async (requestId, status, additionalData = {}) => {
  try {
    const requestRef = doc(db, IMAGING_REQUESTS_COLLECTION, requestId);
    const updateData = {
      status,
      updatedAt: serverTimestamp(),
      ...additionalData
    };

    // Add timestamp based on status
    if (status === IMAGING_STATUS.COMPLETED && !additionalData.completedAt) {
      updateData.completedAt = serverTimestamp();
    } else if (status === IMAGING_STATUS.REVIEWED && !additionalData.reviewedAt) {
      updateData.reviewedAt = serverTimestamp();
    }

    await updateDoc(requestRef, updateData);

    // Get updated request
    const requestSnap = await getDoc(requestRef);
    if (requestSnap.exists()) {
      return {
        id: requestSnap.id,
        ...requestSnap.data(),
        createdAt: requestSnap.data().createdAt?.toDate?.() || requestSnap.data().createdAt,
        updatedAt: requestSnap.data().updatedAt?.toDate?.() || requestSnap.data().updatedAt,
        scheduledDate: requestSnap.data().scheduledDate ? new Date(requestSnap.data().scheduledDate) : null,
        completedAt: requestSnap.data().completedAt?.toDate?.() || requestSnap.data().completedAt,
        reviewedAt: requestSnap.data().reviewedAt?.toDate?.() || requestSnap.data().reviewedAt
      };
    }

    return null;
  } catch (error) {
    console.error('Error updating imaging request status:', error);
    throw error;
  }
};

/**
 * Schedule imaging request
 */
export const scheduleImagingRequest = async (requestId, scheduledDate, radiologistId = null, radiologistName = null) => {
  try {
    return await updateImagingRequestStatus(requestId, IMAGING_STATUS.SCHEDULED, {
      scheduledDate: scheduledDate instanceof Date ? scheduledDate.toISOString() : scheduledDate,
      radiologistId,
      radiologistName
    });
  } catch (error) {
    console.error('Error scheduling imaging request:', error);
    throw error;
  }
};

/**
 * Complete imaging (mark as completed after imaging is done)
 */
export const completeImaging = async (requestId, imageUrls = [], technicianNotes = '') => {
  try {
    const requestRef = doc(db, IMAGING_REQUESTS_COLLECTION, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Imaging request not found');
    }

    const requestData = requestSnap.data();

    // Store images
    if (imageUrls.length > 0) {
      const imagesRef = collection(db, IMAGING_IMAGES_COLLECTION);
      for (const imageUrl of imageUrls) {
        await addDoc(imagesRef, {
          requestId,
          clientId: requestData.clientId,
          institutionId: requestData.institutionId,
          imageUrl,
          uploadedAt: serverTimestamp()
        });
      }
    }

    // Update request status
    await updateImagingRequestStatus(requestId, IMAGING_STATUS.COMPLETED, {
      imageUrls,
      technicianNotes,
      completedAt: serverTimestamp()
    });

    // Notify radiologist
    if (requestData.radiologistId) {
      try {
        await notificationsAPI.createNotification({
          userId: requestData.radiologistId,
          type: 'imaging_completed',
          title: 'Imaging Completed',
          message: `${requestData.imagingType.toUpperCase()} for ${requestData.clientName} is ready for review`,
          priority: 'medium',
          data: {
            requestId,
            clientId: requestData.clientId,
            imagingType: requestData.imagingType
          },
          institutionId: requestData.institutionId
        });
      } catch (notifError) {
        console.warn('Failed to send completion notification:', notifError);
      }
    }

    return { success: true, requestId };
  } catch (error) {
    console.error('Error completing imaging:', error);
    throw error;
  }
};

/**
 * Create radiologist report
 */
export const createRadiologistReport = async (requestId, reportData) => {
  try {
    const {
      radiologistId,
      radiologistName,
      findings,
      impression,
      recommendations,
      reportText,
      imagesReviewed = []
    } = reportData;

    if (!radiologistId || !findings || !impression) {
      throw new Error('Missing required fields: radiologistId, findings, impression');
    }

    // Get imaging request
    const requestRef = doc(db, IMAGING_REQUESTS_COLLECTION, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Imaging request not found');
    }

    const requestData = requestSnap.data();

    // Create report
    const report = {
      requestId,
      clientId: requestData.clientId,
      clientName: requestData.clientName,
      institutionId: requestData.institutionId,
      imagingType: requestData.imagingType,
      bodyPart: requestData.bodyPart,
      radiologistId,
      radiologistName,
      findings,
      impression,
      recommendations: recommendations || '',
      reportText: reportText || '',
      imagesReviewed,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const reportRef = await addDoc(collection(db, IMAGING_RESULTS_COLLECTION), report);

    // Update imaging request
    await updateImagingRequestStatus(requestId, IMAGING_STATUS.REVIEWED, {
      reportId: reportRef.id,
      radiologistId,
      radiologistName,
      reviewedAt: serverTimestamp()
    });

    // Notify requesting doctor
    try {
      await notificationsAPI.createNotification({
        userId: requestData.doctorId,
        type: 'imaging_report_ready',
        title: 'Imaging Report Ready',
        message: `Radiology report for ${requestData.imagingType.toUpperCase()} is ready for ${requestData.clientName}`,
        priority: 'medium',
        data: {
          requestId,
          reportId: reportRef.id,
          clientId: requestData.clientId
        },
        institutionId: requestData.institutionId
      });
    } catch (notifError) {
      console.warn('Failed to send report notification:', notifError);
    }

    return {
      id: reportRef.id,
      ...report
    };
  } catch (error) {
    console.error('Error creating radiologist report:', error);
    throw error;
  }
};

/**
 * Get imaging requests
 */
export const getImagingRequests = async (institutionId, options = {}) => {
  try {
    const { status, clientId, doctorId, imagingType, limitCount = 100 } = options;
    
    let requestsQuery = query(
      collection(db, IMAGING_REQUESTS_COLLECTION),
      where('institutionId', '==', institutionId),
      orderBy('createdAt', 'desc')
    );

    if (status) {
      requestsQuery = query(requestsQuery, where('status', '==', status));
    }

    if (clientId) {
      requestsQuery = query(requestsQuery, where('clientId', '==', clientId));
    }

    if (doctorId) {
      requestsQuery = query(requestsQuery, where('doctorId', '==', doctorId));
    }

    if (imagingType) {
      requestsQuery = query(requestsQuery, where('imagingType', '==', imagingType));
    }

    if (limitCount) {
      requestsQuery = query(requestsQuery, limit(limitCount));
    }

    const querySnapshot = await getDocs(requestsQuery);
    const requests = [];

    querySnapshot.forEach((doc) => {
      const requestData = doc.data();
      requests.push({
        id: doc.id,
        ...requestData,
        createdAt: requestData.createdAt?.toDate?.() || requestData.createdAt,
        updatedAt: requestData.updatedAt?.toDate?.() || requestData.updatedAt,
        scheduledDate: requestData.scheduledDate ? new Date(requestData.scheduledDate) : null,
        completedAt: requestData.completedAt?.toDate?.() || requestData.completedAt,
        reviewedAt: requestData.reviewedAt?.toDate?.() || requestData.reviewedAt
      });
    });

    return requests;
  } catch (error) {
    console.error('Error fetching imaging requests:', error);
    throw error;
  }
};

/**
 * Get imaging request by ID
 */
export const getImagingRequestById = async (requestId) => {
  try {
    const requestRef = doc(db, IMAGING_REQUESTS_COLLECTION, requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
      return null;
    }

    const requestData = requestSnap.data();
    return {
      id: requestSnap.id,
      ...requestData,
      createdAt: requestData.createdAt?.toDate?.() || requestData.createdAt,
      updatedAt: requestData.updatedAt?.toDate?.() || requestData.updatedAt,
      scheduledDate: requestData.scheduledDate ? new Date(requestData.scheduledDate) : null,
      completedAt: requestData.completedAt?.toDate?.() || requestData.completedAt,
      reviewedAt: requestData.reviewedAt?.toDate?.() || requestData.reviewedAt
    };
  } catch (error) {
    console.error('Error fetching imaging request:', error);
    throw error;
  }
};

/**
 * Get radiologist report by request ID
 */
export const getRadiologistReport = async (requestId) => {
  try {
    const reportsQuery = query(
      collection(db, IMAGING_RESULTS_COLLECTION),
      where('requestId', '==', requestId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const querySnapshot = await getDocs(reportsQuery);
    
    if (querySnapshot.empty) {
      return null;
    }

    const reportData = querySnapshot.docs[0].data();
    return {
      id: querySnapshot.docs[0].id,
      ...reportData,
      createdAt: reportData.createdAt?.toDate?.() || reportData.createdAt,
      updatedAt: reportData.updatedAt?.toDate?.() || reportData.updatedAt
    };
  } catch (error) {
    console.error('Error fetching radiologist report:', error);
    throw error;
  }
};

/**
 * Get imaging images for a request
 */
export const getImagingImages = async (requestId) => {
  try {
    const imagesQuery = query(
      collection(db, IMAGING_IMAGES_COLLECTION),
      where('requestId', '==', requestId),
      orderBy('uploadedAt', 'asc')
    );

    const querySnapshot = await getDocs(imagesQuery);
    const images = [];

    querySnapshot.forEach((doc) => {
      const imageData = doc.data();
      images.push({
        id: doc.id,
        ...imageData,
        uploadedAt: imageData.uploadedAt?.toDate?.() || imageData.uploadedAt
      });
    });

    return images;
  } catch (error) {
    console.error('Error fetching imaging images:', error);
    throw error;
  }
};

/**
 * Get imaging statistics
 */
export const getImagingStats = async (institutionId, startDate = null, endDate = null) => {
  try {
    const requests = await getImagingRequests(institutionId);
    
    let filteredRequests = requests;
    if (startDate || endDate) {
      filteredRequests = requests.filter(request => {
        const requestDate = request.createdAt instanceof Date 
          ? request.createdAt 
          : new Date(request.createdAt);
        if (startDate && requestDate < new Date(startDate)) return false;
        if (endDate && requestDate > new Date(endDate)) return false;
        return true;
      });
    }

    const stats = {
      total: filteredRequests.length,
      requested: filteredRequests.filter(r => r.status === IMAGING_STATUS.REQUESTED).length,
      scheduled: filteredRequests.filter(r => r.status === IMAGING_STATUS.SCHEDULED).length,
      inProgress: filteredRequests.filter(r => r.status === IMAGING_STATUS.IN_PROGRESS).length,
      completed: filteredRequests.filter(r => r.status === IMAGING_STATUS.COMPLETED).length,
      reviewed: filteredRequests.filter(r => r.status === IMAGING_STATUS.REVIEWED).length,
      byType: {
        xray: filteredRequests.filter(r => r.imagingType === IMAGING_TYPE.XRAY).length,
        ct: filteredRequests.filter(r => r.imagingType === IMAGING_TYPE.CT).length,
        mri: filteredRequests.filter(r => r.imagingType === IMAGING_TYPE.MRI).length,
        ultrasound: filteredRequests.filter(r => r.imagingType === IMAGING_TYPE.ULTRASOUND).length
      },
      averageCompletionTime: 0 // Would calculate from completedAt - createdAt
    };

    return stats;
  } catch (error) {
    console.error('Error calculating imaging stats:', error);
    throw error;
  }
};

