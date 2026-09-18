import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Save, 
  X,
  Calendar,
  Clock,
  User,
  Activity,
  AlertTriangle,
  CheckCircle,
  Download,
  Printer,
  Heart,
  Thermometer,
  Droplets,
  Weight,
  Ruler,
  Eye,
  Stethoscope,
  Plus,
  Trash2,
  AlertOctagon,
  ClipboardList,
  Mic,
  MicOff,
  PenTool,
  Lock,
  Camera,
  Image as ImageIcon,
  Shield
} from 'lucide-react';
import { toast } from 'react-toastify';
import { createNurseReport } from '../api/nurseReportsAPI';
import { getVitalSignsByClient } from '../api/vitalSignsAPI';
import { getCareLogsByClient } from '../api/careLogsAPI';
import { getCareTasksByClient } from '../api/careTasksAPI';
import { getClientById } from '../api/patientsAPI';
import { calculateNewsScore } from '../utils/newsScore';
import GlobalAllergyAlert from './GlobalAllergyAlert';

const OBSERVATION_CODES = [
  { value: 'green', label: 'Code Green: Normal/Stable', color: 'text-green-600', bg: 'bg-green-100', priority: 'low' },
  { value: 'yellow', label: 'Code Yellow: Change in Status', color: 'text-yellow-600', bg: 'bg-yellow-100', priority: 'medium' },
  { value: 'orange', label: 'Code Orange: Significant Concern', color: 'text-orange-600', bg: 'bg-orange-100', priority: 'high' },
  { value: 'red', label: 'Code Red: Critical/Emergency', color: 'text-red-600', bg: 'bg-red-100', priority: 'critical' }
];

