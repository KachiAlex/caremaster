import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  Heart, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Plus,
  Save,
  FileText
} from 'lucide-react';
import { toast } from 'react-toastify';

const CareLogForm = ({ client, onClose, onSave, isOpen }) => {
  const [formData, setFormData] = useState({
    // Basic Information
    clientId: '',
    clientName: '',
    caregiverId: '',
    caregiverName: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    
    // Vital Signs
    vitalSigns: {
      bloodPressure: '',
      temperature: '',
      heartRate: '',
      oxygenSaturation: '',
      weight: ''
    },
    
    // Activities of Daily Living (ADL)
    adl: {
      bathing: { completed: false, assistance: 'independent', notes: '' },
      dressing: { completed: false, assistance: 'independent', notes: '' },
      grooming: { completed: false, assistance: 'independent', notes: '' },
      toileting: { completed: false, assistance: 'independent', notes: '' },
      mobility: { completed: false, assistance: 'independent', notes: '' },
      feeding: { completed: false, assistance: 'independent', notes: '' }
    },
    
    // Nutrition & Hydration
    nutrition: {
      mealType: '',
      foodEaten: '',
      percentageEaten: '',
      fluidIntake: '',
      appetite: '',
      swallowing: ''
    },
    
    // Elimination
    elimination: {
      bowelMovement: { frequency: '', consistency: '', notes: '' },
      urination: { frequency: '', color: '', notes: '' },
      incontinence: { episodes: '', notes: '' }
    },
    
    // Medication & Treatment
    medications: [],
    treatments: [],
    
    // Mental & Social
    mentalStatus: {
      alertness: '',
      mood: '',
      behavior: '',
      communication: '',
      cognition: ''
    },
    
    // Safety & Incidents
    safety: {
      fallRisk: '',
      incidents: [],
      restraints: '',
      skinCondition: ''
    },
    
    // Progress & Goals
    progress: '',
    goals: '',
    challenges: '',
    recommendations: '',
    
    // Additional Notes
    notes: ''
  });

  const [currentSection, setCurrentSection] = useState('vitals');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const assistanceLevels = [
    { value: 'independent', label: 'Independent', color: 'green' },
    { value: 'supervised', label: 'Supervised', color: 'yellow' },
    { value: 'assisted', label: 'Assisted', color: 'orange' },
    { value: 'dependent', label: 'Dependent', color: 'red' }
  ];

  const moodOptions = ['Excellent', 'Good', 'Fair', 'Poor', 'Depressed', 'Anxious', 'Agitated'];
  const alertnessOptions = ['Alert', 'Drowsy', 'Lethargic', 'Confused', 'Unresponsive'];
  const appetiteOptions = ['Excellent', 'Good', 'Fair', 'Poor', 'Refusing'];
  const fallRiskOptions = ['Low', 'Moderate', 'High', 'Critical'];

  useEffect(() => {
    if (client && isOpen) {
      setFormData(prev => ({
        ...prev,
        clientId: client.id,
        clientName: client.name || client.displayName,
        caregiverId: client.assignedCaregiverId || '',
        caregiverName: client.assignedCaregiverName || ''
      }));
    }
  }, [client, isOpen]);

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleADLChange = (activity, field, value) => {
    setFormData(prev => ({
      ...prev,
      adl: {
        ...prev.adl,
        [activity]: {
          ...prev.adl[activity],
          [field]: value
        }
      }
    }));
  };

  const addMedication = () => {
    setFormData(prev => ({
      ...prev,
      medications: [...prev.medications, {
        id: Date.now(),
        name: '',
        dosage: '',
        time: '',
        given: false,
        notes: ''
      }]
    }));
  };

  const updateMedication = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.map(med => 
        med.id === id ? { ...med, [field]: value } : med
      )
    }));
  };

  const removeMedication = (id) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter(med => med.id !== id)
    }));
  };

  const addIncident = () => {
    setFormData(prev => ({
      ...prev,
      safety: {
        ...prev.safety,
        incidents: [...prev.safety.incidents, {
          id: Date.now(),
          type: '',
          description: '',
          time: '',
          action: ''
        }]
      }
    }));
  };

  const updateIncident = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      safety: {
        ...prev.safety,
        incidents: prev.safety.incidents.map(incident => 
          incident.id === id ? { ...incident, [field]: value } : incident
        )
      }
    }));
  };

  const removeIncident = (id) => {
    setFormData(prev => ({
      ...prev,
      safety: {
        ...prev.safety,
        incidents: prev.safety.incidents.filter(incident => incident.id !== id)
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.clientId || !formData.date || !formData.time) {
        toast.error('Please fill in all required fields');
        return;
      }

      await onSave(formData);
      toast.success('Care log saved successfully');
      onClose();
    } catch (error) {
      console.error('Error saving care log:', error);
      toast.error('Failed to save care log');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sections = [
    { id: 'vitals', label: 'Vital Signs', icon: Activity },
    { id: 'adl', label: 'Daily Activities', icon: User },
    { id: 'nutrition', label: 'Nutrition', icon: Heart },
    { id: 'elimination', label: 'Elimination', icon: AlertTriangle },
    { id: 'medications', label: 'Medications', icon: CheckCircle },
    { id: 'mental', label: 'Mental Status', icon: FileText },
    { id: 'safety', label: 'Safety', icon: AlertTriangle },
    { id: 'progress', label: 'Progress', icon: CheckCircle }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Care Log Entry</h2>
              <p className="text-blue-100 mt-1">
                {formData.clientName} • {formData.date} at {formData.time}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setCurrentSection(section.id)}
                  className={`flex items-center px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    currentSection === section.id
                      ? 'border-blue-500 text-blue-600 bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
          <form onSubmit={handleSubmit}>
            {/* Basic Information */}
            {currentSection === 'vitals' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Blood Pressure
                    </label>
                    <input
                      type="text"
                      value={formData.vitalSigns.bloodPressure}
                      onChange={(e) => handleInputChange('vitalSigns', 'bloodPressure', e.target.value)}
                      placeholder="120/80"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Temperature (°F)
                    </label>
                    <input
                      type="text"
                      value={formData.vitalSigns.temperature}
                      onChange={(e) => handleInputChange('vitalSigns', 'temperature', e.target.value)}
                      placeholder="98.6"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Heart Rate (BPM)
                    </label>
                    <input
                      type="text"
                      value={formData.vitalSigns.heartRate}
                      onChange={(e) => handleInputChange('vitalSigns', 'heartRate', e.target.value)}
                      placeholder="72"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Oxygen Saturation (%)
                    </label>
                    <input
                      type="text"
                      value={formData.vitalSigns.oxygenSaturation}
                      onChange={(e) => handleInputChange('vitalSigns', 'oxygenSaturation', e.target.value)}
                      placeholder="98"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weight (lbs)
                    </label>
                    <input
                      type="text"
                      value={formData.vitalSigns.weight}
                      onChange={(e) => handleInputChange('vitalSigns', 'weight', e.target.value)}
                      placeholder="150"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Activities of Daily Living */}
            {currentSection === 'adl' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Activities of Daily Living</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(formData.adl).map(([activity, data]) => (
                    <div key={activity} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900 capitalize">{activity}</h4>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={data.completed}
                            onChange={(e) => handleADLChange(activity, 'completed', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-600">Completed</span>
                        </label>
                      </div>
                      
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Assistance Level
                        </label>
                        <select
                          value={data.assistance}
                          onChange={(e) => handleADLChange(activity, 'assistance', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {assistanceLevels.map(level => (
                            <option key={level.value} value={level.value}>
                              {level.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Notes
                        </label>
                        <textarea
                          value={data.notes}
                          onChange={(e) => handleADLChange(activity, 'notes', e.target.value)}
                          placeholder={`Notes about ${activity}...`}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nutrition */}
            {currentSection === 'nutrition' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Meal Type
                    </label>
                    <select
                      value={formData.nutrition.mealType}
                      onChange={(e) => handleInputChange('nutrition', 'mealType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select meal type</option>
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="snack">Snack</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Appetite
                    </label>
                    <select
                      value={formData.nutrition.appetite}
                      onChange={(e) => handleInputChange('nutrition', 'appetite', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select appetite level</option>
                      {appetiteOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Food Eaten
                    </label>
                    <textarea
                      value={formData.nutrition.foodEaten}
                      onChange={(e) => handleInputChange('nutrition', 'foodEaten', e.target.value)}
                      placeholder="Describe what was eaten..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Percentage Eaten
                    </label>
                    <select
                      value={formData.nutrition.percentageEaten}
                      onChange={(e) => handleInputChange('nutrition', 'percentageEaten', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select percentage</option>
                      <option value="0-25%">0-25%</option>
                      <option value="26-50%">26-50%</option>
                      <option value="51-75%">51-75%</option>
                      <option value="76-100%">76-100%</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fluid Intake (ml)
                    </label>
                    <input
                      type="text"
                      value={formData.nutrition.fluidIntake}
                      onChange={(e) => handleInputChange('nutrition', 'fluidIntake', e.target.value)}
                      placeholder="e.g., 500ml"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Swallowing Ability
                    </label>
                    <select
                      value={formData.nutrition.swallowing}
                      onChange={(e) => handleInputChange('nutrition', 'swallowing', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select ability</option>
                      <option value="normal">Normal</option>
                      <option value="difficulty">Difficulty</option>
                      <option value="choking">Choking episodes</option>
                      <option value="tube-feeding">Tube feeding</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Elimination */}
            {currentSection === 'elimination' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Bowel Movement</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Frequency
                        </label>
                        <select
                          value={formData.elimination.bowelMovement.frequency}
                          onChange={(e) => handleInputChange('elimination', 'bowelMovement', {
                            ...formData.elimination.bowelMovement,
                            frequency: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select frequency</option>
                          <option value="none">None</option>
                          <option value="once">Once</option>
                          <option value="twice">Twice</option>
                          <option value="three-plus">Three or more</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Consistency
                        </label>
                        <select
                          value={formData.elimination.bowelMovement.consistency}
                          onChange={(e) => handleInputChange('elimination', 'bowelMovement', {
                            ...formData.elimination.bowelMovement,
                            consistency: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select consistency</option>
                          <option value="hard">Hard</option>
                          <option value="normal">Normal</option>
                          <option value="soft">Soft</option>
                          <option value="liquid">Liquid</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Urination</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Frequency
                        </label>
                        <input
                          type="text"
                          value={formData.elimination.urination.frequency}
                          onChange={(e) => handleInputChange('elimination', 'urination', {
                            ...formData.elimination.urination,
                            frequency: e.target.value
                          })}
                          placeholder="e.g., 4 times"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Color
                        </label>
                        <select
                          value={formData.elimination.urination.color}
                          onChange={(e) => handleInputChange('elimination', 'urination', {
                            ...formData.elimination.urination,
                            color: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select color</option>
                          <option value="clear">Clear</option>
                          <option value="light-yellow">Light Yellow</option>
                          <option value="dark-yellow">Dark Yellow</option>
                          <option value="cloudy">Cloudy</option>
                          <option value="pink">Pink</option>
                          <option value="red">Red</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Medications */}
            {currentSection === 'medications' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Medications</h3>
                  <button
                    type="button"
                    onClick={addMedication}
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Medication
                  </button>
                </div>
                
                <div className="space-y-4">
                  {formData.medications.map((medication) => (
                    <div key={medication.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-medium text-gray-900">Medication #{medication.id}</h4>
                        <button
                          type="button"
                          onClick={() => removeMedication(medication.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Medication Name
                          </label>
                          <input
                            type="text"
                            value={medication.name}
                            onChange={(e) => updateMedication(medication.id, 'name', e.target.value)}
                            placeholder="e.g., Metformin"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Dosage
                          </label>
                          <input
                            type="text"
                            value={medication.dosage}
                            onChange={(e) => updateMedication(medication.id, 'dosage', e.target.value)}
                            placeholder="e.g., 500mg"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Time Given
                          </label>
                          <input
                            type="time"
                            value={medication.time}
                            onChange={(e) => updateMedication(medication.id, 'time', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-center">
                        <label className="flex items-center mr-4">
                          <input
                            type="checkbox"
                            checked={medication.given}
                            onChange={(e) => updateMedication(medication.id, 'given', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-600">Medication given</span>
                        </label>
                      </div>
                      
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <textarea
                          value={medication.notes}
                          onChange={(e) => updateMedication(medication.id, 'notes', e.target.value)}
                          placeholder="Any notes about this medication..."
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                  
                  {formData.medications.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No medications added yet. Click "Add Medication" to get started.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mental Status */}
            {currentSection === 'mental' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alertness Level
                    </label>
                    <select
                      value={formData.mentalStatus.alertness}
                      onChange={(e) => handleInputChange('mentalStatus', 'alertness', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select alertness level</option>
                      {alertnessOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mood
                    </label>
                    <select
                      value={formData.mentalStatus.mood}
                      onChange={(e) => handleInputChange('mentalStatus', 'mood', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select mood</option>
                      {moodOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Behavior
                    </label>
                    <select
                      value={formData.mentalStatus.behavior}
                      onChange={(e) => handleInputChange('mentalStatus', 'behavior', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select behavior</option>
                      <option value="cooperative">Cooperative</option>
                      <option value="resistant">Resistant</option>
                      <option value="agitated">Agitated</option>
                      <option value="withdrawn">Withdrawn</option>
                      <option value="confused">Confused</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Communication
                    </label>
                    <select
                      value={formData.mentalStatus.communication}
                      onChange={(e) => handleInputChange('mentalStatus', 'communication', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select communication level</option>
                      <option value="clear">Clear and coherent</option>
                      <option value="difficulty">Some difficulty</option>
                      <option value="limited">Limited speech</option>
                      <option value="non-verbal">Non-verbal</option>
                      <option value="unable">Unable to communicate</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Safety */}
            {currentSection === 'safety' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fall Risk Assessment
                    </label>
                    <select
                      value={formData.safety.fallRisk}
                      onChange={(e) => handleInputChange('safety', 'fallRisk', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select fall risk level</option>
                      {fallRiskOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Skin Condition
                    </label>
                    <select
                      value={formData.safety.skinCondition}
                      onChange={(e) => handleInputChange('safety', 'skinCondition', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select skin condition</option>
                      <option value="intact">Intact</option>
                      <option value="dry">Dry</option>
                      <option value="irritated">Irritated</option>
                      <option value="redness">Redness</option>
                      <option value="bruising">Bruising</option>
                      <option value="pressure-sore">Pressure sore</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium text-gray-900">Incidents</h4>
                    <button
                      type="button"
                      onClick={addIncident}
                      className="flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Incident
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {formData.safety.incidents.map((incident) => (
                      <div key={incident.id} className="bg-red-50 rounded-lg p-4 border border-red-200">
                        <div className="flex justify-between items-start mb-3">
                          <h5 className="font-medium text-red-900">Incident #{incident.id}</h5>
                          <button
                            type="button"
                            onClick={() => removeIncident(incident.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Incident Type
                            </label>
                            <select
                              value={incident.type}
                              onChange={(e) => updateIncident(incident.id, 'type', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select type</option>
                              <option value="fall">Fall</option>
                              <option value="injury">Injury</option>
                              <option value="medication-error">Medication Error</option>
                              <option value="behavioral">Behavioral</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Time of Incident
                            </label>
                            <input
                              type="time"
                              value={incident.time}
                              onChange={(e) => updateIncident(incident.id, 'time', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            value={incident.description}
                            onChange={(e) => updateIncident(incident.id, 'description', e.target.value)}
                            placeholder="Describe what happened..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Action Taken
                          </label>
                          <textarea
                            value={incident.action}
                            onChange={(e) => updateIncident(incident.id, 'action', e.target.value)}
                            placeholder="What action was taken..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                    
                    {formData.safety.incidents.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No incidents reported. Great job!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Progress */}
            {currentSection === 'progress' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Progress Notes
                  </label>
                  <textarea
                    value={formData.progress}
                    onChange={(e) => setFormData(prev => ({ ...prev, progress: e.target.value }))}
                    placeholder="Describe the client's progress since last visit..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Goals for Next Visit
                  </label>
                  <textarea
                    value={formData.goals}
                    onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))}
                    placeholder="What are the goals for the next visit..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Challenges Encountered
                  </label>
                  <textarea
                    value={formData.challenges}
                    onChange={(e) => setFormData(prev => ({ ...prev, challenges: e.target.value }))}
                    placeholder="Any challenges or concerns..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recommendations
                  </label>
                  <textarea
                    value={formData.recommendations}
                    onChange={(e) => setFormData(prev => ({ ...prev, recommendations: e.target.value }))}
                    placeholder="Recommendations for care team or family..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any additional notes or observations..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Care Log
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CareLogForm;
