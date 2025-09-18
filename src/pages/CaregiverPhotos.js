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
  AlertTriangle
} from 'lucide-react';

const CaregiverPhotos = () => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPatient, setFilterPatient] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    // Simulate loading photo data
    const loadPhotos = async () => {
      try {
        setTimeout(() => {
          const mockPhotos = [
            {
              id: 1,
              patientName: 'Adunni Okafor',
              patientId: 'ELD001',
              title: 'Morning medication administration',
              description: 'Patient taking morning diabetes medication as prescribed',
              category: 'medication',
              imageUrl: null,
              thumbnailUrl: null,
              uploadedAt: '2024-01-21T09:30:00Z',
              location: '123 Victoria Island, Lagos',
              tags: ['medication', 'morning', 'diabetes'],
              status: 'approved',
              notes: 'Patient compliant with medication schedule'
            },
            {
              id: 2,
              patientName: 'Grace Johnson',
              patientId: 'ELD002',
              title: 'Physical therapy progress',
              description: 'Patient completing physical therapy exercises',
              category: 'therapy',
              imageUrl: null,
              thumbnailUrl: null,
              uploadedAt: '2024-01-21T10:15:00Z',
              location: '456 Ikoyi, Lagos',
              tags: ['therapy', 'exercise', 'progress'],
              status: 'pending',
              notes: 'Good progress in mobility exercises'
            },
            {
              id: 3,
              patientName: 'Michael Adebayo',
              patientId: 'ELD003',
              title: 'Lunch meal preparation',
              description: 'Healthy diabetic-friendly meal prepared',
              category: 'meal',
              imageUrl: null,
              thumbnailUrl: null,
              uploadedAt: '2024-01-21T12:45:00Z',
              location: '789 Lekki, Lagos',
              tags: ['meal', 'nutrition', 'diabetic'],
              status: 'approved',
              notes: 'Meal follows dietary guidelines'
            },
            {
              id: 4,
              patientName: 'Sarah Williams',
              patientId: 'ELD004',
              title: 'Evening care routine',
              description: 'Patient ready for evening medication and bedtime routine',
              category: 'care',
              imageUrl: null,
              thumbnailUrl: null,
              uploadedAt: '2024-01-21T18:30:00Z',
              location: '321 Surulere, Lagos',
              tags: ['care', 'evening', 'routine'],
              status: 'pending',
              notes: 'Patient comfortable and ready for rest'
            },
            {
              id: 5,
              patientName: 'Adunni Okafor',
              patientId: 'ELD001',
              title: 'Blood sugar monitoring',
              description: 'Blood glucose level check - within normal range',
              category: 'health',
              imageUrl: null,
              thumbnailUrl: null,
              uploadedAt: '2024-01-21T14:00:00Z',
              location: '123 Victoria Island, Lagos',
              tags: ['health', 'monitoring', 'diabetes'],
              status: 'approved',
              notes: 'Blood sugar levels stable'
            }
          ];

          setPhotos(mockPhotos);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading photos:', error);
        setLoading(false);
      }
    };

    loadPhotos();
  }, []);

  const filteredPhotos = photos.filter(photo => {
    const matchesSearch = photo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         photo.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         photo.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPatient = filterPatient === 'all' || photo.patientId === filterPatient;
    const matchesCategory = filterCategory === 'all' || photo.category === filterCategory;
    return matchesSearch && matchesPatient && matchesCategory;
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
    return new Date(timestamp).toLocaleDateString();
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleUploadPhoto = () => {
    setShowUploadModal(true);
  };

  const handleDeletePhoto = (photoId) => {
    setPhotos(photos.filter(photo => photo.id !== photoId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-50 dashboard-full-width dashboard-container">
      {/* Header */}
      <div className="w-full bg-white shadow-sm border-b border-gray-200 px-8 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center">
              <Camera className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Photo Updates</h1>
              <p className="text-gray-600">Document patient care activities with photos and updates</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleUploadPhoto}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Upload Photo
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full p-8 dashboard-full-width">
        {/* Search and Filter */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search photos by title, patient, or description..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={filterPatient}
                onChange={(e) => setFilterPatient(e.target.value)}
              >
                <option value="all">All Patients</option>
                <option value="ELD001">Adunni Okafor</option>
                <option value="ELD002">Grace Johnson</option>
                <option value="ELD003">Michael Adebayo</option>
                <option value="ELD004">Sarah Williams</option>
              </select>
              <select
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
              <button className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                More Filters
              </button>
            </div>
          </div>
        </div>

        {/* Photos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPhotos.map((photo) => (
            <div key={photo.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              {/* Photo Thumbnail */}
              <div className="relative">
                <div className="aspect-w-16 aspect-h-12 bg-gray-200 rounded-t-xl overflow-hidden">
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <ImageIcon className="h-16 w-16 text-gray-400" />
                  </div>
                </div>
                <div className="absolute top-3 left-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(photo.status)}`}>
                    {photo.status}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  <div className="flex space-x-1">
                    <button className="p-1 bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition-all">
                      <Eye className="h-4 w-4 text-gray-600" />
                    </button>
                    <button className="p-1 bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition-all">
                      <Download className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Photo Details */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{photo.title}</h3>
                  <div className="p-1 bg-gray-100 rounded-lg ml-2">
                    {getCategoryIcon(photo.category)}
                  </div>
                </div>

                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{photo.description}</p>

                <div className="space-y-2">
                  <div className="flex items-center text-xs text-gray-600">
                    <User className="h-3 w-3 mr-1" />
                    <span>{photo.patientName}</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-600">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>{formatDate(photo.uploadedAt)}</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-600">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>{formatTime(photo.uploadedAt)}</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-600">
                    <MapPin className="h-3 w-3 mr-1" />
                    <span className="truncate">{photo.location}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {photo.tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                      {tag}
                    </span>
                  ))}
                  {photo.tags.length > 3 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                      +{photo.tags.length - 3}
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex justify-between">
                  <button
                    onClick={() => setSelectedPhoto(photo)}
                    className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    View Details
                  </button>
                  <div className="flex space-x-1">
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Photo Update</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Patient</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  <option>Adunni Okafor</option>
                  <option>Grace Johnson</option>
                  <option>Michael Adebayo</option>
                  <option>Sarah Williams</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  <option value="medication">Medication</option>
                  <option value="therapy">Therapy</option>
                  <option value="meal">Meal</option>
                  <option value="care">Care</option>
                  <option value="health">Health</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter photo title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows="3"
                  placeholder="Enter photo description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Photo</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                Upload Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaregiverPhotos;
