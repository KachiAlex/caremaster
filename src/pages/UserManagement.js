import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye,
  UserPlus,
  Heart,
  Stethoscope,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import { getAllUsers, getUserStats, updateUserStatus, deleteUser, subscribeToUsers } from '../api/usersAPI';
import { seedUsers } from '../api/seedData';
import UserCreationForm from '../components/UserCreationForm';

const UserManagement = () => {
  const { userProfile, userRole, isAdmin } = useUser();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState('elderly');
  const [stats, setStats] = useState({
    total: 0,
    elderly: 0,
    caregivers: 0,
    doctors: 0,
    active: 0,
    inactive: 0
  });

  // Load users and stats
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const [usersData, statsData] = await Promise.all([
          getAllUsers(),
          getUserStats()
        ]);
        
        setUsers(usersData);
        setFilteredUsers(usersData);
        setStats(statsData);
      } catch (error) {
        console.error('Error loading users:', error);
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  // Real-time user updates
  useEffect(() => {
    const unsubscribe = subscribeToUsers((updatedUsers) => {
      setUsers(updatedUsers);
    });

    return unsubscribe;
  }, []);

  // Filter users
  useEffect(() => {
    let filtered = users;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchQuery, roleFilter, statusFilter]);

  const handleCreateUser = (role) => {
    setSelectedRole(role);
    setShowCreateForm(true);
  };

  const handleUserAction = async (userId, action) => {
    try {
      if (action === 'delete') {
        if (window.confirm('Are you sure you want to delete this user?')) {
          await deleteUser(userId);
          toast.success('User deleted successfully');
        }
      } else if (action === 'suspend') {
        await updateUserStatus(userId, 'inactive');
        toast.success('User suspended successfully');
      } else if (action === 'activate') {
        await updateUserStatus(userId, 'active');
        toast.success('User activated successfully');
      }
    } catch (error) {
      console.error('Error performing user action:', error);
      toast.error(`Failed to ${action} user`);
    }
  };

  const handleSeedData = async () => {
    try {
      await seedUsers();
      toast.success('Sample data added successfully');
    } catch (error) {
      console.error('Error seeding data:', error);
      toast.error('Failed to add sample data');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'elderly':
        return <Heart size={16} className="text-blue-600" />;
      case 'caregiver':
        return <Users size={16} className="text-green-600" />;
      case 'doctor':
        return <Stethoscope size={16} className="text-purple-600" />;
      case 'admin':
        return <Shield size={16} className="text-red-600" />;
      default:
        return <Users size={16} className="text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={12} className="mr-1" />
            Active
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle size={12} className="mr-1" />
            Inactive
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock size={12} className="mr-1" />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <AlertCircle size={12} className="mr-1" />
            Unknown
          </span>
        );
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield size={64} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">Access Denied</h3>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
              <p className="text-gray-600 mt-2">Manage users across all roles in the ElderX platform</p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleSeedData}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2"
              >
                <Users size={16} />
                <span>Add Sample Data</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="text-blue-600" size={24} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <Heart className="text-green-600" size={24} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Elderly</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.elderly}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <Stethoscope className="text-purple-600" size={24} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Doctors</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.doctors}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-full">
                <Users className="text-orange-600" size={24} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Caregivers</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.caregivers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => handleCreateUser('elderly')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
            >
              <Heart size={32} className="mx-auto mb-2 text-gray-400 group-hover:text-blue-600" />
              <p className="text-sm font-medium text-gray-600 group-hover:text-blue-800">Add Elderly User</p>
            </button>

            <button
              onClick={() => handleCreateUser('caregiver')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors group"
            >
              <Users size={32} className="mx-auto mb-2 text-gray-400 group-hover:text-green-600" />
              <p className="text-sm font-medium text-gray-600 group-hover:text-green-800">Add Caregiver</p>
            </button>

            <button
              onClick={() => handleCreateUser('doctor')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors group"
            >
              <Stethoscope size={32} className="mx-auto mb-2 text-gray-400 group-hover:text-purple-600" />
              <p className="text-sm font-medium text-gray-600 group-hover:text-purple-800">Add Doctor</p>
            </button>

            <button
              onClick={() => handleCreateUser('admin')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors group"
            >
              <Shield size={32} className="mx-auto mb-2 text-gray-400 group-hover:text-red-600" />
              <p className="text-sm font-medium text-gray-600 group-hover:text-red-800">Add Admin</p>
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="elderly">Elderly</option>
                <option value="caregiver">Caregiver</option>
                <option value="doctor">Doctor</option>
                <option value="admin">Admin</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Users ({filteredUsers.length})</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users size={64} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">No users found</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
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
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {user.firstName?.[0]}{user.lastName?.[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getRoleIcon(user.role)}
                          <span className="ml-2 text-sm text-gray-900 capitalize">
                            {user.role}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(user.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(user.joinDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(user.lastActive)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {/* View user details */}}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => {/* Edit user */}}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Edit size={16} />
                          </button>
                          {user.status === 'active' ? (
                            <button
                              onClick={() => handleUserAction(user.id, 'suspend')}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              <XCircle size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUserAction(user.id, 'activate')}
                              className="text-green-600 hover:text-green-900"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleUserAction(user.id, 'delete')}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* User Creation Form Modal */}
      {showCreateForm && (
        <UserCreationForm
          userRole={selectedRole}
          onClose={() => {
            setShowCreateForm(false);
            setSelectedRole('elderly');
          }}
        />
      )}
    </div>
  );
};

export default UserManagement;
