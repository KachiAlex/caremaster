import React from 'react';
import { X, AlertTriangle, User, Calendar, Clock, MapPin, ClipboardList } from 'lucide-react';

const TaskInstructionModal = ({ isOpen, onClose, task }) => {
  if (!isOpen || !task) return null;

  const priorityColors = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-green-100 text-green-800 border-green-200',
  };

  const priorityIcons = {
    critical: <AlertTriangle className="h-4 w-4 text-red-600" />,
    high: <AlertTriangle className="h-4 w-4 text-orange-600" />,
    medium: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
    low: <AlertTriangle className="h-4 w-4 text-green-600" />,
  };

  const scheduledDate = task.scheduledTime || task.dueDate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClipboardList className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{task.title || 'Task Details'}</h2>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${priorityColors[task.priority || 'medium']}`}>
                    {priorityIcons[task.priority || 'medium']}
                    <span className="ml-1 capitalize">{task.priority || 'medium'}</span>
                  </span>
                  <span className="text-sm text-gray-500 capitalize">{task.status?.replace('-', ' ') || 'pending'}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Meta Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {task.clientName && (
              <div className="flex items-center text-gray-600">
                <User className="h-4 w-4 mr-2 text-gray-400" />
                <span>{task.clientName}</span>
              </div>
            )}
            {scheduledDate && (
              <div className="flex items-center text-gray-600">
                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                <span>{new Date(scheduledDate).toLocaleDateString()}</span>
              </div>
            )}
            {task.estimatedDuration && (
              <div className="flex items-center text-gray-600">
                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                <span>{task.estimatedDuration} min</span>
              </div>
            )}
            {task.location && (
              <div className="flex items-center text-gray-600">
                <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                <span>{task.location}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Description</h3>
              <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">{task.description}</p>
            </div>
          )}

          {/* Instructions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Instructions</h3>
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
              <p className="text-gray-800 text-sm whitespace-pre-wrap">
                {task.instructions || 'No detailed instructions provided for this task.'}
              </p>
            </div>
          </div>

          {/* Notes */}
          {task.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Notes</h3>
              <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">{task.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskInstructionModal;
