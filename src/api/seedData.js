import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const USERS_COLLECTION = 'users';

// Sample user data
const sampleUsers = [
  {
    name: 'Adunni Okafor',
    email: 'adunni@example.com',
    phone: '+234 801 987 6543',
    type: 'elderly',
    status: 'active',
    emergencyContact: 'Dr. Kemi Okafor',
    medicalConditions: ['Hypertension', 'Diabetes Type 2'],
    address: 'Lagos, Nigeria',
    dateOfBirth: '1955-03-15',
    gender: 'Female'
  },
  {
    name: 'Tunde Adebayo',
    email: 'tunde@example.com',
    phone: '+234 802 123 4567',
    type: 'caregiver',
    status: 'active',
    certifications: ['CPR Certified', 'First Aid'],
    experience: '5 years',
    address: 'Abuja, Nigeria',
    dateOfBirth: '1985-07-22',
    gender: 'Male'
  },
  {
    name: 'Grace Johnson',
    email: 'grace@example.com',
    phone: '+234 803 456 7890',
    type: 'elderly',
    status: 'inactive',
    emergencyContact: 'Dr. Michael Johnson',
    medicalConditions: ['Arthritis'],
    address: 'Port Harcourt, Nigeria',
    dateOfBirth: '1950-11-08',
    gender: 'Female'
  },
  {
    name: 'Dr. Kemi Okafor',
    email: 'kemi@example.com',
    phone: '+234 804 789 0123',
    type: 'doctor',
    status: 'active',
    specialization: 'Geriatrics',
    licenseNumber: 'MD12345',
    hospital: 'Lagos University Teaching Hospital',
    address: 'Lagos, Nigeria',
    dateOfBirth: '1975-05-12',
    gender: 'Female'
  },
  {
    name: 'Samuel Adekunle',
    email: 'samuel@example.com',
    phone: '+234 805 234 5678',
    type: 'caregiver',
    status: 'active',
    certifications: ['Nursing Assistant', 'Elderly Care Specialist'],
    experience: '8 years',
    address: 'Ibadan, Nigeria',
    dateOfBirth: '1982-12-03',
    gender: 'Male'
  },
  {
    name: 'Maryam Ibrahim',
    email: 'maryam@example.com',
    phone: '+234 806 345 6789',
    type: 'elderly',
    status: 'active',
    emergencyContact: 'Dr. Ahmed Ibrahim',
    medicalConditions: ['High Blood Pressure'],
    address: 'Kano, Nigeria',
    dateOfBirth: '1958-09-18',
    gender: 'Female'
  },
  {
    name: 'Dr. John Okonkwo',
    email: 'john@example.com',
    phone: '+234 807 456 7890',
    type: 'doctor',
    status: 'active',
    specialization: 'Internal Medicine',
    licenseNumber: 'MD67890',
    hospital: 'National Hospital Abuja',
    address: 'Abuja, Nigeria',
    dateOfBirth: '1970-02-25',
    gender: 'Male'
  },
  {
    name: 'Fatima Usman',
    email: 'fatima@example.com',
    phone: '+234 808 567 8901',
    type: 'caregiver',
    status: 'suspended',
    certifications: ['Home Health Aide'],
    experience: '3 years',
    address: 'Kaduna, Nigeria',
    dateOfBirth: '1990-06-14',
    gender: 'Female'
  }
];

// Function to seed the database with sample data
export const seedUsers = async () => {
  try {
    console.log('Starting to seed users...');
    
    const usersRef = collection(db, USERS_COLLECTION);
    const promises = sampleUsers.map(async (user) => {
      const userData = {
        ...user,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        joinDate: serverTimestamp(),
        lastActive: serverTimestamp(),
      };
      
      const docRef = await addDoc(usersRef, userData);
      console.log('User added with ID: ', docRef.id);
      return docRef.id;
    });
    
    await Promise.all(promises);
    console.log('Successfully seeded all users!');
    return true;
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
};

// Function to clear all users (for testing purposes)
export const clearAllUsers = async () => {
  try {
    console.log('This function would clear all users. Implement with caution!');
    // Note: This is a placeholder. In a real app, you'd want to implement
    // batch deletion or use Firebase Admin SDK for bulk operations
    return false;
  } catch (error) {
    console.error('Error clearing users:', error);
    throw error;
  }
};
