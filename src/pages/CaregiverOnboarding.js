import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserCheck, 
  GraduationCap, 
  Clock, 
  Shield, 
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  MapPin,
  Award
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { updateUserProfile } from '../api/usersAPI';
import { toast } from 'react-toastify';

const CaregiverOnboarding = () => {
  const { user, userProfile, refreshUserProfile } = useUser();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    // Medical Qualifications
    medicalQualification: '',
    licenseNumber: '',
    yearsOfExperience: '',
    specializations: [],
    certifications: [],
    
    // Work Availability
    availableDays: [],
    workingHours: '',
    preferredWorkType: '', // full-time, part-time, contract
    maxHoursPerWeek: '',
    preferredOffDays: [],
    weeksPerMonth: '',
    
    // Health Screening
    hasDisabilities: '',
    disabilityDetails: '',
    hasHealthConditions: '',
    healthConditionDetails: '',
    
    // Consents
    backgroundCheckConsent: false,
    drugTestConsent: false,
    termsAccepted: false
  });

  const medicalQualifications = [
    'Doctor (MD)',
    'Nurse (RN)',
    'Licensed Practical Nurse (LPN)',
    'Physiotherapist',
    'Pharmacist',
    'Lab Technician',
    'Psychologist',
    'Psychiatrist',
    'Certified Nursing Assistant (CNA)',
    'Home Health Aide (HHA)',
    'General Caregiver'
  ];

  const specializationOptions = [
    'Elderly Care',
    'Dementia Care',
    'Cardiac Care',
    'Diabetes Management',
    'Post-Surgery Care',
    'Medication Management',
    'Physical Therapy',
    'Mental Health Support',
    'Palliative Care',
    'General Healthcare'
  ];

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Check if caregiver has already completed onboarding
  useEffect(() => {
    if (userProfile?.onboardingComplete) {
      navigate('/caregiver');
    }
  }, [userProfile, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleArrayChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: prev[name].includes(value)
        ? prev[name].filter(item => item !== value)
        : [...prev[name], value]
    }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        return formData.medicalQualification && formData.yearsOfExperience && formData.specializations.length > 0;
      case 2:
        return formData.availableDays.length > 0 && formData.workingHours && formData.preferredWorkType;
      case 3:
        return formData.hasDisabilities && formData.hasHealthConditions;
      case 4:
        return formData.backgroundCheckConsent && formData.drugTestConsent && formData.termsAccepted;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    } else {
      toast.error('Please complete all required fields');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) {
      toast.error('Please complete all required fields');
      return;
    }

    setLoading(true);
    try {
      // Update user profile with onboarding data
      const updatedProfile = {
        ...userProfile,
        ...formData,
        onboardingComplete: true,
        onboardingCareerComplete: true,
        onboardingQualificationsComplete: true,
        onboardingReferencesComplete: true,
        onboardingDocumentsComplete: true,
        profileComplete: true,
        qualificationLevel: 'verified', // Mark as verified after onboarding
        updatedAt: new Date()
      };

      await updateUserProfile(user.uid, updatedProfile);
      await refreshUserProfile();
      
      toast.success('Onboarding completed successfully!');
      navigate('/caregiver');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <GraduationCap className="h-16 w-16 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Medical Qualifications</h2>
        <p className="text-gray-600">Tell us about your medical background and expertise</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Medical Qualification *
          </label>
          <select
            name="medicalQualification"
            value={formData.medicalQualification}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select your qualification</option>
            {medicalQualifications.map((qual) => (
              <option key={qual} value={qual}>{qual}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            License Number (if applicable)
          </label>
          <input
            type="text"
            name="licenseNumber"
            value={formData.licenseNumber}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your professional license number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Years of Experience *
          </label>
          <input
            type="number"
            name="yearsOfExperience"
            value={formData.yearsOfExperience}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Years of professional experience"
            min="0"
            max="50"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Specializations * (Select all that apply)
          </label>
          <div className="grid grid-cols-2 gap-3">
            {specializationOptions.map((spec) => (
              <label key={spec} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.specializations.includes(spec)}
                  onChange={() => handleArrayChange('specializations', spec)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">{spec}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Clock className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Work Availability</h2>
        <p className="text-gray-600">Set your preferred working schedule and availability</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Available Days * (Select all that apply)
          </label>
          <div className="grid grid-cols-2 gap-3">
            {daysOfWeek.map((day) => (
              <label key={day} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.availableDays.includes(day)}
                  onChange={() => handleArrayChange('availableDays', day)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">{day}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Working Hours *
          </label>
          <select
            name="workingHours"
            value={formData.workingHours}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select preferred hours</option>
            <option value="morning">Morning (6AM - 12PM)</option>
            <option value="afternoon">Afternoon (12PM - 6PM)</option>
            <option value="evening">Evening (6PM - 12AM)</option>
            <option value="night">Night (12AM - 6AM)</option>
            <option value="flexible">Flexible</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Work Type *
          </label>
          <select
            name="preferredWorkType"
            value={formData.preferredWorkType}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select work type</option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract/Per-visit</option>
            <option value="on-call">On-call</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximum Hours Per Week
          </label>
          <input
            type="number"
            name="maxHoursPerWeek"
            value={formData.maxHoursPerWeek}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Maximum hours you can work per week"
            min="1"
            max="168"
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Shield className="h-16 w-16 text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Health Screening</h2>
        <p className="text-gray-600">Help us ensure the safety of our clients and staff</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Do you have any disabilities that may affect your ability to provide care? *
          </label>
          <div className="space-y-2">
            <label className="flex items-center space-x-3">
              <input
                type="radio"
                name="hasDisabilities"
                value="no"
                checked={formData.hasDisabilities === 'no'}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                required
              />
              <span className="text-sm text-gray-700">No</span>
            </label>
            <label className="flex items-center space-x-3">
              <input
                type="radio"
                name="hasDisabilities"
                value="yes"
                checked={formData.hasDisabilities === 'yes'}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                required
              />
              <span className="text-sm text-gray-700">Yes</span>
            </label>
            <label className="flex items-center space-x-3">
              <input
                type="radio"
                name="hasDisabilities"
                value="prefer-not-to-say"
                checked={formData.hasDisabilities === 'prefer-not-to-say'}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                required
              />
              <span className="text-sm text-gray-700">Prefer not to say</span>
            </label>
          </div>
          {formData.hasDisabilities === 'yes' && (
            <div className="mt-3">
              <textarea
                name="disabilityDetails"
                value={formData.disabilityDetails}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                placeholder="Please describe any disabilities that may affect your ability to provide care..."
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Do you have any health conditions that may affect your ability to provide care? *
          </label>
          <div className="space-y-2">
            <label className="flex items-center space-x-3">
              <input
                type="radio"
                name="hasHealthConditions"
                value="no"
                checked={formData.hasHealthConditions === 'no'}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                required
              />
              <span className="text-sm text-gray-700">No</span>
            </label>
            <label className="flex items-center space-x-3">
              <input
                type="radio"
                name="hasHealthConditions"
                value="yes"
                checked={formData.hasHealthConditions === 'yes'}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                required
              />
              <span className="text-sm text-gray-700">Yes</span>
            </label>
            <label className="flex items-center space-x-3">
              <input
                type="radio"
                name="hasHealthConditions"
                value="prefer-not-to-say"
                checked={formData.hasHealthConditions === 'prefer-not-to-say'}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                required
              />
              <span className="text-sm text-gray-700">Prefer not to say</span>
            </label>
          </div>
          {formData.hasHealthConditions === 'yes' && (
            <div className="mt-3">
              <textarea
                name="healthConditionDetails"
                value={formData.healthConditionDetails}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                placeholder="Please list any health conditions that may affect your ability to provide care..."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Final Agreements</h2>
        <p className="text-gray-600">Please review and accept the following requirements</p>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              name="backgroundCheckConsent"
              checked={formData.backgroundCheckConsent}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              required
            />
            <div>
              <span className="text-sm font-medium text-gray-900">Background Check Consent *</span>
              <p className="text-sm text-gray-600 mt-1">
                I consent to a background check being conducted as part of the verification process. 
                This helps ensure the safety and security of all clients.
              </p>
            </div>
          </label>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              name="drugTestConsent"
              checked={formData.drugTestConsent}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              required
            />
            <div>
              <span className="text-sm font-medium text-gray-900">Drug Test Consent *</span>
              <p className="text-sm text-gray-600 mt-1">
                I consent to drug testing as required. This is a standard requirement to ensure 
                the safety and well-being of all clients.
              </p>
            </div>
          </label>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              name="termsAccepted"
              checked={formData.termsAccepted}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              required
            />
            <div>
              <span className="text-sm font-medium text-gray-900">Terms & Conditions *</span>
              <p className="text-sm text-gray-600 mt-1">
                I have read and agree to the ElderX Terms of Service, Privacy Policy, and 
                Caregiver Code of Conduct. I understand my responsibilities as a healthcare provider.
              </p>
            </div>
          </label>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Award className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900">Next Steps</h4>
            <p className="text-sm text-blue-700 mt-1">
              After completing onboarding, you'll have access to your caregiver dashboard where you can 
              view assigned clients, manage your schedule, and track your performance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  if (!user || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <UserCheck className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Caregiver Onboarding</h1>
          <p className="text-gray-600">Complete your profile to start providing care</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Step {currentStep} of 4</span>
            <span className="text-sm text-gray-500">{Math.round((currentStep / 4) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`flex items-center px-4 py-2 rounded-lg font-medium ${
                currentStep === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </button>

            {currentStep < 4 ? (
              <button
                onClick={nextStep}
                disabled={!validateStep(currentStep)}
                className={`flex items-center px-6 py-2 rounded-lg font-medium ${
                  validateStep(currentStep)
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !validateStep(4)}
                className={`flex items-center px-6 py-2 rounded-lg font-medium ${
                  !loading && validateStep(4)
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Completing...
                  </>
                ) : (
                  <>
                    Complete Onboarding
                    <CheckCircle className="h-4 w-4 ml-2" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaregiverOnboarding;
