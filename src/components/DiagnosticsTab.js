import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Upload, 
  Stethoscope, 
  Calendar, 
  User, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Eye,
  Edit,
  Plus,
  Download,
  FileImage,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';
import * as diagnosticsAPI from '../api/diagnosticsAPI';

const DiagnosticsTab = ({ 
  clientId, 
  clientName, 
  userProfile, 
  institutionId,
  onClose 
}) => {
  const [diagnostics, setDiagnostics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Role checks
  const isDoctor = (userProfile?.medicalQualification || '').includes('Doctor') || 
                   userProfile?.role === 'doctor' || 
                   userProfile?.userType === 'doctor' || 
                   userProfile?.type === 'doctor';
  
  const isNurse = (userProfile?.medicalQualification || '').includes('Nurse') || 
                  userProfile?.role === 'nurse' || 
                  userProfile?.userType === 'nurse' || 
                  userProfile?.type === 'nurse';

  const canOrderTests = isDoctor;
  const canUploadResults = isNurse;
  const canAddNotes = isDoctor;
  const canViewAll = isDoctor || isNurse;

  // Load diagnostics
  const loadDiagnostics = useCallback(async () => {
    if (!clientId) return;

    try {
      setLoading(true);
      const diagnosticsData = await diagnosticsAPI.getClientDiagnostics(clientId);
      setDiagnostics(diagnosticsData);
    } catch (error) {
      console.error('Error loading diagnostics:', error);
      toast.error('Failed to load diagnostic tests');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadDiagnostics();
  }, [loadDiagnostics]);

  // Real-time subscription
  useEffect(() => {
    if (!clientId) return;

    const unsubscribe = diagnosticsAPI.subscribeToClientDiagnostics(
      clientId,
      (diagnosticsData) => {
        setDiagnostics(diagnosticsData);
      }
    );

    return () => unsubscribe();
  }, [clientId]);

  // Filter diagnostics
  const filteredDiagnostics = diagnostics.filter(diagnostic => {
    const matchesSearch = diagnostic.testType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         diagnostic.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || diagnostic.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Order new diagnostic test
  const handleOrderTest = async (testData) => {
    try {
      await diagnosticsAPI.createDiagnosticTest({
        ...testData,
        clientId,
        clientName,
        institutionId,
        orderedBy: userProfile.uid,
        orderedByName: userProfile.displayName || userProfile.email
      });
      
      toast.success('Diagnostic test ordered successfully');
      setActiveModal(null);
      loadDiagnostics();
    } catch (error) {
      console.error('Error ordering test:', error);
      toast.error('Failed to order diagnostic test');
    }
  };

  // Upload results
  const handleUploadResults = async (resultsData) => {
    try {
      await diagnosticsAPI.uploadDiagnosticResults(selectedDiagnostic.id, {
        ...resultsData,
        uploadedBy: userProfile.uid,
        uploadedByName: userProfile.displayName || userProfile.email
      });
      
      toast.success('Results uploaded successfully');
      setActiveModal(null);
      setSelectedDiagnostic(null);
      loadDiagnostics();
    } catch (error) {
      console.error('Error uploading results:', error);
      toast.error('Failed to upload results');
    }
  };

  // Add doctor notes
  const handleAddDoctorNotes = async (notesData) => {
    try {
      await diagnosticsAPI.addDoctorNotes(selectedDiagnostic.id, {
        ...notesData,
        addedBy: userProfile.uid,
        addedByName: userProfile.displayName || userProfile.email
      });
      
      toast.success('Doctor notes added successfully');
      setActiveModal(null);
      setSelectedDiagnostic(null);
      loadDiagnostics();
    } catch (error) {
      console.error('Error adding doctor notes:', error);
      toast.error('Failed to add doctor notes');
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled': return <X className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading diagnostics...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Stethoscope className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Diagnostic Tests & Results
          </h2>
          <span className="text-sm text-gray-500">for {clientName}</span>
        </div>
        
        <div className="flex items-center space-x-3">
          {canOrderTests && (
            <button
              onClick={() => setActiveModal('orderTest')}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Order Test
            </button>
          )}
        </div>
      </div>

      {/* Role-Based Information Banner */}
      {!isDoctor && !isNurse && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-blue-900 mb-1">📋 View-Only Access</h3>
              <p className="text-sm text-blue-800">
                As a non-medical caregiver, you can view diagnostic results and test reports for your assigned clients 
                but cannot order new diagnostic tests. Diagnostic test results, lab reports, and imaging studies for this 
                client are displayed below. Review these results to understand the client's medical status and any ongoing 
                monitoring requirements.
              </p>
            </div>
          </div>
        </div>
      )}

      {isNurse && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-5 mb-6">
          <div className="flex items-start space-x-3">
            <Upload className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-purple-900 mb-1">💉 Nurse Role</h3>
              <p className="text-sm text-purple-800">
                You can upload lab results, scan results, and other diagnostic documents for tests ordered by doctors. 
                Click on any pending test below to upload results and documents.
              </p>
            </div>
          </div>
        </div>
      )}

      {isDoctor && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-5 mb-6">
          <div className="flex items-start space-x-3">
            <Stethoscope className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-green-900 mb-1">🩺 Doctor Role</h3>
              <p className="text-sm text-green-800">
                You can order diagnostic tests and add clinical notes based on lab results. Review uploaded results 
                and provide diagnosis, interpretation, and treatment recommendations.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search tests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Diagnostics List */}
      <div className="space-y-4">
        {filteredDiagnostics.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Stethoscope className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No diagnostic tests found</p>
            {canOrderTests && (
              <p className="text-sm mt-2">Click "Order Test" to add the first diagnostic test</p>
            )}
          </div>
        ) : (
          filteredDiagnostics.map((diagnostic) => (
            <div
              key={diagnostic.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(diagnostic.status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(diagnostic.status)}`}>
                      {diagnostic.status}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900">{diagnostic.testType}</h3>
                    <p className="text-sm text-gray-600">{diagnostic.reason}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    {diagnostic.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}
                  </span>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setSelectedDiagnostic(diagnostic);
                        setActiveModal('viewDetails');
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    {canUploadResults && diagnostic.status === 'pending' && (
                      <button
                        onClick={() => {
                          setSelectedDiagnostic(diagnostic);
                          setActiveModal('uploadResults');
                        }}
                        className="p-2 text-blue-400 hover:text-blue-600 transition-colors"
                        title="Upload Results"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                    )}
                    
                    {canAddNotes && diagnostic.status === 'completed' && !diagnostic.doctorNotes && (
                      <button
                        onClick={() => {
                          setSelectedDiagnostic(diagnostic);
                          setActiveModal('addNotes');
                        }}
                        className="p-2 text-green-400 hover:text-green-600 transition-colors"
                        title="Add Doctor Notes"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick info */}
              <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                <span>Ordered by: {diagnostic.orderedByName}</span>
                {diagnostic.uploadedByName && (
                  <span>Uploaded by: {diagnostic.uploadedByName}</span>
                )}
                {diagnostic.doctorNotes && (
                  <span className="text-green-600">✓ Doctor notes added</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {activeModal === 'orderTest' && (
        <OrderTestModal
          onSubmit={handleOrderTest}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'viewDetails' && selectedDiagnostic && (
        <ViewDetailsModal
          diagnostic={selectedDiagnostic}
          canUploadResults={canUploadResults}
          canAddNotes={canAddNotes}
          onUploadResults={() => setActiveModal('uploadResults')}
          onAddNotes={() => setActiveModal('addNotes')}
          onClose={() => {
            setActiveModal(null);
            setSelectedDiagnostic(null);
          }}
        />
      )}

      {activeModal === 'uploadResults' && selectedDiagnostic && (
        <UploadResultsModal
          diagnostic={selectedDiagnostic}
          onSubmit={handleUploadResults}
          onClose={() => {
            setActiveModal(null);
            setSelectedDiagnostic(null);
          }}
        />
      )}

      {activeModal === 'addNotes' && selectedDiagnostic && (
        <AddNotesModal
          diagnostic={selectedDiagnostic}
          onSubmit={handleAddDoctorNotes}
          onClose={() => {
            setActiveModal(null);
            setSelectedDiagnostic(null);
          }}
        />
      )}
    </div>
  );
};

// Order Test Modal
const OrderTestModal = ({ onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    testType: '',
    reason: '',
    urgency: 'normal',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Order Diagnostic Test</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Test Type
            </label>
            <input
              type="text"
              required
              value={formData.testType}
              onChange={(e) => setFormData({ ...formData, testType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Blood Test, X-Ray, MRI"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason
            </label>
            <textarea
              required
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
              placeholder="Reason for ordering this test..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Urgency
            </label>
            <select
              value={formData.urgency}
              onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="2"
              placeholder="Any additional notes..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Order Test
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// View Details Modal
const ViewDetailsModal = ({ 
  diagnostic, 
  canUploadResults, 
  canAddNotes, 
  onUploadResults, 
  onAddNotes, 
  onClose 
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Diagnostic Test Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Test Type</label>
              <p className="text-gray-900">{diagnostic.testType}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                diagnostic.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                diagnostic.status === 'completed' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {diagnostic.status}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Ordered By</label>
              <p className="text-gray-900">{diagnostic.orderedByName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Ordered Date</label>
              <p className="text-gray-900">
                {diagnostic.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
              </p>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{diagnostic.reason}</p>
          </div>

          {/* Results */}
          {diagnostic.results && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Results</label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{diagnostic.results}</p>
              
              {diagnostic.uploadedDocuments && diagnostic.uploadedDocuments.length > 0 && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Uploaded Documents</label>
                  <div className="space-y-2">
                    {diagnostic.uploadedDocuments.map((doc, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                        <FileText className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-gray-900">{doc.name}</span>
                        <button className="text-blue-600 hover:text-blue-800">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Doctor Notes */}
          {diagnostic.doctorNotes && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Doctor Notes</label>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-gray-900 mb-2">{diagnostic.doctorNotes.notes}</p>
                {diagnostic.doctorNotes.diagnosis && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-blue-700">Diagnosis:</label>
                    <p className="text-blue-900">{diagnostic.doctorNotes.diagnosis}</p>
                  </div>
                )}
                {diagnostic.doctorNotes.recommendations && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-blue-700">Recommendations:</label>
                    <p className="text-blue-900">{diagnostic.doctorNotes.recommendations}</p>
                  </div>
                )}
                <div className="mt-2 text-xs text-blue-600">
                  Added by: {diagnostic.doctorNotes.addedByName} • 
                  {diagnostic.doctorNotes.addedAt?.toDate?.()?.toLocaleDateString()}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            {canUploadResults && diagnostic.status === 'pending' && (
              <button
                onClick={onUploadResults}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Results
              </button>
            )}
            
            {canAddNotes && diagnostic.status === 'completed' && !diagnostic.doctorNotes && (
              <button
                onClick={onAddNotes}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Add Doctor Notes
              </button>
            )}
            
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Upload Results Modal
const UploadResultsModal = ({ diagnostic, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    results: '',
    uploadedDocuments: []
  });

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newDocuments = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }));
    
    setFormData({
      ...formData,
      uploadedDocuments: [...formData.uploadedDocuments, ...newDocuments]
    });
  };

  const removeDocument = (index) => {
    const newDocuments = formData.uploadedDocuments.filter((_, i) => i !== index);
    setFormData({ ...formData, uploadedDocuments: newDocuments });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Upload Test Results</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Test:</strong> {diagnostic.testType}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Test Results
            </label>
            <textarea
              required
              value={formData.results}
              onChange={(e) => setFormData({ ...formData, results: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="6"
              placeholder="Enter the test results and findings..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload Documents
            </label>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleFileUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Supported formats: PDF, JPG, PNG, DOC, DOCX
            </p>
          </div>

          {formData.uploadedDocuments.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selected Files
              </label>
              <div className="space-y-2">
                {formData.uploadedDocuments.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <File className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-gray-900">{doc.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(doc.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDocument(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Upload Results
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add Notes Modal
const AddNotesModal = ({ diagnostic, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    notes: '',
    diagnosis: '',
    recommendations: '',
    followUpRequired: false,
    followUpDate: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add Doctor Notes</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800">
            <strong>Test:</strong> {diagnostic.testType}
          </p>
          {diagnostic.results && (
            <p className="text-sm text-green-700 mt-1">
              <strong>Results:</strong> {diagnostic.results.substring(0, 100)}...
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clinical Notes
            </label>
            <textarea
              required
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="4"
              placeholder="Enter your clinical assessment and observations..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Diagnosis
            </label>
            <textarea
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
              placeholder="Enter diagnosis based on test results..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recommendations
            </label>
            <textarea
              value={formData.recommendations}
              onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
              placeholder="Enter treatment recommendations and next steps..."
            />
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.followUpRequired}
                onChange={(e) => setFormData({ ...formData, followUpRequired: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Follow-up required</span>
            </label>
          </div>

          {formData.followUpRequired && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Follow-up Date
              </label>
              <input
                type="date"
                value={formData.followUpDate}
                onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Add Notes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DiagnosticsTab;
