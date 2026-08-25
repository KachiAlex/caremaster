import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc } from 'backend/database';
import { httpsCallable } from 'backend/functions';
import { auth, db } from '../backend/config';
import { functions } from '../backend/config';
import { 
  ArrowLeft,
  Shield,
  Users,
  Lock,
  Trash2,
  RefreshCw,
  Key,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import FontSizeToggle from '../components/FontSizeToggle';

const SuperAdminManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [superAdmins, setSuperAdmins] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [deletingAdmin, setDeletingAdmin] = useState(false);

  useEffect(() => {
    loadSuperAdmins();
  }, []);

  const loadSuperAdmins = async () => {
    try {
      setLoading(true);
      
      // Load users with super admin role
      const usersSnapshot = await getDocs(
        query(collection(db, 'users'), where('isSuperAdmin', '==', true))
      );
      
      const admins = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setSuperAdmins(admins);
    } catch (error) {
      console.error('Error loading super admins:', error);
      setMessage('Failed to load super admin list');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedAdmin) return;
    
    if (!newPassword || newPassword.length < 6) {
      setMessage('Password must be at least 6 characters long');
      return;
    }

    setResettingPassword(true);
    setMessage('');

    try {
      // Call Firebase Cloud Function to reset password
      const resetPasswordFunction = httpsCallable(functions, 'resetSuperAdminPassword');
      const result = await resetPasswordFunction({
        userId: selectedAdmin.id,
        newPassword: newPassword
      });

      if (result.data.success) {
        setMessage(`Password reset successfully for ${selectedAdmin.email}`);
        setShowResetPassword(false);
        setNewPassword('');
        setSelectedAdmin(null);
        setTimeout(() => setMessage(''), 5000);
      } else {
        throw new Error(result.data.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      setMessage(`Failed to reset password: ${error.message}`);
    } finally {
      setResettingPassword(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return;

    // Prevent deleting yourself
    const currentUser = auth.currentUser;
    if (currentUser && selectedAdmin.id === currentUser.uid) {
      setMessage('You cannot delete your own account');
      setShowDeleteConfirm(false);
      return;
    }

    setDeletingAdmin(true);
    setMessage('');

    try {
      // Call Firebase Cloud Function to delete super admin
      const deleteAdminFunction = httpsCallable(functions, 'deleteSuperAdmin');
      const result = await deleteAdminFunction({
        userId: selectedAdmin.id
      });

      if (result.data.success) {
        setMessage(`Super admin ${selectedAdmin.email} deleted successfully`);
        setShowDeleteConfirm(false);
        setSelectedAdmin(null);
        loadSuperAdmins(); // Reload the list
        setTimeout(() => setMessage(''), 5000);
      } else {
        throw new Error(result.data.error || 'Failed to delete super admin');
      }
    } catch (error) {
      console.error('Error deleting super admin:', error);
      setMessage(`Failed to delete super admin: ${error.message}`);
    } finally {
      setDeletingAdmin(false);
    }
  };

  const filteredAdmins = superAdmins.filter(admin => {
    const searchLower = searchTerm.toLowerCase();
    return (
      admin.email?.toLowerCase().includes(searchLower) ||
      admin.displayName?.toLowerCase().includes(searchLower)
    );
  });

  const currentUser = auth.currentUser;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/super-admin/settings')}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <Shield className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Super Admin Management</h1>
                <p className="text-sm text-gray-600">Manage super admin accounts</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <FontSizeToggle />
              <button
                onClick={loadSuperAdmins}
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center ${
            message.includes('success') || message.includes('successfully')
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.includes('success') || message.includes('successfully') ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <XCircle className="h-5 w-5 mr-2" />
            )}
            <span>{message}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search super admins by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Super Admins List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading super admins...</p>
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm ? 'No super admins found matching your search' : 'No super admins found'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Super Admin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAdmins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Shield className="h-5 w-5 text-red-600 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {admin.displayName || 'Unnamed Admin'}
                          </span>
                          {currentUser && admin.id === currentUser.uid && (
                            <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{admin.email}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {admin.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setSelectedAdmin(admin);
                              setShowResetPassword(true);
                              setNewPassword('');
                            }}
                            className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            title="Reset Password"
                          >
                            <Key className="h-4 w-4 mr-1" />
                            Reset Password
                          </button>
                          {currentUser && admin.id !== currentUser.uid && (
                            <button
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setShowDeleteConfirm(true);
                              }}
                              className="flex items-center px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                              title="Delete Account"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Reset Password Modal */}
      {showResetPassword && selectedAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <Key className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Reset Password</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Reset password for <strong>{selectedAdmin.email}</strong>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  placeholder="Enter new password (min 6 characters)"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleResetPassword}
                disabled={resettingPassword || !newPassword}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {resettingPassword ? 'Resetting...' : 'Reset Password'}
              </button>
              <button
                onClick={() => {
                  setShowResetPassword(false);
                  setSelectedAdmin(null);
                  setNewPassword('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Delete Super Admin</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete the super admin account for <strong>{selectedAdmin.email}</strong>?
              This action cannot be undone.
            </p>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This will permanently delete the super admin account and remove all access.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleDeleteAdmin}
                disabled={deletingAdmin}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deletingAdmin ? 'Deleting...' : 'Delete Account'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedAdmin(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminManagement;

