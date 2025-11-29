/**
 * Staff Queue Dashboard
 * 
 * Role-based queue view for different staff members:
 * - Receptionist: Can add clients, see all queues
 * - Nurse: Sees Triage queue
 * - Doctor: Sees GP/Specialist queue
 * - Lab Tech: Sees Lab queue
 * - Pharmacist: Sees Pharmacy queue
 * - Billing Staff: Sees Billing queue
 */

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Bell,
  CheckCircle,
  XCircle,
  ArrowRight,
  User,
  Search
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  getQueuesByStaffRole,
  subscribeToQueue,
  callNextPatient,
  updateQueueStatus,
  transferPatientToQueue,
  DEPARTMENT_TYPES,
  QUEUE_STATUS
} from '../api/queueAPI';
import { useUser } from '../contexts/UserContext';

const StaffQueueDashboard = ({ institutionId: propInstitutionId }) => {
  const { institutionId: contextInstitutionId, userProfile } = useUser();
  const institutionId = propInstitutionId || contextInstitutionId;

  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Determine staff role
  const staffRole = userProfile?.userType || userProfile?.type || 'admin';
  
  // Map roles to departments
  const roleDepartmentMap = {
    'receptionist': [DEPARTMENT_TYPES.TRIAGE],
    'nurse': [DEPARTMENT_TYPES.TRIAGE],
    'doctor': [DEPARTMENT_TYPES.GP, DEPARTMENT_TYPES.SPECIALIST],
    'lab-technician': [DEPARTMENT_TYPES.LAB],
    'pharmacist': [DEPARTMENT_TYPES.PHARMACY],
    'billing-staff': [DEPARTMENT_TYPES.BILLING],
    'radiology-staff': [DEPARTMENT_TYPES.RADIOLOGY],
    'admin': Object.values(DEPARTMENT_TYPES)
  };

  const myDepartments = roleDepartmentMap[staffRole] || [];

  useEffect(() => {
    if (!institutionId) return;

    loadQueues();

    // Set up real-time subscription for each department
    const unsubscribes = myDepartments.map(dept => 
      subscribeToQueue(institutionId, dept, (updatedQueues) => {
        setQueues(prev => {
          const filtered = prev.filter(q => q.department !== dept);
          return [...filtered, ...updatedQueues];
        });
      })
    );

    return () => {
      unsubscribes.forEach(unsub => unsub && unsub());
    };
  }, [institutionId, staffRole]);

  const loadQueues = async () => {
    try {
      setLoading(true);
      const queuesData = await getQueuesByStaffRole(institutionId, staffRole);
      setQueues(queuesData);
    } catch (error) {
      console.error('Error loading queues:', error);
      toast.error('Failed to load queues');
    } finally {
      setLoading(false);
    }
  };

  const handleCallNext = async (department) => {
    try {
      const result = await callNextPatient(institutionId, department);
      if (result.success) {
        toast.success(`Called Client #${result.queue.queueNumber}`);
      } else {
        toast.info(result.message || 'No clients in queue');
      }
    } catch (error) {
      console.error('Error calling next Client:', error);
      toast.error('Failed to call next Client');
    }
  };

  const handleStartService = async (queueId) => {
    try {
      await updateQueueStatus(queueId, QUEUE_STATUS.IN_PROGRESS);
      toast.success('Service started');
    } catch (error) {
      console.error('Error starting service:', error);
      toast.error('Failed to start service');
    }
  };

  const handleComplete = async (queueId) => {
    try {
      await updateQueueStatus(queueId, QUEUE_STATUS.COMPLETED);
      toast.success('Service completed');
    } catch (error) {
      console.error('Error completing service:', error);
      toast.error('Failed to complete service');
    }
  };

  const handleTransfer = async (targetDepartment, reason) => {
    if (!selectedQueue) return;

    try {
      await transferPatientToQueue(selectedQueue.id, targetDepartment, reason, userProfile?.id);
      toast.success(`Client transferred to ${targetDepartment}`);
      setShowTransferModal(false);
      setSelectedQueue(null);
    } catch (error) {
      console.error('Error transferring Client:', error);
      toast.error('Failed to transfer Client');
    }
  };

  const waitingQueues = queues.filter(q => q.status === QUEUE_STATUS.WAITING);
  const activeQueues = queues.filter(q => 
    [QUEUE_STATUS.CALLED, QUEUE_STATUS.IN_PROGRESS].includes(q.status)
  );

  const getStatusColor = (status) => {
    switch (status) {
      case QUEUE_STATUS.WAITING:
        return 'bg-yellow-100 text-yellow-800';
      case QUEUE_STATUS.CALLED:
        return 'bg-blue-100 text-blue-800';
      case QUEUE_STATUS.IN_PROGRESS:
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Queue</h2>
          <p className="text-sm text-gray-600 mt-1">
            {staffRole === 'receptionist' || staffRole === 'admin' 
              ? 'All Queues' 
              : `${myDepartments.map(d => d.toUpperCase()).join(', ')} Queue`}
          </p>
        </div>
        <button
          onClick={loadQueues}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          Refresh
        </button>
      </div>

      {/* Active Queue - Now Serving */}
      {activeQueues.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-4">Now Serving</h3>
          {activeQueues.map((queue) => (
            <div key={queue.id} className="bg-white/20 backdrop-blur rounded-lg p-4 mb-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">#{queue.queueNumber}</div>
                  <div className="text-sm opacity-90">{queue.clientName}</div>
                </div>
                <div className="flex gap-2">
                  {queue.status === QUEUE_STATUS.CALLED && (
                    <button
                      onClick={() => handleStartService(queue.id)}
                      className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-medium"
                    >
                      Start Service
                    </button>
                  )}
                  <button
                    onClick={() => handleComplete(queue.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    Complete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Waiting Queue */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Waiting ({waitingQueues.length})
          </h3>
          {waitingQueues.length > 0 && (
            <button
              onClick={() => handleCallNext(myDepartments[0])}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Bell className="h-4 w-4" />
              Call Next
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : waitingQueues.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No clients waiting</p>
          </div>
        ) : (
          <div className="space-y-2">
            {waitingQueues.map((queue) => (
              <div
                key={queue.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-gray-900">
                      #{queue.queueNumber}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{queue.clientName}</p>
                      <p className="text-xs text-gray-500">
                        {queue.department} • {queue.priority}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {staffRole === 'doctor' && (
                      <button
                        onClick={() => {
                          setSelectedQueue(queue);
                          setShowTransferModal(true);
                        }}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
                      >
                        <ArrowRight className="h-4 w-4" />
                        Refer
                      </button>
                    )}
                    <button
                      onClick={() => handleCallNext(queue.department)}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Call
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      {showTransferModal && selectedQueue && (
        <TransferModal
          queue={selectedQueue}
          onTransfer={handleTransfer}
          onClose={() => {
            setShowTransferModal(false);
            setSelectedQueue(null);
          }}
        />
      )}
    </div>
  );
};

// Transfer Modal Component
const TransferModal = ({ queue, onTransfer, onClose }) => {
  const [targetDepartment, setTargetDepartment] = useState('');
  const [reason, setReason] = useState('');

  const transferOptions = [
    { value: DEPARTMENT_TYPES.LAB, label: 'Laboratory' },
    { value: DEPARTMENT_TYPES.PHARMACY, label: 'Pharmacy' },
    { value: DEPARTMENT_TYPES.RADIOLOGY, label: 'Radiology' },
    { value: DEPARTMENT_TYPES.BILLING, label: 'Billing' },
    { value: DEPARTMENT_TYPES.SPECIALIST, label: 'Specialist' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!targetDepartment) {
      alert('Please select a department');
      return;
    }
    onTransfer(targetDepartment, reason);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Refer Client</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client: {queue.clientName} (#{queue.queueNumber})
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Refer to Department <span className="text-red-500">*</span>
            </label>
            <select
              value={targetDepartment}
              onChange={(e) => setTargetDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select department...</option>
              {transferOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason/Notes
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="e.g., Lab test ordered, Prescription ready..."
            />
          </div>
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Transfer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffQueueDashboard;

