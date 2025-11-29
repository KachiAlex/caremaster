import React, { useState, useEffect } from 'react';
import { 
  Pill, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Calendar,
  User,
  FileText,
  Eye,
  Save,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getMedicationsByClient } from '../api/medicationAPI';

const NurseMedicationManager = ({ clientId, clientName, nurseId, nurseName, onSave, onCancel }) => {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [administeringMed, setAdministeringMed] = useState(null);
  const [showAdministerModal, setShowAdministerModal] = useState(false);
  const [administerForm, setAdministerForm] = useState({
    medicationId: '',
    administeredAt: new Date().toISOString().slice(0, 16),
    dose: '',
    route: 'oral',
    notes: '',
    sideEffects: '',
    patientResponse: 'normal'
  });

  const routes = [
    { value: 'oral', label: 'Oral (PO)' },
    { value: 'sublingual', label: 'Sublingual' },
    { value: 'topical', label: 'Topical' },
    { value: 'injection', label: 'Injection' },
    { value: 'iv', label: 'IV' },
    { value: 'im', label: 'Intramuscular (IM)' },
    { value: 'subcutaneous', label: 'Subcutaneous' },
    { value: 'inhalation', label: 'Inhalation' },
    { value: 'rectal', label: 'Rectal' },
    { value: 'other', label: 'Other' }
  ];

  const patientResponses = [
    { value: 'normal', label: 'Normal Response', color: 'green' },
    { value: 'mild_side_effects', label: 'Mild Side Effects', color: 'yellow' },
    { value: 'moderate_side_effects', label: 'Moderate Side Effects', color: 'orange' },
    { value: 'severe_side_effects', label: 'Severe Side Effects', color: 'red' },
    { value: 'allergic_reaction', label: 'Allergic Reaction', color: 'red' },
    { value: 'no_response', label: 'No Response', color: 'gray' }
  ];

  useEffect(() => {
    loadMedications();
  }, [clientId]);

  const loadMedications = async () => {
    try {
      setLoading(true);
      const meds = await getMedicationsByClient(clientId);
      setMedications(meds || []);
    } catch (error) {
      console.error('Error loading medications:', error);
      toast.error('Failed to load medications');
    } finally {
      setLoading(false);
    }
  };

  const handleAdministerMedication = (medication) => {
    setAdministeringMed(medication);
    setAdministerForm({
      medicationId: medication.id,
      administeredAt: new Date().toISOString().slice(0, 16),
      dose: medication.dose || '',
      route: 'oral',
      notes: '',
      sideEffects: '',
      patientResponse: 'normal'
    });
    setShowAdministerModal(true);
  };

  const handleSubmitAdministration = async (e) => {
    e.preventDefault();
    
    if (!administerForm.dose.trim()) {
      toast.error('Please enter the administered dose');
      return;
    }

    try {
      // Here you would typically call an API to record medication administration
      // For now, we'll simulate the API call
      const administrationRecord = {
        medicationId: administerForm.medicationId,
        medicationName: administeringMed.name,
        clientId,
        clientName,
        nurseId,
        nurseName,
        administeredAt: new Date(administerForm.administeredAt),
        dose: administerForm.dose,
        route: administerForm.route,
        notes: administerForm.notes,
        sideEffects: administerForm.sideEffects,
        patientResponse: administerForm.patientResponse,
        status: 'administered'
      };

      // Simulate API call
      console.log('Recording medication administration:', administrationRecord);
      
      toast.success(`${administeringMed.name} administration recorded successfully`);
      
      // Close modal and refresh medications
      setShowAdministerModal(false);
      setAdministeringMed(null);
      await loadMedications();
      
      if (onSave) {
        onSave(administrationRecord);
      }
      
    } catch (error) {
      console.error('Error recording medication administration:', error);
      toast.error('Failed to record medication administration');
    }
  };

  const getMedicationStatus = (medication) => {
    const now = new Date();
    const lastAdministered = medication.lastAdministered ? new Date(medication.lastAdministered) : null;
    
    if (!lastAdministered) {
      return { status: 'pending', color: 'yellow', text: 'Pending' };
    }
    
    const timeSinceLastAdmin = (now - lastAdministered) / (1000 * 60 * 60); // hours
    const frequencyHours = getFrequencyHours(medication.frequency);
    
    if (timeSinceLastAdmin >= frequencyHours) {
      return { status: 'due', color: 'red', text: 'Due Now' };
    } else if (timeSinceLastAdmin >= frequencyHours * 0.8) {
      return { status: 'soon', color: 'orange', text: 'Due Soon' };
    } else {
      return { status: 'administered', color: 'green', text: 'Administered' };
    }
  };

  const getFrequencyHours = (frequency) => {
    if (!frequency) return 24; // Default to once daily
    
    const freq = frequency.toLowerCase();
    if (freq.includes('daily') || freq.includes('once')) return 24;
    if (freq.includes('twice') || freq.includes('bid')) return 12;
    if (freq.includes('three') || freq.includes('tid')) return 8;
    if (freq.includes('four') || freq.includes('qid')) return 6;
    if (freq.includes('every 4')) return 4;
    if (freq.includes('every 6')) return 6;
    if (freq.includes('every 8')) return 8;
    if (freq.includes('every 12')) return 12;
    return 24;
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return new Date(timeString).toLocaleString();
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'due': 'bg-red-100 text-red-800',
      'soon': 'bg-orange-100 text-orange-800',
      'administered': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getResponseColor = (response) => {
    const responseData = patientResponses.find(r => r.value === response);
    return responseData ? responseData.color : 'gray';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Pill className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Medication Management</h2>
                <p className="text-sm text-gray-600">Client: {clientName}</p>
                <p className="text-xs text-gray-500">Nurse: {nurseName}</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : medications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Pill className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No medications prescribed</p>
              <p className="text-sm">This Client has no current medication prescriptions.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Prescribed Medications ({medications.length})
                </h3>
                <div className="text-sm text-gray-500">
                  * Nurses can only view prescribed medications and record administration
                </div>
              </div>

              {medications.map((medication) => {
                const status = getMedicationStatus(medication);
                return (
                  <div key={medication.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">{medication.name}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status.status)}`}>
                            {status.text}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Dose:</span>
                            <p className="font-medium text-gray-900">{medication.dose || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Frequency:</span>
                            <p className="font-medium text-gray-900">{medication.frequency || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Route:</span>
                            <p className="font-medium text-gray-900 capitalize">{medication.route || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Prescribed By:</span>
                            <p className="font-medium text-gray-900">{medication.prescribedBy || 'N/A'}</p>
                          </div>
                        </div>
                        
                        {medication.instructions && (
                          <div className="mt-3">
                            <span className="text-gray-500 text-sm">Instructions:</span>
                            <p className="text-sm text-gray-700 mt-1">{medication.instructions}</p>
                          </div>
                        )}
                        
                        {medication.lastAdministered && (
                          <div className="mt-3">
                            <span className="text-gray-500 text-sm">Last Administered:</span>
                            <p className="text-sm text-gray-700">{formatTime(medication.lastAdministered)}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {status.status === 'due' || status.status === 'soon' ? (
                          <button
                            onClick={() => handleAdministerMedication(medication)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Administer
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAdministerMedication(medication)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Record Admin
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Medication Administration Modal */}
        {showAdministerModal && administeringMed && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Pill className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Record Medication Administration</h3>
                      <p className="text-sm text-gray-600">{administeringMed.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAdministerModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmitAdministration} className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Administered At</label>
                      <input
                        type="datetime-local"
                        value={administerForm.administeredAt}
                        onChange={(e) => setAdministerForm(prev => ({ ...prev, administeredAt: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Dose Administered</label>
                      <input
                        type="text"
                        value={administerForm.dose}
                        onChange={(e) => setAdministerForm(prev => ({ ...prev, dose: e.target.value }))}
                        placeholder="e.g., 10mg, 1 tablet"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Route</label>
                    <select
                      value={administerForm.route}
                      onChange={(e) => setAdministerForm(prev => ({ ...prev, route: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      {routes.map(route => (
                        <option key={route.value} value={route.value}>{route.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Client Response</label>
                    <select
                      value={administerForm.patientResponse}
                      onChange={(e) => setAdministerForm(prev => ({ ...prev, patientResponse: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      {patientResponses.map(response => (
                        <option key={response.value} value={response.value}>{response.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Side Effects Observed</label>
                    <textarea
                      value={administerForm.sideEffects}
                      onChange={(e) => setAdministerForm(prev => ({ ...prev, sideEffects: e.target.value }))}
                      placeholder="Describe any side effects observed..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Administration Notes</label>
                    <textarea
                      value={administerForm.notes}
                      onChange={(e) => setAdministerForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes about the administration..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowAdministerModal(false)}
                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Record Administration
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NurseMedicationManager;
