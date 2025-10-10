import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const getDb = () => admin.firestore();
const getAuth = () => admin.auth();

interface CreateCaregiverData {
  email: string;
  password: string;
  name: string;
  phone: string;
  userType: string;
  institutionId: string;
  specialization?: string;
  qualifications?: string;
  experience?: string;
  availableDays?: string[];
  workingHours?: string;
  hourlyRate?: string;
  address?: string;
  emergencyContact?: string;
  notes?: string;
}

/**
 * Create a caregiver with Firebase Auth account and user/caregiver documents
 * Callable by institution admins only
 */
export const createCaregiverWithAuth = functions.https.onCall(
  async (data: CreateCaregiverData, context) => {
    try {
      // Verify authentication
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User must be authenticated'
        );
      }

      // Verify the caller is an admin
      const callerDoc = await getDb().collection('users').doc(context.auth.uid).get();
      const callerData = callerDoc.data();
      
      if (!callerData || (callerData.userType !== 'admin' && callerData.userType !== 'institutionAdmin')) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Only admins can create caregivers'
        );
      }

      // Validate required fields
      if (!data.email || !data.password || !data.name || !data.institutionId) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Email, password, name, and institutionId are required'
        );
      }

      // Validate password length
      if (data.password.length < 6) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Password must be at least 6 characters'
        );
      }

      // Create Firebase Auth user
      let authUser;
      try {
        authUser = await getAuth().createUser({
          email: data.email,
          password: data.password,
          displayName: data.name,
          emailVerified: false
        });
      } catch (authError: any) {
        if (authError.code === 'auth/email-already-exists') {
          throw new functions.https.HttpsError(
            'already-exists',
            'A user with this email already exists'
          );
        }
        throw authError;
      }

      // Create user document in Firestore
      await getDb().collection('users').doc(authUser.uid).set({
        email: data.email,
        name: data.name,
        phone: data.phone || '',
        userType: data.userType || 'caregiver',
        institutionId: data.institutionId,
        status: 'pending',
        onboardingComplete: false,
        medicalQualification: data.specialization || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: context.auth.uid
      });

      // Create caregiver document in caregivers collection
      await getDb().collection('caregivers').doc(authUser.uid).set({
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        userType: data.userType || 'caregiver',
        specialization: data.specialization || '',
        qualifications: data.qualifications || '',
        experience: data.experience || '',
        availableDays: data.availableDays || [],
        workingHours: data.workingHours || '',
        hourlyRate: data.hourlyRate || '',
        address: data.address || '',
        emergencyContact: data.emergencyContact || '',
        notes: data.notes || '',
        institutionId: data.institutionId,
        status: 'pending',
        rating: 0,
        totalPatients: 0,
        currentPatients: 0,
        performance: {
          punctuality: 0,
          patientSatisfaction: 0,
          taskCompletion: 0,
          communication: 0,
          safety: 0
        },
        earnings: {
          thisMonth: 0,
          lastMonth: 0,
          total: 0
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Log the creation
      await getDb().collection('auditLogs').add({
        action: 'CAREGIVER_CREATED',
        performedBy: context.auth.uid,
        targetUserId: authUser.uid,
        institutionId: data.institutionId,
        details: {
          caregiverName: data.name,
          caregiverEmail: data.email,
          userType: data.userType
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`Caregiver created successfully: ${authUser.uid}`);

      return {
        success: true,
        caregiverId: authUser.uid,
        message: 'Caregiver account created successfully'
      };
    } catch (error: any) {
      console.error('Error creating caregiver:', error);
      
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      
      throw new functions.https.HttpsError(
        'internal',
        `Failed to create caregiver: ${error.message}`
      );
    }
  }
);

