import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase/config';
import { toast } from 'react-toastify';
import { Heart, Mail, Lock, User, UserCheck, Shield, X } from 'lucide-react';

const Login = () => {
  const [activeTab, setActiveTab] = useState('signin'); // 'signin' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [userRole, setUserRole] = useState('patient'); // 'patient' or 'caregiver'
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Welcome back!');
      
      // Navigate based on user role
      if (userRole === 'caregiver') {
        navigate('/caregiver');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // More specific error messages
      let errorMessage = 'An error occurred during login';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password. Please check your credentials.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password login is not enabled. Please contact support.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        default:
          errorMessage = error.message || 'An unexpected error occurred';
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { user } = await createUserWithEmailAndPassword(
        auth, 
        email, 
        password
      );
      
      await updateProfile(user, {
        displayName: displayName
      });

      toast.success('Account created successfully!');
      
      // Navigate based on user type
      if (userRole === 'caregiver') {
        navigate('/caregiver');
      } else {
        navigate('/dashboard');
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
            Welcome to ElderX
          </h2>
          <p className="text-gray-600 text-lg">
            Your trusted health companion
          </p>
        </div>
        
        <div className="card">
          {/* Tab Navigation */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setActiveTab('signin')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'signin'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'signup'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Sign In Form */}
          {activeTab === 'signin' && (
            <form className="space-y-6" onSubmit={handleSignIn}>
            {/* Role Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">I am a:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUserRole('patient')}
                  className={`flex items-center justify-center p-3 rounded-lg border-2 transition-colors ${
                    userRole === 'patient'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <User className="h-5 w-5 mr-2" />
                  Patient
                </button>
                <button
                  type="button"
                  onClick={() => setUserRole('caregiver')}
                  className={`flex items-center justify-center p-3 rounded-lg border-2 transition-colors ${
                    userRole === 'caregiver'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <UserCheck className="h-5 w-5 mr-2" />
                  Caregiver
                </button>
              </div>
            </div>

            <div className="space-y-4">
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  autoComplete="current-password"
                  required
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </div>

              <div className="text-center space-y-2">
                <div className="text-sm text-gray-500">
                  <p>Demo Account:</p>
                  <p>Email: demo@elderx.com | Password: demo123</p>
                </div>
              </div>
            </form>
          )}

          {/* Sign Up Form */}
          {activeTab === 'signup' && (
            <form className="space-y-6" onSubmit={handleSignUp}>
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
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              {/* Role Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">I am a:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setUserRole('patient')}
                    className={`flex items-center justify-center p-3 rounded-lg border-2 transition-colors ${
                      userRole === 'patient'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <User className="h-5 w-5 mr-2" />
                    Patient
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserRole('caregiver')}
                    className={`flex items-center justify-center p-3 rounded-lg border-2 transition-colors ${
                      userRole === 'caregiver'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <UserCheck className="h-5 w-5 mr-2" />
                    Caregiver
                  </button>
                </div>
              </div>

              <div className="space-y-4">
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;