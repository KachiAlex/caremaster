import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Shield,
  Users,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Building2,
  Mail,
  Calendar,
  AlertTriangle,
  Download,
  CheckSquare,
  Square
} from 'lucide-react';
import { exportToCSV, exportToExcel, formatDateForExport } from '../services/exportService';
import FontSizeToggle from '../components/FontSizeToggle';
import { collection, query, getDocs, updateDoc, deleteDoc, orderBy, limit, doc } from 'backend/database';
import { db } from '../backend/config';

const SuperAdminUserManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState(new Set());

  // Filters
  const [filters, setFilters] = useState({
    userType: '',
    role: '',
    institutionId: '',
    active: '',
    isSuperAdmin: ''
  });

  // User types for filter
  const userTypes = ['admin', 'caregiver', 'doctor', 'nurse', 'pharmacist', 'elderly', 'client'];
  const roles = ['super-admin', 'admin', 'caregiver', 'doctor', 'nurse', 'pharmacist', 'elderly', 'client'];

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filters, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      const usersSnapshot = await getDocs(
        query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(500))
      );
      
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));
      
      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
      setMessage('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.email?.toLowerCase().includes(searchLower) ||
        user.displayName?.toLowerCase().includes(searchLower) ||
        user.name?.toLowerCase().includes(searchLower) ||
        user.id?.toLowerCase().includes(searchLower) ||
        user.institutionId?.toLowerCase().includes(searchLower)
      );
    }

    // User type filter
    if (filters.userType) {
      filtered = filtered.filter(user => 
        user.userType === filters.userType || 
        user.type === filters.userType
      );
    }

    // Role filter
    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    // Institution filter
    if (filters.institutionId) {
      filtered = filtered.filter(user => user.institutionId === filters.institutionId);
    }

    // Active filter
    if (filters.active !== '') {
      const isActive = filters.active === 'true';
      filtered = filtered.filter(user => (user.active !== false) === isActive);
    }

    // Super admin filter
    if (filters.isSuperAdmin !== '') {
      const isSuperAdmin = filters.isSuperAdmin === 'true';
      filtered = filtered.filter(user => user.isSuperAdmin === isSuperAdmin);
    }

    setFilteredUsers(filtered);
  };

  const handleToggleActive = async (user) => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        active: user.active !== false ? false : true,
        updatedAt: new Date()
      });
      
      setMessage(`User ${user.active !== false ? 'deactivated' : 'activated'} successfully`);
      loadUsers();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error toggling user status:', error);
      setMessage('Failed to update user status');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user ${user.email}? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete user document
      await deleteDoc(doc(db, 'users', user.id));
      
      // Note: User auth account should be deleted via Cloud Function for security
      setMessage(`User ${user.email} deleted successfully`);
      loadUsers();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting user:', error);
      setMessage('Failed to delete user');
    }
  };

  const handleSelectUser = (id) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAllUsers = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleBulkActivateUsers = async () => {
    if (selectedUsers.size === 0) return;
    if (!window.confirm(`Activate ${selectedUsers.size} user(s)?`)) return;

    setLoading(true);
    setMessage('');
    let success = 0;
    let failed = 0;

    try {
      for (const id of selectedUsers) {
        try {
          const userRef = doc(db, 'users', id);
          await updateDoc(userRef, { active: true, updatedAt: new Date() });
          success++;
        } catch (error) {
          failed++;
          console.error(`Failed to activate user ${id}:`, error);
        }
      }
      setMessage(`Activated ${success} user(s)${failed > 0 ? `, ${failed} failed` : ''}`);
      loadUsers();
      setSelectedUsers(new Set());
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Bulk operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeactivateUsers = async () => {
    if (selectedUsers.size === 0) return;
    if (!window.confirm(`Deactivate ${selectedUsers.size} user(s)?`)) return;

    setLoading(true);
    setMessage('');
    let success = 0;
    let failed = 0;

    try {
      for (const id of selectedUsers) {
        try {
          const userRef = doc(db, 'users', id);
          await updateDoc(userRef, { active: false, updatedAt: new Date() });
          success++;
        } catch (error) {
          failed++;
          console.error(`Failed to deactivate user ${id}:`, error);
        }
      }
      setMessage(`Deactivated ${success} user(s)${failed > 0 ? `, ${failed} failed` : ''}`);
      loadUsers();
      setSelectedUsers(new Set());
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Bulk operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeleteUsers = async () => {
    if (selectedUsers.size === 0) return;
    if (!window.confirm(`Delete ${selectedUsers.size} user(s)? This cannot be undone!`)) return;

    setLoading(true);
    setMessage('');
    let success = 0;
    let failed = 0;

    try {
      for (const id of selectedUsers) {
        try {
          await deleteDoc(doc(db, 'users', id));
          success++;
        } catch (error) {
          failed++;
          console.error(`Failed to delete user ${id}:`, error);
        }
      }
      setMessage(`Deleted ${success} user(s)${failed > 0 ? `, ${failed} failed` : ''}`);
      loadUsers();
      setSelectedUsers(new Set());
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Bulk delete failed');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      userType: '',
      role: '',
      institutionId: '',
      active: '',
      isSuperAdmin: ''
    });
    setSearchTerm('');
  };

  const getUserTypeBadge = (user) => {
    if (user.isSuperAdmin) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Super Admin</span>;
    }
    if (user.institutionAdmin) {
      return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Institution Admin</span>;
    }
    const type = user.userType || user.type || user.role || 'user';
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      caregiver: 'bg-green-100 text-green-800',
      doctor: 'bg-blue-100 text-blue-800',
      nurse: 'bg-indigo-100 text-indigo-800',
      pharmacist: 'bg-yellow-100 text-yellow-800',
      elderly: 'bg-gray-100 text-gray-800',
      client: 'bg-gray-100 text-gray-800'
    };
    return (
      <span className={`px-2 py-1 text-xs rounded ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/super-admin/dashboard')}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <Users className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                <p className="text-sm text-gray-600">Manage all platform users</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <FontSizeToggle />
              <div className="relative group">
                <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => {
                      try {
                        const usersData = filteredUsers.map(u => ({
                          Email: u.email || '',
                          'Display Name': u.displayName || u.name || '',
                          'User Type': u.userType || u.type || '',
                          Role: u.role || '',
                          'Institution ID': u.institutionId || '',
                          Status: u.active !== false ? 'Active' : 'Inactive',
                          'Is Super Admin': u.isSuperAdmin ? 'Yes' : 'No',
                          'Created': formatDateForExport(u.createdAt)
                        }));
                        exportToCSV(usersData, `users-${new Date().toISOString().split('T')[0]}`);
                        setMessage('Users exported to CSV successfully');
                        setTimeout(() => setMessage(''), 3000);
                      } catch (error) {
                        setMessage('Failed to export users');
                      }
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
                  >
                    Export Users (CSV)
                  </button>
                  <button
                    onClick={() => {
                      try {
                        const usersData = filteredUsers.map(u => ({
                          Email: u.email || '',
                          'Display Name': u.displayName || u.name || '',
                          'User Type': u.userType || u.type || '',
                          Role: u.role || '',
                          'Institution ID': u.institutionId || '',
                          Status: u.active !== false ? 'Active' : 'Inactive',
                          'Is Super Admin': u.isSuperAdmin ? 'Yes' : 'No',
                          'Created': formatDateForExport(u.createdAt)
                        }));
                        exportToExcel(usersData, `users-${new Date().toISOString().split('T')[0]}`, null, 'Users');
                        setMessage('Users exported to Excel successfully');
                        setTimeout(() => setMessage(''), 3000);
                      } catch (error) {
                        setMessage('Failed to export users');
                      }
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-b-lg"
                  >
                    Export Users (Excel)
                  </button>
                </div>
              </div>
              <button
                onClick={loadUsers}
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
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('success') || message.includes('successfully')
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message}
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by email, name, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {(filters.userType || filters.role || filters.institutionId || filters.active !== '' || filters.isSuperAdmin !== '') && (
                <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                  Active
                </span>
              )}
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                <select
                  value={filters.userType}
                  onChange={(e) => setFilters({ ...filters, userType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  {userTypes.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={filters.role}
                  onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Roles</option>
                  {roles.map(role => (
                    <option key={role} value={role}>
                      {role.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.active}
                  onChange={(e) => setFilters({ ...filters, active: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Super Admin</label>
                <select
                  value={filters.isSuperAdmin}
                  onChange={(e) => setFilters({ ...filters, isSuperAdmin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Users</option>
                  <option value="true">Super Admins Only</option>
                  <option value="false">Non-Super Admins</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Institution ID</label>
                <input
                  type="text"
                  placeholder="Filter by institution ID..."
                  value={filters.institutionId}
                  onChange={(e) => setFilters({ ...filters, institutionId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results Count and Bulk Actions */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {filteredUsers.length} of {users.length} users
          </div>
          {selectedUsers.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedUsers.size} selected
              </span>
              <button
                onClick={handleBulkActivateUsers}
                disabled={loading}
                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
              >
                Activate
              </button>
              <button
                onClick={handleBulkDeactivateUsers}
                disabled={loading}
                className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 disabled:opacity-50"
              >
                Deactivate
              </button>
              <button
                onClick={handleBulkDeleteUsers}
                disabled={loading}
                className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedUsers(new Set())}
                className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {users.length === 0 ? 'No users found' : 'No users match your filters'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      <button
                        onClick={handleSelectAllUsers}
                        className="p-1 hover:bg-gray-200 rounded"
                        title="Select All"
                      >
                        {selectedUsers.size === filteredUsers.length && filteredUsers.length > 0 ? (
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type/Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Institution
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
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
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleSelectUser(user.id)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          {selectedUsers.has(user.id) ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="h-5 w-5 text-gray-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.displayName || user.name || 'Unnamed User'}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getUserTypeBadge(user)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.institutionId ? (
                          <div className="flex items-center text-sm text-gray-600">
                            <Building2 className="h-4 w-4 mr-1" />
                            {user.institutionId.substring(0, 8)}...
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No institution</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded ${
                          user.active !== false 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {user.createdAt?.toLocaleDateString() || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleToggleActive(user)}
                            className={`p-2 rounded-lg transition-colors ${
                              user.active !== false
                                ? 'text-yellow-600 hover:bg-yellow-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={user.active !== false ? 'Deactivate' : 'Activate'}
                          >
                            {user.active !== false ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </button>
                          {!user.isSuperAdmin && (
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="h-4 w-4" />
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
    </div>
  );
};

export default SuperAdminUserManagement;

