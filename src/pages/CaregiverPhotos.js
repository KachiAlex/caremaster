import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Search, 
  Filter, 
  User, 
  Calendar, 
  Clock, 
  MapPin,
  Heart,
  FileText,
  Star,
  Download,
  Eye,
  Trash2,
  Edit,
  Plus,
  Image as ImageIcon,
  Video,
  CheckCircle,
  AlertTriangle,
  X
} from 'lucide-react';

import fileStorageService from '../services/fileStorageService';
import { useUser } from '../contexts/UserContext';
import UserNameWithAvatar from '../components/UserNameWithAvatar';
import { createCareLog, getCareLogsByCaregiver } from '../api/careLogsAPI';
import { getClientsByCaregiver } from '../api/patientsAPI';
import { toast } from 'react-toastify';

const CaregiverPhotos = () => {
  const { userProfile } = useUser();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPatient, setFilterPatient] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    clientId: '',
    clientName: '',
    category: 'care',
    title: '',
    description: '',
    files: [],
    activityDate: '',
    activityTime: '',
    location: ''
  });
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    category: '',
    keyword: ''
  });
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!userProfile) return;
        const caregiverId = userProfile.id || userProfile.uid;
        const [logs, clients] = await Promise.all([
          getCareLogsByCaregiver(caregiverId),
          getClientsByCaregiver(caregiverId).catch(() => [])
        ]);
        setPhotos(logs);
        setAssignedPatients(clients || []);
      } catch (error) {
        console.error('Error loading care logs/clients:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [userProfile]);

  const filteredLogs = photos.filter(log => {
    const createdTime = log.createdAt?.toDate ? log.createdAt.toDate().getTime() : 0;
    const startOk = filters.startDate ? createdTime >= new Date(filters.startDate).getTime() : true;
    const endOk = filters.endDate ? createdTime <= new Date(filters.endDate).getTime() + 86399999 : true;
    const categoryOk = filters.category ? (log.category || '').toLowerCase() === filters.category.toLowerCase() : true;
    const kw = filters.keyword.trim().toLowerCase();
    const keywordOk = kw ? ((log.title||'').toLowerCase().includes(kw) || (log.content||'').toLowerCase().includes(kw)) : true;
    return startOk && endOk && categoryOk && keywordOk;
  });

  const pagedLogs = filteredLogs.slice((page-1)*pageSize, page*pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));

  const filteredPhotos = photos.filter(photo => {
    const matchesSearch = photo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         photo.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         photo.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPatient = filterPatient === 'all' || photo.clientId === filterPatient;
    const matchesCategory = filterCategory === 'all' || photo.category === filterCategory;
    const createdTime = photo.uploadedAt ? new Date(photo.uploadedAt).getTime() : 0;
    const startOk = filters.startDate ? createdTime >= new Date(filters.startDate).getTime() : true;
    const endOk = filters.endDate ? createdTime <= new Date(filters.endDate).getTime() + 86399999 : true;
    return matchesSearch && matchesPatient && matchesCategory && startOk && endOk;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'medication':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'therapy':
        return <Heart className="h-5 w-5 text-green-600" />;
      case 'meal':
        return <FileText className="h-5 w-5 text-orange-600" />;
      case 'care':
        return <User className="h-5 w-5 text-purple-600" />;
      case 'health':
        return <Heart className="h-5 w-5 text-red-600" />;
      default:
        return <ImageIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'No date';
    try {
      // Handle Firestore timestamp objects
      let date;
      if (timestamp && typeof timestamp === 'object' && timestamp.toDate) {
        date = timestamp.toDate();
      } else if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        date = new Date(timestamp);
      }
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Date formatting error:', error, timestamp);
      return 'Invalid date';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'No time';
    try {
      // Handle Firestore timestamp objects
      let date;
      if (timestamp && typeof timestamp === 'object' && timestamp.toDate) {
        date = timestamp.toDate();
      } else if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        date = new Date(timestamp);
      }
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Time formatting error:', error, timestamp);
      return 'Invalid time';
    }
  };

  const handleUploadPhoto = () => {
    setShowUploadModal(true);
  };

  const handleDeletePhoto = async (photoId) => {
    console.log('Delete photo clicked:', photoId);
    if (window.confirm('Are you sure you want to delete this care log? This action cannot be undone.')) {
      try {
        // Import the delete function from the API
        const { deleteCareLog } = await import('../api/careLogsAPI');
        await deleteCareLog(photoId);
        
        // Update local state
        setPhotos(photos.filter(photo => photo.id !== photoId));
        
        // Close modal if the deleted photo was selected
        if (selectedPhoto && selectedPhoto.id === photoId) {
          setSelectedPhoto(null);
        }
        
        toast.success('Care log deleted successfully');
      } catch (error) {
        console.error('Error deleting care log:', error);
        toast.error('Failed to delete care log');
      }
    }
  };

  const handleEditPhoto = (photo) => {
    console.log('Edit photo clicked:', photo);
    setSelectedPhoto(photo);
    setForm({
      clientId: photo.clientId || '',
      clientName: photo.clientName || '',
      category: photo.category || 'care',
      title: photo.title || '',
      description: photo.description || photo.content || '',
      activityDate: photo.activityDate || '',
      activityTime: photo.activityTime || '',
      files: photo.media || []
    });
    setShowEditModal(true);
  };

  const handleUpdatePhoto = async () => {
    console.log('Update photo clicked:', selectedPhoto, form);
    try {
      setUploading(true);
      const { updateCareLog } = await import('../api/careLogsAPI');
      
      const updateData = {
        title: form.title,
        content: `Date: ${form.activityDate || 'Not specified'}\nTime: ${form.activityTime || 'Not specified'}\n\nDescription: ${form.description}`,
        category: form.category,
        clientName: form.clientName
      };

      console.log('Updating with data:', updateData);
      await updateCareLog(selectedPhoto.id, updateData);
      
      // Update local state
      setPhotos(photos.map(photo => 
        photo.id === selectedPhoto.id 
          ? { ...photo, ...updateData }
          : photo
      ));
      
      setShowEditModal(false);
      setSelectedPhoto(null);
      toast.success('Care log updated successfully');
    } catch (error) {
      console.error('Error updating care log:', error);
      toast.error('Failed to update care log');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-50">
      {/* Header */}
      <div className="w-full bg-white shadow-sm border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center">
              <Camera className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Care Logs</h1>
              <p className="text-gray-600">Upload your report on your activity with the client</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleUploadPhoto}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Care Log
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Search and Filter */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search photos by title, Client, or description..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                value={filterPatient}
                onChange={(e) => setFilterPatient(e.target.value)}
              >
                <option value="all">All clients</option>
              </select>
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="medication">Medication</option>
                <option value="therapy">Therapy</option>
                <option value="meal">Meal</option>
                <option value="care">Care</option>
                <option value="health">Health</option>
              </select>
              <input 
                type="date"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                value={filters.startDate}
                onChange={(e)=>setFilters({...filters, startDate:e.target.value})}
                placeholder="Start date"
              />
              <input 
                type="date"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                value={filters.endDate}
                onChange={(e)=>setFilters({...filters, endDate:e.target.value})}
                placeholder="End date"
              />
              <input 
                type="text"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                value={filters.keyword}
                onChange={(e)=>setFilters({...filters, keyword:e.target.value})}
                placeholder="Keyword"
              />
            </div>
          </div>
        </div>

        {/* Care Logs Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Care Log
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPhotos.map((photo) => (
                  <tr key={photo.id} className="hover:bg-gray-50 transition-colors">
                    {/* Care Log Details */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          <div className="h-12 w-12 bg-gray-200 rounded-lg flex items-center justify-center">
                            {getCategoryIcon(photo.category)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 line-clamp-1">
                            {photo.title || 'Care Log Entry'}
                          </div>
                          <div className="text-sm text-gray-500 line-clamp-1">
                            {photo.description || photo.content || 'No description'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Client Info */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserNameWithAvatar
                          userId={photo.clientId}
                          userName={photo.clientName || 'Unknown Client'}
                          userType="client"
                          profilePictureUrl={photo.patientProfilePicture}
                          size="small"
                          className="mr-3"
                        />
                        <div className="text-sm text-gray-500">
                          {photo.location || 'No location'}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {photo.category || 'care'}
                      </span>
                    </td>

                    {/* Date & Time */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(photo.createdAt)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatTime(photo.createdAt)}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(photo.status || 'pending')}`}>
                        {photo.status || 'pending'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedPhoto(photo)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Details
                        </button>
                        <div className="flex items-center space-x-1">
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('Edit button clicked for photo:', photo);
                              handleEditPhoto(photo);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Edit care log"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('Delete button clicked for photo ID:', photo.id);
                              handleDeletePhoto(photo.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete care log"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State */}
        {filteredPhotos.length === 0 && (
          <div className="text-center py-12">
            <Camera className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No photos found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try adjusting your search criteria' : 'No photos match the selected filters'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {filteredPhotos.length > 0 && (
          <div className="mt-8 flex items-center justify-between">
            <button 
              disabled={page<=1}
              onClick={()=> setPage(prev=> Math.max(1, prev-1))}
              className={`px-4 py-2 rounded-lg border ${page<=1? 'text-gray-400 border-gray-200' : 'text-gray-700 hover:bg-gray-50 border-gray-300'}`}
            >
              Previous
            </button>
            <div className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </div>
            <button 
              disabled={page>=totalPages}
              onClick={()=> setPage(prev=> Math.min(totalPages, prev+1))}
              className={`px-4 py-2 rounded-lg border ${page>=totalPages? 'text-gray-400 border-gray-200' : 'text-gray-700 hover:bg-gray-50 border-gray-300'}`}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Care Log</h3>
              <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Client</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={form.clientId}
                  onChange={(e)=>{
                    const pid = e.target.value;
                    const p = assignedPatients.find(x=>x.id===pid);
                    setForm({...form, clientId: pid, clientName: p?.name || ''});
                  }}
                >
                  <option value="">Select a Client</option>
                  {assignedPatients.map(p=> (
                    <option key={p.id} value={p.id}>{p.name || p.id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={form.category}
                  onChange={(e)=>setForm({...form, category:e.target.value})}
                >
                  <option value="care">Care</option>
                  <option value="medication">Medication</option>
                  <option value="therapy">Therapy</option>
                  <option value="meal">Meal</option>
                  <option value="health">Health</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Activity Date & Time</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={form.activityDate || ''}
                    onChange={(e)=>setForm({...form, activityDate:e.target.value})}
                  />
                  <input
                    type="time"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={form.activityTime || ''}
                    onChange={(e)=>setForm({...form, activityTime:e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter location (e.g., Client's home, Hospital, Clinic)"
                  value={form.location}
                  onChange={(e)=>setForm({...form, location:e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Activity Title</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter activity title"
                  value={form.title}
                  onChange={(e)=>setForm({...form, title:e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows="3"
                  placeholder="Describe the activities performed with the client"
                  value={form.description}
                  onChange={(e)=>setForm({...form, description:e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Supporting Media (optional)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="mt-2"
                    onChange={(e)=>setForm({...form, files: Array.from(e.target.files||[])})}
                  />
                </div>
              </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                disabled={uploading}
                onClick={async ()=>{
                  try {
                    // Validate required fields
                    if (!form.location.trim()) {
                      alert('Please enter a location for this care log.');
                      return;
                    }
                    
                    setUploading(true);
                    const caregiverId = userProfile?.id || userProfile?.uid;
                    let media = [];
                    if (form.files && form.files.length) {
                      const uploads = await fileStorageService.uploadFiles(form.files, `care-logs/${caregiverId}`);
                      media = uploads.map(u=>({ url: u.downloadURL, path: u.path, type: u.type }));
                    }
                     await createCareLog({
                       clientId: form.clientId,
                       clientName: form.clientName,
                       caregiverId,
                       category: form.category,
                       title: form.title,
                       location: form.location,
                       content: `Date: ${form.activityDate || 'Not specified'}\nTime: ${form.activityTime || 'Not specified'}\n\nDescription: ${form.description}`,
                       media
                     });
                    setShowUploadModal(false);
                    setForm({ clientId:'', clientName:'', category:'care', title:'', description:'', files:[], activityDate:'', activityTime:'', location:'' });
                    // reload
                    const logs = await getCareLogsByCaregiver(caregiverId);
                    setPhotos(logs);
                  } catch (e) {
                    console.error('Failed to save care log', e);
                  } finally {
                    setUploading(false);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {uploading? 'Saving...' : 'Send Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Care Log Details Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Care Log Details</h3>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Basic Information */}
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Basic Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 bg-gray-200 rounded-lg flex items-center justify-center">
                            {getCategoryIcon(selectedPhoto.category)}
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {selectedPhoto.title || 'Care Log Entry'}
                          </div>
                          <div className="text-sm text-gray-500">
                            Category: {selectedPhoto.category || 'care'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="h-4 w-4 mr-2" />
                        <span><strong>Client:</strong> {selectedPhoto.clientName || 'Unknown Client'}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span><strong>Date:</strong> {formatDate(selectedPhoto.createdAt)}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        <span><strong>Time:</strong> {formatTime(selectedPhoto.createdAt)}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span><strong>Location:</strong> {selectedPhoto.location || 'No location specified'}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedPhoto.status || 'pending')}`}>
                          <strong>Status:</strong> {selectedPhoto.status || 'pending'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Description</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedPhoto.description || selectedPhoto.content || 'No description provided'}
                    </p>
                  </div>
                </div>

                {/* Right Column - Media and Additional Details */}
                <div className="space-y-6">
                  {/* Media Files */}
                  {selectedPhoto.media && selectedPhoto.media.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-lg font-medium text-gray-900 mb-3">Attached Media</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedPhoto.media.map((media, index) => (
                          <div key={index} className="bg-white rounded-lg p-3 border">
                            <div className="flex items-center space-x-2">
                              <div className="flex-shrink-0">
                                {media.type?.startsWith('image/') ? (
                                  <ImageIcon className="h-6 w-6 text-blue-600" />
                                ) : (
                                  <Video className="h-6 w-6 text-red-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-600 truncate">
                                  {media.type?.startsWith('image/') ? 'Image' : 'Video'} File
                                </p>
                                <a 
                                  href={media.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  View File
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedPhoto.tags && selectedPhoto.tags.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-lg font-medium text-gray-900 mb-3">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedPhoto.tags.map((tag, index) => (
                          <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Caregiver Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Caregiver Information</h4>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="h-4 w-4 mr-2" />
                        <span><strong>Caregiver ID:</strong> {selectedPhoto.caregiverId || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span><strong>Created:</strong> {formatDate(selectedPhoto.createdAt)}</span>
                      </div>
                      {selectedPhoto.updatedAt && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="h-4 w-4 mr-2" />
                          <span><strong>Last Updated:</strong> {formatDate(selectedPhoto.updatedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Modal edit button clicked for photo:', selectedPhoto);
                    handleEditPhoto(selectedPhoto);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Edit className="h-4 w-4 mr-2 inline" />
                  Edit Log
                </button>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Modal delete button clicked for photo ID:', selectedPhoto.id);
                    handleDeletePhoto(selectedPhoto.id);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="h-4 w-4 mr-2 inline" />
                  Delete Log
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Care Log</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={form.category}
                    onChange={(e)=>setForm({...form, category:e.target.value})}
                  >
                    <option value="care">Care</option>
                    <option value="medication">Medication</option>
                    <option value="therapy">Therapy</option>
                    <option value="meal">Meal</option>
                    <option value="health">Health</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Activity Date & Time</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      value={form.activityDate || ''}
                      onChange={(e)=>setForm({...form, activityDate:e.target.value})}
                    />
                    <input
                      type="time"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      value={form.activityTime || ''}
                      onChange={(e)=>setForm({...form, activityTime:e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Activity Title</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter activity title"
                    value={form.title}
                    onChange={(e)=>setForm({...form, title:e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows="3"
                    placeholder="Describe the activities performed with the client"
                    value={form.description}
                    onChange={(e)=>setForm({...form, description:e.target.value})}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedPhoto(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                disabled={uploading}
                onClick={handleUpdatePhoto}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {uploading ? 'Updating...' : 'Update Log'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaregiverPhotos;
