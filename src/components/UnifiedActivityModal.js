import React, { useState, useMemo } from 'react';
import {
  X, CheckCircle, FileText, Activity, Heart, Camera,
  Clock, User, AlertTriangle, ChevronDown, ChevronUp,
  Pill, Utensils, Droplets, Thermometer
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import { createCareLog } from '../api/careLogsAPI';
import { completeCareTask } from '../api/careTasksAPI';
import { completeTaskAssignment } from '../api/taskAssignmentAPI';
import adlAPI from '../api/adlAPI';
import FileUpload from './FileUpload';

const LOG_TYPES = [
  { id: 'task', label: 'Complete Task', icon: CheckCircle, color: 'green', description: 'Finish an assigned task' },
  { id: 'care-note', label: 'Care Note', icon: FileText, color: 'blue', description: 'General care observation' },
  { id: 'adl', label: 'ADL Activity', icon: Activity, color: 'purple', description: 'Activity of Daily Living' },
  { id: 'vitals', label: 'Vital Signs', icon: Heart, color: 'red', description: 'Record vital signs' },
];

const ADL_CATEGORIES = {
  'personal-care': 'Personal Care',
  'mobility': 'Mobility & Transfers',
  'nutrition': 'Nutrition & Feeding',
  'toileting': 'Toileting & Incontinence',
  'medication': 'Medication & Health',
  'household': 'Household & Homemaking',
  'transportation': 'Transportation & Appointments',
  'social': 'Social & Companionship',
};

const ADL_ACTIVITIES = [
  { id: 'bathing', name: 'Bathing/Shower', category: 'personal-care', icon: '🛁' },
  { id: 'dressing', name: 'Dressing', category: 'personal-care', icon: '👕' },
  { id: 'grooming', name: 'Grooming', category: 'personal-care', icon: '💄' },
  { id: 'oral-care', name: 'Oral Care', category: 'personal-care', icon: '🦷' },
  { id: 'hair-care', name: 'Hair Care', category: 'personal-care', icon: '💇' },
  { id: 'skin-care', name: 'Skin Care', category: 'personal-care', icon: '🧴' },
  { id: 'ambulation', name: 'Ambulation', category: 'mobility', icon: '🚶' },
  { id: 'assist-walking', name: 'Assist with Walking', category: 'mobility', icon: '🚶‍♂️' },
  { id: 'transfer', name: 'Transfer', category: 'mobility', icon: '🔄' },
  { id: 'positioning', name: 'Positioning', category: 'mobility', icon: '🛌' },
  { id: 'exercise', name: 'Exercise', category: 'mobility', icon: '🏃' },
  { id: 'feeding', name: 'Feeding', category: 'nutrition', icon: '🍽️' },
  { id: 'meal-prep', name: 'Meal Preparation', category: 'nutrition', icon: '👨‍🍳' },
  { id: 'special-diet', name: 'Special Diet', category: 'nutrition', icon: '🥗' },
  { id: 'fluids', name: 'Encourage Fluids', category: 'nutrition', icon: '💧' },
  { id: 'toileting', name: 'Toileting', category: 'toileting', icon: '🚽' },
  { id: 'incontinence', name: 'Incontinence Care', category: 'toileting', icon: '🩹' },
  { id: 'catheter', name: 'Catheter Care', category: 'toileting', icon: '🏥' },
  { id: 'med-reminders', name: 'Medication Reminders', category: 'medication', icon: '💊' },
  { id: 'med-setup', name: 'Med Set-Up', category: 'medication', icon: '📋' },
  { id: 'rom-exercises', name: 'Range of Motion', category: 'medication', icon: '🤸' },
  { id: 'massage', name: 'Light Massage', category: 'medication', icon: '🤲' },
  { id: 'light-housekeeping', name: 'Light Housekeeping', category: 'household', icon: '🏠' },
  { id: 'laundry', name: 'Laundry', category: 'household', icon: '👕' },
  { id: 'cleaning', name: 'Cleaning', category: 'household', icon: '🧹' },
  { id: 'transportation', name: 'Transportation', category: 'transportation', icon: '🚗' },
  { id: 'appointments', name: 'Appointments', category: 'transportation', icon: '🏥' },
  { id: 'companionship', name: 'Companionship', category: 'social', icon: '👥' },
  { id: 'conversation', name: 'Conversation', category: 'social', icon: '💬' },
  { id: 'reading', name: 'Reading/Activities', category: 'social', icon: '📖' },
];

const MOOD_OPTIONS = ['Happy', 'Calm', 'Neutral', 'Anxious', 'Sad', 'Agitated', 'Cooperative', 'Restless'];

const QUICK_NOTES = [
  'Client cooperative and comfortable',
  'No issues observed',
  'Client requested assistance',
  'Follow-up needed',
  'Family member present',
  'Client declined assistance',
];

const colorClasses = {
  green: { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-700', ring: 'ring-green-200', solid: 'bg-green-600' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700', ring: 'ring-blue-200', solid: 'bg-blue-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-700', ring: 'ring-purple-200', solid: 'bg-purple-600' },
  red: { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-700', ring: 'ring-red-200', solid: 'bg-red-600' },
};

const UnifiedActivityModal = ({
  open,
  onClose,
  client,
  caregiver,
  institutionId,
  roleType = 'caregiver',
  pendingTask = null, // If completing a specific task
  onSaved,
}) => {
  const { userProfile, user } = useUser();
  const [logType, setLogType] = useState(pendingTask ? 'task' : 'care-note');
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState([]);

  // Common fields
  const [notes, setNotes] = useState('');
  const [activityDate, setActivityDate] = useState(new Date().toISOString().split('T')[0]);
  const [activityTime, setActivityTime] = useState(new Date().toTimeString().slice(0, 5));

  // ADL fields
  const [adlCategory, setAdlCategory] = useState('');
  const [adlActivity, setAdlActivity] = useState('');
  const [adlStatus, setAdlStatus] = useState('completed'); // completed, partial, refused

  // Care note fields
  const [mood, setMood] = useState('');
  const [observations, setObservations] = useState('');
  const [concerns, setConcerns] = useState('');

  // Vitals fields
  const [bloodPressure, setBloodPressure] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [oxygenSat, setOxygenSat] = useState('');
  const [bloodSugar, setBloodSugar] = useState('');
  const [painLevel, setPainLevel] = useState('');
  const [weight, setWeight] = useState('');

  // If a pending task is provided, lock type to 'task'
  const isTaskMode = pendingTask !== null;

  const caregiverId = caregiver?.uid || userProfile?.id || userProfile?.uid || user?.uid;
  const caregiverName = caregiver?.name || userProfile?.name || userProfile?.displayName || 'Caregiver';
  const clientName = client?.name || client?.fullName || 'Client';
  const clientId = client?.id || client?.clientId;

  const filteredAdlActivities = useMemo(() => {
    if (!adlCategory) return ADL_ACTIVITIES;
    return ADL_ACTIVITIES.filter(a => a.category === adlCategory);
  }, [adlCategory]);

  if (!open) return null;

  const resetForm = () => {
    setNotes('');
    setPhotos([]);
    setAdlCategory('');
    setAdlActivity('');
    setAdlStatus('completed');
    setMood('');
    setObservations('');
    setConcerns('');
    setBloodPressure('');
    setHeartRate('');
    setTemperature('');
    setRespiratoryRate('');
    setOxygenSat('');
    setBloodSugar('');
    setPainLevel('');
    setWeight('');
    setActivityDate(new Date().toISOString().split('T')[0]);
    setActivityTime(new Date().toTimeString().slice(0, 5));
  };

  const handleClose = () => {
    resetForm();
    setLogType(pendingTask ? 'task' : 'care-note');
    onClose();
  };

  const handlePhotoCapture = (uploadedPhotos) => {
    setPhotos(prev => [...prev, ...uploadedPhotos]);
  };

  const handleRemovePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!clientId) {
      toast.error('No client selected');
      return;
    }

    if (logType !== 'vitals' && !notes.trim() && !observations.trim()) {
      toast.error('Please add notes or observations');
      return;
    }

    if (logType === 'adl' && !adlActivity) {
      toast.error('Please select an activity');
      return;
    }

    if (logType === 'vitals' && !bloodPressure && !heartRate && !temperature && !bloodSugar && !oxygenSat && !weight) {
      toast.error('Please enter at least one vital sign');
      return;
    }

    try {
      setSubmitting(true);

      if (logType === 'task' && pendingTask) {
        // Complete the task
        const taskId = pendingTask.id || pendingTask.taskId;
        if (pendingTask.collection === 'careTasks' || !pendingTask.collection) {
          await completeCareTask(taskId, notes, photos);
        } else {
          await completeTaskAssignment(taskId, notes, photos);
        }
        toast.success('Task completed successfully!');
      } else if (logType === 'care-note') {
        // Create a care log
        await createCareLog({
          clientId,
          clientName,
          caregiverId,
          caregiverName,
          institutionId,
          roleType,
          logDate: activityDate,
          logTime: activityTime,
          activityDescription: notes,
          moodBehavior: mood,
          observations: observations || notes,
          concerns,
          photos,
          status: 'completed',
        });
        toast.success('Care note saved!');
      } else if (logType === 'adl') {
        // Log ADL activity
        const activity = ADL_ACTIVITIES.find(a => a.id === adlActivity);
        await adlAPI.logActivity({
          clientId,
          clientName,
          caregiverId,
          caregiverName,
          institutionId,
          activityId: adlActivity,
          activityName: activity?.name || adlActivity,
          category: adlCategory || activity?.category,
          status: adlStatus,
          notes,
          photos,
          timestamp: new Date().toISOString(),
        });
        toast.success('ADL activity logged!');
      } else if (logType === 'vitals') {
        // Create a care log with vital signs
        await createCareLog({
          clientId,
          clientName,
          caregiverId,
          caregiverName,
          institutionId,
          roleType,
          logDate: activityDate,
          logTime: activityTime,
          bloodPressure,
          heartRate,
          temperature,
          respiratoryRate,
          oxygenSaturation: oxygenSat,
          bloodSugar,
          painLevel,
          weight,
          observations: notes || `Vitals recorded: BP ${bloodPressure || 'N/A'}, HR ${heartRate || 'N/A'}, Temp ${temperature || 'N/A'}`,
          photos,
          status: 'completed',
          logType: 'vitals',
        });
        toast.success('Vital signs recorded!');
      }

      resetForm();
      onSaved?.();
      handleClose();
    } catch (error) {
      console.error('Error saving activity:', error);
      toast.error(error.message || 'Failed to save activity');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              {isTaskMode ? 'Complete Task' : 'Log Activity'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5 truncate">
              {clientName}
              {pendingTask ? ` — ${pendingTask.title || pendingTask.type || 'Task'}` : ''}
            </p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2">
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Type Selector — hidden in task mode */}
          {!isTaskMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">What did you do?</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {LOG_TYPES.map((type) => {
                  const Icon = type.icon;
                  const c = colorClasses[type.color];
                  const selected = logType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setLogType(type.id)}
                      className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                        selected
                          ? `${c.bg} ${c.border} ring-2 ${c.ring}`
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`h-5 w-5 sm:h-6 sm:w-6 mb-1.5 ${selected ? c.text : 'text-gray-400'}`} />
                      <span className={`text-xs sm:text-sm font-medium text-center ${selected ? c.text : 'text-gray-600'}`}>
                        {type.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Task-specific: show task details */}
          {logType === 'task' && pendingTask && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{pendingTask.title || pendingTask.type || 'Task'}</h3>
              {pendingTask.description && (
                <p className="text-xs sm:text-sm text-gray-600 mt-1">{pendingTask.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 capitalize">
                  {pendingTask.type || 'task'}
                </span>
                {pendingTask.priority && (
                  <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">
                    {pendingTask.priority}
                  </span>
                )}
                {pendingTask.client && (
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                    {pendingTask.client}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Date & Time — for non-task types */}
          {logType !== 'task' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input
                  type="date"
                  value={activityDate}
                  onChange={(e) => setActivityDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
                <input
                  type="time"
                  value={activityTime}
                  onChange={(e) => setActivityTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* ADL fields */}
          {logType === 'adl' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={adlCategory}
                  onChange={(e) => { setAdlCategory(e.target.value); setAdlActivity(''); }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All categories</option>
                  {Object.entries(ADL_CATEGORIES).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Activity</label>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {filteredAdlActivities.map((act) => (
                    <button
                      key={act.id}
                      onClick={() => setAdlActivity(act.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg text-left text-sm transition ${
                        adlActivity === act.id
                          ? 'bg-purple-100 text-purple-700 font-medium'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className="text-lg flex-shrink-0">{act.icon}</span>
                      <span className="truncate">{act.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="flex gap-2">
                  {['completed', 'partial', 'refused'].map(s => (
                    <button
                      key={s}
                      onClick={() => setAdlStatus(s)}
                      className={`px-3 py-1.5 text-sm rounded-lg capitalize transition ${
                        adlStatus === s
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Care note fields */}
          {logType === 'care-note' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mood / Behavior</label>
                <div className="flex flex-wrap gap-1.5">
                  {MOOD_OPTIONS.map(m => (
                    <button
                      key={m}
                      onClick={() => setMood(mood === m ? '' : m)}
                      className={`px-2.5 py-1 text-xs rounded-full transition ${
                        mood === m
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observations</label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  rows={3}
                  placeholder="What did you observe during the visit?"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Concerns (optional)</label>
                <input
                  type="text"
                  value={concerns}
                  onChange={(e) => setConcerns(e.target.value)}
                  placeholder="Any concerns to flag?"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* Vitals fields */}
          {logType === 'vitals' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Blood Pressure</label>
                <input type="text" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} placeholder="120/80" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Heart Rate (bpm)</label>
                <input type="text" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} placeholder="72" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Temperature (°C)</label>
                <input type="text" value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="36.8" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Resp. Rate</label>
                <input type="text" value={respiratoryRate} onChange={(e) => setRespiratoryRate(e.target.value)} placeholder="16" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">O₂ Saturation (%)</label>
                <input type="text" value={oxygenSat} onChange={(e) => setOxygenSat(e.target.value)} placeholder="98" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Blood Sugar (mg/dL)</label>
                <input type="text" value={bloodSugar} onChange={(e) => setBloodSugar(e.target.value)} placeholder="110" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pain Level (0-10)</label>
                <input type="text" value={painLevel} onChange={(e) => setPainLevel(e.target.value)} placeholder="0" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Weight (kg)</label>
                <input type="text" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="70" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" />
              </div>
            </div>
          )}

          {/* Notes — always visible */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {logType === 'task' ? 'Completion Notes' : 'Notes'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add notes about this activity..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {/* Quick notes */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_NOTES.map(note => (
                <button
                  key={note}
                  onClick={() => setNotes(prev => prev ? `${prev}\n${note}` : note)}
                  className="px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded-md hover:bg-gray-100 transition border border-gray-200"
                >
                  + {note}
                </button>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Camera className="h-4 w-4 inline mr-1" />
              Photos (optional)
            </label>
            <FileUpload onUpload={handlePhotoCapture} multiple />
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {photos.map((photo, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={typeof photo === 'string' ? photo : photo.url || photo.preview}
                      alt={`Upload ${idx + 1}`}
                      className="h-16 w-16 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer — fixed */}
        <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                {logType === 'task' ? 'Complete Task' : 'Save'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnifiedActivityModal;
