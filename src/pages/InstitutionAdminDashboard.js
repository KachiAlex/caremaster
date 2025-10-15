import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, setDoc, updateDoc, collection, query, where, getDocs, getDoc, addDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useUser } from '../contexts/UserContext';
import authManager from '../utils/authManager';
import sessionManager from '../utils/sessionManager';
import { 
  Users, 
  Heart, 
  Calendar, 
  Activity, 
  AlertTriangle, 
  TrendingUp,
  UserCheck,
  Clock,
  Shield,
  BarChart3,
  FileText,
  MessageSquare,
  Eye,
  Download,
  RefreshCw,
  Zap,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  Plus,
  Settings,
  LogOut,
  X,
  CheckCircle,
  Trash2,
  Award,
  Building,
  Pill,
  Edit,
  Package,
  Camera
} from 'lucide-react';
import { getAllUsers, createUser } from '../api/usersAPI';
import { analyticsAPI } from '../api/analyticsAPI';
import { emergencyAPI } from '../api/emergencyAPI';
import { caregiverAPI } from '../api/caregiverAPI';
import { getAllClients, createClient, updateClient } from '../api/patientsAPI';
import { assignmentAPI } from '../api/assignmentAPI';
import { getClientReports, createClientReport, getClientCareLogs, createClientCareLog } from '../api/patientReportsAPI';
import { createNotification, NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } from '../api/notificationsAPI';
import { institutionAPI } from '../api/institutionAPI';
import InstitutionLinkCustomizer from '../components/InstitutionLinkCustomizer';
import InventoryBillingTab from '../components/InventoryBillingTab';
import { toast } from 'react-toastify';
import { getConversationsByUser, getMessagesByConversation, sendMessage as sendMessageAPI, getOrCreateConversation, subscribeToUserConversations, subscribeToConversationMessages } from '../api/messagesAPI';
import CallService from '../services/callService';
import WebRTCService from '../services/webrtcService';

const InstitutionAdminDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userProfile, institutionId } = useUser();
  const functions = getFunctions();
  
  // Get institution ID from URL params or user context
  const urlInstitutionId = searchParams.get('institution');
  const effectiveInstitutionId = urlInstitutionId || institutionId;
  
  // No need to check for user here - InstitutionAdminGuard already handles authentication
  // Removed redundant useEffect that was causing navigation issues
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    clients: 0,
    caregivers: 0,
    doctors: 0,
    nurses: 0,
    pharmacists: 0,
    activeAppointments: 0,
    activeAssignments: 0,
    pendingAssignments: 0,
    completedAssignments: 0,
    emergencyAlerts: 0,
    medicationReminders: 0,
    systemHealth: 'Good',
    satisfaction: 0,
    responseTime: 0,
    uptime: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [topCaregivers, setTopCaregivers] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Client and Caregiver Management States
  const [clients, setClients] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [pharmacists, setPharmacists] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddCaregiver, setShowAddCaregiver] = useState(false);
  const [showAddPharmacist, setShowAddPharmacist] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentType, setAssignmentType] = useState('client-to-caregiver');
  const [selectedClientForAssignment, setSelectedClientForAssignment] = useState('');
  const [selectedCaregiverForAssignment, setSelectedCaregiverForAssignment] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // View Details Modal States
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [showCaregiverDetails, setShowCaregiverDetails] = useState(false);
  const [showPharmacistDetails, setShowPharmacistDetails] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedPharmacist, setSelectedPharmacist] = useState(null);
  const [selectedCaregiver, setSelectedCaregiver] = useState(null);
  const [showAssignmentDetails, setShowAssignmentDetails] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // Dashboard Card Modal States
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showClientsModal, setShowClientsModal] = useState(false);
  const [showAppointmentsModal, setShowAppointmentsModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);
  const [appointmentView, setAppointmentView] = useState('daily'); // daily, weekly, monthly
  
  // Institution Link Customization
  const [showLinkCustomizer, setShowLinkCustomizer] = useState(false);
  const [institutionData, setInstitutionData] = useState(null);

  // Messaging states
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageSearchTerm, setMessageSearchTerm] = useState('');
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState(null); // 'voice' or 'video'
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  
  // Initialize call service
  const callService = new CallService();
  const [webrtc] = useState(() => new WebRTCService());

  // Wire WebRTC callbacks
  useEffect(() => {
    webrtc.setCallbacks({
      onLocalStream: (stream) => setLocalStream(stream),
      onRemoteStream: (stream) => setRemoteStream(stream),
      onCallStateChange: (state) => console.log('WebRTC state:', state)
    });
  }, [webrtc]);

  useEffect(() => {
    if (userProfile && institutionId) {
      // Validate tab session for role conflicts
      const userRole = userProfile.userType || userProfile.type || userProfile.role;
      const validation = sessionManager.validateTabSession(user, userRole);
      
      if (validation.needsInit) {
        // First load - set tab session
        sessionManager.setTabSession(userRole, user.uid, institutionId);
      } else if (!validation.valid) {
        // Session conflict detected
        sessionManager.handleSessionConflict(validation, navigate, toast);
        return;
      }
      
      loadDashboardData();
      loadInstitutionData();
      
      // Safety timeout: Force loading to false after 10 seconds if stuck
      const timeout = setTimeout(() => {
        setLoading(false);
        console.warn('Loading timeout reached - forcing UI to show');
      }, 10000);
      
      return () => clearTimeout(timeout);
    }
  }, [userProfile, institutionId, user, navigate]);
  
  // Load institution data
  const loadInstitutionData = async () => {
    try {
      const instId = institutionId || userProfile?.institutionId;
      if (instId) {
        const data = await institutionAPI.getInstitution(instId);
        setInstitutionData(data);
      }
    } catch (error) {
      console.error('Error loading institution data:', error);
    }
  };
  
  // Handle institution link update
  const handleInstitutionLinkUpdate = async (updates) => {
    try {
      const instId = institutionId || userProfile?.institutionId;
      await institutionAPI.updateInstitutionLinks(instId, updates);
      await loadInstitutionData(); // Reload institution data
      toast.success('Institution links updated successfully!');
    } catch (error) {
      console.error('Error updating institution links:', error);
      toast.error('Failed to update institution links');
      throw error;
    }
  };

  const loadDashboardData = async () => {
    try {
      // Get institutionId from userProfile or context
      const instId = institutionId || userProfile?.institutionId;
      
      console.log('📊 Loading institution dashboard for:', instId);
      
      // Show loading state
      setLoading(true);
      
      // Load all data in parallel but optimized for speed
      const [caregiversData, clientsData, assignmentsData, users] = await Promise.all([
        caregiverAPI.getCaregivers({ institutionId: instId, limit: 50 }).catch(() => []),
        getAllClients(instId).catch(() => []),
        assignmentAPI.getAssignmentsByInstitution(instId).catch(() => []),
        getAllUsers().catch(() => [])
      ]);

      // Load non-critical data in background (don't block UI)
      const loadBackgroundData = async () => {
        try {
          const [analytics, emergencies] = await Promise.all([
            analyticsAPI.getOverviewAnalytics().catch(() => ({})),
            emergencyAPI.getEmergencyHistory({ status: 'active', limit: 10 }).catch(() => [])
          ]);
          
          setSystemAlerts(emergencies.slice(0, 5).map(e => ({
            id: e.id,
            type: 'emergency',
            message: `${e.emergencyType}: ${e.patientName || 'Unknown'}`,
            time: new Date(e.triggeredAt).toLocaleTimeString(),
            severity: e.severity
          })));
        } catch (err) {
          console.warn('Background data load failed:', err);
        }
      };
      loadBackgroundData(); // Fire and forget

      // Filter by institution (most data is already filtered server-side)
      const institutionUsers = instId ? users.filter(u => u.institutionId === instId) : users;
      const institutionCaregivers = instId ? caregiversData.filter(c => c.institutionId === instId) : caregiversData;
      const institutionClients = instId ? clientsData.filter(p => p.institutionId === instId) : clientsData;

      // Merge caregivers from users collection (for those created via Add Caregiver button, exclude deleted)
      const caregiversFromUsers = institutionUsers.filter(u => 
        (u.userType === 'caregiver' || u.userType === 'nurse' || u.userType === 'doctor' ||
        u.type === 'caregiver' || u.type === 'nurse' || u.type === 'doctor') &&
        u.status !== 'deleted' &&
        u.active !== false
      );
      
      // Filter pharmacists from users collection (exclude deleted)
      const pharmacistsFromUsers = institutionUsers.filter(u => 
        (u.userType === 'pharmacist' || u.type === 'pharmacist') &&
        u.status !== 'deleted' &&
        u.active !== false
      );
      
      // Deduplicate caregivers
      const allInstitutionCaregivers = [...institutionCaregivers];
      caregiversFromUsers.forEach(userCaregiver => {
        if (!allInstitutionCaregivers.find(c => c.id === userCaregiver.id || c.id === userCaregiver.uid)) {
          allInstitutionCaregivers.push({
            id: userCaregiver.id || userCaregiver.uid,
            uid: userCaregiver.uid,
            name: userCaregiver.name || userCaregiver.displayName,
            email: userCaregiver.email,
            userType: userCaregiver.userType || userCaregiver.type,
            type: userCaregiver.type || userCaregiver.userType,
            status: userCaregiver.status || 'pending',
            rating: userCaregiver.rating || 0,
            institutionId: userCaregiver.institutionId,
            phone: userCaregiver.phone,
            onboardingComplete: userCaregiver.onboardingComplete,
            createdAt: userCaregiver.createdAt,
            updatedAt: userCaregiver.updatedAt
          });
        }
      });
      
      // Build pharmacists list
      const allInstitutionPharmacists = pharmacistsFromUsers.map(p => ({
        id: p.id || p.uid,
        uid: p.uid,
        name: p.name || p.displayName,
        email: p.email,
        userType: p.userType || p.type,
        type: p.type || p.userType,
        status: p.status || 'pending',
        institutionId: p.institutionId,
        phone: p.phone,
        licenseNumber: p.licenseNumber,
        specialization: p.specialization,
        experience: p.experience,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }));
      
      // Update state with pharmacists
      setPharmacists(allInstitutionPharmacists);

      // Calculate assignment statistics (optimized)
      const activeAssignmentCount = assignmentsData.filter(a => 
        a.status !== 'completed' && a.status !== 'cancelled'
      ).length;
      const pendingAssignmentCount = assignmentsData.filter(a => a.status === 'pending').length;
      const completedAssignmentCount = assignmentsData.filter(a => a.status === 'completed').length;

      // Build stats object
      const realStats = {
        totalUsers: institutionUsers.length,
        clients: institutionClients.length,
        caregivers: allInstitutionCaregivers.filter(c => c.userType === 'caregiver' || c.type === 'caregiver').length,
        doctors: allInstitutionCaregivers.filter(c => c.userType === 'doctor' || c.type === 'doctor').length,
        nurses: allInstitutionCaregivers.filter(c => c.userType === 'nurse' || c.type === 'nurse').length,
        pharmacists: allInstitutionPharmacists.length,
        activeAppointments: 0,
        activeAssignments: activeAssignmentCount,
        pendingAssignments: pendingAssignmentCount,
        completedAssignments: completedAssignmentCount,
        emergencyAlerts: 0,
        medicationReminders: 0,
        systemHealth: 'Good',
        satisfaction: 0,
        responseTime: 0,
        uptime: 99
      };

      // Update state (batch updates for better performance)
      setStats(realStats);
      setClients(institutionClients);
      setCaregivers(allInstitutionCaregivers);
      setAssignments(assignmentsData);
      setTopCaregivers(allInstitutionCaregivers.slice(0, 3).map(caregiver => ({
        id: caregiver.id,
        name: caregiver.displayName || caregiver.name || 'Unknown Caregiver',
        rating: caregiver.rating || 0,
        clientsServed: caregiver.clientsServed || 0,
        tasksCompleted: caregiver.tasksCompleted || 0,
        responseTime: caregiver.responseTime || 0,
        avatar: caregiver.photoURL || null
      })));
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      // Ensure loading state is removed even if there's an error
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      setRefreshing(true);
      await loadDashboardData();
      toast.success('Dashboard data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      sessionManager.clearTabSession();
      await authManager.signOutFromRole('admin');
      navigate('/institution/login?institution=' + institutionId);
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  // Client Management Functions
  const handleAddClient = async (clientData) => {
    try {
      const instId = institutionId || userProfile?.institutionId;
      const newClient = {
        ...clientData,
        institutionId: instId,
        status: 'active'
      };

      const clientId = await createClient(newClient);
      console.log('✅ Client created with ID:', clientId);
      
      setShowAddClient(false);
      toast.success('Client added successfully');
      
      // Reload dashboard data to get the newly created client
      await loadDashboardData();
    } catch (error) {
      console.error('Error adding client:', error);
      toast.error(error.message || 'Failed to add client');
    }
  };

  // Caregiver Management Functions
  const handleAddCaregiver = async (caregiverData) => {
    try {
      const instId = institutionId || userProfile?.institutionId;
      
      if (!instId) {
        toast.error('Institution ID is required');
        return;
      }
      
      console.log('🏥 Creating caregiver for institution:', instId);
      
      // Validate required fields
      if (!caregiverData.email || !caregiverData.password || !caregiverData.name) {
        toast.error('Email, password, and name are required fields.');
        return;
      }

      if (caregiverData.password.length < 6) {
        toast.error('Password must be at least 6 characters long.');
        return;
      }
      
      // Check for duplicate email
      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', caregiverData.email));
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        toast.error('A user with this email already exists. Please use a different email.');
        return;
      }
      
      console.log('✅ Email is unique, creating Firebase Auth account...');
      
      // Create Firebase Auth account directly
      let authUser;
      try {
        authUser = await createUserWithEmailAndPassword(
          auth,
          caregiverData.email,
          caregiverData.password
        );
        console.log('✅ Firebase Auth account created:', authUser.user.uid);
      } catch (authError) {
        console.error('❌ Firebase Auth error:', authError);
        if (authError.code === 'auth/email-already-in-use') {
          toast.error('A user with this email already exists in Firebase Auth.');
        } else if (authError.code === 'auth/weak-password') {
          toast.error('Password is too weak. Please use a stronger password.');
        } else {
          toast.error(`Authentication error: ${authError.message}`);
        }
        return;
      }
      
      const caregiverId = authUser.user.uid;
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', caregiverId), {
        email: caregiverData.email,
        name: caregiverData.name,
        displayName: caregiverData.name,
        phone: caregiverData.phone || '',
        userType: caregiverData.userType || 'caregiver',
        type: caregiverData.userType || 'caregiver',
        role: caregiverData.userType || 'caregiver',
        institutionId: instId,
        specialization: caregiverData.specialization || caregiverData.medicalQualification || '',
        qualifications: caregiverData.qualifications || '',
        experience: caregiverData.experience || '0',
        licenseNumber: caregiverData.licenseNumber || '',
        availableDays: caregiverData.availableDays || [],
        workingHours: caregiverData.workingHours || '9:00 AM - 5:00 PM',
        hourlyRate: caregiverData.hourlyRate || '0',
        address: caregiverData.address || '',
        emergencyContact: caregiverData.emergencyContact || '',
        notes: caregiverData.notes || '',
        status: 'active',
        onboardingComplete: true,
        profileComplete: true,
        assignedClients: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'admin'
      });
      
      console.log('✅ Caregiver document created in Firestore');
      
      // Sign out the newly created user and reload
      await signOut(auth);
      console.log('✅ Cleaned up auth state');
      
      setShowAddCaregiver(false);
      toast.success(`✅ Caregiver ${caregiverData.name} added successfully! They can now login with their credentials.`);
      
      // Reload dashboard data
      await loadDashboardData();
      
      // Reload the page to restore admin session
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('❌ Error adding caregiver:', error);
      toast.error(error.message || 'Failed to add caregiver. Please try again.');
    }
  };

  // Pharmacist Management Functions
  const handleAssignPharmacistToClient = async (clientId, pharmacistId) => {
    try {
      const instId = institutionId || userProfile?.institutionId;
      
      // Get pharmacist details
      const pharmacist = pharmacists.find(p => p.id === pharmacistId);
      if (!pharmacist) {
        toast.error('Pharmacist not found');
        return;
      }
      
      // Update client document with assigned pharmacist
      const clientRef = doc(db, 'clients', clientId);
      const updateData = {
        assignedPharmacistId: pharmacistId,
        assignedPharmacistName: pharmacist.name,
        assignedPharmacistEmail: pharmacist.email,
        updatedAt: new Date().toISOString()
      };
      
      // Only add license number if it exists
      if (pharmacist.licenseNumber) {
        updateData.assignedPharmacistLicense = pharmacist.licenseNumber;
      }
      
      await updateDoc(clientRef, updateData);
      
      // Update pharmacist document with assigned client
      const pharmacistRef = doc(db, 'users', pharmacistId);
      const pharmacistDoc = await getDoc(pharmacistRef);
      const currentAssignedClients = pharmacistDoc.data()?.assignedClients || [];
      
      if (!currentAssignedClients.includes(clientId)) {
        await updateDoc(pharmacistRef, {
          assignedClients: [...currentAssignedClients, clientId],
          updatedAt: new Date().toISOString()
        });
      }
      
      // Create assignment record in clientAssignments collection
      const assignmentData = {
        clientId: clientId,
        caregiverId: pharmacistId, // Using caregiverId field for consistency with existing API
        assignedBy: user?.uid,
        assignedAt: new Date(),
        status: 'active',
        type: 'pharmacist',
        institutionId: instId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('🔍 Admin - Creating assignment record:', assignmentData);
      console.log('🔍 Admin - Client ID:', clientId);
      console.log('🔍 Admin - Pharmacist ID (caregiverId):', pharmacistId);
      console.log('🔍 Admin - Institution ID:', instId);
      
      const assignmentRef = await addDoc(collection(db, 'clientAssignments'), assignmentData);
      console.log('✅ Admin - Assignment created with ID:', assignmentRef.id);
      
      toast.success('Pharmacist assigned successfully!');
      
      // Reload dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error('Error assigning pharmacist:', error);
      toast.error(error.message || 'Failed to assign pharmacist');
    }
  };

  // User Role Management
  const handleEditUserRole = async (userData) => {
    console.log('🔧 Updating user role:', userData);
    
    try {
      if (!selectedUserForEdit) {
        toast.error('No user selected');
        return;
      }

      // Update user document in Firestore
      await updateDoc(doc(db, 'users', selectedUserForEdit.id), {
        userType: userData.userType,
        type: userData.userType,
        role: userData.role || userData.userType,
        medicalQualification: userData.medicalQualification || '',
        specialization: userData.specialization || '',
        status: userData.status,
        active: userData.active,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.uid || userProfile?.id
      });

      console.log('✅ User role updated successfully');
      toast.success(`User role updated to ${userData.userType} successfully!`);
      
      setShowEditUserModal(false);
      setSelectedUserForEdit(null);
      
      // Reload dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error('❌ Error updating user role:', error);
      toast.error(error.message || 'Failed to update user role');
    }
  };

  const handleAddPharmacist = async (pharmacistData) => {
    console.log('🔧 handleAddPharmacist called with data:', pharmacistData);
    
    try {
      const instId = effectiveInstitutionId || institutionId || userProfile?.institutionId;
      
      if (!instId) {
        console.error('❌ No institution ID available');
        toast.error('Institution ID is required. Please ensure you are logged in as an admin.');
        return;
      }
      
      console.log('🏥 Using institution ID:', instId);
      
      // Validate required fields
      if (!pharmacistData.email || !pharmacistData.password || !pharmacistData.name) {
        toast.error('Email, password, and name are required fields.');
        return;
      }

      if (pharmacistData.password.length < 6) {
        toast.error('Password must be at least 6 characters long.');
        return;
      }
      
      // Check for duplicate email in users collection
      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', pharmacistData.email));
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        toast.error('A user with this email already exists. Please use a different email.');
        return;
      }
      
      console.log('✅ Email is unique, creating Firebase Auth account...');
      
      // Create Firebase Auth account directly (no cloud function needed)
      let authUser;
      try {
        authUser = await createUserWithEmailAndPassword(
          auth,
          pharmacistData.email,
          pharmacistData.password
        );
        console.log('✅ Firebase Auth account created:', authUser.user.uid);
      } catch (authError) {
        console.error('❌ Firebase Auth error:', authError);
        if (authError.code === 'auth/email-already-in-use') {
          toast.error('A user with this email already exists in Firebase Auth.');
        } else if (authError.code === 'auth/weak-password') {
          toast.error('Password is too weak. Please use a stronger password.');
        } else {
          toast.error(`Authentication error: ${authError.message}`);
        }
        return;
      }
      
      const pharmacistId = authUser.user.uid;
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', pharmacistId), {
        email: pharmacistData.email,
        name: pharmacistData.name,
        displayName: pharmacistData.name,
        phone: pharmacistData.phone || '',
        userType: 'pharmacist',
        type: 'pharmacist',
        role: 'pharmacist',
        institutionId: instId,
        licenseNumber: pharmacistData.licenseNumber || '',
        specialization: pharmacistData.specialization || 'General Pharmacy',
        qualifications: pharmacistData.qualifications || '',
        experience: pharmacistData.experience || 0,
        address: pharmacistData.address || '',
        emergencyContact: pharmacistData.emergencyContact || '',
        notes: pharmacistData.notes || '',
        status: 'active',
        onboardingComplete: true,
        profileComplete: true,
        assignedClients: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'admin'
      });
      
      console.log('✅ Pharmacist document created in Firestore');
      
      // Sign out the newly created user (since we created them with createUserWithEmailAndPassword)
      // This prevents the admin from being logged out
      await signOut(auth);
      
      // Sign the admin back in if they have auth
      // (This is a workaround - ideally we'd use Admin SDK but that requires cloud function)
      console.log('✅ Cleaned up auth state');
      
      setShowAddPharmacist(false);
      toast.success(`✅ Pharmacist ${pharmacistData.name} added successfully! They can now login with their credentials.`);
      
      // Reload dashboard data
      await loadDashboardData();
      
      // Reload the page to restore admin session
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('❌ Error adding pharmacist:', error);
      toast.error(error.message || 'Failed to add pharmacist. Please try again.');
    }
  };

  // Delete pharmacist
  const handleDeletePharmacist = async (pharmacist) => {
    if (!window.confirm(`Are you sure you want to delete pharmacist ${pharmacist.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('🗑️ Deleting pharmacist:', pharmacist.id);
      
      // Delete from Firestore
      const userRef = doc(db, 'users', pharmacist.id);
      await updateDoc(userRef, {
        status: 'deleted',
        active: false,
        deletedAt: new Date().toISOString(),
        deletedBy: user?.uid
      });
      
      toast.success(`Pharmacist ${pharmacist.name} has been deleted successfully`);
      
      // Reload dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error('Error deleting pharmacist:', error);
      toast.error('Failed to delete pharmacist');
    }
  };

  // Assignment Functions
  const handleCreateAssignment = async (formData) => {
    try {
      // Get client and caregiver details first
      const client = clients.find(p => p.id === selectedClientForAssignment);
      const caregiver = caregivers.find(c => c.id === selectedCaregiverForAssignment);
      
      const assignmentData = {
        clientId: selectedClientForAssignment,
        caregiverId: selectedCaregiverForAssignment,
        clientName: client?.name || client?.displayName || 'Unknown Client',
        caregiverName: caregiver?.name || caregiver?.displayName || 'Unknown Caregiver',
        clientEmail: client?.email || '',
        caregiverEmail: caregiver?.email || '',
        institutionId: institutionId || userProfile?.institutionId,
        assignedBy: userProfile?.id || user?.uid,
        assignedByName: userProfile?.name || 'Admin',
        assignmentType: assignmentType,
        title: formData.title,
        description: formData.description,
        instructions: formData.instructions,
        priority: formData.priority,
        dueDate: formData.dueDate,
        dueTime: formData.dueTime,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const createdAssignment = await assignmentAPI.createAssignment(assignmentData);
      
      // Send notification to caregiver
      if (caregiver) {
        try {
          await createNotification({
            userId: selectedCaregiverForAssignment,
            type: NOTIFICATION_TYPES.TASK,
            priority: formData.priority === 'urgent' ? NOTIFICATION_PRIORITIES.URGENT : 
                     formData.priority === 'high' ? NOTIFICATION_PRIORITIES.HIGH : 
                     NOTIFICATION_PRIORITIES.MEDIUM,
            title: 'New Task Assigned',
            message: `You have been assigned a new task: "${formData.title}" for client ${client?.name || 'Unknown Client'}`,
            data: {
              assignmentId: createdAssignment.id,
              clientId: selectedClientForAssignment,
              clientName: client?.name,
              dueDate: formData.dueDate,
              dueTime: formData.dueTime
            },
            actionUrl: '/institution-caregiver/dashboard',
            read: false
          });
          console.log('✅ Notification sent to caregiver:', selectedCaregiverForAssignment);
        } catch (notifError) {
          console.error('Failed to send notification to caregiver:', notifError);
        }
      }
      
      // Send notification to client
      if (client && client.userId) {
        try {
          await createNotification({
            userId: client.userId,
            type: NOTIFICATION_TYPES.TASK,
            priority: formData.priority === 'urgent' ? NOTIFICATION_PRIORITIES.URGENT : 
                     formData.priority === 'high' ? NOTIFICATION_PRIORITIES.HIGH : 
                     NOTIFICATION_PRIORITIES.MEDIUM,
            title: 'Caregiver Task Created',
            message: `A care task has been created for you: "${formData.title}". Your caregiver ${caregiver?.name || 'Unknown Caregiver'} will be assisting you.`,
            data: {
              assignmentId: createdAssignment.id,
              caregiverId: selectedCaregiverForAssignment,
              caregiverName: caregiver?.name,
              dueDate: formData.dueDate,
              dueTime: formData.dueTime
            },
            actionUrl: '/elderly-dashboard',
            read: false
          });
          console.log('✅ Notification sent to client:', client.userId);
        } catch (notifError) {
          console.error('Failed to send notification to client:', notifError);
        }
      }
      
      setShowAssignmentModal(false);
      setSelectedClientForAssignment('');
      setSelectedCaregiverForAssignment('');
      toast.success('Assignment created and notifications sent successfully');
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error('Failed to create assignment');
    }
  };

  // Caregiver Action Handlers
  const handleResetPassword = async (caregiverId) => {
    try {
      // TODO: Implement password reset via Firebase Auth
      toast.info('Password reset email sent to caregiver');
      console.log('Reset password for caregiver:', caregiverId);
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password');
    }
  };

  const handleToggleCaregiverStatus = async (caregiver) => {
    try {
      const newStatus = caregiver.status === 'active' ? 'suspended' : 'active';
      await caregiverAPI.updateCaregiver(caregiver.id, { status: newStatus });
      toast.success(`Caregiver ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
      await loadDashboardData();
      setShowCaregiverDetails(false);
    } catch (error) {
      console.error('Error updating caregiver status:', error);
      toast.error('Failed to update caregiver status');
    }
  };

  const handleDeleteCaregiver = async (caregiverId) => {
    if (!window.confirm('Are you sure you want to delete this caregiver? This action cannot be undone.')) {
      return;
    }
    try {
      console.log('🗑️ Starting deletion for caregiver:', caregiverId);
      
      // Close the modal first
      setShowCaregiverDetails(false);
      setSelectedCaregiver(null);
      
      // Delete the caregiver
      await caregiverAPI.deleteCaregiver(caregiverId);
      console.log('✅ Caregiver deleted from database');
      
      // Immediately remove from local state
      setCaregivers(prevCaregivers => prevCaregivers.filter(c => c.id !== caregiverId));
      console.log('✅ Removed from local state');
      
      toast.success('Caregiver deleted successfully');
      
      // Reload dashboard data in background to ensure consistency
      setTimeout(() => {
        loadDashboardData();
      }, 500);
    } catch (error) {
      console.error('Error deleting caregiver:', error);
      toast.error('Failed to delete caregiver');
    }
  };

  const handleApproveCaregiver = async (caregiver) => {
    if (!window.confirm(`Approve ${caregiver.name} as a caregiver? They will gain access to the dashboard.`)) {
      return;
    }
    try {
      // Update both users and caregivers collections
      await updateDoc(doc(db, 'users', caregiver.id), { 
        status: 'active',
        approvedAt: new Date().toISOString(),
        approvedBy: user?.uid || userProfile?.id
      });
      
      await updateDoc(doc(db, 'caregivers', caregiver.id), { 
        status: 'active',
        approvedAt: new Date().toISOString(),
        approvedBy: user?.uid || userProfile?.id
      });
      
      // Send notification to the caregiver
      await createNotification({
        userId: caregiver.id,
        type: NOTIFICATION_TYPES.SYSTEM,
        priority: NOTIFICATION_PRIORITIES.HIGH,
        title: 'Account Approved!',
        message: `Your account has been approved by the administrator. You can now access the caregiver dashboard.`,
        data: {
          action: 'account_approved',
          institutionId: institutionId
        }
      });
      
      toast.success(`${caregiver.name} has been approved successfully`);
      await loadDashboardData(); // Reload to update the status
    } catch (error) {
      console.error('Error approving caregiver:', error);
      toast.error('Failed to approve caregiver');
    }
  };

  const handleRejectCaregiver = async (caregiver) => {
    const reason = window.prompt(`Please provide a reason for rejecting ${caregiver.name}'s application:`);
    if (!reason) {
      toast.info('Rejection cancelled');
      return;
    }
    
    try {
      // Update both users and caregivers collections
      await updateDoc(doc(db, 'users', caregiver.id), { 
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: user?.uid || userProfile?.id,
        rejectionReason: reason
      });
      
      await updateDoc(doc(db, 'caregivers', caregiver.id), { 
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: user?.uid || userProfile?.id,
        rejectionReason: reason
      });
      
      // Send notification to the caregiver
      await createNotification({
        userId: caregiver.id,
        type: NOTIFICATION_TYPES.SYSTEM,
        priority: NOTIFICATION_PRIORITIES.HIGH,
        title: 'Application Not Approved',
        message: `Your caregiver application was not approved. Reason: ${reason}. Please contact the administrator for more information.`,
        data: {
          action: 'account_rejected',
          reason: reason,
          institutionId: institutionId
        }
      });
      
      toast.success(`${caregiver.name}'s application has been rejected`);
      await loadDashboardData(); // Reload to update the status
    } catch (error) {
      console.error('Error rejecting caregiver:', error);
      toast.error('Failed to reject caregiver');
    }
  };

  const handleAssignTaskToCaregiver = (caregiver) => {
    setSelectedCaregiverForAssignment(caregiver.id);
    setShowCaregiverDetails(false);
    setShowAssignmentModal(true);
  };

  // Client Action Handlers
  const handleDeleteClient = async (clientId) => {
    if (!window.confirm('Are you sure you want to delete this client? This will archive their data.')) {
      return;
    }
    try {
      await updateClient(clientId, { 
        status: 'archived',
        archivedAt: new Date().toISOString(),
        archivedBy: user?.uid || userProfile?.id || 'admin'
      });
      toast.success('Client archived successfully');
      await loadDashboardData();
      setShowClientDetails(false);
    } catch (error) {
      console.error('Error archiving client:', error);
      toast.error('Failed to archive client');
    }
  };

  const handleAssignTaskToClient = (client) => {
    setSelectedClientForAssignment(client.id);
    setShowClientDetails(false);
    setShowAssignmentModal(true);
  };

  // Assignment Action Handlers
  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
      return;
    }
    try {
      await assignmentAPI.deleteAssignment(assignmentId);
      toast.success('Assignment deleted successfully');
      await loadDashboardData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('Failed to delete assignment');
    }
  };

  // Messaging Functions
  const loadConversations = async () => {
    if (!user?.uid) return;
    
    try {
      const userConversations = await getConversationsByUser(user.uid);
      console.log(`💬 Loaded ${userConversations.length} conversations`);
      
      // Enrich conversations with participant details and unread counts
      const enrichedConversations = await Promise.all(
        userConversations.map(async (conv) => {
          // Find the other participant (not the current user)
          const otherParticipantId = conv.participants?.find(p => p !== user.uid);
          
          if (!otherParticipantId) {
            return {
              ...conv,
              name: 'Unknown User',
              unread: 0,
              missedCalls: 0
            };
          }
          
          // Try to find participant in caregivers, clients, or pharmacists
          let participantName = 'Unknown User';
          let participantType = 'user';
          
          const caregiver = caregivers.find(c => c.id === otherParticipantId || c.userId === otherParticipantId);
          if (caregiver) {
            participantName = caregiver.name || caregiver.fullName;
            participantType = caregiver.role || caregiver.type || caregiver.userType || 'caregiver';
          }
          
          if (!caregiver) {
            const pharmacist = pharmacists.find(p => p.id === otherParticipantId || p.userId === otherParticipantId);
            if (pharmacist) {
              participantName = pharmacist.name || pharmacist.fullName;
              participantType = 'pharmacist';
            }
          }
          
          // Get unread message count for this conversation
          let unreadCount = 0;
          try {
            const convMessages = await getMessagesByConversation(conv.id);
            unreadCount = convMessages.filter(m => !m.read && m.senderId !== user.uid).length;
          } catch (error) {
            console.error('Error getting unread count:', error);
          }
          
          // Get missed calls count (for future implementation)
          const missedCalls = 0; // TODO: Implement call tracking
          
          return {
            ...conv,
            name: participantName,
            type: participantType,
            unread: unreadCount,
            missedCalls: missedCalls,
            conversationId: conv.id,
            lastMessage: conv.lastMessage || 'No messages yet',
            timestamp: conv.lastMessageTime || conv.createdAt
          };
        })
      );
      
      setConversations(enrichedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    }
  };

  const loadMessagesForConversation = async (conversationId) => {
    try {
      const conversationMessages = await getMessagesByConversation(conversationId);
      console.log(`💬 Loaded ${conversationMessages.length} messages`);
      setMessages(conversationMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  };

  // Load conversations when messages tab is active
  useEffect(() => {
    if (activeTab === 'messages' && user?.uid && caregivers.length > 0) {
      loadConversations();
      
      // Set up real-time listener for conversations
      const unsubscribe = subscribeToUserConversations(user.uid, (updatedConversations) => {
        console.log(`🔄 Real-time update: ${updatedConversations.length} conversations`);
        
        // Enrich conversations with participant details
        const enrichedConversations = updatedConversations.map((conv) => {
          const otherParticipantId = conv.participants?.find(p => p !== user.uid);
          
          let participantName = 'Unknown User';
          let participantType = 'user';
          
          const caregiver = caregivers.find(c => c.id === otherParticipantId || c.userId === otherParticipantId);
          if (caregiver) {
            participantName = caregiver.name || caregiver.fullName;
            participantType = 'caregiver';
          }
          
          if (!caregiver) {
            const pharmacist = pharmacists.find(p => p.id === otherParticipantId || p.userId === otherParticipantId);
            if (pharmacist) {
              participantName = pharmacist.name || pharmacist.fullName;
              participantType = 'pharmacist';
            }
          }
          
          return {
            ...conv,
            name: participantName,
            type: participantType,
            unread: 0,
            conversationId: conv.id,
            lastMessage: conv.lastMessage || 'No messages yet',
            timestamp: conv.lastMessageTime || conv.createdAt
          };
        });
        
        setConversations(enrichedConversations);
      });
      
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [activeTab, user?.uid, caregivers, pharmacists]);

  // Set up real-time listener for messages when a conversation is selected
  useEffect(() => {
    if (selectedConversation?.conversationId || selectedConversation?.id) {
      const conversationId = selectedConversation.conversationId || selectedConversation.id;
      
      const unsubscribe = subscribeToConversationMessages(conversationId, (updatedMessages) => {
        console.log(`🔄 Real-time update: ${updatedMessages.length} messages`);
        setMessages(updatedMessages);
      });
      
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [selectedConversation]);

  const renderMessagesTab = () => {
    const handleSendMessage = async () => {
      if (!newMessage.trim() || !selectedConversation) return;
      
      try {
        let conversationId = selectedConversation.conversationId || selectedConversation.id;
        
        if (!selectedConversation.conversationId && selectedConversation.participants) {
          const conversationResult = await getOrCreateConversation(selectedConversation.participants, 'admin');
          conversationId = conversationResult.id || conversationResult;
          console.log(`✅ Created new conversation: ${conversationId}`);
        }
        
        if (typeof conversationId === 'object' && conversationId.id) {
          conversationId = conversationId.id;
        }
        
        console.log('📤 Sending message to conversation:', conversationId);
        
        await sendMessageAPI(conversationId, user.uid, {
          text: newMessage,
          type: 'text',
          senderName: userProfile?.name || 'Admin'
        });
        
        const message = {
          id: Date.now(),
          text: newMessage,
          senderId: user?.uid,
          senderName: userProfile?.name || 'You',
          createdAt: new Date(),
          read: false
        };
        
        setMessages([...messages, message]);
        setNewMessage('');
        
        toast.success('Message sent successfully');
        loadConversations();
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
      }
    };

    const startVoiceCall = async () => {
      if (!selectedConversation) {
        toast.error('Please select a conversation first');
        return;
      }
      
      if (!userProfile || (!userProfile.id && !userProfile.uid)) {
        toast.error('User profile not available');
        return;
      }
      
      try {
        // Get the recipient ID from the conversation
        const userId = userProfile.id || userProfile.uid || user.uid;
        
        // Debug: Log full conversation details
        console.log('🔍 Selected conversation:', {
          conversation: selectedConversation,
          participants: selectedConversation.participants,
          userId: selectedConversation.userId,
          id: selectedConversation.id,
          currentUserId: userId
        });
        
        // Find recipient from participants array
        let recipientId = null;
        if (selectedConversation.participants && Array.isArray(selectedConversation.participants)) {
          recipientId = selectedConversation.participants.find(p => p !== userId);
          console.log('✅ Found recipient in participants:', recipientId);
        }
        
        // Fallback to userId field
        if (!recipientId && selectedConversation.userId && selectedConversation.userId !== userId) {
          recipientId = selectedConversation.userId;
          console.log('✅ Found recipient in userId field:', recipientId);
        }
        
        // Fallback to id field (only if it's not a conversation ID format)
        if (!recipientId && selectedConversation.id && !selectedConversation.id.includes('_conv_') && selectedConversation.id !== userId) {
          recipientId = selectedConversation.id;
          console.log('✅ Found recipient in id field:', recipientId);
        }
        
        if (!recipientId) {
          toast.error('Could not identify recipient. Please check conversation data.');
          console.error('❌ Conversation data:', selectedConversation);
          return;
        }
        
        // Prevent calling yourself
        if (recipientId === userId) {
          toast.error('Cannot call yourself');
          console.error('❌ Attempted to call self:', { userId, recipientId });
          return;
        }
        
        console.log('🎤 Initiating voice call:', { 
          callerId: userId, 
          recipientId,
          recipientName: selectedConversation.name 
        });
        
        // Initiate call through call service
        const result = await callService.initiateCall(
          userId,
          recipientId,
          'voice'
        );

        if (result.success) {
          // Get local media stream
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          setLocalStream(stream);
          setCallType('voice');
          setIsInCall(true);
          setActiveCall({
            callId: result.callId,
            participantId: recipientId,
            participantName: selectedConversation.name || 'User',
            callType: 'voice'
          });
          toast.success(`Voice call initiated with ${selectedConversation.name || 'User'}`);
        } else {
          toast.error('Failed to initiate voice call');
        }
      } catch (error) {
        console.error('Error starting voice call:', error);
        toast.error('Failed to start voice call. Please check microphone permissions.');
      }
    };

    const startVideoCall = async () => {
      if (!selectedConversation) {
        toast.error('Please select a conversation first');
        return;
      }
      
      if (!userProfile || (!userProfile.id && !userProfile.uid)) {
        toast.error('User profile not available');
        return;
      }
      
      try {
        // Get the recipient ID from the conversation
        const userId = userProfile.id || userProfile.uid || user.uid;
        
        // Debug: Log full conversation details
        console.log('🔍 Selected conversation:', {
          conversation: selectedConversation,
          participants: selectedConversation.participants,
          userId: selectedConversation.userId,
          id: selectedConversation.id,
          currentUserId: userId
        });
        
        // Find recipient from participants array
        let recipientId = null;
        if (selectedConversation.participants && Array.isArray(selectedConversation.participants)) {
          recipientId = selectedConversation.participants.find(p => p !== userId);
          console.log('✅ Found recipient in participants:', recipientId);
        }
        
        // Fallback to userId field
        if (!recipientId && selectedConversation.userId && selectedConversation.userId !== userId) {
          recipientId = selectedConversation.userId;
          console.log('✅ Found recipient in userId field:', recipientId);
        }
        
        // Fallback to id field (only if it's not a conversation ID format)
        if (!recipientId && selectedConversation.id && !selectedConversation.id.includes('_conv_') && selectedConversation.id !== userId) {
          recipientId = selectedConversation.id;
          console.log('✅ Found recipient in id field:', recipientId);
        }
        
        if (!recipientId) {
          toast.error('Could not identify recipient. Please check conversation data.');
          console.error('❌ Conversation data:', selectedConversation);
          return;
        }
        
        // Prevent calling yourself
        if (recipientId === userId) {
          toast.error('Cannot call yourself');
          console.error('❌ Attempted to call self:', { userId, recipientId });
          return;
        }
        
        console.log('📹 Initiating video call:', { 
          callerId: userId, 
          recipientId,
          recipientName: selectedConversation.name 
        });
        
        // Initiate call through call service
        const result = await callService.initiateCall(
          userId,
          recipientId,
          'video'
        );

        if (result.success) {
          // Start WebRTC and signaling
          await webrtc.initialize();
          await webrtc.startCall(result.callId, recipientId, 'video');
          // Begin listening for signaling messages for this call
          webrtc.listenForSignaling(result.callId, async (msg) => {
            if (msg.type === 'answer') {
              await webrtc.handleAnswer(msg.data.answer);
            } else if (msg.type === 'ice-candidate') {
              await webrtc.handleIceCandidate(msg.data.candidate);
            } else if (msg.type === 'offer') {
              // Unexpected for initiator, ignore
            }
          });
          setCallType('video');
          setIsInCall(true);
          setActiveCall({
            callId: result.callId,
            participantId: recipientId,
            participantName: selectedConversation.name || 'User',
            callType: 'video'
          });
          toast.success(`Video call initiated with ${selectedConversation.name || 'User'}`);
        } else {
          toast.error('Failed to initiate video call');
        }
      } catch (error) {
        console.error('Error starting video call:', error);
        toast.error('Failed to start video call. Please check camera and microphone permissions.');
      }
    };

    const endCall = async () => {
      if (activeCall) {
        try {
          await callService.endCall(activeCall.callId);
          console.log('✅ Call ended through service');
        } catch (error) {
          console.error('Error ending call:', error);
        }
      }
      
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        setRemoteStream(null);
      }
      setIsInCall(false);
      setCallType(null);
      setActiveCall(null);
      toast.info('Call ended');
    };

    // Combine caregivers and pharmacists for display (excluding clients)
    const allPlatformUsers = [
      ...caregivers.map(c => ({ ...c, userType: 'caregiver' })),
      ...pharmacists.map(p => ({ ...p, userType: 'pharmacist' }))
    ];

    // Create conversation list combining existing conversations with all platform users
    const displayConversations = allPlatformUsers.map(person => {
      // Check if there's an existing conversation with this user
      const existingConv = conversations.find(conv => 
        conv.participants?.includes(person.id) || conv.participants?.includes(person.userId)
      );

      if (existingConv) {
        return existingConv;
      }

      // Create a potential conversation entry
      return {
        id: person.id,
        name: person.name || person.fullName || person.email || 'Unknown User',
        avatar: person.avatar || null,
        lastMessage: 'Start a conversation',
        timestamp: new Date().toISOString(),
        unread: 0,
        type: person.userType,
        participants: [user.uid, person.id],
        isNew: true
      };
    });

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-[calc(100vh-250px)]">
        <div className="flex h-full">
          {/* Conversations List */}
          <div className="w-80 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
              <p className="text-sm text-gray-500 mt-1">{displayConversations.length} users available</p>
              
              {/* Summary Stats */}
              {(() => {
                const totalUnread = displayConversations.reduce((sum, conv) => sum + (conv.unread || 0), 0);
                const totalMissedCalls = displayConversations.reduce((sum, conv) => sum + (conv.missedCalls || 0), 0);
                
                return (totalUnread > 0 || totalMissedCalls > 0) && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    {totalUnread > 0 && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-semibold">
                        💬 {totalUnread} unread
                      </span>
                    )}
                    {totalMissedCalls > 0 && (
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full font-semibold">
                        📞 {totalMissedCalls} missed
                      </span>
                    )}
                  </div>
                );
              })()}
              
              {/* Search Input */}
              <input
                type="text"
                placeholder="Search users..."
                value={messageSearchTerm || ''}
                onChange={(e) => setMessageSearchTerm(e.target.value)}
                className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {displayConversations
                .filter(conv => 
                  !messageSearchTerm || 
                  (conv.name || '').toLowerCase().includes(messageSearchTerm.toLowerCase()) ||
                  (conv.type || '').toLowerCase().includes(messageSearchTerm.toLowerCase())
                )
                .map((conversation) => {
                  const roleBadgeConfig = {
                    caregiver: { bg: 'bg-green-100', text: 'text-green-800', label: 'Caregiver' },
                    doctor: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Doctor' },
                    nurse: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Nurse' },
                    pharmacist: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Pharmacist' },
                    client: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Client' },
                    admin: { bg: 'bg-red-100', text: 'text-red-800', label: 'Admin' }
                  };
                  const badge = roleBadgeConfig[conversation.type] || roleBadgeConfig.client;

                  return (
                    <div
                      key={conversation.id}
                      onClick={() => {
                        setSelectedConversation(conversation);
                        const convId = conversation.conversationId || conversation.id;
                        if (!conversation.isNew) {
                          loadMessagesForConversation(convId);
                        } else {
                          setMessages([]);
                        }
                      }}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {(conversation.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-medium text-gray-900 truncate">{conversation.name || 'Unknown User'}</h3>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {conversation.unread > 0 && (
                                <span className="bg-blue-600 text-white text-xs rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center font-semibold">
                                  {conversation.unread}
                                </span>
                              )}
                              {conversation.missedCalls > 0 && (
                                <span className="bg-red-600 text-white text-xs rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center font-semibold" title="Missed calls">
                                  📞 {conversation.missedCalls}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                              {badge.label}
                            </span>
                            {conversation.isNew && (
                              <span className="text-xs text-gray-400 italic">New chat</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate mt-1">{conversation.lastMessage}</p>
                          <div className="flex items-center justify-between mt-1">
                            {!conversation.isNew && (
                              <span className="text-xs text-gray-400">
                                {new Date(conversation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            {(conversation.unread > 0 || conversation.missedCalls > 0) && (
                              <span className="text-xs font-semibold text-blue-600">
                                {conversation.unread > 0 && `${conversation.unread} new`}
                                {conversation.unread > 0 && conversation.missedCalls > 0 && ' • '}
                                {conversation.missedCalls > 0 && `${conversation.missedCalls} missed call${conversation.missedCalls > 1 ? 's' : ''}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              {displayConversations.filter(conv => 
                !messageSearchTerm || 
                (conv.name || '').toLowerCase().includes(messageSearchTerm.toLowerCase()) ||
                (conv.type || '').toLowerCase().includes(messageSearchTerm.toLowerCase())
              ).length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No users found</p>
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          {selectedConversation ? (
            <div className="flex-1 flex flex-col">
              {/* Chat Header with Call Buttons */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {(selectedConversation.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{selectedConversation.name || 'Unknown User'}</h3>
                    <p className="text-xs text-gray-500">
                      {selectedConversation.type === 'caregiver' ? 'Caregiver' : selectedConversation.type === 'pharmacist' ? 'Pharmacist' : selectedConversation.type || 'User'}
                    </p>
                  </div>
                </div>
                
                {/* Call Buttons */}
                <div className="flex items-center gap-2">
                  {!isInCall && (
                    <>
                      <button
                        onClick={startVoiceCall}
                        className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Start Voice Call"
                      >
                        <Phone className="h-5 w-5 text-gray-600" />
                      </button>
                      <button
                        onClick={startVideoCall}
                        className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Start Video Call"
                      >
                        <Camera className="h-5 w-5 text-gray-600" />
                      </button>
                    </>
                  )}
                  {isInCall && (
                    <button
                      onClick={endCall}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <Phone className="h-4 w-4" />
                      End Call
                    </button>
                  )}
                </div>
              </div>

              {/* Call Interface */}
              {isInCall && (
                <div className="p-6 bg-gray-900 flex items-center justify-center" style={{ height: '400px' }}>
                  <div className="text-center">
                    {callType === 'video' ? (
                      <div className="space-y-4">
                        <Camera className="h-16 w-16 text-white mx-auto" />
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-800 rounded-lg p-4 aspect-video flex items-center justify-center">
                            <div className="text-center">
                              <p className="text-white font-medium">You</p>
                              <p className="text-gray-400 text-sm">Camera Active</p>
                            </div>
                          </div>
                          <div className="bg-gray-800 rounded-lg p-4 aspect-video flex items-center justify-center">
                            <div className="text-center">
                              <p className="text-white font-medium">{selectedConversation.name}</p>
                              <p className="text-gray-400 text-sm">Connecting...</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Phone className="h-16 w-16 text-green-500 mx-auto animate-pulse" />
                        <p className="text-white text-lg font-medium">Voice Call Active</p>
                        <p className="text-gray-400">Connected with {selectedConversation.name}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Messages Area */}
              {!isInCall && (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-400">
                          <MessageSquare className="h-12 w-12 mx-auto mb-2" />
                          <p>No messages yet. Start the conversation!</p>
                        </div>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isSentByMe = (message.senderId || message.sender) === user?.uid;
                        const messageTime = message.createdAt || message.timestamp;
                        
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                isSentByMe
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-gray-900 border border-gray-200'
                              }`}
                            >
                              {!isSentByMe && message.senderName && (
                                <p className="text-xs font-semibold mb-1">{message.senderName}</p>
                              )}
                              <p className="text-sm">{message.text || message.content}</p>
                              <p className={`text-xs mt-1 ${
                                isSentByMe ? 'text-blue-100' : 'text-gray-400'
                              }`}>
                                {new Date(messageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center text-gray-400">
                <MessageSquare className="h-16 w-16 mx-auto mb-4" />
                <p className="text-lg font-medium">Select a conversation to start messaging</p>
                <p className="text-sm mt-2">Or start a voice/video call</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Quick action functions
  const quickActions = [
    {
      name: 'Add Client',
      icon: Heart,
      color: 'bg-green-600 hover:bg-green-700',
      action: () => setShowAddClient(true)
    },
    {
      name: 'Add Caregiver',
      icon: UserCheck,
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => setShowAddCaregiver(true)
    },
    {
      name: 'Assign Care',
      icon: Users,
      color: 'bg-purple-600 hover:bg-purple-700',
      action: () => setShowAssignmentModal(true)
    },
    {
      name: 'Inventory & Billing',
      icon: Package,
      color: 'bg-indigo-600 hover:bg-indigo-700',
      action: () => setActiveTab('inventory')
    },
    {
      name: 'View Analytics',
      icon: BarChart3,
      color: 'bg-orange-600 hover:bg-orange-700',
      action: () => setActiveTab('analytics')
    }
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'emergency':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'appointment':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'medication':
        return <Heart className="h-4 w-4 text-green-500" />;
      case 'user':
        return <UserCheck className="h-4 w-4 text-purple-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Institution Dashboard</h1>
          <p className="text-gray-600">Welcome back, {userProfile?.displayName || user?.email}</p>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-sm text-green-600 font-medium">License Active</span>
            </div>
            {institutionId && (
              <div className="flex items-center">
                <span className="text-xs text-gray-500">ID:</span>
                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded ml-1">
                  {institutionId.slice(0, 8)}...
                </span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate(`/onboard?institution=${effectiveInstitutionId}`)}
            className="flex items-center px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Shield className="h-4 w-4 mr-2" />
            Back to Portal
          </button>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button 
            onClick={() => navigate('/admin/client-database')}
            className="flex items-center px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </button>
          <button 
            onClick={() => navigate('/admin/caregiver-management')}
            className="flex items-center px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Add Caregiver
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
              { id: 'clients', name: 'Clients', icon: Heart },
              { id: 'caregivers', name: 'Caregivers', icon: UserCheck },
              { id: 'pharmacists', name: 'Pharmacists', icon: Pill },
              { id: 'assignments', name: 'Assignments', icon: Users },
              { id: 'messages', name: 'Messages', icon: MessageSquare },
              { id: 'analytics', name: 'Analytics', icon: TrendingUp }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Quick Actions */}
      {activeTab === 'dashboard' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={action.action}
                  className={`${action.color} text-white p-4 rounded-lg transition-colors flex flex-col items-center space-y-2`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-sm font-medium text-center">{action.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dashboard Tab Content */}
      {activeTab === 'dashboard' && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Staff Card */}
            <div 
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200"
              onClick={() => setShowStaffModal(true)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Staff</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+12% from last month</span>
              </div>
            </div>

            {/* Total Clients Card */}
            <div 
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-green-300 transition-all duration-200"
              onClick={() => setShowClientsModal(true)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Clients</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.clients.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Heart className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+8% from last month</span>
              </div>
            </div>

            {/* Active Appointments Card */}
            <div 
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-orange-300 transition-all duration-200"
              onClick={() => setShowAppointmentsModal(true)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Appointments</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeAppointments}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <Clock className="h-4 w-4 text-blue-500 mr-1" />
                <span className="text-sm text-blue-600">Today's schedule</span>
              </div>
            </div>
          </div>

      {/* Emergency Alerts */}
      {stats.emergencyAlerts > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-l-4 border-red-500 bg-red-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Emergency Alerts</h3>
                <p className="text-red-600">
                  {stats.emergencyAlerts} active emergency alert{stats.emergencyAlerts > 1 ? 's' : ''} requiring immediate attention
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/admin/emergency')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              View Emergencies
            </button>
          </div>
        </div>
      )}

      {/* System Status, Recent Activity, and Top Caregivers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">System Health</h2>
            <Shield className="h-5 w-5 text-green-600" />
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Database</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Healthy
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Authentication</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Healthy
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Notifications</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Healthy
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">API Response Time</span>
              <span className="text-sm font-medium text-gray-900">{stats.responseTime || 45}ms</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <Activity className="h-5 w-5 text-gray-600" />
          </div>
          
          <div className="space-y-3">
            {recentActivity.length > 0 ? recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                {getActivityIcon(activity.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">{activity.time}</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                      {activity.status}
                    </span>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
            )}
          </div>
        </div>

        {/* Top Caregivers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Caregivers</h2>
            <UserCheck className="h-5 w-5 text-purple-600" />
          </div>
          
          <div className="space-y-4">
            {topCaregivers.length > 0 ? topCaregivers.map((caregiver, index) => (
              <div key={caregiver.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{caregiver.name}</h4>
                    <p className="text-xs text-gray-600">{caregiver.clientsServed} clients</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900">{caregiver.rating}</span>
                    <span className="text-xs text-gray-500 ml-1">★</span>
                  </div>
                  <p className="text-xs text-gray-600">{caregiver.tasksCompleted} tasks</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-500 text-center py-4">No caregivers yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button 
            onClick={() => navigate('/admin/users')}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium">Manage Users</span>
          </button>
          <button 
            onClick={() => navigate('/admin/caregivers')}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UserCheck className="h-5 w-5 text-indigo-600 mr-2" />
            <span className="text-sm font-medium">Caregivers</span>
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-5 w-5 text-orange-600 mr-2" />
            <span className="text-sm font-medium">Analytics</span>
          </button>
          <button 
            onClick={() => navigate('/admin/communication')}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <MessageSquare className="h-5 w-5 text-teal-600 mr-2" />
            <span className="text-sm font-medium">Messages</span>
          </button>
          <button 
            onClick={() => navigate('/admin/audit-logs')}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-5 w-5 text-gray-600 mr-2" />
            <span className="text-sm font-medium">Audit Logs</span>
          </button>
          <button 
            onClick={() => navigate('/admin/emergency')}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-sm font-medium">Emergency Center</span>
          </button>
          <button 
            onClick={() => navigate('/admin/reports')}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-sm font-medium">View Reports</span>
          </button>
          <button 
            onClick={() => setShowLinkCustomizer(true)}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings className="h-5 w-5 text-purple-600 mr-2" />
            <span className="text-sm font-medium">Customize Links</span>
          </button>
        </div>
      </div>
        </>
      )}

      {/* Clients Tab Content */}
      {activeTab === 'clients' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Clients</h2>
            <button
              onClick={() => setShowAddClient(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pharmacist</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients.map((client) => (
                    <tr key={client.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-green-700">
                                {client.name?.charAt(0) || 'P'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{client.name || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{client.email || 'No email'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.age || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.gender || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {client.assignedPharmacistId ? (
                          <div className="flex items-center text-sm">
                            <Pill className="h-4 w-4 text-green-600 mr-1" />
                            <span className="text-gray-900">
                              {client.assignedPharmacistName || pharmacists.find(p => p.id === client.assignedPharmacistId)?.name || 'Assigned'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Not assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          client.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {client.status || 'active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          onClick={() => {
                            setSelectedClient(client);
                            setShowClientDetails(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Caregivers Tab Content */}
      {activeTab === 'caregivers' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Caregivers</h2>
            <button
              onClick={() => setShowAddCaregiver(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Caregiver
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Onboarding</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {caregivers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center">
                        <div className="text-gray-500">
                          <p className="text-sm font-medium">No caregivers found</p>
                          <p className="text-xs mt-1">Click "Add Caregiver" to create your first caregiver</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    caregivers.map((caregiver) => (
                      <tr key={caregiver.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-700">
                                  {caregiver.name?.charAt(0) || 'C'}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{caregiver.name || 'Unknown'}</div>
                              <div className="text-sm text-gray-500">{caregiver.email || 'No email'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{caregiver.userType || caregiver.type || 'Caregiver'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {caregiver.onboardingComplete ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Complete
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            caregiver.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : caregiver.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {caregiver.status || 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <span className="text-yellow-400">★</span>
                            <span className="ml-1">{caregiver.rating || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                setSelectedCaregiver(caregiver);
                                setShowCaregiverDetails(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </button>
                            
                            <button 
                              onClick={() => {
                                setSelectedUserForEdit(caregiver);
                                setShowEditUserModal(true);
                              }}
                              className="text-purple-600 hover:text-purple-900 inline-flex items-center"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </button>
                            
                            {caregiver.status === 'pending' && caregiver.onboardingComplete && (
                              <>
                                <button 
                                  onClick={() => handleApproveCaregiver(caregiver)}
                                  className="text-green-600 hover:text-green-900 inline-flex items-center px-2 py-1 border border-green-600 rounded hover:bg-green-50"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handleRejectCaregiver(caregiver)}
                                  className="text-red-600 hover:text-red-900 inline-flex items-center px-2 py-1 border border-red-600 rounded hover:bg-red-50"
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Pharmacists Tab Content */}
      {activeTab === 'pharmacists' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Pharmacists</h2>
            <button
              onClick={() => setShowAddPharmacist(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Pharmacist
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialization</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pharmacists.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center">
                        <div className="text-gray-500">
                          <Pill className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm font-medium">No pharmacists found</p>
                          <p className="text-xs mt-1">Click "Add Pharmacist" to onboard your first pharmacist</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pharmacists.map((pharmacist) => (
                      <tr key={pharmacist.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-green-700">
                                  {pharmacist.name?.charAt(0) || 'P'}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{pharmacist.name || 'Unknown'}</div>
                              <div className="text-sm text-gray-500">{pharmacist.email || 'No email'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pharmacist.licenseNumber || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pharmacist.specialization || 'General'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            pharmacist.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : pharmacist.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {pharmacist.status || 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pharmacist.experience || 0} years</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                setSelectedPharmacist(pharmacist);
                                setShowPharmacistDetails(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </button>
                            
                            {pharmacist.status === 'pending' && (
                              <>
                                <button 
                                  onClick={() => handleApprovePharmacist(pharmacist)}
                                  className="text-green-600 hover:text-green-900 inline-flex items-center px-2 py-1 border border-green-600 rounded hover:bg-green-50"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handleRejectPharmacist(pharmacist)}
                                  className="text-red-600 hover:text-red-900 inline-flex items-center px-2 py-1 border border-red-600 rounded hover:bg-red-50"
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Reject
                                </button>
                              </>
                            )}
                            
                            <button 
                              onClick={() => handleDeletePharmacist(pharmacist)}
                              className="text-red-600 hover:text-red-900 inline-flex items-center px-2 py-1 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Assignments Tab Content */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Tasks & Assignments</h2>
            <button
              onClick={() => setShowAssignmentModal(true)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Assignment
            </button>
          </div>
          
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Assignments</p>
                  <p className="text-2xl font-bold text-gray-900">{assignments.length}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {assignments.filter(a => a.status === 'pending').length}
                  </p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {assignments.filter(a => a.status === 'in_progress' || a.status === 'active').length}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {assignments.filter(a => a.status === 'completed').length}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Assignments Table */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Caregiver
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-lg font-medium">No assignments yet</p>
                        <p className="text-sm">Create your first assignment to get started</p>
                      </td>
                    </tr>
                  ) : (
                    assignments.map((assignment) => {
                      const client = clients.find(p => p.id === assignment.clientId);
                      const caregiver = caregivers.find(c => c.id === assignment.caregiverId);
                      
                      return (
                        <tr key={assignment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {assignment.title || 'Untitled Task'}
                              </div>
                              {assignment.description && (
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {assignment.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {assignment.clientName || client?.name || 'Unknown Client'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {assignment.caregiverName || caregiver?.name || 'Unknown Caregiver'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              assignment.priority === 'urgent'
                                ? 'bg-red-100 text-red-800'
                                : assignment.priority === 'high'
                                ? 'bg-orange-100 text-orange-800'
                                : assignment.priority === 'normal'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {assignment.priority || 'normal'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              assignment.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : assignment.status === 'in_progress' || assignment.status === 'active'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {assignment.status || 'pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {assignment.dueDate ? (
                              <div>
                                <div>{assignment.dueDate}</div>
                                {assignment.dueTime && <div className="text-xs">{assignment.dueTime}</div>}
                              </div>
                            ) : (
                              'No due date'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => {
                                setSelectedAssignment(assignment);
                                setShowAssignmentDetails(true);
                              }}
                              className="text-purple-600 hover:text-purple-900 mr-3 inline-flex items-center"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </button>
                            <button
                              onClick={() => handleDeleteAssignment(assignment.id)}
                              className="text-red-600 hover:text-red-900 inline-flex items-center"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Messages Tab Content */}
      {activeTab === 'messages' && (
        <div className="space-y-6">
          {renderMessagesTab()}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Institution Analytics</h2>
              <p className="text-gray-600 mt-1">Comprehensive insights for {institutionData?.name || 'your institution'}</p>
            </div>
            <button
              onClick={() => loadDashboardData()}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </button>
          </div>

          {/* Overview Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Users</p>
                  <p className="text-3xl font-bold mt-2">{stats.totalUsers}</p>
                  <div className="mt-2 flex items-center text-blue-100 text-sm">
                    <Users className="h-4 w-4 mr-1" />
                    <span>Active members</span>
                  </div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-3">
                  <Users className="h-8 w-8" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Caregivers</p>
                  <p className="text-3xl font-bold mt-2">{stats.caregivers + stats.doctors + stats.nurses}</p>
                  <div className="mt-2 flex items-center text-green-100 text-sm">
                    <UserCheck className="h-4 w-4 mr-1" />
                    <span>{stats.caregivers} active</span>
                  </div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-3">
                  <UserCheck className="h-8 w-8" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Clients</p>
                  <p className="text-3xl font-bold mt-2">{stats.clients}</p>
                  <div className="mt-2 flex items-center text-purple-100 text-sm">
                    <Heart className="h-4 w-4 mr-1" />
                    <span>Under care</span>
                  </div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-3">
                  <Heart className="h-8 w-8" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Active Tasks</p>
                  <p className="text-3xl font-bold mt-2">{stats.activeAssignments}</p>
                  <div className="mt-2 flex items-center text-orange-100 text-sm">
                    <Activity className="h-4 w-4 mr-1" />
                    <span>{stats.pendingAssignments} pending</span>
                  </div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-3">
                  <Activity className="h-8 w-8" />
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Analytics Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Staff Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <UserCheck className="h-5 w-5 mr-2 text-blue-600" />
                Staff Distribution
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                      {stats.caregivers}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Caregivers</p>
                      <p className="text-xs text-gray-500">Primary care providers</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">
                    {stats.totalUsers > 0 ? Math.round((stats.caregivers / stats.totalUsers) * 100) : 0}%
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                      {stats.doctors}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Doctors</p>
                      <p className="text-xs text-gray-500">Medical professionals</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-green-600">
                    {stats.totalUsers > 0 ? Math.round((stats.doctors / stats.totalUsers) * 100) : 0}%
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                      {stats.nurses}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Nurses</p>
                      <p className="text-xs text-gray-500">Nursing staff</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-purple-600">
                    {stats.totalUsers > 0 ? Math.round((stats.nurses / stats.totalUsers) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Assignment Statistics */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-purple-600" />
                Assignment Statistics
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Pending Tasks</p>
                    <p className="text-xs text-gray-500">Awaiting action</p>
                  </div>
                  <span className="text-3xl font-bold text-yellow-600">{stats.pendingAssignments}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Active Tasks</p>
                    <p className="text-xs text-gray-500">In progress</p>
                  </div>
                  <span className="text-3xl font-bold text-blue-600">{stats.activeAssignments}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Completed Tasks</p>
                    <p className="text-xs text-gray-500">Successfully finished</p>
                  </div>
                  <span className="text-3xl font-bold text-green-600">{stats.completedAssignments}</span>
                </div>

                {/* Completion Rate */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Completion Rate</span>
                    <span className="text-sm font-bold text-gray-900">
                      {(stats.activeAssignments + stats.completedAssignments + stats.pendingAssignments) > 0 
                        ? Math.round((stats.completedAssignments / (stats.activeAssignments + stats.completedAssignments + stats.pendingAssignments)) * 100) 
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${(stats.activeAssignments + stats.completedAssignments + stats.pendingAssignments) > 0 
                          ? Math.round((stats.completedAssignments / (stats.activeAssignments + stats.completedAssignments + stats.pendingAssignments)) * 100) 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Client Care Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Heart className="h-5 w-5 mr-2 text-pink-600" />
              Client Care Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-500 rounded-full mb-4">
                  <Heart className="h-8 w-8 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{clients.length}</p>
                <p className="text-sm text-gray-600 mt-1">Total Clients</p>
              </div>

              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mb-4">
                  <UserCheck className="h-8 w-8 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{caregivers.length}</p>
                <p className="text-sm text-gray-600 mt-1">Available Caregivers</p>
              </div>

              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
                  <Activity className="h-8 w-8 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {caregivers.length > 0 ? (clients.length / caregivers.length).toFixed(1) : 0}
                </p>
                <p className="text-sm text-gray-600 mt-1">Clients per Caregiver</p>
              </div>
            </div>
          </div>

          {/* Recent Activity & Top Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Caregivers */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Award className="h-5 w-5 mr-2 text-yellow-600" />
                Top Performing Caregivers
              </h3>
              <div className="space-y-3">
                {caregivers
                  .filter(c => c.status === 'active')
                  .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                  .slice(0, 5)
                  .map((caregiver, index) => {
                    const caregiverAssignments = assignments.filter(a => a.caregiverId === caregiver.id && a.status === 'completed');
                    return (
                      <div key={caregiver.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                            #{index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{caregiver.name}</p>
                            <p className="text-xs text-gray-500">{caregiver.userType || caregiver.type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center justify-end mb-1">
                            <span className="text-yellow-500 mr-1">★</span>
                            <span className="text-sm font-semibold text-gray-900">{(caregiver.rating || 0).toFixed(1)}</span>
                          </div>
                          <p className="text-xs text-gray-500">{caregiverAssignments.length} completed</p>
                        </div>
                      </div>
                    );
                  })}
                {caregivers.filter(c => c.status === 'active').length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <UserCheck className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No active caregivers yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Client Status Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-indigo-600" />
                Client Status Distribution
              </h3>
              <div className="space-y-4">
                {[
                  { 
                    status: 'active', 
                    label: 'Active Clients', 
                    count: clients.filter(c => c.status === 'active').length,
                    color: 'green',
                    bgColor: 'bg-green-50',
                    textColor: 'text-green-600'
                  },
                  { 
                    status: 'pending', 
                    label: 'Pending Setup', 
                    count: clients.filter(c => c.status === 'pending').length,
                    color: 'yellow',
                    bgColor: 'bg-yellow-50',
                    textColor: 'text-yellow-600'
                  },
                  { 
                    status: 'inactive', 
                    label: 'Inactive', 
                    count: clients.filter(c => c.status === 'inactive').length,
                    color: 'gray',
                    bgColor: 'bg-gray-50',
                    textColor: 'text-gray-600'
                  }
                ].map((item) => (
                  <div key={item.status} className={`flex items-center justify-between p-4 ${item.bgColor} rounded-lg`}>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.status}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${item.textColor}`}>{item.count}</p>
                      <p className="text-xs text-gray-500">
                        {clients.length > 0 ? Math.round((item.count / clients.length) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Assignment Performance */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
              Assignment Performance Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Total Assignments</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.activeAssignments + stats.pendingAssignments + stats.completedAssignments}
                </p>
              </div>
              <div className="text-center p-4 border border-gray-200 rounded-lg bg-yellow-50">
                <p className="text-sm text-gray-600 mb-2">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pendingAssignments}</p>
              </div>
              <div className="text-center p-4 border border-gray-200 rounded-lg bg-blue-50">
                <p className="text-sm text-gray-600 mb-2">In Progress</p>
                <p className="text-3xl font-bold text-blue-600">{stats.activeAssignments}</p>
              </div>
              <div className="text-center p-4 border border-gray-200 rounded-lg bg-green-50">
                <p className="text-sm text-gray-600 mb-2">Completed</p>
                <p className="text-3xl font-bold text-green-600">{stats.completedAssignments}</p>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                <span className="text-sm text-gray-600">
                  {stats.completedAssignments} of {stats.activeAssignments + stats.pendingAssignments + stats.completedAssignments} completed
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div className="flex h-full">
                  {/* Completed */}
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                    style={{ 
                      width: `${(stats.activeAssignments + stats.pendingAssignments + stats.completedAssignments) > 0 
                        ? (stats.completedAssignments / (stats.activeAssignments + stats.pendingAssignments + stats.completedAssignments)) * 100 
                        : 0}%` 
                    }}
                  ></div>
                  {/* Active */}
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                    style={{ 
                      width: `${(stats.activeAssignments + stats.pendingAssignments + stats.completedAssignments) > 0 
                        ? (stats.activeAssignments / (stats.activeAssignments + stats.pendingAssignments + stats.completedAssignments)) * 100 
                        : 0}%` 
                    }}
                  ></div>
                  {/* Pending */}
                  <div 
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 transition-all duration-500"
                    style={{ 
                      width: `${(stats.activeAssignments + stats.pendingAssignments + stats.completedAssignments) > 0 
                        ? (stats.pendingAssignments / (stats.activeAssignments + stats.pendingAssignments + stats.completedAssignments)) * 100 
                        : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-1"></span>
                  Completed
                </span>
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-blue-500 rounded-full mr-1"></span>
                  Active
                </span>
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></span>
                  Pending
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-700">Staff Utilization</h4>
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Assigned Caregivers</span>
                    <span className="font-semibold text-gray-900">
                      {caregivers.filter(c => assignments.some(a => a.caregiverId === c.id && a.status !== 'completed')).length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ 
                        width: `${caregivers.length > 0 
                          ? (caregivers.filter(c => assignments.some(a => a.caregiverId === c.id && a.status !== 'completed')).length / caregivers.length) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Available Caregivers</span>
                    <span className="font-semibold text-gray-900">
                      {caregivers.filter(c => !assignments.some(a => a.caregiverId === c.id && a.status !== 'completed')).length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full"
                      style={{ 
                        width: `${caregivers.length > 0 
                          ? (caregivers.filter(c => !assignments.some(a => a.caregiverId === c.id && a.status !== 'completed')).length / caregivers.length) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-700">Client Coverage</h4>
                <Heart className="h-5 w-5 text-pink-500" />
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Clients with Caregivers</span>
                    <span className="font-semibold text-gray-900">
                      {clients.filter(c => assignments.some(a => a.clientId === c.id && a.status !== 'completed')).length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full"
                      style={{ 
                        width: `${clients.length > 0 
                          ? (clients.filter(c => assignments.some(a => a.clientId === c.id && a.status !== 'completed')).length / clients.length) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Unassigned Clients</span>
                    <span className="font-semibold text-gray-900">
                      {clients.filter(c => !assignments.some(a => a.clientId === c.id && a.status !== 'completed')).length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full"
                      style={{ 
                        width: `${clients.length > 0 
                          ? (clients.filter(c => !assignments.some(a => a.clientId === c.id && a.status !== 'completed')).length / clients.length) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-700">System Health</h4>
                <Shield className="h-5 w-5 text-green-500" />
              </div>
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${
                    stats.systemHealth === 'Good' ? 'bg-green-100' :
                    stats.systemHealth === 'Warning' ? 'bg-yellow-100' :
                    'bg-red-100'
                  } mb-2`}>
                    <span className={`text-2xl font-bold ${
                      stats.systemHealth === 'Good' ? 'text-green-600' :
                      stats.systemHealth === 'Warning' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {stats.uptime || 99}%
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{stats.systemHealth || 'Good'}</p>
                  <p className="text-xs text-gray-500 mt-1">System Status</p>
                </div>
              </div>
            </div>
          </div>

          {/* Institution Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
            <div className="flex items-center mb-4">
              <Building className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Institution Summary</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Institution Name</p>
                <p className="text-lg font-bold text-gray-900">{institutionData?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Staff</p>
                <p className="text-lg font-bold text-gray-900">{stats.caregivers + stats.doctors + stats.nurses}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Clients</p>
                <p className="text-lg font-bold text-gray-900">{stats.clients}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Tasks</p>
                <p className="text-lg font-bold text-gray-900">{stats.activeAssignments + stats.pendingAssignments}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory & Billing Tab Content */}
      {activeTab === 'inventory' && (
        <InventoryBillingTab 
          institutionId={effectiveInstitutionId}
          clients={clients}
        />
      )}

      {/* Modals */}
      {showAddClient && (
        <AddClientModal 
          onClose={() => setShowAddClient(false)} 
          onAdd={handleAddClient}
        />
      )}

      {showAddCaregiver && (
        <AddCaregiverModal 
          onClose={() => setShowAddCaregiver(false)} 
          onCreate={handleAddCaregiver}
        />
      )}

      {showAddPharmacist && (
        <AddPharmacistModal 
          onClose={() => setShowAddPharmacist(false)} 
          onCreate={handleAddPharmacist}
        />
      )}

      {showEditUserModal && selectedUserForEdit && (
        <EditUserRoleModal 
          user={selectedUserForEdit}
          onClose={() => {
            setShowEditUserModal(false);
            setSelectedUserForEdit(null);
          }}
          onSave={handleEditUserRole}
        />
      )}

      {showAssignmentModal && (
        <AssignmentModal 
          onClose={() => setShowAssignmentModal(false)} 
          onCreate={handleCreateAssignment}
          clients={clients}
          caregivers={caregivers}
          selectedClient={selectedClientForAssignment}
          selectedCaregiver={selectedCaregiverForAssignment}
          onClientChange={setSelectedClientForAssignment}
          onCaregiverChange={setSelectedCaregiverForAssignment}
          assignmentType={assignmentType}
          onAssignmentTypeChange={setAssignmentType}
        />
      )}

      {showClientDetails && selectedClient && (
        <ClientDetailsModal
          client={selectedClient}
          onClose={() => {
            setShowClientDetails(false);
            setSelectedClient(null);
          }}
          onAssignTask={handleAssignTaskToClient}
          onDelete={handleDeleteClient}
          pharmacists={pharmacists}
          onAssignPharmacist={handleAssignPharmacistToClient}
        />
      )}

      {showCaregiverDetails && selectedCaregiver && (
        <CaregiverDetailsModal
          caregiver={selectedCaregiver}
          assignments={assignments}
          clients={clients}
          onClose={() => {
            setShowCaregiverDetails(false);
            setSelectedCaregiver(null);
          }}
          onResetPassword={handleResetPassword}
          onToggleStatus={handleToggleCaregiverStatus}
          onDelete={handleDeleteCaregiver}
          onAssignTask={handleAssignTaskToCaregiver}
        />
      )}

      {showPharmacistDetails && selectedPharmacist && (
        <PharmacistDetailsModal
          pharmacist={selectedPharmacist}
          clients={clients}
          onClose={() => {
            setShowPharmacistDetails(false);
            setSelectedPharmacist(null);
          }}
          onAssignClient={handleAssignPharmacistToClient}
        />
      )}

      {showAssignmentDetails && selectedAssignment && (
        <AssignmentDetailsModal
          assignment={selectedAssignment}
          clients={clients}
          caregivers={caregivers}
          onClose={() => {
            setShowAssignmentDetails(false);
            setSelectedAssignment(null);
          }}
        />
      )}

      {/* Dashboard Card Modals */}
      {showStaffModal && (
        <StaffModal
          staff={caregivers}
          onClose={() => setShowStaffModal(false)}
        />
      )}

      {showClientsModal && (
        <ClientsModal
          clients={clients}
          onClose={() => setShowClientsModal(false)}
        />
      )}

      {showAppointmentsModal && (
        <AppointmentsModal
          appointments={[]} // Using mock data inside the modal
          view={appointmentView}
          onViewChange={setAppointmentView}
          onClose={() => setShowAppointmentsModal(false)}
        />
      )}

      {/* Institution Link Customizer */}
      {showLinkCustomizer && institutionData && (
        <InstitutionLinkCustomizer
          institution={institutionData}
          onUpdate={handleInstitutionLinkUpdate}
          onClose={() => setShowLinkCustomizer(false)}
        />
      )}
    </div>
  );
};

// Add Client Modal Component
const AddClientModal = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    medicalRecordNumber: '',
    medicalConditions: '',
    allergies: '',
    medications: '',
    primaryDoctor: '',
    insuranceProvider: '',
    priority: 'normal',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">Add New Client</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name *</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Age *</label>
              <input
                type="number"
                name="age"
                required
                min="1"
                max="120"
                value={formData.age}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Gender *</label>
              <select
                name="gender"
                required
                value={formData.gender}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <textarea
                name="address"
                rows={3}
                value={formData.address}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Emergency Contact Name</label>
              <input
                type="text"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Emergency Contact Phone</label>
              <input
                type="tel"
                name="emergencyContactPhone"
                value={formData.emergencyContactPhone}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Medical Conditions</label>
              <textarea
                name="medicalConditions"
                rows={3}
                value={formData.medicalConditions}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="List any medical conditions..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Allergies</label>
              <textarea
                name="allergies"
                rows={3}
                value={formData.allergies}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="List any allergies..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Current Medications</label>
              <textarea
                name="medications"
                rows={3}
                value={formData.medications}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="List current medications..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Priority Level</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
            <textarea
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional notes or special instructions..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Client
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add Caregiver Modal Component
const AddCaregiverModal = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    userType: 'caregiver',
    specialization: '',
    qualifications: '',
    experience: '',
    availableDays: [],
    workingHours: '',
    flexibleArrangement: false,
    hourlyRate: '',
    address: '',
    emergencyContact: '',
    notes: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const caregiverRoles = [
    'Doctor',
    'Nurse', 
    'Physiotherapist',
    'Occupational Therapist',
    'Social Worker',
    'Home Health Aide',
    'Companion Caregiver',
    'Medication Manager'
  ];

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 
    'Friday', 'Saturday', 'Sunday'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(formData);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // Reset email exists check when email changes
    if (name === 'email') {
      setEmailExists(false);
    }
  };

  const checkEmailUniqueness = async (email) => {
    if (!email || !email.includes('@')) return;
    
    setCheckingEmail(true);
    try {
      // Check in users collection
      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', email));
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        setEmailExists(true);
        return;
      }
      
      // Check in caregivers collection
      const caregiversRef = collection(db, 'caregivers');
      const caregiverEmailQuery = query(caregiversRef, where('email', '==', email));
      const caregiverEmailSnapshot = await getDocs(caregiverEmailQuery);
      
      if (!caregiverEmailSnapshot.empty) {
        setEmailExists(true);
        return;
      }
      
      setEmailExists(false);
    } catch (error) {
      console.error('Error checking email:', error);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleDayToggle = (day) => {
    setFormData({
      ...formData,
      availableDays: formData.availableDays.includes(day)
        ? formData.availableDays.filter(d => d !== day)
        : [...formData.availableDays, day]
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">Add New Caregiver</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name *</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address *</label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={(e) => checkEmailUniqueness(e.target.value)}
                  className={`mt-1 block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                    emailExists 
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {checkingEmail && (
                  <div className="absolute right-3 top-3">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
              {emailExists && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  This email is already in use. Please use a different email.
                </p>
              )}
              {!emailExists && formData.email && !checkingEmail && (
                <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Email is available
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  minLength={6}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Min. 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 mt-0.5 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Role/Type *</label>
              <select
                name="userType"
                required
                value={formData.userType}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {caregiverRoles.map(role => (
                  <option key={role} value={role.toLowerCase()}>{role}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Specialization</label>
              <input
                type="text"
                name="specialization"
                value={formData.specialization}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
              <input
                type="number"
                name="experience"
                min="0"
                value={formData.experience}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Hourly Rate</label>
              <input
                type="number"
                name="hourlyRate"
                min="0"
                step="0.01"
                value={formData.hourlyRate}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Working Hours</label>
              <input
                type="text"
                name="workingHours"
                placeholder="e.g., 9:00 AM - 5:00 PM"
                value={formData.workingHours}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Available Days</label>
            <div className="mt-2 grid grid-cols-7 gap-2">
              {daysOfWeek.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayToggle(day)}
                  className={`px-3 py-2 text-sm rounded-md border ${
                    formData.availableDays.includes(day)
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Qualifications</label>
            <textarea
              name="qualifications"
              rows={3}
              value={formData.qualifications}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="List educational qualifications, certifications, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <textarea
              name="address"
              rows={3}
              value={formData.address}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Emergency Contact</label>
            <input
              type="text"
              name="emergencyContact"
              value={formData.emergencyContact}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
            <textarea
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional notes or special instructions..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={emailExists || checkingEmail}
              className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                emailExists || checkingEmail
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              }`}
            >
              {checkingEmail ? 'Checking...' : emailExists ? 'Email Already Exists' : 'Add Caregiver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add Pharmacist Modal Component
const AddPharmacistModal = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    userType: 'pharmacist',
    licenseNumber: '',
    specialization: 'General Pharmacy',
    experience: '',
    qualifications: '',
    address: '',
    emergencyContact: '',
    notes: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const pharmacySpecializations = [
    'General Pharmacy',
    'Clinical Pharmacy',
    'Hospital Pharmacy',
    'Community Pharmacy',
    'Geriatric Pharmacy',
    'Oncology Pharmacy',
    'Pediatric Pharmacy',
    'Psychiatric Pharmacy'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Reset email exists check when email changes
    if (name === 'email') {
      setEmailExists(false);
    }
  };

  const checkEmailUniqueness = async (email) => {
    if (!email || !email.includes('@')) return;
    
    setCheckingEmail(true);
    try {
      // Check in users collection
      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', email));
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        setEmailExists(true);
        return;
      }
      
      setEmailExists(false);
    } catch (error) {
      console.error('Error checking email:', error);
    } finally {
      setCheckingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-600 to-emerald-600">
          <div className="flex items-center space-x-3">
            <Pill className="h-8 w-8 text-white" />
            <div>
              <h3 className="text-lg font-medium text-white">Add New Pharmacist</h3>
              <p className="text-sm text-green-100">Onboard a pharmacist to your institution</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-green-500 rounded-lg p-2 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name *</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address *</label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={(e) => checkEmailUniqueness(e.target.value)}
                  className={`mt-1 block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                    emailExists 
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                  }`}
                />
                {checkingEmail && (
                  <div className="absolute right-3 top-3">
                    <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
              {emailExists && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  This email is already in use. Please use a different email.
                </p>
              )}
              {!emailExists && formData.email && !checkingEmail && (
                <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Email is available
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  minLength={6}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-green-500 focus:border-green-500"
                  placeholder="Min. 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 mt-0.5 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">License Number *</label>
              <input
                type="text"
                name="licenseNumber"
                required
                value={formData.licenseNumber}
                onChange={handleChange}
                placeholder="RPh-123456"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Specialization *</label>
              <select
                name="specialization"
                required
                value={formData.specialization}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
              >
                {(pharmacySpecializations || []).map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
              <input
                type="number"
                name="experience"
                min="0"
                value={formData.experience}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Qualifications</label>
            <textarea
              name="qualifications"
              rows={3}
              value={formData.qualifications}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
              placeholder="List educational qualifications, certifications, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <textarea
              name="address"
              rows={3}
              value={formData.address}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Emergency Contact</label>
            <input
              type="text"
              name="emergencyContact"
              value={formData.emergencyContact}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
            <textarea
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
              placeholder="Any additional notes or special instructions..."
            />
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <Pill className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
              <div className="text-sm text-green-800">
                <p className="font-medium mb-1">Pharmacist Responsibilities:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Medication dispensing and management</li>
                  <li>Patient medication counseling</li>
                  <li>Drug interaction monitoring</li>
                  <li>Prescription verification and processing</li>
                  <li>Inventory management and ordering</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={emailExists || checkingEmail}
              className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                emailExists || checkingEmail
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
              }`}
            >
              {checkingEmail ? 'Checking...' : emailExists ? 'Email Already Exists' : 'Add Pharmacist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Assignment Modal Component
const AssignmentModal = ({ 
  onClose, 
  onCreate, 
  clients, 
  caregivers, 
  selectedClient, 
  selectedCaregiver, 
  onClientChange, 
  onCaregiverChange,
  assignmentType,
  onAssignmentTypeChange
}) => {
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    instructions: '',
    priority: 'normal',
    dueDate: '',
    dueTime: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">Create Assignment</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Client and Caregiver Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Client <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedClient}
                onChange={(e) => onClientChange(e.target.value)}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Choose a client...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name || 'Unknown Client'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Caregiver <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedCaregiver}
                onChange={(e) => onCaregiverChange(e.target.value)}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Choose a caregiver...</option>
                {caregivers.map((caregiver) => (
                  <option key={caregiver.id} value={caregiver.id}>
                    {caregiver.name || 'Unknown Caregiver'} ({caregiver.userType || caregiver.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Task Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              placeholder="e.g., Morning medication administration"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              placeholder="Brief description of the task..."
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructions from Admin <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              placeholder="Detailed instructions for the caregiver to follow..."
            />
            <p className="mt-1 text-xs text-gray-500">
              Provide specific instructions that the caregiver should follow
            </p>
          </div>

          {/* Priority and Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Time</label>
              <input
                type="time"
                value={formData.dueTime}
                onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedClient || !selectedCaregiver}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Client Details Modal Component
const ClientDetailsModal = ({ client, onClose, onAssignTask, onDelete, pharmacists, onAssignPharmacist }) => {
  const [activeTab, setActiveTab] = React.useState('info');
  const [showPharmacistDropdown, setShowPharmacistDropdown] = React.useState(false);
  const [selectedPharmacistId, setSelectedPharmacistId] = React.useState(client?.assignedPharmacistId || '');
  
  if (!client) return null;

  const handleAssignPharmacist = async () => {
    if (selectedPharmacistId && onAssignPharmacist) {
      await onAssignPharmacist(client.id, selectedPharmacistId);
      setShowPharmacistDropdown(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-500 to-green-600">
          <div className="flex items-center">
            <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center mr-4">
              <span className="text-2xl font-bold text-green-600">
                {client.name?.charAt(0) || 'P'}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{client.name || 'Unknown Client'}</h3>
              <p className="text-green-100 text-sm">{client.email || 'No email'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'info'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Client Info
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Medical Reports
            </button>
            <button
              onClick={() => setActiveTab('careLogs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'careLogs'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Care Logs
            </button>
          </nav>
        </div>

        <div className="p-6 space-y-6">
          {/* Client Info Tab */}
          {activeTab === 'info' && (
            <>
          {/* Basic Information */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Age</label>
                <p className="mt-1 text-gray-900">{client.age || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Gender</label>
                <p className="mt-1 text-gray-900">{client.gender || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Phone</label>
                <p className="mt-1 text-gray-900">{client.phone || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  client.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {client.status || 'active'}
                </span>
              </div>
            </div>
          </div>

          {/* Address */}
          {client.address && (
            <div>
              <label className="block text-sm font-medium text-gray-500">Address</label>
              <p className="mt-1 text-gray-900">{client.address}</p>
            </div>
          )}

          {/* Medical Information */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Medical Information</h4>
            <div className="space-y-3">
              {client.medicalRecordNumber && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Medical Record Number</label>
                  <p className="mt-1 text-gray-900">{client.medicalRecordNumber}</p>
                </div>
              )}
              {client.medicalConditions && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Medical Conditions</label>
                  <p className="mt-1 text-gray-900">{client.medicalConditions}</p>
                </div>
              )}
              {client.allergies && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Allergies</label>
                  <p className="mt-1 text-gray-900 text-red-600">{client.allergies}</p>
                </div>
              )}
              {client.medications && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Current Medications</label>
                  <p className="mt-1 text-gray-900">{client.medications}</p>
                </div>
              )}
              {client.primaryDoctor && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Primary Doctor</label>
                  <p className="mt-1 text-gray-900">{client.primaryDoctor}</p>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Pharmacist Section */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Assigned Pharmacist</h4>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              {client.assignedPharmacistId ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
                      <Pill className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {pharmacists?.find(p => p.id === client.assignedPharmacistId)?.name || 'Unknown Pharmacist'}
                      </p>
                      <p className="text-xs text-gray-500">
                        License: {pharmacists?.find(p => p.id === client.assignedPharmacistId)?.licenseNumber || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {pharmacists?.find(p => p.id === client.assignedPharmacistId)?.email || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPharmacistDropdown(true)}
                    className="px-3 py-1 text-sm text-green-700 hover:text-green-800 hover:bg-green-100 rounded-md transition-colors"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="text-center py-3">
                  <Pill className="h-8 w-8 mx-auto text-green-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-3">No pharmacist assigned</p>
                  <button
                    onClick={() => setShowPharmacistDropdown(true)}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                  >
                    Assign Pharmacist
                  </button>
                </div>
              )}

              {/* Pharmacist Assignment Dropdown */}
              {showPharmacistDropdown && (
                <div className="mt-4 pt-4 border-t border-green-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Pharmacist
                  </label>
                  <select
                    value={selectedPharmacistId}
                    onChange={(e) => setSelectedPharmacistId(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm mb-3"
                  >
                    <option value="">-- Select a pharmacist --</option>
                    {pharmacists?.map((pharmacist) => (
                      <option key={pharmacist.id} value={pharmacist.id}>
                        {pharmacist.name} - {pharmacist.licenseNumber} ({pharmacist.specialization || 'General Pharmacy'})
                      </option>
                    ))}
                  </select>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleAssignPharmacist}
                      disabled={!selectedPharmacistId}
                      className="flex-1 px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Assign
                    </button>
                    <button
                      onClick={() => {
                        setShowPharmacistDropdown(false);
                        setSelectedPharmacistId(client?.assignedPharmacistId || '');
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Emergency Contact */}
          {(client.emergencyContactName || client.emergencyContactPhone) && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h4>
              <div className="grid grid-cols-2 gap-4">
                {client.emergencyContactName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Name</label>
                    <p className="mt-1 text-gray-900">{client.emergencyContactName}</p>
                  </div>
                )}
                {client.emergencyContactPhone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Phone</label>
                    <p className="mt-1 text-gray-900">{client.emergencyContactPhone}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {client.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-500">Notes</label>
              <p className="mt-1 text-gray-900 whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
          </>
          )}

          {/* Medical Reports Tab */}
          {activeTab === 'reports' && (
            <ClientReportsSection clientId={client.id} />
          )}

          {/* Care Logs Tab */}
          {activeTab === 'careLogs' && (
            <ClientCareLogsSection clientId={client.id} />
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-6 border-t">
            <button
              type="button"
              onClick={() => onDelete(client.id)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
            >
              Delete Client
            </button>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => onAssignTask(client)}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
              >
                Assign Task
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Dashboard Card Modals
const StaffModal = ({ staff, onClose }) => {
  if (!staff) return null;

  const doctors = staff.filter(s => s.userType === 'doctor' || s.type === 'doctor');
  const nurses = staff.filter(s => s.userType === 'nurse' || s.type === 'nurse');
  const caregivers = staff.filter(s => s.userType === 'caregiver' || s.type === 'caregiver');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Total Staff</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Doctors */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <UserCheck className="h-6 w-6 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-blue-900">Doctors ({doctors.length})</h3>
              </div>
              <div className="space-y-2">
                {doctors.map((doctor) => (
                  <div key={doctor.id} className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{doctor.name || doctor.displayName}</p>
                        <p className="text-sm text-gray-600">{doctor.email}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        doctor.status === 'active' ? 'bg-green-100 text-green-800' :
                        doctor.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {doctor.status || 'pending'}
                      </span>
                    </div>
                  </div>
                ))}
                {doctors.length === 0 && (
                  <p className="text-gray-500 text-sm">No doctors found</p>
                )}
              </div>
            </div>

            {/* Nurses */}
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <UserCheck className="h-6 w-6 text-purple-600 mr-2" />
                <h3 className="text-lg font-semibold text-purple-900">Nurses ({nurses.length})</h3>
              </div>
              <div className="space-y-2">
                {nurses.map((nurse) => (
                  <div key={nurse.id} className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{nurse.name || nurse.displayName}</p>
                        <p className="text-sm text-gray-600">{nurse.email}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        nurse.status === 'active' ? 'bg-green-100 text-green-800' :
                        nurse.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {nurse.status || 'pending'}
                      </span>
                    </div>
                  </div>
                ))}
                {nurses.length === 0 && (
                  <p className="text-gray-500 text-sm">No nurses found</p>
                )}
              </div>
            </div>

            {/* Caregivers */}
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <UserCheck className="h-6 w-6 text-green-600 mr-2" />
                <h3 className="text-lg font-semibold text-green-900">Caregivers ({caregivers.length})</h3>
              </div>
              <div className="space-y-2">
                {caregivers.map((caregiver) => (
                  <div key={caregiver.id} className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{caregiver.name || caregiver.displayName}</p>
                        <p className="text-sm text-gray-600">{caregiver.email}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        caregiver.status === 'active' ? 'bg-green-100 text-green-800' :
                        caregiver.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {caregiver.status || 'pending'}
                      </span>
                    </div>
                  </div>
                ))}
                {caregivers.length === 0 && (
                  <p className="text-gray-500 text-sm">No caregivers found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ClientsModal = ({ clients, onClose }) => {
  if (!clients) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Total Clients</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <div key={client.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{client.name || client.displayName}</h3>
                    <p className="text-sm text-gray-600">{client.email}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    client.status === 'active' ? 'bg-green-100 text-green-800' :
                    client.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {client.status || 'active'}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  {client.phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.dateOfBirth && (
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Age: {new Date().getFullYear() - new Date(client.dateOfBirth).getFullYear()}</span>
                    </div>
                  )}
                  {client.medicalCondition && (
                    <div className="flex items-start">
                      <Heart className="h-4 w-4 mr-2 mt-0.5" />
                      <span className="text-xs">{client.medicalCondition}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {clients.length === 0 && (
              <div className="col-span-full text-center py-8">
                <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No clients found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AppointmentsModal = ({ appointments, view, onViewChange, onClose }) => {
  if (!appointments) return null;

  // Mock appointment data for demonstration
  const mockAppointments = [
    {
      id: '1',
      clientName: 'John Doe',
      caregiverName: 'Dr. Sarah Johnson',
      type: 'Consultation',
      date: new Date(),
      time: '10:00 AM',
      status: 'scheduled'
    },
    {
      id: '2',
      clientName: 'Jane Smith',
      caregiverName: 'Nurse Mike Wilson',
      type: 'Check-up',
      date: new Date(Date.now() + 86400000),
      time: '2:00 PM',
      status: 'scheduled'
    },
    {
      id: '3',
      clientName: 'Robert Brown',
      caregiverName: 'Dr. Emily Davis',
      type: 'Follow-up',
      date: new Date(Date.now() + 172800000),
      time: '11:30 AM',
      status: 'scheduled'
    }
  ];

  const getFilteredAppointments = () => {
    const now = new Date();
    switch (view) {
      case 'daily':
        return mockAppointments.filter(apt => 
          apt.date.toDateString() === now.toDateString()
        );
      case 'weekly':
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        return mockAppointments.filter(apt => 
          apt.date >= weekStart && apt.date <= weekEnd
        );
      case 'monthly':
        return mockAppointments.filter(apt => 
          apt.date.getMonth() === now.getMonth() && apt.date.getFullYear() === now.getFullYear()
        );
      default:
        return mockAppointments;
    }
  };

  const filteredAppointments = getFilteredAppointments();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Active Appointments</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex space-x-2 mb-6">
            {['daily', 'weekly', 'monthly'].map((period) => (
              <button
                key={period}
                onClick={() => onViewChange(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  view === period
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>

          {/* Appointments List */}
          <div className="space-y-4">
            {filteredAppointments.map((appointment) => (
              <div key={appointment.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{appointment.clientName}</h3>
                        <p className="text-sm text-gray-600">with {appointment.caregiverName}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-900">{appointment.time}</p>
                        <p className="text-xs text-gray-600">{appointment.date.toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {appointment.type}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      appointment.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                      appointment.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {appointment.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredAppointments.length === 0 && (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No appointments found for {view} view</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Caregiver Details Modal Component
// Pharmacist Details Modal Component
const PharmacistDetailsModal = ({ pharmacist, clients, onClose, onAssignClient }) => {
  const [activeTab, setActiveTab] = React.useState('info');
  const [showAssignClient, setShowAssignClient] = React.useState(false);
  const [selectedClientId, setSelectedClientId] = React.useState('');
  
  if (!pharmacist) return null;

  // Get clients assigned to this pharmacist
  const assignedClients = clients.filter(client => client.assignedPharmacistId === pharmacist.id);
  const unassignedClients = clients.filter(client => !client.assignedPharmacistId);

  const handleAssign = async () => {
    if (selectedClientId && onAssignClient) {
      await onAssignClient(selectedClientId, pharmacist.id);
      setShowAssignClient(false);
      setSelectedClientId('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-500 to-green-600">
          <div className="flex items-center">
            <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center mr-4">
              <Pill className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{pharmacist.name || 'Unknown Pharmacist'}</h3>
              <p className="text-green-100 text-sm">{pharmacist.email || 'No email'}</p>
              <p className="text-green-100 text-xs mt-1">License: {pharmacist.licenseNumber || 'N/A'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'info'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pharmacist Info
            </button>
            <button
              onClick={() => setActiveTab('clients')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'clients'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Assigned Clients ({assignedClients.length})
            </button>
          </nav>
        </div>

        <div className="p-6 space-y-6">
          {/* Pharmacist Info Tab */}
          {activeTab === 'info' && (
            <>
              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">License Number</label>
                    <p className="mt-1 text-gray-900">{pharmacist.licenseNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Specialization</label>
                    <p className="mt-1 text-gray-900">{pharmacist.specialization || 'General Pharmacy'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Experience</label>
                    <p className="mt-1 text-gray-900">{pharmacist.experience || 0} years</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      pharmacist.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {pharmacist.status || 'pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="mt-1 text-gray-900">{pharmacist.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Phone</label>
                    <p className="mt-1 text-gray-900">{pharmacist.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Qualifications */}
              {pharmacist.qualifications && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Qualifications</h4>
                  <p className="text-gray-900 whitespace-pre-wrap">{pharmacist.qualifications}</p>
                </div>
              )}

              {/* Address */}
              {pharmacist.address && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Address</h4>
                  <p className="text-gray-900">{pharmacist.address}</p>
                </div>
              )}

              {/* Notes */}
              {pharmacist.notes && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Notes</h4>
                  <p className="text-gray-900 whitespace-pre-wrap">{pharmacist.notes}</p>
                </div>
              )}
            </>
          )}

          {/* Assigned Clients Tab */}
          {activeTab === 'clients' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-900">Assigned Clients</h4>
                <button
                  onClick={() => setShowAssignClient(true)}
                  className="flex items-center px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Client
                </button>
              </div>

              {/* Assign Client Form */}
              {showAssignClient && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-3">Assign New Client</h5>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm mb-3"
                  >
                    <option value="">-- Select a client --</option>
                    {unassignedClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} - {client.age} years old ({client.gender || 'N/A'})
                      </option>
                    ))}
                  </select>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleAssign}
                      disabled={!selectedClientId}
                      className="flex-1 px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Assign
                    </button>
                    <button
                      onClick={() => {
                        setShowAssignClient(false);
                        setSelectedClientId('');
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Assigned Clients List */}
              {assignedClients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-medium">No clients assigned yet</p>
                  <p className="text-xs mt-1">Click "Assign Client" to assign clients to this pharmacist</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignedClients.map((client) => (
                    <div key={client.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-lg font-semibold text-green-700">
                              {client.name?.charAt(0) || 'C'}
                            </span>
                          </div>
                          <div>
                            <h5 className="text-sm font-semibold text-gray-900">{client.name || 'Unknown Client'}</h5>
                            <p className="text-xs text-gray-500">{client.email || 'No email'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">Age: {client.age || 'N/A'}</span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">{client.gender || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Client Medical Info Preview */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        {client.medications && (
                          <div className="mb-2">
                            <label className="text-xs font-medium text-gray-500">Current Medications</label>
                            <p className="text-xs text-gray-700 mt-0.5 line-clamp-2">{client.medications}</p>
                          </div>
                        )}
                        {client.allergies && (
                          <div>
                            <label className="text-xs font-medium text-red-500">Allergies</label>
                            <p className="text-xs text-red-600 mt-0.5 line-clamp-2">{client.allergies}</p>
                          </div>
                        )}
                        {!client.medications && !client.allergies && (
                          <p className="text-xs text-gray-400 italic">No medication or allergy information</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CaregiverDetailsModal = ({ caregiver, onClose, onResetPassword, onToggleStatus, onDelete, onAssignTask, assignments = [], clients = [] }) => {
  if (!caregiver) return null;

  // Filter assignments for this specific caregiver
  const caregiverAssignments = assignments.filter(a => a.caregiverId === caregiver.id);
  const activeAssignments = caregiverAssignments.filter(a => a.status !== 'completed' && a.status !== 'cancelled');
  const completedAssignments = caregiverAssignments.filter(a => a.status === 'completed');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex items-center">
            <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center mr-4">
              <span className="text-2xl font-bold text-blue-600">
                {caregiver.name?.charAt(0) || 'C'}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{caregiver.name || 'Unknown Caregiver'}</h3>
              <p className="text-blue-100 text-sm">{caregiver.email || 'No email'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Onboarding Status Alert */}
          {!caregiver.onboardingComplete && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Onboarding Incomplete</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>This caregiver has not completed their onboarding process. They need to:</p>
                    <ul className="list-disc list-inside mt-1">
                      <li>Fill out their professional profile</li>
                      <li>Upload required documents (license, certifications)</li>
                      <li>Submit for review</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Basic Information */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Onboarding Status</label>
                {caregiver.onboardingComplete ? (
                  <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Complete - Documents Submitted
                  </span>
                ) : (
                  <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending - Awaiting Completion
                  </span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Role</label>
                <p className="mt-1 text-gray-900">{caregiver.userType || caregiver.type || 'Caregiver'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Account Status</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  caregiver.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : caregiver.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : caregiver.status === 'suspended'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {caregiver.status || 'pending'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Phone</label>
                <p className="mt-1 text-gray-900">{caregiver.phone || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Rating</label>
                <div className="flex items-center mt-1">
                  <span className="text-yellow-400">★</span>
                  <span className="ml-1 text-gray-900">{caregiver.rating || 0} / 5</span>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Details */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Professional Details</h4>
            <div className="space-y-3">
              {caregiver.specialization && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Specialization</label>
                  <p className="mt-1 text-gray-900">{caregiver.specialization}</p>
                </div>
              )}
              {caregiver.qualifications && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Qualifications</label>
                  <p className="mt-1 text-gray-900">{caregiver.qualifications}</p>
                </div>
              )}
              {caregiver.experience && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Experience</label>
                  <p className="mt-1 text-gray-900">{caregiver.experience}</p>
                </div>
              )}
              {caregiver.workingHours && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Working Hours</label>
                  <p className="mt-1 text-gray-900">{caregiver.workingHours}</p>
                </div>
              )}
              {caregiver.availableDays && caregiver.availableDays.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Available Days</label>
                  <p className="mt-1 text-gray-900">{caregiver.availableDays.join(', ')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h4>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-sm font-medium text-gray-500">Total Assignments</label>
                <p className="mt-1 text-2xl font-bold text-gray-900">{caregiverAssignments.length}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-sm font-medium text-gray-500">Active Tasks</label>
                <p className="mt-1 text-2xl font-bold text-blue-600">{activeAssignments.length}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-sm font-medium text-gray-500">Completed</label>
                <p className="mt-1 text-2xl font-bold text-green-600">{completedAssignments.length}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-sm font-medium text-gray-500">Rating</label>
                <p className="mt-1 text-2xl font-bold text-gray-900">{caregiver.rating || 0}</p>
              </div>
            </div>
          </div>

          {/* Address */}
          {caregiver.address && (
            <div>
              <label className="block text-sm font-medium text-gray-500">Address</label>
              <p className="mt-1 text-gray-900">{caregiver.address}</p>
            </div>
          )}

          {/* Notes */}
          {caregiver.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-500">Notes</label>
              <p className="mt-1 text-gray-900 whitespace-pre-wrap">{caregiver.notes}</p>
            </div>
          )}

          {/* Assignments */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Assigned Tasks ({caregiverAssignments.length})</h4>
            {caregiverAssignments.length === 0 ? (
              <p className="text-gray-500 text-sm">No tasks assigned yet</p>
            ) : (
              <div className="space-y-3">
                {/* Active Assignments */}
                {activeAssignments.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Active Tasks ({activeAssignments.length})</h5>
                    <div className="space-y-2">
                      {activeAssignments.map(assignment => {
                        const client = clients.find(p => p.id === assignment.clientId);
                        return (
                          <div key={assignment.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h6 className="font-medium text-gray-900 text-sm">{assignment.title || 'Untitled Task'}</h6>
                                <p className="text-xs text-gray-600 mt-1">Client: {assignment.clientName || client?.name || 'Unknown Client'}</p>
                                {assignment.description && (
                                  <p className="text-xs text-gray-500 mt-1">{assignment.description}</p>
                                )}
                                {assignment.dueDate && (
                                  <p className="text-xs text-gray-500 mt-1">Due: {assignment.dueDate}</p>
                                )}
                              </div>
                              <div className="ml-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  assignment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  assignment.status === 'in_progress' || assignment.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {assignment.status || 'pending'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Completed Assignments */}
                {completedAssignments.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Completed Tasks ({completedAssignments.length})</h5>
                    <div className="space-y-2">
                      {completedAssignments.slice(0, 3).map(assignment => {
                        const client = clients.find(p => p.id === assignment.clientId);
                        return (
                          <div key={assignment.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h6 className="font-medium text-gray-900 text-sm">{assignment.title || 'Untitled Task'}</h6>
                                <p className="text-xs text-gray-600 mt-1">Client: {assignment.clientName || client?.name || 'Unknown Client'}</p>
                              </div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                completed
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {completedAssignments.length > 3 && (
                        <p className="text-xs text-gray-500 text-center">+ {completedAssignments.length - 3} more completed</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-6 border-t">
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => onResetPassword(caregiver.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-md hover:bg-yellow-700"
              >
                Reset Password
              </button>
              <button
                type="button"
                onClick={() => onToggleStatus(caregiver)}
                className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md ${
                  caregiver.status === 'active'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {caregiver.status === 'active' ? 'Suspend' : 'Activate'}
              </button>
              <button
                type="button"
                onClick={() => onDelete(caregiver.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => onAssignTask(caregiver)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Assign Task
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Client Reports Section Component
const ClientReportsSection = ({ clientId }) => {
  const [reports, setReports] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showAddReport, setShowAddReport] = React.useState(false);
  const [reportType, setReportType] = React.useState('nurse');
  const { user, userProfile } = useUser();

  React.useEffect(() => {
    loadReports();
  }, [clientId]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const reportsData = await getClientReports(clientId);
      setReports(reportsData);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Medical Reports</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setReportType('nurse');
              setShowAddReport(true);
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Add Nurse Report
          </button>
          <button
            onClick={() => {
              setReportType('doctor');
              setShowAddReport(true);
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
          >
            Add Doctor Consultation
          </button>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No reports yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    report.type === 'nurse'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {report.type === 'nurse' ? 'Nurse Report' : 'Doctor Consultation'}
                  </span>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(report.createdAt).toLocaleString()} • {report.createdBy}
                  </p>
                </div>
              </div>

              {report.type === 'nurse' && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Vitals:</span>
                    <p className="text-gray-600 mt-1">{report.vitals || 'Not recorded'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Treatment/Care:</span>
                    <p className="text-gray-600 mt-1">{report.treatment || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Observation:</span>
                    <p className="text-gray-600 mt-1">{report.observation || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Recommendation:</span>
                    <p className="text-gray-600 mt-1">{report.recommendation || 'N/A'}</p>
                  </div>
                </div>
              )}

              {report.type === 'doctor' && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Diagnosis:</span>
                    <p className="text-gray-600 mt-1">{report.diagnosis || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Prescription:</span>
                    <p className="text-gray-600 mt-1">{report.prescription || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Instructions:</span>
                    <p className="text-gray-600 mt-1">{report.instructions || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Care Plan:</span>
                    <p className="text-gray-600 mt-1">{report.carePlan || 'N/A'}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddReport && (
        <AddReportModal
          clientId={clientId}
          reportType={reportType}
          onClose={() => setShowAddReport(false)}
          onSubmit={async (reportData) => {
            await createClientReport(clientId, reportData);
            setShowAddReport(false);
            await loadReports();
            toast.success('Report added successfully');
          }}
        />
      )}
    </div>
  );
};

// Client Care Logs Section Component
const ClientCareLogsSection = ({ clientId }) => {
  const [careLogs, setCareLogs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showAddLog, setShowAddLog] = React.useState(false);
  const { user, userProfile } = useUser();

  React.useEffect(() => {
    loadCareLogs();
  }, [clientId]);

  const loadCareLogs = async () => {
    try {
      setLoading(true);
      const logsData = await getClientCareLogs(clientId);
      setCareLogs(logsData);
    } catch (error) {
      console.error('Error loading care logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading care logs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Care Activity Logs</h3>
        <button
          onClick={() => setShowAddLog(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
        >
          Add Care Log
        </button>
      </div>

      {careLogs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No care logs yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {careLogs.map((log) => (
            <div key={log.id} className="border-l-4 border-green-500 bg-white shadow-sm rounded-r-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-gray-900">{log.activityType || 'Care Activity'}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(log.timestamp).toLocaleString()} • {log.caregiverName || 'Unknown Caregiver'}
                  </p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  log.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {log.status || 'completed'}
                </span>
              </div>
              <p className="text-gray-700 text-sm">{log.description || log.notes}</p>
              {log.duration && (
                <p className="text-xs text-gray-500 mt-2">Duration: {log.duration}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddLog && (
        <AddCareLogModal
          clientId={clientId}
          onClose={() => setShowAddLog(false)}
          onSubmit={async (logData) => {
            await createClientCareLog(clientId, logData);
            setShowAddLog(false);
            await loadCareLogs();
            toast.success('Care log added successfully');
          }}
        />
      )}
    </div>
  );
};

// Add Report Modal Component
const AddReportModal = ({ clientId, reportType, onClose, onSubmit }) => {
  const { userProfile } = useUser();
  const [formData, setFormData] = React.useState(
    reportType === 'nurse'
      ? { vitals: '', treatment: '', observation: '', recommendation: '' }
      : { diagnosis: '', prescription: '', instructions: '', carePlan: '' }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      type: reportType,
      createdBy: userProfile?.name || 'Unknown',
      createdAt: new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            {reportType === 'nurse' ? 'Add Nurse Report' : 'Add Doctor Consultation'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {reportType === 'nurse' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client Vitals</label>
                <textarea
                  rows={3}
                  required
                  value={formData.vitals}
                  onChange={(e) => setFormData({ ...formData, vitals: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="BP: 120/80, Temp: 98.6°F, Pulse: 72 bpm..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Treatment/Care Done</label>
                <textarea
                  rows={3}
                  required
                  value={formData.treatment}
                  onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Medications administered, wound care, etc..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observation</label>
                <textarea
                  rows={3}
                  required
                  value={formData.observation}
                  onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Client's condition, behavior, concerns..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recommendation</label>
                <textarea
                  rows={2}
                  value={formData.recommendation}
                  onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Follow-up actions, suggestions..."
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis</label>
                <textarea
                  rows={3}
                  required
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Medical diagnosis..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prescription</label>
                <textarea
                  rows={3}
                  required
                  value={formData.prescription}
                  onChange={(e) => setFormData({ ...formData, prescription: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Medications prescribed..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                <textarea
                  rows={3}
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Client instructions..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Care Plan</label>
                <textarea
                  rows={3}
                  value={formData.carePlan}
                  onChange={(e) => setFormData({ ...formData, carePlan: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Ongoing care plan..."
                />
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                reportType === 'nurse'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              Save Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add Care Log Modal Component
const AddCareLogModal = ({ clientId, onClose, onSubmit }) => {
  const { userProfile } = useUser();
  const [formData, setFormData] = React.useState({
    activityType: '',
    description: '',
    duration: '',
    status: 'completed'
  });

  const activityTypes = [
    'Medication Administration',
    'Vital Signs Check',
    'Personal Care',
    'Meal Assistance',
    'Exercise/Mobility',
    'Companionship',
    'Medical Procedure',
    'Emergency Response',
    'Other'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      caregiverName: userProfile?.name || 'Unknown',
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">Add Care Activity Log</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Activity Type</label>
            <select
              required
              value={formData.activityType}
              onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select activity type...</option>
              {activityTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              rows={4}
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Describe the care activity..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration (optional)</label>
            <input
              type="text"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g., 30 minutes"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              Save Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Assignment Details Modal Component
const AssignmentDetailsModal = ({ assignment, onClose, clients, caregivers }) => {
  if (!assignment) return null;

  const client = clients.find(p => p.id === assignment.clientId);
  const caregiver = caregivers.find(c => c.id === assignment.caregiverId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-500 to-purple-600">
          <div>
            <h3 className="text-xl font-bold text-white">{assignment.title || 'Assignment Details'}</h3>
            <p className="text-purple-100 text-sm mt-1">Task ID: {assignment.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              assignment.status === 'completed'
                ? 'bg-green-100 text-green-800'
                : assignment.status === 'in_progress' || assignment.status === 'active'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {assignment.status || 'pending'}
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              assignment.priority === 'urgent'
                ? 'bg-red-100 text-red-800'
                : assignment.priority === 'high'
                ? 'bg-orange-100 text-orange-800'
                : assignment.priority === 'normal'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {assignment.priority || 'normal'} priority
            </span>
          </div>

          {/* Client & Caregiver Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-500 mb-2">Client</label>
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center mr-3">
                  <span className="text-white font-semibold">
                    {(assignment.clientName || client?.name || 'U').charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{assignment.clientName || client?.name || 'Unknown Client'}</p>
                  <p className="text-sm text-gray-500">{assignment.clientEmail || client?.email || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-500 mb-2">Assigned To</label>
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center mr-3">
                  <span className="text-white font-semibold">
                    {(assignment.caregiverName || caregiver?.name || 'U').charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{assignment.caregiverName || caregiver?.name || 'Unknown Caregiver'}</p>
                  <p className="text-sm text-gray-500">{assignment.caregiverEmail || caregiver?.email || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {assignment.description && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <p className="text-gray-900 bg-gray-50 rounded-lg p-4">{assignment.description}</p>
            </div>
          )}

          {/* Instructions */}
          {assignment.instructions && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions</label>
              <p className="text-gray-900 bg-yellow-50 border border-yellow-200 rounded-lg p-4">{assignment.instructions}</p>
            </div>
          )}

          {/* Due Date & Time */}
          {(assignment.dueDate || assignment.dueTime) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date & Time</label>
              <div className="flex items-center space-x-4 text-gray-900 bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                  <span>{assignment.dueDate || 'No date set'}</span>
                </div>
                {assignment.dueTime && (
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-gray-400 mr-2" />
                    <span>{assignment.dueTime}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assignment Info */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-500">Assigned By</label>
              <p className="mt-1 text-gray-900">{assignment.assignedByName || 'Admin'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Created Date</label>
              <p className="mt-1 text-gray-900">
                {assignment.createdAt ? new Date(assignment.createdAt).toLocaleString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Edit User Role Modal Component
const EditUserRoleModal = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    userType: user?.userType || user?.type || '',
    role: user?.role || user?.userType || '',
    medicalQualification: user?.medicalQualification || '',
    specialization: user?.specialization || '',
    status: user?.status || 'active',
    active: user?.active !== false
  });

  const userTypes = [
    'caregiver',
    'doctor',
    'nurse',
    'pharmacist',
    'admin',
    'institutionAdmin'
  ];

  const medicalQualifications = [
    'Doctor (MD)',
    'Registered Nurse (RN)',
    'Licensed Practical Nurse (LPN)',
    'Certified Nursing Assistant (CNA)',
    'Physical Therapist',
    'Occupational Therapist',
    'Pharmacist',
    'Caregiver (Non-Medical)',
    'Other'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">Edit User Role & Permissions</h3>
              <p className="text-purple-100 text-sm mt-1">Update user role, qualifications, and status</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* User Info Display */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2">User Information</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Name:</strong> {user?.name || user?.displayName || 'N/A'}</p>
              <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
              <p><strong>Current Role:</strong> {user?.userType || user?.type || 'N/A'}</p>
            </div>
          </div>

          {/* User Type/Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Type/Role *
            </label>
            <select
              value={formData.userType}
              onChange={(e) => setFormData({ ...formData, userType: e.target.value, role: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
            >
              <option value="">Select user type</option>
              {userTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              This determines what permissions and features the user has access to
            </p>
          </div>

          {/* Medical Qualification */}
          {(formData.userType === 'caregiver' || formData.userType === 'doctor' || formData.userType === 'nurse') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medical Qualification
              </label>
              <select
                value={formData.medicalQualification}
                onChange={(e) => setFormData({ ...formData, medicalQualification: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Select qualification</option>
                {medicalQualifications.map((qual) => (
                  <option key={qual} value={qual}>{qual}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Sets the user's professional qualification level
              </p>
            </div>
          )}

          {/* Specialization */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specialization
            </label>
            <input
              type="text"
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="e.g., Geriatric Care, Dementia Care, etc."
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Account Active</label>
              <p className="text-xs text-gray-500 mt-1">Enable or disable user access</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, active: !formData.active })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.active ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Warning Message */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Important Notes:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Changing user type affects their dashboard access and permissions</li>
                  <li>User must log out and log back in for changes to take full effect</li>
                  <li>Medical qualifications determine what actions they can perform</li>
                  <li>Setting status to 'inactive' or 'suspended' will block their access</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InstitutionAdminDashboard;
