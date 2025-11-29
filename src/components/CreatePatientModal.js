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
  CheckCircle,
  Upload,
  QrCode,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { createClient } from '../api/patientsAPI';
import { useUser } from '../contexts/UserContext';
import { toast } from 'react-toastify';
import { checkForDuplicates, shouldBlockRegistration } from '../utils/clientDuplicateDetection';
import { uploadClientDocument, validateFile } from '../utils/clientDocumentUpload';
import { generateClientQRCodeData } from '../utils/clientQRCodeGenerator';
import QRCode from 'qrcode.react';

const CreateClientModal = ({ open, onClose, onSuccess }) => {
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
    notes: '',
    nationalId: ''
  });

  const [tempMedicalCondition, setTempMedicalCondition] = useState('');
  const [tempMedication, setTempMedication] = useState('');
  const [tempAllergy, setTempAllergy] = useState('');
  
  // Enhanced registration features
  const [duplicateCheck, setDuplicateCheck] = useState(null);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState({
    idCard: null,
    referralLetter: null,
    medicalRecord: null,
    insuranceCard: null
  });
  const [uploading, setUploading] = useState({});
  const [nationalId, setNationalId] = useState('');

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
          toast.error('Client name is required');
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

  // Check for duplicates before submission
  const handleDuplicateCheck = async () => {
    if (!formData.name || !formData.phone) {
      return true; // Skip if required fields not filled
    }

    setCheckingDuplicates(true);
    try {
      const result = await checkForDuplicates(formData, institutionId || userProfile?.institutionId);
      setDuplicateCheck(result);
      
      if (shouldBlockRegistration(result)) {
        setShowDuplicateModal(true);
        setCheckingDuplicates(false);
        return false;
      }
      
      if (result.hasDuplicates) {
        // Show warning but allow proceed
        toast.warning(
          `Found ${result.exactMatches.length} exact match(es) and ${result.similarMatches.length} similar match(es). Please review before proceeding.`,
          { autoClose: 5000 }
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error checking duplicates:', error);
      // Continue with registration if duplicate check fails
      return true;
    } finally {
      setCheckingDuplicates(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file, documentType) => {
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setUploading(prev => ({ ...prev, [documentType]: true }));
    try {
      // We'll upload after Client is created, store file for now
      setUploadedDocuments(prev => ({
        ...prev,
        [documentType]: { file, type: documentType }
      }));
      toast.success(`${documentType.replace('_', ' ')} file selected`);
    } catch (error) {
      console.error('Error handling file:', error);
      toast.error('Failed to process file');
    } finally {
      setUploading(prev => ({ ...prev, [documentType]: false }));
    }
  };

  // Upload documents after Client creation
  const uploadDocumentsAfterRegistration = async (clientId) => {
    const uploadPromises = [];
    
    for (const [docType, docData] of Object.entries(uploadedDocuments)) {
      if (docData && docData.file) {
        uploadPromises.push(
          uploadClientDocument(
            docData.file,
            clientId,
            institutionId || userProfile?.institutionId,
            docType
          ).catch(error => {
            console.error(`Error uploading ${docType}:`, error);
            return null; // Continue with other uploads
          })
        );
      }
    }

    if (uploadPromises.length > 0) {
      await Promise.all(uploadPromises);
      toast.success('Documents uploaded successfully');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) {
      return;
    }

    // Check for duplicates
    const canProceed = await handleDuplicateCheck();
    if (!canProceed) {
      return;
    }

    setLoading(true);
    try {
      // Prepare Client data
      const clientData = {
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
        nationalId: formData.nationalId.trim() || nationalId.trim() || null,
        primaryCarePhysician: formData.primaryCarePhysician.trim() || null,
        physicianPhone: formData.physicianPhone.trim() || null,
        notes: formData.notes.trim() || null,
        institutionId: institutionId || userProfile?.institutionId,
        userType: 'Client',
        type: 'Client',
        status: 'active'
      };

      const result = await createClient(clientData, userProfile);
      setCreatedPatientId(result.clientId);
      
      // Upload documents after Client creation
      if (Object.values(uploadedDocuments).some(doc => doc !== null)) {
        await uploadDocumentsAfterRegistration(result.clientId);
      }
      
      toast.success(
        <div>
          <div className="font-semibold">Client registered successfully!</div>
          <div className="text-sm mt-1">
            Client ID: <span className="font-mono font-bold text-blue-400">{result.clientId}</span>
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
        notes: '',
        nationalId: ''
      });
      setNationalId('');
      setUploadedDocuments({
        idCard: null,
        referralLetter: null,
        medicalRecord: null,
        insuranceCard: null
      });
      setDuplicateCheck(null);
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
      console.error('Error creating Client:', error);
      toast.error(`Failed to create Client: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
              <Heart className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Register New Client</h3>
              <p className="text-xs text-gray-500">Step {currentStep} of 3</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <React.Fragment key={step}>
                <div className="flex items-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    currentStep >= step 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-500'
                  } transition-colors`}>
                    {currentStep > step ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <span className="text-sm font-semibold">{step}</span>
                    )}
                  </div>
                  <span className={`ml-2 text-xs font-medium ${
                    currentStep >= step ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step === 1 ? 'Personal Info' : step === 2 ? 'Emergency Contact' : 'Medical Info'}
                  </span>
                </div>
                {step < 3 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
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
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                  <CheckCircle className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Client Registered Successfully!</h3>
              <p className="text-sm text-gray-600 mb-1">Registration Number</p>
              <div className="inline-block px-6 py-3 rounded-lg bg-blue-50 border-2 border-blue-200 mb-6">
                <span className="font-mono font-bold text-blue-600 text-2xl tracking-wider">{createdPatientId}</span>
              </div>
              
              {/* QR Code Display */}
              <div className="flex flex-col items-center gap-4 mb-6 p-6 rounded-xl bg-gray-50 border border-gray-200">
                <QrCode className="h-6 w-6 text-blue-600" />
                <p className="text-sm font-medium text-gray-700">Client QR Code</p>
                <div className="p-4 bg-white rounded-lg border border-gray-200">
                  <QRCode
                    value={generateClientQRCodeData(
                      createdPatientId,
                      institutionId || userProfile?.institutionId,
                      formData
                    )}
                    size={150}
                    level="M"
                    includeMargin={true}
                  />
                </div>
                <p className="text-xs text-gray-500 max-w-xs">
                  Scan this QR code to quickly access client information
                </p>
              </div>

              <p className="text-xs text-gray-500 mt-4 max-w-md mx-auto">
                This registration number will be used to identify the client throughout the system. 
                All activities will be logged with this number.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Personal Information */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="h-5 w-5 text-blue-600" />
                    <h4 className="text-base font-semibold text-gray-900">Personal Information</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Full Name *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          className={`${inputClass} pl-10`}
                          placeholder="Enter Client's full name"
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className={`${inputClass} pl-10`}
                          placeholder="Client@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Phone Number *</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
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
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
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

                    <div>
                      <label className={labelClass}>National ID</label>
                      <input
                        type="text"
                        name="nationalId"
                        value={formData.nationalId}
                        onChange={handleInputChange}
                        className={inputClass}
                        placeholder="National identification number"
                      />
                    </div>
                  </div>

                    <div>
                      <label className={labelClass}>Address</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
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
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                    <h4 className="text-base font-semibold text-gray-900">Emergency Contact Information</h4>
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
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
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
                    <Activity className="h-5 w-5 text-blue-600" />
                    <h4 className="text-base font-semibold text-gray-900">Medical Information</h4>
                  </div>

                  <div>
                    <label className={labelClass}>Care Level</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {careLevels.map((level) => (
                        <label
                          key={level.value}
                          className={`relative flex cursor-pointer rounded-lg border p-4 transition-colors ${
                            formData.careLevel === level.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-300 bg-white hover:border-gray-400'
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
                            <div className="font-medium text-gray-900">{level.label}</div>
                            <div className="text-xs text-gray-500 mt-1">{level.description}</div>
                          </div>
                          {formData.careLevel === level.value && (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
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
                        className="px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    {formData.medicalConditions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.medicalConditions.map((condition, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
                          >
                            {condition}
                            <button
                              type="button"
                              onClick={() => removeMedicalCondition(index)}
                              className="text-red-600 hover:text-red-800"
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
                        className="px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    {formData.medications.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.medications.map((medication, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700"
                          >
                            <Pill className="h-3 w-3" />
                            {medication}
                            <button
                              type="button"
                              onClick={() => removeMedication(index)}
                              className="text-blue-600 hover:text-blue-800"
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
                        className="px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    {formData.allergies.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.allergies.map((allergy, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700"
                          >
                            {allergy}
                            <button
                              type="button"
                              onClick={() => removeAllergy(index)}
                              className="text-amber-600 hover:text-amber-800"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Document Upload Section */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <h4 className="text-base font-semibold text-gray-900">Documents (Optional)</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { key: 'idCard', label: 'ID Card', icon: User },
                        { key: 'referralLetter', label: 'Referral Letter', icon: FileText },
                        { key: 'medicalRecord', label: 'Medical Records', icon: Activity },
                        { key: 'insuranceCard', label: 'Insurance Card', icon: Shield }
                      ].map(({ key, label, icon: Icon }) => (
                        <div key={key}>
                          <label className={labelClass}>{label}</label>
                          <div className="relative">
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.webp"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) handleFileUpload(file, key);
                              }}
                              className="hidden"
                              id={`file-${key}`}
                              disabled={uploading[key]}
                            />
                            <label
                              htmlFor={`file-${key}`}
                              className={`flex items-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                                uploadedDocuments[key]
                                  ? 'border-green-500 bg-green-50 text-green-700'
                                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-500'
                              } ${uploading[key] ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <Icon className="h-4 w-4" />
                              <span className="text-sm flex-1">
                                {uploadedDocuments[key] 
                                  ? uploadedDocuments[key].file?.name || 'File selected'
                                  : uploading[key] 
                                    ? 'Uploading...' 
                                    : `Upload ${label}`}
                              </span>
                              {uploadedDocuments[key] && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Supported formats: PDF, JPG, PNG, WebP (Max 10MB per file)
                    </p>
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
                      placeholder="Any additional information about the client..."
                    />
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer Actions */}
        {!createdPatientId && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 bg-gray-50">
            <button
              type="button"
              onClick={currentStep === 1 ? onClose : handlePrevious}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {currentStep === 1 ? 'Cancel' : 'Previous'}
            </button>
            <div className="flex gap-3">
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                >
                  Next
                  <UserPlus className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Register Client
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Duplicate Warning Modal */}
        {showDuplicateModal && duplicateCheck && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-red-200 p-6 max-w-2xl w-full shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Potential Duplicate Client</h3>
                  <p className="text-sm text-gray-600">Exact matches found in the system</p>
                </div>
              </div>

              <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                {duplicateCheck.exactMatches.map((match, index) => (
                  <div key={index} className="p-4 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{match.clientName}</p>
                        <p className="text-sm text-gray-600">Client ID: {match.clientId}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {match.matchReasons.map((reason, i) => (
                            <span key={i} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="text-xs font-medium text-red-600">
                        {Math.round(match.matchScore * 100)}% match
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDuplicateModal(false);
                    setDuplicateCheck(null);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                >
                  Cancel Registration
                </button>
                <button
                  onClick={() => {
                    setShowDuplicateModal(false);
                    // Proceed with registration anyway
                    handleSubmit(new Event('submit'));
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                >
                  Proceed Anyway
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateClientModal;

