import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  MapPin, 
  Clock, 
  Star, 
  Phone, 
  Mail, 
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Heart,
  Shield,
  Award,
  MessageSquare,
  Plus,
  MoreVertical,
  Download,
  Upload
} from 'lucide-react';

const AdminCaregivers = () => {
  const [caregivers, setCaregivers] = useState([]);
  const [filteredCaregivers, setFilteredCaregivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCaregiver, setSelectedCaregiver] = useState(null);
  const [showCaregiverModal, setShowCaregiverModal] = useState(false);
  const [stats, setStats] = useState({
    totalCaregivers: 0,
    activeCaregivers: 0,
    averageRating: 0,
    totalPatients: 0,
    pendingAssignments: 0,
    trainingCompleted: 0
  });

  useEffect(() => {
    // Simulate loading caregiver data
    const loadCaregiverData = async () => {
      try {
        setTimeout(() => {
          const mockCaregivers = [
            {
              id: 1,
              name: 'Tunde Adebayo',
              email: 'tunde@example.com',
              phone: '+234 802 123 4567',
              status: 'active',
              rating: 4.8,
              totalPatients: 8,
              currentPatients: 3,
              experience: '5 years',
              specializations: ['Elderly Care', 'Dementia Care', 'Physical Therapy'],
              certifications: ['CPR Certified', 'First Aid', 'Dementia Care Specialist'],
              location: 'Lagos, Nigeria',
              availability: 'Full-time',
              hourlyRate: 2500,
              joinDate: '2023-06-15',
              lastActive: '2024-01-20T14:30:00Z',
              profileImage: null,
              bio: 'Experienced caregiver with 5 years of dedicated service to elderly patients. Specializes in dementia care and physical therapy assistance.',
              languages: ['English', 'Yoruba'],
              vehicle: true,
              backgroundCheck: 'Passed',
              insurance: 'Active',
              currentAssignments: [
                {
                  patientId: 'ELD001',
                  patientName: 'Adunni Okafor',
                  startDate: '2024-01-15',
                  schedule: 'Mon-Fri, 9AM-5PM',
                  status: 'active'
                },
                {
                  patientId: 'ELD002',
                  patientName: 'Grace Johnson',
                  startDate: '2024-01-10',
                  schedule: 'Tue-Thu, 2PM-6PM',
                  status: 'active'
                }
              ],
              performance: {
                punctuality: 95,
                patientSatisfaction: 4.8,
                taskCompletion: 98,
                communication: 4.7,
                safety: 100
              },
              earnings: {
                thisMonth: 180000,
                lastMonth: 175000,
                total: 2100000
              }
            },
            {
              id: 2,
              name: 'Sarah Williams',
              email: 'sarah@example.com',
              phone: '+234 803 456 7890',
              status: 'active',
              rating: 4.9,
              totalPatients: 12,
              currentPatients: 4,
              experience: '7 years',
              specializations: ['Post-Surgery Care', 'Medication Management', 'Mobility Assistance'],
              certifications: ['CPR Certified', 'First Aid', 'Medication Administration', 'Physical Therapy Aide'],
              location: 'Abuja, Nigeria',
              availability: 'Part-time',
              hourlyRate: 3000,
              joinDate: '2022-03-20',
              lastActive: '2024-01-20T16:45:00Z',
              profileImage: null,
              bio: 'Highly skilled caregiver with extensive experience in post-surgery care and medication management. Known for excellent patient communication.',
              languages: ['English', 'Hausa'],
              vehicle: true,
              backgroundCheck: 'Passed',
              insurance: 'Active',
              currentAssignments: [
                {
                  patientId: 'ELD003',
                  patientName: 'Tunde Adebayo',
                  startDate: '2024-01-12',
                  schedule: 'Mon-Wed-Fri, 10AM-4PM',
                  status: 'active'
                },
                {
                  patientId: 'ELD004',
                  patientName: 'Mary Okonkwo',
                  startDate: '2024-01-08',
                  schedule: 'Tue-Thu, 1PM-7PM',
                  status: 'active'
                }
              ],
              performance: {
                punctuality: 98,
                patientSatisfaction: 4.9,
                taskCompletion: 100,
                communication: 4.8,
                safety: 100
              },
              earnings: {
                thisMonth: 220000,
                lastMonth: 210000,
                total: 2800000
              }
            },
            {
              id: 3,
              name: 'Michael Johnson',
              email: 'michael@example.com',
              phone: '+234 804 567 8901',
              status: 'pending',
              rating: 0,
              totalPatients: 0,
              currentPatients: 0,
              experience: '2 years',
              specializations: ['Basic Care', 'Companionship'],
              certifications: ['CPR Certified', 'First Aid'],
              location: 'Ibadan, Nigeria',
              availability: 'Full-time',
              hourlyRate: 2000,
              joinDate: '2024-01-18',
              lastActive: '2024-01-19T10:15:00Z',
              profileImage: null,
              bio: 'New caregiver eager to provide quality care to elderly patients. Recently completed training and ready to start.',
              languages: ['English', 'Yoruba'],
              vehicle: false,
              backgroundCheck: 'Pending',
              insurance: 'Pending',
              currentAssignments: [],
              performance: {
                punctuality: 0,
                patientSatisfaction: 0,
                taskCompletion: 0,
                communication: 0,
                safety: 0
              },
              earnings: {
                thisMonth: 0,
                lastMonth: 0,
                total: 0
              }
            },
            {
              id: 4,
              name: 'Grace Okafor',
              email: 'grace@example.com',
              phone: '+234 805 678 9012',
              status: 'inactive',
              rating: 4.6,
              totalPatients: 15,
              currentPatients: 0,
              experience: '6 years',
              specializations: ['Palliative Care', 'End-of-Life Care', 'Family Support'],
              certifications: ['CPR Certified', 'First Aid', 'Palliative Care Specialist', 'Grief Counseling'],
              location: 'Port Harcourt, Nigeria',
              availability: 'On-call',
              hourlyRate: 3500,
              joinDate: '2021-09-10',
              lastActive: '2024-01-15T12:00:00Z',
              profileImage: null,
              bio: 'Specialized in palliative and end-of-life care. Currently on temporary leave for personal reasons.',
              languages: ['English', 'Igbo'],
              vehicle: true,
              backgroundCheck: 'Passed',
              insurance: 'Active',
              currentAssignments: [],
              performance: {
                punctuality: 92,
                patientSatisfaction: 4.6,
                taskCompletion: 95,
                communication: 4.5,
                safety: 98
              },
              earnings: {
                thisMonth: 0,
                lastMonth: 45000,
                total: 3200000
              }
            }
          ];

          // Calculate stats
          const totalCaregivers = mockCaregivers.length;
          const activeCaregivers = mockCaregivers.filter(c => c.status === 'active').length;
          const avgRating = mockCaregivers
            .filter(c => c.rating > 0)
            .reduce((sum, c) => sum + c.rating, 0) / mockCaregivers.filter(c => c.rating > 0).length;
          const totalPatients = mockCaregivers.reduce((sum, c) => sum + c.currentPatients, 0);
          const pendingAssignments = mockCaregivers.filter(c => c.status === 'pending').length;
          const trainingCompleted = mockCaregivers.filter(c => c.certifications.length >= 2).length;

          setStats({
            totalCaregivers,
            activeCaregivers,
            averageRating: Math.round(avgRating * 10) / 10,
            totalPatients,
            pendingAssignments,
            trainingCompleted
          });

          setCaregivers(mockCaregivers);
          setFilteredCaregivers(mockCaregivers);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading caregiver data:', error);
        setLoading(false);
      }
    };

    loadCaregiverData();
  }, []);

  useEffect(() => {
    let filtered = caregivers;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(caregiver =>
        caregiver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caregiver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caregiver.specializations.some(spec => spec.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(caregiver => caregiver.status === statusFilter);
    }

    setFilteredCaregivers(filtered);
  }, [searchTerm, statusFilter, caregivers]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-yellow-600';
    if (rating >= 3.0) return 'text-orange-600';
    return 'text-red-600';
  };

  const handleCaregiverAction = (action, caregiver) => {
    setSelectedCaregiver(caregiver);
    switch (action) {
      case 'view':
        setShowCaregiverModal(true);
        break;
      case 'edit':
        // Handle edit
        break;
      case 'assign':
        // Handle assign
        break;
      case 'deactivate':
        // Handle deactivate
        break;
      default:
        break;
    }
  };

  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Caregiver Management</h1>
          <p className="text-gray-600">Manage caregivers, assignments, and performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn btn-secondary">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <button className="btn btn-primary">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Caregiver
          </button>
        </div>
      </div>

      {/* Caregiver Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Caregivers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCaregivers}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeCaregivers}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingAssignments}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <Star className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Rating</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageRating}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-full">
              <Heart className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Patients</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPatients}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-indigo-100 rounded-full">
              <Award className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Trained</p>
              <p className="text-2xl font-bold text-gray-900">{stats.trainingCompleted}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Assignments Alert */}
      {stats.pendingAssignments > 0 && (
        <div className="card border-l-4 border-yellow-500 bg-yellow-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-yellow-500 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-800">Pending Caregiver Approvals</h3>
                <p className="text-yellow-600">
                  {stats.pendingAssignments} caregiver{stats.pendingAssignments > 1 ? 's' : ''} waiting for approval and assignment
                </p>
              </div>
            </div>
            <button className="btn btn-yellow">
              <Eye className="h-4 w-4 mr-2" />
              Review Pending
            </button>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search caregivers by name, email, or specialization..."
                className="form-input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              className="form-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
            <button className="btn btn-secondary">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Caregivers Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Caregiver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating & Experience
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Patients
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Specializations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCaregivers.map((caregiver) => (
                <tr key={caregiver.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {caregiver.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{caregiver.name}</div>
                        <div className="text-sm text-gray-500">{caregiver.email}</div>
                        <div className="text-xs text-gray-400">{caregiver.location}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 mr-1" />
                      <span className={`text-sm font-medium ${getRatingColor(caregiver.rating)}`}>
                        {caregiver.rating > 0 ? caregiver.rating : 'N/A'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">{caregiver.experience}</div>
                    <div className="text-xs text-gray-400">₦{caregiver.hourlyRate.toLocaleString()}/hr</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{caregiver.currentPatients}</div>
                    <div className="text-xs text-gray-500">of {caregiver.totalPatients} total</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {caregiver.specializations.slice(0, 2).map((spec, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {spec}
                        </span>
                      ))}
                      {caregiver.specializations.length > 2 && (
                        <span className="text-xs text-gray-500">+{caregiver.specializations.length - 2} more</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(caregiver.status)}`}>
                      {caregiver.status.charAt(0).toUpperCase() + caregiver.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleCaregiverAction('view', caregiver)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleCaregiverAction('edit', caregiver)}
                        className="text-green-600 hover:text-green-900"
                        title="Edit Caregiver"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleCaregiverAction('assign', caregiver)}
                        className="text-purple-600 hover:text-purple-900"
                        title="Assign Patient"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCaregivers.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No caregivers found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'No caregivers have been added yet.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Caregiver Details Modal */}
      {showCaregiverModal && selectedCaregiver && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-lg font-medium text-gray-700">
                      {selectedCaregiver.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{selectedCaregiver.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedCaregiver.status)}`}>
                      {selectedCaregiver.status.charAt(0).toUpperCase() + selectedCaregiver.status.slice(1)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowCaregiverModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Basic Info */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Contact Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{selectedCaregiver.email}</span>
                      </div>
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{selectedCaregiver.phone}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{selectedCaregiver.location}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Professional Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Experience</label>
                        <p className="text-sm text-gray-900">{selectedCaregiver.experience}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Hourly Rate</label>
                        <p className="text-sm text-gray-900">₦{selectedCaregiver.hourlyRate.toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Availability</label>
                        <p className="text-sm text-gray-900">{selectedCaregiver.availability}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Languages</label>
                        <p className="text-sm text-gray-900">{selectedCaregiver.languages.join(', ')}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Specializations</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCaregiver.specializations.map((spec, index) => (
                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Certifications</h4>
                    <div className="space-y-2">
                      {selectedCaregiver.certifications.map((cert, index) => (
                        <div key={index} className="flex items-center">
                          <Award className="h-4 w-4 text-green-600 mr-2" />
                          <span className="text-sm text-gray-900">{cert}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column - Performance & Assignments */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Performance Metrics</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Overall Rating</span>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 mr-1" />
                          <span className={`text-sm font-medium ${getRatingColor(selectedCaregiver.rating)}`}>
                            {selectedCaregiver.rating > 0 ? selectedCaregiver.rating : 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Punctuality</span>
                        <span className="text-sm text-gray-900">{selectedCaregiver.performance.punctuality}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Patient Satisfaction</span>
                        <span className="text-sm text-gray-900">{selectedCaregiver.performance.patientSatisfaction}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Task Completion</span>
                        <span className="text-sm text-gray-900">{selectedCaregiver.performance.taskCompletion}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Communication</span>
                        <span className="text-sm text-gray-900">{selectedCaregiver.performance.communication}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Safety Record</span>
                        <span className="text-sm text-gray-900">{selectedCaregiver.performance.safety}%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Current Assignments</h4>
                    <div className="space-y-3">
                      {selectedCaregiver.currentAssignments.length > 0 ? (
                        selectedCaregiver.currentAssignments.map((assignment, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-gray-900">{assignment.patientName}</h5>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                assignment.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {assignment.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">{assignment.schedule}</p>
                            <p className="text-xs text-gray-500">Started: {assignment.startDate}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No current assignments</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Earnings Summary</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">This Month</span>
                        <span className="text-sm font-medium text-gray-900">₦{selectedCaregiver.earnings.thisMonth.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Last Month</span>
                        <span className="text-sm text-gray-900">₦{selectedCaregiver.earnings.lastMonth.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Total Earnings</span>
                        <span className="text-sm font-medium text-gray-900">₦{selectedCaregiver.earnings.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowCaregiverModal(false)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
                <button className="btn btn-primary">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Caregiver
                </button>
                <button className="btn btn-green">
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Patient
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCaregivers;
