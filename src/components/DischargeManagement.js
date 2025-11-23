/**
 * Discharge Management Component
 * 
 * Phase 2 Implementation - Complete discharge workflow:
 * - Create discharge plans
 * - Generate discharge summaries
 * - Schedule follow-up appointments
 * - Medication reconciliation
 * - Discharge checklist
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  X,
  Download,
  Search,
  Filter,
  User,
  Pill,
  Stethoscope
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import {
  createDischargePlan,
  generateDischargeSummary,
  getDischargePlans,
  getDischargeSummary,
  updateDischargePlan,
  getPatientDischargeHistory,
  getDischargeStats,
  DISCHARGE_STATUS,
  DISCHARGE_TYPE
} from '../api/dischargeAPI';
import { getAllPatients } from '../api/patientsAPI';

const DischargeManagement = ({ institutionId: propInstitutionId }) => {
  const { institutionId: contextInstitutionId, userProfile } = useUser();
  const institutionId = propInstitutionId || contextInstitutionId;

  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [filteredPlans, setFilteredPlans] = useState([]);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Selected plan
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  // Form states
  const [planForm, setPlanForm] = useState({
    patientId: '',
    patientName: '',
    dischargeType: DISCHARGE_TYPE.ROUTINE,
    plannedDischargeDate: '',
    dischargeDestination: 'Home',
    dischargeInstructions: [],
    medications: [],
    followUpRequired: false,
    followUpDate: '',
    notes: ''
  });
  
  const [summaryForm, setSummaryForm] = useState({
    chiefComplaint: '',
    admissionDiagnosis: '',
    dischargeDiagnosis: '',
    proceduresPerformed: [],
    medicationsOnDischarge: [],
    vitalSignsAtDischarge: {},
    conditionAtDischarge: '',
    activityRestrictions: [],
    dietInstructions: '',
    woundCareInstructions: '',
    followUpInstructions: '',
    emergencyContactInstructions: ''
  });

  useEffect(() => {
    if (!institutionId) return;
    
    loadPlans();
    loadStats();
    loadPatients();
  }, [institutionId]);

  useEffect(() => {
    filterPlans();
  }, [plans, statusFilter, searchTerm]);

  const loadPlans = async () => {
    if (!institutionId) return;
    
    try {
      setLoading(true);
      const plansData = await getDischargePlans(institutionId);
      setPlans(plansData);
    } catch (error) {
      console.error('Error loading discharge plans:', error);
      toast.error('Failed to load discharge plans');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!institutionId) return;
    
    try {
      const statsData = await getDischargeStats(institutionId);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadPatients = async () => {
    if (!institutionId) return;
    
    try {
      const patientsData = await getAllPatients(institutionId);
      setPatients(patientsData);
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const filterPlans = () => {
    let filtered = [...plans];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.patientName?.toLowerCase().includes(searchLower) ||
        p.patientId?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredPlans(filtered);
  };

  const handleCreatePlan = async () => {
    if (!planForm.patientId) {
      toast.error('Please select a patient');
      return;
    }

    try {
      setLoading(true);
      await createDischargePlan({
        ...planForm,
        institutionId,
        doctorId: userProfile?.id || userProfile?.uid,
        doctorName: userProfile?.name || userProfile?.displayName,
        plannedDischargeDate: planForm.plannedDischargeDate || null,
        followUpDate: planForm.followUpRequired && planForm.followUpDate ? planForm.followUpDate : null
      });
      
      toast.success('Discharge plan created');
      setShowPlanModal(false);
      setPlanForm({
        patientId: '',
        patientName: '',
        dischargeType: DISCHARGE_TYPE.ROUTINE,
        plannedDischargeDate: '',
        dischargeDestination: 'Home',
        dischargeInstructions: [],
        medications: [],
        followUpRequired: false,
        followUpDate: '',
        notes: ''
      });
      loadPlans();
      loadStats();
    } catch (error) {
      console.error('Error creating discharge plan:', error);
      toast.error('Failed to create discharge plan');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!summaryForm.chiefComplaint || !summaryForm.dischargeDiagnosis) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      setLoading(true);
      await generateDischargeSummary(selectedPlan.id, summaryForm);
      
      toast.success('Discharge summary generated');
      setShowSummaryModal(false);
      setSummaryForm({
        chiefComplaint: '',
        admissionDiagnosis: '',
        dischargeDiagnosis: '',
        proceduresPerformed: [],
        medicationsOnDischarge: [],
        vitalSignsAtDischarge: {},
        conditionAtDischarge: '',
        activityRestrictions: [],
        dietInstructions: '',
        woundCareInstructions: '',
        followUpInstructions: '',
        emergencyContactInstructions: ''
      });
      loadPlans();
      loadStats();
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Failed to generate discharge summary');
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = async (patientId) => {
    try {
      setLoading(true);
      const history = await getPatientDischargeHistory(patientId, institutionId);
      setSelectedPatient({ id: patientId, history });
      setShowHistoryModal(true);
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error('Failed to load discharge history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case DISCHARGE_STATUS.PLANNING:
        return 'bg-yellow-100 text-yellow-800';
      case DISCHARGE_STATUS.READY:
        return 'bg-blue-100 text-blue-800';
      case DISCHARGE_STATUS.COMPLETED:
        return 'bg-green-100 text-green-800';
      case DISCHARGE_STATUS.CANCELLED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Discharge Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage patient discharge and follow-up care
          </p>
        </div>
        <button
          onClick={() => setShowPlanModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Discharge Plan
        </button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Plans</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Planning</p>
                <p className="text-2xl font-bold text-gray-900">{stats.planning}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">With Follow-up</p>
                <p className="text-2xl font-bold text-gray-900">{stats.withFollowUp}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              {Object.values(DISCHARGE_STATUS).map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by patient name or ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Plans Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Patient</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Destination</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Planned Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Follow-up</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    Loading plans...
                  </td>
                </tr>
              ) : filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    No discharge plans found
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan) => (
                  <tr key={plan.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {plan.patientName || plan.patientId?.substring(0, 8)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {plan.dischargeType.replace('_', ' ').toUpperCase()}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {plan.dischargeDestination || 'Home'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {plan.plannedDischargeDate ? formatDate(plan.plannedDischargeDate) : 'Not set'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(plan.status)}`}>
                        {plan.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {plan.followUpRequired ? (
                        <span className="text-green-600">Yes - {plan.followUpDate ? formatDate(plan.followUpDate) : 'TBD'}</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {plan.status === DISCHARGE_STATUS.PLANNING && (
                          <button
                            onClick={() => {
                              setSelectedPlan(plan);
                              setShowSummaryModal(true);
                            }}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            Generate Summary
                          </button>
                        )}
                        {plan.status === DISCHARGE_STATUS.COMPLETED && (
                          <button
                            onClick={async () => {
                              const summary = await getDischargeSummary(plan.id);
                              if (summary) {
                                // Show summary in modal or download
                                toast.info('Discharge summary available');
                              }
                            }}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                          >
                            View Summary
                          </button>
                        )}
                        <button
                          onClick={() => handleViewHistory(plan.patientId)}
                          className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                          title="View History"
                        >
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create Discharge Plan</h3>
              <button
                onClick={() => setShowPlanModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Patient *
                </label>
                <select
                  value={planForm.patientId}
                  onChange={(e) => {
                    const patient = patients.find(p => p.id === e.target.value);
                    setPlanForm({
                      ...planForm,
                      patientId: e.target.value,
                      patientName: patient?.name || patient?.fullName || ''
                    });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select patient...</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name || patient.fullName || patient.patientId} - {patient.patientId || patient.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Discharge Type
                  </label>
                  <select
                    value={planForm.dischargeType}
                    onChange={(e) => setPlanForm({ ...planForm, dischargeType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Object.values(DISCHARGE_TYPE).map(type => (
                      <option key={type} value={type}>
                        {type.replace('_', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Discharge Destination
                  </label>
                  <input
                    type="text"
                    value={planForm.dischargeDestination}
                    onChange={(e) => setPlanForm({ ...planForm, dischargeDestination: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Home, Another facility, etc."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Planned Discharge Date
                </label>
                <input
                  type="datetime-local"
                  value={planForm.plannedDischargeDate}
                  onChange={(e) => setPlanForm({ ...planForm, plannedDischargeDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={planForm.followUpRequired}
                  onChange={(e) => setPlanForm({ ...planForm, followUpRequired: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="text-sm font-semibold text-gray-700">
                  Follow-up Required
                </label>
              </div>

              {planForm.followUpRequired && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Follow-up Date
                  </label>
                  <input
                    type="datetime-local"
                    value={planForm.followUpDate}
                    onChange={(e) => setPlanForm({ ...planForm, followUpDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Discharge Instructions
                </label>
                <textarea
                  value={planForm.dischargeInstructions.join('\n')}
                  onChange={(e) => setPlanForm({
                    ...planForm,
                    dischargeInstructions: e.target.value.split('\n').filter(line => line.trim())
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="4"
                  placeholder="Enter discharge instructions (one per line)..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Medications on Discharge
                </label>
                <textarea
                  value={planForm.medications.join('\n')}
                  onChange={(e) => setPlanForm({
                    ...planForm,
                    medications: e.target.value.split('\n').filter(line => line.trim())
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="List medications (one per line)..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={planForm.notes}
                  onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowPlanModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePlan}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Creating...' : 'Create Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Summary Modal */}
      {showSummaryModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Generate Discharge Summary</h3>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Chief Complaint *
                  </label>
                  <input
                    type="text"
                    value={summaryForm.chiefComplaint}
                    onChange={(e) => setSummaryForm({ ...summaryForm, chiefComplaint: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Chief complaint on admission"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Admission Diagnosis *
                  </label>
                  <input
                    type="text"
                    value={summaryForm.admissionDiagnosis}
                    onChange={(e) => setSummaryForm({ ...summaryForm, admissionDiagnosis: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Diagnosis on admission"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Discharge Diagnosis *
                </label>
                <input
                  type="text"
                  value={summaryForm.dischargeDiagnosis}
                  onChange={(e) => setSummaryForm({ ...summaryForm, dischargeDiagnosis: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Final diagnosis at discharge"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Procedures Performed
                </label>
                <textarea
                  value={summaryForm.proceduresPerformed.join('\n')}
                  onChange={(e) => setSummaryForm({
                    ...summaryForm,
                    proceduresPerformed: e.target.value.split('\n').filter(line => line.trim())
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="List procedures (one per line)..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Medications on Discharge
                </label>
                <textarea
                  value={summaryForm.medicationsOnDischarge.join('\n')}
                  onChange={(e) => setSummaryForm({
                    ...summaryForm,
                    medicationsOnDischarge: e.target.value.split('\n').filter(line => line.trim())
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="List medications (one per line)..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Condition at Discharge
                </label>
                <textarea
                  value={summaryForm.conditionAtDischarge}
                  onChange={(e) => setSummaryForm({ ...summaryForm, conditionAtDischarge: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="2"
                  placeholder="Patient's condition at discharge..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Activity Restrictions
                </label>
                <textarea
                  value={summaryForm.activityRestrictions.join('\n')}
                  onChange={(e) => setSummaryForm({
                    ...summaryForm,
                    activityRestrictions: e.target.value.split('\n').filter(line => line.trim())
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="2"
                  placeholder="Activity restrictions (one per line)..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Diet Instructions
                </label>
                <textarea
                  value={summaryForm.dietInstructions}
                  onChange={(e) => setSummaryForm({ ...summaryForm, dietInstructions: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="2"
                  placeholder="Dietary instructions..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Wound Care Instructions
                </label>
                <textarea
                  value={summaryForm.woundCareInstructions}
                  onChange={(e) => setSummaryForm({ ...summaryForm, woundCareInstructions: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="2"
                  placeholder="Wound care instructions if applicable..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Follow-up Instructions
                </label>
                <textarea
                  value={summaryForm.followUpInstructions}
                  onChange={(e) => setSummaryForm({ ...summaryForm, followUpInstructions: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="2"
                  placeholder="Follow-up care instructions..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Emergency Contact Instructions
                </label>
                <textarea
                  value={summaryForm.emergencyContactInstructions}
                  onChange={(e) => setSummaryForm({ ...summaryForm, emergencyContactInstructions: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="2"
                  placeholder="When to contact emergency services..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateSummary}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Generating...' : 'Generate Summary'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Discharge History</h3>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedPatient(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {selectedPatient.history && selectedPatient.history.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No discharge history found
                </div>
              ) : (
                selectedPatient.history?.map((plan) => (
                  <div key={plan.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(plan.status)}`}>
                        {plan.status}
                      </span>
                      <span className="text-sm text-gray-600">
                        {formatDate(plan.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      {plan.dischargeType.replace('_', ' ').toUpperCase()} - {plan.dischargeDestination}
                    </p>
                    {plan.summary && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">Discharge Summary:</p>
                        <p className="text-sm text-gray-900">{plan.summary.dischargeDiagnosis}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DischargeManagement;

