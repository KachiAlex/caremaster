import React from 'react';
import { Sun, Users, ClipboardList, AlertTriangle, Calendar, MapPin, TrendingUp, X, Clock } from 'lucide-react';

const MorningBriefing = ({ 
  patients = [], 
  todaysTasks = [], 
  todaysAppointments = [], 
  onClose, 
  onStartDay 
}) => {
  const totalTasks = todaysTasks.length;
  const urgentTasks = todaysTasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length;
  const patientsToVisit = new Set(todaysTasks.map(t => t.patientId)).size;
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getEstimatedDuration = () => {
    // Rough estimate: 30 min per patient + 15 min per task
    const visitTime = patientsToVisit * 30;
    const taskTime = totalTasks * 15;
    const totalMinutes = visitTime + taskTime;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 bg-opacity-95 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-600 p-8 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-white bg-opacity-20 p-3 rounded-full">
                <Sun className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">{getGreeting()}!</h2>
                <p className="text-blue-100">Here's your day at a glance</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
              <Users className="h-6 w-6 mx-auto mb-2" />
              <p className="text-2xl font-bold">{patientsToVisit}</p>
              <p className="text-xs text-blue-100">Patients</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
              <ClipboardList className="h-6 w-6 mx-auto mb-2" />
              <p className="text-2xl font-bold">{totalTasks}</p>
              <p className="text-xs text-blue-100">Tasks</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
              <Clock className="h-6 w-6 mx-auto mb-2" />
              <p className="text-2xl font-bold">{getEstimatedDuration()}</p>
              <p className="text-xs text-blue-100">Est. Time</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Urgent Items */}
          {urgentTasks > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className="font-semibold text-red-900">
                  {urgentTasks} Urgent Task{urgentTasks > 1 ? 's' : ''} Today
                </p>
              </div>
              <div className="mt-2 space-y-1">
                {todaysTasks
                  .filter(t => t.priority === 'high' || t.priority === 'urgent')
                  .slice(0, 3)
                  .map((task, index) => (
                    <p key={index} className="text-sm text-red-800">
                      • {task.title} - {task.patientName}
                    </p>
                  ))}
              </div>
            </div>
          )}

          {/* First 3 Patients */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-blue-600" />
              Today's Schedule
            </h3>
            <div className="space-y-3">
              {todaysTasks.slice(0, 5).map((task, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 text-blue-700 rounded-full h-8 w-8 flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{task.patientName || 'Patient'}</p>
                      <p className="text-sm text-gray-600">{task.title || task.type}</p>
                    </div>
                  </div>
                  {task.scheduledTime && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(task.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  )}
                </div>
              ))}
              {todaysTasks.length > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  +{todaysTasks.length - 5} more tasks
                </p>
              )}
              {todaysTasks.length === 0 && (
                <p className="text-center text-gray-500 py-4">No tasks scheduled for today</p>
              )}
            </div>
          </div>

          {/* Appointments */}
          {todaysAppointments.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                Today's Appointments
              </h3>
              <div className="space-y-2">
                {todaysAppointments.map((apt, index) => (
                  <div key={index} className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{apt.patientName || apt.type}</p>
                      <p className="text-sm text-gray-600">{apt.location || 'Virtual'}</p>
                    </div>
                    <p className="text-sm font-medium text-green-900">
                      {apt.scheduledTime ? new Date(apt.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'TBD'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Helpful Tip */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">💡 Tip:</span> Document care with photos for better family communication and quality reporting.
            </p>
          </div>

          {/* Action Button */}
          <button
            onClick={() => {
              onStartDay?.();
              onClose();
            }}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-600 text-white rounded-lg hover:from-blue-700 hover:to-blue-700 font-bold text-lg flex items-center justify-center space-x-2 shadow-lg"
          >
            <TrendingUp className="h-6 w-6" />
            <span>Start My Day</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MorningBriefing;

