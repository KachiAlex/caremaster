import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  MessageSquare, 
  CheckCircle, 
  AlertTriangle,
  Heart,
  User,
  Star,
  Navigation,
  Camera,
  FileText,
  Bell,
  Settings,
  LogOut,
  TrendingUp,
  Award,
  Activity,
  Shield,
  Plus,
  Eye,
  Edit,
  Stethoscope,
  Pill,
  Brain,
  FlaskConical,
  Dumbbell,
  UserCheck,
  Home,
  Users,
  CheckSquare,
  ClipboardList,
  BarChart3,
  RefreshCw,
  AlertCircle,
  X,
  Mail
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { caregiverAPI } from '../api/caregiverAPI';
import { getCareTasksByCaregiver, getTodayTasks, getUpcomingTasks } from '../api/careTasksAPI';
import { getTodaysAppointments, getUpcomingAppointments } from '../api/appointmentsAPI';
import { getClientsByDoctor, getClientById } from '../api/patientsAPI';
import { assignmentAPI } from '../api/assignmentAPI';
import { createMedicalReport } from '../api/medicalReportsAPI';
import { createCarePlan } from '../api/carePlansAPI';
import { createCareLog } from '../api/careLogsAPI';
import InstitutionCaregiverGuard from '../components/InstitutionCaregiverGuard';
import CaregiverSettings from '../components/CaregiverSettings';
import NurseVitalsInput from '../components/NurseVitalsInput';
import NurseCareLogs from '../components/NurseCareLogs';
import NurseReportGenerator from '../components/NurseReportGenerator';
import NurseMedicationManager from '../components/NurseMedicationManager';
import CareLogForm from '../components/CareLogForm';
import { autoFixCurrentUser } from '../utils/fixCaregiverProfile';
import { careLogsAPI } from '../api/careLogsAPI';
import { getConversationsByUser, getMessagesByConversation, sendMessage as sendMessageAPI, getOrCreateConversation } from '../api/messagesAPI';
import { toast } from 'react-toastify';

