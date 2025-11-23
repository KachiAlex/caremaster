/**
 * Queue Management Dashboard
 * 
 * Real-time queue management for hospital departments:
 * - View queues by department
 * - Call next patient
 * - Update queue status
 * - View queue statistics
 * - Digital display mode
 */

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Users, 
  Bell, 
  CheckCircle, 
  XCircle, 
  Play, 
  Pause, 
  SkipForward,
  RefreshCw,
  Monitor,
  TrendingUp,
  AlertCircle,
  User,
  Stethoscope,
  TestTube,
  Pill,
  Receipt,
  Activity
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  getQueueByDepartment,
  subscribeToQueue,
  callNextPatient,
  updateQueueStatus,
  skipPatient,
  cancelQueueEntry,
  getQueueStats,
  QUEUE_STATUS,
  QUEUE_PRIORITY,
  DEPARTMENT_TYPES
} from '../api/queueAPI';
import { useUser } from '../contexts/UserContext';

const QueueManagementDashboard = ({ institutionId: propInstitutionId }) => {
  const { institutionId: contextInstitutionId } = useUser();
  const institutionId = propInstitutionId || contextInstitutionId;

  const [activeDepartment, setActiveDepartment] = useState(DEPARTMENT_TYPES.GP);
  const [queues, setQueues] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [displayMode, setDisplayMode] = useState(false); // Digital display mode
  const [autoRefresh, setAutoRefresh] = useState(true);

  const departments = [
    { id: DEPARTMENT_TYPES.GP, name: 'General Practice', icon: Stethoscope, color: 'blue' },
    { id: DEPARTMENT_TYPES.SPECIALIST, name: 'Specialist', icon: User, color: 'purple' },
    { id: DEPARTMENT_TYPES.LAB, name: 'Laboratory', icon: TestTube, color: 'green' },
    { id: DEPARTMENT_TYPES.PHARMACY, name: 'Pharmacy', icon: Pill, color: 'orange' },
    { id: DEPARTMENT_TYPES.BILLING, name: 'Billing', icon: Receipt, color: 'yellow' },
    { id: DEPARTMENT_TYPES.RADIOLOGY, name: 'Radiology', icon: Activity, color: 'pink' },
    { id: DEPARTMENT_TYPES.TRIAGE, name: 'Triage', icon: AlertCircle, color: 'red' }
  ];

  // Load queue data
  useEffect(() => {
    if (!institutionId) return;

    loadQueueData();
    loadQueueStats();

    // Set up real-time subscription
    const unsubscribe = subscribeToQueue(
      institutionId,
      activeDepartment,
      (updatedQueues) => {
        setQueues(updatedQueues);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [institutionId, activeDepartment]);

  // Auto-refresh stats
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadQueueStats();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, activeDepartment]);

  const loadQueueData = async () => {
    try {
      setLoading(true);
      const queueData = await getQueueByDepartment(institutionId, activeDepartment);
      setQueues(queueData);
    } catch (error) {
      console.error('Error loading queue:', error);
      toast.error('Failed to load queue data');
    } finally {
      setLoading(false);
    }
  };

  const loadQueueStats = async () => {
    try {
      const statsData = await getQueueStats(institutionId, activeDepartment);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading queue stats:', error);
    }
  };

  const handleCallNext = async () => {
    try {
      const result = await callNextPatient(institutionId, activeDepartment);
      if (result.success) {
        toast.success(`Called patient #${result.queue.queueNumber}`);
        loadQueueStats();
      } else {
        toast.info(result.message || 'No patients in queue');
      }
    } catch (error) {
      console.error('Error calling next patient:', error);
      toast.error('Failed to call next patient');
    }
  };

  const handleUpdateStatus = async (queueId, newStatus) => {
    try {
      await updateQueueStatus(queueId, newStatus);
      toast.success('Queue status updated');
      loadQueueStats();
    } catch (error) {
      console.error('Error updating queue status:', error);
      toast.error('Failed to update queue status');
    }
  };

  const handleSkip = async (queueId) => {
    try {
      await skipPatient(queueId, 'Skipped by staff');
      toast.info('Patient skipped');
      loadQueueStats();
    } catch (error) {
      console.error('Error skipping patient:', error);
      toast.error('Failed to skip patient');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case QUEUE_STATUS.WAITING:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case QUEUE_STATUS.CALLED:
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case QUEUE_STATUS.IN_PROGRESS:
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case QUEUE_STATUS.COMPLETED:
        return 'bg-green-100 text-green-800 border-green-300';
      case QUEUE_STATUS.SKIPPED:
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case QUEUE_STATUS.CANCELLED:
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case QUEUE_PRIORITY.EMERGENCY:
        return 'text-red-600 font-bold';
      case QUEUE_PRIORITY.URGENT:
        return 'text-orange-600 font-semibold';
      case QUEUE_PRIORITY.PRIORITY:
        return 'text-blue-600 font-medium';
      default:
        return 'text-gray-600';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case QUEUE_PRIORITY.EMERGENCY:
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case QUEUE_PRIORITY.URGENT:
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return null;
    }
  };

  const formatWaitTime = (addedAt) => {
    if (!addedAt) return 'N/A';
    const now = new Date();
    const added = addedAt instanceof Date ? addedAt : new Date(addedAt);
    const diffMinutes = Math.floor((now - added) / 1000 / 60);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const waitingQueues = queues.filter(q => q.status === QUEUE_STATUS.WAITING);
  const activeQueues = queues.filter(q => 
    [QUEUE_STATUS.CALLED, QUEUE_STATUS.IN_PROGRESS].includes(q.status)
  );
  const completedQueues = queues.filter(q => q.status === QUEUE_STATUS.COMPLETED);

  const currentDepartment = departments.find(d => d.id === activeDepartment);

  if (displayMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-5xl font-bold mb-2">Queue Display</h1>
              <p className="text-2xl text-blue-200">{currentDepartment?.name}</p>
            </div>
            <button
              onClick={() => setDisplayMode(false)}
              className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg text-lg font-medium transition-colors"
            >
              Exit Display Mode
            </button>
          </div>

          <div className="grid grid-cols-3 gap-8 mb-8">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-center">
              <div className="text-6xl font-bold text-yellow-300 mb-2">
                {waitingQueues.length}
              </div>
              <div className="text-xl text-blue-200">Waiting</div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-center">
              <div className="text-6xl font-bold text-blue-300 mb-2">
                {activeQueues.length}
              </div>
              <div className="text-xl text-blue-200">In Progress</div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-center">
              <div className="text-6xl font-bold text-green-300 mb-2">
                {stats.completed || 0}
              </div>
              <div className="text-xl text-blue-200">Completed Today</div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8">
            <h2 className="text-3xl font-bold mb-6 text-center">Now Serving</h2>
            {activeQueues.length > 0 ? (
              <div className="text-center">
                <div className="text-9xl font-bold text-yellow-300 mb-4">
                  #{activeQueues[0].queueNumber}
                </div>
                <div className="text-3xl text-blue-200">{activeQueues[0].patientName}</div>
              </div>
            ) : (
              <div className="text-center text-4xl text-blue-200 py-12">
                No active patients
              </div>
            )}

            {waitingQueues.length > 0 && (
              <div className="mt-12">
                <h3 className="text-2xl font-semibold mb-4 text-center">Next in Queue</h3>
                <div className="grid grid-cols-5 gap-4">
                  {waitingQueues.slice(0, 5).map((queue) => (
                    <div
                      key={queue.id}
                      className="bg-white/20 rounded-xl p-4 text-center"
                    >
                      <div className="text-4xl font-bold text-white mb-2">
                        #{queue.queueNumber}
                      </div>
                      <div className="text-sm text-blue-200 truncate">
                        {queue.patientName}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Queue Management</h2>
          <p className="text-sm text-gray-600 mt-1">Manage patient queues across departments</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setDisplayMode(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
          >
            <Monitor className="h-4 w-4" />
            Display Mode
          </button>
          <button
            onClick={() => {
              loadQueueData();
              loadQueueStats();
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Department Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          {departments.map((dept) => {
            const Icon = dept.icon;
            const isActive = activeDepartment === dept.id;
            return (
              <button
                key={dept.id}
                onClick={() => setActiveDepartment(dept.id)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  isActive
                    ? `bg-${dept.color}-100 text-${dept.color}-700 border-2 border-${dept.color}-300`
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{dept.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Waiting</p>
              <p className="text-2xl font-bold text-gray-900">{stats.waiting || 0}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed || 0}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Wait</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.averageWaitTime ? `${Math.round(stats.averageWaitTime)}m` : 'N/A'}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Queue Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCallNext}
            disabled={waitingQueues.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <Bell className="h-4 w-4" />
            Call Next Patient
          </button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              autoRefresh
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            Auto Refresh: {autoRefresh ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      {/* Queue Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waiting Queue */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              Waiting ({waitingQueues.length})
            </h3>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : waitingQueues.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No patients waiting</div>
            ) : (
              waitingQueues.map((queue) => (
                <div
                  key={queue.id}
                  className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900">
                        #{queue.queueNumber}
                      </span>
                      {getPriorityIcon(queue.priority)}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(queue.priority)}`}>
                      {queue.priority}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">{queue.patientName}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Wait: {formatWaitTime(queue.addedAt)}</span>
                    <button
                      onClick={() => handleSkip(queue.id)}
                      className="text-orange-600 hover:text-orange-700"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Queue */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Active ({activeQueues.length})
            </h3>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {activeQueues.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No active patients</div>
            ) : (
              activeQueues.map((queue) => (
                <div
                  key={queue.id}
                  className="border-2 border-blue-300 bg-blue-50 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-blue-900">
                      #{queue.queueNumber}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(queue.status)}`}>
                      {queue.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-3">{queue.patientName}</p>
                  <div className="flex gap-2">
                    {queue.status === QUEUE_STATUS.CALLED && (
                      <button
                        onClick={() => handleUpdateStatus(queue.id, QUEUE_STATUS.IN_PROGRESS)}
                        className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                      >
                        Start Service
                      </button>
                    )}
                    <button
                      onClick={() => handleUpdateStatus(queue.id, QUEUE_STATUS.COMPLETED)}
                      className="flex-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                    >
                      Complete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Completed Queue (Recent) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Recent ({completedQueues.slice(0, 10).length})
            </h3>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {completedQueues.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No completed patients</div>
            ) : (
              completedQueues.slice(0, 10).map((queue) => (
                <div
                  key={queue.id}
                  className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-700">
                      #{queue.queueNumber}
                    </span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-xs text-gray-600">{queue.patientName}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueueManagementDashboard;

