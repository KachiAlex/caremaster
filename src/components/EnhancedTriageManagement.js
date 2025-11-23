/**
 * Enhanced Triage Management Component
 * 
 * Features:
 * - Color-coded severity system (red/yellow/green)
 * - Automatic queue priority assignment
 * - High-risk vital signs alerts
 * - Nurse preliminary assessment notes
 * - Automatic queue routing
 */

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Activity,
  CheckCircle,
  Clock,
  User,
  Stethoscope,
  ArrowRight,
  Save,
  X,
  AlertCircle,
  Heart,
  Thermometer,
  Droplets,
  TrendingUp,
  FileText
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import {
  getQueueByDepartment,
  subscribeToQueue,
  updateQueueStatus,
  QUEUE_STATUS,
  DEPARTMENT_TYPES
} from '../api/queueAPI';
import {
  createTriageAssessment,
  completeTriageAndRoute,
  getTriageAssessmentByPatient,
  getTriageStats,
  calculateTriageSeverity,
  TRIAGE_SEVERITY,
  TRIAGE_COLORS
} from '../api/triageAPI';
import { getLatestVitalSigns, createVitalSign } from '../api/vitalSignsAPI';
import NurseVitalsInput from './NurseVitalsInput';

const EnhancedTriageManagement = ({ institutionId: propInstitutionId }) => {
  const { institutionId: contextInstitutionId, userProfile } = useUser();
  const institutionId = propInstitutionId || contextInstitutionId;

  const [triageQueue, setTriageQueue] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [triageForm, setTriageForm] = useState({
    chiefComplaint: '',
    preliminaryAssessment: '',
    notes: '',
    severity: TRIAGE_SEVERITY.GREEN,
    recommendedQueue: DEPARTMENT_TYPES.GP,
    recommendedPriority: 'normal'
  });
  const [vitalSigns, setVitalSigns] = useState([]);
  const [severityData, setSeverityData] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Load triage queue
  useEffect(() => {
    if (!institutionId) return;

    loadTriageQueue();
    loadTriageStats();

    // Set up real-time subscription
    const unsubscribe = subscribeToQueue(
      institutionId,
      DEPARTMENT_TYPES.TRIAGE,
      (updatedQueues) => {
        setTriageQueue(updatedQueues.filter(q => q.status === QUEUE_STATUS.WAITING || q.status === QUEUE_STATUS.CALLED));
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [institutionId]);

  const loadTriageQueue = async () => {
    try {
      setLoading(true);
      const queue = await getQueueByDepartment(institutionId, DEPARTMENT_TYPES.TRIAGE, {
        status: QUEUE_STATUS.WAITING
      });
      setTriageQueue(queue);
    } catch (error) {
      console.error('Error loading triage queue:', error);
      toast.error('Failed to load triage queue');
    } finally {
      setLoading(false);
    }
  };

  const loadTriageStats = async () => {
    try {
      const statsData = await getTriageStats(institutionId, 7);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading triage stats:', error);
    }
  };

  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient);
    
    // Load existing triage assessment if any
    try {
      const existingAssessment = await getTriageAssessmentByPatient(patient.patientId, institutionId);
      if (existingAssessment) {
        setTriageForm({
          chiefComplaint: existingAssessment.chiefComplaint || '',
          preliminaryAssessment: existingAssessment.preliminaryAssessment || '',
          notes: existingAssessment.notes || '',
          severity: existingAssessment.severity || TRIAGE_SEVERITY.GREEN,
          recommendedQueue: existingAssessment.recommendedQueue || DEPARTMENT_TYPES.GP,
          recommendedPriority: existingAssessment.recommendedPriority || 'normal'
        });
        setVitalSigns(existingAssessment.vitalSigns || []);
        setSeverityData({
          severity: existingAssessment.severity,
          score: existingAssessment.severityScore,
          reasons: existingAssessment.severityReasons || [],
          criticalVitals: existingAssessment.criticalVitals || []
        });
      } else {
        // Load latest vital signs
        const latestVitals = await getLatestVitalSigns(patient.patientId);
        if (latestVitals) {
          setVitalSigns([latestVitals]);
          // Calculate severity
          const calculated = calculateTriageSeverity([latestVitals]);
          setSeverityData(calculated);
          setTriageForm(prev => ({
            ...prev,
            severity: calculated.severity,
            recommendedQueue: calculated.recommendedQueue,
            recommendedPriority: calculated.recommendedPriority
          }));
        }
      }
    } catch (error) {
      console.error('Error loading patient data:', error);
    }

    setShowTriageModal(true);
  };

  const handleVitalsSaved = async (savedVitals) => {
    setVitalSigns(savedVitals);
    
    // Recalculate severity
    const calculated = calculateTriageSeverity(savedVitals);
    setSeverityData(calculated);
    setTriageForm(prev => ({
      ...prev,
      severity: calculated.severity,
      recommendedQueue: calculated.recommendedQueue,
      recommendedPriority: calculated.recommendedPriority
    }));

    setShowVitalsModal(false);
    toast.success('Vital signs recorded and severity calculated');
  };

  const handleCompleteTriage = async () => {
    if (!selectedPatient) return;

    try {
      setProcessing(true);

      // Create triage assessment
      const assessment = await createTriageAssessment({
        patientId: selectedPatient.patientId,
        patientName: selectedPatient.patientName,
        institutionId,
        nurseId: userProfile?.id || userProfile?.uid,
        nurseName: userProfile?.name || userProfile?.displayName || 'Nurse',
        vitalSigns,
        chiefComplaint: triageForm.chiefComplaint,
        preliminaryAssessment: triageForm.preliminaryAssessment,
        notes: triageForm.notes,
        autoCalculateSeverity: false, // Use manual severity
        severity: triageForm.severity,
        severityScore: severityData?.score || 0,
        reasons: severityData?.reasons || [],
        criticalVitals: severityData?.criticalVitals || [],
        recommendedQueue: triageForm.recommendedQueue,
        recommendedPriority: triageForm.recommendedPriority
      });

      // Complete triage and route patient
      await completeTriageAndRoute(assessment.id, {
        routeToQueue: true,
        overrideQueue: triageForm.recommendedQueue,
        overridePriority: triageForm.recommendedPriority
      });

      // Update triage queue status
      const triageEntry = triageQueue.find(q => q.patientId === selectedPatient.patientId);
      if (triageEntry) {
        await updateQueueStatus(triageEntry.id, QUEUE_STATUS.COMPLETED);
      }

      toast.success(`Patient routed to ${triageForm.recommendedQueue.toUpperCase()} queue with ${triageForm.severity} priority`);
      
      // Reset and close
      setShowTriageModal(false);
      setSelectedPatient(null);
      setTriageForm({
        chiefComplaint: '',
        preliminaryAssessment: '',
        notes: '',
        severity: TRIAGE_SEVERITY.GREEN,
        recommendedQueue: DEPARTMENT_TYPES.GP,
        recommendedPriority: 'normal'
      });
      setVitalSigns([]);
      setSeverityData(null);
      
      // Reload queue
      await loadTriageQueue();
      await loadTriageStats();
    } catch (error) {
      console.error('Error completing triage:', error);
      toast.error('Failed to complete triage assessment');
    } finally {
      setProcessing(false);
    }
  };

  const getSeverityColor = (severity) => {
    return TRIAGE_COLORS[severity] || TRIAGE_COLORS[TRIAGE_SEVERITY.GREEN];
  };

  if (loading && triageQueue.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Stethoscope className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Enhanced Triage Management</h2>
              <p className="text-sm text-gray-600">Color-coded severity assessment and automatic queue routing</p>
            </div>
          </div>
          {stats && (
            <div className="flex space-x-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.bySeverity[TRIAGE_SEVERITY.RED] || 0}</div>
                <div className="text-gray-600">Critical</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.bySeverity[TRIAGE_SEVERITY.YELLOW] || 0}</div>
                <div className="text-gray-600">Urgent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.bySeverity[TRIAGE_SEVERITY.GREEN] || 0}</div>
                <div className="text-gray-600">Normal</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Triage Queue */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Triage Queue</h3>
          <button
            onClick={loadTriageQueue}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>

        {triageQueue.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No patients in triage queue</p>
          </div>
        ) : (
          <div className="space-y-3">
            {triageQueue.map((patient) => {
              const queueNumber = patient.queueNumber;
              const priority = patient.priority;
              
              return (
                <div
                  key={patient.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleSelectPatient(patient)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-bold">{queueNumber}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-gray-900">{patient.patientName}</h4>
                          {priority === 'emergency' && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Emergency</span>
                          )}
                          {priority === 'urgent' && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">Urgent</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">Patient ID: {patient.patientId}</p>
                        {patient.notes && (
                          <p className="text-xs text-gray-500 mt-1">{patient.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPatient(patient);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Assess
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Triage Assessment Modal */}
      {showTriageModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Stethoscope className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Triage Assessment</h2>
                    <p className="text-sm text-gray-600">Patient: {selectedPatient.patientName}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowTriageModal(false);
                    setSelectedPatient(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Severity Display */}
              {severityData && (
                <div className={`${getSeverityColor(severityData.severity).bg} ${getSeverityColor(severityData.severity).border} border-2 rounded-lg p-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">{getSeverityColor(severityData.severity).icon}</span>
                      <div>
                        <h3 className={`font-bold ${getSeverityColor(severityData.severity).text}`}>
                          Severity: {severityData.severity.toUpperCase()} (Score: {severityData.score})
                        </h3>
                        {severityData.reasons.length > 0 && (
                          <ul className="text-sm mt-2 space-y-1">
                            {severityData.reasons.map((reason, idx) => (
                              <li key={idx} className="flex items-center">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                {reason}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                  {severityData.criticalVitals.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-red-300">
                      <p className="text-sm font-semibold">Critical Vitals:</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {severityData.criticalVitals.map((vital, idx) => (
                          <span key={idx} className="px-2 py-1 bg-red-200 text-red-800 rounded text-xs">
                            {vital}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Record Vitals Button */}
              <div>
                <button
                  onClick={() => setShowVitalsModal(true)}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Activity className="h-5 w-5" />
                  <span>Record/Update Vital Signs</span>
                </button>
              </div>

              {/* Chief Complaint */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chief Complaint
                </label>
                <textarea
                  value={triageForm.chiefComplaint}
                  onChange={(e) => setTriageForm(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                  placeholder="Enter patient's chief complaint..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Preliminary Assessment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preliminary Assessment
                </label>
                <textarea
                  value={triageForm.preliminaryAssessment}
                  onChange={(e) => setTriageForm(prev => ({ ...prev, preliminaryAssessment: e.target.value }))}
                  placeholder="Enter nurse's preliminary assessment..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Recommended Queue */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Route To
                </label>
                <select
                  value={triageForm.recommendedQueue}
                  onChange={(e) => setTriageForm(prev => ({ ...prev, recommendedQueue: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={DEPARTMENT_TYPES.GP}>General Practice</option>
                  <option value={DEPARTMENT_TYPES.SPECIALIST}>Specialist</option>
                  <option value={DEPARTMENT_TYPES.LAB}>Laboratory</option>
                  <option value={DEPARTMENT_TYPES.RADIOLOGY}>Radiology</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority Level
                </label>
                <select
                  value={triageForm.recommendedPriority}
                  onChange={(e) => setTriageForm(prev => ({ ...prev, recommendedPriority: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={triageForm.notes}
                  onChange={(e) => setTriageForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Enter any additional notes..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowTriageModal(false);
                    setSelectedPatient(null);
                  }}
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompleteTriage}
                  disabled={processing}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Complete & Route Patient
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vital Signs Modal */}
      {showVitalsModal && selectedPatient && (
        <NurseVitalsInput
          patientId={selectedPatient.patientId}
          patientName={selectedPatient.patientName}
          nurseId={userProfile?.id || userProfile?.uid}
          nurseName={userProfile?.name || userProfile?.displayName || 'Nurse'}
          onSave={handleVitalsSaved}
          onCancel={() => setShowVitalsModal(false)}
        />
      )}
    </div>
  );
};

export default EnhancedTriageManagement;

