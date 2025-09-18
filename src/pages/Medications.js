import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Pill, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Edit, 
  Trash2, 
  Calendar,
  AlertTriangle,
  User,
  MessageCircle,
  Bell,
  Activity,
  FileText,
  Camera
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import { medicationAPI } from '../api/medicationAPI';
import { useNavigate } from 'react-router-dom';

const Medications = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCaregiverContact, setShowCaregiverContact] = useState(false);

  const [newMedication, setNewMedication] = useState({
    name: '',
    dosage: '',
    frequency: 'Daily',
    instructions: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });

  // Fetch medications on component mount
  useEffect(() => {
    const fetchMedications = async () => {
      if (!user?.uid) return;
      
      try {
        setLoading(true);
        const userMedications = await medicationAPI.getMedications({ 
          patientId: user.uid 
        });
        
        // Transform API data to match component structure
        const transformedMedications = userMedications.map(med => ({
          id: med.id,
          name: med.name || 'Unknown Medication',
          dosage: med.dosage || 'N/A',
          frequency: med.frequency || 'As needed',
          instructions: med.instructions || 'No instructions',
          nextDose: med.nextDose ? new Date(med.nextDose).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A',
          taken: false, // This would need to be calculated based on dose logs
          startDate: med.startDate ? new Date(med.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          endDate: med.endDate ? new Date(med.endDate).toISOString().split('T')[0] : null,
          status: med.status || 'active'
        }));
        
        setMedications(transformedMedications);
      } catch (error) {
        console.error('Error fetching medications:', error);
        toast.error('Failed to load medications');
        
        // Fallback to sample data if API fails
        setMedications([
          {
            id: 'sample-1',
            name: 'Sample Medication',
            dosage: '100mg',
            frequency: 'Daily',
            instructions: 'Take with food',
            nextDose: '8:00 AM',
            taken: false,
            startDate: new Date().toISOString().split('T')[0],
            endDate: null,
            status: 'active'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchMedications();
  }, [user?.uid]);

  const handleAddMedication = async (e) => {
    e.preventDefault();
    
    if (!user?.uid) {
      toast.error('Please log in to add medications');
      return;
    }

    try {
      const medicationData = {
        patientId: user.uid,
        name: newMedication.name,
        dosage: newMedication.dosage,
        frequency: newMedication.frequency,
        instructions: newMedication.instructions,
        startDate: new Date(newMedication.startDate),
        endDate: newMedication.endDate ? new Date(newMedication.endDate) : null,
        status: 'active'
      };

      const result = await medicationAPI.createMedication(medicationData);
      
      if (result.success) {
        // Add to local state immediately for better UX
        const localMedication = {
          id: result.id,
          ...newMedication,
          nextDose: '8:00 AM',
          taken: false,
          status: 'active'
        };
        setMedications([...medications, localMedication]);
        
        setNewMedication({
          name: '',
          dosage: '',
          frequency: 'Daily',
          instructions: '',
          startDate: new Date().toISOString().split('T')[0],
          endDate: ''
        });
        setShowAddForm(false);
        toast.success('Medication added successfully!');
      }
    } catch (error) {
      console.error('Error adding medication:', error);
      toast.error('Failed to add medication. Please try again.');
    }
  };

  const handleToggleTaken = (id) => {
    setMedications(medications.map(med => 
      med.id === id ? { ...med, taken: !med.taken } : med
    ));
    toast.success('Medication status updated');
  };

  const handleDeleteMedication = (id) => {
    setMedications(medications.filter(med => med.id !== id));
    toast.success('Medication deleted successfully');
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medications</h1>
          <p className="text-gray-600">Manage your medications and track doses</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4" />
          Add Medication
        </button>
      </div>

      {/* Add Medication Form */}
      {showAddForm && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Medication</h2>
          <form onSubmit={handleAddMedication} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Medication Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newMedication.name}
                  onChange={(e) => setNewMedication({...newMedication, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="form-label">Dosage</label>
                <input
                  type="text"
                  className="form-input"
                  value={newMedication.dosage}
                  onChange={(e) => setNewMedication({...newMedication, dosage: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="form-label">Frequency</label>
                <select
                  className="form-input"
                  value={newMedication.frequency}
                  onChange={(e) => setNewMedication({...newMedication, frequency: e.target.value})}
                >
                  <option value="Daily">Daily</option>
                  <option value="Twice Daily">Twice Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="As Needed">As Needed</option>
                </select>
              </div>
              <div>
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={newMedication.startDate}
                  onChange={(e) => setNewMedication({...newMedication, startDate: e.target.value})}
                  required
                />
              </div>
            </div>
            <div>
              <label className="form-label">Instructions</label>
              <textarea
                className="form-input form-textarea"
                value={newMedication.instructions}
                onChange={(e) => setNewMedication({...newMedication, instructions: e.target.value})}
                placeholder="e.g., Take with food, Take on empty stomach"
              />
            </div>
            <div className="flex space-x-4">
              <button type="submit" className="btn btn-primary">
                Add Medication
              </button>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Medications List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading medications...</p>
          </div>
        ) : medications.length === 0 ? (
          <div className="text-center py-8">
            <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No medications added yet</p>
            <p className="text-gray-500 text-sm">Click "Add Medication" to get started</p>
          </div>
        ) : (
          medications.map((medication) => (
          <div key={medication.id} className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Pill className="h-8 w-8 text-blue-600 mr-4" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{medication.name}</h3>
                  <p className="text-gray-600">{medication.dosage} • {medication.frequency}</p>
                  <p className="text-sm text-gray-500">{medication.instructions}</p>
                  <div className="flex items-center mt-1 text-xs text-gray-400">
                    <Calendar className="h-3 w-3 mr-1" />
                    Started: {medication.startDate}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Next Dose</p>
                  <p className="font-medium text-gray-900">{medication.nextDose}</p>
                  <div className="flex items-center mt-1">
                    {medication.taken ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className="text-xs text-gray-500">
                      {medication.taken ? 'Taken' : 'Pending'}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleToggleTaken(medication.id)}
                    className={`btn ${medication.taken ? 'btn-outline' : 'btn-success'}`}
                  >
                    {medication.taken ? 'Mark as Missed' : 'Mark as Taken'}
                  </button>
                  <button 
                    onClick={() => setEditingMed(medication)}
                    className="btn btn-outline"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteMedication(medication.id)}
                    className="btn btn-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          ))
        )}
      </div>

      {/* Empty State - This is now handled above */}
      {false && (
        <div className="text-center py-12">
          <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No medications added yet</h3>
          <p className="text-gray-500 mb-4">Start by adding your first medication</p>
          <button 
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Medication
          </button>
        </div>
      )}

      {/* Caregiver Support Section */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help with Medications?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => navigate('/messages?topic=medication')}
            className="flex items-center justify-center p-4 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Message Caregiver
          </button>
          <button 
            onClick={() => navigate('/telemedicine?type=medication-consult')}
            className="flex items-center justify-center p-4 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
          >
            <User className="h-5 w-5 mr-2" />
            Video Consultation
          </button>
          <button 
            onClick={() => navigate('/appointments?type=medication-review')}
            className="flex items-center justify-center p-4 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
          >
            <Calendar className="h-5 w-5 mr-2" />
            Schedule Review
          </button>
        </div>
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Important Reminders</h4>
              <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                <li>• Always take medications as prescribed by your doctor</li>
                <li>• Contact your caregiver if you experience side effects</li>
                <li>• Never skip doses without consulting your healthcare provider</li>
                <li>• Keep medications in a safe, dry place</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Medications;
