import React, { useState, useEffect } from 'react';
import { X, Plus, Activity, Clock, User, Heart, Thermometer, Droplets, Weight, Ruler, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { getVitalSignsByPatient, createVitalSign } from '../api/vitalSignsAPI';
import { useUser } from '../contexts/UserContext';
import NurseVitalsInput from './NurseVitalsInput';

const VitalsLogModal = ({ patient, isOpen, onClose, institutionId }) => {
  const { user, userProfile } = useUser();
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (isOpen && patient?.id) {
      loadVitals();
    }
  }, [isOpen, patient]);

  const loadVitals = async () => {
    if (!patient?.id) return;
    
    setLoading(true);
    try {
      const patientId = patient.id || patient.patientId || patient.uid;
      const vitalsData = await getVitalSignsByPatient(patientId, institutionId);
      setVitals(vitalsData || []);
    } catch (error) {
      console.error('Error loading vitals:', error);
      toast.error('Failed to load vital signs');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVital = () => {
    setShowAddForm(true);
  };

  const handleSaveVital = async () => {
    await loadVitals();
    setShowAddForm(false);
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString();
  };

  const getVitalIcon = (type) => {
    switch (type) {
      case 'Blood Pressure':
        return Heart;
      case 'Temperature':
        return Thermometer;
      case 'Heart Rate':
        return Activity;
      case 'Oxygen Saturation':
        return Droplets;
      case 'Weight':
        return Weight;
      case 'Height':
        return Ruler;
      default:
        return Activity;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'high':
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'low':
        return 'text-yellow-600 bg-yellow-50';
      case 'normal':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (!isOpen) return null;

  const patientId = patient?.id || patient?.patientId || patient?.uid;
  const patientName = patient?.name || patient?.fullName || 'Patient';
  const performerId = user?.uid;
  const performerName = userProfile?.name || userProfile?.displayName || 'User';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-pink-600 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Activity className="h-7 w-7 mr-3" />
              Vital Signs Log
            </h2>
            <p className="text-red-100 text-sm mt-1">
              {patientName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {showAddForm ? (
            <div className="mb-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Record New Vital Signs</h3>
                <p className="text-sm text-gray-600">Fill in the vital signs you want to record</p>
              </div>
              <NurseVitalsInput
                patientId={patientId}
                patientName={patientName}
                nurseId={performerId}
                nurseName={performerName}
                onSave={handleSaveVital}
                onCancel={handleCancelAdd}
              />
            </div>
          ) : (
            <>
              {/* Add Button */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleAddVital}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Record New Vitals
                </button>
              </div>

              {/* Logs List */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading vital signs...</p>
                </div>
              ) : vitals.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No vital signs recorded yet</p>
                  <p className="text-gray-500 text-sm mt-2">Click "Record New Vitals" to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {vitals.map((vital) => {
                    const Icon = getVitalIcon(vital.type);
                    const statusColor = getStatusColor(vital.status);
                    const recordedBy = vital.nurseName || vital.recordedByName || 'Unknown';
                    const recordedAt = formatDate(vital.recordedAt);

                    return (
                      <div
                        key={vital.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            <div className={`p-3 rounded-lg ${statusColor}`}>
                              <Icon className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-gray-900">{vital.type}</h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                                  {vital.status || 'Normal'}
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                                <span className="font-medium text-gray-900">
                                  {vital.value} {vital.unit || ''}
                                </span>
                              </div>
                              {vital.notes && (
                                <p className="text-sm text-gray-600 mt-2">{vital.notes}</p>
                              )}
                              <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                                <div className="flex items-center">
                                  <User className="h-3 w-3 mr-1" />
                                  <span>Recorded by: {recordedBy}</span>
                                </div>
                                <div className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  <span>{recordedAt}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VitalsLogModal;

