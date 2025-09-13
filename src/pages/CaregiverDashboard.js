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
  Edit
} from 'lucide-react';

const CaregiverDashboard = () => {
  const [caregiver, setCaregiver] = useState(null);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [performance, setPerformance] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading caregiver data
    const loadCaregiverData = async () => {
      try {
        setTimeout(() => {
          const mockCaregiver = {
            id: 1,
            name: 'Tunde Adebayo',
            email: 'tunde@example.com',
            phone: '+234 802 123 4567',
            profileImage: null,
            rating: 4.8,
            totalPatients: 8,
            currentPatients: 3,
            experience: '5 years',
            joinDate: '2023-06-15',
            hourlyRate: 2500,
            totalEarnings: 2100000,
            thisMonthEarnings: 180000,
            performance: {
              punctuality: 95,
              patientSatisfaction: 4.8,
              taskCompletion: 98,
              communication: 4.7,
              safety: 100
            }
          };

          const mockTodaySchedule = [
            {
              id: 1,
              patientName: 'Adunni Okafor',
              patientId: 'ELD001',
              time: '09:00',
              duration: '8 hours',
              address: '123 Victoria Island, Lagos',
              tasks: [
                'Morning medication administration',
                'Breakfast preparation',
                'Physical therapy exercises',
                'Lunch preparation',
                'Afternoon medication',
                'Evening care routine'
              ],
              status: 'upcoming',
              notes: 'Patient has diabetes - monitor blood sugar levels',
              emergencyContact: '+234 801 987 6543'
            },
            {
              id: 2,
              patientName: 'Grace Johnson',
              patientId: 'ELD002',
              time: '14:00',
              duration: '4 hours',
              address: '456 Ikoyi, Lagos',
              tasks: [
                'Medication administration',
                'Light housekeeping',
                'Companionship',
                'Evening meal preparation'
              ],
              status: 'upcoming',
              notes: 'Patient prefers quiet environment',
              emergencyContact: '+234 803 456 7890'
            }
          ];

          const mockRecentTasks = [
            {
              id: 1,
              patientName: 'Adunni Okafor',
              task: 'Medication Administration',
              completedAt: '2024-01-20T08:30:00Z',
              status: 'completed',
              notes: 'Patient took medication without issues'
            },
            {
              id: 2,
              patientName: 'Grace Johnson',
              task: 'Physical Therapy',
              completedAt: '2024-01-20T10:15:00Z',
              status: 'completed',
              notes: 'Completed 30 minutes of exercises'
            },
            {
              id: 3,
              patientName: 'Adunni Okafor',
              task: 'Blood Sugar Check',
              completedAt: '2024-01-20T12:00:00Z',
              status: 'completed',
              notes: 'Blood sugar: 120 mg/dL - within normal range'
            }
          ];

          setCaregiver(mockCaregiver);
          setTodaySchedule(mockTodaySchedule);
          setRecentTasks(mockRecentTasks);
          setPerformance(mockCaregiver.performance);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading caregiver data:', error);
        setLoading(false);
      }
    };

    loadCaregiverData();
  }, []);

  const handleClockIn = (scheduleId) => {
    // Handle clock in
    console.log('Clock in for schedule:', scheduleId);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-50 dashboard-full-width">
      {/* Header */}
      <div className="w-full bg-white shadow-sm border-b border-gray-200 px-8 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {caregiver?.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome, {caregiver?.name}</h1>
              <p className="text-gray-600">Caregiver Dashboard</p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <button className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
              <Bell className="h-6 w-6" />
            </button>
            <button className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
              <Settings className="h-6 w-6" />
            </button>
            <button className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
              <LogOut className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full p-8 dashboard-full-width">
        <div className="space-y-6">
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
                  <p className="text-3xl font-bold text-gray-900">₦{caregiver?.thisMonthEarnings.toLocaleString()}</p>
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
      </div>
    </div>
  );
};

export default CaregiverDashboard;