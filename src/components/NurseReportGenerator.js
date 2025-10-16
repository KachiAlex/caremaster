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
  Stethoscope
} from 'lucide-react';
import { toast } from 'react-toastify';
import { createNurseReport } from '../api/nurseReportsAPI';
import { getVitalSignsByPatient } from '../api/vitalSignsAPI';
import { getCareLogsByClient } from '../api/careLogsAPI';

const NurseReportGenerator = ({ patientId, patientName, nurseId, nurseName, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    // Patient Assessment
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
    
    // Vital Signs Summary
    vitalSignsSummary: '',
    vitalSignsConcerns: '',
    
    // Care Provided
    careActivities: [],
    medicationsGiven: [],
    treatmentsProvided: [],
    
    // Observations
    observations: '',
    concerns: '',
    improvements: '',
    
    // Recommendations
    recommendations: '',
    followUpRequired: false,
    followUpNotes: '',
    
    // Report Metadata
    reportType: 'routine_assessment',
    priority: 'normal',
    shift: 'day',
    
    // Additional Notes
    additionalNotes: ''
  });

  const [loading, setLoading] = useState(false);
  const [recentVitals, setRecentVitals] = useState([]);
  const [recentCareLogs, setRecentCareLogs] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

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

  const priorities = [
    { value: 'low', label: 'Low', color: 'green' },
    { value: 'normal', label: 'Normal', color: 'blue' },
    { value: 'high', label: 'High', color: 'orange' },
    { value: 'urgent', label: 'Urgent', color: 'red' }
  ];

  const shifts = [
    { value: 'day', label: 'Day Shift (7 AM - 3 PM)' },
    { value: 'evening', label: 'Evening Shift (3 PM - 11 PM)' },
    { value: 'night', label: 'Night Shift (11 PM - 7 AM)' }
  ];

  const commonCareActivities = [
    'Vital signs assessment',
    'Medication administration',
    'Wound care',
    'Mobility assistance',
    'Pain assessment',
    'Nutrition support',
    'Hygiene assistance',
    'Safety check',
    'Patient education',
    'Family communication',
    'Fall risk assessment',
    'Skin integrity check',
    'Medication compliance check'
  ];

  const commonTreatments = [
    'Wound dressing',
    'IV therapy',
    'Oxygen therapy',
    'Physical therapy',
    'Occupational therapy',
    'Respiratory therapy',
    'Pain management',
    'Fall prevention',
    'Pressure ulcer prevention',
    'Medication adjustment'
  ];

  useEffect(() => {
    loadRecentData();
  }, [patientId]);

  const loadRecentData = async () => {
    try {
      // Load recent vital signs
      const vitals = await getVitalSignsByPatient(patientId);
      setRecentVitals(vitals.slice(0, 5)); // Last 5 readings

      // Load recent care logs
      const logs = await getCareLogsByClient(patientId);
      setRecentCareLogs(logs.slice(0, 3)); // Last 3 logs
    } catch (error) {
      console.error('Error loading recent data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.observations.trim()) {
      toast.error('Please provide observations');
      return;
    }

    setLoading(true);
    
    try {
      const reportData = {
        patientId,
        patientName,
        nurseId,
        nurseName,
        
        // Patient Assessment
        patientCondition: formData.patientCondition,
        mentalStatus: formData.mentalStatus,
        mobilityStatus: formData.mobilityStatus,
        nutritionStatus: formData.nutritionStatus,
        
        // Physical Assessment
        generalAppearance: formData.generalAppearance.trim(),
        skinCondition: formData.skinCondition,
        painLevel: formData.painLevel,
        painLocation: formData.painLocation.trim(),
        painDescription: formData.painDescription.trim(),
        
        // Vital Signs Summary
        vitalSignsSummary: formData.vitalSignsSummary.trim(),
        vitalSignsConcerns: formData.vitalSignsConcerns.trim(),
        
        // Care Provided
        careActivities: formData.careActivities,
        medicationsGiven: formData.medicationsGiven,
        treatmentsProvided: formData.treatmentsProvided,
        
        // Observations
        observations: formData.observations.trim(),
        concerns: formData.concerns.trim(),
        improvements: formData.improvements.trim(),
        
        // Recommendations
        recommendations: formData.recommendations.trim(),
        followUpRequired: formData.followUpRequired,
        followUpNotes: formData.followUpNotes.trim(),
        
        // Report Metadata
        reportType: formData.reportType,
        priority: formData.priority,
        shift: formData.shift,
        
        // Additional Notes
        additionalNotes: formData.additionalNotes.trim(),
        
        // Status
        status: 'active',
        
        // Recent Data References
        recentVitals: recentVitals.map(v => ({
          id: v.id,
          type: v.type,
          value: v.value,
          unit: v.unit,
          recordedAt: v.recordedAt
        })),
        recentCareLogs: recentCareLogs.map(l => ({
          id: l.id,
          title: l.title,
          category: l.category,
          createdAt: l.createdAt
        }))
      };

      await createNurseReport(reportData);
      
      toast.success(`Nurse report generated successfully for ${patientName}`);
      
      if (onSave) {
        onSave(reportData);
      }
      
    } catch (error) {
      console.error('Error generating nurse report:', error);
      toast.error('Failed to generate nurse report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleActivityToggle = (activity) => {
    setFormData(prev => ({
      ...prev,
      careActivities: prev.careActivities.includes(activity)
        ? prev.careActivities.filter(a => a !== activity)
        : [...prev.careActivities, activity]
    }));
  };

  const handleTreatmentToggle = (treatment) => {
    setFormData(prev => ({
      ...prev,
      treatmentsProvided: prev.treatmentsProvided.includes(treatment)
        ? prev.treatmentsProvided.filter(t => t !== treatment)
        : [...prev.treatmentsProvided, treatment]
    }));
  };

  const generatePreview = () => {
    setShowPreview(true);
  };

  const exportReport = () => {
    // Generate a downloadable report
    const reportContent = `
NURSE REPORT
Patient: ${patientName}
Date: ${new Date().toLocaleDateString()}
Nurse: ${nurseName}
Shift: ${shifts.find(s => s.value === formData.shift)?.label}

PATIENT ASSESSMENT
Condition: ${patientConditions.find(c => c.value === formData.patientCondition)?.label}
Mental Status: ${mentalStatusOptions.find(m => m.value === formData.mentalStatus)?.label}
Mobility: ${mobilityStatusOptions.find(m => m.value === formData.mobilityStatus)?.label}
Nutrition: ${nutritionStatusOptions.find(n => n.value === formData.nutritionStatus)?.label}

PHYSICAL ASSESSMENT
General Appearance: ${formData.generalAppearance}
Skin Condition: ${formData.skinCondition}
Pain Level: ${formData.painLevel}/10
Pain Location: ${formData.painLocation}
Pain Description: ${formData.painDescription}

OBSERVATIONS
${formData.observations}

CONCERNS
${formData.concerns}

IMPROVEMENTS
${formData.improvements}

RECOMMENDATIONS
${formData.recommendations}

FOLLOW-UP REQUIRED: ${formData.followUpRequired ? 'Yes' : 'No'}
${formData.followUpNotes}

ADDITIONAL NOTES
${formData.additionalNotes}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nurse-report-${patientName}-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Generate Nurse Report</h2>
                <p className="text-sm text-gray-600">Patient: {patientName}</p>
                <p className="text-xs text-gray-500">Nurse: {nurseName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={generatePreview}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </button>
              <button
                onClick={onCancel}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Report Type & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                  <select
                    value={formData.reportType}
                    onChange={(e) => setFormData(prev => ({ ...prev, reportType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    {reportTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    {priorities.map(priority => (
                      <option key={priority.value} value={priority.value}>{priority.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Shift */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shift</label>
                <select
                  value={formData.shift}
                  onChange={(e) => setFormData(prev => ({ ...prev, shift: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {shifts.map(shift => (
                    <option key={shift.value} value={shift.value}>{shift.label}</option>
                  ))}
                </select>
              </div>

              {/* Patient Assessment */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <User className="h-5 w-5 text-blue-600 mr-2" />
                  Patient Assessment
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Patient Condition</label>
                    <select
                      value={formData.patientCondition}
                      onChange={(e) => setFormData(prev => ({ ...prev, patientCondition: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      {patientConditions.map(condition => (
                        <option key={condition.value} value={condition.value}>{condition.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mental Status</label>
                    <select
                      value={formData.mentalStatus}
                      onChange={(e) => setFormData(prev => ({ ...prev, mentalStatus: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      {mentalStatusOptions.map(status => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mobility Status</label>
                    <select
                      value={formData.mobilityStatus}
                      onChange={(e) => setFormData(prev => ({ ...prev, mobilityStatus: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      {mobilityStatusOptions.map(status => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nutrition Status</label>
                    <select
                      value={formData.nutritionStatus}
                      onChange={(e) => setFormData(prev => ({ ...prev, nutritionStatus: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      {nutritionStatusOptions.map(status => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Physical Assessment */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Activity className="h-5 w-5 text-red-600 mr-2" />
                  Physical Assessment
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">General Appearance</label>
                  <textarea
                    value={formData.generalAppearance}
                    onChange={(e) => setFormData(prev => ({ ...prev, generalAppearance: e.target.value }))}
                    placeholder="Describe patient's general appearance..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Skin Condition</label>
                  <select
                    value={formData.skinCondition}
                    onChange={(e) => setFormData(prev => ({ ...prev, skinCondition: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="dry">Dry</option>
                    <option value="rash">Rash Present</option>
                    <option value="pressure_areas">Pressure Areas</option>
                    <option value="wounds">Open Wounds</option>
                    <option value="bruising">Bruising</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pain Level</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={formData.painLevel}
                      onChange={(e) => setFormData(prev => ({ ...prev, painLevel: e.target.value }))}
                      placeholder="0-10"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pain Location</label>
                    <input
                      type="text"
                      value={formData.painLocation}
                      onChange={(e) => setFormData(prev => ({ ...prev, painLocation: e.target.value }))}
                      placeholder="Where is the pain located?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pain Description</label>
                  <textarea
                    value={formData.painDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, painDescription: e.target.value }))}
                    placeholder="Describe the pain characteristics..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Care Activities */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  Care Activities
                </h3>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  {commonCareActivities.map(activity => (
                    <label key={activity} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.careActivities.includes(activity)}
                        onChange={() => handleActivityToggle(activity)}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">{activity}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Treatments Provided */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Stethoscope className="h-5 w-5 text-blue-600 mr-2" />
                  Treatments Provided
                </h3>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  {commonTreatments.map(treatment => (
                    <label key={treatment} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.treatmentsProvided.includes(treatment)}
                        onChange={() => handleTreatmentToggle(treatment)}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">{treatment}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Observations */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observations *</label>
                <textarea
                  value={formData.observations}
                  onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                  placeholder="Detailed observations about the patient's condition, behavior, and responses..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>

              {/* Concerns */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Concerns</label>
                <textarea
                  value={formData.concerns}
                  onChange={(e) => setFormData(prev => ({ ...prev, concerns: e.target.value }))}
                  placeholder="Any concerns about the patient's condition or care..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Improvements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Improvements</label>
                <textarea
                  value={formData.improvements}
                  onChange={(e) => setFormData(prev => ({ ...prev, improvements: e.target.value }))}
                  placeholder="Any improvements noted in the patient's condition..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Recommendations */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recommendations</label>
                <textarea
                  value={formData.recommendations}
                  onChange={(e) => setFormData(prev => ({ ...prev, recommendations: e.target.value }))}
                  placeholder="Recommendations for continued care..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Follow-up */}
              <div>
                <label className="flex items-center space-x-2 mb-2">
                  <input
                    type="checkbox"
                    checked={formData.followUpRequired}
                    onChange={(e) => setFormData(prev => ({ ...prev, followUpRequired: e.target.checked }))}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Follow-up Required</span>
                </label>
                {formData.followUpRequired && (
                  <textarea
                    value={formData.followUpNotes}
                    onChange={(e) => setFormData(prev => ({ ...prev, followUpNotes: e.target.value }))}
                    placeholder="Details about required follow-up..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                )}
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                <textarea
                  value={formData.additionalNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
                  placeholder="Any additional notes or comments..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-between">
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={exportReport}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </button>
            </div>
            
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NurseReportGenerator;
