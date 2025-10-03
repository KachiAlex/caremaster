import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Star, 
  Calendar, 
  Clock, 
  MessageSquare, 
  Heart, 
  CheckCircle, 
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  BarChart3,
  Download,
  Filter,
  Search,
  Phone,
  Mail,
  MapPin,
  User,
  FileText,
  Award,
  Target,
  X
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { createPatientFeedback, getAllPatientFeedback, updatePatientFeedback, deletePatientFeedback, calculateCaregiverRating, getFeedbackStatistics } from '../api/patientFeedbackAPI';
import { getAllUsers } from '../api/usersAPI';
import { toast } from 'react-toastify';

const AdminPatientFeedback = () => {
  const { userProfile } = useUser();
  const [feedbackList, setFeedbackList] = useState([]);
  const [filteredFeedback, setFilteredFeedback] = useState([]);
  const [patients, setPatients] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWeek, setFilterWeek] = useState('');
  const [filterCaregiver, setFilterCaregiver] = useState('');
  const [filterPatient, setFilterPatient] = useState('');
  const [statistics, setStatistics] = useState({});
  
  // Form state for adding/editing feedback
  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    caregiverId: '',
    caregiverName: '',
    weekOf: '',
    punctuality: 5,
    communication: 5,
    careQuality: 5,
    responsiveness: 5,
    overallSatisfaction: 5,
    comments: '',
    adminNotes: '',
    feedbackMethod: 'phone', // phone, in-person, video
    callDuration: '',
    callDate: '',
    callTime: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterFeedback();
  }, [feedbackList, searchTerm, filterWeek, filterCaregiver, filterPatient]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [feedback, users] = await Promise.all([
        getAllPatientFeedback(),
        getAllUsers()
      ]);
      
      setFeedbackList(feedback);
      setPatients(users.filter(u => u.userType === 'elderly' || u.userType === 'client' || u.userType === 'patient'));
      setCaregivers(users.filter(u => u.userType === 'caregiver'));
      
      // Calculate statistics
      const stats = getFeedbackStatistics(feedback);
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load feedback data');
    } finally {
      setLoading(false);
    }
  };

  const filterFeedback = () => {
    let filtered = [...feedbackList];
    
    if (searchTerm) {
      filtered = filtered.filter(feedback => 
        feedback.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.caregiverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.comments?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterWeek) {
      filtered = filtered.filter(feedback => feedback.weekOf === filterWeek);
    }
    
    if (filterCaregiver) {
      filtered = filtered.filter(feedback => feedback.caregiverId === filterCaregiver);
    }
    
    if (filterPatient) {
      filtered = filtered.filter(feedback => feedback.patientId === filterPatient);
    }
    
    setFilteredFeedback(filtered);
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    try {
      if (selectedFeedback) {
        await updatePatientFeedback(selectedFeedback.id, formData);
        toast.success('Feedback updated successfully');
        setShowEditModal(false);
      } else {
        await createPatientFeedback(formData);
        toast.success('Feedback added successfully');
        setShowAddModal(false);
      }
      
      setFormData({
        patientId: '',
        patientName: '',
        caregiverId: '',
        caregiverName: '',
        weekOf: '',
        punctuality: 5,
        communication: 5,
        careQuality: 5,
        responsiveness: 5,
        overallSatisfaction: 5,
        comments: '',
        adminNotes: '',
        feedbackMethod: 'phone',
        callDuration: '',
        callDate: '',
        callTime: ''
      });
      
      loadData();
    } catch (error) {
      console.error('Error saving feedback:', error);
      toast.error('Failed to save feedback');
    }
  };

  const handleEditFeedback = (feedback) => {
    setSelectedFeedback(feedback);
    setFormData({
      ...feedback,
      callDate: feedback.callDate || '',
      callTime: feedback.callTime || ''
    });
    setShowEditModal(true);
  };

  const handleDeleteFeedback = async (feedbackId) => {
    if (window.confirm('Are you sure you want to delete this feedback?')) {
      try {
        await deletePatientFeedback(feedbackId);
        toast.success('Feedback deleted successfully');
        loadData();
      } catch (error) {
        console.error('Error deleting feedback:', error);
        toast.error('Failed to delete feedback');
      }
    }
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 3.5) return 'text-yellow-600';
    if (rating >= 2.5) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRatingStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
      />
    ));
  };

  const renderAddEditModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {selectedFeedback ? 'Edit Patient Feedback' : 'Add Patient Feedback'}
            </h3>
            <button
              onClick={() => {
                setShowAddModal(false);
                setShowEditModal(false);
                setSelectedFeedback(null);
              }}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmitFeedback} className="space-y-6">
            {/* Patient and Caregiver Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patient *
                </label>
                <select
                  value={formData.patientId}
                  onChange={(e) => {
                    const patient = patients.find(p => p.id === e.target.value);
                    setFormData({
                      ...formData,
                      patientId: e.target.value,
                      patientName: patient?.name || patient?.displayName || ''
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Patient</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name || patient.displayName || patient.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Caregiver *
                </label>
                <select
                  value={formData.caregiverId}
                  onChange={(e) => {
                    const caregiver = caregivers.find(c => c.id === e.target.value);
                    setFormData({
                      ...formData,
                      caregiverId: e.target.value,
                      caregiverName: caregiver?.name || caregiver?.displayName || ''
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Caregiver</option>
                  {caregivers.map(caregiver => (
                    <option key={caregiver.id} value={caregiver.id}>
                      {caregiver.name || caregiver.displayName || caregiver.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Week and Call Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Week Of *
                </label>
                <input
                  type="date"
                  value={formData.weekOf}
                  onChange={(e) => setFormData({ ...formData, weekOf: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Call Date
                </label>
                <input
                  type="date"
                  value={formData.callDate}
                  onChange={(e) => setFormData({ ...formData, callDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Call Time
                </label>
                <input
                  type="time"
                  value={formData.callTime}
                  onChange={(e) => setFormData({ ...formData, callTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Feedback Method and Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback Method
                </label>
                <select
                  value={formData.feedbackMethod}
                  onChange={(e) => setFormData({ ...formData, feedbackMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="phone">Phone Call</option>
                  <option value="in-person">In-Person Visit</option>
                  <option value="video">Video Call</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Call Duration (minutes)
                </label>
                <input
                  type="number"
                  value={formData.callDuration}
                  onChange={(e) => setFormData({ ...formData, callDuration: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., 15"
                />
              </div>
            </div>

            {/* Rating Categories */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">Patient Ratings (1-5 stars)</h4>
              
              {[
                { key: 'punctuality', label: 'Punctuality', description: 'How well did the caregiver arrive on time?' },
                { key: 'communication', label: 'Communication', description: 'How clear and effective was the communication?' },
                { key: 'careQuality', label: 'Care Quality', description: 'How satisfied are you with the care provided?' },
                { key: 'responsiveness', label: 'Responsiveness', description: 'How quickly did the caregiver respond to needs?' },
                { key: 'overallSatisfaction', label: 'Overall Satisfaction', description: 'Overall satisfaction with the caregiver' }
              ].map(category => (
                <div key={category.key} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className="text-sm font-medium text-gray-900">{category.label}</label>
                      <p className="text-xs text-gray-600">{category.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="0.5"
                        value={formData[category.key]}
                        onChange={(e) => setFormData({ ...formData, [category.key]: parseFloat(e.target.value) })}
                        className="w-24"
                      />
                      <span className="text-sm font-medium text-gray-900 w-8">
                        {formData[category.key]}
                      </span>
                      <div className="flex">
                        {getRatingStars(formData[category.key])}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Comments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient Comments
              </label>
              <textarea
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Patient's feedback comments..."
              />
            </div>

            {/* Admin Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Notes
              </label>
              <textarea
                value={formData.adminNotes}
                onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Internal notes about this feedback..."
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setSelectedFeedback(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {selectedFeedback ? 'Update Feedback' : 'Add Feedback'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Feedback Management</h1>
          <p className="text-gray-600">Manage weekly patient feedback and caregiver ratings</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Feedback
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Feedback</p>
              <p className="text-3xl font-bold text-gray-900">{statistics.totalFeedback}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Rating</p>
              <p className={`text-3xl font-bold ${getRatingColor(statistics.averageRating)}`}>
                {statistics.averageRating.toFixed(1)}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-xl">
              <Star className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-3xl font-bold text-gray-900">
                {filteredFeedback.filter(f => {
                  const weekStart = new Date();
                  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                  return new Date(f.weekOf) >= weekStart;
                }).length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High Ratings (4.5+)</p>
              <p className="text-3xl font-bold text-gray-900">
                {filteredFeedback.filter(f => {
                  const avgRating = (f.punctuality + f.communication + f.careQuality + f.responsiveness + f.overallSatisfaction) / 5;
                  return avgRating >= 4.5;
                }).length}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Award className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Search feedback..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Week</label>
            <input
              type="date"
              value={filterWeek}
              onChange={(e) => setFilterWeek(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Caregiver</label>
            <select
              value={filterCaregiver}
              onChange={(e) => setFilterCaregiver(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Caregivers</option>
              {caregivers.map(caregiver => (
                <option key={caregiver.id} value={caregiver.id}>
                  {caregiver.name || caregiver.displayName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Patient</label>
            <select
              value={filterPatient}
              onChange={(e) => setFilterPatient(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Patients</option>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.name || patient.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterWeek('');
                setFilterCaregiver('');
                setFilterPatient('');
              }}
              className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Caregiver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Week
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ratings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFeedback.map((feedback) => {
                const avgRating = (feedback.punctuality + feedback.communication + feedback.careQuality + feedback.responsiveness + feedback.overallSatisfaction) / 5;
                return (
                  <tr key={feedback.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {feedback.patientName}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{feedback.caregiverName}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(feedback.weekOf).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex mr-2">
                          {getRatingStars(avgRating)}
                        </div>
                        <span className={`text-sm font-medium ${getRatingColor(avgRating)}`}>
                          {avgRating.toFixed(1)}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {feedback.feedbackMethod}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditFeedback(feedback)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteFeedback(feedback.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredFeedback.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No feedback found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterWeek || filterCaregiver || filterPatient
                ? 'Try adjusting your search or filter criteria.'
                : 'No patient feedback has been recorded yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && renderAddEditModal()}
      {showEditModal && renderAddEditModal()}
    </div>
  );
};

export default AdminPatientFeedback;
