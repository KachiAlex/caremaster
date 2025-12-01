import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { generateClientId } from '../utils/clientIdGenerator';
import { encryptPatientData, decryptPatientData } from '../utils/dataEncryptionHelper';
import secureConfigService from '../services/secureConfigService';
import { logPatientRegistration, logPatientProfileUpdate } from '../utils/patientLogger';

const CLIENTS_COLLECTION = 'clients';

const normalizeClientDoc = (docSnap) => {
  const clientData = docSnap.data();
  
  // SECURITY FIX: Decrypt sensitive patient data if encrypted
  const shouldDecrypt = secureConfigService.get('security.encryptPatientData', true);
  const decryptedData = shouldDecrypt ? decryptPatientData(clientData) : clientData;
  
  return {
    id: docSnap.id,
    ...decryptedData,
    dateOfBirth: decryptedData.dateOfBirth?.toDate?.() || decryptedData.dateOfBirth,
    createdAt: decryptedData.createdAt?.toDate?.() || decryptedData.createdAt,
    updatedAt: decryptedData.updatedAt?.toDate?.() || decryptedData.updatedAt,
    lastVisit: decryptedData.lastVisit?.toDate?.() || decryptedData.lastVisit,
  };
};

// Get all clients (admin only)
export const getAllClients = async (institutionId = null) => {
  try {
    const clientsRef = collection(db, CLIENTS_COLLECTION);
    let q;
    
    // Add institution filtering if provided
    if (institutionId) {
      // Try with orderBy first, fallback to just where if index doesn't exist
      try {
        q = query(clientsRef, 
          where('institutionId', '==', institutionId),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        
        const clients = [];
        const shouldDecrypt = secureConfigService.get('security.encryptPatientData', true);
        querySnapshot.forEach((doc) => {
          const clientData = doc.data();
          // SECURITY FIX: Decrypt sensitive patient data if encrypted
          const decryptedData = shouldDecrypt ? decryptPatientData(clientData) : clientData;
          clients.push({
            id: doc.id,
            ...decryptedData,
            dateOfBirth: decryptedData.dateOfBirth?.toDate?.() || decryptedData.dateOfBirth,
            createdAt: decryptedData.createdAt?.toDate?.() || decryptedData.createdAt,
            updatedAt: decryptedData.updatedAt?.toDate?.() || decryptedData.updatedAt,
            lastVisit: decryptedData.lastVisit?.toDate?.() || decryptedData.lastVisit,
          });
        });
        
        return clients;
      } catch (indexError) {
        console.warn('Firestore index not found, using simpler query:', indexError);
        // Fallback: query without orderBy, then sort in memory
        q = query(clientsRef, where('institutionId', '==', institutionId));
        const querySnapshot = await getDocs(q);
        
        const clients = [];
        querySnapshot.forEach((doc) => {
          const clientData = doc.data();
          clients.push({
            id: doc.id,
            ...clientData,
            dateOfBirth: clientData.dateOfBirth?.toDate?.() || clientData.dateOfBirth,
            createdAt: clientData.createdAt?.toDate?.() || clientData.createdAt,
            updatedAt: clientData.updatedAt?.toDate?.() || clientData.updatedAt,
            lastVisit: clientData.lastVisit?.toDate?.() || clientData.lastVisit,
          });
        });
        
        // Sort in memory by createdAt
        clients.sort((a, b) => {
          const aTime = a.createdAt?.getTime?.() || 0;
          const bTime = b.createdAt?.getTime?.() || 0;
          return bTime - aTime; // Descending order
        });
        
        return clients;
      }
    } else {
      q = query(clientsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const clients = [];
      querySnapshot.forEach((doc) => {
        const clientData = doc.data();
        clients.push({
          id: doc.id,
          ...clientData,
          dateOfBirth: clientData.dateOfBirth?.toDate?.() || clientData.dateOfBirth,
          createdAt: clientData.createdAt?.toDate?.() || clientData.createdAt,
          updatedAt: clientData.updatedAt?.toDate?.() || clientData.updatedAt,
          lastVisit: clientData.lastVisit?.toDate?.() || clientData.lastVisit,
        });
      });
      
      return clients;
    }
  } catch (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }
};

// Get clients by institution
export const getClientsByInstitution = async (institutionId) => {
  try {
    const clientsRef = collection(db, CLIENTS_COLLECTION);
    const q = query(clientsRef, 
      where('institutionId', '==', institutionId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const clients = [];
    querySnapshot.forEach((doc) => {
      const clientData = doc.data();
      clients.push({
        id: doc.id,
        ...clientData,
        dateOfBirth: clientData.dateOfBirth?.toDate?.() || clientData.dateOfBirth,
        createdAt: clientData.createdAt?.toDate?.() || clientData.createdAt,
        updatedAt: clientData.updatedAt?.toDate?.() || clientData.updatedAt,
        lastVisit: clientData.lastVisit?.toDate?.() || clientData.lastVisit,
      });
    });
    
    return clients;
  } catch (error) {
    console.error('Error fetching clients by institution:', error);
    throw error;
  }
};

// Get client by ID
export const getClientById = async (clientId) => {
  try {
    const clientRef = doc(db, CLIENTS_COLLECTION, clientId);
    const clientSnap = await getDoc(clientRef);
    
    if (clientSnap.exists()) {
      const clientData = clientSnap.data();
      
      // SECURITY FIX: Decrypt sensitive patient data if encrypted
      const shouldDecrypt = secureConfigService.get('security.encryptPatientData', true);
      const decryptedData = shouldDecrypt ? decryptPatientData(clientData) : clientData;
      
      return {
        id: clientSnap.id,
        ...decryptedData,
        dateOfBirth: decryptedData.dateOfBirth?.toDate?.() || decryptedData.dateOfBirth,
        createdAt: decryptedData.createdAt?.toDate?.() || decryptedData.createdAt,
        updatedAt: decryptedData.updatedAt?.toDate?.() || decryptedData.updatedAt,
        lastVisit: decryptedData.lastVisit?.toDate?.() || decryptedData.lastVisit,
      };
    } else {
      throw new Error('Client not found');
    }
  } catch (error) {
    console.error('Error fetching client:', error);
    throw error;
  }
};

export const getPatientById = getClientById;

export const getPatientByPatientId = async (clientId) => {
  try {
    const clientsRef = collection(db, CLIENTS_COLLECTION);
    const q = query(clientsRef, where('clientId', '==', clientId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('Client not found');
    }

    return normalizeClientDoc(querySnapshot.docs[0]);
  } catch (error) {
    if (error.message === 'Client not found') {
      throw error;
    }
    console.error('Error fetching Client by clientId:', error);
    throw error;
  }
};

// Get clients assigned to a caregiver
export const getClientsByCaregiver = async (caregiverId, institutionId = null) => {
  try {
    console.log('🔍 getClientsByCaregiver called with caregiverId:', caregiverId, 'institutionId:', institutionId);
    console.log('🔍 Function started - about to query Firestore');
    
    // First try to get clients directly assigned to caregiver
    const clientsRef = collection(db, CLIENTS_COLLECTION);
    let directQuery = query(clientsRef, where('assignedCaregiver', '==', caregiverId));
    
    // Add institution filtering if provided
    if (institutionId) {
      directQuery = query(clientsRef, 
        where('assignedCaregiver', '==', caregiverId),
        where('institutionId', '==', institutionId)
      );
    }
    
    const directSnapshot = await getDocs(directQuery);
    
    console.log(`  → Found ${directSnapshot.size} clients in 'clients' collection with assignedCaregiver`);
    
    const directClients = [];
    directSnapshot.forEach((doc) => {
      const clientData = doc.data();
      directClients.push({
        id: doc.id,
        ...clientData,
        dateOfBirth: clientData.dateOfBirth?.toDate?.() || clientData.dateOfBirth,
        createdAt: clientData.createdAt?.toDate?.() || clientData.createdAt,
        updatedAt: clientData.updatedAt?.toDate?.() || clientData.updatedAt,
        lastVisit: clientData.lastVisit?.toDate?.() || clientData.lastVisit,
      });
    });

    // Also get clients from tasks assigned to this caregiver
    const tasksRef = collection(db, 'careTasks');
    const tasksQuery = query(tasksRef, where('caregiverId', '==', caregiverId));
    const tasksSnapshot = await getDocs(tasksQuery);
    
    console.log(`  → Found ${tasksSnapshot.size} tasks in 'careTasks' collection`);
    
    const clientIds = new Set();
    tasksSnapshot.forEach((doc) => {
      const taskData = doc.data();
      if (taskData.clientId) {
        clientIds.add(taskData.clientId);
      }
    });

    // Also get clients from explicit clientAssignments collection
    const assignmentsRef = collection(db, 'clientAssignments');
    const assignmentsQuery = query(assignmentsRef, where('caregiverId', '==', caregiverId));
    const assignmentsSnapshot = await getDocs(assignmentsQuery);

    console.log(`  → Found ${assignmentsSnapshot.size} assignments in 'clientAssignments' collection`);

    // Build a map to enrich placeholders if client doc is missing
    const assignmentByClientId = new Map();
    assignmentsSnapshot.forEach((doc) => {
      const assignmentData = doc.data();
      console.log(`    - Assignment: clientId=${assignmentData.clientId}, caregiverId=${assignmentData.caregiverId}, status=${assignmentData.status}`);
      if (assignmentData.clientId && (assignmentData.status ?? 'active') === 'active') {
        clientIds.add(assignmentData.clientId);
        if (!assignmentByClientId.has(assignmentData.clientId)) {
          assignmentByClientId.set(assignmentData.clientId, assignmentData);
        }
      }
    });
    
    console.log(`  → Final clientIds set:`, Array.from(clientIds));
    
    console.log(`  → Total unique client IDs to fetch: ${clientIds.size}`);

    // Get client details for task-assigned and explicitly assigned clients
    const taskClients = [];
    for (const clientId of clientIds) {
      try {
        const clientDoc = await getDoc(doc(db, CLIENTS_COLLECTION, clientId));
        if (clientDoc.exists()) {
          const clientData = clientDoc.data();
          taskClients.push({
            id: clientDoc.id,
            ...clientData,
            dateOfBirth: clientData.dateOfBirth?.toDate?.() || clientData.dateOfBirth,
            createdAt: clientData.createdAt?.toDate?.() || clientData.createdAt,
            updatedAt: clientData.updatedAt?.toDate?.() || clientData.updatedAt,
            lastVisit: clientData.lastVisit?.toDate?.() || clientData.lastVisit,
          });
        } else {
          // Client doc is missing; create a placeholder so UI can still show the assignment
          const assignment = assignmentByClientId.get(clientId) || {};
          // Use assignment data as placeholder since we can't create client documents
          // due to security rules (only admins can create client documents)
          console.log(`⚠️ Missing client document for assigned clientId=${clientId}. Using assignment data as placeholder.`);
          
          taskClients.push({
            id: clientId,
            name: assignment.clientName || 'Assigned Client',
            email: assignment.clientEmail || '',
            status: assignment.status || 'active',
            address: assignment.clientAddress || assignment.address || 'Address not provided',
            phone: assignment.clientPhone || assignment.phone || 'Phone not provided',
            condition: assignment.condition || assignment.clientCondition || 'Medical condition not specified',
            age: assignment.age || 'Age not specified',
            gender: assignment.gender || 'Gender not specified',
            assignedCaregiver: caregiverId,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastVisit: null
          });
        }
      } catch (error) {
        console.log('Could not fetch client from task:', error);
      }
    }

          // Combine and deduplicate clients
          const allClients = [...directClients, ...taskClients];
          const uniqueClients = allClients.filter((client, index, self) => 
            index === self.findIndex(p => p.id === client.id)
          );
          
          console.log(`  → Returning ${uniqueClients.length} unique clients for caregiver ${caregiverId}`);
          
          // Sort by createdAt in memory (newest first)
          return uniqueClients.sort((a, b) => {
            const aTime = a.createdAt?.getTime?.() || 0;
            const bTime = b.createdAt?.getTime?.() || 0;
            return bTime - aTime;
          });
  } catch (error) {
    console.error('❌ Error fetching clients by caregiver:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      caregiverId: caregiverId
    });
    throw error;
  }
};

// Get clients assigned to a doctor
export const getClientsByDoctor = async (doctorId, institutionId = null) => {
  try {
    const clientsRef = collection(db, CLIENTS_COLLECTION);
    // Remove orderBy to avoid index requirement - we'll sort in memory
    let q = query(clientsRef, where('assignedDoctor', '==', doctorId));
    
    // Add institution filtering if provided
    if (institutionId) {
      q = query(clientsRef, 
        where('assignedDoctor', '==', doctorId),
        where('institutionId', '==', institutionId)
      );
    }
    
    const querySnapshot = await getDocs(q);
    
    const clients = [];
    querySnapshot.forEach((doc) => {
      const clientData = doc.data();
      clients.push({
        id: doc.id,
        ...clientData,
        dateOfBirth: clientData.dateOfBirth?.toDate?.() || clientData.dateOfBirth,
        createdAt: clientData.createdAt?.toDate?.() || clientData.createdAt,
        updatedAt: clientData.updatedAt?.toDate?.() || clientData.updatedAt,
        lastVisit: clientData.lastVisit?.toDate?.() || clientData.lastVisit,
      });
    });
    
    // Sort by createdAt in memory (newest first)
    return clients.sort((a, b) => {
      const aTime = a.createdAt?.getTime?.() || 0;
      const bTime = b.createdAt?.getTime?.() || 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error fetching clients by doctor:', error);
    throw error;
  }
};

// Update client (low-level helper)
export const updateClient = async (clientId, updateData) => {
  try {
    const clientRef = doc(db, CLIENTS_COLLECTION, clientId);

    // SECURITY FIX: Encrypt sensitive patient data before updating
    const shouldEncrypt = secureConfigService.get('security.encryptPatientData', true);
    const dataToUpdate = shouldEncrypt ? encryptPatientData(updateData) : updateData;

    const updatedData = {
      ...dataToUpdate,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(clientRef, updatedData);
    return true;
  } catch (error) {
    console.error('Error updating client:', error);
    throw error;
  }
};

// High-level update with logging and existence checks
export const updatePatient = async (clientId, updateData, registeredBy = null) => {
  try {
    const clientRef = doc(db, CLIENTS_COLLECTION, clientId);
    const clientSnap = await getDoc(clientRef);

    if (!clientSnap.exists()) {
      throw new Error('Client not found');
    }

    // Perform the actual update (with encryption)
    await updateClient(clientId, updateData);

    // Determine the simple Client ID used in logs
    const existingData = clientSnap.data() || {};
    const patientSimpleId = existingData.clientId || clientId;

    // Log profile update if we have information about who performed it
    if (registeredBy) {
      try {
        await logPatientProfileUpdate(patientSimpleId, registeredBy, updateData);
      } catch (logError) {
        console.error('Error logging Client profile update:', logError);
        // Do not fail the update if logging fails
      }
    }

    return true;
  } catch (error) {
    console.error('Error updating patient:', error);
    throw error;
  }
};

// Assign client to caregiver
export const assignClientToCaregiver = async (clientId, caregiverId) => {
  try {
    const clientRef = doc(db, CLIENTS_COLLECTION, clientId);
    await updateDoc(clientRef, {
      assignedCaregiver: caregiverId,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error assigning client to caregiver:', error);
    throw error;
  }
};

// Assign client to doctor
export const assignClientToDoctor = async (clientId, doctorId) => {
  try {
    const clientRef = doc(db, CLIENTS_COLLECTION, clientId);
    await updateDoc(clientRef, {
      assignedDoctor: doctorId,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error assigning client to doctor:', error);
    throw error;
  }
};

// Create new Client (hospital operations)
export const createClient = async (clientData = {}, registeredBy = null) => {
  try {
    // Validate required fields before proceeding
    if (!clientData.name || !clientData.name.trim()) {
      throw new Error('Client name is required');
    }
    
    if (!clientData.phone || !clientData.phone.trim()) {
      throw new Error('Client phone number is required');
    }

    // Validate institutionId is present
    if (!clientData.institutionId) {
      throw new Error('Institution ID is required for client registration');
    }

    // Generate client ID
    let clientId;
    try {
      clientId = await generateClientId(clientData.institutionId || null);
    } catch (idError) {
      console.error('Error generating client ID:', idError);
      throw new Error('Failed to generate client ID. Please try again.');
    }

    const clientsRef = collection(db, CLIENTS_COLLECTION);
    
    // SECURITY FIX: Encrypt sensitive patient data before storing
    const shouldEncrypt = secureConfigService.get('security.encryptPatientData', true);
    const dataToStore = shouldEncrypt ? encryptPatientData(clientData) : clientData;
    
    const newPatient = {
      ...dataToStore,
      clientId,
      status: clientData.status || 'active',
      registrationDate: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastVisit: serverTimestamp(),
      registeredBy: registeredBy?.id || registeredBy?.uid || null,
    };

    // Create client document in Firestore
    let docRef;
    try {
      docRef = await addDoc(clientsRef, newPatient);
      console.log(`✅ Client created with ID: ${clientId} (doc: ${docRef.id})`);
    } catch (firestoreError) {
      console.error('Firestore error creating client:', firestoreError);
      
      // Provide more specific error messages
      if (firestoreError.code === 'permission-denied') {
        throw new Error('Permission denied. Please ensure you have admin access to create clients.');
      } else if (firestoreError.code === 'unavailable') {
        throw new Error('Service temporarily unavailable. Please check your internet connection and try again.');
      } else if (firestoreError.code === 'deadline-exceeded') {
        throw new Error('Request timeout. Please try again.');
      } else {
        throw new Error(`Failed to create client: ${firestoreError.message || 'Unknown error'}`);
      }
    }

    // Log Client registration (non-blocking - don't fail if logging fails)
    if (registeredBy) {
      try {
        const registrationDetails = {
          ...clientData,
          registrationMethod: clientData.registrationMethod || 'hospital_registration',
        };
        await logPatientRegistration(clientId, registeredBy, registrationDetails);
      } catch (logError) {
        console.warn('Error logging Client registration (non-critical):', logError);
        // Do not fail client creation if logging fails
      }
    }

    return { id: docRef.id, clientId };
  } catch (error) {
    console.error('Error creating Client:', error);
    
    // Re-throw with enhanced error message if it's our custom error
    if (error.message && error.message.includes('required') || error.message.includes('Permission denied') || error.message.includes('Service temporarily')) {
      throw error;
    }
    
    // For unknown errors, provide a user-friendly message
    const enhancedError = new Error(error.message || 'Failed to create client. Please try again.');
    enhancedError.code = error.code;
    enhancedError.originalError = error;
    throw enhancedError;
  }
};

// Get client's medical history
export const getClientMedicalHistory = async (clientId) => {
  try {
    const medicalHistoryRef = collection(db, 'medicalHistory');
    const q = query(medicalHistoryRef, where('clientId', '==', clientId), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const history = [];
    querySnapshot.forEach((doc) => {
      const historyData = doc.data();
      history.push({
        id: doc.id,
        ...historyData,
        date: historyData.date?.toDate?.() || historyData.date,
        createdAt: historyData.createdAt?.toDate?.() || historyData.createdAt,
      });
    });
    
    return history;
  } catch (error) {
    console.error('Error fetching client medical history:', error);
    throw error;
  }
};

// Add medical record to client
export const addMedicalRecord = async (clientId, recordData) => {
  try {
    const medicalHistoryRef = collection(db, 'medicalHistory');
    const newRecord = {
      ...recordData,
      clientId,
      createdAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(medicalHistoryRef, newRecord);
    
    // Update client's last visit
    await updateClient(clientId, { lastVisit: serverTimestamp() });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding medical record:', error);
    throw error;
  }
};

// Delete patient/client
export const deletePatient = async (clientId) => {
  try {
    const clientRef = doc(db, CLIENTS_COLLECTION, clientId);
    await deleteDoc(clientRef);
    return true;
  } catch (error) {
    console.error('Error deleting patient:', error);
    throw error;
  }
};

// Get client statistics
export const getClientStats = async () => {
  try {
    const clients = await getAllClients();
    
    const stats = {
      total: clients.length,
      active: clients.filter(client => client.status === 'active').length,
      inactive: clients.filter(client => client.status === 'inactive').length,
      withCaregiver: clients.filter(client => client.assignedCaregiver).length,
      withDoctor: clients.filter(client => client.assignedDoctor).length,
      averageAge: clients.reduce((sum, client) => {
        if (client.dateOfBirth) {
          const age = new Date().getFullYear() - new Date(client.dateOfBirth).getFullYear();
          return sum + age;
        }
        return sum;
      }, 0) / clients.length || 0,
    };
    
    return stats;
  } catch (error) {
    console.error('Error getting client stats:', error);
    throw error;
  }
};

// Search patients/clients by ID, name, or email
// SECURITY FIX: Added input validation and sanitization
export const searchPatients = async (searchTerm) => {
  try {
    if (!searchTerm || searchTerm.trim() === '') {
      return [];
    }
    
    // SECURITY: Sanitize and validate search term
    const sanitizedTerm = searchTerm.trim().replace(/[<>]/g, '').substring(0, 100);
    if (sanitizedTerm.length < 1) {
      return [];
    }
    
    const clientsRef = collection(db, CLIENTS_COLLECTION);
    const querySnapshot = await getDocs(clientsRef);
    
    const searchLower = sanitizedTerm.toLowerCase();
    const results = [];
    
    querySnapshot.forEach((doc) => {
      const clientData = doc.data();
      const client = normalizeClientDoc(doc);
      
      // Search in clientId, name, fullName, email, phone
      const matches = 
        (client.clientId && client.clientId.toLowerCase().includes(searchLower)) ||
        (client.name && client.name.toLowerCase().includes(searchLower)) ||
        (client.fullName && client.fullName.toLowerCase().includes(searchLower)) ||
        (client.email && client.email.toLowerCase().includes(searchLower)) ||
        (client.phone && client.phone.includes(searchTerm));
      
      if (matches) {
        results.push(client);
      }
    });
    
    // Sort by relevance (exact matches first, then by name)
    results.sort((a, b) => {
      const aExact = (a.clientId && a.clientId.toLowerCase() === searchLower) ? 1 : 0;
      const bExact = (b.clientId && b.clientId.toLowerCase() === searchLower) ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      
      const aName = (a.name || a.fullName || '').toLowerCase();
      const bName = (b.name || b.fullName || '').toLowerCase();
      return aName.localeCompare(bName);
    });
    
    return results;
  } catch (error) {
    console.error('Error searching patients:', error);
    throw error;
  }
};

// Real-time listener for clients
export const subscribeToClients = (callback) => {
  const clientsRef = collection(db, CLIENTS_COLLECTION);
  const q = query(clientsRef, orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (querySnapshot) => {
    const clients = [];
    querySnapshot.forEach((doc) => {
      const clientData = doc.data();
      clients.push({
        id: doc.id,
        ...clientData,
        dateOfBirth: clientData.dateOfBirth?.toDate?.() || clientData.dateOfBirth,
        createdAt: clientData.createdAt?.toDate?.() || clientData.createdAt,
        updatedAt: clientData.updatedAt?.toDate?.() || clientData.updatedAt,
        lastVisit: clientData.lastVisit?.toDate?.() || clientData.lastVisit,
      });
    });
    callback(clients);
  });
};
