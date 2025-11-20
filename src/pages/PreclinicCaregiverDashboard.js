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
import { getClientsByCaregiver } from '../api/patientsAPI';
import { collection, query, where, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-toastify';
import PreclinicLayout from '../components/PreclinicLayout';
import { StatCard, PreclinicTable, StatusBadge, PageHeader, PreclinicCard } from '../components/PreclinicComponents';

const PreclinicCaregiverDashboard = () => {
  const { user, userProfile } = useUser();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [caregiver, setCaregiver] = useState(null);
  const [assignedClients, setAssignedClients] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [performance, setPerformance] = useState({});
  const [loading, setLoading] = useState(true);

  // Get qualification-specific dashboard configuration
  const getDashboardConfig = () => {
    const qualification = userProfile?.medicalQualification || 'Caregiver (Non-Medical)';
    
    const configs = {
      'Doctor (MD)': {
        title: 'Doctor Dashboard',
        icon: Stethoscope,
        color: 'blue',
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
        quickActions: [
          { name: 'Therapy Sessions', icon: Brain, href: '/service-provider/consultations' },
          { name: 'Assessments', icon: FileText, href: '/service-provider/diagnostics' },
          { name: 'Treatment Plans', icon: Heart, href: '/service-provider/care-logs' },
          { name: 'Video Therapy', icon: Camera, href: '/service-provider/messages' }
        ]
      },
      'Caregiver (Non-Medical)': {
        title: 'Caregiver Dashboard',
        icon: Heart,
        color: 'blue',
        quickActions: [
          { name: 'Daily Care', icon: Heart, href: '/service-provider/daily-care' },
          { name: 'Activity Assistance', icon: User, href: '/service-provider/activities' },
          { name: 'Companionship', icon: MessageSquare, href: '/service-provider/companionship' },
          { name: 'Safety Monitoring', icon: Shield, href: '/service-provider/safety' }
        ]
      }
    };

    return configs[qualification] || configs['Caregiver (Non-Medical)'];
  };

  const dashboardConfig = getDashboardConfig();

  const handleTaskComplete = async (taskId) => {
    try {
      await updateDoc(doc(db, 'careTasks', taskId), {
        status: 'completed',
        completedAt: new Date()
      });
      toast.success('Task completed successfully');
      loadDashboardData();
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Failed to complete task');
    }
  };

  const loadDashboardData = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      
      // Load caregiver profile
      const caregiversRef = collection(db, 'caregivers');
      const caregiverQuery = query(caregiversRef, where('userId', '==', user.uid));
      const caregiverSnapshot = await getDocs(caregiverQuery);
      
      let caregiverData = null;
      if (!caregiverSnapshot.empty) {
        caregiverData = { id: caregiverSnapshot.docs[0].id, ...caregiverSnapshot.docs[0].data() };
      }

      // Load assigned clients
      const assignedClientsData = await getClientsByCaregiver(user.uid).catch(err => {
        console.warn('Failed to fetch assigned clients:', err);
        return [];
      });

      // Load today's tasks
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const careTasksRef = collection(db, 'careTasks');
      const todayTasksQuery = query(
        careTasksRef,
        where('assignedTo', '==', user.uid),
        where('dueDate', '>=', today),
        where('dueDate', '<', tomorrow),
        orderBy('dueDate', 'asc')
      );
      const todayTasksSnapshot = await getDocs(todayTasksQuery);
      
      const todayTasksData = [];
      todayTasksSnapshot.forEach(doc => {
        todayTasksData.push({
          id: doc.id,
          ...doc.data(),
          dueDate: doc.data().dueDate?.toDate?.() || doc.data().dueDate
        });
      });

      // Load recent tasks (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const recentTasksQuery = query(
        careTasksRef,
        where('assignedTo', '==', user.uid),
        where('updatedAt', '>=', weekAgo),
        orderBy('updatedAt', 'desc')
      );
      const recentTasksSnapshot = await getDocs(recentTasksQuery);
      
      const recentTasksData = [];
      recentTasksSnapshot.forEach(doc => {
        recentTasksData.push({
          id: doc.id,
          ...doc.data(),
          updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt
        });
      });

      // Calculate performance metrics
      const completedTasks = recentTasksData.filter(task => task.status === 'completed').length;
      const totalTasks = recentTasksData.length;
      const taskCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      setCaregiver(caregiverData);
      setAssignedClients(assignedClientsData);
      setTodayTasks(todayTasksData);
      setRecentTasks(recentTasksData);
      setPerformance({
        taskCompletion,
        completedTasks,
        totalTasks
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user?.uid]);

  const renderDashboard = () => (
    <div className="space-y-6">
      <PageHeader 
        title={dashboardConfig.title}
        subtitle={`Welcome, ${userProfile?.name || 'Healthcare Professional'}`}
      />

      {/* Statistics Cards - Preclinic Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Today's Tasks"
          value={todayTasks.length}
          change="+12%"
          changeType="increase"
          icon={Calendar}
          color="blue"
        />
        <StatCard
          title="Completed Tasks"
          value={recentTasks.filter(t => t.status === 'completed').length}
          change="+8%"
          changeType="increase"
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Assigned Clients"
          value={assignedClients.length}
          change="+5%"
          changeType="increase"
          icon={User}
          color="yellow"
        />
        <StatCard
          title="Completion Rate"
          value={`${performance.taskCompletion || 0}%`}
          change="+3%"
          changeType="increase"
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Quick Actions - Preclinic Style */}
      <PreclinicCard title={`${userProfile?.medicalQualification || 'Healthcare'} Quick Actions`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {dashboardConfig.quickActions.map((action, index) => (
            <a
              key={index}
              href={action.href}
              className={`flex flex-col items-center p-6 rounded-lg border-2 border-gray-200 hover:border-${dashboardConfig.color}-300 hover:bg-${dashboardConfig.color}-50 transition-colors group`}
            >
              <div className={`w-12 h-12 rounded-lg bg-${dashboardConfig.color}-50 text-${dashboardConfig.color}-600 flex items-center justify-center mb-3 group-hover:bg-${dashboardConfig.color}-100`}>
                <action.icon className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-gray-700 text-center">{action.name}</span>
            </a>
          ))}
        </div>
      </PreclinicCard>

      {/* Today's Tasks */}
      <PreclinicCard 
        title="Today's Schedule"
        actions={[
          {
            label: 'View All',
            onClick: () => setActiveTab('schedule'),
            className: 'text-blue-600 hover:text-blue-800'
          }
        ]}
      >
        {todayTasks.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Tasks Today</h3>
            <p className="text-gray-600">You have no scheduled tasks for today</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todayTasks.slice(0, 3).map((task) => (
              <div key={task.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{task.title}</h4>
                    <p className="text-xs text-gray-600">
                      {task.clientName} • {task.dueDate ? new Date(task.dueDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'No time set'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <StatusBadge status={task.status} />
                  {task.status === 'pending' && (
                    <button
                      onClick={() => handleTaskComplete(task.id)}
                      className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </PreclinicCard>
    </div>
  );

  const renderPatients = () => {
    const patientTableData = assignedClients.map(client => ({
      patient: (
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">
              {client.name?.split(' ').map(n => n[0]).join('') || 'CL'}
            </span>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{client.name}</div>
            <div className="text-sm text-gray-500">{client.age}y, {client.gender}</div>
          </div>
        </div>
      ),
      contact: (
        <div>
          <div className="text-sm text-gray-900">{client.phone}</div>
          <div className="text-sm text-gray-500">{client.address?.city}</div>
        </div>
      ),
      status: <StatusBadge status="Active" />,
      lastVisit: (
        <div className="text-sm text-gray-900">
          {client.lastVisit ? new Date(client.lastVisit).toLocaleDateString() : 'No visits yet'}
        </div>
      ),
      id: client.id
    }));

    const patientActions = [
      {
        label: 'View',
        icon: Eye,
        onClick: (client) => console.log('View client:', client),
        className: 'text-blue-600 hover:text-blue-900 hover:bg-blue-50'
      },
      {
        label: 'Call',
        icon: Phone,
        onClick: (client) => window.open(`tel:${client.phone}`),
        className: 'text-green-600 hover:text-green-900 hover:bg-green-50'
      },
      {
        label: 'Message',
        icon: MessageSquare,
        onClick: (client) => console.log('Message client:', client),
        className: 'text-purple-600 hover:text-purple-900 hover:bg-purple-50'
      }
    ];

    return (
      <div className="space-y-6">
        <PageHeader 
          title="My Patients"
          subtitle={`Assigned Patients: ${assignedClients.length}`}
        />
        
        <PreclinicTable
          headers={['Patient', 'Contact', 'Status', 'Last Visit']}
          data={patientTableData}
          actions={patientActions}
          loading={loading}
        />
      </div>
    );
  };

  const renderSchedule = () => (
    <div className="space-y-6">
      <PageHeader 
        title="Schedule & Tasks"
        subtitle="Manage your daily schedule and assigned tasks"
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PreclinicCard title="Today's Tasks">
          {todayTasks.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No tasks scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{task.title}</h4>
                    <p className="text-xs text-gray-600">{task.clientName}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <StatusBadge status={task.status} />
                    {task.status === 'pending' && (
                      <button
                        onClick={() => handleTaskComplete(task.id)}
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                      >
                        ✓
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </PreclinicCard>

        <PreclinicCard title="Recent Activity">
          {recentTasks.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      task.status === 'completed' ? 'bg-green-100' : 'bg-yellow-100'
                    }`}>
                      {task.status === 'completed' ? 
                        <CheckCircle className="h-4 w-4 text-green-600" /> :
                        <Clock className="h-4 w-4 text-yellow-600" />
                      }
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
                      <p className="text-xs text-gray-600">{task.clientName}</p>
                    </div>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              ))}
            </div>
          )}
        </PreclinicCard>
      </div>
    </div>
  );

  const renderActivities = () => (
    <div className="space-y-6">
      <PageHeader title="Care Activities" subtitle="Track and manage care activities" />
      <PreclinicCard title="Activity Log">
        <div className="text-center py-12">
          <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Activity Tracking</h3>
          <p className="text-gray-600">Care activities and patient interactions will be tracked here</p>
        </div>
      </PreclinicCard>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Manage your profile and preferences" />
      <PreclinicCard title="Profile Settings">
        <div className="text-center py-12">
          <Settings className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Configuration</h3>
          <p className="text-gray-600">Update your profile, qualifications, and availability settings</p>
        </div>
      </PreclinicCard>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'patients':
        return renderPatients();
      case 'schedule':
        return renderSchedule();
      case 'activities':
        return renderActivities();
      case 'settings':
        return renderSettings();
      default:
        return renderDashboard();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <PreclinicLayout 
      userRole="caregiver" 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      userEmail={userProfile?.email || user?.email}
    >
      {renderTabContent()}
    </PreclinicLayout>
  );
};

export default PreclinicCaregiverDashboard;
