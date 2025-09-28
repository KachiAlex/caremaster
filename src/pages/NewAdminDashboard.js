import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { flushSync } from 'react-dom';
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
import { collection, getDocs, query, where, orderBy, doc, deleteDoc, updateDoc, onSnapshot, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getAllPatients, createPatient, subscribeToPatients } from '../api/patientsAPI';
import { assignmentAPI } from '../api/assignmentAPI';
import { caregiverAPI } from '../api/caregiverAPI';
import fileStorageService from '../services/fileStorageService';

const NewAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [patients, setPatients] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [selectedCaregiver, setSelectedCaregiver] = useState(null);
  const [showCaregiverModal, setShowCaregiverModal] = useState(false);
  const [expandedCaregiverId, setExpandedCaregiverId] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [expandedPatientId, setExpandedPatientId] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);
  const [editingCaregiver, setEditingCaregiver] = useState(null);
  const [caregiverAssignments, setCaregiverAssignments] = useState([]);
  const [patientAssignments, setPatientAssignments] = useState([]);
  const [taskStatusFilter, setTaskStatusFilter] = useState('all'); // all | pending | in_progress | completed | overdue
  const [taskSearch, setTaskSearch] = useState('');
  const [taskDateFrom, setTaskDateFrom] = useState('');
  const [taskDateTo, setTaskDateTo] = useState('');
  
  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  
  // Monitoring state
  const [alerts, setAlerts] = useState([]);
  const [vitalSigns, setVitalSigns] = useState([]);
  const [vitalsPatientId, setVitalsPatientId] = useState('all');
  const [vitalsRange, setVitalsRange] = useState('24h');
  const [systemMetrics, setSystemMetrics] = useState({});
  const [alertSearch, setAlertSearch] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('all'); // all|critical|warning|info
  const [alertDateFrom, setAlertDateFrom] = useState('');
  const [alertDateTo, setAlertDateTo] = useState('');
  
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

  // Helpers for safely rendering possibly object-shaped fields
  const formatValue = (val) => {
    if (val === null || val === undefined) return 'N/A';
    if (Array.isArray(val)) return val.filter(Boolean).join(', ');
    if (typeof val === 'object') return formatAddress(val);
    return String(val);
  };

  // formatAddress is defined later (single definition only)

  // Check admin authentication and load data
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('elderx_admin_authenticated') === 'true';
    if (!isAuthenticated) {
      window.location.href = '/new-admin-login';
      return;
    }

    // Load caregivers (robust): primary caregivers collection + fallback users
    const loadCaregivers = async () => {
      try {
        // Primary source: caregivers collection (API)
        const primaryCaregivers = await caregiverAPI.getCaregivers().catch((e) => {
          console.warn('Primary caregivers API failed, will try raw fallback:', e);
          return [];
        });
        console.log('✅ Loaded caregivers (primary collection):', {
          count: primaryCaregivers?.length || 0,
          sample: primaryCaregivers?.slice?.(0, 5) || []
        });

        // Raw fallback: caregivers collection without orderBy (handles missing fields)
        let rawCaregivers = [];
        try {
          const rawSnap = await getDocs(collection(db, 'caregivers'));
          rawSnap.forEach((d) => rawCaregivers.push({ id: d.id, ...d.data(), source: 'caregivers' }));
        } catch (rawErr) {
          console.warn('Raw caregivers fallback failed:', rawErr);
        }

        // Fallback/merge from users (legacy)
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const usersCaregivers = [];
        usersSnapshot.forEach((docu) => {
          const u = docu.data();
          const isCaregiver = (u.userType === 'caregiver' || u.type === 'caregiver' || u.medicalQualification) && u.userType !== 'elderly' && u.userType !== 'client';
          if (isCaregiver) {
            usersCaregivers.push({
              id: docu.id,
              name: u.displayName || u.name || u.email?.split('@')[0],
              email: u.email,
              phone: u.phone || '',
              role: u.medicalQualification || u.type || 'General Caregiver',
              experience: u.yearsOfExperience || u.experience || '',
              status: u.status || 'active',
              source: 'users',
              ...u
            });
          }
        });

        // Merge by robust key (email || id || phone)
        const byKey = new Map();
        const put = (c) => {
          const emailKey = (c.email || '').toString().trim().toLowerCase();
          const idKey = (c.id || '').toString().trim();
          const phoneKey = (c.phone || '').toString().trim();
          const key = emailKey || idKey || phoneKey;
          if (!key) return;
          if (!byKey.has(key)) byKey.set(key, c);
        };
        [...(primaryCaregivers || []), ...(rawCaregivers || [])].forEach(put);
        usersCaregivers.forEach(put);
        const merged = Array.from(byKey.values());

        console.log('✅ Caregivers merged (primary + raw + users fallback):', {
          primary: primaryCaregivers.length,
          raw: rawCaregivers.length,
          usersFallback: usersCaregivers.length,
          merged: merged.length
        });
        setCaregivers(merged);

        // Real-time subscription to caregivers collection
        try {
          const unsubscribeCaregivers = caregiverAPI.subscribeToCaregivers((liveCaregivers) => {
            // Merge with users fallback again on updates
            const liveMap = new Map();
            const putLive = (c) => {
              const emailKey = (c.email || '').toString().trim().toLowerCase();
              const idKey = (c.id || '').toString().trim();
              const phoneKey = (c.phone || '').toString().trim();
              const key = emailKey || idKey || phoneKey;
              if (!key) return;
              if (!liveMap.has(key)) liveMap.set(key, c);
            };
            (liveCaregivers || []).forEach(putLive);
            usersCaregivers.forEach(putLive);
            setCaregivers(Array.from(liveMap.values()));
          });
          // Also subscribe to users caregivers for legacy updates
          const unsubscribeUsers = onSnapshot(usersRef, (snap) => {
            const updatedUsersCaregivers = [];
            snap.forEach((docu) => {
              const u = docu.data();
              const isCaregiver = (u.userType === 'caregiver' || u.type === 'caregiver' || u.medicalQualification) && u.userType !== 'elderly' && u.userType !== 'client';
              if (isCaregiver) {
                updatedUsersCaregivers.push({
                  id: docu.id,
                  name: u.displayName || u.name || u.email?.split('@')[0],
                  email: u.email,
                  phone: u.phone || '',
                  role: u.medicalQualification || u.type || 'General Caregiver',
                  experience: u.yearsOfExperience || u.experience || '',
                  status: u.status || 'active',
                  source: 'users',
                  ...u
                });
              }
            });
            const liveMap = new Map();
            const putLive2 = (c) => {
              const emailKey = (c.email || '').toString().trim().toLowerCase();
              const idKey = (c.id || '').toString().trim();
              const phoneKey = (c.phone || '').toString().trim();
              const key = emailKey || idKey || phoneKey;
              if (!key) return;
              if (!liveMap.has(key)) liveMap.set(key, c);
            };
            (caregivers || []).forEach(putLive2);
            updatedUsersCaregivers.forEach(putLive2);
            setCaregivers(Array.from(liveMap.values()));
          });

          // attach to cleanup
          window.__elderx_unsub_caregivers = () => {
            try { unsubscribeCaregivers && unsubscribeCaregivers(); } catch {}
            try { unsubscribeUsers && unsubscribeUsers(); } catch {}
          };
        } catch (subErr) {
          console.warn('Caregivers subscription failed:', subErr);
        }
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
    // Real-time tasks subscription
    try {
      const tasksRef = collection(db, 'tasks');
      const tasksQuery = query(tasksRef, orderBy('createdAt', 'desc'));
      const unsubscribeTasks = onSnapshot(tasksQuery, (snap) => {
        const liveTasks = [];
        snap.forEach((d) => {
          const t = d.data();
          liveTasks.push({
            id: d.id,
            ...t,
            createdAt: t.createdAt?.toDate?.() || t.createdAt || null,
            updatedAt: t.updatedAt?.toDate?.() || t.updatedAt || null
          });
        });
        setTasks(liveTasks);
      });
      window.__elderx_unsub_tasks = unsubscribeTasks;
    } catch (e) {
      console.warn('Tasks subscription failed, using sample tasks fallback.', e);
      loadSampleTasks();
    }

    // Real-time alerts subscription
    try {
      const alertsRef = collection(db, 'alerts');
      const alertsQuery = query(alertsRef, orderBy('timestamp', 'desc'));
      const unsubscribeAlerts = onSnapshot(alertsQuery, (snap) => {
        const liveAlerts = [];
        snap.forEach((d) => {
          const a = d.data();
          liveAlerts.push({
            id: d.id,
            ...a,
            timestamp: a.timestamp?.toDate?.() || a.timestamp || null
          });
        });
        setAlerts(liveAlerts);
      });
      window.__elderx_unsub_alerts = unsubscribeAlerts;
    } catch (e) {
      console.warn('Alerts subscription failed', e);
    }

    // Real-time vitals subscription (7-day rolling window)
    try {
      const since = new Date();
      since.setDate(since.getDate() - 7);
      const vitalsRef = collection(db, 'vitalSigns');
      const vitalsQuery = query(vitalsRef, orderBy('timestamp', 'desc'));
      const unsubscribeVitals = onSnapshot(vitalsQuery, (snap) => {
        const list = [];
        snap.forEach((d) => {
          const v = d.data();
          const ts = v.timestamp?.toDate?.() || v.timestamp || null;
          if (!ts) return;
          if (ts < since) return;
          list.push({ id: d.id, ...v, timestamp: ts });
        });
        setVitalSigns(list);
      });
      window.__elderx_unsub_vitals = unsubscribeVitals;
    } catch (e) {
      console.warn('Vitals subscription failed', e);
    }

    // Real-time patients subscription
    const unsubscribePatients = subscribeToPatients((livePatients) => {
      setPatients(livePatients);
    });

    return () => {
      if (typeof unsubscribePatients === 'function') {
        unsubscribePatients();
      }
      try { window.__elderx_unsub_tasks && window.__elderx_unsub_tasks(); } catch {}
      try { window.__elderx_unsub_alerts && window.__elderx_unsub_alerts(); } catch {}
      try { window.__elderx_unsub_vitals && window.__elderx_unsub_vitals(); } catch {}
    };
  }, []);

  // Debug/trace helper: find caregiver by email across collections
  const traceCaregiverByEmail = async (email) => {
    try {
      if (!email) return;
      const emailLower = email.toLowerCase();

      // caregivers collection
      const caregiversRef = collection(db, 'caregivers');
      const caregiversQ = query(caregiversRef, where('email', '==', emailLower));
      const caregiversSnap = await getDocs(caregiversQ);
      const caregiversHits = [];
      caregiversSnap.forEach((d) => caregiversHits.push({ id: d.id, ...d.data(), _collection: 'caregivers' }));

      // users legacy
      const usersRef = collection(db, 'users');
      const usersQ = query(usersRef, where('email', '==', emailLower));
      const usersSnap = await getDocs(usersQ);
      const usersHits = [];
      usersSnap.forEach((d) => usersHits.push({ id: d.id, ...d.data(), _collection: 'users' }));

      console.log('🧭 Caregiver trace results:', { email, caregiversHits, usersHits });
      if (caregiversHits.length === 0 && usersHits.length === 0) {
        toast.info(`No caregiver found for ${email}`);
      } else {
        toast.success(`Trace complete for ${email}. Check console for details.`);
      }
    } catch (err) {
      console.error('Trace caregiver error:', err);
      toast.error('Failed to trace caregiver. See console for details.');
    }
  };

  // Expose tracer for console usage
  useEffect(() => {
    window.elderxTraceCaregiver = traceCaregiverByEmail;
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

  // Merged formatter (single definition)
  const formatAddress = (addr) => {
    if (!addr) return 'N/A';
    if (typeof addr === 'string') return addr;
    if (typeof addr === 'object') {
      const { completeAddress, street, city, state, zipCode, country } = addr;
      const parts = [completeAddress, street, city, state, zipCode, country]
        .map((v) => (v || '').toString().trim())
        .filter(Boolean);
      return parts.join(', ') || 'N/A';
    }
    try { return String(addr); } catch { return 'N/A'; }
  };

  const adminEmail = localStorage.getItem('elderx_admin_email') || 'admin@elderx.com';

  // Simple modal functions
  const viewCaregiverDetails = (caregiver) => {
    console.log('🔥 SIMPLE VIEW FUNCTION - Caregiver:', caregiver);
    flushSync(() => {
      setSelectedCaregiver(caregiver);
      setExpandedCaregiverId(null);
      setShowCaregiverModal(true);
    });
    console.log('🔥 Modal state set to true');
    // Load assignments
    if (caregiver?.id) {
      assignmentAPI.getAssignmentsByCaregiver(caregiver.id)
        .then(setCaregiverAssignments)
        .catch((e) => console.warn('Failed to load caregiver assignments', e));
    } else {
      setCaregiverAssignments([]);
    }
  };

  // Patient actions
  const viewPatientDetails = (patient) => {
    flushSync(() => {
      setSelectedPatient(patient);
      setExpandedPatientId(patient.id);
      setShowPatientModal(true);
    });
    // Load assignments
    if (patient?.id) {
      assignmentAPI.getAssignmentsByPatient(patient.id)
        .then(setPatientAssignments)
        .catch((e) => console.warn('Failed to load patient assignments', e));
    } else {
      setPatientAssignments([]);
    }
  };

  const handleDeletePatient = async (patientId) => {
    if (!window.confirm('Delete this patient permanently?')) return;
    try {
      await deleteDoc(doc(db, 'patients', patientId));
      setPatients((prev) => prev.filter((p) => p.id !== patientId));
      toast.success('Patient deleted');
    } catch (err) {
      console.error('Delete patient failed:', err);
      toast.error('Failed to delete patient');
    }
  };

  const handleStartEditPatient = (patient) => {
    setEditingPatient({ ...patient });
    setSelectedPatient(patient);
    setShowPatientModal(true);
  };

  const handleSavePatient = async () => {
    try {
      const { id, ...data } = editingPatient;
      await updateDoc(doc(db, 'patients', id), data);
      setPatients((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
      toast.success('Patient updated');
      setEditingPatient(null);
      setShowPatientModal(false);
    } catch (err) {
      console.error('Update patient failed:', err);
      toast.error('Failed to update patient');
    }
  };

  // Caregiver actions
  const handleDeleteCaregiver = async (caregiverId) => {
    if (!window.confirm('Delete this caregiver permanently?')) return;
    try {
      await deleteDoc(doc(db, 'caregivers', caregiverId));
      setCaregivers((prev) => prev.filter((c) => c.id !== caregiverId));
      toast.success('Caregiver deleted');
    } catch (err) {
      console.error('Delete caregiver failed:', err);
      toast.error('Failed to delete caregiver');
    }
  };

  const handleStartEditCaregiver = (caregiver) => {
    setEditingCaregiver({ ...caregiver });
    setSelectedCaregiver(caregiver);
    setShowCaregiverModal(true);
  };

  const handleToggleCaregiverStatus = async (caregiver) => {
    try {
      const currentStatus = caregiver.status || 'active';
      const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';

      // Always update the users collection first (this is the primary source)
      if (caregiver.email) {
        try {
          const usersRef = collection(db, 'users');
          const qUsers = query(usersRef, where('email', '==', caregiver.email));
          const usersSnap = await getDocs(qUsers);
          for (const userDoc of usersSnap.docs) {
            await updateDoc(doc(db, 'users', userDoc.id), { status: newStatus });
          }
        } catch (userErr) {
          console.warn('Updating users status failed:', userErr);
          throw userErr; // Re-throw to show error to user
        }
      }

      // Try to update caregivers collection if it exists
      if (caregiver.id) {
        try {
          await updateDoc(doc(db, 'caregivers', caregiver.id), { status: newStatus });
        } catch (e) {
          console.warn('Caregiver doc update by id failed (non-blocking):', e);
        }
      }

      // Update local state
      setCaregivers((prev) => prev.map((c) => {
        const sameId = caregiver.id && c.id === caregiver.id;
        const sameEmail = caregiver.email && c.email === caregiver.email;
        if (sameId || sameEmail) {
          return { ...c, status: newStatus };
        }
        return c;
      }));

      toast.success(`Caregiver ${newStatus === 'suspended' ? 'suspended' : 'activated'}`);
    } catch (err) {
      console.error('Toggle caregiver status failed:', err);
      toast.error('Failed to update caregiver status');
    }
  };

  const handleSaveCaregiver = async () => {
    try {
      const { id, ...data } = editingCaregiver;
      await updateDoc(doc(db, 'caregivers', id), data);
      setCaregivers((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
      toast.success('Caregiver updated');
      setEditingCaregiver(null);
      setShowCaregiverModal(false);
    } catch (err) {
      console.error('Update caregiver failed:', err);
      toast.error('Failed to update caregiver');
    }
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: adminEmail
      };

      await addDoc(collection(db, 'tasks'), newTask);

      toast.success('Task created successfully!');
      setShowCreateTaskModal(false);
      resetTaskForm();
      
      console.log('✅ Task created (Firestore):', newTask);
      
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

  // Derived filtered tasks based on search, status, and date range
  const getFilteredTasks = () => {
    const q = taskSearch.toLowerCase();
    return tasks
      .filter((task) => {
        const matchesText =
          task.title?.toLowerCase().includes(q) ||
          task.description?.toLowerCase().includes(q) ||
          (task.assignedTo || '').toLowerCase().includes(q) ||
          (task.patient || '').toLowerCase().includes(q);

        const isOverdue = (() => {
          if (!task.dueDate || task.status === 'completed') return false;
          try {
            const due = new Date(task.dueDate);
            const today = new Date();
            today.setHours(0,0,0,0);
            return due < today;
          } catch { return false; }
        })();

        const matchesStatus =
          taskStatusFilter === 'all' ? true :
          taskStatusFilter === 'overdue' ? isOverdue :
          (task.status === taskStatusFilter);

        const withinDateRange = (() => {
          if (!task.dueDate) return true;
          try {
            const due = new Date(task.dueDate);
            if (taskDateFrom) {
              const from = new Date(taskDateFrom);
              from.setHours(0,0,0,0);
              if (due < from) return false;
            }
            if (taskDateTo) {
              const to = new Date(taskDateTo);
              to.setHours(23,59,59,999);
              if (due > to) return false;
            }
            return true;
          } catch { return true; }
        })();

        return matchesText && matchesStatus && withinDateRange;
      });
  };

  const exportFilteredTasksToCSV = () => {
    try {
      const rows = getFilteredTasks();
      const headers = ['Title','Caregiver','Patient','Priority','Due Date','Status','Created At'];
      const escape = (val) => {
        const s = (val ?? '').toString();
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      };
      const csv = [headers.join(',')]
        .concat(rows.map(t => [
          escape(t.title),
          escape(t.assignedTo),
          escape(t.patient),
          escape(t.priority),
          escape(t.dueDate ? new Date(t.dueDate).toISOString().slice(0,10) : ''),
          escape(t.status),
          escape(t.createdAt ? new Date(t.createdAt).toISOString() : '')
        ].join(',')))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'tasks_export.csv';
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Exported tasks CSV');
    } catch (err) {
      console.error('Export CSV failed', err);
      toast.error('Failed to export CSV');
    }
  };

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

      {/* Caregiver Modal moved to global section */}

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
                      <button className="text-blue-600 hover:text-blue-900 mr-4" onClick={() => viewPatientDetails(client)}>View</button>
                      <button className="text-red-600 hover:text-red-900" onClick={() => handleDeletePatient(client.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {expandedPatientId && selectedPatient && selectedPatient.id === expandedPatientId && (
                  <tr>
                    <td colSpan="5" className="bg-gray-50 px-6 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-500">Email</div>
                          <div className="text-sm text-gray-900">{selectedPatient.email || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Address</div>
                          <div className="text-sm text-gray-900">{formatAddress(selectedPatient.address)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Emergency Contact</div>
                          <div className="text-sm text-gray-900">{selectedPatient.emergencyContactName || 'N/A'} ({selectedPatient.emergencyContactPhone || 'N/A'})</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
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
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (!window.confirm('This will delete ALL caregivers from the database. Are you sure?')) return;
              try {
                const snap = await getDocs(collection(db, 'caregivers'));
                const deletions = [];
                snap.forEach((d) => deletions.push(deleteDoc(d.ref)));
                await Promise.all(deletions);
                setCaregivers([]);
                toast.success('All caregivers deleted.');
              } catch (err) {
                console.error('Delete all caregivers failed:', err);
                toast.error('Failed to delete caregivers.');
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Reset Caregivers
          </button>
          <button
            onClick={() => setActiveTab('add-caregiver')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Caregiver Account
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border">
        {caregivers && caregivers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {caregivers.map((cg) => (
                  <tr key={`${cg.id || cg.email || Math.random()}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cg.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cg.email || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cg.role || cg.medicalQualification || 'General Caregiver'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cg.status || 'active'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => viewCaregiverDetails(cg)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View
                      </button>
                      <button className="text-red-600 hover:text-red-900" onClick={() => handleDeleteCaregiver(cg.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {expandedCaregiverId && selectedCaregiver && selectedCaregiver.id === expandedCaregiverId && (
                  <tr>
                    <td colSpan="5" className="bg-gray-50 px-6 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-500">Phone</div>
                          <div className="text-sm text-gray-900">{selectedCaregiver.phone || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Experience</div>
                          <div className="text-sm text-gray-900">{selectedCaregiver.experience || selectedCaregiver.yearsOfExperience || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Qualifications</div>
                          <div className="text-sm text-gray-900">{selectedCaregiver.qualifications || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Specializations</div>
                          <div className="text-sm text-gray-900">{Array.isArray(selectedCaregiver.specializations) ? selectedCaregiver.specializations.join(', ') : (selectedCaregiver.specialization || 'N/A')}</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
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
        )}
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
    <AddCaregiverForm onBack={() => setActiveTab('caregivers')} onCreate={async (caregiver) => {
      try {
        // Persist caregiver to Firestore via dedicated API
        const result = await caregiverAPI.createCaregiver({
          name: caregiver.name,
          email: caregiver.email,
          phone: caregiver.phone,
          role: caregiver.role,
          specializations: caregiver.specialization ? [caregiver.specialization] : [],
          qualifications: caregiver.qualifications || '',
          experience: caregiver.experience || '',
          status: 'active'
        });

        // Optimistic local update; realtime subscription will reconcile
        setCaregivers(prev => [
          ...prev,
          {
            id: result.id,
            name: caregiver.name,
            email: caregiver.email,
            phone: caregiver.phone,
            role: caregiver.role,
            experience: caregiver.experience || '',
            status: 'active',
            source: 'caregivers'
          }
        ]);

        setActiveTab('caregivers');
        toast.success('Caregiver account created and saved!');
      } catch (err) {
        console.error('Error creating caregiver:', err);
        toast.error('Failed to create caregiver. Please try again.');
      }
    }} />
  );

  const renderTasks = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search tasks, caregiver, patient"
            value={taskSearch}
            onChange={(e) => setTaskSearch(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm w-64"
          />
          <input
            type="date"
            value={taskDateFrom}
            onChange={(e) => setTaskDateFrom(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
            aria-label="From date"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={taskDateTo}
            onChange={(e) => setTaskDateTo(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
            aria-label="To date"
          />
          <button
            onClick={exportFilteredTasksToCSV}
            className="flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
            title="Export filtered tasks to CSV"
          >
            Export CSV
          </button>
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
          {[
            { key: 'all', label: 'All Tasks' },
            { key: 'pending', label: 'Pending' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'completed', label: 'Completed' },
            { key: 'overdue', label: 'Overdue' }
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setTaskStatusFilter(f.key)}
              className={`px-3 py-1 rounded-full text-sm ${
                taskStatusFilter === f.key
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
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
                getFilteredTasks()
                  .map((task) => (
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
                      <select
                        className="border rounded px-2 py-1 text-sm"
                        value={task.status || 'pending'}
                        onChange={async (e) => {
                          try {
                            const newStatus = e.target.value;
                            await updateDoc(doc(db, 'tasks', task.id), { status: newStatus, updatedAt: serverTimestamp() });
                            toast.success('Task status updated');
                          } catch (err) {
                            console.error('Update status failed', err);
                            toast.error('Failed to update status');
                          }
                        }}
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
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
                      <button
                        className="text-red-600 hover:text-red-900"
                        onClick={async () => {
                          if (!window.confirm('Delete this task?')) return;
                          try {
                            await deleteDoc(doc(db, 'tasks', task.id));
                            toast.success('Task deleted');
                          } catch (err) {
                            console.error('Delete task failed', err);
                            toast.error('Failed to delete task');
                          }
                        }}
                      >
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
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Search alerts"
                value={alertSearch}
                onChange={(e) => setAlertSearch(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              />
              {['all','critical','warning','info'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setAlertSeverity(sev)}
                  className={`px-3 py-1 rounded-full text-sm ${alertSeverity === sev ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {sev.charAt(0).toUpperCase() + sev.slice(1)}
                </button>
              ))}
              <div className="flex items-center gap-2 ml-auto">
                <input type="date" value={alertDateFrom} onChange={(e)=>setAlertDateFrom(e.target.value)} className="px-3 py-2 border rounded-md text-sm" />
                <span className="text-gray-400">to</span>
                <input type="date" value={alertDateTo} onChange={(e)=>setAlertDateTo(e.target.value)} className="px-3 py-2 border rounded-md text-sm" />
              </div>
            </div>
          </div>
          <div className="p-6">
            {getFilteredAlerts().length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No active alerts</p>
                <p className="text-sm text-gray-500">System is running normally</p>
              </div>
            ) : (
              <div className="space-y-4">
                {getFilteredAlerts().slice(0, 10).map((alert) => (
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
                          {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {alert.severity}
                        </span>
                        {!alert.acknowledged && (
                          <button
                            onClick={() => acknowledgeAlert(alert)}
                            className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                          >
                            Acknowledge
                          </button>
                        )}
                      </div>
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

      {/* Vital Signs Trends */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-medium text-gray-900">Vitals Trends</h3>
          <select
            className="ml-auto px-3 py-2 border rounded-md text-sm"
            value={vitalsPatientId}
            onChange={(e) => setVitalsPatientId(e.target.value)}
          >
            <option value="all">All Patients</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.name || p.email || p.id}</option>
            ))}
          </select>
          <select
            className="px-3 py-2 border rounded-md text-sm"
            value={vitalsRange}
            onChange={(e) => setVitalsRange(e.target.value)}
          >
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {(() => {
            const rangeMs = vitalsRange === '24h' ? 24*3600e3 : vitalsRange === '7d' ? 7*24*3600e3 : 30*24*3600e3;
            const cutoff = Date.now() - rangeMs;
            const filtered = vitalSigns.filter(v => {
              const inRange = new Date(v.timestamp).getTime() >= cutoff;
              const matchesPatient = vitalsPatientId === 'all' ? true : (v.patientId === vitalsPatientId);
              return inRange && matchesPatient;
            });
            const metrics = [
              { key: 'heartRate', label: 'Heart Rate (bpm)', color: '#ef4444' },
              { key: 'systolic', label: 'Systolic BP (mmHg)', color: '#3b82f6' },
              { key: 'diastolic', label: 'Diastolic BP (mmHg)', color: '#06b6d4' },
              { key: 'spo2', label: 'SpO₂ (%)', color: '#10b981' }
            ];
              const Chart = ({ points, color, thresholdMin, thresholdMax }) => {
              if (points.length === 0) return <div className="text-sm text-gray-500">No data in range</div>;
              const w = 500, h = 140, pad = 20;
              const xs = points.map(p => +p.timestamp);
              const ys = points.map(p => p.value);
              const minX = Math.min(...xs), maxX = Math.max(...xs);
              const minY = Math.min(...ys), maxY = Math.max(...ys);
              const norm = (v, a, b) => (a === b ? 0.5 : (v - a) / (b - a));
                const d = points
                .sort((a,b)=>+a.timestamp-+b.timestamp)
                .map((p,i) => {
                  const x = pad + norm(+p.timestamp, minX, maxX) * (w - 2*pad);
                  const y = h - pad - norm(p.value, minY, maxY) * (h - 2*pad);
                  return `${i===0?'M':'L'}${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(' ');
                const circles = points.map((p, idx) => {
                  const x = pad + norm(+p.timestamp, minX, maxX) * (w - 2*pad);
                  const y = h - pad - norm(p.value, minY, maxY) * (h - 2*pad);
                  const outOfRange = (thresholdMin != null && p.value < thresholdMin) || (thresholdMax != null && p.value > thresholdMax);
                  return (
                    <g key={idx}>
                      <circle cx={x} cy={y} r={2.5} fill={outOfRange ? '#ef4444' : color}>
                        <title>{`${new Date(p.timestamp).toLocaleString()}\n${p.value}`}</title>
                      </circle>
                    </g>
                  );
                });
                const thresholdLines = [];
                if (thresholdMin != null) {
                  const yMin = h - pad - norm(thresholdMin, minY, maxY) * (h - 2*pad);
                  thresholdLines.push(<line key="min" x1={pad} x2={w-pad} y1={yMin} y2={yMin} stroke="#f59e0b" strokeDasharray="4 4" />);
                }
                if (thresholdMax != null) {
                  const yMax = h - pad - norm(thresholdMax, minY, maxY) * (h - 2*pad);
                  thresholdLines.push(<line key="max" x1={pad} x2={w-pad} y1={yMax} y2={yMax} stroke="#f59e0b" strokeDasharray="4 4" />);
                }
              return (
                <svg width={w} height={h} className="w-full h-40">
                  <rect x="0" y="0" width={w} height={h} fill="#fff" />
                    {thresholdLines}
                  <path d={d} stroke={color} strokeWidth="2" fill="none" />
                    {circles}
                </svg>
              );
            };
            return metrics.map((m) => {
              const pts = filtered
                .map(v => ({ timestamp: v.timestamp, value: (v[m.key] ?? v[m.key + 'Value']) }))
                .filter(p => typeof p.value === 'number');
              const avg = pts.length ? (pts.reduce((s,p)=>s+p.value,0)/pts.length) : null;
              const safeRanges = {
                heartRate: { min: 60, max: 100 },
                systolic: { min: 90, max: 120 },
                diastolic: { min: 60, max: 80 },
                spo2: { min: 95, max: 100 }
              };
              const range = safeRanges[m.key] || {};
              return (
                <div key={m.key} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-medium text-gray-700">{m.label}</div>
                    {avg != null && (
                      <div className="text-xs text-gray-600">Avg: {avg.toFixed(1)}</div>
                    )}
                  </div>
                  <Chart points={pts} color={m.color} thresholdMin={range.min} thresholdMax={range.max} />
                </div>
              );
            });
          })()}
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

  const getFilteredAlerts = () => {
    const q = alertSearch.toLowerCase();
    return alerts.filter((a) => {
      const matchesText =
        (a.title || '').toLowerCase().includes(q) ||
        (a.message || '').toLowerCase().includes(q) ||
        (a.patientName || a.patientId || '').toLowerCase().includes(q) ||
        (a.caregiverName || a.caregiverId || '').toLowerCase().includes(q);
      const matchesSeverity = alertSeverity === 'all' ? true : (a.severity === alertSeverity);
      const withinDateRange = (() => {
        if (!a.timestamp) return true;
        try {
          const ts = new Date(a.timestamp);
          if (alertDateFrom) {
            const from = new Date(alertDateFrom);
            from.setHours(0,0,0,0);
            if (ts < from) return false;
          }
          if (alertDateTo) {
            const to = new Date(alertDateTo);
            to.setHours(23,59,59,999);
            if (ts > to) return false;
          }
          return true;
        } catch { return true; }
      })();
      return matchesText && matchesSeverity && withinDateRange;
    });
  };

  const acknowledgeAlert = async (alert) => {
    try {
      await updateDoc(doc(db, 'alerts', alert.id), { acknowledged: true, acknowledgedAt: serverTimestamp() });
      toast.success('Alert acknowledged');
    } catch (err) {
      console.error('Acknowledge failed', err);
      toast.error('Failed to acknowledge alert');
    }
  };

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

      {/* Global Portals: Caregiver & Patient Modals rendered at root to avoid tab layout interference */}
      {showCaregiverModal && selectedCaregiver && createPortal((
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{zIndex: 9999}}>
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Caregiver Details</h2>
              <button
                onClick={() => {
                  setShowCaregiverModal(false);
                  setSelectedCaregiver(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Name</div>
                <div className="text-sm text-gray-900">{selectedCaregiver.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Email</div>
                <div className="text-sm text-gray-900">{selectedCaregiver.email}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Phone</div>
                <div className="text-sm text-gray-900">{selectedCaregiver.phone || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Role</div>
                <div className="text-sm text-gray-900">{selectedCaregiver.role || selectedCaregiver.medicalQualification || 'General Caregiver'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Experience</div>
                <div className="text-sm text-gray-900">{selectedCaregiver.experience || selectedCaregiver.yearsOfExperience || 'Not specified'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Status</div>
                <div className="text-sm text-gray-900">{selectedCaregiver.status || 'Pending'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Address</div>
                <div className="text-sm text-gray-900">{formatAddress(selectedCaregiver.address || selectedCaregiver.location)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">License Number</div>
                <div className="text-sm text-gray-900">{selectedCaregiver.licenseNumber || 'N/A'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-sm text-gray-500">Specializations</div>
                <div className="text-sm text-gray-900">{Array.isArray(selectedCaregiver.specializations) ? selectedCaregiver.specializations.join(', ') : (selectedCaregiver.specialization || 'N/A')}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-sm text-gray-500">Qualifications</div>
                <div className="text-sm text-gray-900">{selectedCaregiver.qualifications || selectedCaregiver.medicalQualification || 'N/A'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-sm text-gray-500">Bio</div>
                <div className="text-sm text-gray-900">{selectedCaregiver.bio || '—'}</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded">
                <h4 className="font-semibold mb-2">Assignments</h4>
                {caregiverAssignments && caregiverAssignments.length > 0 ? (
                  <ul className="list-disc list-inside text-sm text-gray-800 space-y-1 max-h-48 overflow-y-auto">
                    {caregiverAssignments.map(a => (
                      <li key={a.id}>
                        Patient: {a.patientName || a.patientId} • Status: {a.status || 'active'} • Start: {a.startDate ? new Date(a.startDate).toLocaleDateString() : 'N/A'}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-600 text-sm">No assignments found.</div>
                )}
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <h4 className="font-semibold mb-2">Recent Activity</h4>
                <div className="text-gray-600 text-sm">Activity feed integration pending.</div>
              </div>
            </div>

            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => handleStartEditCaregiver(selectedCaregiver)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Edit Details
              </button>
              <button
                onClick={() => handleToggleCaregiverStatus(selectedCaregiver)}
                className={`px-4 py-2 rounded text-white ${((selectedCaregiver.status || 'active') === 'suspended') ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}
              >
                {((selectedCaregiver.status || 'active') === 'suspended') ? 'Activate' : 'Suspend'}
              </button>
              <button
                onClick={() => {
                  try {
                    setShowCaregiverModal(false);
                    setActiveTab('tasks');
                    setTaskFormData((prev) => ({
                      ...prev,
                      assignedTo: selectedCaregiver?.id || '',
                      title: prev.title && prev.title.trim().length > 0 ? prev.title : `Task for ${selectedCaregiver?.name || 'Caregiver'}`,
                    }));
                    setShowCreateTaskModal(true);
                  } catch {}
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Assign Task
              </button>
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
      ), document.body)}

      {/* Create Task Modal - Global Portal */}
      {showCreateTaskModal && createPortal((
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{zIndex: 9999}}>
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
      ), document.body)}

      {showPatientModal && selectedPatient && createPortal((
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{zIndex: 9999}}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Patient Details</h2>
              <button
                onClick={() => {
                  setEditingPatient(null);
                  setShowPatientModal(false);
                  setSelectedPatient(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Name</div>
                <div className="text-sm text-gray-900">{selectedPatient.name || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Email</div>
                <div className="text-sm text-gray-900">{selectedPatient.email || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Phone</div>
                <div className="text-sm text-gray-900">{selectedPatient.phone || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Age</div>
                <div className="text-sm text-gray-900">{selectedPatient.age || 'N/A'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-sm text-gray-500">Address</div>
                <div className="text-sm text-gray-900">{formatAddress(selectedPatient.address)}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-sm text-gray-500">Emergency Contact</div>
                <div className="text-sm text-gray-900">{selectedPatient.emergencyContactName || 'N/A'} ({selectedPatient.emergencyContactPhone || 'N/A'})</div>
              </div>
            </div>

            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => {
                  try {
                    setShowPatientModal(false);
                    setActiveTab('tasks');
                    setTaskFormData((prev) => ({
                      ...prev,
                      patient: selectedPatient?.id || '',
                      assignedTo: '',
                      title: prev.title && prev.title.trim().length > 0 ? prev.title : `Task for ${selectedPatient?.name || 'Patient'}`,
                    }));
                    setShowCreateTaskModal(true);
                  } catch {}
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Assign Task
              </button>
              <button
                onClick={() => {
                  setEditingPatient(selectedPatient);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  setEditingPatient(null);
                  setShowPatientModal(false);
                  setSelectedPatient(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ), document.body)}
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
                        <button className="text-blue-600 hover:text-blue-900 mr-4" onClick={() => viewPatientDetails(client)}>
                          View
                        </button>
                        <button className="text-green-600 hover:text-green-900 mr-4" onClick={() => handleStartEditPatient(client)}>
                          Edit
                        </button>
                        <button className="text-red-600 hover:text-red-900" onClick={() => handleDeletePatient(client.id)}>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {caregiver.status || 'active'}
                      </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => viewCaregiverDetails(caregiver)}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              View
                            </button>
                            <button className="text-green-600 hover:text-green-900 mr-4" onClick={() => handleStartEditCaregiver(caregiver)}>
                              Edit
                            </button>
                            <button className="text-red-600 hover:text-red-900" onClick={() => handleDeleteCaregiver(caregiver.id)}>
                              Delete
                            </button>
                            <button
                              className="ml-4 text-yellow-700 hover:text-yellow-900"
                              onClick={() => handleToggleCaregiverStatus(caregiver)}
                            >
                              {(caregiver.status || 'active') === 'suspended' ? 'Activate' : 'Suspend'}
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
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Caregiver Details</h2>
              <button
                onClick={() => {
                  setShowCaregiverModal(false);
                  setSelectedCaregiver(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Name</div>
                <div className="text-sm text-gray-900">{selectedCaregiver.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Email</div>
                <div className="text-sm text-gray-900">{selectedCaregiver.email}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Phone</div>
                <div className="text-sm text-gray-900">{selectedCaregiver.phone || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Role</div>
                <div className="text-sm text-gray-900">{selectedCaregiver.role || selectedCaregiver.medicalQualification || 'General Caregiver'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Experience</div>
                <div className="text-sm text-gray-900">{selectedCaregiver.experience || selectedCaregiver.yearsOfExperience || 'Not specified'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Status</div>
                <div className="text-sm text-gray-900">{selectedCaregiver.status || 'Pending'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Address</div>
                <div className="text-sm text-gray-900">{formatAddress(selectedCaregiver.address || selectedCaregiver.location)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">License Number</div>
                <div className="text-sm text-gray-900">{selectedCaregiver.licenseNumber || 'N/A'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-sm text-gray-500">Specializations</div>
                <div className="text-sm text-gray-900">{Array.isArray(selectedCaregiver.specializations) ? selectedCaregiver.specializations.join(', ') : (selectedCaregiver.specialization || 'N/A')}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-sm text-gray-500">Qualifications</div>
                <div className="text-sm text-gray-900">{selectedCaregiver.qualifications || selectedCaregiver.medicalQualification || 'N/A'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-sm text-gray-500">Bio</div>
                <div className="text-sm text-gray-900">{selectedCaregiver.bio || '—'}</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded">
                <h4 className="font-semibold mb-2">Assignments</h4>
                {caregiverAssignments && caregiverAssignments.length > 0 ? (
                  <ul className="list-disc list-inside text-sm text-gray-800 space-y-1 max-h-48 overflow-y-auto">
                    {caregiverAssignments.map(a => (
                      <li key={a.id}>
                        Patient: {a.patientName || a.patientId} • Status: {a.status || 'active'} • Start: {a.startDate ? new Date(a.startDate).toLocaleDateString() : 'N/A'}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-600 text-sm">No assignments found.</div>
                )}
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <h4 className="font-semibold mb-2">Recent Activity</h4>
                <div className="text-gray-600 text-sm">Activity feed integration pending.</div>
              </div>
            </div>

            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => handleStartEditCaregiver(selectedCaregiver)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Edit Details
              </button>
              <button
                onClick={() => handleToggleCaregiverStatus(selectedCaregiver)}
                className={`px-4 py-2 rounded text-white ${((selectedCaregiver.status || 'active') === 'suspended') ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}
              >
                {((selectedCaregiver.status || 'active') === 'suspended') ? 'Activate' : 'Suspend'}
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Assign Task
              </button>
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


      {/* Patient Modal */}
      {showPatientModal && selectedPatient && createPortal((
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{zIndex: 9999}}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Patient Details</h2>
              <button
                onClick={() => {
                  setEditingPatient(null);
                  setShowPatientModal(false);
                  setSelectedPatient(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600">Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  value={editingPatient?.name ?? selectedPatient.name}
                  onChange={(e) => setEditingPatient((prev) => ({ ...(prev || selectedPatient), name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Phone</label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border rounded-md"
                  value={(editingPatient && editingPatient.phone !== undefined ? editingPatient.phone : selectedPatient.phone) || ''}
                  onChange={(e) => setEditingPatient((prev) => ({ ...(prev || selectedPatient), phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Age</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-md"
                  value={(editingPatient && editingPatient.age !== undefined ? editingPatient.age : selectedPatient.age) || ''}
                  onChange={(e) => setEditingPatient((prev) => ({ ...(prev || selectedPatient), age: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Address</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  value={(editingPatient && editingPatient.address !== undefined ? editingPatient.address : selectedPatient.address) || ''}
                  onChange={(e) => setEditingPatient((prev) => ({ ...(prev || selectedPatient), address: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-6 bg-gray-50 p-4 rounded">
              <h4 className="font-semibold mb-2">Assignments</h4>
              {patientAssignments && patientAssignments.length > 0 ? (
                <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
                  {patientAssignments.map(a => (
                    <li key={a.id}>
                      Caregiver: {a.caregiverName || a.caregiverId} • Status: {a.status || 'active'} • Start: {a.startDate ? new Date(a.startDate).toLocaleDateString() : 'N/A'}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-gray-600 text-sm">No assignments found.</div>
              )}
            </div>
            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => {
                  setEditingPatient(null);
                  setShowPatientModal(false);
                  setSelectedPatient(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
              <button
                onClick={() => {
                  try {
                    setShowPatientModal(false);
                    setActiveTab('tasks');
                    setTaskFormData((prev) => ({
                      ...prev,
                      patient: selectedPatient?.id || '',
                      title: prev.title && prev.title.trim().length > 0 ? prev.title : `Task for ${selectedPatient?.name || 'Patient'}`,
                    }));
                    setShowCreateTaskModal(true);
                  } catch {}
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Assign Task
              </button>
              <button
                onClick={handleSavePatient}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      ), document.body)}
    </>
  );
};

export default NewAdminDashboard;
