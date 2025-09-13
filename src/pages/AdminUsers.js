import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  UserPlus, 
  Edit, 
  Trash2, 
  Eye,
  Shield,
  ShieldCheck,
  UserX,
  Mail,
  Phone,
  Download,
  RefreshCw,
  Star,
  Calendar,
  MapPin,
  Clock,
  TrendingUp,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { 
  getAllUsers, 
  getUserStats, 
  updateUserStatus, 
  deleteUser,
  subscribeToUsers 
} from '../api/usersAPI';
import { seedUsers } from '../api/seedData';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [stats, setStats] = useState({
    total: 0,
    elderly: 0,
    caregivers: 0,
    active: 0,
    inactive: 0
  });

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        
        // Load initial users data
        const usersData = await getAllUsers();
        setUsers(usersData);
        setFilteredUsers(usersData);
        
        // Load user statistics
        const statsData = await getUserStats();
        setStats(statsData);
        
        setLoading(false);
        toast.success('Users loaded successfully');
      } catch (error) {
        console.error('Error loading users:', error);
        toast.error('Failed to load users');
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  // Set up real-time listener for users
  useEffect(() => {
    const unsubscribe = subscribeToUsers((usersData) => {
      setUsers(usersData);
      // Update filtered users based on current search and filter
      let filtered = usersData;
      
      if (searchTerm) {
        filtered = filtered.filter(user =>
          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.phone?.includes(searchTerm)
        );
      }

      if (filterType !== 'all') {
        filtered = filtered.filter(user => user.type === filterType);
      }
      
      setFilteredUsers(filtered);
    });

    return () => unsubscribe();
  }, [searchTerm, filterType]);

  useEffect(() => {
    let filtered = users;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone.includes(searchTerm)
      );
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(user => user.type === filterType);
    }

    setFilteredUsers(filtered);
  }, [searchTerm, filterType, users]);

  const getUserTypeColor = (type) => {
    switch (type) {
      case 'elderly':
        return 'bg-blue-100 text-blue-800';
      case 'caregiver':
        return 'bg-green-100 text-green-800';
      case 'doctor':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleUserAction = async (action, user) => {
    setSelectedUser(user);
    
    try {
      switch (action) {
        case 'view':
          setShowUserModal(true);
          break;
        case 'edit':
          // TODO: Implement edit functionality
          toast.info('Edit functionality coming soon');
          break;
        case 'delete':
          if (window.confirm(`Are you sure you want to delete ${user.name}?`)) {
            await deleteUser(user.id);
            toast.success('User deleted successfully');
          }
          break;
        case 'suspend':
          const newStatus = user.status === 'active' ? 'suspended' : 'active';
          await updateUserStatus(user.id, newStatus);
          toast.success(`User ${newStatus === 'suspended' ? 'suspended' : 'activated'} successfully`);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error(`Error performing ${action} action:`, error);
      toast.error(`Failed to ${action} user`);
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const usersData = await getAllUsers();
      setUsers(usersData);
      setFilteredUsers(usersData);
      
      const statsData = await getUserStats();
      setStats(statsData);
      
      toast.success('Users refreshed successfully');
    } catch (error) {
      console.error('Error refreshing users:', error);
      toast.error('Failed to refresh users');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    try {
      setLoading(true);
      await seedUsers();
      toast.success('Sample users added successfully');
      
      // Refresh the users list
      await handleRefresh();
    } catch (error) {
      console.error('Error seeding data:', error);
      toast.error('Failed to seed data');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage elderly users, caregivers, and doctors</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={handleSeedData}
            className="btn btn-outline"
            disabled={loading}
            title="Add sample users for testing"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Seed Data
          </button>
          <button 
            onClick={handleRefresh}
            className="btn btn-secondary"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button className="btn btn-primary">
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name, email, or phone..."
                className="form-input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              className="form-input"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Users</option>
              <option value="elderly">Elderly</option>
              <option value="caregiver">Caregivers</option>
              <option value="doctor">Doctors</option>
            </select>
            <button className="btn btn-secondary">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Join Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
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
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUserTypeColor(user.type)}`}>
                      {user.type.charAt(0).toUpperCase() + user.type.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.joinDate ? new Date(user.joinDate).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleUserAction('view', user)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleUserAction('edit', user)}
                        className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                        title="Edit User"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleUserAction('suspend', user)}
                        className={`p-1 rounded ${
                          user.status === 'active' 
                            ? 'text-yellow-600 hover:text-yellow-900 hover:bg-yellow-50' 
                            : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                        }`}
                        title={user.status === 'active' ? 'Suspend User' : 'Activate User'}
                      >
                        {user.status === 'active' ? <UserX className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleUserAction('delete', user)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title="Delete User"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <UserX className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterType !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding a new user.'
              }
            </p>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">User Details</h3>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-lg font-medium text-gray-700">
                      {selectedUser.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900">{selectedUser.name}</h4>
                    <div className="flex space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUserTypeColor(selectedUser.type)}`}>
                        {selectedUser.type.charAt(0).toUpperCase() + selectedUser.type.slice(1)}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedUser.status)}`}>
                        {selectedUser.status.charAt(0).toUpperCase() + selectedUser.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <div className="mt-1 flex items-center">
                      <Mail className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{selectedUser.email}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <div className="mt-1 flex items-center">
                      <Phone className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{selectedUser.phone}</span>
                    </div>
                  </div>
                </div>

                {selectedUser.type === 'elderly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Emergency Contact</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.emergencyContact}</p>
                  </div>
                )}

                {selectedUser.type === 'elderly' && selectedUser.medicalConditions && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Medical Conditions</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {selectedUser.medicalConditions.map((condition, index) => (
                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {condition}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedUser.type === 'caregiver' && selectedUser.certifications && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Certifications</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {selectedUser.certifications.map((cert, index) => (
                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedUser.type === 'doctor' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Specialization</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedUser.specialization}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">License Number</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedUser.licenseNumber}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Join Date</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedUser.joinDate ? new Date(selectedUser.joinDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Active</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedUser.lastActive ? new Date(selectedUser.lastActive).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
                <button className="btn btn-primary">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
