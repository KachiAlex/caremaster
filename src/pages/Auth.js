import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { toast } from 'react-toastify';
import { 
  Heart, 
  Mail, 
  Lock, 
  User, 
  Stethoscope,
  UserCheck,
  Phone,
  MapPin,
  Calendar,
  Award,
  Shield,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff
} from 'lucide-react';

const Auth = () => {
  const [mode, setMode] = useState('signin'); // 'signin', 'signup-patient', 'signup-caregiver'
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Login form
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  // Unified signup/onboarding form
  const [form, setForm] = useState({
    // Account
    email: '',
    password: '',
    confirmPassword: '',
    
    // Personal Info
    name: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    
    // Patient-specific
    medicalConditions: '',
    medications: '',
    allergies: '',
    
    // Caregiver-specific
    medicalQualification: '',
    licenseNumber: '',
    yearsOfExperience: '',
    specializations: [],
    hourlyRate: '',
    hasDisabilities: '',
    disabilityDetails: '',
    hasHealthConditions: '',
    healthConditionDetails: '',
    backgroundCheckConsent: false,
    drugTestConsent: false
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

  const caregiverSpecializations = [
    'General Care', 'Medication Management', 'Wound Care', 'Physical Therapy',
    'Vital Signs Monitoring', 'Meal Preparation', 'Companionship', 'Transportation',
    'Housekeeping', 'Emergency Response', 'Dementia Care', 'Diabetes Management'
  ];

  const handleLoginChange = (e) => {
    setLoginForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

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

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      toast.success('Welcome back!');
      // Let the app handle routing based on user type
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Patient signup validation
  const validatePatientStep = (step) => {
    switch (step) {
      case 1: return form.email && form.password && form.password === form.confirmPassword && form.password.length >= 6;
      case 2: return form.name && form.phone && form.address && form.dateOfBirth;
      case 3: return form.emergencyContactName && form.emergencyContactPhone;
      default: return true;
    }
  };

  // Caregiver signup validation
  const validateCaregiverStep = (step) => {
    switch (step) {
      case 1: return form.email && form.password && form.password === form.confirmPassword && form.password.length >= 6;
      case 2: return form.name && form.phone && form.address && form.dateOfBirth;
      case 3: return form.medicalQualification && form.yearsOfExperience && form.specializations.length > 0;
      case 4: return form.hasDisabilities && form.hasHealthConditions && form.backgroundCheckConsent && form.drugTestConsent;
      default: return true;
    }
  };

  const nextStep = () => {
    const isValid = mode === 'signup-patient' ? validatePatientStep(currentStep) : validateCaregiverStep(currentStep);
    if (isValid) {
      setCurrentStep(prev => prev + 1);
    } else {
      toast.error('Please fill in all required fields');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  // Complete signup for patients
  const completePatientSignup = async () => {
    setLoading(true);
    try {
      // Create Firebase Auth user
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(user, { displayName: form.name });

      // Create complete user profile
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        name: form.name,
        displayName: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        dateOfBirth: form.dateOfBirth,
        emergencyContactName: form.emergencyContactName,
        emergencyContactPhone: form.emergencyContactPhone,
        medicalConditions: form.medicalConditions,
        medications: form.medications,
        allergies: form.allergies,
        userType: 'elderly',
        type: 'elderly',
        onboardingComplete: true,
        onboardingProfileComplete: true,
        onboardingMedicalComplete: true,
        isActive: true,
        createdAt: new Date(),
        joinDate: new Date(),
        lastActive: new Date()
      });

      toast.success('Patient account created successfully!');
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Patient signup error:', error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  // Complete signup for caregivers
  const completeCaregiverSignup = async () => {
    setLoading(true);
    try {
      // Create Firebase Auth user
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(user, { displayName: form.name });

      // Create complete user profile
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        name: form.name,
        displayName: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        dateOfBirth: form.dateOfBirth,
        emergencyContactName: form.emergencyContactName,
        emergencyContactPhone: form.emergencyContactPhone,
        medicalQualification: form.medicalQualification,
        licenseNumber: form.licenseNumber,
        yearsOfExperience: form.yearsOfExperience,
        specializations: form.specializations,
        hourlyRate: form.hourlyRate,
        hasDisabilities: form.hasDisabilities,
        disabilityDetails: form.disabilityDetails,
        hasHealthConditions: form.hasHealthConditions,
        healthConditionDetails: form.healthConditionDetails,
        userType: 'caregiver',
        type: 'caregiver',
        onboardingComplete: true,
        isActive: true,
        createdAt: new Date(),
        joinDate: new Date(),
        lastActive: new Date()
      });

      // Create caregiver profile
      await setDoc(doc(db, 'caregivers', user.uid), {
        id: user.uid,
        name: form.name,
        displayName: form.name,
        email: form.email,
        phone: form.phone,
        location: form.address,
        specializations: form.specializations,
        medicalQualification: form.medicalQualification,
        rating: 4.5,
        totalPatients: 0,
        experience: parseInt(form.yearsOfExperience) || 1,
        bio: `${form.medicalQualification} with ${form.yearsOfExperience} years of experience`,
        status: 'active',
        hourlyRate: parseFloat(form.hourlyRate) || 50,
        licenseNumber: form.licenseNumber,
        joinDate: new Date(),
        lastActive: new Date(),
        createdAt: new Date(),
        isVerified: true,
        userType: 'caregiver'
      });

      toast.success('Caregiver account created successfully!');
      window.location.href = '/caregiver';
    } catch (error) {
      console.error('Caregiver signup error:', error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    if (mode === 'signin') return 'Welcome Back';
    if (mode === 'signup-patient') {
      const steps = ['Create Account', 'Personal Info', 'Medical Info'];
      return steps[currentStep - 1] || 'Complete';
    }
    if (mode === 'signup-caregiver') {
      const steps = ['Create Account', 'Personal Info', 'Medical Qualifications', 'Health Screening'];
      return steps[currentStep - 1] || 'Complete';
    }
    return 'Authentication';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-100 rounded-2xl">
              <Heart className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">ElderX</h2>
          <p className="text-gray-600 mt-2">{getStepTitle()}</p>
        </div>

        {/* Mode Selection */}
        {mode === 'signin' && (
          <div className="space-y-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setMode('signin')}
                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium"
              >
                Sign In
              </button>
              <button
                onClick={() => setMode('signup-patient')}
                className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
              >
                Patient Signup
              </button>
              <button
                onClick={() => setMode('signup-caregiver')}
                className="flex-1 py-3 px-4 bg-green-200 text-green-700 rounded-lg font-medium hover:bg-green-300"
              >
                Caregiver Signup
              </button>
            </div>
          </div>
        )}

        {/* Login Form */}
        {mode === 'signin' && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                name="email"
                type="email"
                value={loginForm.email}
                onChange={handleLoginChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Patient Signup */}
        {mode === 'signup-patient' && (
          <div className="space-y-6">
            {/* Back button */}
            <button
              onClick={() => { setMode('signin'); setCurrentStep(1); }}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft size={16} className="mr-1" />
              Back to Sign In
            </button>

            {/* Step 1: Account */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">Create Patient Account</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    name="email"
                    type="email"
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
                    name="password"
                    type="password"
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
                    name="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Confirm your password"
                    required
                  />
                </div>
              </div>
            )}

            {/* Step 2: Personal Info */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">Personal Information</h3>
                
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                  <input
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Your address"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                  <input
                    name="dateOfBirth"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
            )}

            {/* Step 3: Patient Medical Info */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">Medical Information</h3>
                
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Medical Conditions</label>
                  <textarea
                    name="medicalConditions"
                    value={form.medicalConditions}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="List any medical conditions (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Medications</label>
                  <textarea
                    name="medications"
                    value={form.medications}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="List current medications (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Allergies</label>
                  <input
                    name="allergies"
                    value={form.allergies}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="List any allergies (optional)"
                  />
                </div>
              </div>
            )}

            {/* Patient Navigation */}
            <div className="flex justify-between">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!validatePatientStep(currentStep)}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={completePatientSignup}
                  disabled={loading || !validatePatientStep(3)}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Creating Account...' : 'Complete Registration'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Caregiver Signup */}
        {mode === 'signup-caregiver' && (
          <div className="space-y-6">
            {/* Back button */}
            <button
              onClick={() => { setMode('signin'); setCurrentStep(1); }}
              className="flex items-center text-green-600 hover:text-green-800"
            >
              <ArrowLeft size={16} className="mr-1" />
              Back to Sign In
            </button>

            {/* Step 1: Account */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">Create Caregiver Account</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    name="email"
                    type="email"
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
                    name="password"
                    type="password"
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
                    name="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Confirm your password"
                    required
                  />
                </div>
              </div>
            )}

            {/* Step 2: Personal Info */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">Personal Information</h3>
                
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                  <input
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Your address"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                  <input
                    name="dateOfBirth"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Phone *</label>
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
            )}

            {/* Step 3: Caregiver Medical Qualifications */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">Medical Qualifications</h3>
                
                <div>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Specializations * (Select at least one)</label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {caregiverSpecializations.map((spec) => (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => handleSpecializationToggle(spec)}
                        className={`p-2 text-xs rounded border-2 transition-colors ${
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
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">Health Screening</h3>
                <p className="text-sm text-gray-600">
                  This information helps us ensure the safety of both caregivers and patients. 
                  All information is kept confidential and used only for care planning purposes.
                </p>
                
                <div className="space-y-6">
                  {/* Disabilities Question */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">Do you have any disabilities?</p>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="hasDisabilities"
                          value="no"
                          checked={form.hasDisabilities === 'no'}
                          onChange={handleChange}
                          className="h-4 w-4 text-blue-600 border-gray-300"
                        />
                        <span className="text-sm text-gray-700">No</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="hasDisabilities"
                          value="yes"
                          checked={form.hasDisabilities === 'yes'}
                          onChange={handleChange}
                          className="h-4 w-4 text-blue-600 border-gray-300"
                        />
                        <span className="text-sm text-gray-700">Yes</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="hasDisabilities"
                          value="prefer-not-to-say"
                          checked={form.hasDisabilities === 'prefer-not-to-say'}
                          onChange={handleChange}
                          className="h-4 w-4 text-blue-600 border-gray-300"
                        />
                        <span className="text-sm text-gray-700">Prefer not to say</span>
                      </label>
                    </div>
                    
                    {form.hasDisabilities === 'yes' && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Please specify your disabilities (optional):
                        </label>
                        <textarea
                          name="disabilityDetails"
                          value={form.disabilityDetails}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows="3"
                          placeholder="Please describe any disabilities that may affect your ability to provide care..."
                        />
                      </div>
                    )}
                  </div>

                  {/* Health Conditions Question */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">Do you have any health conditions?</p>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="hasHealthConditions"
                          value="no"
                          checked={form.hasHealthConditions === 'no'}
                          onChange={handleChange}
                          className="h-4 w-4 text-blue-600 border-gray-300"
                        />
                        <span className="text-sm text-gray-700">No</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="hasHealthConditions"
                          value="yes"
                          checked={form.hasHealthConditions === 'yes'}
                          onChange={handleChange}
                          className="h-4 w-4 text-blue-600 border-gray-300"
                        />
                        <span className="text-sm text-gray-700">Yes</span>
                      </label>
                    </div>
                    
                    {form.hasHealthConditions === 'yes' && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Please describe your health conditions:
                        </label>
                        <textarea
                          name="healthConditionDetails"
                          value={form.healthConditionDetails}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows="3"
                          placeholder="Please list any health conditions that may affect your ability to provide care..."
                          required={form.hasHealthConditions === 'yes'}
                        />
                      </div>
                    )}
                  </div>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="backgroundCheckConsent"
                      checked={form.backgroundCheckConsent}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      required
                    />
                    <span className="text-sm text-gray-700">I consent to background check *</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="drugTestConsent"
                      checked={form.drugTestConsent}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      required
                    />
                    <span className="text-sm text-gray-700">I consent to drug testing *</span>
                  </label>
                </div>
              </div>
            )}

            {/* Caregiver Navigation */}
            <div className="flex justify-between">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!validateCaregiverStep(currentStep)}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={completeCaregiverSignup}
                  disabled={loading || !validateCaregiverStep(4)}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Creating Account...' : 'Complete Registration'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
