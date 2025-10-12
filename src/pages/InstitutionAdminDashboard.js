import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useUser } from '../contexts/UserContext';
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
  Trash2
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
import { toast } from 'react-toastify';

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
  const [assignments, setAssignments] = useState([]);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddCaregiver, setShowAddCaregiver] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentType, setAssignmentType] = useState('client-to-caregiver');
  const [selectedClientForAssignment, setSelectedClientForAssignment] = useState('');
  const [selectedCaregiverForAssignment, setSelectedCaregiverForAssignment] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // View Details Modal States
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [showCaregiverDetails, setShowCaregiverDetails] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedCaregiver, setSelectedCaregiver] = useState(null);

  // Dashboard Card Modal States
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showClientsModal, setShowClientsModal] = useState(false);
  const [showAppointmentsModal, setShowAppointmentsModal] = useState(false);
  const [appointmentView, setAppointmentView] = useState('daily'); // daily, weekly, monthly
  
  // Institution Link Customization
  const [showLinkCustomizer, setShowLinkCustomizer] = useState(false);
  const [institutionData, setInstitutionData] = useState(null);

  useEffect(() => {
    if (userProfile && institutionId) {
      loadDashboardData();
      loadInstitutionData();
    }
  }, [userProfile, institutionId]);
  
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
      
      // Show loading state immediately but don't block rendering
      setLoading(true);
      
      // Set default stats first so UI renders faster
      setStats({
        totalUsers: 0,
        clients: 0,
        caregivers: 0,
        doctors: 0,
        nurses: 0,
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
      setLoading(false);
      
      // Load real data from backend APIs (filtered by institution) - in background
      const [analytics, users, emergencies, caregiversData, clientsData, assignmentsData] = await Promise.all([
        analyticsAPI.getOverviewAnalytics().catch(err => {
          console.warn('Failed to fetch analytics:', err);
          return {};
        }),
        getAllUsers().catch(err => {
          console.warn('Failed to fetch users:', err);
          return [];
        }),
        emergencyAPI.getEmergencyHistory({ status: 'active', limit: 10 }).catch(err => {
          console.warn('Failed to fetch emergencies:', err);
          return [];
        }),
        caregiverAPI.getCaregivers({ institutionId: instId, limit: 50 }).catch(err => {
          console.warn('Failed to fetch caregivers:', err);
          return [];
        }),
        getAllClients(instId).catch(err => {
          console.warn('Failed to fetch clients:', err);
          return [];
        }),
        assignmentAPI.getAssignmentsByInstitution(instId).catch(err => {
          console.warn('Failed to fetch assignments:', err);
          return [];
        })
      ]);

      // Filter by institution if institutionId is available
      console.log('\n🔍 FILTERING BY INSTITUTION ID:', instId);
      console.log('Before filtering - caregivers:', caregiversData.length);
      console.log('Before filtering - users:', users.length);
      
      const institutionUsers = instId 
        ? users.filter(u => u.institutionId === instId)
        : users;

      const institutionCaregivers = instId 
        ? caregiversData.filter(c => c.institutionId === instId)
        : caregiversData;

      const institutionClients = instId 
        ? clientsData.filter(p => p.institutionId === instId)
        : clientsData;
        
      console.log('After filtering - institutionCaregivers:', institutionCaregivers.length);
      console.log('After filtering - institutionUsers:', institutionUsers.length);
      
      // Debug: Check if there are caregivers with mismatched institutionIds
      if (instId && caregiversData.length > institutionCaregivers.length) {
        console.warn('⚠️ Some caregivers were filtered out! Checking institutionIds:');
        caregiversData.forEach(c => {
          if (c.institutionId !== instId) {
            console.warn(`Caregiver "${c.name}" (${c.id}) has institutionId: "${c.institutionId}" but expected: "${instId}"`);
          }
        });
      }

      // Also get caregivers from users collection (for those created via Add Caregiver button)
      const caregiversFromUsers = institutionUsers.filter(u => 
        u.userType === 'caregiver' || u.userType === 'nurse' || u.userType === 'doctor' ||
        u.type === 'caregiver' || u.type === 'nurse' || u.type === 'doctor'
      );
      
      // Merge caregivers from both sources (deduplicate by id)
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

      console.log('📊 Dashboard Data Loaded:');
      console.log('- Institution ID:', instId);
      console.log('- Total users:', institutionUsers.length);
      console.log('- Caregivers from caregivers collection:', institutionCaregivers.length);
      console.log('- Caregivers from users collection:', caregiversFromUsers.length);
      console.log('- Total merged caregivers:', allInstitutionCaregivers.length);
      console.log('- Clients:', institutionClients.length);
      console.log('- Assignments:', assignmentsData.length);
      
      // Debug: Show raw caregiver data
      console.log('\n🔍 RAW CAREGIVER DATA DEBUG:');
      console.log('Raw caregivers from API:', caregiversData.length, caregiversData);
      console.log('Users with caregiver types:', caregiversFromUsers.length, caregiversFromUsers);
      console.log('Merged caregivers:', allInstitutionCaregivers.length, allInstitutionCaregivers);
      
      // Debug: Show assignment data
      console.log('\n🔍 ASSIGNMENT DATA DEBUG:');
      console.log('Assignments loaded:', assignmentsData.length, assignmentsData);

      // Calculate assignment statistics
      const activeAssignmentCount = assignmentsData.filter(a => 
        a.status !== 'completed' && a.status !== 'cancelled'
      ).length;
      const pendingAssignmentCount = assignmentsData.filter(a => 
        a.status === 'pending'
      ).length;
      const completedAssignmentCount = assignmentsData.filter(a => 
        a.status === 'completed'
      ).length;

      // Use real data only - no fallback to demo data
      const realStats = {
        totalUsers: institutionUsers.length,
        clients: institutionClients.length,
        caregivers: allInstitutionCaregivers.filter(c => c.userType === 'caregiver' || c.type === 'caregiver').length,
        doctors: allInstitutionCaregivers.filter(c => c.userType === 'doctor' || c.type === 'doctor').length,
        nurses: allInstitutionCaregivers.filter(c => c.userType === 'nurse' || c.type === 'nurse').length,
        activeAppointments: analytics.totalAppointments || 0,
        activeAssignments: activeAssignmentCount,
        pendingAssignments: pendingAssignmentCount,
        completedAssignments: completedAssignmentCount,
        emergencyAlerts: emergencies.length,
        medicationReminders: analytics.medicationCompliance || 0,
        systemHealth: analytics.systemUptime > 95 ? 'Good' : analytics.systemUptime > 90 ? 'Warning' : 'Critical',
        satisfaction: analytics.caregiverSatisfaction || 0,
        responseTime: analytics.averageResponseTime || 0,
        uptime: analytics.systemUptime || 0
      };

      setStats(realStats);
      setClients(institutionClients);
      setCaregivers(allInstitutionCaregivers);
      setAssignments(assignmentsData || []);

      // Use real activity data from the system
      setRecentActivity(analytics.recentActivity || []);
      setTopCaregivers(allInstitutionCaregivers.slice(0, 3).map(caregiver => ({
        id: caregiver.id,
        name: caregiver.displayName || caregiver.name || 'Unknown Caregiver',
        rating: caregiver.rating || 0,
        clientsServed: caregiver.clientsServed || 0,
        tasksCompleted: caregiver.tasksCompleted || 0,
        responseTime: caregiver.responseTime || 0,
        avatar: caregiver.photoURL || null
      })));
      setSystemAlerts(analytics.systemAlerts || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast.success('Dashboard data refreshed');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
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
      
      // Check for duplicate email in users collection
      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', caregiverData.email));
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        toast.error('A user with this email already exists. Please use a different email.');
        return;
      }
      
      // Check for duplicate email in caregivers collection
      const caregiversRef = collection(db, 'caregivers');
      const caregiverEmailQuery = query(caregiversRef, where('email', '==', caregiverData.email));
      const caregiverEmailSnapshot = await getDocs(caregiverEmailQuery);
      
      if (!caregiverEmailSnapshot.empty) {
        toast.error('A caregiver with this email already exists. Please use a different email.');
        return;
      }
      
      console.log('✅ Email is unique, proceeding with caregiver creation');
      
      // Generate a unique ID for the caregiver
      const caregiverId = `caregiver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create caregiver document
      await setDoc(doc(db, 'caregivers', caregiverId), {
        ...caregiverData,
        institutionId: instId,
        status: 'pending',
        rating: 0,
        totalClients: 0,
        currentClients: 0,
        performance: {
          punctuality: 0,
          clientSatisfaction: 0,
          taskCompletion: 0,
          communication: 0,
          safety: 0
        },
        earnings: {
          thisMonth: 0,
          lastMonth: 0,
          total: 0
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Create user document for login (with email/password stored)
      // IMPORTANT: Always set userType to 'caregiver' for institution caregivers
      await setDoc(doc(db, 'users', caregiverId), {
        email: caregiverData.email,
        name: caregiverData.name,
        phone: caregiverData.phone || '',
        userType: 'caregiver', // Force caregiver type
        type: 'caregiver', // Also set type field for consistency
        institutionId: instId,
        status: 'pending',
        onboardingComplete: false,
        password: caregiverData.password, // Store for custom auth
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userProfile?.id || user?.uid
      });
      
      console.log('✅ Caregiver created with ID:', caregiverId);
      
      setShowAddCaregiver(false);
      toast.success('Caregiver added successfully! They can now login with their credentials.');
      
      // Reload dashboard data to get the newly created caregiver
      await loadDashboardData();
    } catch (error) {
      console.error('Error adding caregiver:', error);
      toast.error(error.message || 'Failed to add caregiver');
    }
  };

  // Assignment Functions
  const handleCreateAssignment = async (formData) => {
    try {
      const assignmentData = {
        clientId: selectedClientForAssignment,
        caregiverId: selectedCaregiverForAssignment,
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
      
      // Get client and caregiver details for notification
      const client = clients.find(p => p.id === selectedClientForAssignment);
      const caregiver = caregivers.find(c => c.id === selectedCaregiverForAssignment);
      
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
      name: 'View Analytics',
      icon: BarChart3,
      color: 'bg-orange-600 hover:bg-orange-700',
      action: () => navigate('/admin/analytics')
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
              { id: 'assignments', name: 'Assignments', icon: Users }
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
            onClick={() => navigate('/admin/analytics')}
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
                            {client?.name || 'Unknown Client'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {caregiver?.name || 'Unknown Caregiver'}
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
                                // Show assignment details
                                alert(`Instructions: ${assignment.instructions || 'No instructions provided'}`);
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
const ClientDetailsModal = ({ client, onClose, onAssignTask, onDelete }) => {
  const [activeTab, setActiveTab] = React.useState('info');
  
  if (!client) return null;

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
                                <p className="text-xs text-gray-600 mt-1">Client: {client?.name || 'Unknown Client'}</p>
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
                                <p className="text-xs text-gray-600 mt-1">Client: {client?.name || 'Unknown Client'}</p>
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

export default InstitutionAdminDashboard;
