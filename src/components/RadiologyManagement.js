/**
 * Radiology Management Component
 * 
 * Phase 2 Implementation - Complete radiology workflow:
 * - View imaging requests
 * - Schedule imaging appointments
 * - Upload and manage images
 * - Create radiologist reports
 * - Track imaging status
 */

import React, { useState, useEffect } from 'react';
import {
  Camera,
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Upload,
  Eye,
  Search,
  Filter,
  Plus,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import {
  getImagingRequests,
  getImagingRequestById,
  createImagingRequest,
  scheduleImagingRequest,
  completeImaging,
  createRadiologistReport,
  getRadiologistReport,
  getImagingImages,
  getImagingStats,
  IMAGING_TYPE,
  IMAGING_STATUS,
  IMAGING_PRIORITY
} from '../api/radiologyAPI';
import fileStorageService from '../services/fileStorageService';

const RadiologyManagement = ({ institutionId: propInstitutionId }) => {
  const { institutionId: contextInstitutionId, userProfile } = useUser();
  const institutionId = propInstitutionId || contextInstitutionId;
  const isRadiologist = userProfile?.userType === 'doctor' || userProfile?.type === 'doctor';
  const isRadiologyStaff = userProfile?.userType === 'lab-technician' || userProfile?.type === 'lab-technician';

  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [filteredRequests, setFilteredRequests] = useState([]);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showImagesModal, setShowImagesModal] = useState(false);
  
  // Selected request
  const [selectedRequest, setSelectedRequest] = useState(null);
  
  // Form states
  const [requestForm, setRequestForm] = useState({
    clientId: '',
    clientName: '',
    imagingType: IMAGING_TYPE.XRAY,
    bodyPart: '',
    clinicalIndication: '',
    priority: IMAGING_PRIORITY.ROUTINE,
    scheduledDate: '',
    notes: ''
  });
  
  const [scheduleForm, setScheduleForm] = useState({
    scheduledDate: '',
    radiologistId: '',
    radiologistName: ''
  });
  
  const [completeForm, setCompleteForm] = useState({
    imageFiles: [],
    imageUrls: [],
    technicianNotes: ''
  });
  
  const [reportForm, setReportForm] = useState({
    findings: '',
    impression: '',
    recommendations: '',
    reportText: ''
  });

  useEffect(() => {
    if (!institutionId) return;
    
    loadRequests();
    loadStats();
  }, [institutionId]);

  useEffect(() => {
    filterRequests();
  }, [requests, statusFilter, typeFilter, searchTerm]);

  const loadRequests = async () => {
    if (!institutionId) return;
    
    try {
      setLoading(true);
      const requestsData = await getImagingRequests(institutionId);
      setRequests(requestsData);
    } catch (error) {
      console.error('Error loading imaging requests:', error);
      toast.error('Failed to load imaging requests');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!institutionId) return;
    
    try {
      const statsData = await getImagingStats(institutionId);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const filterRequests = () => {
    let filtered = [...requests];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(r => r.imagingType === typeFilter);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.clientName?.toLowerCase().includes(searchLower) ||
        r.clientId?.toLowerCase().includes(searchLower) ||
        r.bodyPart?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredRequests(filtered);
  };

  const handleCreateRequest = async () => {
    if (!requestForm.clientId || !requestForm.imagingType) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      setLoading(true);
      await createImagingRequest({
        ...requestForm,
        institutionId,
        doctorId: userProfile?.id || userProfile?.uid,
        doctorName: userProfile?.name || userProfile?.displayName,
        scheduledDate: requestForm.scheduledDate || null
      });
      
      toast.success('Imaging request created');
      setShowRequestModal(false);
      setRequestForm({
        clientId: '',
        clientName: '',
        imagingType: IMAGING_TYPE.XRAY,
        bodyPart: '',
        clinicalIndication: '',
        priority: IMAGING_PRIORITY.ROUTINE,
        scheduledDate: '',
        notes: ''
      });
      loadRequests();
      loadStats();
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error('Failed to create imaging request');
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduleForm.scheduledDate) {
      toast.error('Please select a scheduled date');
      return;
    }

    try {
      await scheduleImagingRequest(
        selectedRequest.id,
        scheduleForm.scheduledDate,
        scheduleForm.radiologistId || null,
        scheduleForm.radiologistName || null
      );
      
      toast.success('Imaging scheduled');
      setShowScheduleModal(false);
      loadRequests();
    } catch (error) {
      console.error('Error scheduling imaging:', error);
      toast.error('Failed to schedule imaging');
    }
  };

  const handleUploadImages = async (files) => {
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const url = await fileStorageService.uploadFile(
          file,
          `imaging/${selectedRequest.id}/${file.name}`,
          institutionId
        );
        uploadedUrls.push(url);
      }
      setCompleteForm({ ...completeForm, imageUrls: uploadedUrls });
      return uploadedUrls;
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images');
      return [];
    }
  };

  const handleComplete = async () => {
    if (completeForm.imageUrls.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    try {
      await completeImaging(
        selectedRequest.id,
        completeForm.imageUrls,
        completeForm.technicianNotes
      );
      
      toast.success('Imaging marked as completed');
      setShowCompleteModal(false);
      setCompleteForm({ imageFiles: [], imageUrls: [], technicianNotes: '' });
      loadRequests();
    } catch (error) {
      console.error('Error completing imaging:', error);
      toast.error('Failed to complete imaging');
    }
  };

  const handleCreateReport = async () => {
    if (!reportForm.findings || !reportForm.impression) {
      toast.error('Please fill in findings and impression');
      return;
    }

    try {
      await createRadiologistReport(selectedRequest.id, {
        radiologistId: userProfile?.id || userProfile?.uid,
        radiologistName: userProfile?.name || userProfile?.displayName,
        ...reportForm
      });
      
      toast.success('Radiologist report created');
      setShowReportModal(false);
      setReportForm({ findings: '', impression: '', recommendations: '', reportText: '' });
      loadRequests();
    } catch (error) {
      console.error('Error creating report:', error);
      toast.error('Failed to create report');
    }
  };

  const handleViewImages = async (requestId) => {
    try {
      const request = await getImagingRequestById(requestId);
      setSelectedRequest(request);
      const images = await getImagingImages(requestId);
      setCompleteForm({ ...completeForm, imageUrls: images.map(img => img.imageUrl) });
      setShowImagesModal(true);
    } catch (error) {
      console.error('Error loading images:', error);
      toast.error('Failed to load images');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case IMAGING_STATUS.REQUESTED:
        return 'bg-yellow-100 text-yellow-800';
      case IMAGING_STATUS.SCHEDULED:
        return 'bg-blue-100 text-blue-800';
      case IMAGING_STATUS.IN_PROGRESS:
        return 'bg-purple-100 text-purple-800';
      case IMAGING_STATUS.COMPLETED:
        return 'bg-orange-100 text-orange-800';
      case IMAGING_STATUS.REVIEWED:
        return 'bg-green-100 text-green-800';
      case IMAGING_STATUS.CANCELLED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case IMAGING_PRIORITY.EMERGENCY:
        return 'text-red-600 font-bold';
      case IMAGING_PRIORITY.STAT:
        return 'text-orange-600 font-semibold';
      case IMAGING_PRIORITY.URGENT:
        return 'text-yellow-600 font-medium';
      default:
        return 'text-gray-600';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Radiology Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage imaging requests and radiologist reports
          </p>
        </div>
        {!isRadiologyStaff && (
          <button
            onClick={() => setShowRequestModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Request Imaging
          </button>
        )}
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Camera className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Requested</p>
                <p className="text-2xl font-bold text-gray-900">{stats.requested}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">{stats.scheduled}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reviewed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.reviewed}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">X-Ray</p>
                <p className="text-2xl font-bold text-gray-900">{stats.byType?.xray || 0}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Camera className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              {Object.values(IMAGING_STATUS).map(status => (
                <option key={status} value={status}>
                  {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Imaging Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              {Object.values(IMAGING_TYPE).map(type => (
                <option key={type} value={type}>
                  {type.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Client name or ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Client</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Body Part</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Priority</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Scheduled</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    Loading requests...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    No imaging requests found
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {request.clientName || request.clientId?.substring(0, 8)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {request.imagingType.toUpperCase()}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {request.bodyPart || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs ${getPriorityColor(request.priority)}`}>
                        {request.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(request.status)}`}>
                        {request.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {request.scheduledDate ? formatDate(request.scheduledDate) : 'Not scheduled'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            if (request.status === IMAGING_STATUS.REQUESTED) {
                              setShowScheduleModal(true);
                            } else if (request.status === IMAGING_STATUS.SCHEDULED || request.status === IMAGING_STATUS.IN_PROGRESS) {
                              setShowCompleteModal(true);
                            } else if (request.status === IMAGING_STATUS.COMPLETED && isRadiologist) {
                              setShowReportModal(true);
                            } else if (request.status === IMAGING_STATUS.REVIEWED) {
                              handleViewImages(request.id);
                            }
                          }}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          {request.status === IMAGING_STATUS.REQUESTED && 'Schedule'}
                          {request.status === IMAGING_STATUS.SCHEDULED && 'Complete'}
                          {request.status === IMAGING_STATUS.COMPLETED && isRadiologist && 'Report'}
                          {request.status === IMAGING_STATUS.REVIEWED && 'View'}
                        </button>
                        {request.status === IMAGING_STATUS.COMPLETED && (
                          <button
                            onClick={() => handleViewImages(request.id)}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                            title="View Images"
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Request Imaging</h3>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Client ID *
                  </label>
                  <input
                    type="text"
                    value={requestForm.clientId}
                    onChange={(e) => setRequestForm({ ...requestForm, clientId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter Client ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={requestForm.clientName}
                    onChange={(e) => setRequestForm({ ...requestForm, clientName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Client name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Imaging Type *
                  </label>
                  <select
                    value={requestForm.imagingType}
                    onChange={(e) => setRequestForm({ ...requestForm, imagingType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Object.values(IMAGING_TYPE).map(type => (
                      <option key={type} value={type}>
                        {type.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={requestForm.priority}
                    onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Object.values(IMAGING_PRIORITY).map(priority => (
                      <option key={priority} value={priority}>
                        {priority.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Body Part
                </label>
                <input
                  type="text"
                  value={requestForm.bodyPart}
                  onChange={(e) => setRequestForm({ ...requestForm, bodyPart: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Chest, Abdomen, Head"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Clinical Indication
                </label>
                <textarea
                  value={requestForm.clinicalIndication}
                  onChange={(e) => setRequestForm({ ...requestForm, clinicalIndication: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Reason for imaging request..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Scheduled Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={requestForm.scheduledDate}
                  onChange={(e) => setRequestForm({ ...requestForm, scheduledDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="2"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRequest}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Creating...' : 'Create Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Schedule Imaging</h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Scheduled Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={scheduleForm.scheduledDate}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Radiologist (Optional)
                </label>
                <input
                  type="text"
                  value={scheduleForm.radiologistName}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, radiologistName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Radiologist name"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSchedule}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Complete Imaging</h3>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Upload Images *
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files);
                    setCompleteForm({ ...completeForm, imageFiles: files });
                    const urls = await handleUploadImages(files);
                    setCompleteForm(prev => ({ ...prev, imageUrls: urls }));
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {completeForm.imageUrls.length > 0 && (
                  <p className="text-sm text-green-600 mt-2">
                    {completeForm.imageUrls.length} image(s) uploaded
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Technician Notes
                </label>
                <textarea
                  value={completeForm.technicianNotes}
                  onChange={(e) => setCompleteForm({ ...completeForm, technicianNotes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Notes about the imaging procedure..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCompleteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleComplete}
                  disabled={completeForm.imageUrls.length === 0}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Mark as Completed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Radiologist Report</h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Findings *
                </label>
                <textarea
                  value={reportForm.findings}
                  onChange={(e) => setReportForm({ ...reportForm, findings: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="4"
                  placeholder="Describe the imaging findings..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Impression *
                </label>
                <textarea
                  value={reportForm.impression}
                  onChange={(e) => setReportForm({ ...reportForm, impression: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Clinical impression and diagnosis..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Recommendations
                </label>
                <textarea
                  value={reportForm.recommendations}
                  onChange={(e) => setReportForm({ ...reportForm, recommendations: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="2"
                  placeholder="Recommendations for follow-up..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Report Text
                </label>
                <textarea
                  value={reportForm.reportText}
                  onChange={(e) => setReportForm({ ...reportForm, reportText: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="5"
                  placeholder="Complete radiologist report..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateReport}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Images View Modal */}
      {showImagesModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Imaging Images</h3>
              <button
                onClick={() => {
                  setShowImagesModal(false);
                  setSelectedRequest(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {completeForm.imageUrls.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-gray-500">
                  No images available
                </div>
              ) : (
                completeForm.imageUrls.map((url, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={url}
                      alt={`Imaging ${index + 1}`}
                      className="w-full h-64 object-contain bg-gray-100"
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RadiologyManagement;

