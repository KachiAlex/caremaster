import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  MessageSquare, 
  Navigation,
  CheckCircle,
  AlertTriangle,
  Star,
  Plus,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Heart,
  Activity,
  FileText,
  Edit,
  Trash2,
  Save,
  X
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { 
  getTodaysCareTasks, 
  getPendingCareTasks, 
  createCareTask, 
  updateCareTask, 
  completeCareTask 
} from '../api/careTasksAPI';
import { 
  getTodaysAppointments, 
  getUpcomingAppointments 
} from '../api/appointmentsAPI';
import { toast } from 'react-toastify';

const CaregiverSchedule = () => {
  const { userProfile, userRole } = useUser();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [careTasks, setCareTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddTask, setShowAddTask] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    type: 'all'
  });
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    clientId: '',
    scheduledTime: '',
    priority: 'medium',
    type: 'care',
    estimatedDuration: 60
  });

  useEffect(() => {
    if (userProfile?.id) {
      loadScheduleData();
    }
  }, [selectedDate, userProfile?.id]);

  const loadScheduleData = async () => {
    if (!userProfile?.id) return;
    
    try {
      setLoading(true);
      
      // Load real data from backend
      const [todaysTasks, pendingTasks, todaysAppointments, upcomingAppointments] = await Promise.all([
        getTodaysCareTasks(userProfile.id).catch(err => {
          console.warn('Failed to fetch today\'s care tasks:', err);
          return [];
        }),
        getPendingCareTasks(userProfile.id).catch(err => {
          console.warn('Failed to fetch pending care tasks:', err);
          return [];
        }),
        getTodaysAppointments(userProfile.id, userRole).catch(err => {
          console.warn('Failed to fetch today\'s appointments:', err);
          return [];
        }),
        getUpcomingAppointments(userProfile.id, userRole).catch(err => {
          console.warn('Failed to fetch upcoming appointments:', err);
          return [];
        })
      ]);

      // Combine and format data
      const allTasks = [...todaysTasks, ...pendingTasks];
      const allAppointments = [...todaysAppointments, ...upcomingAppointments];
      
      setCareTasks(allTasks);
      setAppointments(allAppointments);
      
      // If no real data, show sample data for demo
      if (allTasks.length === 0 && allAppointments.length === 0) {
        const mockAppointments = [
          {
            id: 1,
            patientName: 'Adunni Okafor',
            patientAge: 72,
            patientAddress: '123 Victoria Island, Lagos',
            patientPhone: '+234 801 234 5678',
            appointmentTime: '09:00',
            duration: 60,
            type: 'Home Visit',
            status: 'scheduled',
            tasks: [
              'Medication administration',
              'Vital signs check',
              'Meal preparation',
              'Light housekeeping'
            ],
            notes: 'Patient has diabetes, check blood sugar levels',
            priority: 'high',
            estimatedTravelTime: 25
          },
          {
            id: 2,
            patientName: 'Tunde Adebayo',
            patientAge: 68,
            patientAddress: '456 Ikoyi, Lagos',
            patientPhone: '+234 802 345 6789',
            appointmentTime: '11:30',
            duration: 90,
            type: 'Home Visit',
            status: 'scheduled',
            tasks: [
              'Physical therapy exercises',
              'Medication reminder',
              'Grocery shopping',
              'Companionship'
            ],
            notes: 'Patient recovering from hip surgery',
            priority: 'medium',
            estimatedTravelTime: 15
          },
          {
            id: 3,
            patientName: 'Grace Johnson',
            patientAge: 75,
            patientAddress: '789 Lekki, Lagos',
            patientPhone: '+234 803 456 7890',
            appointmentTime: '14:00',
            duration: 45,
            type: 'Home Visit',
            status: 'completed',
            tasks: [
              'Medication administration',
              'Vital signs check',
              'Meal preparation'
            ],
            notes: 'Regular checkup visit',
            priority: 'low',
            estimatedTravelTime: 30
          }
        ];

        setAppointments(mockAppointments);
      }
    } catch (error) {
      console.error('Error loading schedule data:', error);
      toast.error('Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  };

  // Task Management Functions
  const handleAddTask = async () => {
    try {
      if (!newTask.title || !newTask.scheduledTime) {
        toast.error('Please fill in required fields');
        return;
      }

      const taskData = {
        ...newTask,
        caregiverId: userProfile.id,
        status: 'pending',
        createdAt: new Date(),
        scheduledTime: new Date(newTask.scheduledTime)
      };

      await createCareTask(taskData);
      toast.success('Task created successfully');
      setShowAddTask(false);
      setNewTask({
        title: '',
        description: '',
        clientId: '',
        scheduledTime: '',
        priority: 'medium',
        type: 'care',
        estimatedDuration: 60
      });
      loadScheduleData();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  const handleEditTask = async (taskId, updatedData) => {
    try {
      await updateCareTask(taskId, updatedData);
      toast.success('Task updated successfully');
      setEditingTask(null);
      loadScheduleData();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleCompleteTask = async (taskId, notes = '') => {
    try {
      await completeCareTask(taskId, notes);
      toast.success('Task completed successfully');
      loadScheduleData();
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Failed to complete task');
    }
  };

  const handleCancelTask = async (taskId) => {
    try {
      await updateCareTask(taskId, { 
        status: 'cancelled', 
        cancelledAt: new Date() 
      });
      toast.success('Task cancelled');
      loadScheduleData();
    } catch (error) {
      console.error('Error cancelling task:', error);
      toast.error('Failed to cancel task');
    }
  };

  // Filter Functions
  const getFilteredTasks = () => {
    return careTasks.filter(task => {
      const matchesStatus = filters.status === 'all' || task.status === filters.status;
      const matchesPriority = filters.priority === 'all' || task.priority === filters.priority;
      const matchesType = filters.type === 'all' || task.type === filters.type;
      return matchesStatus && matchesPriority && matchesType;
    });
  };

  const getFilteredAppointments = () => {
    const selectedDateStr = selectedDate.toDateString();
    return appointments.filter(apt => {
      const aptDate = new Date(apt.scheduledTime || apt.appointmentTime);
      return aptDate.toDateString() === selectedDateStr;
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    setSelectedDate(newDate);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Today's Schedule</h1>
          <p className="text-gray-600">Your appointments and tasks for {formatDate(selectedDate)}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </button>
          <button 
            onClick={() => setShowAddTask(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({...filters, priority: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="care">Personal Care</option>
                <option value="medical">Medical Care</option>
                <option value="household">Household Tasks</option>
                <option value="social">Social Activities</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Date Navigation */}
      <div className="card">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateDate(-1)}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">{formatDate(selectedDate)}</h2>
            <p className="text-sm text-gray-500">
              {appointments.filter(apt => apt.status === 'scheduled').length} appointments scheduled
            </p>
          </div>
          <button
            onClick={() => navigateDate(1)}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Schedule Timeline */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Schedule Timeline</h2>
        <div className="space-y-4">
          {appointments
            .filter(apt => apt.status === 'scheduled')
            .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime))
            .map((appointment) => (
            <div key={appointment.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-600 font-medium">
                        {appointment.patientName.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{appointment.patientName}</h3>
                      <span className="text-sm text-gray-500">Age: {appointment.patientAge}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(appointment.priority)}`}>
                        {appointment.priority} priority
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                        {appointment.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>{appointment.appointmentTime} ({appointment.duration} minutes)</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>{appointment.patientAddress}</span>
                      </div>
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2" />
                        <span>{appointment.patientPhone}</span>
                      </div>
                      <div className="flex items-center">
                        <Navigation className="h-4 w-4 mr-2" />
                        <span>{appointment.estimatedTravelTime} min travel time</span>
                      </div>
                    </div>
                    <div className="mb-3">
                      <p className="text-sm text-gray-600">{appointment.notes}</p>
                    </div>
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Tasks:</h4>
                      <div className="flex flex-wrap gap-2">
                        {appointment.tasks.map((task, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {task}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => window.open(`https://maps.google.com/maps?q=${encodeURIComponent(appointment.patientAddress)}`, '_blank')}
                    className="btn btn-secondary"
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Navigate
                  </button>
                  <button 
                    onClick={() => window.location.href = `/service-provider/calls?start=${appointment.id}`}
                    className="btn btn-secondary"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </button>
                  <button 
                    onClick={() => window.location.href = `/service-provider/messages?client=${appointment.patientName}`}
                    className="btn btn-secondary"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </button>
                  <button 
                    onClick={() => handleCompleteTask(appointment.id)}
                    className="btn btn-primary"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Appointments</p>
              <p className="text-2xl font-semibold text-gray-900">
                {appointments.filter(apt => apt.status === 'scheduled').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">
                {appointments.filter(apt => apt.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Hours</p>
              <p className="text-2xl font-semibold text-gray-900">
                {appointments.reduce((total, apt) => total + apt.duration, 0) / 60}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">High Priority</p>
              <p className="text-2xl font-semibold text-gray-900">
                {appointments.filter(apt => apt.priority === 'high').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Add New Task</h3>
              <button
                onClick={() => setShowAddTask(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Task Title *</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Enter task description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Scheduled Time *</label>
                <input
                  type="datetime-local"
                  value={newTask.scheduledTime}
                  onChange={(e) => setNewTask({...newTask, scheduledTime: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={newTask.type}
                    onChange={(e) => setNewTask({...newTask, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="care">Personal Care</option>
                    <option value="medical">Medical Care</option>
                    <option value="household">Household Tasks</option>
                    <option value="social">Social Activities</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                <input
                  type="number"
                  value={newTask.estimatedDuration}
                  onChange={(e) => setNewTask({...newTask, estimatedDuration: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="15"
                  max="480"
                />
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 p-6 border-t">
              <button
                onClick={() => setShowAddTask(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaregiverSchedule;
