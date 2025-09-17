import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { updateUser } from '../api/usersAPI';
import { caregiverAPI } from '../api/caregiverAPI';
import { toast } from 'react-toastify';
import { 
  User, 
  Heart, 
  Brain, 
  Shield, 
  Award, 
  Stethoscope,
  FileText,
  Phone,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

const CaregiverOnboarding = () => {
  const navigate = useNavigate();
  const { user, userProfile, updateUserProfile } = useUser();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    // Personal Information
    name: userProfile?.name || userProfile?.displayName || user?.displayName || '',
    phone: userProfile?.phone || '',
    address: userProfile?.address || '',
    dateOfBirth: userProfile?.dateOfBirth || '',
    
    // Medical Qualifications
    medicalQualification: userProfile?.medicalQualification || '',
    licenseNumber: userProfile?.licenseNumber || '',
    licensingBoard: userProfile?.licensingBoard || '',
    licenseExpiry: userProfile?.licenseExpiry || '',
    yearsOfExperience: userProfile?.yearsOfExperience || '',
    specializations: userProfile?.specializations || [],
    
    // Medical History & Health Screening
    hasDisabilities: userProfile?.hasDisabilities || false,
    disabilityDetails: userProfile?.disabilityDetails || '',
    hasHealthConditions: userProfile?.hasHealthConditions || false,
    healthConditionDetails: userProfile?.healthConditionDetails || '',
    hasMentalHealthHistory: userProfile?.hasMentalHealthHistory || false,
    mentalHealthDetails: userProfile?.mentalHealthDetails || '',
    takingMedications: userProfile?.takingMedications || false,
    medicationDetails: userProfile?.medicationDetails || '',
    hasAllergies: userProfile?.hasAllergies || false,
    allergyDetails: userProfile?.allergyDetails || '',
    
    // Background & Consent
    hasConvictions: userProfile?.hasConvictions || false,
    convictionDetails: userProfile?.convictionDetails || '',
    backgroundCheckConsent: userProfile?.backgroundCheckConsent || false,
    drugTestConsent: userProfile?.drugTestConsent || false,
    medicalExamConsent: userProfile?.medicalExamConsent || false,
    
    // Professional Details
    hourlyRate: userProfile?.hourlyRate || '',
    availability: userProfile?.availability || {
      weekdays: false,
      weekends: false,
      evenings: false,
      nights: false
    },
    languages: userProfile?.languages || ['English'],
    
    // Emergency Contact
    emergencyContactName: userProfile?.emergencyContactName || '',
    emergencyContactPhone: userProfile?.emergencyContactPhone || '',
    emergencyContactRelation: userProfile?.emergencyContactRelation || ''
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
    'Personal Care Assistant',
    'Caregiver (Non-Medical)',
    'Other'
  ];

  const commonSpecializations = [
    'General Care',
    'Medication Management',
    'Wound Care',
    'Physical Therapy',
    'Vital Signs Monitoring',
    'Meal Preparation',
    'Companionship',
    'Transportation',
    'Housekeeping',
    'Emergency Response',
    'Dementia Care',
    'Diabetes Management',
    'Post-Surgery Care'
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      if (name.startsWith('availability.')) {
        const availabilityKey = name.split('.')[1];
        setForm(prev => ({
          ...prev,
          availability: {
            ...prev.availability,
            [availabilityKey]: checked
          }
        }));
      } else {
        setForm(prev => ({ ...prev, [name]: checked }));
      }
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSpecializationToggle = (specialization) => {
    setForm(prev => ({
      ...prev,
      specializations: prev.specializations.includes(specialization)
        ? prev.specializations.filter(s => s !== specialization)
        : [...prev.specializations, specialization]
    }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        return form.name && form.phone && form.address && form.dateOfBirth;
      case 2:
        return form.medicalQualification && form.yearsOfExperience && form.specializations.length > 0;
      case 3:
        return form.backgroundCheckConsent && form.drugTestConsent && form.medicalExamConsent;
      case 4:
        return form.hourlyRate && form.emergencyContactName && form.emergencyContactPhone;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    } else {
      toast.error('Please fill in all required fields');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!user?.uid) return;
    
    if (!validateStep(4)) {
      toast.error('Please complete all required fields');
      return;
    }

    setSaving(true);
    try {
      // Update user profile with all onboarding data
      await updateUser(user.uid, {
        ...form,
        userType: 'caregiver',
        onboardingComplete: true,
        onboardingCareerComplete: true,
        onboardingQualificationsComplete: true,
        onboardingReferencesComplete: true,
        onboardingDocumentsComplete: true,
        onboardingStatementComplete: true,
        status: 'active'
      });

      // Create caregiver profile in caregivers collection
      await caregiverAPI.createCaregiver({
        id: user.uid,
        name: form.name,
        displayName: form.name,
        email: user?.email,
        phone: form.phone,
        location: form.address,
        specializations: form.specializations,
        medicalQualification: form.medicalQualification,
        rating: 4.5,
        totalPatients: 0,
        experience: parseInt(form.yearsOfExperience) || 1,
        bio: `${form.medicalQualification} with ${form.yearsOfExperience} years of experience`,
        avatar: null,
        joinDate: new Date(),
        lastActive: new Date(),
        createdAt: new Date(),
        isVerified: true,
        userType: 'caregiver',
        hourlyRate: parseFloat(form.hourlyRate) || 50,
        availability: form.availability,
        languages: form.languages,
        licenseNumber: form.licenseNumber,
        licensingBoard: form.licensingBoard,
        licenseExpiry: form.licenseExpiry,
        ...form
      });

      // Update the caregiver to be active
      const caregiverResult = await caregiverAPI.updateCaregiver(user.uid, { status: 'active' });

      updateUserProfile({
        ...(userProfile || {}),
        ...form,
        onboardingComplete: true
      });

      toast.success('Caregiver profile created successfully!');
      navigate('/caregiver');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete onboarding. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { number: 1, title: 'Personal Info', icon: User },
    { number: 2, title: 'Medical Qualifications', icon: Stethoscope },
    { number: 3, title: 'Health Screening', icon: Heart },
    { number: 4, title: 'Final Details', icon: CheckCircle }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Caregiver Onboarding</h1>
          <p className="text-gray-600 mt-2">Complete your professional healthcare profile</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step) => (
              <div key={step.number} className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                  currentStep >= step.number 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  <step.icon size={20} />
                </div>
                <span className={`text-sm mt-2 ${
                  currentStep >= step.number ? 'text-blue-600 font-medium' : 'text-gray-400'
                }`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow p-8">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center mb-6">
                <User className="h-6 w-6 text-blue-600 mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900">Personal Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+234 xxx xxx xxxx"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                  <input
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Your full address"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={form.dateOfBirth}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience *</label>
                  <select
                    name="yearsOfExperience"
                    value={form.yearsOfExperience}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select experience</option>
                    <option value="0-1">0-1 years</option>
                    <option value="2-5">2-5 years</option>
                    <option value="6-10">6-10 years</option>
                    <option value="11-15">11-15 years</option>
                    <option value="16+">16+ years</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Medical Qualifications */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center mb-6">
                <Stethoscope className="h-6 w-6 text-blue-600 mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900">Medical Qualifications</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Medical Qualification *</label>
                  <select
                    name="medicalQualification"
                    value={form.medicalQualification}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
                  <input
                    name="licenseNumber"
                    value={form.licenseNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Professional license number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Licensing Board</label>
                  <input
                    name="licensingBoard"
                    value={form.licensingBoard}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., State Board of Nursing"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">License Expiry</label>
                  <input
                    type="date"
                    name="licenseExpiry"
                    value={form.licenseExpiry}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate ($) *</label>
                  <input
                    type="number"
                    name="hourlyRate"
                    value={form.hourlyRate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="50"
                    min="10"
                    max="500"
                    required
                  />
                </div>
              </div>

              {/* Specializations */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Specializations *</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {commonSpecializations.map((spec) => (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => handleSpecializationToggle(spec)}
                      className={`p-3 text-sm rounded-lg border-2 transition-colors ${
                        form.specializations.includes(spec)
                          ? 'bg-blue-100 border-blue-500 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries({
                    weekdays: 'Weekdays',
                    weekends: 'Weekends', 
                    evenings: 'Evenings',
                    nights: 'Nights'
                  }).map(([key, label]) => (
                    <label key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        name={`availability.${key}`}
                        checked={form.availability[key]}
                        onChange={handleChange}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded mr-2"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Health Screening */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center mb-6">
                <Heart className="h-6 w-6 text-red-600 mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900">Health Screening</h2>
              </div>

              <div className="space-y-6">
                {/* Health Questions */}
                {[
                  {
                    key: 'hasDisabilities',
                    label: 'Do you have any disabilities that may affect your ability to provide care?',
                    detailKey: 'disabilityDetails'
                  },
                  {
                    key: 'hasHealthConditions',
                    label: 'Do you have any chronic health conditions?',
                    detailKey: 'healthConditionDetails'
                  },
                  {
                    key: 'hasMentalHealthHistory',
                    label: 'Do you have any history of mental health conditions?',
                    detailKey: 'mentalHealthDetails'
                  },
                  {
                    key: 'takingMedications',
                    label: 'Are you currently taking any medications?',
                    detailKey: 'medicationDetails'
                  },
                  {
                    key: 'hasAllergies',
                    label: 'Do you have any allergies?',
                    detailKey: 'allergyDetails'
                  },
                  {
                    key: 'hasConvictions',
                    label: 'Have you ever been convicted of a crime?',
                    detailKey: 'convictionDetails'
                  }
                ].map((item) => (
                  <div key={item.key}>
                    <div className="flex items-center space-x-3 mb-2">
                      <input
                        type="checkbox"
                        name={item.key}
                        checked={form[item.key]}
                        onChange={handleChange}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                      <label className="text-sm font-medium text-gray-700">
                        {item.label}
                      </label>
                    </div>
                    {form[item.key] && (
                      <textarea
                        name={item.detailKey}
                        value={form[item.detailKey]}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-2"
                        placeholder="Please provide details..."
                      />
                    )}
                  </div>
                ))}

                {/* Required Consents */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-3">Required Consents</h4>
                  <div className="space-y-3">
                    {[
                      {
                        key: 'backgroundCheckConsent',
                        label: 'Background Check Consent',
                        description: 'I consent to a comprehensive background check'
                      },
                      {
                        key: 'drugTestConsent',
                        label: 'Drug Test Consent',
                        description: 'I consent to drug and alcohol testing'
                      },
                      {
                        key: 'medicalExamConsent',
                        label: 'Medical Examination Consent',
                        description: 'I consent to a medical examination'
                      }
                    ].map((consent) => (
                      <label key={consent.key} className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          name={consent.key}
                          checked={form[consent.key]}
                          onChange={handleChange}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-1"
                          required
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-700">{consent.label} *</span>
                          <p className="text-xs text-gray-600">{consent.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Final Details */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center mb-6">
                <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900">Final Details</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Name *</label>
                  <input
                    name="emergencyContactName"
                    value={form.emergencyContactName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Emergency contact name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Phone *</label>
                  <input
                    name="emergencyContactPhone"
                    value={form.emergencyContactPhone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+234 xxx xxx xxxx"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Relation to Emergency Contact</label>
                  <input
                    name="emergencyContactRelation"
                    value={form.emergencyContactRelation}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Spouse, Parent, Sibling"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="font-semibold text-blue-800 mb-3">Profile Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-700">Name:</span> {form.name}
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Qualification:</span> {form.medicalQualification}
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Experience:</span> {form.yearsOfExperience} years
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Specializations:</span> {form.specializations.join(', ')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={!validateStep(currentStep)}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || !validateStep(4)}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Creating Profile...' : 'Complete Onboarding'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaregiverOnboarding;
