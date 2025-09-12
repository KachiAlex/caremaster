// Script to seed telemedicine data in Firebase
import { 
  collection, 
  addDoc, 
  doc, 
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';

const seedTelemedicineData = async () => {
  try {
    console.log('🌱 Seeding telemedicine data...');

    // Sample doctors
    const doctors = [
      {
        id: 'doctor-1',
        name: 'Dr. Kemi Adebayo',
        specialty: 'Cardiologist',
        email: 'kemi.adebayo@elderx.ng',
        phone: '+234 801 234 5678',
        isActive: true,
        rating: 4.9,
        experience: '15 years',
        qualifications: ['MBBS', 'MD Cardiology'],
        languages: ['English', 'Yoruba'],
        consultationFee: 15000,
        availableSlots: ['09:00', '10:00', '11:00', '14:00', '15:00'],
        createdAt: serverTimestamp()
      },
      {
        id: 'doctor-2',
        name: 'Dr. Tunde Williams',
        specialty: 'General Practitioner',
        email: 'tunde.williams@elderx.ng',
        phone: '+234 802 345 6789',
        isActive: true,
        rating: 4.8,
        experience: '12 years',
        qualifications: ['MBBS', 'MD General Medicine'],
        languages: ['English', 'Hausa'],
        consultationFee: 10000,
        availableSlots: ['08:00', '09:00', '10:00', '13:00', '14:00'],
        createdAt: serverTimestamp()
      },
      {
        id: 'doctor-3',
        name: 'Dr. Sarah Okafor',
        specialty: 'Dermatologist',
        email: 'sarah.okafor@elderx.ng',
        phone: '+234 803 456 7890',
        isActive: true,
        rating: 4.7,
        experience: '10 years',
        qualifications: ['MBBS', 'MD Dermatology'],
        languages: ['English', 'Igbo'],
        consultationFee: 12000,
        availableSlots: ['10:00', '11:00', '12:00', '15:00', '16:00'],
        createdAt: serverTimestamp()
      }
    ];

    // Sample patients
    const patients = [
      {
        id: 'patient-1',
        name: 'Adunni Okafor',
        email: 'adunni.okafor@email.com',
        phone: '+234 804 567 8901',
        age: 72,
        gender: 'Female',
        medicalConditions: ['Hypertension', 'Diabetes Type 2'],
        allergies: ['Penicillin'],
        emergencyContact: {
          name: 'Kemi Okafor',
          phone: '+234 801 987 6543',
          relationship: 'Daughter'
        },
        createdAt: serverTimestamp()
      },
      {
        id: 'patient-2',
        name: 'Grace Johnson',
        email: 'grace.johnson@email.com',
        phone: '+234 805 678 9012',
        age: 68,
        gender: 'Female',
        medicalConditions: ['Arthritis'],
        allergies: ['None'],
        emergencyContact: {
          name: 'John Johnson',
          phone: '+234 802 876 5432',
          relationship: 'Son'
        },
        createdAt: serverTimestamp()
      },
      {
        id: 'patient-3',
        name: 'Tunde Adebayo',
        email: 'tunde.adebayo@email.com',
        phone: '+234 806 789 0123',
        age: 75,
        gender: 'Male',
        medicalConditions: ['High Blood Pressure'],
        allergies: ['Shellfish'],
        emergencyContact: {
          name: 'Funmi Adebayo',
          phone: '+234 803 765 4321',
          relationship: 'Wife'
        },
        createdAt: serverTimestamp()
      }
    ];

    // Sample appointments
    const appointments = [
      {
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2024-01-20T15:00:00Z'),
        duration: 30,
        type: 'video',
        status: 'scheduled',
        notes: 'Follow-up consultation for heart condition',
        symptoms: ['Chest pain', 'Shortness of breath'],
        vitalSigns: {
          bloodPressure: '140/90',
          heartRate: 85,
          temperature: 98.6
        },
        createdAt: serverTimestamp()
      },
      {
        patientId: 'patient-2',
        doctorId: 'doctor-2',
        appointmentDate: new Date('2024-01-20T16:30:00Z'),
        duration: 45,
        type: 'video',
        status: 'completed',
        notes: 'Regular checkup and medication review',
        symptoms: ['Fatigue', 'Joint pain'],
        vitalSigns: {
          bloodPressure: '130/80',
          heartRate: 72,
          temperature: 98.4
        },
        prescription: {
          medications: [
            { name: 'Metformin', dosage: '500mg', frequency: 'twice daily' },
            { name: 'Ibuprofen', dosage: '200mg', frequency: 'as needed' }
          ]
        },
        createdAt: serverTimestamp()
      },
      {
        patientId: 'patient-3',
        doctorId: 'doctor-3',
        appointmentDate: new Date('2024-01-21T10:00:00Z'),
        duration: 20,
        type: 'audio',
        status: 'scheduled',
        notes: 'Skin condition consultation',
        symptoms: ['Rash on arms', 'Itching'],
        createdAt: serverTimestamp()
      }
    ];

    // Add doctors to Firestore
    console.log('Adding doctors...');
    for (const doctor of doctors) {
      await setDoc(doc(db, 'doctors', doctor.id), doctor);
      console.log(`✅ Added doctor: ${doctor.name}`);
    }

    // Add patients to Firestore
    console.log('Adding patients...');
    for (const patient of patients) {
      await setDoc(doc(db, 'patients', patient.id), patient);
      console.log(`✅ Added patient: ${patient.name}`);
    }

    // Add appointments to Firestore
    console.log('Adding appointments...');
    for (const appointment of appointments) {
      const docRef = await addDoc(collection(db, 'telemedicine_appointments'), appointment);
      console.log(`✅ Added appointment: ${docRef.id}`);
    }

    console.log('🎉 Telemedicine data seeded successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error seeding telemedicine data:', error);
    throw error;
  }
};

// Function to clear all telemedicine data (for testing)
const clearTelemedicineData = async () => {
  try {
    console.log('🧹 Clearing telemedicine data...');
    
    // Note: In a real app, you'd use batch deletes or admin SDK
    // For now, this is just a placeholder
    console.log('⚠️ Clear function not implemented - use Firebase console to clear data');
    
    return true;
  } catch (error) {
    console.error('❌ Error clearing telemedicine data:', error);
    throw error;
  }
};

export { seedTelemedicineData, clearTelemedicineData };
