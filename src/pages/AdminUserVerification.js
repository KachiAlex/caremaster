import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Star, 
  Shield, 
  Award, 
  FileText, 
  Phone, 
  Mail, 
  MapPin,
  AlertTriangle,
  Plus,
  Download,
  Upload
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { getAllUsers, updateUser } from '../api/usersAPI';
import { toast } from 'react-toastify';

const AdminUserVerification = () => {
  const { userProfile } = useUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await getAllUsers().catch(err => {
        console.warn('Failed to fetch users:', err);
        return [];
      });
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on verification status
  const getFilteredUsers = () => {
    return users.filter(user => {
      const matchesSearch = user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesFilter = false;
      switch (filterStatus) {
        case 'pending':
          matchesFilter = user.qualificationLevel === 'pending' || user.profileComplete === false;
          break;
        case 'verified':
          matchesFilter = user.qualificationLevel !== 'pending' && user.profileComplete === true;
          break;
        case 'caregivers':
          matchesFilter = user.userType === 'caregiver';
          break;
        case 'clients':
          matchesFilter = user.userType === 'client' || user.userType === 'elderly' || user.userType === 'patient';
          break;
        case 'all':
        default:
          matchesFilter = true;
      }
      
      return matchesSearch && matchesFilter;
    });
  };

  // Verify caregiver profile
  const verifyCaregiver = async (userId, verificationData) => {
    try {
      await updateUser(userId, {
        userType: 'caregiver',
        profileComplete: true,
        qualificationLevel: verificationData.qualificationLevel,
        specializations: verificationData.specializations,
        certifications: verificationData.certifications,
        experience: verificationData.experience,
        verifiedAt: new Date(),
        verifiedBy: userProfile.id
      });

      toast.success('Caregiver verified successfully');
      loadUsers();
      setShowVerificationModal(false);
    } catch (error) {
      console.error('Error verifying caregiver:', error);
      toast.error('Failed to verify caregiver');
    }
  };

  // Reject user verification
  const rejectVerification = async (userId, reason) => {
    try {
      await updateUser(userId, {
        qualificationLevel: 'rejected',
        rejectionReason: reason,
        rejectedAt: new Date(),
        rejectedBy: userProfile.id
      });

      toast.success('User verification rejected');
      loadUsers();
    } catch (error) {
      console.error('Error rejecting verification:', error);
      toast.error('Failed to reject verification');
    }
  };

  const filteredUsers = getFilteredUsers();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Verification</h1>
          <p className="text-gray-600">Verify and manage user profiles and caregiver qualifications</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn btn-secondary">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <button className="btn btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Manual Add
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Verification</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.qualificationLevel === 'pending' || u.profileComplete === false).length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Verified Caregivers</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.userType === 'caregiver' && u.profileComplete === true).length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Clients</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.userType === 'client' || u.userType === 'elderly' || u.userType === 'patient').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <UserX className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.qualificationLevel === 'rejected').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Users</option>
              <option value="pending">Pending Verification</option>
              <option value="verified">Verified</option>
              <option value="caregivers">Caregivers</option>
              <option value="clients">Clients</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pending Verification Alert */}
      {users.filter(u => u.qualificationLevel === 'pending').length > 0 && (
        <div className="card border-l-4 border-yellow-500 bg-yellow-50">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-800">
                {users.filter(u => u.qualificationLevel === 'pending').length} User(s) Awaiting Verification
              </h4>
              <p className="text-sm text-yellow-700 mt-1">
                These users need profile verification before they can access the system as caregivers.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">User Profiles</h3>
        </div>
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
                  Qualifications
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                        {user.photoUrl ? (
                          <img src={user.photoUrl} alt={user.displayName} className="h-10 w-10 rounded-full" />
                        ) : (
                          <span className="text-gray-600 font-medium text-sm">
                            {user.displayName?.split(' ').map(n => n[0]).join('') || 'U'}
                          </span>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.displayName || 'Unnamed User'}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.userType === 'caregiver' ? 'bg-green-100 text-green-800' :
                      user.userType === 'admin' ? 'bg-purple-100 text-purple-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {user.userType || 'client'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.qualificationLevel === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      user.qualificationLevel === 'rejected' ? 'bg-red-100 text-red-800' :
                      user.profileComplete ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.qualificationLevel === 'pending' ? 'Pending' :
                       user.qualificationLevel === 'rejected' ? 'Rejected' :
                       user.profileComplete ? 'Verified' : 'Incomplete'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.specializations?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.specializations.slice(0, 2).map((spec, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {spec}
                          </span>
                        ))}
                        {user.specializations.length > 2 && (
                          <span className="text-xs text-gray-500">+{user.specializations.length - 2} more</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">None specified</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => {
                          setSelectedUser(user);
                          setShowVerificationModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {user.qualificationLevel === 'pending' && (
                        <>
                          <button 
                            onClick={() => {
                              setSelectedUser(user);
                              setShowVerificationModal(true);
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => rejectVerification(user.id, 'Insufficient qualifications')}
                            className="text-red-600 hover:text-red-900"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Modal */}
      {showVerificationModal && selectedUser && (
        <VerificationModal
          user={selectedUser}
          onClose={() => setShowVerificationModal(false)}
          onVerify={verifyCaregiver}
          onReject={rejectVerification}
        />
      )}
    </div>
  );
};

// Verification Modal Component
const VerificationModal = ({ user, onClose, onVerify, onReject }) => {
  const [verificationData, setVerificationData] = useState({
    qualificationLevel: 'intermediate',
    specializations: [],
    certifications: [],
    experience: ''
  });

  const availableSpecializations = [
    'Registered Nurse',
    'Physical Therapist',
    'Dementia Care Specialist',
    'Companion Care',
    'General Care',
    'Medication Management',
    'Wound Care',
    'Mobility Assessment',
    'Exercise Programs',
    'Memory Care',
    'Behavioral Support',
    'Social Activities',
    'Mental Health Support',
    'Personal Care',
    'Daily Living Assistance'
  ];

  const availableCertifications = [
    'Nursing License',
    'PT License',
    'CPR Certified',
    'First Aid',
    'Background Check',
    'Dementia Care Certification',
    'Behavioral Training',
    'Safety Protocols',
    'Mobility Specialist'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onVerify(user.id, verificationData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Verify User Profile</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          {/* User Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt={user.displayName} className="h-12 w-12 rounded-full" />
                ) : (
                  <span className="text-gray-600 font-medium">
                    {user.displayName?.split(' ').map(n => n[0]).join('') || 'U'}
                  </span>
                )}
              </div>
              <div className="ml-4">
                <h4 className="text-lg font-medium text-gray-900">{user.displayName}</h4>
                <p className="text-sm text-gray-600">{user.email}</p>
                <p className="text-sm text-gray-500">
                  Joined: {user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Qualification Level</label>
              <select
                value={verificationData.qualificationLevel}
                onChange={(e) => setVerificationData({...verificationData, qualificationLevel: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="basic">Basic Care</option>
                <option value="intermediate">Intermediate Care</option>
                <option value="advanced">Advanced Care</option>
                <option value="specialist">Specialist Care</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Specializations</label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                {availableSpecializations.map(spec => (
                  <label key={spec} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={verificationData.specializations.includes(spec)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setVerificationData({
                            ...verificationData,
                            specializations: [...verificationData.specializations, spec]
                          });
                        } else {
                          setVerificationData({
                            ...verificationData,
                            specializations: verificationData.specializations.filter(s => s !== spec)
                          });
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{spec}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Certifications</label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                {availableCertifications.map(cert => (
                  <label key={cert} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={verificationData.certifications.includes(cert)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setVerificationData({
                            ...verificationData,
                            certifications: [...verificationData.certifications, cert]
                          });
                        } else {
                          setVerificationData({
                            ...verificationData,
                            certifications: verificationData.certifications.filter(c => c !== cert)
                          });
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{cert}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Experience</label>
              <input
                type="text"
                value={verificationData.experience}
                onChange={(e) => setVerificationData({...verificationData, experience: e.target.value})}
                placeholder="e.g., 5 years"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => onReject(user.id, 'Manual rejection by admin')}
                className="px-4 py-2 text-red-700 bg-red-100 rounded-md hover:bg-red-200"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Verify as Caregiver
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminUserVerification;
