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
  UserCheck,
  Home,
  Users,
  HelpCircle
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { getClientsByCaregiver } from '../api/patientsAPI';
import { toast } from 'react-toastify';
import DashboardLayout from '../components/DashboardLayout';
import AssignmentCalendar from '../components/AssignmentCalendar';
import { collection, query, getDocs, updateDoc, where, orderBy, doc } from 'backend/database';
import { db } from '../backend/config';

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
      {/* Statistics Cards - CareMaster Design System */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="cm-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="cm-mono text-xs uppercase tracking-wider text-text-soft mb-1">Today's Tasks</p>
              <p className="text-3xl font-bold text-ink">{todayTasks.length}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="cm-card p-6">
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
        <div className="cm-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="cm-mono text-xs uppercase tracking-wider text-text-soft mb-1">Assigned Clients</p>
              <p className="text-3xl font-bold text-ink">{assignedClients.length}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-xl">
              <User className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="cm-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="cm-mono text-xs uppercase tracking-wider text-text-soft mb-1">Completion Rate</p>
              <p className="text-3xl font-bold text-ink">{performance.taskCompletion || 0}%</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="cm-card p-6">
        <h2 className="cm-display text-lg text-ink mb-4">{userProfile?.medicalQualification || 'Healthcare'} Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {dashboardConfig.quickActions.map((action, index) => (
            <a
              key={index}
              href={action.href}
              className="flex flex-col items-center p-6 rounded-lg border-2 border-ink/10 hover:border-gold hover:bg-gold-soft/30 transition-colors group"
            >
              <div className="w-12 h-12 rounded-lg bg-gold-soft/30 text-gold-deep flex items-center justify-center mb-3 group-hover:bg-gold-soft/50">
                <action.icon className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-ink text-center">{action.name}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Assignment Calendar */}
      <AssignmentCalendar
        schedule={todayTasks.map(t => ({
          id: t.id,
          type: t.type || 'task',
          title: t.title || 'Task',
          time: t.dueDate || t.scheduledTime || '',
          client: t.clientName || 'Client',
          status: t.status || 'pending',
          priority: t.priority
        }))}
        onItemSelect={() => {}}
      />

      {/* Today's Tasks */}
      <div className="cm-card">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-ink/8 flex items-center justify-between">
          <h2 className="cm-display text-xl text-ink">Today's Schedule</h2>
          <button
            onClick={() => setActiveTab('schedule')}
            className="text-gold-deep hover:text-gold text-sm font-medium"
          >
            View All
          </button>
        </div>
        <div className="p-4 sm:p-6 lg:p-8">
          {todayTasks.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-ink/20 mx-auto mb-4" />
              <h3 className="cm-display text-lg text-ink mb-2">No Tasks Today</h3>
              <p className="text-text-soft">You have no scheduled tasks for today</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todayTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4 border border-ink/10 rounded-lg hover:bg-cream/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-ink">{task.title}</h4>
                      <p className="text-xs text-text-soft">
                        {task.clientName} • {task.dueDate ? new Date(task.dueDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'No time set'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      task.status === 'completed' ? 'bg-green-100 text-green-700' :
                      task.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {task.status}
                    </span>
                    {task.status === 'pending' && (
                      <button
                        onClick={() => handleTaskComplete(task.id)}
                        className="cm-btn-gold text-xs"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderPatients = () => {
    return (
      <div className="space-y-6">
        <div className="cm-section-head">
          <span className="cm-eyebrow">My Clients</span>
          <h2 className="mt-2">Assigned Clients: {assignedClients.length}</h2>
        </div>

        {assignedClients.length === 0 ? (
          <div className="cm-card p-12 text-center">
            <User className="h-16 w-16 text-ink/20 mx-auto mb-4" />
            <h3 className="cm-display text-lg text-ink mb-2">No Clients Assigned</h3>
            <p className="text-text-soft">You have no clients assigned to you yet.</p>
          </div>
        ) : (
          <div className="cm-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink/8">
                  <th className="px-6 py-4 text-left cm-mono text-xs uppercase tracking-wider text-text-soft">Client</th>
                  <th className="px-6 py-4 text-left cm-mono text-xs uppercase tracking-wider text-text-soft">Contact</th>
                  <th className="px-6 py-4 text-left cm-mono text-xs uppercase tracking-wider text-text-soft">Status</th>
                  <th className="px-6 py-4 text-left cm-mono text-xs uppercase tracking-wider text-text-soft">Last Visit</th>
                  <th className="px-6 py-4 text-right cm-mono text-xs uppercase tracking-wider text-text-soft">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignedClients.map((client) => (
                  <tr key={client.id} className="border-b border-ink/5 hover:bg-cream/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gold-soft/40 flex items-center justify-center">
                          <span className="text-sm font-medium text-gold-deep">
                            {client.name?.split(' ').map(n => n[0]).join('') || 'CL'}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-ink">{client.name}</div>
                          <div className="text-sm text-text-soft">{client.age}y, {client.gender}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-ink">{client.phone}</div>
                      <div className="text-sm text-text-soft">{client.address?.city}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-ink">
                      {client.lastVisit ? new Date(client.lastVisit).toLocaleDateString() : 'No visits yet'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => console.log('View client:', client)}
                          className="p-2 text-gold-deep hover:bg-gold-soft/30 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => window.open(`tel:${client.phone}`)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Call"
                        >
                          <Phone className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => console.log('Message client:', client)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Message"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderSchedule = () => (
    <div className="space-y-6">
      <div className="cm-section-head">
        <span className="cm-eyebrow">Schedule & Tasks</span>
        <h2 className="mt-2">Manage your daily schedule and assigned tasks</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="cm-card">
          <div className="px-4 sm:px-6 py-4 border-b border-ink/8">
            <h3 className="cm-display text-lg text-ink">Today's Tasks</h3>
          </div>
          <div className="p-4 sm:p-6">
            {todayTasks.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-ink/20 mx-auto mb-3" />
                <p className="text-text-soft">No tasks scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 border border-ink/10 rounded-lg">
                    <div>
                      <h4 className="text-sm font-semibold text-ink">{task.title}</h4>
                      <p className="text-xs text-text-soft">{task.clientName}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        task.status === 'completed' ? 'bg-green-100 text-green-700' :
                        task.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {task.status}
                      </span>
                      {task.status === 'pending' && (
                        <button
                          onClick={() => handleTaskComplete(task.id)}
                          className="px-2 py-1 bg-gold text-white rounded text-xs hover:bg-gold-deep"
                        >
                          ✓
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="cm-card">
          <div className="px-4 sm:px-6 py-4 border-b border-ink/8">
            <h3 className="cm-display text-lg text-ink">Recent Activity</h3>
          </div>
          <div className="p-4 sm:p-6">
            {recentTasks.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-ink/20 mx-auto mb-3" />
                <p className="text-text-soft">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 border border-ink/10 rounded-lg">
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
                        <h4 className="text-sm font-medium text-ink">{task.title}</h4>
                        <p className="text-xs text-text-soft">{task.clientName}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      task.status === 'completed' ? 'bg-green-100 text-green-700' :
                      task.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderActivities = () => (
    <div className="space-y-6">
      <div className="cm-section-head">
        <span className="cm-eyebrow">Care Activities</span>
        <h2 className="mt-2">Track and manage care activities</h2>
      </div>
      <div className="cm-card p-12 text-center">
        <Activity className="h-16 w-16 text-ink/20 mx-auto mb-4" />
        <h3 className="cm-display text-lg text-ink mb-2">Activity Tracking</h3>
        <p className="text-text-soft">Care activities and Client interactions will be tracked here</p>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="cm-section-head">
        <span className="cm-eyebrow">Settings</span>
        <h2 className="mt-2">Manage your profile and preferences</h2>
      </div>
      <div className="cm-card p-12 text-center">
        <Settings className="h-16 w-16 text-ink/20 mx-auto mb-4" />
        <h3 className="cm-display text-lg text-ink mb-2">Profile Configuration</h3>
        <p className="text-text-soft">Update your profile, qualifications, and availability settings</p>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'clients':
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

  // CareMaster design system - tabs for DashboardLayout sidebar
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'activities', label: 'Activities', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help & Support', icon: HelpCircle },
  ];

  const activeTabLabel = tabs.find((t) => t.id === activeTab)?.label || 'Dashboard';
  const displayName = userProfile?.name || userProfile?.displayName || 'Caregiver';

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
      <div className="min-h-screen cm-dashboard-body flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen cm-dashboard-body">
      <DashboardLayout
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        institutionName={dashboardConfig.title || 'Caregiver Portal'}
        portalLabel="Caregiver"
        displayName={displayName}
        userEmail={userProfile?.email || user?.email || ''}
        profilePictureUrl={userProfile?.photoURL || userProfile?.profilePicture}
        onLogout={handleLogout}
      >
        <div className="space-y-6">
          <div className="cm-section-head">
            <span className="cm-eyebrow">{activeTabLabel}</span>
            <h2 className="mt-2">{dashboardConfig.title}</h2>
            <p>Welcome back, {displayName}.</p>
          </div>
          {renderTabContent()}
        </div>
      </DashboardLayout>
    </div>
  );
};

export default PreclinicCaregiverDashboard;
