import React, { useState } from 'react';
import { Plus, Pill, Clock, CheckCircle, XCircle, Edit, Trash2, Calendar } from 'lucide-react';
import { toast } from 'react-toastify';

const Medications = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  
  // Mock data - will be replaced with real data from Data Connect when available
  const [medications, setMedications] = useState([
    {
      id: 1,
      name: 'Aspirin',
      dosage: '100mg',
      frequency: 'Daily',
      instructions: 'Take with food',
      nextDose: '8:00 AM',
      taken: true,
      startDate: '2024-01-15',
      endDate: null
    },
    {
      id: 2,
      name: 'Vitamin D',
      dosage: '2000IU',
      frequency: 'Weekly',
      instructions: 'Take in the morning',
      nextDose: '9:00 AM',
      taken: false,
      startDate: '2024-01-10',
      endDate: null
    },
    {
      id: 3,
      name: 'Blood Pressure Medication',
      dosage: '10mg',
      frequency: 'Twice Daily',
      instructions: 'Take with water',
      nextDose: '2:00 PM',
      taken: false,
      startDate: '2024-01-20',
      endDate: null
    }
  ]);

  const [newMedication, setNewMedication] = useState({
    name: '',
    dosage: '',
    frequency: 'Daily',
    instructions: '',
    startDate: '',
    endDate: ''
  });

  const handleAddMedication = (e) => {
    e.preventDefault();
    const medication = {
      id: Date.now(),
      ...newMedication,
      nextDose: '8:00 AM',
      taken: false
    };
    setMedications([...medications, medication]);
    setNewMedication({
      name: '',
      dosage: '',
      frequency: 'Daily',
      instructions: '',
      startDate: '',
      endDate: ''
    });
    setShowAddForm(false);
    toast.success('Medication added successfully');
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
        {medications.map((medication) => (
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
        ))}
      </div>

      {/* Empty State */}
      {medications.length === 0 && (
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
    </div>
  );
};

export default Medications;
