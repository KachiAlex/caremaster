import React, { useState, useEffect } from 'react';
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
  HelpCircle
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { caregiverAPI } from '../api/caregiverAPI';
import { getCareTasksByCaregiver, getTodayTasks, getUpcomingTasks } from '../api/careTasksAPI';
import { getTodaysAppointments, getUpcomingAppointments } from '../api/appointmentsAPI';
import { getClientsByDoctor, getClientById } from '../api/patientsAPI';
import { assignmentAPI } from '../api/assignmentAPI';
import { startTask, completeTask } from '../api/taskTimeTrackingAPI';
import { emergencyAPI } from '../api/emergencyAPI';
import CaregiverGuard from '../components/CaregiverGuard';
import CaregiverSettings from '../components/CaregiverSettings';
import UserAvatarDropdown from '../components/UserAvatarDropdown';
import DashboardLayout from '../components/DashboardLayout';
import NurseVitalsInput from '../components/NurseVitalsInput';
import NurseCareLogs from '../components/NurseCareLogs';
import NurseReportGenerator from '../components/NurseReportGenerator';
import NurseMedicationManager from '../components/NurseMedicationManager';
import CallService from '../services/callService';
import CallInterface from '../components/CallInterface';
import AssignmentCalendar from '../components/AssignmentCalendar';
import { toast } from 'react-toastify';

