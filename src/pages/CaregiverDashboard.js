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
  UserCheck
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { caregiverAPI } from '../api/caregiverAPI';
import { getCareTasksByCaregiver, getTodayTasks, getUpcomingTasks } from '../api/careTasksAPI';
import { getTodaysAppointments, getUpcomingAppointments } from '../api/appointmentsAPI';
import { getPatientsByDoctor, getPatientById } from '../api/patientsAPI';
import { assignmentAPI } from '../api/assignmentAPI';
import CaregiverGuard from '../components/CaregiverGuard';
import CaregiverSettings from '../components/CaregiverSettings';
import NurseVitalsInput from '../components/NurseVitalsInput';
import NurseCareLogs from '../components/NurseCareLogs';
import NurseReportGenerator from '../components/NurseReportGenerator';
import NurseMedicationManager from '../components/NurseMedicationManager';

const CaregiverDashboard = () => {
  const { user, userProfile, institutionId, institutionData } = useUser();
  const [caregiver, setCaregiver] = useState(null);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [performance, setPerformance] = useState({});
  const [loading, setLoading] = useState(true);
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showCareLogsModal, setShowCareLogsModal] = useState(false);
  const [showNurseReportModal, setShowNurseReportModal] = useState(false);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [profileImage, setProfileImage] = useState(null);

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
        features: ['patient-care', 'medications', 'vital-signs', 'care-plans'],
        quickActions: [
          { name: 'Patient Rounds', icon: User, href: '/service-provider/patients' },
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
          { name: 'Progress Notes', icon: TrendingUp, href: '/service-provider/patients' },
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
          { name: 'Patient Education', icon: FileText, href: '/service-provider/patients' }
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
          { name: 'Patient Reports', icon: FileText, href: '/service-provider/patients' }
        ]
      }
    };

    return configs[qualification] || {
      title: 'Caregiver Dashboard',
      icon: UserCheck,
      color: 'gray',
      features: ['patient-care', 'basic-assistance', 'companionship'],
      quickActions: [
        { name: 'Patient Care', icon: User, href: '/service-provider/patients' },
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
              totalPatients: 0,
              currentPatients: 0,
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
            totalPatients: 0,
            currentPatients: 0,
            specializations: userProfile?.specializations || [],
            location: userProfile?.location || 'Lagos, Nigeria',
            experience: userProfile?.experience || '0 years',
            thisMonthEarnings: 0,
            lastMonthEarnings: 0,
            totalEarnings: 0,
            ...userProfile
          });
        }

        // If doctor, load assigned patients STRICTLY from admin-created assignments
        const isDoctor = (userProfile.medicalQualification || '').includes('Doctor');
        if (isDoctor) {
          let patients = [];
          try {
            const assignments = await assignmentAPI.getAssignmentsByCaregiver(user?.uid);
            const uniquePatientIds = Array.from(new Set(assignments.map(a => a.patientId).filter(Boolean)));
            const fetched = await Promise.all(uniquePatientIds.map(pid => getPatientById(pid).catch(() => null)));
            patients = fetched.filter(Boolean);
          } catch (error) {
            console.log('No patient assignments found - this is normal for new users');
          }
          
          // Fallback to patients.assignedDoctor only if no assignment docs found
          if ((!patients || patients.length === 0) && user?.uid) {
            try {
              const alt = await getPatientsByDoctor(user.uid, institutionId);
              patients = alt || [];
            } catch (error) {
              console.log('No patients assigned to doctor - contact admin for patient assignments');
            }
          }
          
          setAssignedPatients(patients);
          // Auto-select first patient if not set
          if (patients.length > 0 && !selectedPatientId) {
            setSelectedPatientId(patients[0].id);
            setSelectedPatient(patients[0]);
          }
        }
        
        // Load today's schedule (appointments + tasks)
        const [todaysAppointments, todaysTasks] = await Promise.all([
          getTodaysAppointments(user?.uid, 'caregiver'),
          getTodayTasks(user?.uid)
        ]);
        
        // Combine appointments and tasks for today's schedule
        const combinedSchedule = [
          ...todaysAppointments.map(apt => ({
            id: apt.id,
            type: 'appointment',
            title: apt.title || 'Appointment',
            time: apt.scheduledTime,
            patient: apt.patientName || 'Patient',
            status: apt.status || 'scheduled'
          })),
          ...todaysTasks.map(task => ({
            id: task.id,
            type: 'task',
            title: task.title,
            time: task.scheduledTime,
            patient: task.patientName || 'Patient',
            status: task.status || 'pending'
          }))
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
        
        // Load performance data (placeholder for now)
        setPerformance({
          completedTasks: loadedRecentTasks.filter(task => task.status === 'completed').length,
          totalTasks: loadedRecentTasks.length,
          rating: 4.8,
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
          totalPatients: 0,
          currentPatients: 0,
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
        console.log(`Real-time update: Found ${assignments.length} patient assignments for doctor ${user.uid}`);
        
        // Filter assignments for this specific caregiver
        const caregiverAssignments = assignments.filter(a => a.caregiverId === user.uid);
        const uniquePatientIds = Array.from(new Set(caregiverAssignments.map(a => a.patientId).filter(Boolean)));
        Promise.all(uniquePatientIds.map(pid => getPatientById(pid).catch(() => null)))
          .then(fetched => {
            const patients = fetched.filter(Boolean);
            setAssignedPatients(patients);
            
            // Auto-select first patient if not set
            if (patients.length > 0 && !selectedPatientId) {
              setSelectedPatientId(patients[0].id);
              setSelectedPatient(patients[0]);
            }
          })
          .catch(error => {
            console.log('Error fetching patient details from assignments:', error);
          });
      }, user.uid);
      
      return () => unsubscribe();
    }
  }, [userProfile, user?.uid, selectedPatientId]);

  useEffect(() => {
    // when selectedPatientId changes, refresh selectedPatient from cache/list
    if (!selectedPatientId) {
      setSelectedPatient(null);
      return;
    }
    const found = assignedPatients.find(p => p.id === selectedPatientId);
    if (found) setSelectedPatient(found);
  }, [selectedPatientId, assignedPatients]);

  // Doctor action guards and navigation helpers
  const requirePatient = () => {
    if (!selectedPatientId) {
      alert('Please select a patient first.');
      return false;
    }
    return true;
  };

  const handleNewConsultation = () => {
    if (!requirePatient()) return;
    window.location.href = `/service-provider/consultations/new?patientId=${encodeURIComponent(selectedPatientId)}`;
  };

  const handleWritePrescription = () => {
    if (!requirePatient()) return;
    window.location.href = `/service-provider/prescriptions/new?patientId=${encodeURIComponent(selectedPatientId)}`;
  };

  const handleCreateCarePlan = () => {
    if (!requirePatient()) return;
    window.location.href = `/service-provider/care-plans/new?patientId=${encodeURIComponent(selectedPatientId)}`;
  };

  const handleVideoConsultation = async () => {
    if (!requirePatient()) return;
    // Try to find nurse assigned to this patient
    let nurseId = '';
    try {
      const assignments = await assignmentAPI.getAssignmentsByPatient(selectedPatientId);
      const nurseAssignment = assignments.find(a => {
        const role = (a.caregiverRole || a.role || '').toLowerCase();
        const mq = (a.caregiverMedicalQualification || '').toLowerCase();
        return role.includes('nurse') || mq.includes('nurse');
      });
      nurseId = nurseAssignment?.caregiverId || '';
    } catch {}
    const query = new URLSearchParams({ patientId: selectedPatientId, nurseId }).toString();
    window.location.href = `/service-provider/messages`;
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

  const renderDoctorPatientSelector = () => {
    if (!isDoctor) return null;
    return (
      <div className="bg-white rounded-lg border p-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-sm text-gray-600">Assigned Patients</div>
            <select
              className="mt-1 w-72 max-w-full px-3 py-2 border rounded-md"
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
            >
              <option value="">Select patient...</option>
              {assignedPatients.map(p => (
                <option key={p.id} value={p.id}>{p.name || p.fullName || p.email || p.id}</option>
              ))}
            </select>
          </div>
          {assignedPatients.length === 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <User className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800">No patients assigned yet</h4>
                  <p className="text-sm text-blue-600 mt-1">
                    Contact your administrator to get patients assigned to your care. Once assigned, you'll be able to create care plans, write prescriptions, and conduct consultations.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={handleNewConsultation} className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50" disabled={!selectedPatientId}>New Consultation</button>
            <button onClick={handleWritePrescription} className="px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-50" disabled={!selectedPatientId}>Write Prescription</button>
            <button onClick={handleCreateCarePlan} className="px-3 py-2 bg-emerald-600 text-white rounded disabled:opacity-50" disabled={!selectedPatientId}>Create Care Plan</button>
            <button onClick={handleVideoConsultation} className="px-3 py-2 bg-purple-600 text-white rounded disabled:opacity-50" disabled={!selectedPatientId}>Video Consultation</button>
          </div>
        </div>
        {selectedPatient && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Patient</div>
              <div className="text-gray-900 font-medium">{selectedPatient.name || selectedPatient.fullName || '—'}</div>
            </div>
            <div>
              <div className="text-gray-500">Age</div>
              <div className="text-gray-900">{selectedPatient.age || '—'}</div>
            </div>
            <div>
              <div className="text-gray-500">Last Visit</div>
              <div className="text-gray-900">{selectedPatient.lastVisit ? new Date(selectedPatient.lastVisit).toLocaleDateString() : '—'}</div>
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

  const handleEmergency = (patientId) => {
    // Handle emergency
    console.log('Emergency for patient:', patientId);
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

  const renderPatientsTab = () => {
    if (!selectedPatient) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Patient Selected</h3>
          <p className="text-gray-600 mb-4">
            {isDoctor 
              ? "Please select a patient from the dropdown above to view their information and provide care."
              : "Please select a patient to record vital signs and care logs."
            }
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Patient Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white font-semibold text-xl">
                  {(selectedPatient.name || selectedPatient.fullName || 'P').split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedPatient.name || selectedPatient.fullName || 'Unknown Patient'}
                </h2>
                <p className="text-gray-600">Patient ID: {selectedPatient.id}</p>
                {selectedPatient.age && (
                  <p className="text-sm text-gray-500">Age: {selectedPatient.age}</p>
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

        {/* Patient Information Grid */}
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
                <p className="font-medium text-gray-900">{selectedPatient.name || selectedPatient.fullName || 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Age:</span>
                <p className="font-medium text-gray-900">{selectedPatient.age || 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Gender:</span>
                <p className="font-medium text-gray-900">{selectedPatient.gender || 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Phone:</span>
                <p className="font-medium text-gray-900">{selectedPatient.phone || selectedPatient.phoneNumber || 'N/A'}</p>
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
                  {selectedPatient.medicalConditions?.join(', ') || selectedPatient.conditions || 'None recorded'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Allergies:</span>
                <p className="font-medium text-gray-900">
                  {selectedPatient.allergies?.join(', ') || selectedPatient.allergyInfo || 'None recorded'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Current Medications:</span>
                <p className="font-medium text-gray-900">
                  {selectedPatient.medications?.join(', ') || selectedPatient.currentMedications || 'None recorded'}
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
                  {selectedPatient.emergencyContact?.name || selectedPatient.emergencyContactName || 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Contact Phone:</span>
                <p className="font-medium text-gray-900">
                  {selectedPatient.emergencyContact?.phone || selectedPatient.emergencyContactPhone || 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Relationship:</span>
                <p className="font-medium text-gray-900">
                  {selectedPatient.emergencyContact?.relationship || selectedPatient.emergencyContactRelationship || 'N/A'}
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
              As a non-medical caregiver, you can view prescribed medications for your assigned patients but cannot prescribe new medications.
            </p>
            
            {selectedPatient ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Patient: {selectedPatient.name || selectedPatient.fullName || 'Unknown Patient'}
                </h3>
                <p className="text-blue-700">
                  Prescribed medications for this patient would be displayed here. 
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
                  Please select a patient from the dropdown above to view their prescribed medications.
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
              As a non-medical caregiver, you can view consultation notes and medical reports for your assigned patients but cannot conduct medical consultations.
            </p>
            
            {selectedPatient ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  Patient: {selectedPatient.name || selectedPatient.fullName || 'Unknown Patient'}
                </h3>
                <p className="text-green-700">
                  Consultation history, medical reports, and doctor's notes for this patient would be displayed here.
                  You can review these documents to better understand the patient's medical condition and care requirements.
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
                  Please select a patient from the dropdown above to view their consultation history.
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
              As a non-medical caregiver, you can view diagnostic results and test reports for your assigned patients but cannot order new diagnostic tests.
            </p>
            
            {selectedPatient ? (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-purple-900 mb-2">
                  Patient: {selectedPatient.name || selectedPatient.fullName || 'Unknown Patient'}
                </h3>
                <p className="text-purple-700">
                  Diagnostic test results, lab reports, and imaging studies for this patient would be displayed here.
                  You can review these results to understand the patient's medical status and any ongoing monitoring requirements.
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
                  Please select a patient from the dropdown above to view their diagnostic results.
                </p>
              </div>
            )}
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
    <CaregiverGuard>
    <div className="w-full h-full bg-gray-50 dashboard-full-width dashboard-container">
      {/* Header */}
      <div className="w-full bg-white shadow-sm border-b border-gray-200 px-8 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className={`p-3 bg-${dashboardConfig.color}-100 rounded-full`}>
              <dashboardConfig.icon className={`h-8 w-8 text-${dashboardConfig.color}-600`} />
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="h-full w-full object-cover"
                  onLoad={() => console.log('Profile image loaded successfully')}
                  onError={() => console.log('Profile image failed to load')}
                />
              ) : (
                <span className="text-white font-semibold text-lg">
                  {caregiver?.name.split(' ').map(n => n[0]).join('')}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{dashboardConfig.title}</h1>
              <p className="text-gray-600">Welcome, {userProfile?.name || caregiver?.name}</p>
              <p className="text-sm text-gray-500">{userProfile?.medicalQualification || 'Healthcare Professional'}</p>
              {institutionId && (
                <div className="flex items-center mt-1">
                  <Shield className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-xs text-green-600 font-medium">
                    {institutionData?.name || `Institution: ${institutionId.slice(0, 8)}...`}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <button className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
              <Bell className="h-6 w-6" />
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-3 rounded-full transition-colors ${
                showSettings 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Settings className="h-6 w-6" />
            </button>
            <button className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
              <LogOut className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Doctor Patient Selector (if doctor) */}
      <div className="w-full p-8 pt-6">
        {renderDoctorPatientSelector()}
      </div>

      {/* Tab Navigation */}
      {(isDoctor || isNurse || isNonMedicalCaregiver) && (
        <div className="w-full px-8">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'dashboard'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('patients')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'patients'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Patients
                </button>
                {/* View-only tabs for non-medical caregivers */}
                {isNonMedicalCaregiver && (
                  <>
                    <button
                      onClick={() => setActiveTab('prescriptions')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'prescriptions'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Prescriptions (View Only)
                    </button>
                    <button
                      onClick={() => setActiveTab('consultations')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'consultations'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Consultations (View Only)
                    </button>
                    <button
                      onClick={() => setActiveTab('diagnostics')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'diagnostics'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Diagnostics (View Only)
                    </button>
                  </>
                )}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="w-full p-8 dashboard-full-width">
        {showSettings ? (
          <CaregiverSettings onProfileImageUpdate={updateProfileImage} />
        ) : activeTab === 'patients' ? (
          renderPatientsTab()
        ) : activeTab === 'prescriptions' ? (
          renderPrescriptionsTab()
        ) : activeTab === 'consultations' ? (
          renderConsultationsTab()
        ) : activeTab === 'diagnostics' ? (
          renderDiagnosticsTab()
        ) : (
          <div className="space-y-6">
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
                          <h3 className="text-xl font-semibold text-gray-900">{schedule.patientName}</h3>
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
                          onClick={() => handleEmergency(schedule.patientId)}
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
                        <p className="text-sm text-gray-600">{task.patientName}</p>
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
                    <span className="text-base font-medium text-gray-700">Patient Satisfaction</span>
                    <div className="flex items-center">
                      <Star className="h-5 w-5 text-yellow-400 mr-2" />
                      <span className="text-lg font-bold text-gray-900">{performance.patientSatisfaction}</span>
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
      {showVitalsModal && selectedPatient && (
        <NurseVitalsInput
          patientId={selectedPatient.id}
          patientName={selectedPatient.name || selectedPatient.fullName || 'Unknown Patient'}
          nurseId={user?.uid}
          nurseName={userProfile?.name || userProfile?.displayName || 'Nurse'}
          onSave={() => {
            setShowVitalsModal(false);
            // Refresh patient data if needed
          }}
          onCancel={() => setShowVitalsModal(false)}
        />
      )}

      {showCareLogsModal && selectedPatient && (
        <NurseCareLogs
          patientId={selectedPatient.id}
          patientName={selectedPatient.name || selectedPatient.fullName || 'Unknown Patient'}
          nurseId={user?.uid}
          nurseName={userProfile?.name || userProfile?.displayName || 'Nurse'}
          onSave={() => {
            setShowCareLogsModal(false);
            // Refresh patient data if needed
          }}
          onCancel={() => setShowCareLogsModal(false)}
        />
      )}

      {showNurseReportModal && selectedPatient && (
        <NurseReportGenerator
          patientId={selectedPatient.id}
          patientName={selectedPatient.name || selectedPatient.fullName || 'Unknown Patient'}
          nurseId={user?.uid}
          nurseName={userProfile?.name || userProfile?.displayName || 'Nurse'}
          onSave={() => {
            setShowNurseReportModal(false);
            // Refresh patient data if needed
          }}
          onCancel={() => setShowNurseReportModal(false)}
        />
      )}

      {showMedicationModal && selectedPatient && (
        <NurseMedicationManager
          patientId={selectedPatient.id}
          patientName={selectedPatient.name || selectedPatient.fullName || 'Unknown Patient'}
          nurseId={user?.uid}
          nurseName={userProfile?.name || userProfile?.displayName || 'Nurse'}
          onSave={() => {
            setShowMedicationModal(false);
            // Refresh patient data if needed
          }}
          onCancel={() => setShowMedicationModal(false)}
        />
      )}
    </div>
    </CaregiverGuard>
  );
};

export default CaregiverDashboard;