import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  Plus,
  Search,
  Filter,
  Trash2,
  FileText,
  Heart,
  Phone,
  MapPin,
  X,
  Save
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { getTaskAssignmentsByCaregiver, completeTaskAssignment, updateTaskAssignment } from '../api/taskAssignmentAPI';
import { getPendingCareTasks, getCareTasksByCaregiver, updateCareTask, completeCareTask, createCareTask } from '../api/careTasksAPI';
import { getClientsByCaregiver, getClientsByIds } from '../api/patientsAPI';
import { toast } from 'react-toastify';

const CaregiverTasks = () => {
  const { user, userProfile } = useUser();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showAddTask, setShowAddTask] = useState(false);
  const [clients, setClients] = useState([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    clientId: '',
    scheduledTime: '',
    priority: 'medium',
    type: 'care',
    estimatedDuration: 60,
    location: ''
  });

  useEffect(() => {
    if (user?.uid) {
      loadTasks();
      loadClients();
    }
  }, [user?.uid]);

  const loadClients = async () => {
    try {
      const userId = userProfile?.id || user?.uid;
      if (!userId) return;
      
      const clientsData = await getClientsByCaregiver(userId).catch(() => []);
      setClients(clientsData || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const userId = userProfile?.id || user?.uid;
      if (!userId) {
        setLoading(false);
        return;
      }

      // Load from both sources: careTasks and taskAssignments
      const [careTasks, taskAssignments] = await Promise.all([
        getCareTasksByCaregiver(userId).catch(() => []),
        getTaskAssignmentsByCaregiver(userId).catch(() => [])
      ]);

      // Collect all unique client IDs so we can batch fetch them in one request
      const clientIds = new Set();
      (careTasks || []).forEach(t => { if (t.clientId) clientIds.add(t.clientId); });
      (taskAssignments || []).forEach(t => { if (t.clientId) clientIds.add(t.clientId); });
      const clientMap = new Map();
      if (clientIds.size > 0) {
        try {
          const clients = await getClientsByIds(Array.from(clientIds)).catch(() => []);
          (clients || []).forEach(c => { if (c?.id) clientMap.set(c.id, c); });
        } catch (e) {
          // Ignore batch fetch errors and fall back to default names
        }
      }

      // Normalize and merge tasks
      const normalizedTasks = [];

      // Process careTasks
      for (const task of careTasks || []) {
        const taskClient = clientMap.get(task.clientId);
        let clientName = taskClient ? (taskClient.name || taskClient.fullName || 'Unknown Client') : 'Unknown Client';

        normalizedTasks.push({
          id: task.id,
          title: task.title || task.taskTitle || 'Untitled Task',
          description: task.description || task.notes || '',
          clientId: task.clientId,
          clientName: clientName,
          status: task.status || 'pending',
          priority: task.priority || 'medium',
          type: task.type || task.taskType || 'care',
          scheduledTime: task.scheduledTime || task.dueDate,
          dueDate: task.dueDate || task.scheduledTime,
          estimatedDuration: task.estimatedDuration || 60,
          location: task.location || '',
          notes: task.notes || task.description || '',
          collection: 'careTasks',
          ...task
        });
      }

      // Process taskAssignments
      for (const task of taskAssignments || []) {
        const taskClient = clientMap.get(task.clientId);
        let clientName = taskClient ? (taskClient.name || taskClient.fullName || 'Unknown Client') : 'Unknown Client';
        normalizedTasks.push({
          id: task.id,
          title: task.title || task.taskTitle || task.taskDescription || 'Untitled Task',
          description: task.description || task.taskDescription || task.notes || '',
          clientId: task.clientId,
          clientName: clientName,
          status: task.status || 'pending',
          priority: task.priority || 'medium',
          type: task.type || task.taskType || 'care',
          scheduledTime: task.scheduledTime || task.dueDate,
          dueDate: task.dueDate || task.scheduledTime,
          estimatedDuration: task.estimatedDuration || 60,
          location: task.location || '',
          notes: task.notes || task.description || '',
          collection: 'taskAssignments',
          ...task
        });
      }

      // Remove duplicates and sort by due date
      const uniqueTasks = Array.from(new Map(normalizedTasks.map(t => [t.id, t])).values());
      uniqueTasks.sort((a, b) => {
        const dateA = new Date(a.dueDate || a.scheduledTime || 0);
        const dateB = new Date(b.dueDate || b.scheduledTime || 0);
        return dateA - dateB;
      });

      setTasks(uniqueTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const title = (task.title || '').toLowerCase();
    const clientName = (task.clientName || 'unknown client').toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || title.includes(searchLower) || clientName.includes(searchLower);
    
    // Normalize task status for comparison
    const taskStatus = (task.status || 'pending').toLowerCase().replace(/_/g, '-');
    const normalizedFilterStatus = filterStatus.toLowerCase().replace(/_/g, '-');
    const matchesStatus = filterStatus === 'all' || taskStatus === normalizedFilterStatus || 
                         (normalizedFilterStatus === 'in-progress' && (taskStatus === 'in-progress' || taskStatus === 'in_progress'));
    
    const matchesPriority = filterPriority === 'all' || (task.priority || 'medium').toLowerCase() === filterPriority.toLowerCase();
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'medication':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'therapy':
        return <Heart className="h-5 w-5 text-green-600" />;
      case 'meal':
        return <FileText className="h-5 w-5 text-orange-600" />;
      case 'emergency':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'care':
        return <User className="h-5 w-5 text-purple-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const handleTaskComplete = async (taskId) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      // Update in database based on collection type
      if (task.collection === 'careTasks') {
        await completeCareTask(taskId, 'Task completed by caregiver');
      } else {
        await completeTaskAssignment(taskId, 'Task completed by caregiver');
      }

      // Update local state
      setTasks(tasks.map(t => 
        t.id === taskId 
          ? { ...t, status: 'completed', completedAt: new Date().toISOString() }
          : t
      ));

      toast.success('Task completed successfully');
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Failed to complete task');
    }
  };

  const handleTaskStart = async (taskId) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      // Update in database based on collection type
      if (task.collection === 'careTasks') {
        await updateCareTask(taskId, { status: 'in-progress' });
      } else {
        await updateTaskAssignment(taskId, { status: 'in-progress' });
      }

      // Update local state
      setTasks(tasks.map(t => 
        t.id === taskId 
          ? { ...t, status: 'in-progress' }
          : t
      ));

      toast.success('Task started');
    } catch (error) {
      console.error('Error starting task:', error);
      toast.error('Failed to start task');
    }
  };

  const handleAddTask = async () => {
    try {
      if (!newTask.title || !newTask.scheduledTime) {
        toast.error('Please fill in required fields (title and scheduled time)');
        return;
      }

      const userId = userProfile?.id || user?.uid;
      if (!userId) {
        toast.error('User not found');
        return;
      }

      const taskData = {
        title: newTask.title,
        description: newTask.description,
        clientId: newTask.clientId || null,
        caregiverId: userId,
        scheduledTime: new Date(newTask.scheduledTime),
        priority: newTask.priority,
        type: newTask.type,
        estimatedDuration: newTask.estimatedDuration,
        location: newTask.location,
        status: 'pending'
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
        estimatedDuration: 60,
        location: ''
      });
      loadTasks(); // Reload tasks
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
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
    <div className="w-full h-full bg-gray-50 dashboard-full-width dashboard-container">
      {/* Header */}
      <div className="w-full bg-white shadow-sm border-b border-gray-200 px-8 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
              <p className="text-gray-600">Manage your care tasks and assignments</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setShowAddTask(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full p-8 dashboard-full-width">
        {/* Search and Filter */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tasks by title or Client name..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="in_progress">In Progress (alt)</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
              <select
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <option value="all">All Priority</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <button className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                More Filters
              </button>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <div key={task.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Task Header */}
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="p-2 bg-gray-50 rounded-lg">
                        {getTypeIcon(task.type)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            {task.clientName}
                          </span>
                          <span className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {task.location}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {task.estimatedDuration} min
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Task Description */}
                    <p className="text-gray-600 mb-4">{task.description}</p>

                    {/* Task Details */}
                    <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
                      {(task.dueDate || task.scheduledTime) && (
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>Due: {new Date(task.dueDate || task.scheduledTime).toLocaleDateString()} {new Date(task.dueDate || task.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      )}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status?.replace('-', ' ') || 'pending'}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority || 'medium'}
                      </span>
                    </div>

                    {/* Notes */}
                    {task.notes && (
                      <div className="bg-gray-50 p-3 rounded-lg mb-4">
                        <p className="text-sm text-gray-700">
                          <strong>Notes:</strong> {task.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-2 ml-6">
                    {(task.status === 'pending' || task.status === 'Pending') && (
                      <>
                        <button
                          onClick={() => handleTaskStart(task.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          Start Task
                        </button>
                        <button
                          onClick={() => handleTaskComplete(task.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          Complete
                        </button>
                      </>
                    )}
                    {(task.status === 'in-progress' || task.status === 'in_progress' || task.status === 'In Progress') && (
                      <button
                        onClick={() => handleTaskComplete(task.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        Mark Complete
                      </button>
                    )}
                    {(task.status === 'completed' || task.status === 'Completed') && (
                      <div className="flex items-center text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Completed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredTasks.length === 0 && !loading && (
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try adjusting your search criteria' : 'No tasks match the selected filters'}
            </p>
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Create New Task</h2>
                <button
                  onClick={() => setShowAddTask(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter task title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter task description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client (Optional)
                  </label>
                  <select
                    value={newTask.clientId}
                    onChange={(e) => setNewTask({...newTask, clientId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name || client.fullName || 'Unknown'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scheduled Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={newTask.scheduledTime}
                    onChange={(e) => setNewTask({...newTask, scheduledTime: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={newTask.type}
                    onChange={(e) => setNewTask({...newTask, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="care">Care</option>
                    <option value="medication">Medication</option>
                    <option value="therapy">Therapy</option>
                    <option value="meal">Meal</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={newTask.estimatedDuration}
                    onChange={(e) => setNewTask({...newTask, estimatedDuration: parseInt(e.target.value) || 60})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="15"
                    max="480"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={newTask.location}
                  onChange={(e) => setNewTask({...newTask, location: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter location (optional)"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddTask(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
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

export default CaregiverTasks;
