import React, { useState, useEffect } from 'react';
import { 
  User, 
  Phone, 
  MapPin, 
  Clock, 
  Heart, 
  Pill, 
  ClipboardList, 
  Camera,
  AlertTriangle,
  ChevronRight,
  CheckCircle,
  Calendar
} from 'lucide-react';
import { getCareTasksByPatient } from '../api/careTasksAPI';
import { getTaskAssignmentsByCaregiver } from '../api/taskAssignmentAPI';

const PatientCard = ({ patient, onViewDetails, onStartCare, compact = false }) => {
  const [todaysTasks, setTodaysTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPatientTasks = async () => {
      if (!patient?.id) return;
      
      try {
        // Get today's tasks for this patient
        const tasks = await getCareTasksByPatient(patient.id).catch(() => []);
        const today = new Date().toDateString();
        const todayTasksFiltered = tasks.filter(task => {
          const taskDate = task.scheduledTime ? new Date(task.scheduledTime).toDateString() : null;
          return taskDate === today && task.status !== 'completed';
        });
        
        setTodaysTasks(todayTasksFiltered);
      } catch (error) {
        console.error('Error loading patient tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPatientTasks();
  }, [patient?.id]);

  const getNextVisitTime = () => {
    if (todaysTasks.length === 0) return null;
    const sortedTasks = todaysTasks.sort((a, b) => 
      new Date(a.scheduledTime) - new Date(b.scheduledTime)
    );
    return sortedTasks[0]?.scheduledTime;
  };

  const getPriorityLevel = () => {
    const hasCritical = todaysTasks.some(t => t.priority === 'high' || t.priority === 'urgent');
    if (hasCritical) return 'high';
    if (todaysTasks.length > 0) return 'medium';
    return 'low';
  };

  const priorityColors = {
    high: 'border-l-4 border-red-500 bg-red-50',
    medium: 'border-l-4 border-yellow-500 bg-yellow-50',
    low: 'border-l-4 border-green-500 bg-white'
  };

  const nextVisit = getNextVisitTime();
  const priority = getPriorityLevel();

  if (compact) {
    return (
      <div 
        className={`bg-white rounded-lg shadow p-4 hover:shadow-md transition-all cursor-pointer ${priorityColors[priority]}`}
        onClick={() => onViewDetails(patient)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{patient.name}</h3>
              <p className="text-sm text-gray-600">{patient.age ? `Age ${patient.age}` : patient.email}</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all ${priorityColors[priority]}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">
              {patient.name?.split(' ').map(n => n[0]).join('') || 'P'}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{patient.name}</h3>
            <div className="flex items-center space-x-4 mt-1">
              {patient.age && (
                <span className="text-sm text-gray-600">Age {patient.age}</span>
              )}
              {patient.gender && (
                <span className="text-sm text-gray-600">{patient.gender}</span>
              )}
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                patient.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {patient.status || 'active'}
              </span>
            </div>
          </div>
        </div>
        
        {priority === 'high' && (
          <AlertTriangle className="h-6 w-6 text-red-600" />
        )}
      </div>

      {/* Quick Info Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {patient.phone && (
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-700">{patient.phone}</span>
          </div>
        )}
        {patient.address && (
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-700 truncate">{patient.address}</span>
          </div>
        )}
        {patient.medicalConditions && (
          <div className="flex items-center space-x-2 col-span-2">
            <Heart className="h-4 w-4 text-red-400" />
            <span className="text-sm text-gray-700">{patient.medicalConditions}</span>
          </div>
        )}
      </div>

      {/* Next Visit */}
      {nextVisit && (
        <div className="bg-blue-50 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Next Visit</p>
                <p className="text-xs text-blue-700">
                  {new Date(nextVisit).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartCare(patient);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Start Care
            </button>
          </div>
        </div>
      )}

      {/* Today's Tasks Summary */}
      <div className="border-t border-gray-200 pt-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900">Today's Tasks ({todaysTasks.length})</h4>
          <ClipboardList className="h-4 w-4 text-gray-400" />
        </div>
        
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ) : todaysTasks.length > 0 ? (
          <div className="space-y-2">
            {todaysTasks.slice(0, 3).map((task, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <CheckCircle className={`h-4 w-4 ${task.status === 'completed' ? 'text-green-600' : 'text-gray-300'}`} />
                <span className={task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-700'}>
                  {task.title || task.type}
                </span>
                {task.priority === 'high' && (
                  <span className="text-xs text-red-600 font-medium">URGENT</span>
                )}
              </div>
            ))}
            {todaysTasks.length > 3 && (
              <p className="text-xs text-gray-500">+{todaysTasks.length - 3} more tasks</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No tasks scheduled for today</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={() => onViewDetails(patient)}
          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm flex items-center justify-center"
        >
          <Camera className="h-4 w-4 mr-2" />
          View Details
        </button>
        {nextVisit && (
          <button
            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(patient.address || '')}`, '_blank')}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm flex items-center justify-center"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Navigate
          </button>
        )}
      </div>
    </div>
  );
};

export default PatientCard;

