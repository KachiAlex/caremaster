// Debug script to check caregiver assignments
const admin = require('firebase-admin');

// Initialize with default credentials or emulator
if (process.env.FIRESTORE_EMULATOR_HOST) {
  admin.initializeApp({
    projectId: 'elderx-f5c2b'
  });
} else {
  // Use Application Default Credentials
  admin.initializeApp();
}

const db = admin.firestore();

async function debugCaregiverAssignments() {
  try {
    console.log('=== Debugging Caregiver Assignments ===\n');
    
    // 1. Find dresther@elderx.com user
    const usersSnapshot = await db.collection('users')
      .where('email', '==', 'dresther@elderx.com')
      .get();
    
    if (usersSnapshot.empty) {
      console.log('❌ User dresther@elderx.com not found in users collection');
      return;
    }
    
    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;
    
    console.log('✅ Found user:');
    console.log('  - User ID:', userId);
    console.log('  - Email:', userData.email);
    console.log('  - Name:', userData.name || userData.displayName);
    console.log('  - Type:', userData.userType || userData.type);
    console.log('\n');
    
    // 2. Check patientAssignments collection
    console.log('--- Checking patientAssignments collection ---');
    const assignmentsSnapshot = await db.collection('patientAssignments')
      .where('caregiverId', '==', userId)
      .get();
    
    console.log(`Found ${assignmentsSnapshot.size} assignments in patientAssignments`);
    assignmentsSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('  Assignment:', {
        id: doc.id,
        patientId: data.patientId,
        patientName: data.patientName,
        status: data.status,
        assignedAt: data.assignedAt?.toDate?.()
      });
    });
    console.log('\n');
    
    // 3. Check careTasks collection
    console.log('--- Checking careTasks collection ---');
    const tasksSnapshot = await db.collection('careTasks')
      .where('caregiverId', '==', userId)
      .get();
    
    console.log(`Found ${tasksSnapshot.size} tasks in careTasks`);
    tasksSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('  Task:', {
        id: doc.id,
        patientId: data.patientId,
        title: data.title,
        status: data.status
      });
    });
    console.log('\n');
    
    // 4. Check taskAssignments collection
    console.log('--- Checking taskAssignments collection ---');
    const taskAssignmentsSnapshot = await db.collection('taskAssignments')
      .where('caregiverId', '==', userId)
      .get();
    
    console.log(`Found ${taskAssignmentsSnapshot.size} in taskAssignments (caregiverId)`);
    taskAssignmentsSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('  TaskAssignment:', {
        id: doc.id,
        caregiverId: data.caregiverId,
        patientId: data.patientId,
        title: data.title
      });
    });
    
    // Also check assignedTo field
    const taskAssignedToSnapshot = await db.collection('taskAssignments')
      .where('assignedTo', '==', userId)
      .get();
    
    console.log(`Found ${taskAssignedToSnapshot.size} in taskAssignments (assignedTo)`);
    taskAssignedToSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('  TaskAssignment (assignedTo):', {
        id: doc.id,
        assignedTo: data.assignedTo,
        patientId: data.patientId,
        title: data.title
      });
    });
    console.log('\n');
    
    // 5. Check patients collection for direct assignment
    console.log('--- Checking patients collection ---');
    const patientsSnapshot = await db.collection('patients')
      .where('assignedCaregiver', '==', userId)
      .get();
    
    console.log(`Found ${patientsSnapshot.size} patients with assignedCaregiver`);
    patientsSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('  Patient:', {
        id: doc.id,
        name: data.name,
        assignedCaregiver: data.assignedCaregiver
      });
    });
    console.log('\n');
    
    // 6. List ALL patientAssignments to see what's in there
    console.log('--- ALL patientAssignments (for debugging) ---');
    const allAssignments = await db.collection('patientAssignments').get();
    console.log(`Total assignments in DB: ${allAssignments.size}`);
    allAssignments.forEach((doc) => {
      const data = doc.data();
      console.log('  Assignment:', {
        id: doc.id,
        caregiverId: data.caregiverId,
        patientId: data.patientId,
        patientName: data.patientName,
        caregiverName: data.caregiverName
      });
    });
    
    console.log('\n=== Debug Complete ===');
    process.exit(0);
    
  } catch (error) {
    console.error('Error debugging assignments:', error);
    process.exit(1);
  }
}

debugCaregiverAssignments();

