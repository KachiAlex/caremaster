import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Calendar, 
  Clock, 
  User, 
  FileText,
  CheckCircle,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { getClientsByCaregiver } from '../api/patientsAPI';
import { carePlansAPI } from '../api/carePlansAPI';
import { toast } from 'react-toastify';

const Consultation = () => {
  const { user, userProfile } = useUser();
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [carePlans, setCarePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    objectives: '',
    interventions: '',
    timeline: '',
    priority: 'medium'
  });

  // Load assigned patients
  useEffect(() => {
    const loadAssignedPatients = async () => {
      if (!user?.uid) return;
      
      try {
        setLoading(true);
        const patients = await getClientsByCaregiver(user.uid);
        setAssignedPatients(patients);
        
        if (patients.length > 0 && !selectedPatientId) {
          setSelectedPatientId(patients[0].id);
          setSelectedPatient(patients[0]);
        }
      } catch (error) {
        console.error('Error loading assigned patients:', error);
        toast.error('Failed to load assigned patients');
      } finally {
        setLoading(false);
      }
    };

    loadAssignedPatients();
  }, [user?.uid, selectedPatientId]);

  // Load care plans for selected patient
  useEffect(() => {
    const loadCarePlans = async () => {
      if (!selectedPatientId) return;
      
      try {
        const plans = await carePlansAPI.getCarePlansByPatient(selectedPatientId);
        setCarePlans(plans);
      } catch (error) {
        console.error('Error loading care plans:', error);
        toast.error('Failed to load care plans');
      }
    };

    loadCarePlans();
  }, [selectedPatientId]);

  // Update selected patient when ID changes
  useEffect(() => {
    if (selectedPatientId && assignedPatients.length > 0) {
      const patient = assignedPatients.find(p => p.id === selectedPatientId);
      setSelectedPatient(patient || null);
    }
  }, [selectedPatientId, assignedPatients]);

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    
    if (!selectedPatientId) {
      toast.error('Please select a patient');
      return;
    }

    try {
      const planData = {
        ...newPlan,
        patientId: selectedPatientId,
        patientName: selectedPatient?.name || selectedPatient?.fullName || 'Unknown Patient',
        createdBy: user.uid,
        createdByName: userProfile?.name || userProfile?.displayName || 'Doctor',
        status: 'active',
        createdAt: new Date()
      };

      await carePlansAPI.createCarePlan(planData);
      toast.success('Care plan created successfully');
      
      // Reset form and close modal
      setNewPlan({
        title: '',
        description: '',
        objectives: '',
        interventions: '',
        timeline: '',
        priority: 'medium'
      });
      setShowCreatePlan(false);
      
      // Reload care plans
      const plans = await carePlansAPI.getCarePlansByPatient(selectedPatientId);
      setCarePlans(plans);
      
    } catch (error) {
      console.error('Error creating care plan:', error);
      toast.error('Failed to create care plan');
    }
  };

  const handleUpdatePlan = async (planId, updates) => {
    try {
      await carePlansAPI.updateCarePlan(planId, updates);
      toast.success('Care plan updated successfully');
      
      // Reload care plans
      const plans = await carePlansAPI.getCarePlansByPatient(selectedPatientId);
      setCarePlans(plans);
      
    } catch (error) {
      console.error('Error updating care plan:', error);
      toast.error('Failed to update care plan');
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this care plan?')) return;
    
    try {
      await carePlansAPI.deleteCarePlan(planId);
      toast.success('Care plan deleted successfully');
      
      // Reload care plans
      const plans = await carePlansAPI.getCarePlansByPatient(selectedPatientId);
      setCarePlans(plans);
      
    } catch (error) {
      console.error('Error deleting care plan:', error);
      toast.error('Failed to delete care plan');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="card">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading consultation data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Patient Selection */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Stethoscope className="h-6 w-6 text-gray-700 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">Patient Consultation</h1>
          </div>
          {assignedPatients.length > 0 && (
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select patient...</option>
              {assignedPatients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.name || patient.fullName || patient.email || patient.id}
                </option>
              ))}
            </select>
          )}
        </div>

        {assignedPatients.length === 0 ? (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No patients assigned</h3>
            <p className="text-gray-600">Contact your administrator to get patients assigned to your care.</p>
          </div>
        ) : !selectedPatientId ? (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a patient</h3>
            <p className="text-gray-600">Choose a patient from the dropdown to view their care plans.</p>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <User className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-blue-900">
                  {selectedPatient?.name || selectedPatient?.fullName || 'Unknown Patient'}
                </h3>
                <p className="text-blue-700">
                  {selectedPatient?.email || selectedPatient?.id}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Care Plans Section */}
      {selectedPatientId && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <FileText className="h-6 w-6 text-gray-700 mr-3" />
              <h2 className="text-xl font-bold text-gray-900">Care Plans</h2>
            </div>
            <button
              onClick={() => setShowCreatePlan(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Care Plan
            </button>
          </div>

          {carePlans.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No care plans yet</h3>
              <p className="text-gray-600 mb-4">Create a care plan to provide structured care for this patient.</p>
              <button
                onClick={() => setShowCreatePlan(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create First Care Plan
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {carePlans.map((plan) => (
                <div key={plan.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{plan.title}</h3>
                      <p className="text-gray-600 mb-3">{plan.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">Objectives</h4>
                          <p className="text-sm text-gray-600">{plan.objectives}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">Interventions</h4>
                          <p className="text-sm text-gray-600">{plan.interventions}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>Created: {new Date(plan.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>Timeline: {plan.timeline}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2 ml-4">
                      <div className="flex space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(plan.status)}`}>
                          {plan.status}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(plan.priority)}`}>
                          {plan.priority}
                        </span>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingPlan(plan)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit plan"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePlan(plan.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete plan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Execution Timeline */}
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Execution Timeline</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-blue-50 border border-green-200 rounded-lg">
                        <div className="flex items-center">
                          <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                          <span className="text-sm font-medium text-blue-800">Initial Assessment</span>
                        </div>
                        <span className="text-xs text-blue-600">Completed</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center">
                          <Play className="h-5 w-5 text-blue-600 mr-2" />
                          <span className="text-sm font-medium text-blue-800">Treatment Phase</span>
                        </div>
                        <span className="text-xs text-blue-600">In Progress</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-center">
                          <Clock className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-600">Follow-up</span>
                        </div>
                        <span className="text-xs text-gray-500">Pending</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Care Plan Modal */}
      {showCreatePlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Care Plan</h3>
            
            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newPlan.title}
                  onChange={(e) => setNewPlan({...newPlan, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Post-Surgery Recovery Plan"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({...newPlan, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Brief description of the care plan..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Objectives</label>
                <textarea
                  value={newPlan.objectives}
                  onChange={(e) => setNewPlan({...newPlan, objectives: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What are the main goals of this care plan?"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interventions</label>
                <textarea
                  value={newPlan.interventions}
                  onChange={(e) => setNewPlan({...newPlan, interventions: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What specific interventions will be implemented?"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timeline</label>
                  <input
                    type="text"
                    value={newPlan.timeline}
                    onChange={(e) => setNewPlan({...newPlan, timeline: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 4 weeks"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newPlan.priority}
                    onChange={(e) => setNewPlan({...newPlan, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreatePlan(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Care Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Consultation;
