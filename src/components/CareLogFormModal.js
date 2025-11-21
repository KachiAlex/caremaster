import React, { useState } from 'react';
import { 
  X, CheckCircle, FileText, Clock, Calendar, 
  User, Heart, Utensils, Activity, Eye, 
  ChevronDown, ChevronUp, AlertTriangle,
  Thermometer, Droplets, Brain, Shield
} from 'lucide-react';

const CareLogFormModal = ({ 
  client, 
  caregiver, 
  institutionId,
  roleType, // 'doctor', 'nurse', 'caregiver'
  onSave, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    // Basic Information
    logDate: new Date().toISOString().split('T')[0],
    logTime: new Date().toTimeString().slice(0, 5),
    
    // Care Activities
    hygienePractices: [],
    hygieneOther: '',
    activityDescription: '',
    
    // Food & Nutrition
    mealType: '',
    foodDetails: '',
    foodPercentage: '',
    
    // Medications
    medicationsGiven: '',
    medicationDetails: '',
    
    // Mobility & Support
    mobilitySupport: '',
    speechPractice: '',
    speechAttempts: [],
    speechActivities: '',
    speechPrompts: [],
    speechProgress: '',
    speechChallenges: '',
    
    // Mood & Behavior
    moodBehavior: '',
    moodDescription: '',
    
    // Physical Functions
    defecationCount: '',
    fecesType: '',
    fecesDescription: '',
    fecesPercentage: '',
    urinationCount: '',
    briefChanges: '',
    
    // Vital Signs (Doctor/Nurse only)
    bloodPressure: '',
    temperature: '',
    
    // Skin & Physical
    skinCondition: '',
    skinDescription: '',
    appetite: '',
    painLevel: '',
    
    // Safety & Incidents
    fallIncident: '',
    incidentDescription: '',
    
    // Overall Assessment
    observations: '',
    concerns: '',
    recommendations: ''
  });

  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    care: true,
    nutrition: false,
    medications: false,
    mobility: false,
    mood: false,
    physical: false,
    vitals: roleType === 'doctor' || roleType === 'nurse',
    safety: false,
    assessment: false
  });

  const [validationErrors, setValidationErrors] = useState({});

  // Helper functions
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleCheckboxChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const validateForm = () => {
    const errors = {};
    
    // Required fields validation
    if (!formData.logDate) errors.logDate = 'Date is required';
    if (!formData.logTime) errors.logTime = 'Time is required';
    if (!formData.activityDescription.trim()) errors.activityDescription = 'Activity description is required';
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const careLogPayload = {
        clientId: client.id,
        clientName: client.name || client.fullName,
        caregiverId: caregiver.uid,
        caregiverName: caregiver.name,
        institutionId: institutionId,
        roleType: roleType,
        logDate: new Date(formData.logDate),
        logTime: formData.logTime,
        
        // Care Activities
        hygienePractices: formData.hygienePractices,
        hygieneOther: formData.hygieneOther,
        activityDescription: formData.activityDescription,
        
        // Food & Nutrition
        mealType: formData.mealType,
        foodDetails: formData.foodDetails,
        foodPercentage: formData.foodPercentage,
        
        // Medications
        medicationsGiven: formData.medicationsGiven,
        medicationDetails: formData.medicationDetails,
        
        // Mobility & Support
        mobilitySupport: formData.mobilitySupport,
        speechPractice: formData.speechPractice,
        speechAttempts: formData.speechAttempts,
        speechActivities: formData.speechActivities,
        speechPrompts: formData.speechPrompts,
        speechProgress: formData.speechProgress,
        speechChallenges: formData.speechChallenges,
        
        // Mood & Behavior
        moodBehavior: formData.moodBehavior,
        moodDescription: formData.moodDescription,
        
        // Physical Functions
        defecationCount: formData.defecationCount,
        fecesType: formData.fecesType,
        fecesDescription: formData.fecesDescription,
        fecesPercentage: formData.fecesPercentage,
        urinationCount: formData.urinationCount,
        briefChanges: formData.briefChanges,
        
        // Vital Signs
        bloodPressure: formData.bloodPressure,
        temperature: formData.temperature,
        
        // Skin & Physical
        skinCondition: formData.skinCondition,
        skinDescription: formData.skinDescription,
        appetite: formData.appetite,
        painLevel: formData.painLevel,
        
        // Safety & Incidents
        fallIncident: formData.fallIncident,
        incidentDescription: formData.incidentDescription,
        
        // Overall Assessment
        observations: formData.observations,
        concerns: formData.concerns,
        recommendations: formData.recommendations
      };

      await onSave(careLogPayload);
    } catch (error) {
      console.error('Error in handleSave:', error);
      alert('Failed to save care log: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getRoleTitle = () => {
    switch (roleType) {
      case 'doctor': return 'Doctor Care Log';
      case 'nurse': return 'Nurse Care Log';
      case 'caregiver': return 'Caregiver Activity Log';
      default: return 'Care Log';
    }
  };

  const getRoleColor = () => {
    switch (roleType) {
      case 'doctor': return 'from-blue-600 to-blue-600';
      case 'nurse': return 'from-red-600 to-blue-600';
      case 'caregiver': return 'from-blue-600 to-blue-600';
      default: return 'from-gray-600 to-gray-700';
    }
  };

  // Form Section Component
  const FormSection = ({ title, icon: Icon, section, children, required = false }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => toggleSection(section)}
        className={`w-full px-6 py-4 flex items-center justify-between transition-colors ${
          expandedSections[section] 
            ? 'bg-gradient-to-r from-blue-600 to-blue-600 text-white' 
            : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
        }`}
      >
        <div className="flex items-center space-x-3">
          <Icon className={`h-5 w-5 ${expandedSections[section] ? 'text-white' : 'text-gray-500'}`} />
          <h3 className="text-lg font-semibold">{title}</h3>
          {required && (
            <span className={`text-xs px-2 py-1 rounded-full ${
              expandedSections[section] 
                ? 'bg-white/20 text-white' 
                : 'bg-red-100 text-red-600'
            }`}>
              Required
            </span>
          )}
        </div>
        {expandedSections[section] ? (
          <ChevronUp className="h-5 w-5 text-white" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        )}
      </button>
      
      {expandedSections[section] && (
        <div className="p-6 space-y-4">
          {children}
        </div>
      )}
    </div>
  );

  // Input Field Component
  const InputField = ({ label, type = "text", value, onChange, placeholder, required = false, error, ...props }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
          rows={3}
          {...props}
        />
      ) : type === 'select' ? (
        <select
          value={value}
          onChange={onChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
          {...props}
        >
          <option value="">Select an option</option>
          {props.options?.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : type === 'checkbox' ? (
        <div className="space-y-2">
          {props.options?.map(option => (
            <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={value.includes(option.value)}
                onChange={() => handleCheckboxChange(props.field, option.value)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      ) : type === 'radio' ? (
        <div className="grid grid-cols-11 gap-2">
          {Array.from({ length: 11 }, (_, i) => (
            <label key={i} className="flex flex-col items-center space-y-2 cursor-pointer">
              <span className="text-sm font-medium text-gray-700">{i}</span>
              <input
                type="radio"
                name={props.name}
                value={i.toString()}
                checked={value === i.toString()}
                onChange={onChange}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
            </label>
          ))}
        </div>
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
          {...props}
        />
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden">
        {/* Modal Header */}
        <div className={`bg-gradient-to-r ${getRoleColor()} px-6 py-4 flex items-center justify-between`}>
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">{getRoleTitle()}</h2>
              <p className="text-white text-opacity-90">For: {client.name || client.fullName}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-100 px-6 py-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Care Log Progress</span>
            <span>Fill out the sections below</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
          <div className="space-y-4">
            {/* Basic Information */}
            <FormSection 
              title="Basic Information" 
              icon={Calendar} 
              section="basic" 
              required={true}
            >
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Date of Care"
                  type="date"
                  value={formData.logDate}
                  onChange={(e) => setFormData({...formData, logDate: e.target.value})}
                  required={true}
                  error={validationErrors.logDate}
                />
                <InputField
                  label="Time of Care"
                  type="time"
                  value={formData.logTime}
                  onChange={(e) => setFormData({...formData, logTime: e.target.value})}
                  required={true}
                  error={validationErrors.logTime}
                />
              </div>
            </FormSection>

            {/* Care Activities */}
            <FormSection 
              title="Care Activities" 
              icon={Activity} 
              section="care" 
              required={true}
            >
              <InputField
                label="Hygiene Practices Done"
                type="checkbox"
                value={formData.hygienePractices}
                field="hygienePractices"
                options={[
                  { value: 'bathing', label: 'Bathing' },
                  { value: 'oral_care', label: 'Oral Care' },
                  { value: 'dressing', label: 'Dressing' },
                  { value: 'other', label: 'Other' }
                ]}
              />
              {formData.hygienePractices.includes('other') && (
                <InputField
                  label="Other Hygiene Practice"
                  value={formData.hygieneOther}
                  onChange={(e) => setFormData({...formData, hygieneOther: e.target.value})}
                  placeholder="Specify other hygiene practice"
                  required={true}
                />
              )}
              <InputField
                label="Explain Activities Done"
                type="textarea"
                value={formData.activityDescription}
                onChange={(e) => setFormData({...formData, activityDescription: e.target.value})}
                placeholder="Describe in detail what care activities were performed"
                required={true}
                error={validationErrors.activityDescription}
              />
            </FormSection>

            {/* Food & Nutrition */}
            <FormSection 
              title="Food & Nutrition" 
              icon={Utensils} 
              section="nutrition"
            >
              <InputField
                label="Meal Eaten"
                type="select"
                value={formData.mealType}
                onChange={(e) => setFormData({...formData, mealType: e.target.value})}
                options={[
                  { value: 'breakfast', label: 'Breakfast' },
                  { value: 'lunch', label: 'Lunch' },
                  { value: 'dinner', label: 'Dinner' },
                  { value: 'snack', label: 'Snack' },
                  { value: 'multiple', label: 'Multiple Meals' }
                ]}
              />
              <InputField
                label="Food Details"
                type="textarea"
                value={formData.foodDetails}
                onChange={(e) => setFormData({...formData, foodDetails: e.target.value})}
                placeholder="Describe what food was eaten"
              />
              <InputField
                label="Percentage of Food Eaten (0-10)"
                type="radio"
                value={formData.foodPercentage}
                onChange={(e) => setFormData({...formData, foodPercentage: e.target.value})}
                name="foodPercentage"
              />
            </FormSection>

            {/* Medications */}
            <FormSection 
              title="Medications" 
              icon={Shield} 
              section="medications"
            >
              <InputField
                label="Medications Given"
                type="select"
                value={formData.medicationsGiven}
                onChange={(e) => setFormData({...formData, medicationsGiven: e.target.value})}
                options={[
                  { value: 'yes', label: 'Yes' },
                  { value: 'no', label: 'No' },
                  { value: 'as_needed', label: 'As Needed' }
                ]}
              />
              <InputField
                label="Medication Details"
                type="textarea"
                value={formData.medicationDetails}
                onChange={(e) => setFormData({...formData, medicationDetails: e.target.value})}
                placeholder="List medications given, dosage, time, and any observations"
              />
            </FormSection>

            {/* Mobility & Support */}
            <FormSection 
              title="Mobility & Support" 
              icon={User} 
              section="mobility"
            >
              <InputField
                label="Mobility Support"
                type="select"
                value={formData.mobilitySupport}
                onChange={(e) => setFormData({...formData, mobilitySupport: e.target.value})}
                options={[
                  { value: 'independent', label: 'Independent' },
                  { value: 'minimal_assistance', label: 'Minimal Assistance' },
                  { value: 'moderate_assistance', label: 'Moderate Assistance' },
                  { value: 'maximum_assistance', label: 'Maximum Assistance' },
                  { value: 'dependent', label: 'Dependent' }
                ]}
              />
              <InputField
                label="Speech Practice Done"
                type="select"
                value={formData.speechPractice}
                onChange={(e) => setFormData({...formData, speechPractice: e.target.value})}
                options={[
                  { value: 'yes', label: 'Yes' },
                  { value: 'no', label: 'No' },
                  { value: 'partial', label: 'Partial' }
                ]}
              />
              <InputField
                label="Speech Attempts Made"
                type="checkbox"
                value={formData.speechAttempts}
                field="speechAttempts"
                options={[
                  { value: 'words', label: 'Words' },
                  { value: 'gestures', label: 'Gestures' },
                  { value: 'eye_contact', label: 'Eye Contact' },
                  { value: 'none', label: 'None' }
                ]}
              />
              <InputField
                label="Activities of Speech Practice"
                type="textarea"
                value={formData.speechActivities}
                onChange={(e) => setFormData({...formData, speechActivities: e.target.value})}
                placeholder="Describe speech practice activities performed"
              />
              <InputField
                label="Prompts Used"
                type="checkbox"
                value={formData.speechPrompts}
                field="speechPrompts"
                options={[
                  { value: 'verbal', label: 'Verbal' },
                  { value: 'visual', label: 'Visual' },
                  { value: 'hand_over_hand', label: 'Hand over Hand' },
                  { value: 'repetition', label: 'Repetition' }
                ]}
              />
              <InputField
                label="Progress"
                type="textarea"
                value={formData.speechProgress}
                onChange={(e) => setFormData({...formData, speechProgress: e.target.value})}
                placeholder="Describe progress made during speech practice"
              />
              <InputField
                label="Challenges"
                type="textarea"
                value={formData.speechChallenges}
                onChange={(e) => setFormData({...formData, speechChallenges: e.target.value})}
                placeholder="Note any challenges encountered"
              />
            </FormSection>

            {/* Mood & Behavior */}
            <FormSection 
              title="Mood & Behavior" 
              icon={Brain} 
              section="mood"
            >
              <InputField
                label="Mood/Behavior"
                type="select"
                value={formData.moodBehavior}
                onChange={(e) => setFormData({...formData, moodBehavior: e.target.value})}
                options={[
                  { value: 'happy', label: 'Happy/Content' },
                  { value: 'neutral', label: 'Neutral' },
                  { value: 'sad', label: 'Sad/Down' },
                  { value: 'anxious', label: 'Anxious/Worried' },
                  { value: 'agitated', label: 'Agitated/Restless' },
                  { value: 'confused', label: 'Confused' },
                  { value: 'other', label: 'Other' }
                ]}
              />
              <InputField
                label="Explain Client's Mood/Behavior"
                type="textarea"
                value={formData.moodDescription}
                onChange={(e) => setFormData({...formData, moodDescription: e.target.value})}
                placeholder="Provide detailed description of mood and behavior observed"
              />
            </FormSection>

            {/* Physical Functions */}
            <FormSection 
              title="Physical Functions" 
              icon={Droplets} 
              section="physical"
            >
              <InputField
                label="Number of Defecation"
                value={formData.defecationCount}
                onChange={(e) => setFormData({...formData, defecationCount: e.target.value})}
                placeholder="Enter number"
              />
              <InputField
                label="Form of Feces"
                type="select"
                value={formData.fecesType}
                onChange={(e) => setFormData({...formData, fecesType: e.target.value})}
                options={[
                  { value: 'normal', label: 'Normal' },
                  { value: 'hard', label: 'Hard' },
                  { value: 'soft', label: 'Soft' },
                  { value: 'liquid', label: 'Liquid' },
                  { value: 'constipated', label: 'Constipated' }
                ]}
              />
              <InputField
                label="Explain the Feces Type"
                type="textarea"
                value={formData.fecesDescription}
                onChange={(e) => setFormData({...formData, fecesDescription: e.target.value})}
                placeholder="Describe the consistency and appearance"
              />
              <InputField
                label="Percentage of Feces Passed (0-10)"
                type="radio"
                value={formData.fecesPercentage}
                onChange={(e) => setFormData({...formData, fecesPercentage: e.target.value})}
                name="fecesPercentage"
              />
              <InputField
                label="Number of Urination"
                value={formData.urinationCount}
                onChange={(e) => setFormData({...formData, urinationCount: e.target.value})}
                placeholder="Enter number"
              />
              <InputField
                label="Number of Brief Changes"
                value={formData.briefChanges}
                onChange={(e) => setFormData({...formData, briefChanges: e.target.value})}
                placeholder="Enter number"
              />
            </FormSection>

            {/* Vital Signs (Doctor/Nurse only) */}
            {(roleType === 'doctor' || roleType === 'nurse') && (
              <FormSection 
                title="Vital Signs" 
                icon={Thermometer} 
                section="vitals"
              >
                <InputField
                  label="Blood Pressure"
                  value={formData.bloodPressure}
                  onChange={(e) => setFormData({...formData, bloodPressure: e.target.value})}
                  placeholder="e.g., 120/80"
                />
                <InputField
                  label="Temperature"
                  value={formData.temperature}
                  onChange={(e) => setFormData({...formData, temperature: e.target.value})}
                  placeholder="e.g., 98.6°F"
                />
              </FormSection>
            )}

            {/* Skin & Physical Assessment */}
            <FormSection 
              title="Skin & Physical Assessment" 
              icon={Eye} 
              section="assessment"
            >
              <InputField
                label="Skin Condition"
                type="select"
                value={formData.skinCondition}
                onChange={(e) => setFormData({...formData, skinCondition: e.target.value})}
                options={[
                  { value: 'normal', label: 'Normal' },
                  { value: 'dry', label: 'Dry' },
                  { value: 'irritated', label: 'Irritated' },
                  { value: 'bruised', label: 'Bruised' },
                  { value: 'pressure_sore', label: 'Pressure Sore' },
                  { value: 'other', label: 'Other' }
                ]}
              />
              <InputField
                label="Explain Skin Condition in Detail"
                type="textarea"
                value={formData.skinDescription}
                onChange={(e) => setFormData({...formData, skinDescription: e.target.value})}
                placeholder="Describe skin condition, location, size, etc."
              />
              <InputField
                label="Appetite"
                type="select"
                value={formData.appetite}
                onChange={(e) => setFormData({...formData, appetite: e.target.value})}
                options={[
                  { value: 'excellent', label: 'Excellent' },
                  { value: 'good', label: 'Good' },
                  { value: 'fair', label: 'Fair' },
                  { value: 'poor', label: 'Poor' },
                  { value: 'none', label: 'None' }
                ]}
              />
              <InputField
                label="Pain Level (0-10)"
                type="radio"
                value={formData.painLevel}
                onChange={(e) => setFormData({...formData, painLevel: e.target.value})}
                name="painLevel"
              />
            </FormSection>

            {/* Safety & Incidents */}
            <FormSection 
              title="Safety & Incidents" 
              icon={AlertTriangle} 
              section="safety"
            >
              <InputField
                label="Fall/Incident?"
                type="select"
                value={formData.fallIncident}
                onChange={(e) => setFormData({...formData, fallIncident: e.target.value})}
                options={[
                  { value: 'no', label: 'No' },
                  { value: 'yes', label: 'Yes' },
                  { value: 'near_miss', label: 'Near Miss' }
                ]}
              />
              <InputField
                label="If Yes, Describe Incident and Follow-up"
                type="textarea"
                value={formData.incidentDescription}
                onChange={(e) => setFormData({...formData, incidentDescription: e.target.value})}
                placeholder="Describe what happened, actions taken, and follow-up care"
              />
            </FormSection>

            {/* Overall Assessment */}
            <FormSection 
              title="Overall Assessment" 
              icon={FileText} 
              section="assessment"
            >
              <InputField
                label="Observations/Concerns/Recommendations"
                type="textarea"
                value={formData.observations}
                onChange={(e) => setFormData({...formData, observations: e.target.value})}
                placeholder="Any additional observations, concerns, or recommendations for future care"
                rows={4}
              />
            </FormSection>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Care Log for:</span> {client.name || client.fullName}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onCancel}
              disabled={saving}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Care Log
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareLogFormModal;