const NurseReportGenerator = ({ clientId, clientName, nurseId, nurseName, institutionId, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    // SBAR Sections
    situation: '',
    background: '',
    assessment: '',
    recommendation: '',
    
    // Client Assessment
    patientCondition: 'stable',
    mentalStatus: 'alert',
    mobilityStatus: 'independent',
    nutritionStatus: 'adequate',
    
    // Physical Assessment
    generalAppearance: '',
    skinCondition: 'normal',
    painLevel: '',
    painLocation: '',
    painDescription: '',
    
    // Coded Observations
    codedObservations: [],
    
    // Care Provided (Dynamic)
    careActivities: [],
    medicationsGiven: [],
    treatmentsProvided: [],
    
    // Medications list for verification
    verifiedMedications: [],
    
    // Photos
    photos: [],
    
    // Report Metadata
    reportType: 'routine_assessment',
    shift: 'day',
    
    // Additional Notes
    additionalNotes: '',
    followUpRequired: false,
    followUpNotes: '',

    // Clinical Audit & Safety
    isSigned: false,
    newsScore: 0,
    newsData: null
  });

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [recentVitals, setRecentVitals] = useState([]);
  const [recentCareLogs, setRecentCareLogs] = useState([]);
  const [activeTasks, setActiveTasks] = useState([]);
  const [clientData, setClientData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Voice recording state
  const [activeVoiceField, setActiveVoiceField] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const [newObservation, setNewObservation] = useState({
    code: 'green',
    category: 'General',
    description: ''
  });

  // Calculate NEWS score whenever vitals or mental status change
  useEffect(() => {
    if (recentVitals.length > 0) {
      const latest = recentVitals[0];
      const result = calculateNewsScore({
        respiratoryRate: latest.respiratoryRate,
        oxygenSaturation: latest.oxygenSaturation,
        temperature: latest.temperature,
        temperatureUnit: latest.temperatureUnit,
        bloodPressureSystolic: latest.bloodPressureSystolic,
        heartRate: latest.heartRate,
        mentalStatus: formData.mentalStatus
      });
      
      setFormData(prev => ({
        ...prev,
        newsScore: result.score,
        newsData: result
      }));
    }
  }, [recentVitals, formData.mentalStatus]);

  // Web Speech API handler
  const startSpeechRecognition = (field) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice-to-text is not supported in this browser.');
      return;
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Recognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      setActiveVoiceField(field);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setFormData(prev => ({
        ...prev,
        [field]: prev[field] ? `${prev[field]} ${transcript}` : transcript
      }));
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      setActiveVoiceField(null);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setActiveVoiceField(null);
    };

    recognition.start();
  };

  const patientConditions = [
    { value: 'stable', label: 'Stable', color: 'green' },
    { value: 'improving', label: 'Improving', color: 'blue' },
    { value: 'deteriorating', label: 'Deteriorating', color: 'orange' },
    { value: 'critical', label: 'Critical', color: 'red' },
    { value: 'unstable', label: 'Unstable', color: 'red' }
  ];

  const mentalStatusOptions = [
    { value: 'alert', label: 'Alert and Oriented' },
    { value: 'confused', label: 'Confused' },
    { value: 'lethargic', label: 'Lethargic' },
    { value: 'agitated', label: 'Agitated' },
    { value: 'unresponsive', label: 'Unresponsive' }
  ];

  const mobilityStatusOptions = [
    { value: 'independent', label: 'Independent' },
    { value: 'assistive_device', label: 'Assistive Device' },
    { value: 'partial_assistance', label: 'Partial Assistance' },
    { value: 'full_assistance', label: 'Full Assistance' },
    { value: 'bedbound', label: 'Bedbound' }
  ];

  const nutritionStatusOptions = [
    { value: 'adequate', label: 'Adequate' },
    { value: 'poor', label: 'Poor' },
    { value: 'dehydrated', label: 'Dehydrated' },
    { value: 'npo', label: 'NPO (Nothing by Mouth)' },
    { value: 'tube_feeding', label: 'Tube Feeding' }
  ];

  const reportTypes = [
    { value: 'routine_assessment', label: 'Routine Assessment' },
    { value: 'change_in_condition', label: 'Change in Condition' },
    { value: 'incident_report', label: 'Incident Report' },
    { value: 'discharge_summary', label: 'Discharge Summary' },
    { value: 'emergency_assessment', label: 'Emergency Assessment' }
  ];

  const shifts = [
    { value: 'day', label: 'Day Shift (7 AM - 3 PM)' },
    { value: 'evening', label: 'Evening Shift (3 PM - 11 PM)' },
    { value: 'night', label: 'Night Shift (11 PM - 7 AM)' }
  ];

  useEffect(() => {
    loadShiftData();
  }, [clientId]);

  const loadShiftData = async () => {
    if (!clientId) return;
    setLoadingData(true);
    try {
      // Fetch data in parallel
      const [vitals, logs, tasks, client] = await Promise.all([
        getVitalSignsByClient(clientId).catch(() => []),
        getCareLogsByClient(clientId).catch(() => []),
        getCareTasksByClient(clientId).catch(() => []),
        getClientById(clientId).catch(() => null)
      ]);

      const recentV = vitals.slice(0, 5);
      const recentL = logs.slice(0, 10); // More logs for selection
      const activeT = tasks.filter(t => t.status === 'completed' || t.status === 'in_progress');

      setRecentVitals(recentV);
      setRecentCareLogs(recentL);
      setActiveTasks(activeT);
      setClientData(client);

      // Auto-pre-fill Background from client data
      let backgroundText = '';
      if (client) {
        backgroundText = `Medical History: ${Array.isArray(client.medicalConditions) ? client.medicalConditions.join(', ') : client.medicalConditions || 'None recorded'}\n`;
        backgroundText += `Allergies: ${Array.isArray(client.allergies) ? client.allergies.join(', ') : client.allergies || 'None recorded'}\n`;
        backgroundText += `Blood Type: ${client.bloodType || 'N/A'}`;
      }

      // Auto-pre-fill Assessment from latest vitals
      let assessmentText = '';
      if (recentV.length > 0) {
        const latest = recentV[0];
        assessmentText = `Latest Vitals (${new Date(latest.recordedAt).toLocaleString()}):\n`;
        if (latest.temperature) assessmentText += `Temp: ${latest.temperature}${latest.temperatureUnit || '°F'}, `;
        if (latest.heartRate) assessmentText += `HR: ${latest.heartRate} bpm, `;
        if (latest.bloodPressureSystolic) assessmentText += `BP: ${latest.bloodPressureSystolic}/${latest.bloodPressureDiastolic} mmHg, `;
        if (latest.oxygenSaturation) assessmentText += `SpO2: ${latest.oxygenSaturation}%`;
      }

      setFormData(prev => ({
        ...prev,
        background: backgroundText,
        assessment: assessmentText,
        // Pre-fill care activities from completed tasks
        careActivities: activeT.filter(t => t.status === 'completed').map(t => t.title || t.description),
      }));

    } catch (error) {
      console.error('Error loading shift data:', error);
      toast.error('Failed to load recent data for the report');
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddObservation = () => {
    if (!newObservation.description.trim()) {
      toast.warn('Please provide an observation description');
      return;
    }

    setFormData(prev => ({
      ...prev,
      codedObservations: [...prev.codedObservations, { ...newObservation, id: Date.now() }]
    }));

    setNewObservation({
      code: 'green',
      category: 'General',
      description: ''
    });
  };

  const removeObservation = (id) => {
    setFormData(prev => ({
      ...prev,
      codedObservations: prev.codedObservations.filter(o => o.id !== id)
    }));
  };

  const getHighestPriorityCode = () => {
    const codes = formData.codedObservations.map(o => o.code);
    if (codes.includes('red')) return 'red';
    if (codes.includes('orange')) return 'orange';
    if (codes.includes('yellow')) return 'yellow';
    return 'green';
  };

  const generateAndSaveReport = async () => {
    // Validation
    if (!formData.situation.trim()) {
      toast.error('Please provide a Situation summary');
      return;
    }
    if (formData.codedObservations.length === 0) {
      toast.error('Please add at least one coded observation');
      return;
    }
    if (!formData.isSigned) {
      toast.error('Please sign the report to confirm accuracy');
      return;
    }

    setLoading(true);
    
    try {
      const priorityCode = getHighestPriorityCode();
      
      // Clinical Accountability Signature
      const signatureData = {
        signedByName: nurseName,
        signedById: nurseId,
        timestamp: new Date().toISOString(),
        isElectronic: true,
        summaryHash: btoa(formData.situation + formData.assessment).substring(0, 16) // simple content hash
      };

      const reportData = {
        patient_id: clientId,
        client_name: clientName,
        nurse_id: nurseId,
        nurse_name: nurseName,
        institution_id: institutionId,
        
        // SBAR Structure
        situation: formData.situation,
        background: formData.background,
        assessment: formData.assessment,
        recommendation: formData.recommendation,
        
        // Coded Observations & Priority
        coded_observations: formData.codedObservations,
        priority_code: priorityCode,
        
        // NEWS Score Integration
        news_score: formData.newsScore,
        news_data: formData.newsData,
        
        // Clinical Accountability
        signature_data: signatureData,
        
        // Feedback Loop initial state
        feedback_status: 'pending',
        
        // Physical Assessment
        patient_condition: formData.patientCondition,
        mental_status: formData.mentalStatus,
        mobility_status: formData.mobilityStatus,
        nutrition_status: formData.nutritionStatus,
        general_appearance: formData.generalAppearance.trim(),
        skin_condition: formData.skinCondition,
        pain_level: parseInt(formData.painLevel) || 0,
        pain_location: formData.painLocation.trim(),
        pain_description: formData.painDescription.trim(),
        
        // Detailed data
        care_activities: formData.careActivities,
        medications_given: formData.verifiedMedications, // use the checklist
        treatments_provided: formData.treatmentsProvided,
        photos: formData.photos,
        
        // Legacy support / Summaries
        vital_signs_summary: { summary: formData.assessment, latestVitals: recentVitals[0] },
        care_logs_summary: { activities: formData.careActivities, shift: formData.shift },
        
        report_type: formData.reportType,
        shift_start: formData.shift,
        status: 'active',
        follow_up_required: formData.followUpRequired,
        follow_up_notes: formData.followUpNotes,
        metadata: {
          additionalNotes: formData.additionalNotes,
          highestPriorityCode: priorityCode,
          generatedAt: new Date().toISOString()
        }
      };

      await createNurseReport(reportData);
      
      toast.success(`Nurse report saved with ${priorityCode.toUpperCase()} priority alert.`);
      
      if (onSave) {
        onSave(reportData);
      }
      
    } catch (error) {
      console.error('Error saving nurse report:', error);
      toast.error('Failed to save nurse report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (field, item) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(a => a !== item)
        : [...prev[field], item]
    }));
  };

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
        <div className="bg-white p-8 rounded-xl shadow-xl flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
          <p className="text-gray-600">Gathering shift data and client history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="p-3 sm:p-6 border-b border-gray-200 bg-white sticky top-0 z-20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-xl font-bold text-gray-900 truncate">Advanced Nurse Clinical Report</h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs sm:text-sm text-gray-600">
                  <span className="flex items-center gap-1"><User size={14}/> {clientName}</span>
                  <span className="flex items-center gap-1"><Clock size={14}/> Shift: {shifts.find(s => s.value === formData.shift)?.label.split('(')[0]}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                type="button"
                onClick={generateAndSaveReport}
                disabled={loading}
                className="px-3 sm:px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center disabled:opacity-50 font-semibold shadow-sm text-xs sm:text-sm whitespace-nowrap"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-1 sm:mr-2" />
                )}
                <span className="hidden sm:inline">Finalize & Dispatch</span>
                <span className="sm:hidden">Dispatch</span>
              </button>
              <button
                onClick={onCancel}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          <GlobalAllergyAlert patient={clientData} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
            
            {/* Left Column: SBAR Structure (2/3 width on large screens) */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* SBAR Section */}
              <div className="bg-blue-50 rounded-2xl p-4 sm:p-6 border border-blue-100 space-y-4 sm:space-y-6">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="text-blue-600" size={20} />
                    <h3 className="text-lg font-bold text-blue-900 uppercase tracking-wider">SBAR Clinical Framework</h3>
                  </div>
                  {formData.newsData && (
                    <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 shadow-sm ${formData.newsData.color === 'red' ? 'bg-red-50 border-red-200 text-red-700' : formData.newsData.color === 'orange' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                      <AlertTriangle size={16} />
                      <span className="text-xs font-bold uppercase tracking-tight">NEWS Score: {formData.newsScore} ({formData.newsData.risk.toUpperCase()} RISK)</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-blue-700 uppercase">S - Situation (Current Status) *</label>
                      <button 
                        type="button"
                        onClick={() => startSpeechRecognition('situation')}
                        className={`p-1.5 rounded-lg transition ${activeVoiceField === 'situation' ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-blue-100 text-blue-600'}`}
                      >
                        {activeVoiceField === 'situation' ? <MicOff size={16} /> : <Mic size={16} />}
                      </button>
                    </div>
                    <textarea
                      value={formData.situation}
                      onChange={(e) => setFormData(prev => ({ ...prev, situation: e.target.value }))}
                      placeholder="Briefly describe the current situation..."
                      className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                      required
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-blue-700 uppercase">B - Background (History)</label>
                      <button 
                        type="button"
                        onClick={() => startSpeechRecognition('background')}
                        className={`p-1.5 rounded-lg transition ${activeVoiceField === 'background' ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-blue-100 text-blue-600'}`}
                      >
                        {activeVoiceField === 'background' ? <MicOff size={16} /> : <Mic size={16} />}
                      </button>
                    </div>
                    <textarea
                      value={formData.background}
                      onChange={(e) => setFormData(prev => ({ ...prev, background: e.target.value }))}
                      placeholder="Medical history, allergies, relevant context..."
                      className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-blue-700 uppercase">A - Assessment (Vitals & Findings)</label>
                      <button 
                        type="button"
                        onClick={() => startSpeechRecognition('assessment')}
                        className={`p-1.5 rounded-lg transition ${activeVoiceField === 'assessment' ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-blue-100 text-blue-600'}`}
                      >
                        {activeVoiceField === 'assessment' ? <MicOff size={16} /> : <Mic size={16} />}
                      </button>
                    </div>
                    <textarea
                      value={formData.assessment}
                      onChange={(e) => setFormData(prev => ({ ...prev, assessment: e.target.value }))}
                      placeholder="Physical assessment and vital signs summary..."
                      className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-blue-700 uppercase">R - Recommendation (Plan)</label>
                      <button 
                        type="button"
                        onClick={() => startSpeechRecognition('recommendation')}
                        className={`p-1.5 rounded-lg transition ${activeVoiceField === 'recommendation' ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-blue-100 text-blue-600'}`}
                      >
                        {activeVoiceField === 'recommendation' ? <MicOff size={16} /> : <Mic size={16} />}
                      </button>
                    </div>
                    <textarea
                      value={formData.recommendation}
                      onChange={(e) => setFormData(prev => ({ ...prev, recommendation: e.target.value }))}
                      placeholder="What do you recommend for the next shift or for the Doctor?"
                      className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    />
                  </div>
                </div>
              </div>

              {/* Coded Observations Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <AlertOctagon className="text-red-600" size={20} />
                    Coded Clinical Observations
                  </h3>
                  <div className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                    Highest Priority: {getHighestPriorityCode().toUpperCase()}
                  </div>
                </div>

                {/* Add Observation Form */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-1">
                    <select
                      value={newObservation.code}
                      onChange={(e) => setNewObservation(prev => ({ ...prev, code: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      {OBSERVATION_CODES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      placeholder="Observation description..."
                      value={newObservation.description}
                      onChange={(e) => setNewObservation(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <button
                    onClick={handleAddObservation}
                    className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 hover:bg-black transition"
                  >
                    <Plus size={16} /> Add Code
                  </button>
                </div>

                {/* Observations List */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {formData.codedObservations.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
                      No coded observations added yet. Add critical findings here.
                    </div>
                  ) : (
                    formData.codedObservations.map(obs => {
                      const config = OBSERVATION_CODES.find(c => c.value === obs.code);
                      return (
                        <div key={obs.id} className={`${config.bg} p-4 rounded-xl flex items-start justify-between group border border-black/5 shadow-sm`}>
                          <div className="flex gap-3">
                            <div className={`mt-1 p-1 rounded-full ${config.color} bg-white shadow-sm`}>
                              <AlertTriangle size={14} />
                            </div>
                            <div>
                              <div className={`text-[10px] font-bold uppercase tracking-widest ${config.color}`}>
                                {config.label}
                              </div>
                              <p className="text-sm font-medium text-gray-800 mt-1">{obs.description}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeObservation(obs.id)}
                            className="text-gray-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Photo Documentation Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Camera className="text-orange-600" size={20} />
                  Clinical Photo Documentation
                </h3>
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 sm:p-6">
                  <div className="flex flex-wrap gap-4 mb-4">
                    {formData.photos.map((p, i) => (
                      <div key={i} className="relative group">
                        <img src={p} alt="Documentation" className="h-24 w-24 object-cover rounded-xl shadow-md border-2 border-white" />
                        <button 
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, photos: prev.photos.filter((_, idx) => idx !== i) }))}
                          className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <label className="h-24 w-24 flex flex-col items-center justify-center border-2 border-dashed border-orange-300 rounded-xl bg-white hover:bg-orange-100 cursor-pointer transition text-orange-600">
                      <Plus size={24} />
                      <span className="text-[10px] font-bold uppercase mt-1">Add Photo</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setFormData(prev => ({ ...prev, photos: [...prev.photos, reader.result] }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <p className="text-[11px] text-orange-700 italic flex items-center gap-1">
                     <ImageIcon size={10}/> Capturing wounds, rashes, or safety concerns improves clinical assessment.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Dynamic Activities & Assessment (1/3 width) */}
            <div className="space-y-6">
              
              {/* Type, Shift, Shift Status */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Report Type</label>
                  <select
                    value={formData.reportType}
                    onChange={(e) => setFormData(prev => ({ ...prev, reportType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                  >
                    {reportTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Patient General Condition</label>
                  <select
                    value={formData.patientCondition}
                    onChange={(e) => setFormData(prev => ({ ...prev, patientCondition: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold"
                    style={{ color: patientConditions.find(c => c.value === formData.patientCondition)?.color }}
                  >
                    {patientConditions.map(condition => (
                      <option key={condition.value} value={condition.value}>{condition.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Activities List */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="text-green-500" size={16} />
                  Care Activities Completed
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-sm">
                  {activeTasks.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No care tasks found for this shift.</p>
                  ) : (
                    activeTasks.map(task => (
                      <label key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition">
                        <input
                          type="checkbox"
                          checked={formData.careActivities.includes(task.title || task.description)}
                          onChange={() => handleToggle('careActivities', task.title || task.description)}
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="text-xs text-gray-700 font-medium">{task.title || task.description}</span>
                      </label>
                    ))
                  )}
                </div>

                {/* Medication Reconciliation Checklist */}
                {formData.careActivities.some(a => a.toLowerCase().includes('medication')) && clientData?.medications && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 animate-in fade-in zoom-in-95 duration-300">
                    <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Shield size={12}/> Medication Reconciliation
                    </h4>
                    <div className="space-y-2">
                      {(Array.isArray(clientData.medications) ? clientData.medications : (clientData.medications || '').split(',')).map((med, idx) => (
                        <label key={idx} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-blue-100 cursor-pointer hover:border-blue-300 transition">
                          <input
                            type="checkbox"
                            checked={formData.verifiedMedications.includes(med.trim())}
                            onChange={() => handleToggle('verifiedMedications', med.trim())}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-[11px] font-bold text-gray-700">{med.trim()}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Manual Add Field for Activities if needed */}
                <div className="mt-3 flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Other activity..."
                    className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-md"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        handleToggle('careActivities', e.target.value.trim());
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>

              {/* Physical Assessment Mini-Forms */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Activity className="text-red-500" size={16} />
                  Physical Assessment
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase">Mental Status</label>
                    <select
                      value={formData.mentalStatus}
                      onChange={(e) => setFormData(prev => ({ ...prev, mentalStatus: e.target.value }))}
                      className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md"
                    >
                      {mentalStatusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase">Mobility</label>
                    <select
                      value={formData.mobilityStatus}
                      onChange={(e) => setFormData(prev => ({ ...prev, mobilityStatus: e.target.value }))}
                      className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md"
                    >
                      {mobilityStatusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Pain Assessment (0-10)</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range" min="0" max="10"
                      value={formData.painLevel || 0}
                      onChange={(e) => setFormData(prev => ({ ...prev, painLevel: e.target.value }))}
                      className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                    />
                    <span className={`text-sm font-bold ${formData.painLevel > 6 ? 'text-red-600' : 'text-gray-700'}`}>{formData.painLevel || 0}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">General Appearance</label>
                  <textarea
                    value={formData.generalAppearance}
                    onChange={(e) => setFormData(prev => ({ ...prev, generalAppearance: e.target.value }))}
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl"
                    rows={2}
                  />
                </div>
              </div>

              {/* Follow-up Required */}
              <div className={`p-4 rounded-2xl border transition-colors ${formData.followUpRequired ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.followUpRequired}
                    onChange={(e) => setFormData(prev => ({ ...prev, followUpRequired: e.target.checked }))}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm font-bold text-gray-700">Follow-up Required</span>
                </label>
                {formData.followUpRequired && (
                  <textarea
                    value={formData.followUpNotes}
                    onChange={(e) => setFormData(prev => ({ ...prev, followUpNotes: e.target.value }))}
                    placeholder="Required follow-up actions..."
                    className="mt-2 w-full text-xs px-3 py-2 border border-orange-200 rounded-lg bg-white"
                    rows={2}
                  />
                )}
              </div>

              {/* Digital Signature */}
              <div className={`p-5 rounded-2xl border transition-all ${formData.isSigned ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200 animate-pulse-slow'}`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="mt-1">
                    <input
                      type="checkbox"
                      checked={formData.isSigned}
                      onChange={(e) => setFormData(prev => ({ ...prev, isSigned: e.target.checked }))}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500 h-5 w-5"
                    />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <PenTool size={16} className={formData.isSigned ? 'text-green-600' : 'text-orange-600'} />
                      Digital Clinical Attestation
                    </span>
                    <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                      I, <strong>{nurseName}</strong>, attest that the information provided in this report is accurate to the best of my knowledge and represents a true record of the care provided and observations made during my shift. 
                      {formData.isSigned && <span className="block mt-1 text-green-700 font-bold flex items-center gap-1"><Lock size={10}/> Digitally signed on {new Date().toLocaleDateString()}</span>}
                    </p>
                  </div>
                </label>
              </div>

            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-6 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-gray-500 italic hidden sm:block">
            * This report will be dispatched to the primary doctor and system administrators immediately.
          </p>
          <div className="flex gap-3 sm:gap-4">
            <button
              onClick={onCancel}
              className="flex-1 sm:flex-none px-6 py-2.5 text-gray-600 font-bold hover:text-gray-900 transition text-sm sm:text-base"
            >
              Discard
            </button>
            <button
              onClick={generateAndSaveReport}
              disabled={loading}
              className="flex-1 sm:flex-none px-6 sm:px-8 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition font-bold shadow-lg shadow-orange-200 disabled:opacity-50 text-sm sm:text-base whitespace-nowrap"
            >
              Finalize & Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NurseReportGenerator;
