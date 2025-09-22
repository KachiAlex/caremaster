import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  Heart, 
  AlertTriangle,
  Plus,
  BarChart3,
  Activity,
  FileText,
  Settings,
  LogOut,
  Building,
  Clock,
  TrendingUp,
  Shield,
  Bell,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getAllPatients, createPatient, subscribeToPatients } from '../api/patientsAPI';

const NewAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [patients, setPatients] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [selectedCaregiver, setSelectedCaregiver] = useState(null);
  const [showCaregiverModal, setShowCaregiverModal] = useState(false);
  
  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  
  // Monitoring state
  const [alerts, setAlerts] = useState([]);
  const [vitalSigns, setVitalSigns] = useState([]);
  const [systemMetrics, setSystemMetrics] = useState({});
  
  // Settings state
  const [systemSettings, setSystemSettings] = useState({
    emergencyProtocols: true,
    autoAssignment: false,
    notificationSettings: {
      email: true,
      sms: true,
      push: true
    },
    dataRetention: 365,
    backupFrequency: 'daily'
  });

  // Create task form state
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    patient: '',
    priority: '',
    dueDate: '',
    taskType: '',
    estimatedDuration: '',
    specialInstructions: ''
  });

  const [taskFormErrors, setTaskFormErrors] = useState({});
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [caregiverSearch, setCaregiverSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');

  // Check admin authentication and load data
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('elderx_admin_authenticated') === 'true';
    if (!isAuthenticated) {
      window.location.href = '/new-admin-login';
      return;
    }

    // Load caregivers
    const loadCaregivers = async () => {
      try {
        // Simple approach - load from users collection
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        
        const caregiversData = [];
        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          console.log('🔍 Checking user:', userData.email, 'userType:', userData.userType, 'type:', userData.type, 'medicalQualification:', userData.medicalQualification);
          
          // Only include actual caregivers (not elderly/clients)
          const isCaregiver = (userData.userType === 'caregiver' || userData.type === 'caregiver' || 
                              userData.medicalQualification) && userData.userType !== 'elderly' && userData.userType !== 'client';
          
          if (isCaregiver) {
            const caregiverObj = {
              id: doc.id,
              name: userData.displayName || userData.name || userData.email?.split('@')[0],
              email: userData.email,
              phone: userData.phone || '',
              role: userData.medicalQualification || userData.type || 'General Caregiver',
              experience: userData.yearsOfExperience || userData.experience || '',
              status: userData.status || 'active',
              ...userData
            };
            console.log('✅ Adding caregiver:', caregiverObj.name, caregiverObj.email);
            caregiversData.push(caregiverObj);
          }
        });
        
        console.log('✅ Loaded caregivers:', caregiversData);
        setCaregivers(caregiversData);
      } catch (error) {
        console.error('Error loading caregivers:', error);
      }
    };

    // Load clients with robust fallbacks
    const loadClients = async () => {
      try {
        const clientsData = await getAllPatients();
        console.log('✅ Loaded clients (API):', {
          count: clientsData?.length || 0,
          sample: clientsData?.slice?.(0, 5) || []
        });
        setPatients(clientsData || []);

        // Fallback 1: raw fetch from patients collection without orderBy (handles missing createdAt)
        try {
          const rawSnap = await getDocs(collection(db, 'patients'));
          const rawPatients = [];
          rawSnap.forEach((d) => rawPatients.push({ id: d.id, ...d.data() }));
          if (rawPatients.length > clientsData.length) {
            console.log('ℹ️ Using raw patients fallback due to count mismatch:', {
              apiCount: clientsData.length,
              rawCount: rawPatients.length,
              sample: rawPatients.slice(0, 5)
            });
            setPatients(rawPatients);
          }
        } catch (rawErr) {
          console.warn('Raw patients fallback failed:', rawErr);
        }

        // Fallback 2: derive patients from users collection (legacy data)
        try {
          const usersRef = collection(db, 'users');
          const usersSnapshot = await getDocs(usersRef);
          const legacyPatients = [];
          usersSnapshot.forEach((docu) => {
            const u = docu.data();
            const isPatient = ['elderly', 'client', 'patient'].includes((u.userType || u.type || '').toLowerCase());
            if (isPatient) {
              legacyPatients.push({
                id: docu.id,
                name: u.displayName || u.name || (u.email ? u.email.split('@')[0] : 'Patient'),
                email: u.email || '',
                phone: u.phone || '',
                age: u.age || '',
                gender: u.gender || '',
                status: u.status || 'active',
                address: u.address || '',
                source: 'users'
              });
            }
          });
          if (legacyPatients.length > 0) {
            // Merge unique by id/email
            const existingById = new Set((clientsData || []).map(p => p.id));
            const existingByEmail = new Set((clientsData || []).map(p => (p.email || '').toLowerCase()));
            const merged = [
              ...(clientsData || []),
              ...legacyPatients.filter(lp => !existingById.has(lp.id) && !existingByEmail.has((lp.email || '').toLowerCase()))
            ];
            if (merged.length !== (clientsData || []).length) {
              console.log('ℹ️ Merged legacy patients from users collection:', {
                added: merged.length - (clientsData || []).length,
                sampleAdded: legacyPatients.slice(0, 3)
              });
              setPatients(merged);
            }
          }
        } catch (legacyErr) {
          console.warn('Legacy users fallback failed:', legacyErr);
        }
      } catch (error) {
        console.error('Error loading clients:', error);
      }
    };

    loadCaregivers();
    loadClients();
    loadSampleTasks();

    // Real-time patients subscription
    const unsubscribePatients = subscribeToPatients((livePatients) => {
      setPatients(livePatients);
    });

    return () => {
      if (typeof unsubscribePatients === 'function') {
        unsubscribePatients();
      }
    };
  }, []);

  // Load some sample tasks for demonstration
  const loadSampleTasks = () => {
    const sampleTasks = [
      {
        id: '1',
        title: 'Morning Medication Administration',
        description: 'Administer blood pressure medication and vitamins',
        assignedTo: 'Sarah Johnson',
        assignedToId: 'caregiver1',
        patient: 'John Doe',
        patientId: 'patient1',
        priority: 'high',
        dueDate: new Date().toISOString().split('T')[0],
        taskType: 'medication',
        estimatedDuration: '30',
        specialInstructions: 'Check blood pressure before administering medication',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'admin@elderx.com'
      },
      {
        id: '2',
        title: 'Physical Therapy Session',
        description: 'Assist with prescribed physical therapy exercises',
        assignedTo: 'Dr. Smith',
        assignedToId: 'caregiver2',
        patient: 'Mary Wilson',
        patientId: 'patient2',
        priority: 'medium',
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
        taskType: 'exercise',
        estimatedDuration: '60',
        specialInstructions: 'Focus on leg strength exercises, avoid overexertion',
        status: 'in_progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'admin@elderx.com'
      }
    ];
    
    setTasks(sampleTasks);
  };

  const handleLogout = () => {
    localStorage.removeItem('elderx_admin_authenticated');
    localStorage.removeItem('elderx_admin_email');
    localStorage.removeItem('elderx_admin_timestamp');
    toast.success('Logged out successfully');
    window.location.href = '/';
  };

  const adminEmail = localStorage.getItem('elderx_admin_email') || 'admin@elderx.com';

  // Simple modal functions
  const viewCaregiverDetails = (caregiver) => {
    console.log('🔥 SIMPLE VIEW FUNCTION - Caregiver:', caregiver);
    setSelectedCaregiver(caregiver);
    setShowCaregiverModal(true);
    console.log('🔥 Modal state set to true');
  };

  // Task form handlers
  const handleTaskFormChange = (e) => {
    const { name, value } = e.target;
    setTaskFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (taskFormErrors[name]) {
      setTaskFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateTaskForm = () => {
    const errors = {};
    
    if (!taskFormData.title.trim()) {
      errors.title = 'Task title is required';
    }
    
    if (!taskFormData.assignedTo) {
      errors.assignedTo = 'Please select a caregiver';
    }
    
    if (!taskFormData.patient) {
      errors.patient = 'Please select a patient';
    }
    
    if (!taskFormData.priority) {
      errors.priority = 'Please select priority level';
    }
    
    if (!taskFormData.dueDate) {
      errors.dueDate = 'Due date is required';
    } else {
      const selectedDate = new Date(taskFormData.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        errors.dueDate = 'Due date cannot be in the past';
      }
    }
    
    if (!taskFormData.taskType) {
      errors.taskType = 'Please select task type';
    }

    return errors;
  };

  const resetTaskForm = () => {
    setTaskFormData({
      title: '',
      description: '',
      assignedTo: '',
      patient: '',
      priority: '',
      dueDate: '',
      taskType: '',
      estimatedDuration: '',
      specialInstructions: ''
    });
    setTaskFormErrors({});
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    const errors = validateTaskForm();
    if (Object.keys(errors).length > 0) {
      setTaskFormErrors(errors);
      return;
    }

    setIsSubmittingTask(true);
    
    try {
      // Get caregiver and patient details
      const assignedCaregiver = caregivers.find(c => c.id === taskFormData.assignedTo);
      const assignedPatient = patients.find(p => p.id === taskFormData.patient);
      
      // Create new task object
      const newTask = {
        id: Date.now().toString(), // In production, use proper UUID
        title: taskFormData.title.trim(),
        description: taskFormData.description.trim(),
        assignedTo: assignedCaregiver?.name || 'Unknown Caregiver',
        assignedToId: taskFormData.assignedTo,
        patient: assignedPatient?.name || 'Unknown Patient',
        patientId: taskFormData.patient,
        priority: taskFormData.priority,
        dueDate: taskFormData.dueDate,
        taskType: taskFormData.taskType,
        estimatedDuration: taskFormData.estimatedDuration,
        specialInstructions: taskFormData.specialInstructions.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: adminEmail
      };

      // Add to tasks state (in production, save to Firebase)
      setTasks(prev => [...prev, newTask]);
      
      // TODO: Save to Firebase
      // await addDoc(collection(db, 'tasks'), newTask);
      
      toast.success('Task created successfully!');
      setShowCreateTaskModal(false);
      resetTaskForm();
      
      console.log('✅ Task created:', newTask);
      
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task. Please try again.');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleCloseCreateTaskModal = () => {
    setShowCreateTaskModal(false);
    resetTaskForm();
  };

  // Derived lists for active caregivers/patients and search filtering
  const activeCaregivers = caregivers.filter((c) => (c.status === 'active' || !c.status));
  const filteredCaregivers = activeCaregivers.filter((c) => {
    const q = caregiverSearch.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      (c.role || c.medicalQualification || '').toLowerCase().includes(q)
    );
  });

  const activePatients = patients.filter((p) => (p.status !== 'inactive'));
  const filteredPatients = activePatients.filter((p) => {
    const q = patientSearch.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q)
    );
  });

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Healthcare Management Platform</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('add-patient')}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Patient
          </button>
          <button
            onClick={() => setActiveTab('add-caregiver')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Add Caregiver
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Patients</p>
              <p className="text-2xl font-semibold text-gray-900">{patients.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Caregivers</p>
              <p className="text-2xl font-semibold text-gray-900">{caregivers.filter(c => c.status === 'active').length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Tasks</p>
              <p className="text-2xl font-semibold text-gray-900">0</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Alerts</p>
              <p className="text-2xl font-semibold text-gray-900">0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => setActiveTab('patients')}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="h-8 w-8 text-blue-600 mb-2" />
            <span className="text-sm font-medium">Manage Patients</span>
          </button>
          <button 
            onClick={() => setActiveTab('caregivers')}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UserCheck className="h-8 w-8 text-green-600 mb-2" />
            <span className="text-sm font-medium">Manage Caregivers</span>
          </button>
          <button 
            onClick={() => setActiveTab('tasks')}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Calendar className="h-8 w-8 text-purple-600 mb-2" />
            <span className="text-sm font-medium">Assign Tasks</span>
          </button>
          <button 
            onClick={() => setActiveTab('monitoring')}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Heart className="h-8 w-8 text-red-600 mb-2" />
            <span className="text-sm font-medium">Care Monitoring</span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <Activity className="h-5 w-5 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">System initialized</p>
              <p className="text-xs text-gray-500">Ready to add patients and caregivers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPatients = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Patient Database</h1>
        <button
          onClick={() => setActiveTab('add-patient')}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Patient
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border">
        {patients && patients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {patients.map((client) => (
                  <tr key={client.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.email || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.phone || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.age || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-4">View</button>
                      <button className="text-green-600 hover:text-green-900 mr-4">Edit</button>
                      <button className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Patients Yet</h3>
              <p className="text-gray-600 mb-4">Start by adding your first patient to the database</p>
              <button
                onClick={() => setActiveTab('add-patient')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add First Patient
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderCaregivers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Caregiver Management</h1>
        <button
          onClick={() => setActiveTab('add-caregiver')}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Caregiver Account
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border">
        <div className="p-6">
          <div className="text-center py-12">
            <UserCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Caregivers Yet</h3>
            <p className="text-gray-600 mb-4">Create the first caregiver account</p>
            <button
              onClick={() => setActiveTab('add-caregiver')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create First Caregiver
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAddPatient = () => (
    <AddPatientForm onBack={() => setActiveTab('patients')} onAdd={async (patient) => {
      try {
        // Save to Firebase
        const patientId = await createPatient(patient);
        
        // Add to local state with the Firebase ID
        const newPatient = { ...patient, id: patientId };
        setPatients(prev => [...prev, newPatient]);
        
        setActiveTab('patients');
        toast.success('Patient added successfully!');
        
        console.log('✅ Patient saved to Firebase:', newPatient);
        
        // Refresh the patients list from Firebase
        setTimeout(async () => {
          try {
            const updatedPatients = await getAllPatients();
            setPatients(updatedPatients);
          } catch (error) {
            console.error('Error refreshing patients:', error);
          }
        }, 1000);
        
      } catch (error) {
        console.error('Error saving patient:', error);
        toast.error('Failed to save patient. Please try again.');
      }
    }} />
  );

  const renderAddCaregiver = () => (
    <AddCaregiverForm onBack={() => setActiveTab('caregivers')} onCreate={(caregiver) => {
      setCaregivers(prev => [...prev, { ...caregiver, id: Date.now(), status: 'active' }]);
      setActiveTab('caregivers');
      toast.success('Caregiver account created successfully!');
    }} />
  );

  const renderTasks = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
        <button
          onClick={() => {
            console.log('🔥 Create Task button clicked');
            setShowCreateTaskModal(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Task
        </button>
      </div>

      {/* Task Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tasks</p>
              <p className="text-2xl font-semibold text-gray-900">{tasks.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed Today</p>
              <p className="text-2xl font-semibold text-gray-900">{tasks.filter(t => t.status === 'completed' && t.updatedAt && new Date(t.updatedAt).toDateString() === new Date().toDateString()).length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-semibold text-gray-900">{tasks.filter(t => t.status === 'pending' && t.dueDate && new Date(t.dueDate) < new Date()).length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-semibold text-gray-900">{tasks.filter(t => t.status === 'in_progress').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Task Filters */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200">
            All Tasks
          </button>
          <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">
            Pending
          </button>
          <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">
            In Progress
          </button>
          <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">
            Completed
          </button>
          <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">
            Overdue
          </button>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Task Assignments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">No Tasks Yet</p>
                    <p className="text-gray-600 mb-4">Start by creating your first task assignment</p>
                    <button
                      onClick={() => {
                        console.log('🔥 Create First Task button clicked');
                        setShowCreateTaskModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Create First Task
                    </button>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{task.title}</div>
                      <div className="text-sm text-gray-500">{task.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {task.assignedTo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {task.patient}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        task.priority === 'high' ? 'bg-red-100 text-red-800' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(task.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        task.status === 'completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          setShowTaskModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-900 mr-4">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderMonitoring = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Care Monitoring</h1>
        <div className="flex space-x-2">
          <button className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Emergency Alerts
          </button>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Activity className="h-4 w-4 mr-2" />
            System Status
          </button>
        </div>
      </div>

      {/* Monitoring Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Alerts</p>
              <p className="text-2xl font-semibold text-gray-900">{alerts.filter(a => a.status === 'active').length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Heart className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Patients Monitored</p>
              <p className="text-2xl font-semibold text-gray-900">{patients.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Vital Signs Today</p>
              <p className="text-2xl font-semibold text-gray-900">{vitalSigns.filter(v => new Date(v.timestamp).toDateString() === new Date().toDateString()).length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <UserCheck className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Caregivers</p>
              <p className="text-2xl font-semibold text-gray-900">{caregivers.filter(c => c.status === 'active').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alert System */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Recent Alerts
            </h3>
          </div>
          <div className="p-6">
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No active alerts</p>
                <p className="text-sm text-gray-500">System is running normally</p>
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${
                    alert.severity === 'critical' ? 'bg-red-50 border-red-400' :
                    alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                    'bg-blue-50 border-blue-400'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{alert.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* System Metrics */}
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              System Health
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Database Connection</span>
                <span className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                  Online
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">API Response Time</span>
                <span className="text-sm text-gray-900">125ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Active Sessions</span>
                <span className="text-sm text-gray-900">{caregivers.filter(c => c.status === 'active').length + patients.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Storage Usage</span>
                <span className="text-sm text-gray-900">45% (2.3GB)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Last Backup</span>
                <span className="text-sm text-gray-900">2 hours ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Activity Feed */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Live Activity Feed
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-2 h-2 bg-green-400 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Sarah Johnson</span> completed medication administration for John Doe
                </p>
                <p className="text-xs text-gray-500">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Dr. Smith</span> updated care plan for Mary Wilson
                </p>
                <p className="text-xs text-gray-500">5 minutes ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">
                  New vital signs recorded for <span className="font-medium">Robert Brown</span>
                </p>
                <p className="text-xs text-gray-500">8 minutes ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Lisa Chen</span> started shift
                </p>
                <p className="text-xs text-gray-500">15 minutes ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          <Shield className="h-4 w-4 mr-2" />
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">General Settings</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Emergency Protocols</label>
                <p className="text-sm text-gray-500">Enable automatic emergency response protocols</p>
              </div>
              <input
                type="checkbox"
                checked={systemSettings.emergencyProtocols}
                onChange={(e) => setSystemSettings(prev => ({
                  ...prev,
                  emergencyProtocols: e.target.checked
                }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Auto Assignment</label>
                <p className="text-sm text-gray-500">Automatically assign caregivers to new patients</p>
              </div>
              <input
                type="checkbox"
                checked={systemSettings.autoAssignment}
                onChange={(e) => setSystemSettings(prev => ({
                  ...prev,
                  autoAssignment: e.target.checked
                }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Data Retention (days)</label>
              <input
                type="number"
                value={systemSettings.dataRetention}
                onChange={(e) => setSystemSettings(prev => ({
                  ...prev,
                  dataRetention: parseInt(e.target.value)
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Backup Frequency</label>
              <select
                value={systemSettings.backupFrequency}
                onChange={(e) => setSystemSettings(prev => ({
                  ...prev,
                  backupFrequency: e.target.value
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Notification Settings</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Email Notifications</label>
                <p className="text-sm text-gray-500">Send alerts and updates via email</p>
              </div>
              <input
                type="checkbox"
                checked={systemSettings.notificationSettings.email}
                onChange={(e) => setSystemSettings(prev => ({
                  ...prev,
                  notificationSettings: {
                    ...prev.notificationSettings,
                    email: e.target.checked
                  }
                }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">SMS Notifications</label>
                <p className="text-sm text-gray-500">Send urgent alerts via SMS</p>
              </div>
              <input
                type="checkbox"
                checked={systemSettings.notificationSettings.sms}
                onChange={(e) => setSystemSettings(prev => ({
                  ...prev,
                  notificationSettings: {
                    ...prev.notificationSettings,
                    sms: e.target.checked
                  }
                }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Push Notifications</label>
                <p className="text-sm text-gray-500">Send real-time push notifications</p>
              </div>
              <input
                type="checkbox"
                checked={systemSettings.notificationSettings.push}
                onChange={(e) => setSystemSettings(prev => ({
                  ...prev,
                  notificationSettings: {
                    ...prev.notificationSettings,
                    push: e.target.checked
                  }
                }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* User Management */}
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">User Management</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{patients.length}</div>
                <div className="text-sm text-gray-600">Total Patients</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{caregivers.length}</div>
                <div className="text-sm text-gray-600">Total Caregivers</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <button 
                onClick={() => setActiveTab('add-patient')}
                className="w-full px-4 py-2 text-left text-blue-600 hover:bg-blue-50 rounded-md"
              >
                + Add New Patient
              </button>
              <button 
                onClick={() => setActiveTab('add-caregiver')}
                className="w-full px-4 py-2 text-left text-green-600 hover:bg-green-50 rounded-md"
              >
                + Create Caregiver Account
              </button>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">System Information</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Platform Version</span>
                <span className="font-medium">ElderX v2.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Database Status</span>
                <span className="text-green-600 font-medium">Connected</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last System Update</span>
                <span className="font-medium">2 days ago</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Uptime</span>
                <span className="font-medium">99.9%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Security Status</span>
                <span className="text-green-600 font-medium">Secure</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Run System Diagnostics
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Data Management</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex flex-col items-center p-6 border border-gray-200 rounded-lg hover:bg-gray-50">
              <FileText className="h-8 w-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium">Export Data</span>
              <span className="text-xs text-gray-500 text-center">Download system data as CSV</span>
            </button>
            
            <button className="flex flex-col items-center p-6 border border-gray-200 rounded-lg hover:bg-gray-50">
              <Shield className="h-8 w-8 text-green-600 mb-2" />
              <span className="text-sm font-medium">Backup Now</span>
              <span className="text-xs text-gray-500 text-center">Create manual system backup</span>
            </button>
            
            <button className="flex flex-col items-center p-6 border border-gray-200 rounded-lg hover:bg-gray-50">
              <Settings className="h-8 w-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium">System Logs</span>
              <span className="text-xs text-gray-500 text-center">View detailed system logs</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <div className="bg-white shadow border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">ElderX Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {adminEmail}</span>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'patients', label: 'Patients', icon: Users },
              { id: 'caregivers', label: 'Caregivers', icon: UserCheck },
              { id: 'tasks', label: 'Tasks', icon: Calendar },
              { id: 'monitoring', label: 'Monitoring', icon: Heart },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'patients' && renderPatients()}
        {activeTab === 'caregivers' && renderCaregivers()}
        {activeTab === 'add-patient' && renderAddPatient()}
        {activeTab === 'add-caregiver' && renderAddCaregiver()}
        {activeTab === 'tasks' && renderTasks()}
        {activeTab === 'monitoring' && renderMonitoring()}
        {activeTab === 'settings' && renderSettings()}
      </div>
    </div>
  );
};

// Add Patient Form Component
const AddPatientForm = ({ onBack, onAdd }) => {
  const [patientData, setPatientData] = useState({
    name: '',
    age: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    medicalConditions: '',
    medications: '',
    allergies: '',
    priority: 'normal'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(patientData);
  };

  const handleChange = (e) => {
    setPatientData({
      ...patientData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Add New Patient</h1>
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          ← Back to Patients
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
              <input
                type="text"
                name="name"
                value={patientData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Age *</label>
              <input
                type="number"
                name="age"
                value={patientData.age}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
              <select
                name="gender"
                value={patientData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={patientData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
            <textarea
              name="address"
              value={patientData.address}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              rows="2"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Name *</label>
              <input
                type="text"
                name="emergencyContactName"
                value={patientData.emergencyContactName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Phone *</label>
              <input
                type="tel"
                name="emergencyContactPhone"
                value={patientData.emergencyContactPhone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Medical Conditions</label>
            <textarea
              name="medicalConditions"
              value={patientData.medicalConditions}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="List any medical conditions..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Patient
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderAddCaregiver = () => (
    <AddCaregiverForm onBack={() => setActiveTab('caregivers')} onCreate={(caregiver) => {
      setCaregivers(prev => [...prev, { ...caregiver, id: Date.now(), status: 'active' }]);
      setActiveTab('caregivers');
      
      // Show generated credentials
      const tempPassword = `ElderX${Math.random().toString(36).slice(-6)}`;
      toast.success(`Caregiver account created! Login: ${caregiver.email} / ${tempPassword}`, {
        autoClose: 10000
      });
    }} />
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <div className="bg-white shadow border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">ElderX Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {adminEmail}</span>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'patients', label: 'Patients', icon: Users },
              { id: 'caregivers', label: 'Caregivers', icon: UserCheck },
              { id: 'tasks', label: 'Tasks', icon: Calendar },
              { id: 'monitoring', label: 'Monitoring', icon: Heart },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'patients' && renderPatients()}
        {activeTab === 'caregivers' && renderCaregivers()}
        {activeTab === 'add-patient' && renderAddPatient()}
        {activeTab === 'add-caregiver' && renderAddCaregiver()}
      </div>
    </div>
  );
};

// Add Caregiver Form Component
const AddCaregiverForm = ({ onBack, onCreate }) => {
  const [caregiverData, setCaregiverData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    specialization: '',
    qualifications: '',
    experience: '',
    availableDays: [],
    workingHours: '',
    flexibleArrangement: false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(caregiverData);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCaregiverData({
      ...caregiverData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Create Caregiver Account</h1>
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          ← Back to Caregivers
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
              <input
                type="text"
                name="name"
                value={caregiverData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input
                type="email"
                name="email"
                value={caregiverData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
              <input
                type="tel"
                name="phone"
                value={caregiverData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
              <select
                name="role"
                value={caregiverData.role}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Role</option>
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="physiotherapist">Physiotherapist</option>
                <option value="occupational-therapist">Occupational Therapist</option>
                <option value="social-worker">Social Worker</option>
                <option value="home-health-aide">Home Health Aide</option>
                <option value="companion">Companion Caregiver</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
            <input
              type="text"
              name="specialization"
              value={caregiverData.specialization}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Cardiac Care, Dementia Care, Physical Therapy"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Qualifications *</label>
              <textarea
                name="qualifications"
                value={caregiverData.qualifications}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="List qualifications and certifications..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Experience *</label>
              <textarea
                name="experience"
                value={caregiverData.experience}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Describe relevant experience..."
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Main component JSX
  const mainContent = (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex space-x-8">
            {['dashboard', 'patients', 'caregivers'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'patients' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Clients</h2>
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {patients.map((client) => (
                    <tr key={client.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.email || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.phone || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.age || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-4">
                          View
                        </button>
                        <button className="text-green-600 hover:text-green-900 mr-4">
                          Edit
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'caregivers' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Caregivers ({caregivers.length})</h2>
            {console.log('🔍 Rendering caregivers tab, count:', caregivers.length)}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {caregivers.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                        No caregivers found
                      </td>
                    </tr>
                  ) : (
                    caregivers.map((caregiver) => {
                      console.log('🔄 Rendering caregiver row:', caregiver.name);
                      return (
                        <tr key={caregiver.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {caregiver.name || 'N/A'}
                          </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {caregiver.email || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {caregiver.role || caregiver.medicalQualification || 'General Caregiver'}
                      </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => viewCaregiverDetails(caregiver)}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              View
                            </button>
                            <button className="text-green-600 hover:text-green-900 mr-4">
                              Edit
                            </button>
                            <button className="text-red-600 hover:text-red-900">
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
        )}
      </div>
    </div>
  );

  // Return main content with modals
  return (
    <>
      {mainContent}
      
      {/* Caregiver Modal */}
      {showCaregiverModal && selectedCaregiver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{zIndex: 9999}}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Caregiver Details</h2>
              <button
                onClick={() => {
                  console.log('🔴 Closing modal');
                  setShowCaregiverModal(false);
                  setSelectedCaregiver(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <strong>Name:</strong> {selectedCaregiver.name}
              </div>
              <div>
                <strong>Email:</strong> {selectedCaregiver.email}
              </div>
              <div>
                <strong>Phone:</strong> {selectedCaregiver.phone || 'N/A'}
              </div>
              <div>
                <strong>Role:</strong> {selectedCaregiver.role || selectedCaregiver.medicalQualification || 'General Caregiver'}
              </div>
              <div>
                <strong>Experience:</strong> {selectedCaregiver.experience || selectedCaregiver.yearsOfExperience || 'Not specified'}
              </div>
              <div>
                <strong>Status:</strong> {selectedCaregiver.status || 'Pending'}
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <h4 className="font-semibold mb-2">Assignment History & Reports</h4>
                <p className="text-gray-600">
                  📋 Assignment history and care reports will be displayed here.
                  This section will show client assignments, visit reports, and performance metrics.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowCaregiverModal(false);
                  setSelectedCaregiver(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{zIndex: 9999}}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Task Details</h2>
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setSelectedTask(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <strong>Title:</strong> {selectedTask.title}
              </div>
              <div>
                <strong>Description:</strong> {selectedTask.description}
              </div>
              <div>
                <strong>Assigned To:</strong> {selectedTask.assignedTo}
              </div>
              <div>
                <strong>Patient:</strong> {selectedTask.patient}
              </div>
              <div>
                <strong>Priority:</strong> 
                <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  selectedTask.priority === 'high' ? 'bg-red-100 text-red-800' :
                  selectedTask.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {selectedTask.priority}
                </span>
              </div>
              <div>
                <strong>Due Date:</strong> {new Date(selectedTask.dueDate).toLocaleDateString()}
              </div>
              <div>
                <strong>Status:</strong>
                <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  selectedTask.status === 'completed' ? 'bg-green-100 text-green-800' :
                  selectedTask.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedTask.status.replace('_', ' ')}
                </span>
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <h4 className="font-semibold mb-2">Task Progress & Notes</h4>
                <p className="text-gray-600">
                  📝 Task progress updates and caregiver notes will be displayed here.
                  This section will show completion status, time tracking, and any special instructions.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setSelectedTask(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Edit Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{zIndex: 9999}}>
          {console.log('🔥 Create Task Modal is rendering')}
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Create New Task</h2>
              <button
                onClick={handleCloseCreateTaskModal}
                className="text-gray-500 hover:text-gray-700"
                disabled={isSubmittingTask}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="space-y-4">
              {/* Task Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={taskFormData.title}
                  onChange={handleTaskFormChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                    taskFormErrors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter task title..."
                  disabled={isSubmittingTask}
                />
                {taskFormErrors.title && (
                  <p className="text-red-500 text-sm mt-1">{taskFormErrors.title}</p>
                )}
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={taskFormData.description}
                  onChange={handleTaskFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Describe the task in detail..."
                  disabled={isSubmittingTask}
                />
              </div>
              
              {/* Assignment and Patient */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign To *
                  </label>
                  {/* Caregiver quick picker */}
                  <div className="mb-2">
                    <div className="flex items-center mb-2">
                      <Search className="h-4 w-4 text-gray-400 mr-2" />
                      <input
                        type="text"
                        value={caregiverSearch}
                        onChange={(e) => setCaregiverSearch(e.target.value)}
                        placeholder="Search caregivers by name, email or role"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-md">
                      {filteredCaregivers.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500">No caregivers found</div>
                      ) : (
                        filteredCaregivers.slice(0, 6).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setTaskFormData((prev) => ({ ...prev, assignedTo: c.id }))}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                              taskFormData.assignedTo === c.id ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">{c.name}</span>
                              <span className="text-xs text-gray-500">{c.role || c.medicalQualification || 'Caregiver'}</span>
                            </div>
                            <div className="text-xs text-gray-500">{c.email}</div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                  <select
                    name="assignedTo"
                    value={taskFormData.assignedTo}
                    onChange={handleTaskFormChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                      taskFormErrors.assignedTo ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSubmittingTask}
                  >
                    <option value="">Select Caregiver</option>
                    {filteredCaregivers.map(caregiver => (
                      <option key={caregiver.id} value={caregiver.id}>
                        {caregiver.name} - {caregiver.role || 'General Caregiver'}
                      </option>
                    ))}
                  </select>
                  {taskFormErrors.assignedTo && (
                    <p className="text-red-500 text-sm mt-1">{taskFormErrors.assignedTo}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient *
                  </label>
                  {/* Patient quick picker */}
                  <div className="mb-2">
                    <div className="flex items-center mb-2">
                      <Search className="h-4 w-4 text-gray-400 mr-2" />
                      <input
                        type="text"
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        placeholder="Search patients by name, email or phone"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-md">
                      {filteredPatients.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500">No patients found</div>
                      ) : (
                        filteredPatients.slice(0, 6).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setTaskFormData((prev) => ({ ...prev, patient: p.id }))}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                              taskFormData.patient === p.id ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">{p.name}</span>
                              <span className="text-xs text-gray-500">{p.age ? `Age ${p.age}` : p.gender || ''}</span>
                            </div>
                            <div className="text-xs text-gray-500">{p.email || p.phone || ''}</div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                  <select
                    name="patient"
                    value={taskFormData.patient}
                    onChange={handleTaskFormChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                      taskFormErrors.patient ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSubmittingTask}
                  >
                    <option value="">Select Patient</option>
                    {filteredPatients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name} - Age {patient.age || 'N/A'}
                      </option>
                    ))}
                  </select>
                  {taskFormErrors.patient && (
                    <p className="text-red-500 text-sm mt-1">{taskFormErrors.patient}</p>
                  )}
                </div>
              </div>
              
              {/* Priority and Due Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority *
                  </label>
                  <select
                    name="priority"
                    value={taskFormData.priority}
                    onChange={handleTaskFormChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                      taskFormErrors.priority ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSubmittingTask}
                  >
                    <option value="">Select Priority</option>
                    <option value="low">🟢 Low Priority</option>
                    <option value="medium">🟡 Medium Priority</option>
                    <option value="high">🔴 High Priority</option>
                  </select>
                  {taskFormErrors.priority && (
                    <p className="text-red-500 text-sm mt-1">{taskFormErrors.priority}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    name="dueDate"
                    value={taskFormData.dueDate}
                    onChange={handleTaskFormChange}
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                      taskFormErrors.dueDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSubmittingTask}
                  />
                  {taskFormErrors.dueDate && (
                    <p className="text-red-500 text-sm mt-1">{taskFormErrors.dueDate}</p>
                  )}
                </div>
              </div>
              
              {/* Task Type and Duration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Type *
                  </label>
                  <select
                    name="taskType"
                    value={taskFormData.taskType}
                    onChange={handleTaskFormChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                      taskFormErrors.taskType ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSubmittingTask}
                  >
                    <option value="">Select Task Type</option>
                    <option value="medication">💊 Medication Administration</option>
                    <option value="vital_signs">📊 Vital Signs Check</option>
                    <option value="personal_care">🛁 Personal Care</option>
                    <option value="companionship">👥 Companionship</option>
                    <option value="appointment">🏥 Medical Appointment</option>
                    <option value="exercise">🏃 Physical Exercise</option>
                    <option value="nutrition">🍽️ Nutrition/Meal Prep</option>
                    <option value="housekeeping">🏠 Light Housekeeping</option>
                    <option value="transportation">🚗 Transportation</option>
                    <option value="other">📝 Other</option>
                  </select>
                  {taskFormErrors.taskType && (
                    <p className="text-red-500 text-sm mt-1">{taskFormErrors.taskType}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Duration
                  </label>
                  <select
                    name="estimatedDuration"
                    value={taskFormData.estimatedDuration}
                    onChange={handleTaskFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmittingTask}
                  >
                    <option value="">Select Duration</option>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                    <option value="180">3 hours</option>
                    <option value="240">4 hours</option>
                    <option value="480">8 hours</option>
                  </select>
                </div>
              </div>
              
              {/* Special Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Instructions
                </label>
                <textarea
                  name="specialInstructions"
                  value={taskFormData.specialInstructions}
                  onChange={handleTaskFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Any special instructions or notes for the caregiver..."
                  disabled={isSubmittingTask}
                />
              </div>
              
              {/* Form Actions */}
              <div className="flex justify-end mt-6 space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCloseCreateTaskModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                  disabled={isSubmittingTask}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  disabled={isSubmittingTask}
                >
                  {isSubmittingTask ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Task
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default NewAdminDashboard;
