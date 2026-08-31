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
  AlertTriangle,
  Lock,
  CreditCard,
  Check,
  Crown
} from 'lucide-react';
import { createClient, createClientLoginAccount } from '../api/patientsAPI';
import { getBillingPlans, assignSubscriptionToClient, BILLING_FREQUENCIES } from '../api/billingPlansAPI';
import { useUser } from '../contexts/UserContext';
import { toast } from 'react-toastify';
import { checkForDuplicates, shouldBlockRegistration } from '../utils/clientDuplicateDetection';
import { uploadClientDocument, validateFile } from '../utils/clientDocumentUpload';
import { generateClientQRCodeData } from '../utils/clientQRCodeGenerator';
import { validateFormInputs, sanitizeText, validateEmail, validatePhone, validateDate } from '../utils/inputValidation';
import QRCode from 'qrcode.react';

// Common country codes
const countryCodes = [
  { code: '+1', country: 'United States/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+254', country: 'Kenya', flag: '🇰🇪' },
  { code: '+233', country: 'Ghana', flag: '🇬🇭' },
  { code: '+256', country: 'Uganda', flag: '🇺🇬' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
];

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
    phoneCountryCode: '+234',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    
    // Emergency Contact
    emergencyContactName: '',
    emergencyContactPhoneCountryCode: '+234',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    
    // Medical Information
    medicalConditions: [],
    medications: [],
    allergies: [],
    bloodType: '',
    genotype: '',
    careLevel: 'basic',
    
    // Additional Information
    insuranceProvider: '',
    insurancePolicyNumber: '',
    primaryCarePhysician: '',
    physicianPhone: '',
    notes: '',
    nationalId: '',

    // Login credentials (admin sets initial password so the client can sign in)
    loginPassword: '',
    confirmPassword: '',

    // Subscription plan
    subscriptionPlanId: '',
    billingCycle: 'monthly'
  });

  const [tempMedicalCondition, setTempMedicalCondition] = useState('');
  const [tempMedication, setTempMedication] = useState('');
  const [tempAllergy, setTempAllergy] = useState('');

  // Billing plans for subscription selection
  const [billingPlans, setBillingPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  
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
  const [fileError, setFileError] = useState('');
  const [nationalId, setNationalId] = useState('');

  // Compute the institution ID at the component level so it's available
  // for both the billing plans fetch and the submit handler
  const effectiveInstitutionId = institutionId || userProfile?.institutionId;

  // Fetch billing plans for the institution when modal opens
  React.useEffect(() => {
    if (open && effectiveInstitutionId) {
      setLoadingPlans(true);
      getBillingPlans(effectiveInstitutionId)
        .then((plans) => {
          setBillingPlans(plans || []);
          setLoadingPlans(false);
        })
        .catch((err) => {
          console.error('Failed to load billing plans:', err);
          setBillingPlans([]);
          setLoadingPlans(false);
        });
    }
  }, [open, effectiveInstitutionId]);

  const careLevels = [
    { 
      value: 'basic', 
      label: 'Basic Care', 
      description: 'Minimal ADL assistance needed',
      details: 'Includes assistance with activities of daily living (ADLs) like meal preparation, light housekeeping, medication reminders, and companionship. Suitable for individuals who are largely autonomous but require periodic support.'
    },
    { 
      value: 'intermediate', 
      label: 'Intermediate Care', 
      description: 'Moderate assistance & health monitoring',
      details: 'Includes personal care support (bathing, dressing, grooming), mobility assistance, routine medication administration, and regular vital signs observation. Suitable for patients needing structured daily living assistance.'
    },
    { 
      value: 'advanced', 
      label: 'Advanced Care', 
      description: 'Skilled nursing & complex chronic care',
      details: 'Includes skilled nursing interventions, wound management, catheter care, routine vitals monitoring, complex medication regimens, assistive medical devices, and interdisciplinary clinical coordination. Suitable for patients with chronic or multimorbid conditions.'
    },
    { 
      value: 'acute', 
      label: 'Acute Care', 
      description: 'High-acuity clinical & continuous monitoring',
      details: 'Includes continuous physiological monitoring, complex clinical interventions, respiratory/ventilator care, high-frequency medication titration, rapid emergency response readiness, and intensive nurse-to-patient oversight. Suitable for patients with severe, unstable, or post-acute medical conditions.'
    }
  ];

  // SECURITY FIX: Enhanced input handling with validation and sanitization
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Sanitize input based on field type
    let sanitizedValue = value;
    
    // Name fields - allow spaces and preserve formatting
    if (name === 'name' || name === 'fullName' || name === 'emergencyContactName' || name === 'primaryCarePhysician') {
      // Remove dangerous characters but preserve spaces
      sanitizedValue = value.replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
      sanitizedValue = sanitizedValue.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''); // Remove script tags
      sanitizedValue = sanitizedValue.replace(/on\w+\s*=\s*["'][^"']*["']/gi, ''); // Remove event handlers
      sanitizedValue = sanitizedValue.replace(/javascript:/gi, ''); // Remove javascript:
      sanitizedValue = sanitizedValue.replace(/data:text\/html/gi, ''); // Remove data URIs
      // Don't trim - allow spaces in names
    } else if (name === 'email') {
      const emailValidation = validateEmail(value);
      if (value && !emailValidation.valid) {
        // Show validation error but don't block input
        // Error will be shown on submit
      }
      sanitizedValue = sanitizeText(value);
    } else if (name === 'phone' || name === 'emergencyContactPhone' || name === 'physicianPhone') {
      sanitizedValue = sanitizeText(value);
      // Remove non-numeric characters except + for phone
      sanitizedValue = sanitizedValue.replace(/[^\d+\-() ]/g, '');
    } else if (name === 'notes' || name === 'address') {
      // Allow more characters for text fields but sanitize HTML
      sanitizedValue = sanitizeText(value);
    } else if (name === 'loginPassword' || name === 'confirmPassword') {
      // Passwords must be preserved exactly as typed — do NOT sanitize (would strip characters)
      sanitizedValue = value;
    } else {
      // Standard sanitization for other fields
      sanitizedValue = sanitizeText(value);
    }
    
    setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
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
      setCurrentStep(prev => Math.min(prev + 1, 4));
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
      
      // Only block if there are exact matches
      if (shouldBlockRegistration(result)) {
        setShowDuplicateModal(true);
        setCheckingDuplicates(false);
        return false;
      }
      
      // Show warning for similar matches but allow proceed
      if (result.hasDuplicates && result.similarMatches && result.similarMatches.length > 0) {
        toast.warning(
          `Found ${result.similarMatches.length} similar match(es). Please review before proceeding.`,
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

    setFileError('');
    setUploading(prev => ({ ...prev, [documentType]: true }));

    try {
      // Support both sync and async validateFile implementations
      const validationResult = await Promise.resolve(validateFile(file));

      let isValid = true;
      let errorMessage = '';

      if (validationResult && typeof validationResult === 'object' && 'isValid' in validationResult) {
        isValid = validationResult.isValid;
        errorMessage = validationResult.error || '';
      } else if (typeof validationResult === 'boolean') {
        isValid = validationResult;
      }

      if (!isValid) {
        const message = errorMessage || 'Invalid file type. Please upload a supported file.';
        setFileError(message);
        toast.error(message);
        return;
      }

      // Store file for upload after Client creation
      setUploadedDocuments(prev => ({
        ...prev,
        [documentType]: { file, type: documentType }
      }));
      toast.success(`${documentType.replace('_', ' ')} file selected`);
    } catch (error) {
      const message = 'Invalid file. Please try another file.';
      console.error('Error handling file:', error);
      setFileError(message);
      toast.error(message);
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

  const handleSubmit = async (e, skipDuplicateCheck = false) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) {
      return;
    }

    // Check for duplicates (unless explicitly skipped)
    if (!skipDuplicateCheck) {
      const canProceed = await handleDuplicateCheck();
      if (!canProceed) {
        return;
      }
    }

    setLoading(true);
    try {
      // Validate institutionId is present (computed at component level)
      if (!effectiveInstitutionId) {
        toast.error('Institution ID is required. Please ensure you are logged in with an institution account.');
        setLoading(false);
        return;
      }

      // SECURITY FIX: Comprehensive validation and sanitization before submission
      const validationSchema = {
        name: { required: true, type: 'text', label: 'Name' },
        email: { required: false, type: 'email', label: 'Email' },
        phone: { required: true, type: 'phone', label: 'Phone' },
        dateOfBirth: { required: true, type: 'date', label: 'Date of Birth' },
        emergencyContactName: { required: true, type: 'text', label: 'Emergency Contact Name' },
        emergencyContactPhone: { required: true, type: 'phone', label: 'Emergency Contact Phone' },
        physicianPhone: { required: false, type: 'phone', label: 'Physician Phone' }
      };
      
      const validation = validateFormInputs(formData, validationSchema);

      if (!validation.valid) {
        const firstError = Object.values(validation.errors)[0];
        toast.error(firstError);
        setLoading(false);
        return;
      }

      // Validate login credentials when an email is provided (clients sign in with email + password)
      if (formData.email && formData.email.trim()) {
        if (!formData.loginPassword || formData.loginPassword.length < 6) {
          toast.error('Login password must be at least 6 characters so the client can sign in.');
          setLoading(false);
          return;
        }
        if (formData.loginPassword !== formData.confirmPassword) {
          toast.error('Login password and confirmation do not match.');
          setLoading(false);
          return;
        }
      }
      
      // Prepare Client data with sanitized values
      const clientData = {
        name: sanitizeText(formData.name.trim()),
        fullName: sanitizeText(formData.fullName.trim() || formData.name.trim()),
        email: formData.email ? sanitizeText(formData.email.trim().toLowerCase()) : null,
        phone: sanitizeText(`${formData.phoneCountryCode}${formData.phone.trim()}`),
        dateOfBirth: formData.dateOfBirth || null,
        gender: formData.gender || null,
        address: formData.address ? sanitizeText(formData.address.trim()) : null,
        city: formData.city ? sanitizeText(formData.city.trim()) : null,
        state: formData.state ? sanitizeText(formData.state.trim()) : null,
        zipCode: formData.zipCode ? sanitizeText(formData.zipCode.trim()) : null,
        emergencyContactName: sanitizeText(formData.emergencyContactName.trim()),
        emergencyContactPhone: sanitizeText(`${formData.emergencyContactPhoneCountryCode}${formData.emergencyContactPhone.trim()}`),
        emergencyContactRelationship: formData.emergencyContactRelationship ? sanitizeText(formData.emergencyContactRelationship.trim()) : null,
        medicalConditions: formData.medicalConditions.map(condition => sanitizeText(condition)),
        medications: formData.medications.map(med => sanitizeText(med)),
        allergies: formData.allergies.map(allergy => sanitizeText(allergy)),
        bloodType: formData.bloodType || null,
        genotype: formData.genotype || null,
        careLevel: formData.careLevel,
        insuranceProvider: formData.insuranceProvider ? sanitizeText(formData.insuranceProvider.trim()) : null,
        insurancePolicyNumber: formData.insurancePolicyNumber ? sanitizeText(formData.insurancePolicyNumber.trim()) : null,
        nationalId: formData.nationalId ? sanitizeText(formData.nationalId.trim()) : (nationalId ? sanitizeText(nationalId.trim()) : null),
        primaryCarePhysician: formData.primaryCarePhysician ? sanitizeText(formData.primaryCarePhysician.trim()) : null,
        physicianPhone: formData.physicianPhone ? sanitizeText(formData.physicianPhone.trim()) : null,
        notes: formData.notes ? sanitizeText(formData.notes.trim()) : null,
        institutionId: effectiveInstitutionId,
        userType: 'Client',
        type: 'Client',
        status: 'active',
        // Include login password so the backend can use it when auto-creating
        // the user account. This field is NOT stored in the clients table —
        // the backend reads it from req.body and uses it for the users table.
        loginPassword: formData.loginPassword || null
      };

      // Create client with improved error handling
      let result;
      try {
        result = await createClient(clientData, userProfile);
        setCreatedPatientId(result.clientId);
      } catch (createError) {
        // Provide specific error messages based on error type
        let errorMessage = 'Failed to create client. Please try again.';
        
        if (createError.code === 'permission-denied' || createError.code === 'PERMISSION_DENIED') {
          errorMessage = 'Permission denied. Please ensure you have admin access to create clients.';
        } else if (createError.code === 'unavailable') {
          errorMessage = 'Service temporarily unavailable. Please check your internet connection and try again.';
        } else if (createError.code === 'deadline-exceeded') {
          errorMessage = 'Request timeout. Please try again.';
        } else if (createError.message) {
          errorMessage = `Failed to create client: ${createError.message}`;
        }
        
        toast.error(errorMessage, { autoClose: 6000 });
        console.error('Client creation error:', createError);
        setLoading(false);
        return;
      }
      
      // Upload documents after Client creation (non-blocking - don't fail if upload fails)
      if (Object.values(uploadedDocuments).some(doc => doc !== null)) {
        try {
          await uploadDocumentsAfterRegistration(result.clientId);
        } catch (uploadError) {
          // Log upload error but don't fail the entire operation
          console.warn('Document upload failed (client was created successfully):', uploadError);
          toast.warning('Client created successfully, but some documents could not be uploaded. You can upload them later.', {
            autoClose: 6000
          });
        }
      }

      // The backend automatically creates a user account when a client record
      // is created via POST /api/data/clients. Check if the auto-account was
      // created successfully. If not (e.g. email conflict), fall back to the
      // explicit create-client endpoint.
      let loginAccountCreated = false;
      let loginAccountInfo = null;

      if (result.loginAccount) {
        // Backend auto-created the account
        loginAccountCreated = true;
        loginAccountInfo = result.loginAccount;
      } else if (clientData.email && formData.loginPassword) {
        // Fallback: explicitly create the login account if the backend
        // didn't auto-create one (e.g. older backend version or error)
        try {
          const nameParts = clientData.name.split(/\s+/);
          const firstName = nameParts[0] || clientData.name;
          const lastName = nameParts.slice(1).join(' ') || '';
          await createClientLoginAccount({
            clientId: result.id || result.clientId,
            email: clientData.email,
            password: formData.loginPassword,
            firstName,
            lastName,
            institutionId: effectiveInstitutionId,
            phone: clientData.phone,
          });
          loginAccountCreated = true;
        } catch (loginError) {
          console.error('Client login account creation error:', loginError);
          toast.warning(
            `Client registered, but the login account could not be created: ${loginError.message}. The client cannot sign in until this is resolved.`,
            { autoClose: 8000 }
          );
        }
      }

      // Assign subscription plan if one was selected
      let subscriptionAssigned = false;
      if (formData.subscriptionPlanId && (result.id || result.clientId)) {
        try {
          await assignSubscriptionToClient(
            result.id || result.clientId,
            formData.subscriptionPlanId,
            formData.billingCycle || 'monthly'
          );
          subscriptionAssigned = true;
        } catch (subError) {
          console.error('Subscription assignment error:', subError);
          toast.warning(
            `Client registered, but the subscription plan could not be assigned: ${subError.message}. You can assign it later from the billing page.`,
            { autoClose: 8000 }
          );
        }
      }

      toast.success(
        <div>
          <div className="font-semibold">Client registered successfully!</div>
          <div className="text-sm mt-1">
            Client ID: <span className="font-mono font-bold text-blue-400">{result.clientId}</span>
          </div>
          {loginAccountCreated && (
            <div className="text-sm mt-1">
              Login account created — the client can now sign in
              {loginAccountInfo?.temporaryPassword && loginAccountInfo.password
                ? ` with temporary password: ${loginAccountInfo.password}`
                : ' with their email and password.'}
            </div>
          )}
          {subscriptionAssigned && (
            <div className="text-sm mt-1">
              Subscription plan assigned ({formData.billingCycle} billing).
            </div>
          )}
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
        genotype: '',
        careLevel: 'basic',
        insuranceProvider: '',
        insurancePolicyNumber: '',
        primaryCarePhysician: '',
        physicianPhone: '',
        notes: '',
        nationalId: '',
        loginPassword: '',
        confirmPassword: '',
        subscriptionPlanId: '',
        billingCycle: 'monthly'
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
      console.error('Unexpected error creating Client:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'An unexpected error occurred while creating the client.';
      
      if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
        errorMessage = 'Permission denied. Please ensure you have admin access. If the problem persists, try logging out and back in.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Service temporarily unavailable. Please check your internet connection and try again.';
      } else if (error.code === 'deadline-exceeded') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast.error(errorMessage, { 
        autoClose: 8000,
        position: 'top-center'
      });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  if (!open) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4"
      data-testid="modal-backdrop"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden flex flex-col mx-2 sm:mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
              <Heart className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Register New Client</h3>
              <p className="text-xs text-gray-500">Step {currentStep} of 4</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg border border-gray-300 bg-white min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step) => (
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
                    {step === 1 ? 'Patient Demographics' : step === 2 ? 'Emergency Contact' : step === 3 ? 'Clinical Profile' : 'Subscription Plan'}
                  </span>
                </div>
                {step < 4 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                  } transition-colors`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
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
              {/* Step 1: Patient Demographics */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="h-5 w-5 text-blue-600" />
                    <h4 className="text-base font-semibold text-gray-900">Patient Demographics</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className={labelClass}>Full Name *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          id="name"
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
                      <label htmlFor="email" className={labelClass}>Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          id="email"
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
                      <label htmlFor="loginPassword" className={labelClass}>Login Password {formData.email ? '*' : ''}</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          id="loginPassword"
                          type="password"
                          name="loginPassword"
                          value={formData.loginPassword}
                          onChange={handleInputChange}
                          className={`${inputClass} pl-10`}
                          placeholder="Min. 6 characters"
                          autoComplete="new-password"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Sets the password the client uses to sign in. Required when an email is provided.</p>
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className={labelClass}>Confirm Password {formData.email ? '*' : ''}</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          id="confirmPassword"
                          type="password"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          className={`${inputClass} pl-10`}
                          placeholder="Re-enter password"
                          autoComplete="new-password"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="phone" className={labelClass}>Phone Number *</label>
                      <div className="flex gap-2">
                        <select
                          name="phoneCountryCode"
                          value={formData.phoneCountryCode}
                          onChange={handleInputChange}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shrink-0"
                          style={{ width: '130px', minWidth: '130px' }}
                        >
                          {countryCodes.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.flag} {country.code}
                            </option>
                          ))}
                        </select>
                        <div className="relative flex-1 min-w-0">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            id="phone"
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            required
                            className={`${inputClass} pl-10`}
                            placeholder="1234567890"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="dateOfBirth" className={labelClass}>Date of Birth</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          id="dateOfBirth"
                          type="date"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleInputChange}
                          className={`${inputClass} pl-10`}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="gender" className={labelClass}>Gender</label>
                      <select
                        id="gender"
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
                      <label className={labelClass}>Genotype</label>
                      <select
                        name="genotype"
                        value={formData.genotype}
                        onChange={handleInputChange}
                        className={inputClass}
                      >
                        <option value="">Select genotype</option>
                        <option value="AA">AA</option>
                        <option value="AS">AS</option>
                        <option value="SS">SS</option>
                        <option value="AC">AC</option>
                        <option value="SC">SC</option>
                        <option value="CC">CC</option>
                        <option value="Unknown">Unknown</option>
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
                      <label htmlFor="zipCode" className={labelClass}>ZIP Code</label>
                      <input
                        id="zipCode"
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

              {/* Step 2: Emergency Contact & Next of Kin */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                    <h4 className="text-base font-semibold text-gray-900">Emergency Contact & Next of Kin</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="emergencyContactName" className={labelClass}>Contact Name *</label>
                      <input
                        id="emergencyContactName"
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
                      <label htmlFor="emergencyContactPhone" className={labelClass}>Contact Phone *</label>
                      <div className="flex gap-2">
                        <select
                          name="emergencyContactPhoneCountryCode"
                          value={formData.emergencyContactPhoneCountryCode}
                          onChange={handleInputChange}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shrink-0"
                          style={{ width: '130px', minWidth: '130px' }}
                        >
                          {countryCodes.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.flag} {country.code}
                            </option>
                          ))}
                        </select>
                        <div className="relative flex-1 min-w-0">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            id="emergencyContactPhone"
                            type="tel"
                            name="emergencyContactPhone"
                            value={formData.emergencyContactPhone}
                            onChange={handleInputChange}
                            required
                            className={`${inputClass} pl-10`}
                            placeholder="1234567890"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="emergencyContactRelationship" className={labelClass}>Relationship / Legal Designation</label>
                      <select
                        id="emergencyContactRelationship"
                        name="emergencyContactRelationship"
                        value={formData.emergencyContactRelationship}
                        onChange={handleInputChange}
                        className={inputClass}
                      >
                        <option value="">Select relationship / designation</option>
                        <option value="next-of-kin">Next of Kin</option>
                        <option value="healthcare-proxy">Healthcare Proxy / Power of Attorney</option>
                        <option value="legal-guardian">Legal Guardian</option>
                        <option value="spouse">Spouse / Partner</option>
                        <option value="child">Adult Child</option>
                        <option value="parent">Parent</option>
                        <option value="sibling">Sibling</option>
                        <option value="primary-caregiver">Family Caregiver</option>
                        <option value="friend">Friend / Advocate</option>
                        <option value="other">Other Designated Contact</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Clinical & Medical Profile */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <h4 className="text-base font-semibold text-gray-900">Clinical & Medical Profile</h4>
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
                            {formData.careLevel === level.value && level.details && (
                              <div className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                                {level.details}
                              </div>
                            )}
                          </div>
                          {formData.careLevel === level.value && (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Diagnoses & Chronic Conditions</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={tempMedicalCondition}
                        onChange={(e) => setTempMedicalCondition(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMedicalCondition())}
                        className={inputClass}
                        placeholder="e.g., Type 2 Diabetes, Hypertension, COPD"
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
                    <label className={labelClass}>Active Prescriptions & Pharmacotherapy</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={tempMedication}
                        onChange={(e) => setTempMedication(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMedication())}
                        className={inputClass}
                        placeholder="e.g., Metformin 500mg BID, Lisinopril 10mg QD"
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
                    <label className={labelClass}>Allergies & Adverse Drug Reactions (ADRs)</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={tempAllergy}
                        onChange={(e) => setTempAllergy(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                        className={inputClass}
                        placeholder="e.g., Penicillin (Anaphylaxis), Latex, Sulfa drugs"
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
                              data-testid="file-input"
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
                    {fileError && (
                      <p className="text-xs text-red-600 mt-2" role="alert">
                        {fileError}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Supported formats: PDF, JPG, PNG, WebP (Max 10MB per file)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Attending / Primary Care Physician (PCP)</label>
                      <input
                        type="text"
                        name="primaryCarePhysician"
                        value={formData.primaryCarePhysician}
                        onChange={handleInputChange}
                        className={inputClass}
                        placeholder="Dr. Full Name, MD/DO"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Physician Contact / Clinic Phone</label>
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
                    <label className={labelClass}>Clinical Notes & Care Plan Instructions</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={4}
                      className={inputClass}
                      placeholder="Special clinical instructions, baseline vitals, dietary restrictions, mobility status, or behavioral notes..."
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Subscription Plan */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    <h4 className="text-base font-semibold text-gray-900">Subscription Plan</h4>
                  </div>

                  {loadingPlans ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="ml-2 text-gray-600">Loading available plans...</span>
                    </div>
                  ) : billingPlans.length === 0 ? (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-900">No subscription plans configured</p>
                          <p className="text-sm text-amber-700 mt-1">
                            Your institution doesn't have any billing plans set up yet. You can create this client now
                            and assign a subscription plan later from the Billing Configuration page.
                          </p>
                          <p className="text-xs text-amber-600 mt-2">
                            Navigate to <strong>Admin Dashboard → Billing → Plans</strong> to create plans.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">
                        Select a subscription plan for this client. You can change it later from the billing settings.
                      </p>

                      {/* Plan selection cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {billingPlans.filter(p => p.isActive).map((plan) => (
                          <div
                            key={plan.id}
                            onClick={() => setFormData(prev => ({ ...prev, subscriptionPlanId: plan.id }))}
                            className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                              formData.subscriptionPlanId === plan.id
                                ? 'border-blue-600 bg-blue-50 shadow-md'
                                : 'border-gray-200 bg-white hover:border-blue-300'
                            }`}
                          >
                            {formData.subscriptionPlanId === plan.id && (
                              <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            )}
                            <div className="flex items-center gap-2 mb-2">
                              {plan.tier === 'basic' && <Shield className="h-5 w-5 text-gray-500" />}
                              {plan.tier === 'standard' && <Heart className="h-5 w-5 text-blue-500" />}
                              {plan.tier === 'premium' && <Crown className="h-5 w-5 text-purple-500" />}
                              <h5 className="font-semibold text-gray-900">{plan.name}</h5>
                            </div>
                            {plan.description && (
                              <p className="text-xs text-gray-500 mb-3">{plan.description}</p>
                            )}
                            <div className="space-y-1 mb-3">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Weekly</span>
                                <span className="font-medium text-gray-900">
                                  {plan.currency === 'NGN' ? '₦' : plan.currency === 'USD' ? '$' : plan.currency || '$'}{plan.weeklyPrice}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Monthly</span>
                                <span className="font-medium text-gray-900">
                                  {plan.currency === 'NGN' ? '₦' : plan.currency === 'USD' ? '$' : plan.currency || '$'}{plan.monthlyPrice}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Annual</span>
                                <span className="font-medium text-gray-900">
                                  {plan.currency === 'NGN' ? '₦' : plan.currency === 'USD' ? '$' : plan.currency || '$'}{plan.annualPrice || plan.yearlyPrice}
                                </span>
                              </div>
                            </div>
                            {plan.features && plan.features.length > 0 && (
                              <ul className="space-y-1">
                                {plan.features.slice(0, 4).map((feature, i) => (
                                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                                    <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span>{feature}</span>
                                  </li>
                                ))}
                                {plan.features.length > 4 && (
                                  <li className="text-xs text-gray-400">+{plan.features.length - 4} more</li>
                                )}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Billing cycle selector */}
                      {formData.subscriptionPlanId && (
                        <div>
                          <label className={labelClass}>Billing Cycle</label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                            {BILLING_FREQUENCIES.map((freq) => (
                              <button
                                key={freq.id}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, billingCycle: freq.id }))}
                                className={`rounded-lg border-2 px-4 py-3 text-center transition-all ${
                                  formData.billingCycle === freq.id
                                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'
                                }`}
                              >
                                <div className="font-semibold text-sm">{freq.label}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Skip option */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, subscriptionPlanId: '' }))}
                          className={`text-sm ${!formData.subscriptionPlanId ? 'text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          Skip — assign a plan later
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer Actions */}
        {!createdPatientId && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-t border-gray-200 px-4 sm:px-6 py-4 bg-gray-50 gap-3">
            <button
              type="button"
              onClick={currentStep === 1 ? onClose : handlePrevious}
              className="px-4 py-3 sm:py-2 min-h-[44px] rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {currentStep === 1 ? 'Cancel' : 'Previous'}
            </button>
            <div className="flex gap-3">
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 sm:px-6 py-3 sm:py-2 min-h-[44px] rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2"
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
        {showDuplicateModal && duplicateCheck && duplicateCheck.exactMatches && duplicateCheck.exactMatches.length > 0 && (
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
                          {match.matchReasons && match.matchReasons.length > 0 ? (
                            match.matchReasons.map((reason, i) => (
                              <span key={i} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">
                                {reason}
                              </span>
                            ))
                          ) : null}
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
                  onClick={async () => {
                    setShowDuplicateModal(false);
                    setDuplicateCheck(null);
                    // Proceed with registration anyway, skipping duplicate check
                    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                    await handleSubmit(submitEvent, true);
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

