// Utility to force load data from Firestore
// This bypasses any potential permission or loading issues

import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

export const forceLoadCaregivers = async () => {
  console.log('🔍 Force loading caregivers...');
  
  try {
    // Try multiple approaches to get caregivers
    const results = [];
    
    // Approach 1: Direct from users collection
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        const userType = userData.userType || userData.type;
        
        // Include caregivers, doctors, and anyone with medical qualification
        if (
          userType === 'caregiver' || 
          userType === 'doctor' || 
          userType === 'nurse' ||
          userData.medicalQualification ||
          (userData.email && userData.email.includes('admin'))
        ) {
          results.push({
            id: doc.id,
            name: userData.displayName || userData.name || userData.email?.split('@')[0] || 'Unknown',
            email: userData.email || '',
            phone: userData.phone || '',
            role: userData.medicalQualification || userData.type || (userType === 'doctor' ? 'Doctor' : 'Caregiver'),
            experience: userData.yearsOfExperience || userData.experience || '',
            status: userData.status || 'active',
            userType: userData.userType,
            type: userData.type,
            source: 'users-direct'
          });
        }
      });
      
      console.log(`✅ Found ${results.length} caregivers/doctors from users collection`);
    } catch (error) {
      console.error('❌ Error loading from users collection:', error);
    }
    
    // Approach 2: Try caregivers collection
    try {
      const caregiversRef = collection(db, 'caregivers');
      const caregiversSnapshot = await getDocs(caregiversRef);
      
      caregiversSnapshot.forEach((doc) => {
        const caregiverData = doc.data();
        results.push({
          id: doc.id,
          ...caregiverData,
          source: 'caregivers-collection'
        });
      });
      
      console.log(`✅ Found ${caregiversSnapshot.size} caregivers from caregivers collection`);
    } catch (error) {
      console.error('❌ Error loading from caregivers collection:', error);
    }
    
    // Remove duplicates
    const uniqueCaregivers = [];
    const seenIds = new Set();
    const seenEmails = new Set();
    
    results.forEach(caregiver => {
      const id = caregiver.id;
      const email = (caregiver.email || '').toLowerCase();
      
      if (!seenIds.has(id) && !seenEmails.has(email)) {
        seenIds.add(id);
        seenEmails.add(email);
        uniqueCaregivers.push(caregiver);
      }
    });
    
    console.log(`📊 Total unique caregivers/doctors: ${uniqueCaregivers.length}`);
    return uniqueCaregivers;
    
  } catch (error) {
    console.error('❌ Force load caregivers failed:', error);
    return [];
  }
};

export const forceLoadPatients = async () => {
  console.log('🔍 Force loading clients...');
  
  try {
    const results = [];
    
    // Approach 1: Direct from users collection
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        const userType = userData.userType || userData.type;
        
        // Include elderly, clients, clients
        if (
          userType === 'elderly' || 
          userType === 'client' || 
          userType === 'Client'
        ) {
          results.push({
            id: doc.id,
            name: userData.displayName || userData.name || userData.email?.split('@')[0] || 'Client',
            email: userData.email || '',
            phone: userData.phone || '',
            age: userData.age || '',
            gender: userData.gender || '',
            status: userData.status || 'active',
            address: userData.address || '',
            userType: userData.userType,
            type: userData.type,
            source: 'users-direct'
          });
        }
      });
      
      console.log(`✅ Found ${results.length} clients from users collection`);
    } catch (error) {
      console.error('❌ Error loading clients from users collection:', error);
    }
    
    // Approach 2: Try clients collection
    try {
      const patientsRef = collection(db, 'clients');
      const patientsSnapshot = await getDocs(patientsRef);
      
      patientsSnapshot.forEach((doc) => {
        const clientData = doc.data();
        results.push({
          id: doc.id,
          ...clientData,
          source: 'clients-collection'
        });
      });
      
      console.log(`✅ Found ${patientsSnapshot.size} clients from clients collection`);
    } catch (error) {
      console.error('❌ Error loading from clients collection:', error);
    }
    
    // Remove duplicates
    const uniquePatients = [];
    const seenIds = new Set();
    const seenEmails = new Set();
    
    results.forEach(Client => {
      const id = client.id;
      const email = (client.email || '').toLowerCase();
      
      if (!seenIds.has(id) && !seenEmails.has(email)) {
        seenIds.add(id);
        seenEmails.add(email);
        uniquePatients.push(Client);
      }
    });
    
    console.log(`📊 Total unique clients: ${uniquePatients.length}`);
    return uniquePatients;
    
  } catch (error) {
    console.error('❌ Force load clients failed:', error);
    return [];
  }
};
