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
  Eye, 
  Edit, 
  Trash2,
  Star,
  FileText,
  Heart,
  Phone,
  MapPin
} from 'lucide-react';

const CaregiverTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  useEffect(() => {
    // Simulate loading task data
    const loadTasks = async () => {
      try {
        setTimeout(() => {
          const mockTasks = [
            {
              id: 1,
              title: 'Morning Medication Administration',
              patientName: 'Adunni Okafor',
              patientId: 'ELD001',
              description: 'Administer morning diabetes medications and check blood sugar levels',
              status: 'pending',
              priority: 'high',
              dueDate: '2024-01-21T09:00:00Z',
              estimatedDuration: 30,
              location: '123 Victoria Island, Lagos',
              type: 'medication',
              notes: 'Patient has diabetes - monitor blood sugar levels',
              completedAt: null,
              createdAt: '2024-01-20T08:00:00Z'
            },
            {
              id: 2,
              title: 'Physical Therapy Session',
              patientName: 'Grace Johnson',
              patientId: 'ELD002',
              description: 'Assist with 30-minute physical therapy exercises',
              status: 'completed',
              priority: 'medium',
              dueDate: '2024-01-20T10:00:00Z',
              estimatedDuration: 45,
              location: '456 Ikoyi, Lagos',
              type: 'therapy',
              notes: 'Patient prefers gentle exercises',
              completedAt: '2024-01-20T10:30:00Z',
              createdAt: '2024-01-20T07:00:00Z'
            },
            {
              id: 3,
              title: 'Lunch Preparation',
              patientName: 'Adunni Okafor',
              patientId: 'ELD001',
              description: 'Prepare diabetic-friendly lunch meal',
              status: 'in-progress',
              priority: 'medium',
              dueDate: '2024-01-21T12:00:00Z',
              estimatedDuration: 60,
              location: '123 Victoria Island, Lagos',
              type: 'meal',
              notes: 'Follow diabetic diet guidelines',
              completedAt: null,
              createdAt: '2024-01-20T08:30:00Z'
            },
            {
              id: 4,
              title: 'Emergency Response',
              patientName: 'Michael Adebayo',
              patientId: 'ELD003',
              description: 'Respond to emergency alert - check patient condition',
              status: 'pending',
              priority: 'critical',
              dueDate: '2024-01-21T14:30:00Z',
              estimatedDuration: 15,
              location: '789 Lekki, Lagos',
              type: 'emergency',
              notes: 'Patient has mobility issues',
              completedAt: null,
              createdAt: '2024-01-20T14:15:00Z'
            },
            {
              id: 5,
              title: 'Evening Care Routine',
              patientName: 'Grace Johnson',
              patientId: 'ELD002',
              description: 'Evening medication and bedtime routine',
              status: 'pending',
              priority: 'medium',
              dueDate: '2024-01-21T18:00:00Z',
              estimatedDuration: 45,
              location: '456 Ikoyi, Lagos',
              type: 'care',
              notes: 'Patient prefers quiet environment',
              completedAt: null,
              createdAt: '2024-01-20T17:00:00Z'
            }
          ];

          setTasks(mockTasks);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading tasks:', error);
        setLoading(false);
      }
    };

    loadTasks();
  }, []);

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.patientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
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

  const handleTaskComplete = (taskId) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, status: 'completed', completedAt: new Date().toISOString() }
        : task
    ));
  };

  const handleTaskStart = (taskId) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, status: 'in-progress' }
        : task
    ));
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
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
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
                  placeholder="Search tasks by title or patient name..."
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
                            {task.patientName}
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
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>Due: {new Date(task.dueDate).toLocaleDateString()} {new Date(task.dueDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
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
                    {task.status === 'pending' && (
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
                    {task.status === 'in-progress' && (
                      <button
                        onClick={() => handleTaskComplete(task.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        Mark Complete
                      </button>
                    )}
                    {task.status === 'completed' && (
                      <div className="flex items-center text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Completed
                      </div>
                    )}
                    <div className="flex space-x-1">
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try adjusting your search criteria' : 'No tasks match the selected filters'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaregiverTasks;
