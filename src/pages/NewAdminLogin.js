import React, { useState } from 'react';
import { Shield, Mail, Lock, Eye, EyeOff, Building } from 'lucide-react';
import { toast } from 'react-toastify';

const NewAdminLogin = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!credentials.email || !credentials.password) {
      toast.error('Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      // Simple admin authentication - for demo purposes
      // In production, this would validate against a secure admin database
      const validAdmins = [
        { email: 'admin@elderx.com', password: 'admin123' },
        { email: 'admin@test.com', password: 'admin123' },
        { email: credentials.email, password: credentials.password } // Allow any login for testing
      ];

      const isValidAdmin = validAdmins.some(admin => 
        admin.email === credentials.email && admin.password === credentials.password
      );

      if (isValidAdmin) {
        // Set admin session
        localStorage.setItem('elderx_admin_authenticated', 'true');
        localStorage.setItem('elderx_admin_email', credentials.email);
        localStorage.setItem('elderx_admin_timestamp', Date.now().toString());
        
        toast.success('Admin authentication successful!');
        
        // Direct navigation to admin dashboard
        window.location.href = '/admin/dashboard';
      } else {
        toast.error('Invalid admin credentials');
      }
    } catch (error) {
      console.error('Admin login error:', error);
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-white rounded-full">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">ElderX Admin Portal</h1>
          <p className="text-blue-200">Healthcare Management System</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-6">
            <Building className="h-12 w-12 text-blue-600 mx-auto mb-3" />
            <h2 className="text-2xl font-semibold text-gray-900">Administrator Login</h2>
            <p className="text-gray-600 mt-2">Access the healthcare management platform</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={credentials.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="admin@elderx.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={credentials.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter admin password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Authenticating...
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5 mr-2" />
                  Access Admin Dashboard
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Demo Credentials</h4>
            <p className="text-sm text-blue-700">
              Email: <code className="bg-blue-100 px-1 rounded">admin@elderx.com</code><br />
              Password: <code className="bg-blue-100 px-1 rounded">admin123</code>
            </p>
            <p className="text-xs text-blue-600 mt-2">
              Or use any email/password combination for testing
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-blue-200 text-sm">
            ElderX Healthcare Management Platform v2.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default NewAdminLogin;
