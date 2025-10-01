import React, { useState } from 'react';
import { X, Camera, Upload, Check, Mic, AlertTriangle } from 'lucide-react';
import { completeCareTask } from '../api/careTasksAPI';
import { completeTaskAssignment } from '../api/taskAssignmentAPI';
import { toast } from 'react-toastify';
import FileUpload from './FileUpload';

const TaskCompletionModal = ({ task, patient, onClose, onComplete }) => {
  const [completionNotes, setCompletionNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const quickNotes = [
    'Task completed successfully',
    'Patient cooperative and comfortable',
    'No issues observed',
    'Patient requested assistance',
    'Follow-up needed',
    'Family member present'
  ];

  const handlePhotoCapture = (uploadedPhotos) => {
    setPhotos(prev => [...prev, ...uploadedPhotos]);
  };

  const handleRemovePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuickNoteClick = (note) => {
    setCompletionNotes(prev => prev ? `${prev}\n${note}` : note);
  };

  const handleVoiceNote = () => {
    // Toggle voice recording
    setIsRecording(!isRecording);
    
    if (!isRecording) {
      toast.info('Voice recording started...');
      // TODO: Implement actual voice recording
      setTimeout(() => {
        setIsRecording(false);
        toast.success('Voice note saved');
        setCompletionNotes(prev => prev + '\n[Voice note recorded]');
      }, 3000);
    }
  };

  const handleSubmit = async () => {
    if (!completionNotes.trim()) {
      toast.error('Please add completion notes');
      return;
    }

    try {
      setSubmitting(true);

      // Determine if it's a careTask or taskAssignment
      if (task.collection === 'careTasks') {
        await completeCareTask(task.id, completionNotes, photos);
      } else {
        await completeTaskAssignment(task.id, completionNotes, photos);
      }

      toast.success('Task completed successfully!');
      onComplete?.();
      onClose();
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Failed to complete task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Complete Task</h2>
            <p className="text-sm text-gray-600 mt-1">
              {patient?.name} - {task?.title || task?.type}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Task Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">{task?.title || task?.type}</h3>
            {task?.description && (
              <p className="text-sm text-gray-700">{task.description}</p>
            )}
            {task.scheduledTime && (
              <div className="flex items-center space-x-2 mt-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {new Date(task.scheduledTime).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Quick Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Notes
            </label>
            <div className="grid grid-cols-2 gap-2">
              {quickNotes.map((note, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleQuickNoteClick(note)}
                  className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-300 text-left"
                >
                  {note}
                </button>
              ))}
            </div>
          </div>

          {/* Completion Notes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Completion Notes *
              </label>
              <button
                type="button"
                onClick={handleVoiceNote}
                className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm ${
                  isRecording 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Mic className="h-4 w-4" />
                <span>{isRecording ? 'Recording...' : 'Voice Note'}</span>
              </button>
            </div>
            <textarea
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="Describe what was done, patient's response, any observations..."
              rows="4"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Photo Documentation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo Documentation (Optional)
            </label>
            <FileUpload
              onUpload={handlePhotoCapture}
              accept="image/*"
              multiple
              maxSize={5} // 5MB
            />
            
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo.url || URL.createObjectURL(photo)}
                      alt={`Documentation ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Patient Condition Check */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">Quick Patient Check</p>
                <div className="mt-2 space-y-1">
                  <label className="flex items-center text-sm text-yellow-800">
                    <input type="checkbox" className="mr-2" />
                    Patient is comfortable and safe
                  </label>
                  <label className="flex items-center text-sm text-yellow-800">
                    <input type="checkbox" className="mr-2" />
                    No new concerns or symptoms
                  </label>
                  <label className="flex items-center text-sm text-yellow-800">
                    <input type="checkbox" className="mr-2" />
                    Environment is clean and secure
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !completionNotes.trim()}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Complete Task
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCompletionModal;

