import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { updateUser } from '../api/usersAPI';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';

const CaregiverOnboardingDocuments = () => {
  const navigate = useNavigate();
  const { user, userProfile, updateUserProfile } = useUser();
  const [form, setForm] = useState({
    documents: userProfile?.documents || []
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const requiredDocuments = [
    {
      id: 'background_check',
      name: 'Background Check',
      description: 'Criminal background check (must be within 2 years)',
      required: true,
      acceptedTypes: ['pdf', 'jpg', 'jpeg', 'png']
    },
    {
      id: 'id_verification',
      name: 'ID Verification',
      description: 'Government-issued photo ID (driver\'s license, passport, etc.)',
      required: true,
      acceptedTypes: ['pdf', 'jpg', 'jpeg', 'png']
    },
    {
      id: 'cpr_certification',
      name: 'CPR Certification',
      description: 'Current CPR/First Aid certification',
      required: true,
      acceptedTypes: ['pdf', 'jpg', 'jpeg', 'png']
    },
    {
      id: 'tb_test',
      name: 'TB Test Results',
      description: 'Tuberculosis test results (must be within 1 year)',
      required: true,
      acceptedTypes: ['pdf', 'jpg', 'jpeg', 'png']
    },
    {
      id: 'immunization_record',
      name: 'Immunization Record',
      description: 'Vaccination records (COVID-19, flu, etc.)',
      required: false,
      acceptedTypes: ['pdf', 'jpg', 'jpeg', 'png']
    },
    {
      id: 'insurance_certificate',
      name: 'Insurance Certificate',
      description: 'Professional liability insurance (if applicable)',
      required: false,
      acceptedTypes: ['pdf', 'jpg', 'jpeg', 'png']
    }
  ];

  const handleFileUpload = async (file, documentType) => {
    setUploading(true);
    try {
      // Simulate file upload - in a real app, you'd upload to a cloud storage service
      const mockUpload = new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: Date.now().toString(),
            name: file.name,
            type: file.type,
            size: file.size,
            url: URL.createObjectURL(file), // Mock URL
            uploadedAt: new Date().toISOString(),
            status: 'uploaded'
          });
        }, 2000);
      });

      const uploadedFile = await mockUpload;
      
      setForm(prev => ({
        ...prev,
        documents: [
          ...prev.documents.filter(doc => doc.type !== documentType),
          {
            type: documentType,
            file: uploadedFile,
            uploadedAt: uploadedFile.uploadedAt
          }
        ]
      }));
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e, documentType) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      const document = requiredDocuments.find(doc => doc.id === documentType);
      
      if (document && document.acceptedTypes.includes(file.type.split('/')[1])) {
        handleFileUpload(file, documentType);
      } else {
        alert(`Please upload a ${document.acceptedTypes.join(', ')} file.`);
      }
    }
  };

  const handleFileSelect = (e, documentType) => {
    const file = e.target.files[0];
    if (file) {
      const document = requiredDocuments.find(doc => doc.id === documentType);
      
      if (document && document.acceptedTypes.includes(file.type.split('/')[1])) {
        handleFileUpload(file, documentType);
      } else {
        alert(`Please upload a ${document.acceptedTypes.join(', ')} file.`);
      }
    }
  };

  const removeDocument = (documentType) => {
    setForm(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.type !== documentType)
    }));
  };

  const getDocumentStatus = (documentType) => {
    const document = form.documents.find(doc => doc.type === documentType);
    return document ? 'uploaded' : 'missing';
  };

  const isFormValid = () => {
    const requiredDocTypes = requiredDocuments.filter(doc => doc.required).map(doc => doc.id);
    const uploadedDocTypes = form.documents.map(doc => doc.type);
    return requiredDocTypes.every(type => uploadedDocTypes.includes(type));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;
    setSaving(true);
    try {
      await updateUser(user.uid, { 
        ...form, 
        onboardingDocumentsComplete: true
      });
      updateUserProfile({ ...(userProfile || {}), ...form, onboardingDocumentsComplete: true });
      navigate('/caregiver/onboarding/statement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Required Documents</h2>
          <p className="text-gray-600 mt-2">Upload your professional documents and certifications</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {requiredDocuments.map((document) => {
            const status = getDocumentStatus(document.id);
            const uploadedDoc = form.documents.find(doc => doc.type === document.id);
            
            return (
              <div key={document.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{document.name}</h3>
                      {document.required && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                          Required
                        </span>
                      )}
                      {status === 'uploaded' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {status === 'missing' && document.required && (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{document.description}</p>
                    <p className="text-xs text-gray-500">
                      Accepted formats: {document.acceptedTypes.join(', ').toUpperCase()}
                    </p>
                  </div>
                </div>

                {status === 'uploaded' && uploadedDoc ? (
                  <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-green-600" />
                        <div>
                          <p className="font-medium text-green-900">{uploadedDoc.file.name}</p>
                          <p className="text-sm text-green-700">
                            Uploaded: {new Date(uploadedDoc.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDocument(document.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                    }`}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, document.id)}
                  >
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      Drop your file here or click to browse
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      Maximum file size: 10MB
                    </p>
                    <input
                      type="file"
                      accept={document.acceptedTypes.map(type => `.${type}`).join(',')}
                      onChange={(e) => handleFileSelect(e, document.id)}
                      className="hidden"
                      id={`file-${document.id}`}
                    />
                    <label
                      htmlFor={`file-${document.id}`}
                      className="btn btn-primary cursor-pointer"
                    >
                      Choose File
                    </label>
                  </div>
                )}
              </div>
            );
          })}

          {/* Document Guidelines */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Document Guidelines</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>• <strong>File Formats:</strong> We accept PDF, JPG, JPEG, and PNG files up to 10MB each.</p>
              <p>• <strong>Quality:</strong> Ensure all documents are clear, legible, and not expired.</p>
              <p>• <strong>Privacy:</strong> All documents are encrypted and stored securely. We only use them for verification purposes.</p>
              <p>• <strong>Verification:</strong> We may contact issuing authorities to verify document authenticity.</p>
              <p>• <strong>Updates:</strong> You can update documents at any time through your profile settings.</p>
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
                <p className="text-yellow-800">Uploading document...</p>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => navigate('/caregiver/onboarding/references')}
              className="btn btn-outline"
            >
              Back
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={saving || !isFormValid() || uploading}
            >
              {saving ? 'Saving...' : 'Continue to Personal Statement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CaregiverOnboardingDocuments;
