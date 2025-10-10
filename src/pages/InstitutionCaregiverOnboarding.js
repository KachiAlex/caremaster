import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { saveCaregiverProfile, uploadCaregiverDocument, completeOnboarding } from '../api/caregiverOnboardingAPI';
import { caregiverAPI } from '../api/caregiverAPI';
import { toast } from 'react-toastify';
import { Upload, FileText, CheckCircle, AlertCircle, X, File, Shield } from 'lucide-react';

const InstitutionCaregiverOnboarding = () => {
  const { user, userProfile, institutionId, institutionData } = useUser();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  
  const [profile, setProfile] = useState({
    name: userProfile?.name || '',
    email: user?.email || userProfile?.email || '',
    phone: userProfile?.phone || '',
    address: userProfile?.address || '',
    medicalQualification: '',
    yearsOfExperience: '',
    specializations: [],
    licenseNumber: '',
    bio: ''
  });

  const [documents, setDocuments] = useState({
    medicalLicense: null,
    certification: null,
    governmentId: null,
    resume: null
  });

  const [documentPreviews, setDocumentPreviews] = useState({
    medicalLicense: null,
    certification: null,
    governmentId: null,
    resume: null
  });

  const qualifications = [
    'Doctor (MD)',
    'Doctor (MBBS)',
    'Nurse (RN)',
    'Nurse (LPN)',
    'Physiotherapist',
    'Occupational Therapist',
    'Clinical Psychologist',
    'Pharmacist',
    'Nutritionist/Dietitian',
    'Social Worker',
    'Medical Assistant',
    'Home Health Aide',
    'Companion Caregiver',
    'Other'
  ];

  const specializations = [
    'Geriatric Care',
    'Palliative Care',
    'Dementia Care',
    'Post-Surgery Care',
    'Chronic Disease Management',
    'Mental Health',
    'Physical Therapy',
    'Occupational Therapy',
    'Speech Therapy',
    'Wound Care',
    'Medication Management',
    'General Care'
  ];

  useEffect(() => {
    // Check if already onboarded
    if (userProfile?.onboardingComplete) {
      navigate('/institution-caregiver/dashboard');
    }
  }, [userProfile, navigate]);

  const handleProfileChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSpecializationToggle = (spec) => {
    setProfile(prev => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter(s => s !== spec)
        : [...prev.specializations, spec]
    }));
  };

  const handleFileChange = (docType, file) => {
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF, JPEG, and PNG files are allowed');
      return;
    }

    setDocuments(prev => ({ ...prev, [docType]: file }));

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentPreviews(prev => ({ ...prev, [docType]: reader.result }));
      };
      reader.readAsDataURL(file);
    } else {
      setDocumentPreviews(prev => ({ ...prev, [docType]: 'pdf' }));
    }
  };

  const removeDocument = (docType) => {
    setDocuments(prev => ({ ...prev, [docType]: null }));
    setDocumentPreviews(prev => ({ ...prev, [docType]: null }));
  };

  const validateStep1 = () => {
    if (!profile.name || !profile.email || !profile.phone) {
      toast.error('Please fill in all required fields');
      return false;
    }
    if (!profile.medicalQualification) {
      toast.error('Please select your medical qualification');
      return false;
    }
    if (profile.specializations.length === 0) {
      toast.error('Please select at least one specialization');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!documents.medicalLicense) {
      toast.error('Medical license/certification is required');
      return false;
    }
    if (!documents.certification) {
      toast.error('Professional certification is required');
      return false;
    }
    return true;
  };

  const handleStep1Next = async () => {
    if (!validateStep1()) return;

    try {
      setSaving(true);
      if (!user?.uid) {
        toast.error('User not authenticated');
        return;
      }

      await saveCaregiverProfile(user.uid, {
        ...profile,
        institutionId: institutionId || userProfile?.institutionId,
        onboardingStep: 1
      });
      
      toast.success('Profile saved successfully');
      setStep(2);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleStep2Upload = async () => {
    if (!validateStep2()) return;

    try {
      setSaving(true);
      if (!user?.uid) return;

      // Upload all documents
      const uploadPromises = [];
      
      Object.entries(documents).forEach(([docType, file]) => {
        if (file) {
          setUploadProgress(prev => ({ ...prev, [docType]: 0 }));
          uploadPromises.push(
            uploadCaregiverDocument(user.uid, file, `documents/${docType}`)
              .then(() => {
                setUploadProgress(prev => ({ ...prev, [docType]: 100 }));
              })
          );
        }
      });

      await Promise.all(uploadPromises);
      
      // Update onboarding step
      await saveCaregiverProfile(user.uid, { onboardingStep: 2 });
      
      toast.success('Documents uploaded successfully');
      setStep(3);
    } catch (error) {
      console.error('Error uploading documents:', error);
      toast.error('Failed to upload documents');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    try {
      setSaving(true);
      if (!user?.uid) return;

      await completeOnboarding(user.uid);
      
      toast.success('Onboarding completed! Redirecting to dashboard...');
      
      setTimeout(() => {
        navigate('/institution-caregiver/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete onboarding');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back to Portal Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/onboard?institution=${institutionId || userProfile?.institutionId}`)}
            className="flex items-center px-4 py-2 text-sm bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Shield className="h-4 w-4 mr-2" />
            Back to Portal
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to {institutionData?.name || 'Institution'} Portal
          </h1>
          <p className="text-lg text-gray-600">
            Complete your profile to start providing care
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  step >= 1 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                }`}>
                  {step > 1 ? <CheckCircle className="h-6 w-6" /> : '1'}
                </div>
                <span className="ml-2 font-medium hidden sm:inline">Profile</span>
              </div>
              <div className={`h-1 w-16 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  step >= 2 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                }`}>
                  {step > 2 ? <CheckCircle className="h-6 w-6" /> : '2'}
                </div>
                <span className="ml-2 font-medium hidden sm:inline">Documents</span>
              </div>
              <div className={`h-1 w-16 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  step >= 3 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                }`}>
                  3
                </div>
                <span className="ml-2 font-medium hidden sm:inline">Review</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Step 1: Profile Information */}
          {step === 1 && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Professional Profile</h2>
              
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={profile.name}
                      onChange={(e) => handleProfileChange('name', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={profile.email}
                      onChange={(e) => handleProfileChange('email', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={profile.phone}
                      onChange={(e) => handleProfileChange('phone', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Medical Qualification <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={profile.medicalQualification}
                      onChange={(e) => handleProfileChange('medicalQualification', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select qualification</option>
                      {qualifications.map(qual => (
                        <option key={qual} value={qual}>{qual}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={profile.yearsOfExperience}
                      onChange={(e) => handleProfileChange('yearsOfExperience', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      License Number
                    </label>
                    <input
                      type="text"
                      value={profile.licenseNumber}
                      onChange={(e) => handleProfileChange('licenseNumber', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="LIC-123456"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    rows={2}
                    value={profile.address}
                    onChange={(e) => handleProfileChange('address', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your full address"
                  />
                </div>

                {/* Specializations */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Specializations <span className="text-red-500">*</span>
                    <span className="text-gray-500 text-xs ml-2">(Select at least one)</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {specializations.map(spec => (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => handleSpecializationToggle(spec)}
                        className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                          profile.specializations.includes(spec)
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        {spec}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Professional Bio
                  </label>
                  <textarea
                    rows={4}
                    value={profile.bio}
                    onChange={(e) => handleProfileChange('bio', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tell us about your experience and expertise..."
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleStep1Next}
                  disabled={saving}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save & Continue'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Document Upload */}
          {step === 2 && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Documents</h2>
              <p className="text-gray-600 mb-6">Please upload your professional credentials and certifications</p>

              <div className="space-y-6">
                {/* Medical License */}
                <DocumentUpload
                  label="Medical License/Registration"
                  required
                  description="Upload your medical license or professional registration certificate"
                  file={documents.medicalLicense}
                  preview={documentPreviews.medicalLicense}
                  onChange={(file) => handleFileChange('medicalLicense', file)}
                  onRemove={() => removeDocument('medicalLicense')}
                />

                {/* Professional Certification */}
                <DocumentUpload
                  label="Professional Certification"
                  required
                  description="Upload your professional certification or degree"
                  file={documents.certification}
                  preview={documentPreviews.certification}
                  onChange={(file) => handleFileChange('certification', file)}
                  onRemove={() => removeDocument('certification')}
                />

                {/* Government ID */}
                <DocumentUpload
                  label="Government-Issued ID"
                  description="Upload a valid government ID (passport, driver's license, etc.)"
                  file={documents.governmentId}
                  preview={documentPreviews.governmentId}
                  onChange={(file) => handleFileChange('governmentId', file)}
                  onRemove={() => removeDocument('governmentId')}
                />

                {/* Resume/CV */}
                <DocumentUpload
                  label="Resume/CV"
                  description="Upload your professional resume or curriculum vitae"
                  file={documents.resume}
                  preview={documentPreviews.resume}
                  onChange={(file) => handleFileChange('resume', file)}
                  onRemove={() => removeDocument('resume')}
                />
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  disabled={saving}
                  className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleStep2Upload}
                  disabled={saving}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Uploading...' : 'Upload & Continue'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {step === 3 && (
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready for Review</h2>
                <p className="text-gray-600">
                  Your profile and documents have been uploaded successfully
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                <div className="flex">
                  <AlertCircle className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Your profile will be reviewed by the institution administrator</li>
                      <li>• Your documents will be verified for authenticity</li>
                      <li>• You'll receive a notification once approved (typically within 24-48 hours)</li>
                      <li>• Upon approval, you can start accepting patient assignments</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-6 mb-8">
                <h3 className="font-semibold text-gray-900 mb-4">Your Profile Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <span className="ml-2 text-gray-900 font-medium">{profile.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Qualification:</span>
                    <span className="ml-2 text-gray-900 font-medium">{profile.medicalQualification}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Experience:</span>
                    <span className="ml-2 text-gray-900 font-medium">{profile.yearsOfExperience || 'N/A'} years</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Specializations:</span>
                    <span className="ml-2 text-gray-900 font-medium">{profile.specializations.length}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  disabled={saving}
                  className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={saving}
                  className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Submitting...' : 'Submit for Review'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Document Upload Component
const DocumentUpload = ({ label, required, description, file, preview, onChange, onRemove }) => {
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <label className="text-sm font-medium text-gray-900">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
      </div>

      {!file ? (
        <label className="cursor-pointer block">
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/jpg,image/png"
            onChange={(e) => onChange(e.target.files?.[0])}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center py-8">
            <Upload className="h-10 w-10 text-gray-400 mb-3" />
            <p className="text-sm text-gray-600 mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-500">
              PDF, JPEG, PNG (Max 5MB)
            </p>
          </div>
        </label>
      ) : (
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            {preview === 'pdf' ? (
              <FileText className="h-8 w-8 text-red-500" />
            ) : preview ? (
              <img src={preview} alt="Preview" className="h-16 w-16 object-cover rounded" />
            ) : (
              <File className="h-8 w-8 text-gray-500" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default InstitutionCaregiverOnboarding;

