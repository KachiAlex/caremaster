// AI Medication Interaction Checker Component
import React, { useState, useEffect } from 'react';
import { 
  Pill, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Search, 
  Brain, 
  Shield, 
  Clock, 
  Users, 
  Settings,
  Plus,
  Trash2,
  Info
} from 'lucide-react';
import aiService from '../services/aiService';
import hapticService from '../services/hapticService';

const AIMedicationChecker = ({ isOpen, onClose, currentMedications = [] }) => {
  const [medications, setMedications] = useState(currentMedications);
  const [interactionResults, setInteractionResults] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [newMedication, setNewMedication] = useState({
    name: '',
    dosage: '',
    frequency: '',
    instructions: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [checkMode, setCheckMode] = useState('comprehensive'); // basic, comprehensive, detailed

  useEffect(() => {
    if (isOpen && medications.length > 0) {
      checkInteractions();
    }
  }, [isOpen, medications]);

  const checkInteractions = async () => {
    if (medications.length < 2) {
      setInteractionResults({
        interactions: [],
        overallRisk: 'low',
        recommendations: ['Add more medications to check for interactions']
      });
      return;
    }

    setIsChecking(true);
    hapticService.buttonPress();
    
    try {
      const results = await aiService.detectMedicationInteractions(medications);
      setInteractionResults(results);
      hapticService.success();
    } catch (error) {
      console.error('Medication interaction check failed:', error);
      hapticService.error();
    } finally {
      setIsChecking(false);
    }
  };

  const addMedication = () => {
    if (newMedication.name.trim()) {
      const medication = {
        id: `med_${Date.now()}`,
        name: newMedication.name.trim(),
        dosage: newMedication.dosage.trim(),
        frequency: newMedication.frequency.trim(),
        instructions: newMedication.instructions.trim(),
        addedAt: new Date()
      };
      
      setMedications(prev => [...prev, medication]);
      setNewMedication({ name: '', dosage: '', frequency: '', instructions: '' });
      setShowAddForm(false);
      hapticService.buttonPress();
    }
  };

  const removeMedication = (id) => {
    setMedications(prev => prev.filter(med => med.id !== id));
    hapticService.buttonPress();
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'minor': return 'text-blue-600 bg-blue-100';
      case 'moderate': return 'text-yellow-600 bg-yellow-100';
      case 'major': return 'text-orange-600 bg-orange-100';
      case 'contraindicated': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'minor': return <Info className="w-4 h-4 text-blue-600" />;
      case 'moderate': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'major': return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'contraindicated': return <X className="w-4 h-4 text-red-600" />;
      default: return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-blue-600 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">AI Medication Checker</h2>
              <p className="text-sm opacity-90">Advanced drug interaction analysis</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Check Mode</label>
                <select
                  value={checkMode}
                  onChange={(e) => setCheckMode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="basic">Basic Check</option>
                  <option value="comprehensive">Comprehensive</option>
                  <option value="detailed">Detailed Analysis</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Auto-check on changes</label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 transition-colors">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Current Medications */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Current Medications</h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Medication</span>
            </button>
          </div>

          {/* Add Medication Form */}
          {showAddForm && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Medication Name</label>
                  <input
                    type="text"
                    value={newMedication.name}
                    onChange={(e) => setNewMedication(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Aspirin"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Dosage</label>
                  <input
                    type="text"
                    value={newMedication.dosage}
                    onChange={(e) => setNewMedication(prev => ({ ...prev, dosage: e.target.value }))}
                    placeholder="e.g., 100mg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Frequency</label>
                  <input
                    type="text"
                    value={newMedication.frequency}
                    onChange={(e) => setNewMedication(prev => ({ ...prev, frequency: e.target.value }))}
                    placeholder="e.g., Once daily"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Instructions</label>
                  <input
                    type="text"
                    value={newMedication.instructions}
                    onChange={(e) => setNewMedication(prev => ({ ...prev, instructions: e.target.value }))}
                    placeholder="e.g., Take with food"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex space-x-2 mt-4">
                <button
                  onClick={addMedication}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add Medication
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Medications List */}
          <div className="space-y-2">
            {medications.map((medication) => (
              <div key={medication.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Pill className="w-5 h-5 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">{medication.name}</h4>
                    <p className="text-sm text-gray-600">
                      {medication.dosage} • {medication.frequency}
                    </p>
                    {medication.instructions && (
                      <p className="text-xs text-gray-500">{medication.instructions}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeMedication(medication.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            {medications.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Pill className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p>No medications added yet</p>
                <p className="text-sm">Add medications to check for interactions</p>
              </div>
            )}
          </div>
        </div>

        {/* Interaction Check Controls */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={checkInteractions}
                disabled={isChecking || medications.length < 2}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Search className="w-4 h-4" />
                <span>{isChecking ? 'Checking...' : 'Check Interactions'}</span>
              </button>
              
              {interactionResults && (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Analysis complete!</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Medications:</span>
              <span className="font-medium">{medications.length}</span>
            </div>
          </div>
        </div>

        {/* Interaction Results */}
        {interactionResults && (
          <div className="flex-1 p-4 overflow-y-auto">
            {/* Overall Risk Assessment */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Overall Risk Assessment</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(interactionResults.overallRisk)}`}>
                  {interactionResults.overallRisk} risk
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Based on analysis of {medications.length} medications
              </p>
            </div>

            {/* Interactions */}
            {interactionResults.interactions.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Detected Interactions</h3>
                {interactionResults.interactions.map((interaction, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getSeverityIcon(interaction.severity)}
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {interaction.medications.join(' + ')}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(interaction.severity)}`}>
                            {interaction.severity} severity
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <p className="text-sm text-gray-700">{interaction.description}</p>
                    </div>
                    
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h5 className="font-medium text-blue-900 mb-1">Recommendation:</h5>
                      <p className="text-sm text-blue-800">{interaction.recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Interactions Detected</h3>
                <p className="text-gray-600">Your current medications appear to be safe to take together.</p>
              </div>
            )}

            {/* General Recommendations */}
            {interactionResults.recommendations.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">General Recommendations</h4>
                <ul className="space-y-1">
                  {interactionResults.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-blue-800 flex items-start space-x-2">
                      <CheckCircle className="w-3 h-3 mt-1 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Safety Tips */}
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-900 mb-2">Safety Tips</h4>
              <ul className="space-y-1 text-sm text-green-800">
                <li>• Always consult your healthcare provider before starting new medications</li>
                <li>• Keep an updated list of all medications you're taking</li>
                <li>• Inform all healthcare providers about your current medications</li>
                <li>• Report any unusual symptoms or side effects immediately</li>
                <li>• Follow medication instructions carefully</li>
              </ul>
            </div>
          </div>
        )}

        {/* No Results State */}
        {!interactionResults && medications.length >= 2 && (
          <div className="flex-1 p-4 flex items-center justify-center">
            <div className="text-center">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Check Interactions</h3>
              <p className="text-gray-600">Click "Check Interactions" to analyze your medications</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIMedicationChecker;
