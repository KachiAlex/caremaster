import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  User,
  Heart,
  Pill,
  Activity,
  Target,
  Eye
} from 'lucide-react';
import { toast } from 'react-toastify';
import { carePlansAPI } from '../api/carePlansAPI';
import { getNurseReportsByPatient } from '../api/nurseReportsAPI';

const CarePlanManager = ({ clientId, doctorId, doctorName, clientName }) => {
  const [carePlans, setCarePlans] = useState([]);
  const [nurseReports, setNurseReports] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const [carePlanForm, setCarePlanForm] = useState({
    diagnosis: '',
    treatmentPlan: '',
    medications: [],
    followUpDate: '',
    specialInstructions: '',
    priority: 'medium',
    goals: [],
    interventions: [],
    expectedOutcomes: '',
    duration: '',
    monitoringRequirements: ''
  });

  const [newMedication, setNewMedication] = useState({
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: ''
  });

  const [newGoal, setNewGoal] = useState('');
  const [newIntervention, setNewIntervention] = useState('');

  const priorityOptions = [
    { value: 'low', label: 'Low Priority', color: 'text-green-600' },
    { value: 'medium', label: 'Medium Priority', color: 'text-yellow-600' },
    { value: 'high', label: 'High Priority', color: 'text-orange-600' },
    { value: 'critical', label: 'Critical Priority', color: 'text-red-600' }
  ];

  useEffect(() => {
    if (clientId) {
      loadCarePlans();
      loadNurseReports();
    }
  }, [clientId]);

  const loadCarePlans = async () => {
    try {
      const plans = await carePlansAPI.getCarePlansByPatient(clientId);
      setCarePlans(plans);
    } catch (error) {
      console.error('Error loading care plans:', error);
      toast.error('Failed to load care plans');
    }
  };

  const loadNurseReports = async () => {
    try {
      const reports = await getNurseReportsByPatient(clientId);
      setNurseReports(reports);
    } catch (error) {
      console.error('Error loading nurse reports:', error);
      toast.error('Failed to load nurse reports');
    }
  };

  const handleInputChange = (field, value) => {
    setCarePlanForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addMedication = () => {
    if (newMedication.name && newMedication.dosage && newMedication.frequency) {
      setCarePlanForm(prev => ({
        ...prev,
        medications: [...prev.medications, { ...newMedication }]
      }));
      setNewMedication({
        name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: ''
      });
    }
  };

  const removeMedication = (index) => {
    setCarePlanForm(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  const addGoal = () => {
    if (newGoal.trim()) {
      setCarePlanForm(prev => ({
        ...prev,
        goals: [...prev.goals, newGoal.trim()]
      }));
      setNewGoal('');
    }
  };

  const removeGoal = (index) => {
    setCarePlanForm(prev => ({
      ...prev,
      goals: prev.goals.filter((_, i) => i !== index)
    }));
  };

  const addIntervention = () => {
    if (newIntervention.trim()) {
      setCarePlanForm(prev => ({
        ...prev,
        interventions: [...prev.interventions, newIntervention.trim()]
      }));
      setNewIntervention('');
    }
  };

  const removeIntervention = (index) => {
    setCarePlanForm(prev => ({
      ...prev,
      interventions: prev.interventions.filter((_, i) => i !== index)
    }));
  };

  const handleSaveCarePlan = async () => {
    try {
      setLoading(true);

      const carePlanData = {
        clientId,
        doctorId,
        doctorName,
        diagnosis: carePlanForm.diagnosis,
        treatmentPlan: carePlanForm.treatmentPlan,
        medications: carePlanForm.medications,
        followUpDate: carePlanForm.followUpDate,
        specialInstructions: carePlanForm.specialInstructions,
        priority: carePlanForm.priority,
        goals: carePlanForm.goals,
        interventions: carePlanForm.interventions,
        expectedOutcomes: carePlanForm.expectedOutcomes,
        duration: carePlanForm.duration,
        monitoringRequirements: carePlanForm.monitoringRequirements
      };

      await carePlansAPI.createCarePlan(carePlanData);
      
      toast.success('Care plan created successfully!');
      setShowCreateForm(false);
      resetForm();
      loadCarePlans();
      
    } catch (error) {
      console.error('Error creating care plan:', error);
      toast.error('Failed to create care plan');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCarePlanForm({
      diagnosis: '',
      treatmentPlan: '',
      medications: [],
      followUpDate: '',
      specialInstructions: '',
      priority: 'medium',
      goals: [],
      interventions: [],
      expectedOutcomes: '',
      duration: '',
      monitoringRequirements: ''
    });
  };

  const getPriorityColor = (priority) => {
    const option = priorityOptions.find(opt => opt.value === priority);
    return option ? option.color : 'text-gray-600';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <FileText className="mr-2 text-blue-600" />
          Care Plan Management - {clientName}
        </h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="mr-2" size={16} />
          New Care Plan
        </button>
      </div>

      {/* Recent Nurse Reports */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Eye className="mr-2 text-green-600" />
          Recent Nurse Reports
        </h3>
        {nurseReports.length > 0 ? (
          <div className="space-y-3">
            {nurseReports.slice(0, 3).map((report, index) => (
              <div key={report.id} className="bg-gray-50 p-4 rounded-lg border-l-4 border-green-500">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <User className="mr-2 text-gray-600" size={16} />
                    <span className="font-medium">{report.nurseName}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'Unknown date'}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">BP:</span> {report.bloodPressure}
                  </div>
                  <div>
                    <span className="text-gray-600">HR:</span> {report.heartRate} bpm
                  </div>
                  <div>
                    <span className="text-gray-600">Temp:</span> {report.temperature}°F
                  </div>
                  <div>
                    <span className="text-gray-600">O2:</span> {report.oxygenSaturation}%
                  </div>
                </div>
                <div className="mt-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    report.status === 'critical' ? 'bg-red-100 text-red-800' :
                    report.status === 'concerning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {report.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">No nurse reports available</p>
        )}
      </div>

      {/* Existing Care Plans */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Current Care Plans</h3>
        {carePlans.length > 0 ? (
          <div className="space-y-4">
            {carePlans.map((plan, index) => (
              <div key={plan.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-semibold text-lg">{plan.diagnosis}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(plan.priority)}`}>
                      {priorityOptions.find(opt => opt.value === plan.priority)?.label}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      Created: {formatDate(plan.createdAt)}
                    </span>
                    <button
                      onClick={() => setEditingPlan(plan)}
                      className="p-1 text-gray-600 hover:text-blue-600"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h5 className="font-medium text-gray-700 mb-1">Treatment Plan:</h5>
                    <p className="text-gray-600 text-sm">{plan.treatmentPlan}</p>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-700 mb-1">Follow-up Date:</h5>
                    <p className="text-gray-600 text-sm">{formatDate(plan.followUpDate)}</p>
                  </div>
                </div>

                {plan.medications && plan.medications.length > 0 && (
                  <div className="mb-4">
                    <h5 className="font-medium text-gray-700 mb-2 flex items-center">
                      <Pill className="mr-1" size={16} />
                      Medications:
                    </h5>
                    <div className="space-y-1">
                      {plan.medications.map((med, medIndex) => (
                        <div key={medIndex} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          <strong>{med.name}</strong> - {med.dosage} {med.frequency}
                          {med.instructions && <span className="block text-xs text-gray-500">{med.instructions}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {plan.goals && plan.goals.length > 0 && (
                  <div className="mb-4">
                    <h5 className="font-medium text-gray-700 mb-2 flex items-center">
                      <Target className="mr-1" size={16} />
                      Goals:
                    </h5>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      {plan.goals.map((goal, goalIndex) => (
                        <li key={goalIndex}>{goal}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {plan.specialInstructions && (
                  <div className="mb-4">
                    <h5 className="font-medium text-gray-700 mb-1">Special Instructions:</h5>
                    <p className="text-gray-600 text-sm bg-yellow-50 p-2 rounded">{plan.specialInstructions}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">No care plans created yet</p>
        )}
      </div>

      {/* Create/Edit Care Plan Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">Create New Care Plan</h3>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Diagnosis */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Diagnosis *
                  </label>
                  <textarea
                    value={carePlanForm.diagnosis}
                    onChange={(e) => handleInputChange('diagnosis', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    rows={3}
                    placeholder="Enter the primary diagnosis..."
                    required
                  />
                </div>

                {/* Treatment Plan */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Treatment Plan *
                  </label>
                  <textarea
                    value={carePlanForm.treatmentPlan}
                    onChange={(e) => handleInputChange('treatmentPlan', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    rows={4}
                    placeholder="Describe the treatment approach..."
                    required
                  />
                </div>

                {/* Medications */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Pill className="inline mr-1" size={16} />
                    Medications
                  </label>
                  <div className="space-y-2">
                    {carePlanForm.medications.map((med, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                        <span className="text-sm">
                          <strong>{med.name}</strong> - {med.dosage} {med.frequency}
                        </span>
                        <button
                          onClick={() => removeMedication(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Medication name"
                      value={newMedication.name}
                      onChange={(e) => setNewMedication(prev => ({ ...prev, name: e.target.value }))}
                      className="p-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Dosage"
                      value={newMedication.dosage}
                      onChange={(e) => setNewMedication(prev => ({ ...prev, dosage: e.target.value }))}
                      className="p-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Frequency"
                      value={newMedication.frequency}
                      onChange={(e) => setNewMedication(prev => ({ ...prev, frequency: e.target.value }))}
                      className="p-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <button
                    onClick={addMedication}
                    className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Add Medication
                  </button>
                </div>

                {/* Goals */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Target className="inline mr-1" size={16} />
                    Treatment Goals
                  </label>
                  <div className="space-y-2">
                    {carePlanForm.goals.map((goal, index) => (
                      <div key={index} className="bg-gray-50 p-2 rounded-lg flex items-center justify-between">
                        <span className="text-sm">{goal}</span>
                        <button
                          onClick={() => removeGoal(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex space-x-2 mt-2">
                    <input
                      type="text"
                      placeholder="Enter treatment goal"
                      value={newGoal}
                      onChange={(e) => setNewGoal(e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded-lg"
                      onKeyPress={(e) => e.key === 'Enter' && addGoal()}
                    />
                    <button
                      onClick={addGoal}
                      className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Interventions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Activity className="inline mr-1" size={16} />
                    Interventions
                  </label>
                  <div className="space-y-2">
                    {carePlanForm.interventions.map((intervention, index) => (
                      <div key={index} className="bg-gray-50 p-2 rounded-lg flex items-center justify-between">
                        <span className="text-sm">{intervention}</span>
                        <button
                          onClick={() => removeIntervention(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex space-x-2 mt-2">
                    <input
                      type="text"
                      placeholder="Enter intervention"
                      value={newIntervention}
                      onChange={(e) => setNewIntervention(e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded-lg"
                      onKeyPress={(e) => e.key === 'Enter' && addIntervention()}
                    />
                    <button
                      onClick={addIntervention}
                      className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Additional Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority Level
                    </label>
                    <select
                      value={carePlanForm.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    >
                      {priorityOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Follow-up Date
                    </label>
                    <input
                      type="date"
                      value={carePlanForm.followUpDate}
                      onChange={(e) => handleInputChange('followUpDate', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Outcomes
                  </label>
                  <textarea
                    value={carePlanForm.expectedOutcomes}
                    onChange={(e) => handleInputChange('expectedOutcomes', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    rows={3}
                    placeholder="Describe expected outcomes..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Instructions
                  </label>
                  <textarea
                    value={carePlanForm.specialInstructions}
                    onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    rows={3}
                    placeholder="Any special instructions for caregivers..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monitoring Requirements
                  </label>
                  <textarea
                    value={carePlanForm.monitoringRequirements}
                    onChange={(e) => handleInputChange('monitoringRequirements', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    rows={3}
                    placeholder="What should be monitored and how frequently..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCarePlan}
                  disabled={loading || !carePlanForm.diagnosis || !carePlanForm.treatmentPlan}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  <Save className="mr-2" size={16} />
                  {loading ? 'Saving...' : 'Save Care Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarePlanManager;
