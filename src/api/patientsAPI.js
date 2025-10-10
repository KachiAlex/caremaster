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

const PATIENTS_COLLECTION = 'clients';

// Get all clients (admin only)
export const getAllClients = async (institutionId = null) => {
  try {
    const clientsRef = collection(db, PATIENTS_COLLECTION);
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
    const clientsRef = collection(db, PATIENTS_COLLECTION);
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
    const clientRef = doc(db, PATIENTS_COLLECTION, clientId);
    const clientSnap = await getDoc(clientRef);
    
    if (clientSnap.exists()) {
      const clientData = clientSnap.data();
      return {
        id: clientSnap.id,
        ...clientData,
        dateOfBirth: clientData.dateOfBirth?.toDate?.() || clientData.dateOfBirth,
        createdAt: clientData.createdAt?.toDate?.() || clientData.createdAt,
        updatedAt: clientData.updatedAt?.toDate?.() || clientData.updatedAt,
        lastVisit: clientData.lastVisit?.toDate?.() || clientData.lastVisit,
      };
    } else {
      throw new Error('Client not found');
    }
  } catch (error) {
    console.error('Error fetching client:', error);
    throw error;
  }
};

// Get clients assigned to a caregiver
export const getClientsByCaregiver = async (caregiverId, institutionId = null) => {
  try {
    console.log('🔍 getClientsByCaregiver called with caregiverId:', caregiverId, 'institutionId:', institutionId);
    console.log('🔍 Function started - about to query Firestore');
    
    // First try to get clients directly assigned to caregiver
    const clientsRef = collection(db, PATIENTS_COLLECTION);
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
        const clientDoc = await getDoc(doc(db, PATIENTS_COLLECTION, clientId));
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
    const clientsRef = collection(db, PATIENTS_COLLECTION);
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

// Create new client
export const createClient = async (clientData) => {
  try {
    const clientsRef = collection(db, PATIENTS_COLLECTION);
    const newClient = {
      ...clientData,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastVisit: serverTimestamp(),
    };
    
    const docRef = await addDoc(clientsRef, newClient);
    return docRef.id;
  } catch (error) {
    console.error('Error creating client:', error);
    throw error;
  }
};

// Update client
export const updateClient = async (clientId, updateData) => {
  try {
    const clientRef = doc(db, PATIENTS_COLLECTION, clientId);
    const updatedData = {
      ...updateData,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(clientRef, updatedData);
    return true;
  } catch (error) {
    console.error('Error updating client:', error);
    throw error;
  }
};

// Assign client to caregiver
export const assignClientToCaregiver = async (clientId, caregiverId) => {
  try {
    const clientRef = doc(db, PATIENTS_COLLECTION, clientId);
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
    const clientRef = doc(db, PATIENTS_COLLECTION, clientId);
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

// Real-time listener for clients
export const subscribeToClients = (callback) => {
  const clientsRef = collection(db, PATIENTS_COLLECTION);
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
