import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { updateUser } from '../api/usersAPI';
import FileUpload from '../components/FileUpload';
import fileStorageService from '../services/fileStorageService';
import { toast } from 'react-toastify';

const OnboardingMedical = () => {
  const navigate = useNavigate();
  const { user, userProfile, updateUserProfile } = useUser();
  const [form, setForm] = useState({
    allergies: userProfile?.allergies || '',
    medicalConditions: userProfile?.medicalConditions || '',
    medications: userProfile?.medications || '',
    doctorName: userProfile?.primaryCareDoctor || ''
  });
  const [medicalFiles, setMedicalFiles] = useState([]);
  const [medicationFiles, setMedicationFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleMedicalFileSelect = (files) => {
    setMedicalFiles(Array.isArray(files) ? files : [files]);
  };

  const handleMedicalFileRemove = (files) => {
    setMedicalFiles(files || []);
  };

  const handleMedicationFileSelect = (files) => {
    setMedicationFiles(Array.isArray(files) ? files : [files]);
  };

  const handleMedicationFileRemove = (files) => {
    setMedicationFiles(files || []);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;
    setSaving(true);
    
    try {
      let uploadedMedicalFiles = [];
      let uploadedMedicationFiles = [];

      // Upload medical history files if any
      if (medicalFiles.length > 0) {
        toast.info('Uploading medical documents...');
        uploadedMedicalFiles = await fileStorageService.uploadMedicalDocuments(
          user.uid,
          medicalFiles,
          (index, progress) => {
            setUploadProgress(prev => ({ ...prev, medical: progress }));
          }
        );
      }

      // Upload medication files if any
      if (medicationFiles.length > 0) {
        toast.info('Uploading medication documents...');
        uploadedMedicationFiles = await fileStorageService.uploadMedicationDocuments(
          user.uid,
          medicationFiles,
          (index, progress) => {
            setUploadProgress(prev => ({ ...prev, medication: progress }));
          }
        );
      }

      // Update user profile with form data and file references
      const updateData = {
        ...form,
        medicalDocuments: uploadedMedicalFiles,
        medicationDocuments: uploadedMedicationFiles,
        onboardingMedicalComplete: true
      };

      await updateUser(user.uid, updateData);
      updateUserProfile({ ...(userProfile || {}), ...updateData });
      
      toast.success('Medical information saved successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving medical information:', error);
      toast.error('Failed to save medical information. Please try again.');
    } finally {
      setSaving(false);
      setUploadProgress({});
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Medical history</h2>
          <p className="text-gray-600">This helps your care team keep you safe.</p>
        </div>
        <form className="space-y-6" onSubmit={onSubmit}>
          {/* Medical History Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Medical History</h3>
            
            <div>
              <label className="form-label">Allergies</label>
              <textarea 
                name="allergies" 
                className="form-input" 
                rows={3} 
                value={form.allergies} 
                onChange={onChange}
                placeholder="List any allergies you have (e.g., penicillin, shellfish, etc.)"
              />
            </div>
            
            <div>
              <label className="form-label">Medical conditions</label>
              <textarea 
                name="medicalConditions" 
                className="form-input" 
                rows={3} 
                value={form.medicalConditions} 
                onChange={onChange}
                placeholder="List any medical conditions (e.g., diabetes, hypertension, etc.)"
              />
            </div>

            {/* Medical History File Upload */}
            <FileUpload
              label="Medical Documents (Optional)"
              accept="image/*,.pdf,.doc,.docx"
              maxSize={10 * 1024 * 1024} // 10MB
              onFileSelect={handleMedicalFileSelect}
              onFileRemove={handleMedicalFileRemove}
              files={medicalFiles}
              multiple={true}
            />
            <p className="text-xs text-gray-500">
              Upload medical records, test results, or other relevant documents
            </p>
          </div>

          {/* Medications Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Current Medications</h3>
            
            <div>
              <label className="form-label">Current medications</label>
              <textarea 
                name="medications" 
                className="form-input" 
                rows={3} 
                value={form.medications} 
                onChange={onChange}
                placeholder="List your current medications with dosages (e.g., Metformin 500mg twice daily)"
              />
            </div>

            {/* Medication File Upload */}
            <FileUpload
              label="Medication Documents (Optional)"
              accept="image/*,.pdf,.doc,.docx"
              maxSize={10 * 1024 * 1024} // 10MB
              onFileSelect={handleMedicationFileSelect}
              onFileRemove={handleMedicationFileRemove}
              files={medicationFiles}
              multiple={true}
            />
            <p className="text-xs text-gray-500">
              Upload prescription labels, medication lists, or pharmacy records
            </p>
          </div>

          {/* Doctor Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Healthcare Provider</h3>
            
            <div>
              <label className="form-label">Primary care doctor</label>
              <input 
                name="doctorName" 
                className="form-input" 
                value={form.doctorName} 
                onChange={onChange}
                placeholder="Dr. John Smith"
              />
            </div>
          </div>

          {/* Upload Progress */}
          {(uploadProgress.medical > 0 || uploadProgress.medication > 0) && (
            <div className="space-y-2">
              {uploadProgress.medical > 0 && (
                <div>
                  <p className="text-sm text-gray-600">Uploading medical documents...</p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${uploadProgress.medical}%` }}
                    ></div>
                  </div>
                </div>
              )}
              {uploadProgress.medication > 0 && (
                <div>
                  <p className="text-sm text-gray-600">Uploading medication documents...</p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${uploadProgress.medication}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-4">
            <button 
              type="submit" 
              className="btn btn-primary w-full" 
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Finish onboarding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OnboardingMedical;


