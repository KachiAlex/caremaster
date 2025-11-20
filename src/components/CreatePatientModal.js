import React, { useState } from 'react';
import { 
  X, 
  Heart, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  AlertCircle, 
  UserPlus,
  FileText,
  Pill,
  Activity,
  Save,
  Loader,
  CheckCircle
} from 'lucide-react';
import { createPatient } from '../api/patientsAPI';
import { useUser } from '../contexts/UserContext';
import { toast } from 'react-toastify';

const CreatePatientModal = ({ open, onClose, onSuccess }) => {
  const { userProfile, institutionId } = useUser();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [createdPatientId, setCreatedPatientId] = useState(null);
  
  const [formData, setFormData] = useState({
    // Personal Information
    name: '',
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    
    // Emergency Contact
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    
    // Medical Information
    medicalConditions: [],
    medications: [],
    allergies: [],
    bloodType: '',
    careLevel: 'basic',
    
    // Additional Information
    insuranceProvider: '',
    insurancePolicyNumber: '',
    primaryCarePhysician: '',
    physicianPhone: '',
    notes: ''
  });

  const [tempMedicalCondition, setTempMedicalCondition] = useState('');
  const [tempMedication, setTempMedication] = useState('');
  const [tempAllergy, setTempAllergy] = useState('');

  const careLevels = [
    { value: 'basic', label: 'Basic Care', description: 'Minimal assistance needed' },
    { value: 'intermediate', label: 'Intermediate Care', description: 'Moderate assistance required' },
    { value: 'advanced', label: 'Advanced Care', description: 'Significant medical support needed' },
    { value: 'critical', label: 'Critical Care', description: 'Intensive medical monitoring' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addMedicalCondition = () => {
    if (tempMedicalCondition.trim()) {
      setFormData(prev => ({
        ...prev,
        medicalConditions: [...prev.medicalConditions, tempMedicalCondition.trim()]
      }));
      setTempMedicalCondition('');
    }
  };

  const removeMedicalCondition = (index) => {
    setFormData(prev => ({
      ...prev,
      medicalConditions: prev.medicalConditions.filter((_, i) => i !== index)
    }));
  };

  const addMedication = () => {
    if (tempMedication.trim()) {
      setFormData(prev => ({
        ...prev,
        medications: [...prev.medications, tempMedication.trim()]
      }));
      setTempMedication('');
    }
  };

  const removeMedication = (index) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  const addAllergy = () => {
    if (tempAllergy.trim()) {
      setFormData(prev => ({
        ...prev,
        allergies: [...prev.allergies, tempAllergy.trim()]
      }));
      setTempAllergy('');
    }
  };

  const removeAllergy = (index) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.filter((_, i) => i !== index)
    }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          toast.error('Patient name is required');
          return false;
        }
        if (!formData.phone.trim()) {
          toast.error('Phone number is required');
          return false;
        }
        return true;
      case 2:
        if (!formData.emergencyContactName.trim()) {
          toast.error('Emergency contact name is required');
          return false;
        }
        if (!formData.emergencyContactPhone.trim()) {
          toast.error('Emergency contact phone is required');
          return false;
        }
        return true;
      case 3:
        // Medical information is optional but we'll validate if care level is set
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) {
      return;
    }

    setLoading(true);
    try {
      // Prepare patient data
      const patientData = {
        name: formData.name.trim(),
        fullName: formData.fullName.trim() || formData.name.trim(),
        email: formData.email.trim().toLowerCase() || null,
        phone: formData.phone.trim(),
        dateOfBirth: formData.dateOfBirth || null,
        gender: formData.gender || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        zipCode: formData.zipCode.trim() || null,
        emergencyContactName: formData.emergencyContactName.trim(),
        emergencyContactPhone: formData.emergencyContactPhone.trim(),
        emergencyContactRelationship: formData.emergencyContactRelationship.trim() || null,
        medicalConditions: formData.medicalConditions,
        medications: formData.medications,
        allergies: formData.allergies,
        bloodType: formData.bloodType || null,
        careLevel: formData.careLevel,
        insuranceProvider: formData.insuranceProvider.trim() || null,
        insurancePolicyNumber: formData.insurancePolicyNumber.trim() || null,
        primaryCarePhysician: formData.primaryCarePhysician.trim() || null,
        physicianPhone: formData.physicianPhone.trim() || null,
        notes: formData.notes.trim() || null,
        institutionId: institutionId || userProfile?.institutionId,
        userType: 'patient',
        type: 'patient',
        status: 'active'
      };

      const result = await createPatient(patientData, userProfile);
      setCreatedPatientId(result.patientId);
      
      toast.success(
        <div>
          <div className="font-semibold">Patient registered successfully!</div>
          <div className="text-sm mt-1">
            Patient ID: <span className="font-mono font-bold text-emerald-400">{result.patientId}</span>
          </div>
        </div>,
        { autoClose: 5000 }
      );

      // Reset form
      setFormData({
        name: '',
        fullName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelationship: '',
        medicalConditions: [],
        medications: [],
        allergies: [],
        bloodType: '',
        careLevel: 'basic',
        insuranceProvider: '',
        insurancePolicyNumber: '',
        primaryCarePhysician: '',
        physicianPhone: '',
        notes: ''
      });
      setCurrentStep(1);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      // Close modal after a short delay to show success message
      setTimeout(() => {
        onClose();
        setCreatedPatientId(null);
      }, 2000);
    } catch (error) {
      console.error('Error creating patient:', error);
      toast.error(`Failed to create patient: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-3 text-sm text-slate-50 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors";
  const labelClass = "block text-sm font-medium text-slate-300 mb-1.5";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-3xl border border-slate-800/80 bg-slate-950/90 backdrop-blur-sm shadow-2xl shadow-black/60 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/60 px-6 py-4 bg-gradient-to-r from-emerald-600/20 to-sky-600/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg">
              <Heart className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-50">Register New Patient</h3>
              <p className="text-xs text-slate-400">Step {currentStep} of 3</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-400 hover:border-emerald-400/60 hover:text-emerald-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-slate-800/60 bg-slate-900/40">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <React.Fragment key={step}>
                <div className="flex items-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    currentStep >= step 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-800 text-slate-400'
                  } transition-colors`}>
                    {currentStep > step ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <span className="text-sm font-semibold">{step}</span>
                    )}
                  </div>
                  <span className={`ml-2 text-xs font-medium ${
                    currentStep >= step ? 'text-emerald-300' : 'text-slate-400'
                  }`}>
                    {step === 1 ? 'Personal Info' : step === 2 ? 'Emergency Contact' : 'Medical Info'}
                  </span>
                </div>
                {step < 3 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    currentStep > step ? 'bg-emerald-600' : 'bg-slate-800'
                  } transition-colors`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {createdPatientId ? (
            <div className="text-center py-8">
              <div className="flex items-center justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600/20">
                  <CheckCircle className="h-8 w-8 text-emerald-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-slate-50 mb-2">Patient Registered Successfully!</h3>
              <p className="text-sm text-slate-400 mb-1">Registration Number</p>
              <div className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600/20 to-sky-600/20 border-2 border-emerald-500/50 mb-4">
                <span className="font-mono font-bold text-emerald-300 text-2xl tracking-wider">{createdPatientId}</span>
              </div>
              <p className="text-xs text-slate-400 mt-4 max-w-md mx-auto">
                This registration number will be used to identify the patient throughout the system. 
                All activities will be logged with this number.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Personal Information */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="h-5 w-5 text-emerald-400" />
                    <h4 className="text-base font-semibold text-slate-50">Personal Information</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Full Name *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          className={`${inputClass} pl-10`}
                          placeholder="Enter patient's full name"
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className={`${inputClass} pl-10`}
                          placeholder="patient@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Phone Number *</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          required
                          className={`${inputClass} pl-10`}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Date of Birth</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                          type="date"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleInputChange}
                          className={`${inputClass} pl-10`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Gender</label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className={inputClass}
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer-not-to-say">Prefer not to say</option>
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Blood Type</label>
                      <select
                        name="bloodType"
                        value={formData.bloodType}
                        onChange={handleInputChange}
                        className={inputClass}
                      >
                        <option value="">Unknown</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className={`${inputClass} pl-10`}
                        placeholder="Street address"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>City</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className={inputClass}
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>State</label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className={inputClass}
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>ZIP Code</label>
                      <input
                        type="text"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        className={inputClass}
                        placeholder="ZIP"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Emergency Contact */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="h-5 w-5 text-amber-400" />
                    <h4 className="text-base font-semibold text-slate-50">Emergency Contact Information</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Contact Name *</label>
                      <input
                        type="text"
                        name="emergencyContactName"
                        value={formData.emergencyContactName}
                        onChange={handleInputChange}
                        required
                        className={inputClass}
                        placeholder="Full name"
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Contact Phone *</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                          type="tel"
                          name="emergencyContactPhone"
                          value={formData.emergencyContactPhone}
                          onChange={handleInputChange}
                          required
                          className={`${inputClass} pl-10`}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className={labelClass}>Relationship</label>
                      <select
                        name="emergencyContactRelationship"
                        value={formData.emergencyContactRelationship}
                        onChange={handleInputChange}
                        className={inputClass}
                      >
                        <option value="">Select relationship</option>
                        <option value="spouse">Spouse</option>
                        <option value="child">Child</option>
                        <option value="parent">Parent</option>
                        <option value="sibling">Sibling</option>
                        <option value="friend">Friend</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Medical Information */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="h-5 w-5 text-sky-400" />
                    <h4 className="text-base font-semibold text-slate-50">Medical Information</h4>
                  </div>

                  <div>
                    <label className={labelClass}>Care Level</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {careLevels.map((level) => (
                        <label
                          key={level.value}
                          className={`relative flex cursor-pointer rounded-xl border p-4 transition-colors ${
                            formData.careLevel === level.value
                              ? 'border-emerald-500/50 bg-emerald-600/10'
                              : 'border-slate-700/60 bg-slate-900/60 hover:border-slate-600'
                          }`}
                        >
                          <input
                            type="radio"
                            name="careLevel"
                            value={level.value}
                            checked={formData.careLevel === level.value}
                            onChange={handleInputChange}
                            className="sr-only"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-slate-50">{level.label}</div>
                            <div className="text-xs text-slate-400 mt-1">{level.description}</div>
                          </div>
                          {formData.careLevel === level.value && (
                            <CheckCircle className="h-5 w-5 text-emerald-400" />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Medical Conditions</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={tempMedicalCondition}
                        onChange={(e) => setTempMedicalCondition(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMedicalCondition())}
                        className={inputClass}
                        placeholder="Add medical condition"
                      />
                      <button
                        type="button"
                        onClick={addMedicalCondition}
                        className="px-4 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    {formData.medicalConditions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.medicalConditions.map((condition, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-200"
                          >
                            {condition}
                            <button
                              type="button"
                              onClick={() => removeMedicalCondition(index)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>Current Medications</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={tempMedication}
                        onChange={(e) => setTempMedication(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMedication())}
                        className={inputClass}
                        placeholder="Add medication"
                      />
                      <button
                        type="button"
                        onClick={addMedication}
                        className="px-4 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    {formData.medications.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.medications.map((medication, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-sm text-blue-200"
                          >
                            <Pill className="h-3 w-3" />
                            {medication}
                            <button
                              type="button"
                              onClick={() => removeMedication(index)}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>Allergies</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={tempAllergy}
                        onChange={(e) => setTempAllergy(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                        className={inputClass}
                        placeholder="Add allergy"
                      />
                      <button
                        type="button"
                        onClick={addAllergy}
                        className="px-4 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    {formData.allergies.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.allergies.map((allergy, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-200"
                          >
                            {allergy}
                            <button
                              type="button"
                              onClick={() => removeAllergy(index)}
                              className="text-amber-400 hover:text-amber-300"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Insurance Provider</label>
                      <input
                        type="text"
                        name="insuranceProvider"
                        value={formData.insuranceProvider}
                        onChange={handleInputChange}
                        className={inputClass}
                        placeholder="Insurance company name"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Policy Number</label>
                      <input
                        type="text"
                        name="insurancePolicyNumber"
                        value={formData.insurancePolicyNumber}
                        onChange={handleInputChange}
                        className={inputClass}
                        placeholder="Policy number"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Primary Care Physician</label>
                      <input
                        type="text"
                        name="primaryCarePhysician"
                        value={formData.primaryCarePhysician}
                        onChange={handleInputChange}
                        className={inputClass}
                        placeholder="Doctor's name"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Physician Phone</label>
                      <input
                        type="tel"
                        name="physicianPhone"
                        value={formData.physicianPhone}
                        onChange={handleInputChange}
                        className={inputClass}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Additional Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={4}
                      className={inputClass}
                      placeholder="Any additional information about the patient..."
                    />
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer Actions */}
        {!createdPatientId && (
          <div className="flex items-center justify-between border-t border-slate-800/60 px-6 py-4 bg-slate-900/40">
            <button
              type="button"
              onClick={currentStep === 1 ? onClose : handlePrevious}
              className="px-4 py-2 rounded-xl border border-slate-700/60 bg-slate-900/60 text-slate-300 hover:bg-slate-800/60 transition-colors"
            >
              {currentStep === 1 ? 'Cancel' : 'Previous'}
            </button>
            <div className="flex gap-3">
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/30 flex items-center gap-2"
                >
                  Next
                  <UserPlus className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-500/30 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Register Patient
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatePatientModal;

