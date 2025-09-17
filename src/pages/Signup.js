import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase/config';
import { toast } from 'react-toastify';
import { Heart, Mail, Lock, User, UserCheck } from 'lucide-react';

const Signup = () => {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'patient'
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { user } = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      await updateProfile(user, {
        displayName: formData.displayName
      });

      // Create user profile in Firestore with proper userType
      const { createUser } = await import('../api/usersAPI');
      await createUser({
        id: user.uid,
        name: formData.displayName,
        displayName: formData.displayName,
        email: formData.email,
        userType: formData.userType === 'caregiver' ? 'caregiver' : 'elderly',
        type: formData.userType === 'caregiver' ? 'caregiver' : 'elderly', // Legacy field
        createdAt: new Date(),
        joinDate: new Date(),
        isActive: true,
        // EXPLICITLY set onboarding as incomplete for caregivers
        onboardingComplete: false,
        onboardingProfileComplete: false,
        onboardingMedicalComplete: false,
        // Add caregiver-specific incomplete flags
        onboardingCareerComplete: false,
        onboardingQualificationsComplete: false,
        onboardingReferencesComplete: false,
        onboardingDocumentsComplete: false,
        onboardingStatementComplete: false
      });

      toast.success('Account created successfully!');
      
      // IMMEDIATE direct navigation for caregivers - no delays, no guards
      if (formData.userType === 'caregiver') {
        // Force immediate redirect to caregiver onboarding
        window.location.replace('/caregiver/onboarding');
        return; // Stop execution here
      } else {
        // Wait for patients only
        await new Promise(resolve => setTimeout(resolve, 1000));
        navigate('/onboarding/profile');
      }
    } catch (error) {
      console.error('Signup error:', error);
      
      // More specific error messages
      let errorMessage = 'An error occurred during signup';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password signup is not enabled. Please contact support.';
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-100 rounded-2xl">
              <Heart className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Join ElderX
          </h2>
          <p className="text-gray-600 text-lg">
            Create your account to get started
          </p>
        </div>
        
        <div className="card">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="displayName" className="form-label">
                  <User className="inline h-4 w-4 mr-2" />
                  Full Name
                </label>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  required
                  className="form-input"
                  placeholder="Enter your full name"
                  value={formData.displayName}
                  onChange={handleChange}
                />
              </div>

              {/* Role Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">I am a:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, userType: 'patient'})}
                    className={`flex items-center justify-center p-3 rounded-lg border-2 transition-colors ${
                      formData.userType === 'patient'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <User className="h-5 w-5 mr-2" />
                    Patient
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, userType: 'caregiver'})}
                    className={`flex items-center justify-center p-3 rounded-lg border-2 transition-colors ${
                      formData.userType === 'caregiver'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <UserCheck className="h-5 w-5 mr-2" />
                    Caregiver
                  </button>
                </div>
              </div>
              
              <div>
                <label htmlFor="email" className="form-label">
                  <Mail className="inline h-4 w-4 mr-2" />
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="form-input"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label htmlFor="password" className="form-label">
                  <Lock className="inline h-4 w-4 mr-2" />
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="form-input"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="form-label">
                  <Lock className="inline h-4 w-4 mr-2" />
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="form-input"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>

            <div className="text-center space-y-2">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Sign in here
                </Link>
              </p>
              <p className="text-gray-600">
                Healthcare Professional?{' '}
                <Link to="/caregiver-signup" className="font-medium text-green-600 hover:text-green-500">
                  Join as a Caregiver →
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;