const CaregiverDashboard = () => {
  const { user, userProfile, institutionId, institutionData } = useUser();
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
  const [profileImage, setProfileImage] = useState(null);
  
  // Call-related states
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDetailsModal, setShowTaskDetailsModal] = useState(false);
  const [callService] = useState(() => new CallService());

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

        // If doctor, load assigned clients STRICTLY from admin-created assignments
        const isDoctor = (userProfile.medicalQualification || '').includes('Doctor');
        if (isDoctor) {
          let clients = [];
          try {
            const assignments = await assignmentAPI.getAssignmentsByCaregiver(user?.uid);
            const uniqueClientIds = Array.from(new Set(assignments.map(a => a.clientId).filter(Boolean)));
            const fetched = await Promise.all(uniqueClientIds.map(pid => getClientById(pid).catch(() => null)));
            clients = fetched.filter(Boolean);
          } catch (error) {
            console.log('No client assignments found - this is normal for new users');
          }
          
          // Fallback to clients.assignedDoctor only if no assignment docs found
          if ((!clients || clients.length === 0) && user?.uid) {
            try {
              const alt = await getClientsByDoctor(user.uid, institutionId);
              clients = alt || [];
            } catch (error) {
              console.log('No clients assigned to doctor - contact admin for client assignments');
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
        const [todaysAppointments, todaysTasks, assignments] = await Promise.all([
          getTodaysAppointments(user?.uid, 'caregiver'),
          getTodayTasks(user?.uid),
          assignmentAPI.getAssignmentsByCaregiver(user?.uid).catch(() => [])
        ]);
        
        // Convert assignments to task format for today's schedule
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const assignmentTasks = assignments
          .filter(a => {
            if (!a.dueDate) return false;
            const dueDate = new Date(a.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate.getTime() === today.getTime();
          })
          .map(assignment => ({
            id: assignment.id,
            type: 'task',
            title: assignment.title || 'Assigned Task',
            time: assignment.dueTime ? `${assignment.dueTime}:00` : '09:00:00',
            scheduledTime: assignment.dueDate ? new Date(`${assignment.dueDate}T${assignment.dueTime || '09:00'}`) : new Date(),
            client: assignment.clientName || 'Client',
            status: assignment.status || 'pending',
            priority: assignment.priority || 'normal',
            description: assignment.description,
            instructions: assignment.instructions,
            assignmentType: 'clientAssignment'
          }));
        
        // Combine appointments, tasks, and assignments for today's schedule
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
          ...assignmentTasks
        ];
        
        // Sort by time
        combinedSchedule.sort((a, b) => new Date(a.time) - new Date(b.time));
        setTodaySchedule(combinedSchedule);
        
        // Load recent tasks
        let loadedRecentTasks = [];
        if (user?.uid) {
          try {
            loadedRecentTasks = await getCareTasksByCaregiver(user.uid);
            setRecentTasks(loadedRecentTasks.slice(0, 5)); // Show only last 5 tasks
          } catch (error) {
            console.log('No recent tasks found - this is normal for new users');
            setRecentTasks([]);
          }
        } else {
          setRecentTasks([]);
        }
        
        // Load performance data with calculated metrics
        const completedCount = loadedRecentTasks.filter(task => task.status === 'completed').length;
        const totalCount = loadedRecentTasks.length;
        const taskCompletion = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        
        setPerformance({
          completedTasks: completedCount,
          totalTasks: totalCount,
          rating: caregiver?.rating || 0,
          hoursWorked: caregiver?.thisMonthEarnings ? Math.round(caregiver.thisMonthEarnings / 50) : 0, // Estimate based on earnings
          punctuality: 95, // Placeholder - would need attendance data
          taskCompletion: taskCompletion,
          clientSatisfaction: caregiver?.rating || 'N/A',
          communication: caregiver?.rating || 'N/A',
          safety: 100 // Placeholder - would need incident data
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
    
    // Set up real-time subscription for assignments (for doctors)
    const isDoctor = (userProfile?.medicalQualification || '').includes('Doctor');
    if (isDoctor && user?.uid) {
      const unsubscribe = assignmentAPI.subscribeToAssignments((assignments) => {
        console.log(`Real-time update: Found ${assignments.length} client assignments for doctor ${user.uid}`);
        
        // Filter assignments for this specific caregiver
        const caregiverAssignments = assignments.filter(a => a.caregiverId === user.uid);
        const uniqueClientIds = Array.from(new Set(caregiverAssignments.map(a => a.clientId).filter(Boolean)));
        Promise.all(uniqueClientIds.map(pid => getClientById(pid).catch(() => null)))
          .then(fetched => {
            const clients = fetched.filter(Boolean);
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
      }, user.uid);
      
      return () => unsubscribe();
    }
  }, [userProfile, user?.uid, selectedClientId]);

  useEffect(() => {
    // when selectedClientId changes, refresh selectedClient from cache/list
    if (!selectedClientId) {
      setSelectedClient(null);
      return;
    }
    const found = assignedClients.find(p => p.id === selectedClientId);
    if (found) setSelectedClient(found);
  }, [selectedClientId, assignedClients]);

  // Set up incoming call listener
  useEffect(() => {
    if (!userProfile || (!userProfile.id && !userProfile.uid)) {
      return;
    }
    
    const userId = userProfile.id || userProfile.uid || user?.uid;
    console.log('🎧 Setting up call listener for user:', userId, 'role:', userProfile.userType);
    
    const unsubscribe = callService.listenForIncomingCalls(userId, (callNotification) => {
      console.log('📞 Incoming call notification:', callNotification);
      
      if (callNotification.status === 'incoming') {
        setIncomingCall({
          callId: callNotification.callId,
          callerId: callNotification.callerId,
          callType: callNotification.callType,
          timestamp: callNotification.timestamp
        });
        toast.info(`Incoming ${callNotification.callType} call...`);
      }
    });
    
    return () => {
      console.log('🔌 Cleaning up call listener');
      if (unsubscribe) unsubscribe();
    };
  }, [userProfile, user, callService]);

  // Handle incoming call acceptance
  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    
    try {
      const userId = userProfile.id || userProfile.uid || user?.uid;
      await callService.answerCall(incomingCall.callId, userId);
      
      setActiveCall({
        callId: incomingCall.callId,
        participantId: incomingCall.callerId,
        participantName: 'Caller',
        callType: incomingCall.callType
      });
      setIncomingCall(null);
      console.log('✅ Call accepted');
      toast.success('Call accepted');
    } catch (error) {
      console.error('Error accepting call:', error);
      toast.error('Failed to accept call');
    }
  };

  // Handle incoming call rejection
  const handleRejectCall = async () => {
    if (!incomingCall) return;
    
    try {
      const userId = userProfile.id || userProfile.uid || user?.uid;
      await callService.rejectCall(incomingCall.callId, userId);
      setIncomingCall(null);
      console.log('❌ Call rejected');
      toast.info('Call rejected');
    } catch (error) {
      console.error('Error rejecting call:', error);
      toast.error('Failed to reject call');
    }
  };

  // Handle active call end
  const handleEndCall = async () => {
    if (!activeCall) return;
    
    try {
      await callService.endCall(activeCall.callId);
      setActiveCall(null);
      console.log('✅ Call ended');
      toast.info('Call ended');
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

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

  const handleClockIn = async (scheduleId) => {
    if (!user?.uid) {
      toast.error('User not authenticated');
      return;
    }
    
    try {
      // Find the schedule item to get task ID
      const scheduleItem = todaySchedule.find(s => s.id === scheduleId);
      if (!scheduleItem) {
        toast.error('Schedule item not found');
        return;
      }
      
      // If it's a task, use task time tracking API
      if (scheduleItem.type === 'task' && scheduleItem.id) {
        await startTask(scheduleItem.id, user.uid);
        toast.success('Task started successfully');
        // Reload schedule to reflect changes
        const loadCaregiverData = async () => {
          // Reload today's schedule
          const [todaysAppointments, todaysTasks, assignments] = await Promise.all([
            getTodaysAppointments(user?.uid, 'caregiver'),
            getTodayTasks(user?.uid),
            assignmentAPI.getAssignmentsByCaregiver(user?.uid).catch(() => [])
          ]);
          
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const assignmentTasks = assignments
            .filter(a => {
              if (!a.dueDate) return false;
              const dueDate = new Date(a.dueDate);
              dueDate.setHours(0, 0, 0, 0);
              return dueDate.getTime() === today.getTime();
            })
            .map(assignment => ({
              id: assignment.id,
              type: 'task',
              title: assignment.title || 'Assigned Task',
              time: assignment.dueTime ? `${assignment.dueTime}:00` : '09:00:00',
              scheduledTime: assignment.dueDate ? new Date(`${assignment.dueDate}T${assignment.dueTime || '09:00'}`) : new Date(),
              client: assignment.clientName || 'Client',
              status: assignment.status || 'pending',
              priority: assignment.priority || 'normal',
              description: assignment.description,
              instructions: assignment.instructions,
              assignmentType: 'clientAssignment'
            }));
          
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
            ...assignmentTasks
          ];
          
          combinedSchedule.sort((a, b) => new Date(a.time) - new Date(b.time));
          setTodaySchedule(combinedSchedule);
        };
        loadCaregiverData();
      } else {
        toast.info('Clock in is only available for tasks');
      }
    } catch (error) {
      console.error('Error clocking in:', error);
      toast.error(error.message || 'Failed to clock in');
    }
  };

  // --- Role-specific UI helpers ---
  const isDoctor = (userProfile?.medicalQualification || '').includes('Doctor');
  const isNurse = (userProfile?.medicalQualification || '').includes('Nurse');
  const isMedicalProfessional = isDoctor || isNurse;
  const isNonMedicalCaregiver = !isMedicalProfessional;

  const renderDoctorClientSelector = () => {
    if (!isDoctor) return null;
    return (
      <div className="bg-white rounded-lg border p-4 mb-4 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="w-full xl:max-w-md">
            <div className="text-sm text-gray-600">Assigned Clients</div>
            <select
              className="mt-1 w-full sm:w-72 px-3 py-2 border rounded-md"
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
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button onClick={handleNewConsultation} className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50 text-sm" disabled={!selectedClientId}>New Consultation</button>
            <button onClick={handleWritePrescription} className="px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-50 text-sm" disabled={!selectedClientId}>Write Prescription</button>
            <button onClick={handleCreateCarePlan} className="px-3 py-2 bg-emerald-600 text-white rounded disabled:opacity-50 text-sm" disabled={!selectedClientId}>Create Care Plan</button>
            <button onClick={handleVideoConsultation} className="px-3 py-2 bg-purple-600 text-white rounded disabled:opacity-50 text-sm" disabled={!selectedClientId}>Video Consultation</button>
          </div>
        </div>
        {selectedClient && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
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

  const handleClockOut = async (scheduleId) => {
    if (!user?.uid) {
      toast.error('User not authenticated');
      return;
    }
    
    try {
      // Find the schedule item to get task ID
      const scheduleItem = todaySchedule.find(s => s.id === scheduleId);
      if (!scheduleItem) {
        toast.error('Schedule item not found');
        return;
      }
      
      // If it's a task, use task time tracking API to complete it
      if (scheduleItem.type === 'task' && scheduleItem.id) {
        await completeTask(scheduleItem.id, user.uid, 'Completed via clock out');
        toast.success('Task completed successfully');
        // Reload schedule to reflect changes
        const [todaysAppointments, todaysTasks, assignments] = await Promise.all([
          getTodaysAppointments(user?.uid, 'caregiver'),
          getTodayTasks(user?.uid),
          assignmentAPI.getAssignmentsByCaregiver(user?.uid).catch(() => [])
        ]);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const assignmentTasks = assignments
          .filter(a => {
            if (!a.dueDate) return false;
            const dueDate = new Date(a.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate.getTime() === today.getTime();
          })
          .map(assignment => ({
            id: assignment.id,
            type: 'task',
            title: assignment.title || 'Assigned Task',
            time: assignment.dueTime ? `${assignment.dueTime}:00` : '09:00:00',
            scheduledTime: assignment.dueDate ? new Date(`${assignment.dueDate}T${assignment.dueTime || '09:00'}`) : new Date(),
            client: assignment.clientName || 'Client',
            status: assignment.status || 'pending',
            priority: assignment.priority || 'normal',
            description: assignment.description,
            instructions: assignment.instructions,
            assignmentType: 'clientAssignment'
          }));
        
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
          ...assignmentTasks
        ];
        
        combinedSchedule.sort((a, b) => new Date(a.time) - new Date(b.time));
        setTodaySchedule(combinedSchedule);
      } else {
        toast.info('Clock out is only available for tasks');
      }
    } catch (error) {
      console.error('Error clocking out:', error);
      toast.error(error.message || 'Failed to clock out');
    }
  };

  const handleTaskComplete = async (taskId) => {
    if (!user?.uid) {
      toast.error('User not authenticated');
      return;
    }
    
    try {
      await completeTask(taskId, user.uid, 'Task completed');
      toast.success('Task completed successfully');
      // Reload recent tasks
      const loadedRecentTasks = await getCareTasksByCaregiver(user.uid);
      setRecentTasks(loadedRecentTasks.slice(0, 5));
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error(error.message || 'Failed to complete task');
    }
  };

  const handleEmergency = async (clientId) => {
    if (!user?.uid || !clientId) {
      toast.error('Missing required information');
      return;
    }
    
    try {
      const client = assignedClients.find(c => c.id === clientId) || selectedClient;
      const result = await emergencyAPI.triggerEmergencyAlert({
        userId: clientId,
        caregiverId: user.uid,
        type: 'medical',
        severity: 'high',
        location: client?.address || client?.location || 'Unknown location',
        description: `Emergency assistance requested by caregiver ${userProfile?.name || 'Caregiver'} for client ${client?.name || client?.fullName || 'Client'}`
      });
      
      if (result.success) {
        toast.success('Emergency alert sent! Help is on the way.');
      } else {
        toast.error('Failed to send emergency alert');
      }
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      toast.error('Failed to send emergency alert. Please call emergency services directly.');
    }
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
    if (!timeString) return 'Time not set';
    
    // Handle Date objects
    if (timeString instanceof Date) {
      return timeString.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Handle ISO strings
    if (typeof timeString === 'string' && timeString.includes('T')) {
      const date = new Date(timeString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    }
    
    // Handle time strings like "09:00:00" or "09:00"
    if (typeof timeString === 'string') {
      const timeMatch = timeString.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2];
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
        return `${displayHours}:${minutes} ${period}`;
      }
    }
    
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
    if (!selectedClient) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Client Selected</h3>
          <p className="text-gray-600 mb-4">
            {isDoctor 
              ? "Please select a client from the dropdown above to view their information and provide care."
              : "Please select a client to record vital signs and care logs."
            }
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Client Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white font-semibold text-xl">
                  {(selectedClient.name || selectedClient.fullName || 'P').split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedClient.name || selectedClient.fullName || 'Unknown Client'}
                </h2>
                <p className="text-gray-600">Client ID: {selectedClient.id}</p>
                {selectedClient.age && (
                  <p className="text-sm text-gray-500">Age: {selectedClient.age}</p>
                )}
              </div>
            </div>
            
            {/* Nurse-specific actions */}
            {isNurse && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowVitalsModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Record Vitals
                </button>
                <button
                  onClick={() => setShowCareLogsModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Care Logs
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Client Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 text-blue-600 mr-2" />
              Basic Information
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Name:</span>
                <p className="font-medium text-gray-900">{selectedClient.name || selectedClient.fullName || 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Age:</span>
                <p className="font-medium text-gray-900">{selectedClient.age || 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Gender:</span>
                <p className="font-medium text-gray-900">{selectedClient.gender || 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Phone:</span>
                <p className="font-medium text-gray-900">{selectedClient.phone || selectedClient.phoneNumber || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Heart className="h-5 w-5 text-red-600 mr-2" />
              Medical Information
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Medical Conditions:</span>
                <p className="font-medium text-gray-900">
                  {selectedClient.medicalConditions?.join(', ') || selectedClient.conditions || 'None recorded'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Allergies:</span>
                <p className="font-medium text-gray-900">
                  {selectedClient.allergies?.join(', ') || selectedClient.allergyInfo || 'None recorded'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Current Medications:</span>
                <p className="font-medium text-gray-900">
                  {selectedClient.medications?.join(', ') || selectedClient.currentMedications || 'None recorded'}
                </p>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Phone className="h-5 w-5 text-green-600 mr-2" />
              Emergency Contact
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Contact Name:</span>
                <p className="font-medium text-gray-900">
                  {selectedClient.emergencyContact?.name || selectedClient.emergencyContactName || 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Contact Phone:</span>
                <p className="font-medium text-gray-900">
                  {selectedClient.emergencyContact?.phone || selectedClient.emergencyContactPhone || 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Relationship:</span>
                <p className="font-medium text-gray-900">
                  {selectedClient.emergencyContact?.relationship || selectedClient.emergencyContactRelationship || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Nurse-specific Quick Actions */}
        {isNurse && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Nurse Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => setShowVitalsModal(true)}
                className="flex flex-col items-center p-4 border-2 border-red-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
              >
                <Activity className="h-8 w-8 text-red-600 mb-2" />
                <span className="text-sm font-medium text-gray-700">Record Vital Signs</span>
              </button>
              
              <button
                onClick={() => setShowCareLogsModal(true)}
                className="flex flex-col items-center p-4 border-2 border-blue-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <FileText className="h-8 w-8 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-gray-700">Add Care Log</span>
              </button>
              
              <button
                onClick={() => setShowNurseReportModal(true)}
                className="flex flex-col items-center p-4 border-2 border-orange-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors"
              >
                <FileText className="h-8 w-8 text-orange-600 mb-2" />
                <span className="text-sm font-medium text-gray-700">Generate Report</span>
              </button>
              
              <button
                onClick={() => setShowMedicationModal(true)}
                className="flex flex-col items-center p-4 border-2 border-green-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
              >
                <Pill className="h-8 w-8 text-green-600 mb-2" />
                <span className="text-sm font-medium text-gray-700">Medications</span>
              </button>
              
              <button className="flex flex-col items-center p-4 border-2 border-purple-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors">
                <Camera className="h-8 w-8 text-purple-600 mb-2" />
                <span className="text-sm font-medium text-gray-700">Photo Update</span>
              </button>
            </div>
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

  // CareMaster design system - tabs for DashboardLayout sidebar
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'clients', label: 'Clients', icon: Users },
    ...(isNonMedicalCaregiver ? [
      { id: 'prescriptions', label: 'Prescriptions (View)', icon: Pill },
      { id: 'consultations', label: 'Consultations (View)', icon: Stethoscope },
      { id: 'diagnostics', label: 'Diagnostics (View)', icon: FileText },
    ] : []),
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help & Support', icon: HelpCircle },
  ];

  const activeTabLabel = tabs.find((t) => t.id === activeTab)?.label || 'Dashboard';
  const displayName = userProfile?.name || caregiver?.name || userProfile?.displayName || 'Caregiver';

  const handleLogout = () => {
    import('backend/auth').then(({ signOut, getAuth }) => {
      signOut(getAuth()).then(() => {
        window.location.href = '/login';
      }).catch((error) => {
        console.error('Error signing out:', error);
      });
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 cm-dashboard-body">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <CaregiverGuard>
    <div className="min-h-screen cm-dashboard-body">
      <DashboardLayout
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setShowSettings(tab === 'settings');
        }}
        institutionName={dashboardConfig.title || 'Caregiver Portal'}
        portalLabel="Caregiver"
        displayName={displayName}
        userEmail={userProfile?.email || user?.email || ''}
        profilePictureUrl={profileImage || userProfile?.photoURL || userProfile?.profilePicture}
        onLogout={handleLogout}
        headerActions={
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="cm-btn-gold"
            title="Profile Settings"
          >
            <User className="h-4 w-4 mr-2" />
            <span className="hidden lg:inline">Profile</span>
          </button>
        }
      >
        <div className="space-y-6">
          <div className="cm-section-head">
            <span className="cm-eyebrow">{activeTabLabel}</span>
            <h2 className="mt-2">{dashboardConfig.title}</h2>
            <p>Welcome back, {displayName}. {userProfile?.medicalQualification || 'Healthcare Professional'}</p>
            {institutionId && (
              <p className="text-sm text-sage flex items-center gap-1 mt-1">
                <Shield className="h-3 w-3" />
                {institutionData?.name || `Institution: ${institutionId.slice(0, 8)}...`}
              </p>
            )}
          </div>

        {/* Doctor Client Selector (if doctor) */}
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 pt-3 sm:pt-4 md:pt-6">
          {renderDoctorClientSelector()}
        </div>

        {/* Main Content */}
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6">
        {showSettings ? (
          <CaregiverSettings onProfileImageUpdate={updateProfileImage} />
        ) : activeTab === 'clients' ? (
          renderClientsTab()
        ) : activeTab === 'prescriptions' ? (
          renderPrescriptionsTab()
        ) : activeTab === 'consultations' ? (
          renderConsultationsTab()
        ) : activeTab === 'diagnostics' ? (
          renderDiagnosticsTab()
        ) : (
          <div className="space-y-6">
          {/* Qualification-Specific Quick Actions */}
          <div className="cm-card p-6">
            <h2 className="cm-display text-lg text-ink mb-4">Quick Actions for {userProfile?.medicalQualification || 'Healthcare Professional'}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {dashboardConfig.quickActions.map((action, index) => (
                <a
                  key={index}
                  href={action.href}
                  className="flex flex-col items-center p-4 rounded-lg border-2 border-ink/10 hover:border-gold hover:bg-gold-soft/30 transition-colors group"
                >
                  <action.icon className="h-8 w-8 text-gold-deep mb-2 group-hover:text-gold" />
                  <span className="text-sm font-medium text-ink text-center">{action.name}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="cm-card p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="cm-mono text-xs uppercase tracking-wider text-text-soft mb-1">Today's Visits</p>
                  <p className="text-3xl font-bold text-ink">{todaySchedule.length}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="cm-card p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="cm-mono text-xs uppercase tracking-wider text-text-soft mb-1">Completed Tasks</p>
                  <p className="text-3xl font-bold text-ink">{recentTasks.filter(t => t.status === 'completed').length}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>
            <div className="cm-card p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="cm-mono text-xs uppercase tracking-wider text-text-soft mb-1">Rating</p>
                  <p className="text-3xl font-bold text-ink">{caregiver?.rating}</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-xl">
                  <Star className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
            </div>
            <div className="cm-card p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="cm-mono text-xs uppercase tracking-wider text-text-soft mb-1">This Month</p>
                  <p className="text-3xl font-bold text-ink">₦{(caregiver?.thisMonthEarnings || 0).toLocaleString()}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Assignment Calendar */}
          <AssignmentCalendar
            schedule={todaySchedule.map(s => ({
              id: s.id,
              type: s.type || 'task',
              title: s.clientName || s.title || 'Task',
              time: s.time || s.scheduledTime || '',
              client: s.clientName || 'Client',
              status: s.status || 'pending',
              priority: s.priority
            }))}
            onItemSelect={(item) => {
              const scheduleItem = todaySchedule.find(s => s.id === item.id);
              if (scheduleItem) {
                setSelectedTask(scheduleItem);
                setShowTaskDetailsModal(true);
              }
            }}
          />

          {/* Today's Schedule */}
          <div className="cm-card">
            <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-ink/8">
              <h2 className="cm-display text-xl text-ink">Today's Schedule</h2>
            </div>
            <div className="p-4 sm:p-6 lg:p-8">
              {todaySchedule.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-ink/20 mx-auto mb-4" />
                  <h3 className="cm-display text-lg text-ink mb-2">No Schedule for Today</h3>
                  <p className="text-text-soft">You have no appointments, tasks, or assignments scheduled for today.</p>
                </div>
              ) : (
              <div className="space-y-6">
                {todaySchedule.map((schedule) => (
                  <div key={schedule.id} className="border border-ink/10 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-4 mb-4">
                          <h3 className="cm-display text-xl text-ink">{schedule.clientName}</h3>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(schedule.status)}`}>
                            {schedule.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-text-soft mb-4">
                          <div className="flex items-center">
                            <Clock className="h-5 w-5 mr-2 text-text-soft" />
                            <span className="font-medium">
                              {schedule.time ? formatTime(schedule.time) : 'Time not set'}
                              {schedule.duration && ` (${schedule.duration})`}
                            </span>
                          </div>
                          {schedule.address && (
                          <div className="flex items-center">
                            <MapPin className="h-5 w-5 mr-2 text-text-soft" />
                            <span className="font-medium">{schedule.address}</span>
                          </div>
                          )}
                        </div>

                        {schedule.tasks && Array.isArray(schedule.tasks) && schedule.tasks.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-ink mb-3">Tasks:</h4>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {schedule.tasks.map((task, index) => (
                              <li key={index} className="flex items-center text-sm text-text-soft">
                                <div className="w-2 h-2 bg-gold rounded-full mr-3"></div>
                                {task}
                              </li>
                            ))}
                          </ul>
                        </div>
                        )}
                        {schedule.description && (
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-ink mb-2">Description:</h4>
                            <p className="text-sm text-text-soft">{schedule.description}</p>
                          </div>
                        )}
                        {schedule.instructions && (
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-ink mb-2">Instructions:</h4>
                            <p className="text-sm text-text-soft">{schedule.instructions}</p>
                          </div>
                        )}
                        {schedule.notes && (
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-ink mb-2">Notes:</h4>
                            <p className="text-sm text-text-soft bg-cream/50 p-3 rounded-lg">{schedule.notes}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-3 w-full lg:w-auto">
                        <button
                          onClick={() => handleClockIn(schedule.id)}
                          className="cm-btn-gold w-full sm:w-auto"
                        >
                          Clock In
                        </button>
                        <button
                          onClick={() => handleClockOut(schedule.id)}
                          className="w-full sm:w-auto px-6 py-3 bg-ink text-white rounded-lg hover:bg-ink/90 transition-colors font-medium"
                        >
                          Clock Out
                        </button>
                        <button
                          onClick={() => handleEmergency(schedule.clientId || schedule.client?.id)}
                          className="w-full sm:w-auto px-6 py-3 bg-coral text-white rounded-lg hover:bg-coral/90 transition-colors font-medium flex items-center justify-center"
                          disabled={!schedule.clientId && !schedule.client?.id}
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Emergency
                        </button>

                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>

          {/* Recent Tasks */}
          <div className="cm-card">
            <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-ink/8">
              <h2 className="cm-display text-xl text-ink">Recent Tasks</h2>
            </div>
            <div className="p-4 sm:p-6 lg:p-8">
              {recentTasks.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-ink/20 mx-auto mb-4" />
                  <h3 className="cm-display text-lg text-ink mb-2">No Recent Tasks</h3>
                  <p className="text-text-soft">You haven't completed any tasks yet.</p>
                </div>
              ) : (
              <div className="space-y-4">
                {recentTasks.map((task) => (
                  <div key={task.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border border-ink/10 rounded-xl hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-ink">{task.task}</h4>

                        <p className="text-sm text-text-soft">{task.clientName}</p>
                        <p className="text-xs text-text-soft">
                          {new Date(task.completedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:space-x-3 w-full sm:w-auto">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                      <button className="w-full sm:w-auto p-2 text-gold-deep hover:text-gold hover:bg-gold-soft/30 rounded-lg transition-colors">
                        <Eye className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>

          {/* Performance Overview */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="cm-card">
              <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-ink/8">
                <h2 className="cm-display text-xl text-ink">Performance Overview</h2>
              </div>
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-ink">Punctuality</span>
                    <div className="flex items-center">
                      <div className="w-40 bg-ink/10 rounded-full h-3 mr-4">
                        <div className="bg-sage h-3 rounded-full" style={{ width: `${performance.punctuality || 0}%` }}></div>
                      </div>
                      <span className="text-lg font-bold text-ink">{performance.punctuality || 0}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-ink">Task Completion</span>
                    <div className="flex items-center">
                      <div className="w-40 bg-ink/10 rounded-full h-3 mr-4">
                        <div className="bg-gold h-3 rounded-full" style={{ width: `${performance.taskCompletion || 0}%` }}></div>
                      </div>
                      <span className="text-lg font-bold text-ink">{performance.taskCompletion || 0}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-ink">Client Satisfaction</span>
                    <div className="flex items-center">
                      <Star className="h-5 w-5 text-gold mr-2" />
                      <span className="text-lg font-bold text-ink">
                        {typeof performance.clientSatisfaction === 'number' ? performance.clientSatisfaction.toFixed(1) : performance.clientSatisfaction || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-ink">Communication</span>
                    <div className="flex items-center">
                      <Star className="h-5 w-5 text-gold mr-2" />
                      <span className="text-lg font-bold text-ink">
                        {typeof performance.communication === 'number' ? performance.communication.toFixed(1) : performance.communication || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-ink">Safety Record</span>
                    <div className="flex items-center">
                      <div className="w-40 bg-ink/10 rounded-full h-3 mr-4">
                        <div className="bg-sage h-3 rounded-full" style={{ width: `${performance.safety || 0}%` }}></div>
                      </div>
                      <span className="text-lg font-bold text-ink">{performance.safety || 0}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="cm-card">
              <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-ink/8">
                <h2 className="cm-display text-xl text-ink">Quick Actions</h2>
              </div>
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <button className="flex flex-col items-center justify-center p-4 sm:p-6 border border-ink/10 rounded-xl hover:bg-cream hover:shadow-md transition-all">
                    <MessageSquare className="h-8 w-8 text-gold-deep mb-3" />
                    <span className="text-sm font-semibold text-ink">Messages</span>
                  </button>
                  <button className="flex flex-col items-center justify-center p-4 sm:p-6 border border-ink/10 rounded-xl hover:bg-cream hover:shadow-md transition-all">
                    <Camera className="h-8 w-8 text-sage mb-3" />
                    <span className="text-sm font-semibold text-ink">Photo Update</span>
                  </button>
                  <button className="flex flex-col items-center justify-center p-4 sm:p-6 border border-ink/10 rounded-xl hover:bg-cream hover:shadow-md transition-all">
                    <FileText className="h-8 w-8 text-gold-deep mb-3" />
                    <span className="text-sm font-semibold text-ink">Add Note</span>
                  </button>
                  <button className="flex flex-col items-center justify-center p-4 sm:p-6 border border-ink/10 rounded-xl hover:bg-cream hover:shadow-md transition-all">
                    <Navigation className="h-8 w-8 text-coral mb-3" />
                    <span className="text-sm font-semibold text-ink">Navigation</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
        </div>
        </div>
      </DashboardLayout>

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
      
      {/* Incoming Call Interface */}
      {incomingCall && (
        <CallInterface
          isOpen={!!incomingCall}
          onClose={handleRejectCall}
          callType={incomingCall.callType}
          participantInfo={{
            id: incomingCall.callerId,
            name: 'Incoming Call',
            role: 'user'
          }}
          isIncoming={true}
          onCallAccepted={handleAcceptCall}
          onCallRejected={handleRejectCall}
        />
      )}
      
      {/* Active Call Interface */}
      {activeCall && (
        <CallInterface
          isOpen={!!activeCall}
          onClose={handleEndCall}
          callType={activeCall.callType}
          participantInfo={{
            id: activeCall.participantId,
            name: activeCall.participantName,
            role: 'user'
          }}
          isIncoming={false}
        />
      )}
    </div>
    </CaregiverGuard>
  );
};

export default CaregiverDashboard;