const InstitutionCaregiverDashboard = () => {
  const [searchParams] = useSearchParams();
  const { user, userProfile, institutionId, institutionData } = useUser();
  
  // Get institution ID from URL params or user context
  const urlInstitutionId = searchParams.get('institution');
  const effectiveInstitutionId = urlInstitutionId || institutionId || userProfile?.institutionId;
  
  console.log('🏥 Institution ID resolution:', {
    fromURL: urlInstitutionId,
    fromContext: institutionId,
    fromProfile: userProfile?.institutionId,
    effective: effectiveInstitutionId
  });
  const [caregiver, setCaregiver] = useState(null);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [performance, setPerformance] = useState({});
  const [loading, setLoading] = useState(true);
  const [assignedClients, setAssignedClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showCareLogsModal, setShowCareLogsModal] = useState(false);
  const [showNurseReportModal, setShowNurseReportModal] = useState(false);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [showCareLogForm, setShowCareLogForm] = useState(false);
  const [clientModalTab, setClientModalTab] = useState('info'); // 'info', 'medical', 'carelog'
  
  // Role-specific modals
  const [showMedicalReportModal, setShowMedicalReportModal] = useState(false);
  const [showCarePlanModal, setShowCarePlanModal] = useState(false);
  
  // Form data states
  const [medicalReportData, setMedicalReportData] = useState({
    reportDate: new Date().toISOString().split('T')[0],
    diagnosis: '',
    symptoms: '',
    treatment: '',
    prescriptions: '',
    notes: ''
  });
  
  const [carePlanData, setCarePlanData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    reviewDate: '',
    objectives: '',
    activities: '',
    medicationSchedule: '',
    dietary: '',
    mobility: '',
    specialInstructions: ''
  });
  const [profileImage, setProfileImage] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Messaging states
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState(null); // 'voice' or 'video'
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  // Get qualification-specific dashboard configuration
  const getDashboardConfig = () => {
    const qualification = userProfile?.medicalQualification || 'Caregiver (Non-Medical)';
    
    const configs = {
      'Doctor (MD)': {
        title: 'Doctor Dashboard',
        icon: Stethoscope,
        color: 'blue',
        features: ['consultations', 'prescriptions', 'diagnostics', 'referrals', 'telemedicine'],
        quickActions: [
          { name: 'New Consultation', icon: Stethoscope, href: '/service-provider/consultations' },
          { name: 'Write Prescription', icon: Pill, href: '/service-provider/prescriptions' },
          { name: 'Review Lab Results', icon: FlaskConical, href: '/service-provider/diagnostics' },
          { name: 'Video Consultation', icon: Camera, href: '/service-provider/messages' }
        ]
      },
      'Nurse (RN)': {
        title: 'Nurse Dashboard',
        icon: Heart,
        color: 'red',
        features: ['client-care', 'medications', 'vital-signs', 'care-plans'],
        quickActions: [
          { name: 'Client Rounds', icon: User, href: '/service-provider/clients' },
          { name: 'Medication Admin', icon: Pill, href: '/service-provider/prescriptions' },
          { name: 'Vital Signs', icon: Activity, href: '/service-provider/diagnostics' },
          { name: 'Care Plans', icon: FileText, href: '/service-provider/care-logs' }
        ]
      },
      'Physiotherapist': {
        title: 'Physiotherapy Dashboard',
        icon: Dumbbell,
        color: 'green',
        features: ['therapy-sessions', 'exercise-plans', 'progress-tracking'],
        quickActions: [
          { name: 'Therapy Sessions', icon: Dumbbell, href: '/service-provider/activities' },
          { name: 'Exercise Plans', icon: FileText, href: '/service-provider/care-logs' },
          { name: 'Progress Notes', icon: TrendingUp, href: '/service-provider/clients' },
          { name: 'Schedule Session', icon: Calendar, href: '/service-provider/schedule' }
        ]
      },
      'Psychologist': {
        title: 'Psychology Dashboard',
        icon: Brain,
        color: 'purple',
        features: ['therapy-sessions', 'assessments', 'treatment-plans'],
        quickActions: [
          { name: 'Therapy Sessions', icon: Brain, href: '/service-provider/consultations' },
          { name: 'Assessments', icon: FileText, href: '/service-provider/diagnostics' },
          { name: 'Treatment Plans', icon: Heart, href: '/service-provider/care-logs' },
          { name: 'Video Therapy', icon: Camera, href: '/service-provider/messages' }
        ]
      },
      'Pharmacist': {
        title: 'Pharmacist Dashboard',
        icon: Pill,
        color: 'indigo',
        features: ['prescriptions', 'drug-interactions', 'medication-reviews'],
        quickActions: [
          { name: 'Prescription Review', icon: Pill, href: '/service-provider/prescriptions' },
          { name: 'Drug Interactions', icon: AlertTriangle, href: '/service-provider/diagnostics' },
          { name: 'Medication Consult', icon: MessageSquare, href: '/service-provider/consultations' },
          { name: 'Client Education', icon: FileText, href: '/service-provider/clients' }
        ]
      },
      'Lab Technician': {
        title: 'Lab Technician Dashboard',
        icon: FlaskConical,
        color: 'teal',
        features: ['lab-results', 'specimen-collection', 'quality-control'],
        quickActions: [
          { name: 'Lab Results', icon: FlaskConical, href: '/service-provider/diagnostics' },
          { name: 'Collection Schedule', icon: Calendar, href: '/service-provider/schedule' },
          { name: 'Quality Control', icon: Shield, href: '/service-provider/activities' },
          { name: 'Client Reports', icon: FileText, href: '/service-provider/clients' }
        ]
      }
    };

    return configs[qualification] || {
      title: 'Caregiver Dashboard',
      icon: UserCheck,
      color: 'gray',
      features: ['client-care', 'basic-assistance', 'companionship'],
      quickActions: [
        { name: 'Client Care', icon: User, href: '/service-provider/clients' },
        { name: 'Daily Tasks', icon: CheckCircle, href: '/service-provider/tasks' },
        { name: 'Messages', icon: MessageSquare, href: '/service-provider/messages' },
        { name: 'Schedule', icon: Calendar, href: '/service-provider/schedule' }
      ]
    };
  };

  const dashboardConfig = getDashboardConfig();

  useEffect(() => {
    const loadCaregiverData = async () => {
      if (!userProfile) return;
      
      try {
        setLoading(true);
        
        // Auto-fix profile if institutionId or status is missing
        if (effectiveInstitutionId && (!userProfile.institutionId || !userProfile.status)) {
          console.log('🔄 Auto-fixing caregiver profile with missing fields...');
          await autoFixCurrentUser(user, userProfile, effectiveInstitutionId);
          // Reload page to get updated profile
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          return;
        }
        
        // Load caregiver profile data only if user is a caregiver
        if (userProfile?.userType === 'caregiver') {
          try {
        const caregiverData = await caregiverAPI.getCaregiverById(user?.uid);
        setCaregiver(caregiverData);
          } catch (error) {
            console.log('Creating caregiver profile from user data - this is normal for new users');
            // Create a basic caregiver profile from user profile
            setCaregiver({
              id: user?.uid,
              name: userProfile?.name || userProfile?.displayName || 'Caregiver',
              email: userProfile?.email,
              status: 'active',
              rating: 0,
              totalClients: 0,
              currentClients: 0,
              specializations: userProfile?.specializations || [],
              location: userProfile?.location || 'Lagos, Nigeria',
              experience: userProfile?.experience || '0 years',
              thisMonthEarnings: 0,
              lastMonthEarnings: 0,
              totalEarnings: 0,
              ...userProfile
            });
          }
        } else {
          // For non-caregivers (doctors, admins), create a mock caregiver profile from user profile
          setCaregiver({
            id: user?.uid,
            name: userProfile?.name || userProfile?.displayName || 'User',
            email: userProfile?.email,
            status: 'active',
            rating: 0,
            totalClients: 0,
            currentClients: 0,
            specializations: userProfile?.specializations || [],
            location: userProfile?.location || 'Lagos, Nigeria',
            experience: userProfile?.experience || '0 years',
            thisMonthEarnings: 0,
            lastMonthEarnings: 0,
            totalEarnings: 0,
            ...userProfile
          });
        }

        // Load assigned clients from admin-created assignments (for ALL caregivers and doctors)
        const isDoctor = (userProfile.medicalQualification || '').includes('Doctor');
        const isCaregiver = userProfile.userType === 'caregiver' || userProfile.type === 'caregiver';
        
        if (isDoctor || isCaregiver) {
          let clients = [];
          try {
            // Load assignments for this caregiver/doctor
            const assignments = await assignmentAPI.getAssignmentsByCaregiver(user?.uid);
            console.log(`📋 Found ${assignments.length} assignments for caregiver ${user?.uid}`);
            
            const uniqueClientIds = Array.from(new Set(assignments.map(a => a.clientId).filter(Boolean)));
            console.log(`👥 Fetching ${uniqueClientIds.length} unique clients...`);
            
            const fetched = await Promise.all(uniqueClientIds.map(pid => getClientById(pid).catch(() => null)));
            clients = fetched.filter(Boolean);
            
            console.log(`✅ Loaded ${clients.length} client details`);
          } catch (error) {
            console.log('No client assignments found - this is normal for new users');
          }
          
          // For doctors only: Fallback to clients.assignedDoctor field if no assignment docs found
          if (isDoctor && (!clients || clients.length === 0) && user?.uid) {
            try {
              const alt = await getClientsByDoctor(user.uid, institutionId);
              clients = alt || [];
              console.log(`📋 Fallback: Loaded ${clients.length} clients from assignedDoctor field`);
            } catch (error) {
              console.log('No clients assigned via assignedDoctor field');
            }
          }
          
          setAssignedClients(clients);
          // Auto-select first client if not set
          if (clients.length > 0 && !selectedClientId) {
            setSelectedClientId(clients[0].id);
            setSelectedClient(clients[0]);
          }
        }
        
        // Load today's schedule (appointments + tasks + assignments)
        const [todaysAppointments, todaysTasks, todaysAssignments] = await Promise.all([
          getTodaysAppointments(user?.uid, 'caregiver').catch(() => []),
          getTodayTasks(user?.uid).catch(() => []),
          assignmentAPI.getAssignmentsByCaregiver(user?.uid).catch(() => [])
        ]);
        
        // Filter assignments for today (by dueDate)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todaysAdminAssignments = todaysAssignments.filter(assignment => {
          if (!assignment.dueDate) return false;
          const dueDate = new Date(assignment.dueDate);
          return dueDate >= today && dueDate < tomorrow;
        });
        
        // Combine appointments, tasks, and admin-created assignments for today's schedule
        const combinedSchedule = [
          ...todaysAppointments.map(apt => ({
            id: apt.id,
            type: 'appointment',
            title: apt.title || 'Appointment',
            time: apt.scheduledTime,
            client: apt.clientName || 'Client',
            status: apt.status || 'scheduled'
          })),
          ...todaysTasks.map(task => ({
            id: task.id,
            type: 'task',
            title: task.title,
            time: task.scheduledTime,
            client: task.clientName || 'Client',
            status: task.status || 'pending'
          })),
          ...todaysAdminAssignments.map(assignment => ({
            id: assignment.id,
            type: 'assignment',
            title: assignment.title || 'Assigned Task',
            time: assignment.dueTime ? `${assignment.dueDate} ${assignment.dueTime}` : assignment.dueDate,
            client: assignment.clientName || 'Client',
            status: assignment.status || 'pending',
            priority: assignment.priority
          }))
        ];
        
        // Sort by time
        combinedSchedule.sort((a, b) => new Date(a.time) - new Date(b.time));
        setTodaySchedule(combinedSchedule);
        console.log(`📅 Today's schedule: ${combinedSchedule.length} items (${todaysAppointments.length} appointments, ${todaysTasks.length} tasks, ${todaysAdminAssignments.length} assignments)`);
        
        // Load recent tasks from both careTasks AND clientAssignments collections
        let loadedRecentTasks = [];
        if (user?.uid) {
          try {
            // Load from careTasks collection (old way)
            const careTasksData = await getCareTasksByCaregiver(user.uid).catch(() => []);
            console.log(`📋 Loaded ${careTasksData.length} tasks from careTasks collection`);
            
            // Load from clientAssignments collection (admin-created assignments)
            const assignments = await assignmentAPI.getAssignmentsByCaregiver(user.uid).catch(() => []);
            console.log(`📋 Loaded ${assignments.length} assignments from clientAssignments collection`);
            
            // Convert assignments to task format for display
            const assignmentTasks = assignments.map(assignment => ({
              id: assignment.id,
              task: assignment.title || 'Assigned Task',
              title: assignment.title || 'Assigned Task',
              description: assignment.description,
              clientId: assignment.clientId,
              clientName: assignment.clientName || 'Client',
              caregiverId: assignment.caregiverId,
              status: assignment.status || 'pending',
              priority: assignment.priority || 'normal',
              dueDate: assignment.dueDate,
              dueTime: assignment.dueTime,
              instructions: assignment.instructions,
              createdAt: assignment.createdAt,
              assignmentType: 'clientAssignment' // Mark as admin-created assignment
            }));
            
            // Merge both sources
            loadedRecentTasks = [...careTasksData, ...assignmentTasks];
            console.log(`✅ Total tasks (merged): ${loadedRecentTasks.length}`);
            
            // Sort by created date (most recent first)
            loadedRecentTasks.sort((a, b) => {
              const dateA = new Date(a.createdAt || 0);
              const dateB = new Date(b.createdAt || 0);
              return dateB - dateA;
            });
            
            setRecentTasks(loadedRecentTasks); // Show all tasks
          } catch (error) {
            console.log('No recent tasks found - this is normal for new users');
            setRecentTasks([]);
          }
        } else {
          setRecentTasks([]);
        }
        
        // Load performance data
        setPerformance({
          completedTasks: loadedRecentTasks.filter(task => task.status === 'completed').length,
          totalTasks: loadedRecentTasks.length,
          rating: caregiver?.rating || 4.8,
          hoursWorked: 40
        });

        // Load profile image from settings
        loadProfileImage();
        
      } catch (error) {
        console.error('Error loading caregiver data:', error);
        // Set a fallback caregiver profile to prevent crashes
        setCaregiver({
          id: user?.uid,
          name: userProfile?.name || userProfile?.displayName || 'User',
          email: userProfile?.email,
          status: 'active',
          rating: 0,
          totalClients: 0,
          currentClients: 0,
          specializations: userProfile?.specializations || [],
          location: userProfile?.location || 'Lagos, Nigeria',
          experience: userProfile?.experience || '0 years',
          thisMonthEarnings: 0,
          lastMonthEarnings: 0,
          totalEarnings: 0,
          ...userProfile
        });
      } finally {
        setLoading(false);
      }
    };

    loadCaregiverData();
    
    // Set up real-time subscription for assignments (for caregivers and doctors)
    const isDoctor = (userProfile?.medicalQualification || '').includes('Doctor');
    const isCaregiver = userProfile?.userType === 'caregiver' || userProfile?.type === 'caregiver';
    
    if ((isDoctor || isCaregiver) && user?.uid) {
      const unsubscribe = assignmentAPI.subscribeToAssignments((assignments) => {
        console.log(`🔄 Real-time update: Found ${assignments.length} total assignments`);
        
        // Filter assignments for this specific caregiver/doctor
        const caregiverAssignments = assignments.filter(a => a.caregiverId === user.uid);
        console.log(`📋 ${caregiverAssignments.length} assignments for this caregiver`);
        
        const uniqueClientIds = Array.from(new Set(caregiverAssignments.map(a => a.clientId).filter(Boolean)));
        
        if (uniqueClientIds.length > 0) {
          Promise.all(uniqueClientIds.map(pid => getClientById(pid).catch(() => null)))
            .then(fetched => {
              const clients = fetched.filter(Boolean);
              console.log(`✅ Real-time: Loaded ${clients.length} clients`);
              setAssignedClients(clients);
              
              // Auto-select first client if not set
              if (clients.length > 0 && !selectedClientId) {
                setSelectedClientId(clients[0].id);
                setSelectedClient(clients[0]);
              }
            })
            .catch(error => {
              console.log('Error fetching client details from assignments:', error);
            });
        }
      }, user.uid);
      
      return () => unsubscribe();
    }
  }, [userProfile, user?.uid, selectedClientId, effectiveInstitutionId]);

  useEffect(() => {
    // when selectedClientId changes, refresh selectedClient from cache/list
    if (!selectedClientId) {
      setSelectedClient(null);
      return;
    }
    const found = assignedClients.find(p => p.id === selectedClientId);
    if (found) setSelectedClient(found);
  }, [selectedClientId, assignedClients]);

  // Doctor action guards and navigation helpers
  const requireClient = () => {
    if (!selectedClientId) {
      alert('Please select a client first.');
      return false;
    }
    return true;
  };

  const handleNewConsultation = () => {
    if (!requireClient()) return;
    window.location.href = `/service-provider/consultations/new?clientId=${encodeURIComponent(selectedClientId)}`;
  };

  const handleWritePrescription = () => {
    if (!requireClient()) return;
    window.location.href = `/service-provider/prescriptions/new?clientId=${encodeURIComponent(selectedClientId)}`;
  };

  const handleCreateCarePlan = () => {
    if (!requireClient()) return;
    window.location.href = `/service-provider/care-plans/new?clientId=${encodeURIComponent(selectedClientId)}`;
  };

  const handleVideoConsultation = async () => {
    if (!requireClient()) return;
    // Try to find nurse assigned to this client
    let nurseId = '';
    try {
      const assignments = await assignmentAPI.getAssignmentsByClient(selectedClientId);
      const nurseAssignment = assignments.find(a => {
        const role = (a.caregiverRole || a.role || '').toLowerCase();
        const mq = (a.caregiverMedicalQualification || '').toLowerCase();
        return role.includes('nurse') || mq.includes('nurse');
      });
      nurseId = nurseAssignment?.caregiverId || '';
    } catch {}
    const query = new URLSearchParams({ clientId: selectedClientId, nurseId }).toString();
    window.location.href = `/service-provider/messages`;
  };

  const handleCareLogSave = async (careLogData) => {
    try {
      const careLogWithMetadata = {
        ...careLogData,
        caregiverId: user?.uid,
        caregiverName: userProfile?.name || userProfile?.displayName,
        institutionId: effectiveInstitutionId,
        timestamp: new Date().toISOString()
      };

      await careLogsAPI.createCareLog(careLogWithMetadata);
      toast.success('Care log saved successfully');
      
      // Refresh care logs if the modal is open
      if (showCareLogsModal) {
        // Trigger a refresh of care logs data
        setShowCareLogsModal(false);
        setTimeout(() => setShowCareLogsModal(true), 100);
      }
    } catch (error) {
      console.error('Error saving care log:', error);
      throw error;
    }
  };

  const handleClockIn = (scheduleId) => {
    // Handle clock in
    console.log('Clock in for schedule:', scheduleId);
  };

  // --- Role-specific UI helpers ---
  const isDoctor = (userProfile?.medicalQualification || '').includes('Doctor');
  const isNurse = (userProfile?.medicalQualification || '').includes('Nurse');
  const isMedicalProfessional = isDoctor || isNurse;
  const isNonMedicalCaregiver = !isMedicalProfessional;

  const renderDoctorClientSelector = () => {
    if (!isDoctor) return null;
    return (
      <div className="bg-white rounded-lg border p-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-sm text-gray-600">Assigned Clients</div>
            <select
              className="mt-1 w-72 max-w-full px-3 py-2 border rounded-md"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
            >
              <option value="">Select client...</option>
              {assignedClients.map(p => (
                <option key={p.id} value={p.id}>{p.name || p.fullName || p.email || p.id}</option>
              ))}
            </select>
          </div>
          {assignedClients.length === 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <User className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800">No clients assigned yet</h4>
                  <p className="text-sm text-blue-600 mt-1">
                    Contact your administrator to get clients assigned to your care. Once assigned, you'll be able to create care plans, write prescriptions, and conduct consultations.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={handleNewConsultation} className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50" disabled={!selectedClientId}>New Consultation</button>
            <button onClick={handleWritePrescription} className="px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-50" disabled={!selectedClientId}>Write Prescription</button>
            <button onClick={handleCreateCarePlan} className="px-3 py-2 bg-emerald-600 text-white rounded disabled:opacity-50" disabled={!selectedClientId}>Create Care Plan</button>
            <button onClick={handleVideoConsultation} className="px-3 py-2 bg-purple-600 text-white rounded disabled:opacity-50" disabled={!selectedClientId}>Video Consultation</button>
          </div>
        </div>
        {selectedClient && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Client</div>
              <div className="text-gray-900 font-medium">{selectedClient.name || selectedClient.fullName || '—'}</div>
            </div>
            <div>
              <div className="text-gray-500">Age</div>
              <div className="text-gray-900">{selectedClient.age || '—'}</div>
            </div>
            <div>
              <div className="text-gray-500">Last Visit</div>
              <div className="text-gray-900">{selectedClient.lastVisit ? new Date(selectedClient.lastVisit).toLocaleDateString() : '—'}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleClockOut = (scheduleId) => {
    // Handle clock out
    console.log('Clock out for schedule:', scheduleId);
  };

  const handleTaskComplete = (taskId) => {
    // Handle task completion
    console.log('Complete task:', taskId);
  };

  const handleEmergency = (clientId) => {
    // Handle emergency
    console.log('Emergency for client:', clientId);
  };

  const loadProfileImage = () => {
    // Load profile image from localStorage or settings
    const savedSettings = localStorage.getItem('caregiverSettings');
    console.log('Loading profile image from localStorage:', savedSettings);
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        console.log('Parsed settings:', settings);
        if (settings.profile?.profileImage) {
          console.log('Setting profile image:', settings.profile.profileImage);
          setProfileImage(settings.profile.profileImage);
        } else {
          console.log('No profile image found in settings');
        }
      } catch (error) {
        console.log('Error parsing saved settings:', error);
      }
    } else {
      console.log('No saved settings found in localStorage');
    }
  };

  const updateProfileImage = (imageUrl) => {
    setProfileImage(imageUrl);
  };

  const formatTime = (timeString) => {
    return timeString;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'upcoming':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderClientsTab = () => {
    if (!assignedClients || assignedClients.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assigned Clients</h3>
          <p className="text-gray-600 mb-4">
            You don't have any clients assigned to you at the moment.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Clients List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Age / Gender
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Medical Conditions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assignedClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {(client.name || client.fullName || 'C').toString().split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {client.name || client.fullName || 'Unknown Client'}
                          </div>
                          <div className="text-sm text-gray-500">ID: {client.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{client.age || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{client.gender || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{client.phone || client.phoneNumber || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{client.email || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {Array.isArray(client.medicalConditions) 
                          ? client.medicalConditions.slice(0, 2).join(', ') + (client.medicalConditions.length > 2 ? '...' : '')
                          : client.medicalConditions || client.conditions || 'None'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        client.status === 'Active' || client.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : client.status === 'Critical' || client.status === 'critical'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {client.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedClient(client)}
                        className="text-blue-600 hover:text-blue-900 flex items-center"
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Clients</p>
                <p className="text-2xl font-bold text-blue-900">{assignedClients.length}</p>
              </div>
              <Users className="h-10 w-10 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-green-50 rounded-xl border border-green-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Active Clients</p>
                <p className="text-2xl font-bold text-green-900">
                  {assignedClients.filter(c => c.status === 'Active' || c.status === 'active' || !c.status).length}
                </p>
              </div>
              <Activity className="h-10 w-10 text-green-600" />
            </div>
          </div>
          
          <div className="bg-red-50 rounded-xl border border-red-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Critical Clients</p>
                <p className="text-2xl font-bold text-red-900">
                  {assignedClients.filter(c => c.status === 'Critical' || c.status === 'critical').length}
                </p>
              </div>
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Load real conversations
  const loadConversations = async () => {
    if (!user?.uid) return;
    
    try {
      const userConversations = await getConversationsByUser(user.uid);
      console.log(`💬 Loaded ${userConversations.length} conversations`);
      setConversations(userConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      // Fallback to creating conversations from assigned clients
      const clientConversations = assignedClients.map(client => ({
        id: client.id,
        name: client.name || client.displayName,
        avatar: client.avatar || null,
        lastMessage: 'Click to start conversation',
        timestamp: new Date().toISOString(),
        unread: 0,
        type: 'client',
        participants: [user.uid, client.id]
      }));
      setConversations(clientConversations);
    }
  };

  // Load messages for selected conversation
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

  // Messaging Tab Renderer
  const renderMessagesTab = () => {
    const handleSendMessage = async () => {
      if (!newMessage.trim() || !selectedConversation) return;
      
      try {
        // Get or create conversation
        let conversationId = selectedConversation.conversationId || selectedConversation.id;
        
        // If conversation doesn't exist in Firestore yet, create it
        if (!selectedConversation.conversationId && selectedConversation.participants) {
          conversationId = await getOrCreateConversation(selectedConversation.participants, 'care');
          console.log(`✅ Created new conversation: ${conversationId}`);
        }
        
        // Send message to Firestore
        await sendMessageAPI(conversationId, user.uid, {
          text: newMessage,
          type: 'text',
          senderName: userProfile?.name || 'Caregiver'
        });
        
        // Add message to local state for immediate display
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
        
        // Reload conversations to update last message
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
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setLocalStream(stream);
        setCallType('voice');
        setIsInCall(true);
        toast.success('Voice call started');
        
        // TODO: Initialize WebRTC connection
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
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        setLocalStream(stream);
        setCallType('video');
        setIsInCall(true);
        toast.success('Video call started');
        
        // TODO: Initialize WebRTC connection
      } catch (error) {
        console.error('Error starting video call:', error);
        toast.error('Failed to start video call. Please check camera and microphone permissions.');
      }
    };

    const endCall = () => {
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
      toast.info('Call ended');
    };

    // Load conversations on mount
    useEffect(() => {
      if (user?.uid) {
        loadConversations();
      }
    }, [user?.uid, assignedClients.length]);

    // Use real conversations or create from assigned clients
    const displayConversations = conversations.length > 0 ? conversations : 
      assignedClients.length > 0 ? assignedClients.map(client => ({
        id: client.id,
        name: client.name || client.displayName,
        avatar: client.avatar || null,
        lastMessage: 'Start a conversation',
        timestamp: new Date().toISOString(),
        unread: 0,
        type: 'client',
        participants: [user.uid, client.id]
      })) : [
        {
          id: 'admin-1',
          name: institutionData?.name || 'Institution Admin',
          avatar: null,
          lastMessage: 'Welcome to the team!',
          timestamp: new Date().toISOString(),
          unread: 0,
          type: 'admin',
          participants: [user.uid, 'admin']
        }
      ];

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-[calc(100vh-250px)]">
        <div className="flex h-full">
          {/* Conversations List */}
          <div className="w-80 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
              <p className="text-sm text-gray-500 mt-1">{displayConversations.length} conversations</p>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {displayConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => {
                    setSelectedConversation(conversation);
                    // Load real messages for this conversation
                    const convId = conversation.conversationId || conversation.id;
                    loadMessagesForConversation(convId);
                  }}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {conversation.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{conversation.name}</h3>
                        {conversation.unread > 0 && (
                          <span className="ml-2 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {conversation.unread}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate mt-1">{conversation.lastMessage}</p>
                      <span className="text-xs text-gray-400 mt-1">
                        {new Date(conversation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          {selectedConversation ? (
            <div className="flex-1 flex flex-col">
              {/* Chat Header with Call Buttons */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {selectedConversation.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{selectedConversation.name}</h3>
                    <p className="text-xs text-gray-500">
                      {selectedConversation.type === 'client' ? 'Client' : 'Admin'}
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

              {/* Call Interface (when in call) */}
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

  // Schedule Tab Renderer
  const renderScheduleTab = () => {
    const currentShift = {
      type: 'Day Shift',
      start: '07:00',
      end: '19:00',
      breakTime: '12:00 - 12:30',
      ratio: `1:${assignedClients.length}`
    };

    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date().getDay();
    
    return (
      <div className="space-y-6">
        {/* Shift Overview */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-6 w-6 text-blue-600" />
            Current Shift Overview
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Shift Type</p>
              <p className="text-lg font-bold text-gray-900">{currentShift.type}</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Hours</p>
              <p className="text-lg font-bold text-gray-900">{currentShift.start} - {currentShift.end}</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Client-Nurse Ratio</p>
              <p className="text-lg font-bold text-gray-900">{currentShift.ratio}</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Break Time</p>
              <p className="text-lg font-bold text-gray-900">{currentShift.breakTime}</p>
            </div>
          </div>
        </div>

        {/* Weekly Schedule Calendar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Weekly Schedule</h2>
            <div className="text-sm text-gray-500">Week of {new Date().toLocaleDateString()}</div>
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {daysOfWeek.map((day, index) => (
              <div key={day} className={`text-center p-4 rounded-lg ${index + 1 === today ? 'bg-blue-100 border-2 border-blue-600' : 'bg-gray-50'}`}>
                <p className="text-sm font-bold text-gray-900">{day}</p>
                <p className="text-xs text-gray-600 mt-1">{new Date(Date.now() + (index - today + 1) * 86400000).getDate()}</p>
                {index + 1 === today && (
                  <div className="mt-2 space-y-1">
                    <div className="text-xs bg-green-500 text-white rounded px-2 py-1">08:00 Meds</div>
                    <div className="text-xs bg-blue-500 text-white rounded px-2 py-1">10:00 Vitals</div>
                    <div className="text-xs bg-purple-500 text-white rounded px-2 py-1">14:00 Care</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Today's Timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Today's Timeline</h2>
          
          <div className="space-y-4">
            {todaySchedule.length > 0 ? (
              todaySchedule.map((item, index) => (
                <div key={item.id} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-20 text-right">
                    <p className="text-sm font-bold text-gray-900">
                      {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <div className={`h-3 w-3 rounded-full ${item.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                    {index < todaySchedule.length - 1 && <div className="w-0.5 h-12 bg-gray-300"></div>}
                  </div>
                  <div className="flex-1 pb-8">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="font-semibold text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{item.client}</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                        item.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-12">
                <Calendar className="h-12 w-12 mx-auto mb-2" />
                <p>No scheduled activities for today</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Reports Tab Renderer
  const renderReportsTab = () => {
    const [reportType, setReportType] = useState('shift');
    const [shiftType, setShiftType] = useState('day');
    
    return (
      <div className="space-y-6">
        {/* Report Type Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Nursing Reports</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setReportType('shift')}
                className={`px-4 py-2 rounded-lg ${
                  reportType === 'shift' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Shift Report
              </button>
              <button
                onClick={() => setReportType('handoff')}
                className={`px-4 py-2 rounded-lg ${
                  reportType === 'handoff' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Handoff Notes
              </button>
              <button
                onClick={() => setReportType('incident')}
                className={`px-4 py-2 rounded-lg ${
                  reportType === 'incident' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Incident Reports
              </button>
            </div>
          </div>
        </div>

        {/* Shift Report Generator */}
        {reportType === 'shift' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Shift Report</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shift</label>
                <select 
                  value={shiftType}
                  onChange={(e) => setShiftType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="day">Day Shift (07:00 - 19:00)</option>
                  <option value="night">Night Shift (19:00 - 07:00)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input 
                  type="date" 
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Shift Summary */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h4 className="font-semibold text-gray-900 mb-4">Shift Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Client Census</p>
                  <p className="text-2xl font-bold text-gray-900">{assignedClients.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Admissions</p>
                  <p className="text-2xl font-bold text-green-600">0</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Discharges</p>
                  <p className="text-2xl font-bold text-blue-600">0</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Incidents</p>
                  <p className="text-2xl font-bold text-red-600">0</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Medications Given</p>
                  <p className="text-2xl font-bold text-purple-600">{todaySchedule.filter(t => t.type === 'task').length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vitals Recorded</p>
                  <p className="text-2xl font-bold text-orange-600">{assignedClients.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Care Activities</p>
                  <p className="text-2xl font-bold text-teal-600">{recentTasks.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Assessments</p>
                  <p className="text-2xl font-bold text-indigo-600">{assignedClients.length}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => toast.info('Generating shift report...')}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="h-5 w-5" />
                Generate Full Report
              </button>
              <button
                onClick={() => toast.info('Exporting as PDF...')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Eye className="h-5 w-5" />
                Export PDF
              </button>
              <button
                onClick={() => toast.info('Sending email...')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Mail className="h-5 w-5" />
                Email Report
              </button>
            </div>
          </div>
        )}

        {/* Handoff Notes */}
        {reportType === 'handoff' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Handoff Notes</h3>
            
            <div className="space-y-4 mb-6">
              {assignedClients.map((client) => (
                <div key={client.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{client.name}</h4>
                    <span className="text-xs text-gray-500">Room {client.room || 'N/A'}</span>
                  </div>
                  <textarea
                    placeholder="Enter handoff notes for this client..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    rows="3"
                    defaultValue={`Stable condition. Continue current care plan. No significant changes during shift.`}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => toast.success('Handoff notes saved')}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-5 w-5" />
              Save All Handoff Notes
            </button>
          </div>
        )}

        {/* Incident Reports */}
        {reportType === 'incident' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Incident Reports</h3>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">No incidents reported today</p>
                  <p className="text-xs text-yellow-700 mt-1">All clients are safe. Continue monitoring.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => toast.info('Opening incident report form...')}
              className="w-full px-6 py-3 border-2 border-dashed border-gray-300 text-gray-700 rounded-lg hover:border-red-400 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Report New Incident
            </button>
          </div>
        )}
      </div>
    );
  };

  // View-only tab renderers for non-medical caregivers
  const renderPrescriptionsTab = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="text-center">
            <Pill className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Prescriptions (View Only)</h2>
            <p className="text-gray-600 mb-6">
              As a non-medical caregiver, you can view prescribed medications for your assigned clients but cannot prescribe new medications.
            </p>
            
            {selectedClient ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Client: {selectedClient.name || selectedClient.fullName || 'Unknown Client'}
                </h3>
                <p className="text-blue-700">
                  Prescribed medications for this client would be displayed here. 
                  You can view medication details, dosage instructions, and administration schedules.
                </p>
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => setShowMedicationModal(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Medications
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <p className="text-gray-600">
                  Please select a client from the dropdown above to view their prescribed medications.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderConsultationsTab = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="text-center">
            <Stethoscope className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Consultations (View Only)</h2>
            <p className="text-gray-600 mb-6">
              As a non-medical caregiver, you can view consultation notes and medical reports for your assigned clients but cannot conduct medical consultations.
            </p>
            
            {selectedClient ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  Client: {selectedClient.name || selectedClient.fullName || 'Unknown Client'}
                </h3>
                <p className="text-green-700">
                  Consultation history, medical reports, and doctor's notes for this client would be displayed here.
                  You can review these documents to better understand the client's medical condition and care requirements.
                </p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-semibold text-gray-900">Recent Consultations</h4>
                    <p className="text-gray-600">View consultation history and notes</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-semibold text-gray-900">Medical Reports</h4>
                    <p className="text-gray-600">Review lab results and diagnostic reports</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <p className="text-gray-600">
                  Please select a client from the dropdown above to view their consultation history.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDiagnosticsTab = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="text-center">
            <FlaskConical className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Diagnostics (View Only)</h2>
            <p className="text-gray-600 mb-6">
              As a non-medical caregiver, you can view diagnostic results and test reports for your assigned clients but cannot order new diagnostic tests.
            </p>
            
            {selectedClient ? (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-purple-900 mb-2">
                  Client: {selectedClient.name || selectedClient.fullName || 'Unknown Client'}
                </h3>
                <p className="text-purple-700">
                  Diagnostic test results, lab reports, and imaging studies for this client would be displayed here.
                  You can review these results to understand the client's medical status and any ongoing monitoring requirements.
                </p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-semibold text-gray-900">Lab Results</h4>
                    <p className="text-gray-600">Blood tests, urine tests, etc.</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-semibold text-gray-900">Imaging</h4>
                    <p className="text-gray-600">X-rays, CT scans, MRIs</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-semibold text-gray-900">Vital Signs</h4>
                    <p className="text-gray-600">Recent vital signs history</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <p className="text-gray-600">
                  Please select a client from the dropdown above to view their diagnostic results.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Tasks Tab Renderer
  const renderTasksTab = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="text-center">
            <CheckSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Tasks Management</h2>
            <p className="text-gray-600 mb-6">
              View and manage your assigned care tasks and daily activities.
            </p>
            
            {selectedClient ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  Client: {selectedClient.name || selectedClient.fullName || 'Unknown Client'}
                </h3>
                <p className="text-green-700">
                  Your assigned tasks for this client will be displayed here. You can track progress, 
                  mark tasks as completed, and add notes about your care activities.
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <p className="text-gray-600">
                  Please select a client from the dropdown above to view their assigned tasks.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Care Logs Tab Renderer
  const renderCareLogsTab = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="text-center">
            <Camera className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Care Logs</h2>
            <p className="text-gray-600 mb-6">
              Document and track your care activities with detailed logs and observations.
            </p>
            
            {selectedClient ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Client: {selectedClient.name || selectedClient.fullName || 'Unknown Client'}
                </h3>
                <p className="text-blue-700">
                  Create detailed care logs for this client including vital signs, medication administration, 
                  observations, and any important notes about their condition.
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <p className="text-gray-600">
                  Please select a client from the dropdown above to create and view care logs.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Activities Tab Renderer
  const renderActivitiesTab = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="text-center">
            <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Activities Dashboard</h2>
            <p className="text-gray-600 mb-6">
              Track your daily activities, performance metrics, and care statistics.
            </p>
            
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-indigo-900 mb-2">
                Activity Overview
              </h3>
              <p className="text-indigo-700">
                View your care activities, time spent with patients, completed tasks, 
                and performance metrics to track your productivity and quality of care.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <InstitutionCaregiverGuard>
    <div className="w-full h-full bg-gray-50 flex">
      {/* Sidebar */}
      {(isDoctor || isNurse || isNonMedicalCaregiver) && (
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white shadow-lg border-r border-gray-200 transition-all duration-300 flex flex-col`}>
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-100">
            {!sidebarCollapsed ? (
              <div className="flex flex-col items-center space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Heart className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <h1 className="text-lg font-bold text-gray-900">ElderX</h1>
                    <p className="text-xs text-gray-500">Care Portal</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Heart className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Home className={`h-5 w-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Dashboard'}
            </button>
            
            <button
              onClick={() => setActiveTab('schedule')}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'schedule'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Calendar className={`h-5 w-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Schedule'}
            </button>
            
            <button
              onClick={() => setActiveTab('messages')}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'messages'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <MessageSquare className={`h-5 w-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Messages'}
            </button>
            
            <button
              onClick={() => setActiveTab('tasks')}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'tasks'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <CheckSquare className={`h-5 w-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Tasks'}
            </button>
            
            <button
              onClick={() => setActiveTab('carelogs')}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'carelogs'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Camera className={`h-5 w-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Care Logs'}
            </button>
            
            <button
              onClick={() => setActiveTab('activities')}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'activities'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className={`h-5 w-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Activities'}
            </button>
            
            <button
              onClick={() => setActiveTab('clients')}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'clients'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Users className={`h-5 w-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Clients'}
            </button>
            
            <button
              onClick={() => setActiveTab('prescriptions')}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'prescriptions'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Pill className={`h-5 w-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Prescriptions'}
            </button>
            
            <button
              onClick={() => setActiveTab('consultations')}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'consultations'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Stethoscope className={`h-5 w-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Consultations'}
            </button>
            
            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'diagnostics'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <FileText className={`h-5 w-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Diagnostics'}
            </button>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors mb-2 ${
                showSettings 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Settings className={`h-5 w-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Settings'}
            </button>
            
            <button
              onClick={() => {
                // Import signOut from firebase/auth
                import('firebase/auth').then(({ signOut, getAuth }) => {
                  signOut(getAuth()).then(() => {
                    // Clear user context and redirect to login
                    window.location.href = '/institution-login';
                  }).catch((error) => {
                    console.error('Error signing out:', error);
                  });
                });
              }}
              className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className={`h-5 w-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Logout'}
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-100 px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {activeTab === 'dashboard' && 'General Care Dashboard'}
                {activeTab === 'clients' && 'Client Management'}
                {activeTab === 'messages' && 'Messages'}
                {activeTab === 'schedule' && 'Schedule'}
                {activeTab === 'tasks' && 'Tasks'}
                {activeTab === 'carelogs' && 'Care Logs'}
                {activeTab === 'activities' && 'Activities'}
                {activeTab === 'prescriptions' && 'Prescriptions'}
                {activeTab === 'consultations' && 'Consultations'}
                {activeTab === 'diagnostics' && 'Diagnostics'}
              </h1>
              <p className="text-gray-600 mt-1">
                {activeTab === 'dashboard' && `Welcome back, ${caregiver?.name || userProfile?.name || 'User'}`}
                {activeTab === 'clients' && 'Manage your assigned clients'}
                {activeTab === 'messages' && 'Communicate with team members'}
                {activeTab === 'schedule' && 'View your upcoming schedule'}
                {activeTab === 'tasks' && 'Manage your care tasks'}
                {activeTab === 'carelogs' && 'View and manage care logs'}
                {activeTab === 'activities' && 'Track your activities'}
                {activeTab === 'prescriptions' && 'View prescribed medications'}
                {activeTab === 'consultations' && 'View consultation notes'}
                {activeTab === 'diagnostics' && 'View diagnostic results'}
              </p>
              {activeTab === 'dashboard' && (
                <div className="flex items-center mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {userProfile?.medicalQualification || 'General Medicine'}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button className="flex items-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
              <div className="flex items-center space-x-3">
                <Bell className="h-5 w-5 text-gray-400" />
                <div className="flex items-center space-x-2">
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="h-full w-full object-cover"
                        onLoad={() => console.log('Profile image loaded successfully')}
                        onError={() => console.log('Profile image failed to load')}
                      />
                    ) : (
                      <span className="text-white font-semibold">
                        {caregiver?.name ? caregiver.name.toString().split(' ').map(n => n[0]).join('') : 'U'}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {caregiver?.name || userProfile?.name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500">Caregiver</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Doctor Client Selector (if doctor) */}
        <div className="p-8 pt-6">
          {renderDoctorClientSelector()}
        </div>

        {/* Summary Cards - Only show on dashboard */}
        {activeTab === 'dashboard' && (
          <div className="px-8 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div 
                onClick={() => setActiveTab('clients')}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Assigned Clients</p>
                    <p className="text-2xl font-bold text-gray-900">{assignedClients.length}</p>
                    <p className="text-xs text-blue-600 mt-1 flex items-center">
                      <Eye className="h-3 w-3 mr-1" />
                      Click to view
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>
              
              <div 
                onClick={() => setActiveTab('tasks')}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md hover:border-green-200 transition-all transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Today's Tasks</p>
                    <p className="text-2xl font-bold text-gray-900">{recentTasks.length}</p>
                    <p className="text-xs text-green-600 mt-1 flex items-center">
                      <Eye className="h-3 w-3 mr-1" />
                      Click to view
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <CheckSquare className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>
              
              <div 
                onClick={() => setActiveTab('tasks')}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md hover:border-orange-200 transition-all transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
                    <p className="text-2xl font-bold text-gray-900">{recentTasks.filter(task => task.status !== 'completed').length}</p>
                    <p className="text-xs text-orange-600 mt-1 flex items-center">
                      <Eye className="h-3 w-3 mr-1" />
                      Click to view
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </div>
              
              <div 
                onClick={() => setActiveTab('messages')}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md hover:border-purple-200 transition-all transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Unread Messages</p>
                    <p className="text-2xl font-bold text-gray-900">{conversations.filter(c => c.unread > 0).length}</p>
                    <p className="text-xs text-purple-600 mt-1 flex items-center">
                      <Eye className="h-3 w-3 mr-1" />
                      Click to view
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <MessageSquare className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <BarChart3 className="h-4 w-4 mr-2" />
                Weekly Overview
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 px-8 pb-8 w-full">
        {showSettings ? (
          <CaregiverSettings onProfileImageUpdate={updateProfileImage} />
        ) : activeTab === 'messages' ? (
          renderMessagesTab()
        ) : activeTab === 'schedule' ? (
          renderScheduleTab()
        ) : activeTab === 'tasks' ? (
          renderTasksTab()
        ) : activeTab === 'carelogs' ? (
          renderCareLogsTab()
        ) : activeTab === 'activities' ? (
          renderActivitiesTab()
        ) : activeTab === 'clients' ? (
          renderClientsTab()
        ) : activeTab === 'prescriptions' ? (
          renderPrescriptionsTab()
        ) : activeTab === 'consultations' ? (
          renderConsultationsTab()
        ) : activeTab === 'diagnostics' ? (
          renderDiagnosticsTab()
        ) : (
          <div className="space-y-8">
            {/* General Care Provider Dashboard Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">General Care Provider Dashboard</h2>
                  <p className="text-gray-600">Essential caregiving tools and client management</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-600 mb-1">Qualification Level</p>
                  <p className="text-lg font-bold text-gray-900">
                    {userProfile?.medicalQualification?.includes('Doctor') ? 'Advanced' : 
                     userProfile?.medicalQualification?.includes('Nurse') ? 'Intermediate' : 'Basic'}
                  </p>
                </div>
              </div>
              
              {/* Specializations and Certifications Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Specializations</h3>
                  <div className="space-y-3">
                    {userProfile?.specializations?.length > 0 ? (
                      userProfile.specializations.map((spec, index) => (
                        <div key={index} className="bg-white rounded-lg p-3 border border-gray-100">
                          <p className="text-sm font-medium text-gray-900">{spec}</p>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
                        <p className="text-gray-500 text-sm">No specializations added yet</p>
                        <button className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
                          Add Specializations
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Certifications</h3>
                  <div className="space-y-3">
                    {userProfile?.certifications?.length > 0 ? (
                      userProfile.certifications.map((cert, index) => (
                        <div key={index} className="bg-white rounded-lg p-3 border border-gray-100">
                          <p className="text-sm font-medium text-gray-900">{cert}</p>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
                        <p className="text-gray-500 text-sm">No certifications added yet</p>
                        <button className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
                          Add Certifications
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Morning Briefing for Nurses */}
            {(userProfile?.medicalQualification?.includes('Nurse') || userProfile?.medicalQualification?.includes('RN')) && (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl shadow-sm border border-red-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Heart className="h-6 w-6 text-red-600" />
                    Morning Briefing
                  </h2>
                  <span className="text-sm text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-5 w-5 text-blue-600" />
                      <p className="text-sm font-medium text-gray-600">Client Census</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{assignedClients.length}</p>
                    <p className="text-xs text-gray-500 mt-1">Assigned clients</p>
                  </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <p className="text-sm font-medium text-gray-600">Priority Alerts</p>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">0</p>
                  <p className="text-xs text-gray-500 mt-1">Critical attention needed</p>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Pill className="h-5 w-5 text-green-600" />
                    <p className="text-sm font-medium text-gray-600">Medications Due</p>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{todaySchedule.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Scheduled today</p>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-5 w-5 text-purple-600" />
                    <p className="text-sm font-medium text-gray-600">Assessments</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{assignedClients.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Due today</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Qualification-Specific Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions for {userProfile?.medicalQualification || 'Healthcare Professional'}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {dashboardConfig.quickActions.map((action, index) => (
                <a
                  key={index}
                  href={action.href}
                  className={`flex flex-col items-center p-4 rounded-lg border-2 border-gray-200 hover:border-${dashboardConfig.color}-300 hover:bg-${dashboardConfig.color}-50 transition-colors group`}
                >
                  <action.icon className={`h-8 w-8 text-${dashboardConfig.color}-600 mb-2 group-hover:text-${dashboardConfig.color}-700`} />
                  <span className="text-sm font-medium text-gray-700 text-center">{action.name}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Today's Visits</p>
                  <p className="text-3xl font-bold text-gray-900">{todaySchedule.length}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Completed Tasks</p>
                  <p className="text-3xl font-bold text-gray-900">{recentTasks.filter(t => t.status === 'completed').length}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Rating</p>
                  <p className="text-3xl font-bold text-gray-900">{caregiver?.rating}</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-xl">
                  <Star className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">This Month</p>
                  <p className="text-3xl font-bold text-gray-900">₦{(caregiver?.thisMonthEarnings || 0).toLocaleString()}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Priority Alerts Section for Nurses */}
          {(userProfile?.medicalQualification?.includes('Nurse') || userProfile?.medicalQualification?.includes('RN')) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Priority Alerts */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Priority Alerts
                </h2>
                
                <div className="space-y-3">
                  {assignedClients.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      <Shield className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-sm">No priority alerts</p>
                      <p className="text-xs mt-1">All clients stable</p>
                    </div>
                  ) : (
                    assignedClients.slice(0, 5).map((client, index) => (
                      <div key={client.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className={`flex-shrink-0 h-2 w-2 rounded-full mt-2 ${
                          index === 0 ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{client.name}</p>
                          <p className="text-xs text-gray-500">All vitals within normal range</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Activities */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Recent Activities
                </h2>
                
                <div className="space-y-3">
                  {recentTasks.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      <Clock className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-sm">No recent activities</p>
                      <p className="text-xs mt-1">Start documenting care</p>
                    </div>
                  ) : (
                    recentTasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{task.task || task.title}</p>
                          <p className="text-xs text-gray-500">
                            {task.clientName} • {task.completedAt ? new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Today's Schedule */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-8 py-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Today's Schedule</h2>
            </div>
            <div className="p-8">
              <div className="space-y-6">
                {todaySchedule.map((schedule) => (
                  <div key={schedule.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-4">
                          <h3 className="text-xl font-semibold text-gray-900">{schedule.clientName}</h3>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(schedule.status)}`}>
                            {schedule.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
                          <div className="flex items-center">
                            <Clock className="h-5 w-5 mr-2 text-gray-500" />
                            <span className="font-medium">{formatTime(schedule.time)} ({schedule.duration})</span>
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-5 w-5 mr-2 text-gray-500" />
                            <span className="font-medium">{schedule.address}</span>
                          </div>
                        </div>
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">Tasks:</h4>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {schedule.tasks.map((task, index) => (
                              <li key={index} className="flex items-center text-sm text-gray-600">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                {task}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {schedule.notes && (
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Notes:</h4>
                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{schedule.notes}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col space-y-3 ml-8">
                        <button
                          onClick={() => handleClockIn(schedule.id)}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          Clock In
                        </button>
                        <button
                          onClick={() => handleClockOut(schedule.id)}
                          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                        >
                          Clock Out
                        </button>
                        <button
                          onClick={() => handleEmergency(schedule.clientId)}
                          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center"
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Emergency
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Tasks */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-8 py-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Recent Tasks</h2>
            </div>
            <div className="p-8">
              <div className="space-y-4">
                {recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-gray-900">{task.task}</h4>
                        <p className="text-sm text-gray-600">{task.clientName}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(task.completedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                      <button className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors">
                        <Eye className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Performance Overview */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-8 py-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">Performance Overview</h2>
              </div>
              <div className="p-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-gray-700">Punctuality</span>
                    <div className="flex items-center">
                      <div className="w-40 bg-gray-200 rounded-full h-3 mr-4">
                        <div className="bg-green-600 h-3 rounded-full" style={{ width: `${performance.punctuality}%` }}></div>
                      </div>
                      <span className="text-lg font-bold text-gray-900">{performance.punctuality}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-gray-700">Task Completion</span>
                    <div className="flex items-center">
                      <div className="w-40 bg-gray-200 rounded-full h-3 mr-4">
                        <div className="bg-blue-600 h-3 rounded-full" style={{ width: `${performance.taskCompletion}%` }}></div>
                      </div>
                      <span className="text-lg font-bold text-gray-900">{performance.taskCompletion}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-gray-700">Client Satisfaction</span>
                    <div className="flex items-center">
                      <Star className="h-5 w-5 text-yellow-400 mr-2" />
                      <span className="text-lg font-bold text-gray-900">{performance.clientSatisfaction}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-gray-700">Communication</span>
                    <div className="flex items-center">
                      <Star className="h-5 w-5 text-yellow-400 mr-2" />
                      <span className="text-lg font-bold text-gray-900">{performance.communication}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-gray-700">Safety Record</span>
                    <div className="flex items-center">
                      <div className="w-40 bg-gray-200 rounded-full h-3 mr-4">
                        <div className="bg-green-600 h-3 rounded-full" style={{ width: `${performance.safety}%` }}></div>
                      </div>
                      <span className="text-lg font-bold text-gray-900">{performance.safety}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-8 py-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-2 gap-4">
                  <button className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-md transition-all">
                    <MessageSquare className="h-8 w-8 text-blue-600 mb-3" />
                    <span className="text-sm font-semibold text-gray-900">Messages</span>
                  </button>
                  <button className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-md transition-all">
                    <Camera className="h-8 w-8 text-green-600 mb-3" />
                    <span className="text-sm font-semibold text-gray-900">Photo Update</span>
                  </button>
                  <button className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-md transition-all">
                    <FileText className="h-8 w-8 text-purple-600 mb-3" />
                    <span className="text-sm font-semibold text-gray-900">Add Note</span>
                  </button>
                  <button className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-md transition-all">
                    <Navigation className="h-8 w-8 text-orange-600 mb-3" />
                    <span className="text-sm font-semibold text-gray-900">Navigation</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Modals */}
      {showVitalsModal && selectedClient && (
        <NurseVitalsInput
          clientId={selectedClient.id}
          clientName={selectedClient.name || selectedClient.fullName || 'Unknown Client'}
          nurseId={user?.uid}
          nurseName={userProfile?.name || userProfile?.displayName || 'Nurse'}
          onSave={() => {
            setShowVitalsModal(false);
            // Refresh client data if needed
          }}
          onCancel={() => setShowVitalsModal(false)}
        />
      )}

      {showCareLogsModal && selectedClient && (
        <NurseCareLogs
          clientId={selectedClient.id}
          clientName={selectedClient.name || selectedClient.fullName || 'Unknown Client'}
          nurseId={user?.uid}
          nurseName={userProfile?.name || userProfile?.displayName || 'Nurse'}
          onSave={() => {
            setShowCareLogsModal(false);
            // Refresh client data if needed
          }}
          onCancel={() => setShowCareLogsModal(false)}
        />
      )}

      {showCareLogForm && selectedClient && (
        <CareLogForm
          client={selectedClient}
          onSave={handleCareLogSave}
          onClose={() => setShowCareLogForm(false)}
          isOpen={showCareLogForm}
        />
      )}

      {showNurseReportModal && selectedClient && (
        <NurseReportGenerator
          clientId={selectedClient.id}
          clientName={selectedClient.name || selectedClient.fullName || 'Unknown Client'}
          nurseId={user?.uid}
          nurseName={userProfile?.name || userProfile?.displayName || 'Nurse'}
          onSave={() => {
            setShowNurseReportModal(false);
            // Refresh client data if needed
          }}
          onCancel={() => setShowNurseReportModal(false)}
        />
      )}

      {showMedicationModal && selectedClient && (
        <NurseMedicationManager
          clientId={selectedClient.id}
          clientName={selectedClient.name || selectedClient.fullName || 'Unknown Client'}
          nurseId={user?.uid}
          nurseName={userProfile?.name || userProfile?.displayName || 'Nurse'}
          onSave={() => {
            setShowMedicationModal(false);
            // Refresh client data if needed
          }}
          onCancel={() => setShowMedicationModal(false)}
        />
      )}

      {/* Doctor: Medical Report Modal */}
      {showMedicalReportModal && selectedClient && isDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Stethoscope className="h-8 w-8 text-white" />
                <div>
                  <h2 className="text-2xl font-bold text-white">Medical Report</h2>
                  <p className="text-blue-100">For: {selectedClient.name || selectedClient.fullName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowMedicalReportModal(false)}
                className="text-white hover:bg-blue-500 rounded-lg p-2 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Report Date</label>
                  <input
                    type="date"
                    value={medicalReportData.reportDate}
                    onChange={(e) => setMedicalReportData({...medicalReportData, reportDate: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis</label>
                  <textarea
                    placeholder="Enter medical diagnosis..."
                    rows={3}
                    value={medicalReportData.diagnosis}
                    onChange={(e) => setMedicalReportData({...medicalReportData, diagnosis: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Symptoms Observed</label>
                  <textarea
                    placeholder="Describe symptoms and clinical findings..."
                    rows={4}
                    value={medicalReportData.symptoms}
                    onChange={(e) => setMedicalReportData({...medicalReportData, symptoms: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Treatment Recommendations</label>
                  <textarea
                    placeholder="Recommended treatment plan..."
                    rows={4}
                    value={medicalReportData.treatment}
                    onChange={(e) => setMedicalReportData({...medicalReportData, treatment: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prescriptions</label>
                  <textarea
                    placeholder="List medications and dosage instructions..."
                    rows={3}
                    value={medicalReportData.prescriptions}
                    onChange={(e) => setMedicalReportData({...medicalReportData, prescriptions: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                  <textarea
                    placeholder="Any additional medical notes or observations..."
                    rows={3}
                    value={medicalReportData.notes}
                    onChange={(e) => setMedicalReportData({...medicalReportData, notes: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-gray-200">
              <button
                onClick={() => setShowMedicalReportModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const reportPayload = {
                      clientId: selectedClient.id,
                      clientName: selectedClient.name || selectedClient.fullName,
                      doctorId: user.uid,
                      doctorName: userProfile?.name || userProfile?.displayName,
                      institutionId: effectiveInstitutionId,
                      reportDate: new Date(medicalReportData.reportDate),
                      diagnosis: medicalReportData.diagnosis,
                      symptoms: medicalReportData.symptoms,
                      treatmentRecommendations: medicalReportData.treatment,
                      prescriptions: medicalReportData.prescriptions,
                      additionalNotes: medicalReportData.notes
                    };
                    
                    await createMedicalReport(reportPayload);
                    alert('Medical report saved successfully!');
                    
                    // Reset form
                    setMedicalReportData({
                      reportDate: new Date().toISOString().split('T')[0],
                      diagnosis: '',
                      symptoms: '',
                      treatment: '',
                      prescriptions: '',
                      notes: ''
                    });
                    setShowMedicalReportModal(false);
                  } catch (error) {
                    console.error('Error saving medical report:', error);
                    alert('Failed to save medical report: ' + error.message);
                  }
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Save Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doctor: Care Plan Modal */}
      {showCarePlanModal && selectedClient && isDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ClipboardList className="h-8 w-8 text-white" />
                <div>
                  <h2 className="text-2xl font-bold text-white">Create Care Plan</h2>
                  <p className="text-indigo-100">For: {selectedClient.name || selectedClient.fullName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCarePlanModal(false)}
                className="text-white hover:bg-indigo-500 rounded-lg p-2 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={carePlanData.startDate}
                      onChange={(e) => setCarePlanData({...carePlanData, startDate: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Review Date</label>
                    <input
                      type="date"
                      value={carePlanData.reviewDate}
                      onChange={(e) => setCarePlanData({...carePlanData, reviewDate: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Care Objectives</label>
                  <textarea
                    placeholder="List primary care objectives and goals..."
                    rows={3}
                    value={carePlanData.objectives}
                    onChange={(e) => setCarePlanData({...carePlanData, objectives: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Daily Care Activities</label>
                  <textarea
                    placeholder="Specify daily care routines and activities..."
                    rows={4}
                    value={carePlanData.activities}
                    onChange={(e) => setCarePlanData({...carePlanData, activities: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Medication Schedule</label>
                  <textarea
                    placeholder="Detail medication times and administration instructions..."
                    rows={3}
                    value={carePlanData.medicationSchedule}
                    onChange={(e) => setCarePlanData({...carePlanData, medicationSchedule: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Requirements</label>
                  <textarea
                    placeholder="Specify dietary needs, restrictions, and meal plans..."
                    rows={3}
                    value={carePlanData.dietary}
                    onChange={(e) => setCarePlanData({...carePlanData, dietary: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mobility & Exercise Plan</label>
                  <textarea
                    placeholder="Describe mobility assistance needs and exercise recommendations..."
                    rows={3}
                    value={carePlanData.mobility}
                    onChange={(e) => setCarePlanData({...carePlanData, mobility: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions</label>
                  <textarea
                    placeholder="Any special care instructions or precautions..."
                    rows={3}
                    value={carePlanData.specialInstructions}
                    onChange={(e) => setCarePlanData({...carePlanData, specialInstructions: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-gray-200">
              <button
                onClick={() => setShowCarePlanModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const planPayload = {
                      clientId: selectedClient.id,
                      clientName: selectedClient.name || selectedClient.fullName,
                      doctorId: user.uid,
                      doctorName: userProfile?.name || userProfile?.displayName,
                      institutionId: effectiveInstitutionId,
                      startDate: new Date(carePlanData.startDate),
                      reviewDate: carePlanData.reviewDate ? new Date(carePlanData.reviewDate) : null,
                      careObjectives: carePlanData.objectives,
                      dailyCareActivities: carePlanData.activities,
                      medicationSchedule: carePlanData.medicationSchedule,
                      dietaryRequirements: carePlanData.dietary,
                      mobilityPlan: carePlanData.mobility,
                      specialInstructions: carePlanData.specialInstructions
                    };
                    
                    await createCarePlan(planPayload);
                    alert('Care plan created successfully!');
                    
                    // Reset form
                    setCarePlanData({
                      startDate: new Date().toISOString().split('T')[0],
                      reviewDate: '',
                      objectives: '',
                      activities: '',
                      medicationSchedule: '',
                      dietary: '',
                      mobility: '',
                      specialInstructions: ''
                    });
                    setShowCarePlanModal(false);
                  } catch (error) {
                    console.error('Error creating care plan:', error);
                    alert('Failed to create care plan: ' + error.message);
                  }
                }}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Create Care Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Client Details Modal */}
      {selectedClient && activeTab === 'clients' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-xl">
                    {(selectedClient.name || selectedClient.fullName || 'C').toString().split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {selectedClient.name || selectedClient.fullName || 'Unknown Client'}
                  </h2>
                  <p className="text-blue-100">Client ID: {selectedClient.id.substring(0, 12)}...</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedClient(null);
                  setClientModalTab('info');
                }}
                className="text-white hover:bg-blue-500 rounded-lg p-2 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="border-b border-gray-200 bg-gray-50">
              <div className="flex space-x-8 px-6">
                <button
                  onClick={() => setClientModalTab('info')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    clientModalTab === 'info'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>Client Info</span>
                  </div>
                </button>
                <button
                  onClick={() => setClientModalTab('medical')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    clientModalTab === 'medical'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Heart className="h-4 w-4" />
                    <span>Medical Report</span>
                  </div>
                </button>
                <button
                  onClick={() => setClientModalTab('carelog')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    clientModalTab === 'carelog'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Care Log</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto max-h-[calc(90vh-160px)] p-6">
              {/* Client Info Tab */}
              {clientModalTab === 'info' && (
                <div className="space-y-6">
                {/* Basic & Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="bg-blue-50 rounded-xl border border-blue-100 p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                      <User className="h-5 w-5 text-blue-600 mr-2" />
                      Basic Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Full Name:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedClient.name || selectedClient.fullName || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Age:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedClient.age || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Gender:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedClient.gender || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Date of Birth:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedClient.dateOfBirth || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          selectedClient.status === 'Active' || selectedClient.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : selectedClient.status === 'Critical' || selectedClient.status === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedClient.status || 'Active'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="bg-green-50 rounded-xl border border-green-100 p-6">
                    <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                      <Phone className="h-5 w-5 text-green-600 mr-2" />
                      Contact Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Phone:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedClient.phone || selectedClient.phoneNumber || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Email:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedClient.email || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Address:</span>
                        <span className="text-sm font-medium text-gray-900 text-right">
                          {selectedClient.address || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="bg-orange-50 rounded-xl border border-orange-100 p-6">
                  <h3 className="text-lg font-semibold text-orange-900 mb-4 flex items-center">
                    <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
                    Emergency Contact
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Contact Name:</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {selectedClient.emergencyContact?.name || selectedClient.emergencyContactName || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Contact Phone:</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {selectedClient.emergencyContact?.phone || selectedClient.emergencyContactPhone || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Relationship:</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {selectedClient.emergencyContact?.relationship || selectedClient.emergencyContactRelationship || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* Medical Report Tab */}
              {clientModalTab === 'medical' && (
                <div className="space-y-6">
                  {/* Medical Conditions */}
                  <div className="bg-red-50 rounded-xl border border-red-100 p-6">
                    <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center">
                      <Heart className="h-5 w-5 text-red-600 mr-2" />
                      Medical Conditions
                    </h3>
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-sm text-gray-900">
                        {Array.isArray(selectedClient.medicalConditions) 
                          ? selectedClient.medicalConditions.join(', ') 
                          : selectedClient.medicalConditions || selectedClient.conditions || 'No medical conditions recorded'}
                      </p>
                    </div>
                  </div>

                  {/* Allergies */}
                  <div className="bg-yellow-50 rounded-xl border border-yellow-100 p-6">
                    <h3 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                      Allergies
                    </h3>
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-sm text-gray-900">
                        {Array.isArray(selectedClient.allergies)
                          ? selectedClient.allergies.join(', ')
                          : selectedClient.allergies || selectedClient.allergyInfo || 'No allergies recorded'}
                      </p>
                    </div>
                  </div>

                  {/* Current Medications */}
                  <div className="bg-green-50 rounded-xl border border-green-100 p-6">
                    <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                      <Pill className="h-5 w-5 text-green-600 mr-2" />
                      Current Medications
                    </h3>
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-sm text-gray-900">
                        {Array.isArray(selectedClient.medications)
                          ? selectedClient.medications.join(', ')
                          : selectedClient.medications || selectedClient.currentMedications || 'No medications recorded'}
                      </p>
                    </div>
                  </div>

                  {/* Additional Medical Notes */}
                  {selectedClient.notes && (
                    <div className="bg-gray-50 rounded-xl border border-gray-100 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <FileText className="h-5 w-5 text-gray-600 mr-2" />
                        Additional Medical Notes
                      </h3>
                      <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-gray-700">{selectedClient.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Role-Specific Medical Actions */}
                  {(isDoctor || isNurse || !isNonMedicalCaregiver) && (
                    <div className="bg-purple-50 rounded-xl border border-purple-100 p-6">
                      <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
                        <Activity className="h-5 w-5 text-purple-600 mr-2" />
                        {isDoctor ? 'Doctor Actions' : isNurse ? 'Nurse Actions' : 'Medical Actions'}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {/* Doctor-specific actions */}
                        {isDoctor && (
                          <>
                            <button
                              onClick={() => {
                                setShowMedicalReportModal(true);
                              }}
                              className="flex flex-col items-center p-4 bg-white border-2 border-blue-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                            >
                              <Stethoscope className="h-6 w-6 text-blue-600 mb-2" />
                              <span className="text-xs font-medium text-gray-700">Write Medical Report</span>
                            </button>
                            
                            <button
                              onClick={() => {
                                setShowCarePlanModal(true);
                              }}
                              className="flex flex-col items-center p-4 bg-white border-2 border-indigo-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all"
                            >
                              <ClipboardList className="h-6 w-6 text-indigo-600 mb-2" />
                              <span className="text-xs font-medium text-gray-700">Create Care Plan</span>
                            </button>

                            <button
                              onClick={() => {
                                setShowMedicationModal(true);
                              }}
                              className="flex flex-col items-center p-4 bg-white border-2 border-green-200 rounded-lg hover:border-green-300 hover:shadow-md transition-all"
                            >
                              <Pill className="h-6 w-6 text-green-600 mb-2" />
                              <span className="text-xs font-medium text-gray-700">Prescribe Medications</span>
                            </button>
                          </>
                        )}

                        {/* Nurse-specific actions */}
                        {isNurse && (
                          <>
                            <button
                              onClick={() => {
                                setShowVitalsModal(true);
                              }}
                              className="flex flex-col items-center p-4 bg-white border-2 border-red-200 rounded-lg hover:border-red-300 hover:shadow-md transition-all"
                            >
                              <Activity className="h-6 w-6 text-red-600 mb-2" />
                              <span className="text-xs font-medium text-gray-700">Record Vitals</span>
                            </button>
                            
                            <button
                              onClick={() => {
                                setShowNurseReportModal(true);
                              }}
                              className="flex flex-col items-center p-4 bg-white border-2 border-orange-200 rounded-lg hover:border-orange-300 hover:shadow-md transition-all"
                            >
                              <FileText className="h-6 w-6 text-orange-600 mb-2" />
                              <span className="text-xs font-medium text-gray-700">Write Nurse Report</span>
                            </button>

                            <button
                              onClick={() => {
                                setShowMedicationModal(true);
                              }}
                              className="flex flex-col items-center p-4 bg-white border-2 border-green-200 rounded-lg hover:border-green-300 hover:shadow-md transition-all"
                            >
                              <Pill className="h-6 w-6 text-green-600 mb-2" />
                              <span className="text-xs font-medium text-gray-700">Manage Medications</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Care Log Tab */}
              {clientModalTab === 'carelog' && (
                <div className="space-y-6">
                  {/* Care Log Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Care Logs & Reports</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {isDoctor && 'Full access to all care logs and medical reports'}
                        {isNurse && 'Record care logs, vital signs, and nurse reports'}
                        {isNonMedicalCaregiver && 'Record daily care activities and observations'}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowCareLogForm(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Care Log
                    </button>
                  </div>

                  {/* Role-Specific Care Actions */}
                  <div className="bg-blue-50 rounded-xl border border-blue-100 p-8">
                    <div className="text-center mb-6">
                      <FileText className="h-16 w-16 text-blue-300 mx-auto mb-4" />
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        {isDoctor && 'Doctor Care Management'}
                        {isNurse && 'Nurse Care Documentation'}
                        {isNonMedicalCaregiver && 'Caregiver Activities Log'}
                      </h4>
                      <p className="text-gray-600">
                        {isDoctor && `Comprehensive care management for ${selectedClient.name || selectedClient.fullName}`}
                        {isNurse && `Document care activities, vital signs, and observations for ${selectedClient.name || selectedClient.fullName}`}
                        {isNonMedicalCaregiver && `Record daily care activities for ${selectedClient.name || selectedClient.fullName}`}
                      </p>
                    </div>

                    {/* Doctor Actions */}
                    {isDoctor && (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                        <button
                          onClick={() => setShowMedicalReportModal(true)}
                          className="flex flex-col items-center p-6 bg-white border-2 border-blue-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                        >
                          <Stethoscope className="h-8 w-8 text-blue-600 mb-3" />
                          <span className="text-sm font-medium text-gray-700">Medical Report</span>
                        </button>

                        <button
                          onClick={() => setShowCarePlanModal(true)}
                          className="flex flex-col items-center p-6 bg-white border-2 border-indigo-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all"
                        >
                          <ClipboardList className="h-8 w-8 text-indigo-600 mb-3" />
                          <span className="text-sm font-medium text-gray-700">Care Plan</span>
                        </button>
                        
                        <button
                          onClick={() => setShowCareLogForm(true)}
                          className="flex flex-col items-center p-6 bg-white border-2 border-green-200 rounded-lg hover:border-green-300 hover:shadow-md transition-all"
                        >
                          <FileText className="h-8 w-8 text-green-600 mb-3" />
                          <span className="text-sm font-medium text-gray-700">View Care Logs</span>
                        </button>

                        <button
                          onClick={() => setShowCareLogsModal(true)}
                          className="flex flex-col items-center p-6 bg-white border-2 border-purple-200 rounded-lg hover:border-purple-300 hover:shadow-md transition-all"
                        >
                          <BarChart3 className="h-8 w-8 text-purple-600 mb-3" />
                          <span className="text-sm font-medium text-gray-700">All Records</span>
                        </button>
                      </div>
                    )}

                    {/* Nurse Actions */}
                    {isNurse && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <button
                          onClick={() => setShowCareLogForm(true)}
                          className="flex flex-col items-center p-6 bg-white border-2 border-blue-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                        >
                          <FileText className="h-8 w-8 text-blue-600 mb-3" />
                          <span className="text-sm font-medium text-gray-700">Write Care Log</span>
                        </button>
                        
                        <button
                          onClick={() => setShowVitalsModal(true)}
                          className="flex flex-col items-center p-6 bg-white border-2 border-red-200 rounded-lg hover:border-red-300 hover:shadow-md transition-all"
                        >
                          <Activity className="h-8 w-8 text-red-600 mb-3" />
                          <span className="text-sm font-medium text-gray-700">Record Vital Signs</span>
                        </button>
                        
                        <button
                          onClick={() => setShowNurseReportModal(true)}
                          className="flex flex-col items-center p-6 bg-white border-2 border-orange-200 rounded-lg hover:border-orange-300 hover:shadow-md transition-all"
                        >
                          <FileText className="h-8 w-8 text-orange-600 mb-3" />
                          <span className="text-sm font-medium text-gray-700">Nurse Report</span>
                        </button>
                      </div>
                    )}

                    {/* Caregiver Actions */}
                    {isNonMedicalCaregiver && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 max-w-2xl mx-auto">
                        <button
                          onClick={() => setShowCareLogForm(true)}
                          className="flex flex-col items-center p-6 bg-white border-2 border-blue-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                        >
                          <FileText className="h-8 w-8 text-blue-600 mb-3" />
                          <span className="text-sm font-medium text-gray-700">Write Care Log</span>
                          <span className="text-xs text-gray-500 mt-1">Record daily activities</span>
                        </button>
                        
                        <button
                          onClick={() => setShowCareLogsModal(true)}
                          className="flex flex-col items-center p-6 bg-white border-2 border-green-200 rounded-lg hover:border-green-300 hover:shadow-md transition-all"
                        >
                          <ClipboardList className="h-8 w-8 text-green-600 mb-3" />
                          <span className="text-sm font-medium text-gray-700">View My Logs</span>
                          <span className="text-xs text-gray-500 mt-1">See your entries</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Recent Care Activities */}
                  <div className="bg-gray-50 rounded-xl border border-gray-100 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Care Activities</h4>
                    <div className="space-y-3">
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Activity className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Vital Signs Recorded</p>
                              <p className="text-xs text-gray-500">Last updated: Check care logs for history</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Care Logs</p>
                              <p className="text-xs text-gray-500">Click "View All Logs" to see complete history</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setSelectedClient(null);
                  setClientModalTab('info');
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
              {isNurse && clientModalTab !== 'carelog' && (
                <button
                  onClick={() => {
                    setClientModalTab('carelog');
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Care Logs
                </button>
              )}
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </InstitutionCaregiverGuard>
  );
};

export default InstitutionCaregiverDashboard;