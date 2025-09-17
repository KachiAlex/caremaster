import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { caregiverAPI } from '../api/caregiverAPI';
import { toast } from 'react-toastify';
import { 
  Heart, 
  Mail, 
  Lock, 
  User, 
  Stethoscope,
  Shield,
  Phone,
  MapPin,
  Calendar,
  Award,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

const CaregiverSignup = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    // Step 1: Account Creation
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    
    // Step 2: Personal Information
    phone: '',
    address: '',
    dateOfBirth: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    
    // Step 3: Medical Qualifications
    medicalQualification: '',
    licenseNumber: '',
    licensingBoard: '',
    licenseExpiry: '',
    yearsOfExperience: '',
    specializations: [],
    hourlyRate: '',
    
    // Step 4: Health Screening
    hasDisabilities: false,
    disabilityDetails: '',
    hasHealthConditions: false,
    healthConditionDetails: '',
    hasMentalHealthHistory: false,
    mentalHealthDetails: '',
    takingMedications: false,
    medicationDetails: '',
    hasAllergies: false,
    allergyDetails: '',
    hasConvictions: false,
    convictionDetails: '',
    
    // Step 5: Consents
    backgroundCheckConsent: false,
    drugTestConsent: false,
    medicalExamConsent: false,
    termsConsent: false
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
      setForm(prev => ({ ...prev, [name]: checked }));
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
        return form.displayName && form.email && form.password && 
               form.password === form.confirmPassword && form.password.length >= 6;
      case 2:
        return form.phone && form.address && form.dateOfBirth && 
               form.emergencyContactName && form.emergencyContactPhone;
      case 3:
        return form.medicalQualification && form.yearsOfExperience && 
               form.specializations.length > 0 && form.hourlyRate;
      case 4:
        return true; // Health screening is optional
      case 5:
        return form.backgroundCheckConsent && form.drugTestConsent && 
               form.medicalExamConsent && form.termsConsent;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    } else {
      toast.error('Please fill in all required fields');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(5)) {
      toast.error('Please complete all required fields and consents');
      return;
    }

    setLoading(true);
    try {
      // 1. Create Firebase Auth user
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password);
      
      await updateProfile(user, {
        displayName: form.displayName
      });

      // 2. Create user document directly in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        name: form.displayName,
        displayName: form.displayName,
        email: form.email,
        phone: form.phone,
        address: form.address,
        dateOfBirth: form.dateOfBirth,
        userType: 'caregiver',
        type: 'caregiver',
        onboardingComplete: true, // Mark as complete since we're doing it all here
        isActive: true,
        createdAt: new Date(),
        joinDate: new Date(),
        lastActive: new Date(),
        ...form
      });

      // 3. Create caregiver profile directly
      await setDoc(doc(db, 'caregivers', user.uid), {
        id: user.uid,
        name: form.displayName,
        displayName: form.displayName,
        email: form.email,
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
        updatedAt: new Date(),
        isVerified: true,
        userType: 'caregiver',
        status: 'active',
        hourlyRate: parseFloat(form.hourlyRate) || 50,
        languages: ['English'],
        licenseNumber: form.licenseNumber,
        licensingBoard: form.licensingBoard,
        licenseExpiry: form.licenseExpiry,
        ...form
      });

      toast.success('Caregiver account created successfully!');
      
      // 4. Direct redirect to caregiver dashboard
      window.location.replace('/caregiver');
      
    } catch (error) {
      console.error('Caregiver signup error:', error);
      let errorMessage = 'Failed to create caregiver account';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters';
          break;
        default:
          errorMessage = error.message || 'An unexpected error occurred';
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Account', icon: User },
    { number: 2, title: 'Personal Info', icon: Phone },
    { number: 3, title: 'Medical Qualifications', icon: Stethoscope },
    { number: 4, title: 'Health Screening', icon: Heart },
    { number: 5, title: 'Consents', icon: Shield }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-blue-100 rounded-2xl">
              <Stethoscope className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Join as a Healthcare Professional</h1>
          <p className="text-gray-600 mt-2">Complete registration and professional verification</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                    currentStep >= step.number 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    <step.icon size={20} />
                  </div>
                  <span className={`text-sm mt-2 text-center ${
                    currentStep >= step.number ? 'text-blue-600 font-medium' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    currentStep > step.number ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow p-8">
          
          {/* Step 1: Account Creation */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">Create Your Account</h2>
                <p className="text-gray-600">Set up your caregiver account credentials</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    name="displayName"
                    value={form.displayName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Create a password"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Confirm your password"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Personal Information */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">Personal Information</h2>
                <p className="text-gray-600">Tell us about yourself</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              </div>
            </div>
          )}

          {/* Step 3: Medical Qualifications */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">Medical Qualifications</h2>
                <p className="text-gray-600">Your professional credentials and experience</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Medical Qualification *</label>
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
              </div>

              {/* Specializations */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Specializations * (Select at least one)</label>
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
            </div>
          )}

          {/* Step 4: Health Screening */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">Health Screening</h2>
                <p className="text-gray-600">Confidential health assessment</p>
              </div>

              <div className="space-y-6">
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
              </div>
            </div>
          )}

          {/* Step 5: Consents */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">Required Consents</h2>
                <p className="text-gray-600">Legal requirements for healthcare professionals</p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    key: 'backgroundCheckConsent',
                    label: 'Background Check Consent',
                    description: 'I consent to a comprehensive background check including criminal history and employment verification.'
                  },
                  {
                    key: 'drugTestConsent',
                    label: 'Drug Test Consent',
                    description: 'I consent to drug and alcohol testing as required for healthcare positions.'
                  },
                  {
                    key: 'medicalExamConsent',
                    label: 'Medical Examination Consent',
                    description: 'I consent to a medical examination to verify my fitness for providing healthcare services.'
                  },
                  {
                    key: 'termsConsent',
                    label: 'Terms and Conditions',
                    description: 'I agree to the ElderX terms of service and privacy policy for healthcare professionals.'
                  }
                ].map((consent) => (
                  <label key={consent.key} className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
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
                      <p className="text-xs text-gray-600 mt-1">{consent.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Final Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h4 className="font-semibold text-green-800 mb-3">Ready to Join ElderX</h4>
                <div className="text-sm text-green-700 space-y-1">
                  <p><strong>Name:</strong> {form.displayName}</p>
                  <p><strong>Qualification:</strong> {form.medicalQualification}</p>
                  <p><strong>Experience:</strong> {form.yearsOfExperience} years</p>
                  <p><strong>Specializations:</strong> {form.specializations.join(', ')}</p>
                  <p><strong>Rate:</strong> ${form.hourlyRate}/hour</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft size={20} className="mr-2" />
              Previous
            </button>

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={!validateStep(currentStep)}
                className="flex items-center px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ArrowRight size={20} className="ml-2" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !validateStep(5)}
                className="flex items-center px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Creating Account...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} className="mr-2" />
                    Complete Registration
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Back to regular signup */}
        <div className="text-center mt-6">
          <a
            href="/signup"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            ← Back to regular signup
          </a>
        </div>
      </div>
    </div>
  );
};

export default CaregiverSignup;
