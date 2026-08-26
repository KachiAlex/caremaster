import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'backend/auth';
import { httpsCallable, getFunctions } from 'backend/functions';
import { auth } from '../backend/config';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import authManager from '../utils/authManager';

const SuperAdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // Sign in with email and password using role-specific auth
      const userCredential = await authManager.signInWithRole(email, password, 'super-admin');
      const user = userCredential.user;

      // Check if user has super-admin claim or super-admin userType
      const token = await user.getIdTokenResult();
      const hasSuperAdminClaim = token?.claims?.superAdmin === true;
      const isSuperAdminByUserType = user.userType === 'super-admin' || user.user_type === 'super-admin';

      if (hasSuperAdminClaim || isSuperAdminByUserType) {
        toast.success('Welcome, Super Admin!');
        window.location.href = '/super-admin/dashboard';
      } else {
        // Try to set super-admin claim if user is an admin
        try {
          const functions = getFunctions();
          const setSuperAdminClaim = httpsCallable(functions, 'setSuperAdminClaim');
          await setSuperAdminClaim({ userId: user.uid });

          // Refresh token to get updated claims
          await user.getIdToken(true);
          toast.success('Super-admin privileges granted!');
          window.location.href = '/super-admin/dashboard';
        } catch (claimError) {
          console.error('Error setting super-admin claim:', claimError);
          toast.error('Access denied. Super-admin privileges required.');
          await authManager.signOutFromRole('super-admin');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Super Admin Access
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access the licensing management platform
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/admin/login')}
              className="text-sm text-gray-600 hover:text-gray-500"
            >
              Back to Admin Login
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Super Admin Access
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>This area is restricted to super administrators only. You must have admin privileges to access the licensing management platform.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
