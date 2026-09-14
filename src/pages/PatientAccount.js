/**
 * Client Account Page
 * 
 * Comprehensive account management page for clients to:
 * - View and edit their profile information
 * - Manage medical information
 * - View their dashboard
 * - Access their medical records
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  User,
  Heart,
  Phone,
  Edit,
  Save,
  X,
  Shield,
  FileText,
  Pill,
  Stethoscope,
  ArrowLeft,
  Upload,
  Trash2,
  CheckCircle,
  Clock
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUser } from '../contexts/UserContext';
import { getPatientById, getPatientByPatientId, updatePatient } from '../api/patientsAPI';
import { updateDoc, doc } from 'backend/database';
import { db } from '../backend/config';
import { uploadClientDocument, deleteClientDocument } from '../utils/clientDocumentUpload';
import GlobalAllergyAlert from '../components/GlobalAllergyAlert';
import EmergencyButton from '../components/EmergencyButton';

const PatientAccount = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { user, userProfile } = useUser();
  
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    gender: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    medicalConditions: '',
    allergies: '',
    medications: '',
    bloodType: '',
    genotype: '',
    nationalId: '',
    primaryCarePhysician: '',
    physicianPhone: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',
    careLevel: ''
  });

  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const patientIdToUse = client?.id || clientId;
    if (!patientIdToUse) {
      toast.error('Patient record not found. Cannot upload.');
      return;
    }

    try {
      setUploading(true);
      const result = await uploadClientDocument(file, patientIdToUse, client?.institutionId || userProfile?.institutionId, type);
      
      if (result.success) {
        // Update patient record with new document
        const currentDocs = client?.metadata?.documents || [];
        const newDocs = [...currentDocs, result];
        
        await updatePatient(patientIdToUse, {
          metadata: {
            ...client.metadata,
            documents: newDocs,
            [`${type}Url`]: result.url // convenience field
          }
        });
        
        toast.success(`${file.name} uploaded successfully`);
        await loadPatientData();
      }
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (docKey) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    
    try {
      setLoading(true);
      await deleteClientDocument(docKey);
      
      const newDocs = (client?.metadata?.documents || []).filter(d => d.key !== docKey);
      
      await updatePatient(client.id, {
        metadata: {
          ...client.metadata,
          documents: newDocs
        }
      });
      
      toast.success('Document deleted');
      await loadPatientData();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete document');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatientData();
  }, [clientId, userProfile, user]);

  const toDateInput = (v) => {
    if (!v) return '';
    const d = v?.toDate ? v.toDate() : new Date(v);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  const loadPatientData = async () => {
    if (!clientId && !userProfile?.clientId && !userProfile?.id && !user?.uid) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setLoadError(null);
      let clientData;

      // Try to get by clientId (registration number) first, then by document ID
      if (clientId) {
        try {
          clientData = await getPatientByPatientId(clientId);
        } catch (error) {
          clientData = await getPatientById(clientId);
        }
      } else if (userProfile?.clientId) {
        // If no clientId in URL, try to get from user profile
        clientData = await getPatientByPatientId(userProfile.clientId);
      } else if (userProfile?.id) {
        clientData = await getPatientById(userProfile.id);
      } else if (user?.uid) {
        // Fallback to user ID
        clientData = await getPatientById(user.uid);
      }

      if (clientData) {
        setClient(clientData);
        setFormData({
          name: clientData.name || clientData.fullName || '',
          email: clientData.email || userProfile?.email || '',
          phone: clientData.phone || clientData.phoneNumber || '',
          address: clientData.address || '',
          dateOfBirth: toDateInput(clientData.dateOfBirth || clientData.dob),
          gender: clientData.gender || '',
          emergencyContactName: clientData.emergencyContactName || '',
          emergencyContactPhone: clientData.emergencyContactPhone || clientData.emergencyContact?.phone || '',
          emergencyContactRelationship: clientData.emergencyContactRelationship || '',
          medicalConditions: clientData.medicalConditions || '',
          allergies: clientData.allergies || '',
          medications: clientData.medications || '',
          bloodType: clientData.bloodType || '',
          genotype: clientData.genotype || '',
          nationalId: clientData.nationalId || '',
          primaryCarePhysician: clientData.primaryCarePhysician || '',
          physicianPhone: clientData.physicianPhone || '',
          insuranceProvider: clientData.insuranceProvider || '',
          insurancePolicyNumber: clientData.insurancePolicyNumber || '',
          careLevel: clientData.careLevel || ''
        });
      }
    } catch (error) {
      console.error('Error loading Client data:', error);
      toast.error('Failed to load Client information');
      setLoadError('Failed to load profile data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const patientIdToUse = client?.id || clientId;

      if (!patientIdToUse) {
        toast.error('Cannot save: no patient ID found');
        setLoading(false);
        return;
      }

      const updateData = Object.fromEntries(
        Object.entries(formData).filter(([_, v]) => v !== '' && v !== undefined && v !== null)
      );
      updateData.updatedAt = new Date().toISOString();

      await updatePatient(patientIdToUse, updateData);
      
      // Also update user document if it exists.
      // The backend PUT /api/data/:table/:id uses a partial update (Knex .update),
      // so only the fields passed here are merged — existing fields are preserved.
      if (user?.uid) {
        try {
          const usersUpdateData = Object.fromEntries(
            Object.entries(updateData).filter(([_, v]) => v !== '' && v != null)
          );
          await updateDoc(doc(db, 'users', user.uid), usersUpdateData);
        } catch (userUpdateError) {
          console.warn('Could not update user document:', userUpdateError);
        }
      }

      toast.success('Account information updated successfully');
      setEditing(false);
      await loadPatientData();
    } catch (error) {
      console.error('Error updating Client:', error);
      toast.error('Failed to update account information');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (loading && !client) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading account information...</p>
        </div>
      </div>
    );
  }

  const age = calculateAge(formData.dateOfBirth);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg hover:bg-slate-800/80 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-slate-400" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-50">My Account</h1>
                <p className="text-sm text-slate-400 mt-1">
                  {client?.clientId ? `Client ID: ${client.clientId}` : 'Manage your account information'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <EmergencyButton variant="header" />
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 transition-colors flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditing(false);
                      loadPatientData();
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 transition-colors flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GlobalAllergyAlert patient={client} />
        
        {loadError && !client && !loading && (
          <div className="p-6 text-center">
            <p className="text-red-600 mb-4">{loadError}</p>
            <button onClick={() => loadPatientData()} className="btn btn-primary">Retry</button>
          </div>
        )}
        {client && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <User className="h-5 w-5 text-blue-400" />
                </div>
                <h2 className="text-lg font-semibold text-slate-50">Personal Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Full Name</label>
                  {editing ? (
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  ) : (
                    <p className="text-slate-50">{formData.name || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Email</label>
                  {editing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  ) : (
                    <p className="text-slate-50">{formData.email || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Phone</label>
                  {editing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  ) : (
                    <p className="text-slate-50">{formData.phone || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Date of Birth</label>
                  {editing ? (
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  ) : (
                    <p className="text-slate-50">
                      {formData.dateOfBirth ? `${new Date(formData.dateOfBirth).toLocaleDateString()} (Age: ${age || 'N/A'})` : 'Not provided'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Gender</label>
                  {editing ? (
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  ) : (
                    <p className="text-slate-50">{formData.gender || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Address</label>
                  {editing ? (
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  ) : (
                    <p className="text-slate-50">{formData.address || 'Not provided'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <Phone className="h-5 w-5 text-red-400" />
                </div>
                <h2 className="text-lg font-semibold text-slate-50">Emergency Contact</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Contact Name</label>
                  {editing ? (
                    <input
                      type="text"
                      name="emergencyContactName"
                      value={formData.emergencyContactName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  ) : (
                    <p className="text-slate-50">{formData.emergencyContactName || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Contact Phone</label>
                  {editing ? (
                    <input
                      type="tel"
                      name="emergencyContactPhone"
                      value={formData.emergencyContactPhone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  ) : (
                    <p className="text-slate-50">{formData.emergencyContactPhone || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Relationship</label>
                  {editing ? (
                    <input
                      type="text"
                      name="emergencyContactRelationship"
                      value={formData.emergencyContactRelationship}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  ) : (
                    <p className="text-slate-50">{formData.emergencyContactRelationship || 'Not provided'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Healthcare Information */}
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <Stethoscope className="h-5 w-5 text-indigo-400" />
                </div>
                <h2 className="text-lg font-semibold text-slate-50">Healthcare Details</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Blood Type</label>
                  {editing ? (
                    <select 
                      name="bloodType"
                      value={formData.bloodType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none"
                    >
                      <option value="">Select</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  ) : <p className="text-slate-50 font-bold">{formData.bloodType || 'N/A'}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Genotype</label>
                  {editing ? (
                    <select 
                      name="genotype"
                      value={formData.genotype}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none"
                    >
                      <option value="">Select</option>
                      {['AA', 'AS', 'SS', 'AC'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  ) : <p className="text-slate-50 font-bold">{formData.genotype || 'N/A'}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Primary Physician</label>
                  {editing ? (
                    <input 
                      name="primaryCarePhysician"
                      value={formData.primaryCarePhysician}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none"
                    />
                  ) : <p className="text-slate-50">{formData.primaryCarePhysician || 'N/A'}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Physician Phone</label>
                  {editing ? (
                    <input 
                      name="physicianPhone"
                      value={formData.physicianPhone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none"
                    />
                  ) : <p className="text-slate-50">{formData.physicianPhone || 'N/A'}</p>}
                </div>
              </div>
            </div>

            {/* Insurance & Identification */}
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Shield className="h-5 w-5 text-amber-400" />
                </div>
                <h2 className="text-lg font-semibold text-slate-50">Insurance & ID</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">National ID (NIN)</label>
                  {editing ? (
                    <input 
                      name="nationalId"
                      value={formData.nationalId}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none"
                    />
                  ) : <p className="text-slate-50 font-mono">{formData.nationalId || 'N/A'}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Care Level</label>
                  {editing ? (
                    <select 
                      name="careLevel"
                      value={formData.careLevel}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none"
                    >
                      <option value="routine">Routine</option>
                      <option value="moderate">Moderate</option>
                      <option value="intensive">Intensive Care</option>
                    </select>
                  ) : <p className="text-slate-50 capitalize">{formData.careLevel || 'Routine'}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Insurance Provider</label>
                  {editing ? (
                    <input 
                      name="insuranceProvider"
                      value={formData.insuranceProvider}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none"
                    />
                  ) : <p className="text-slate-50">{formData.insuranceProvider || 'N/A'}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Policy Number</label>
                  {editing ? (
                    <input 
                      name="insurancePolicyNumber"
                      value={formData.insurancePolicyNumber}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none"
                    />
                  ) : <p className="text-slate-50">{formData.insurancePolicyNumber || 'N/A'}</p>}
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Heart className="h-5 w-5 text-emerald-400" />
                </div>
                <h2 className="text-lg font-semibold text-slate-50">Medical Information</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Medical Conditions</label>
                  {editing ? (
                    <textarea
                      name="medicalConditions"
                      value={formData.medicalConditions}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="List any medical conditions..."
                    />
                  ) : (
                    <p className="text-slate-50 whitespace-pre-line">{formData.medicalConditions || 'None recorded'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Allergies</label>
                  {editing ? (
                    <textarea
                      name="allergies"
                      value={formData.allergies}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="List any allergies..."
                    />
                  ) : (
                    <p className="text-slate-50 whitespace-pre-line">{formData.allergies || 'None recorded'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Current Medications</label>
                  {editing ? (
                    <textarea
                      name="medications"
                      value={formData.medications}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="List current medications..."
                    />
                  ) : (
                    <p className="text-slate-50 whitespace-pre-line">{formData.medications || 'None recorded'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Clinical Documents & Instructions */}
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <FileText className="h-5 w-5 text-orange-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-50">Clinical Documents & Care Instructions</h2>
                </div>
                
                <label className="cursor-pointer px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors flex items-center gap-2 text-sm font-bold">
                   <Upload className="h-4 w-4" />
                   Upload Document
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={(e) => handleFileUpload(e, 'medical_record')}
                    disabled={uploading}
                  />
                </label>
              </div>

              <div className="space-y-3">
                {client?.metadata?.documents && client.metadata.documents.length > 0 ? (
                  client.metadata.documents.map((docu, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 group">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-slate-700/50">
                          <FileText className="h-5 w-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-200">{docu.originalName || docu.fileName || 'Document'}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-tight">
                            {new Date(docu.uploadedAt).toLocaleDateString()} • {docu.documentType?.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a 
                          href={docu.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye size={18} />
                        </a>
                        <button 
                          onClick={() => handleDeleteFile(docu.key)}
                          className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 border-2 border-dashed border-slate-800 rounded-2xl text-center">
                    <FileText className="h-12 w-12 text-slate-700 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">No clinical documents or instructions uploaded yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-6">
              <h3 className="text-lg font-semibold text-slate-50 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/medications')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 transition-colors text-left"
                >
                  <Pill className="h-5 w-5 text-slate-400" />
                  <span className="text-slate-50">View Prescriptions</span>
                </button>
                <button
                  onClick={() => navigate('/telemedicine')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 transition-colors text-left"
                >
                  <Stethoscope className="h-5 w-5 text-slate-400" />
                  <span className="text-slate-50">Consultations</span>
                </button>
                <button
                  onClick={() => navigate('/medical-documents')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 transition-colors text-left"
                >
                  <FileText className="h-5 w-5 text-slate-400" />
                  <span className="text-slate-50">Medical Records</span>
                </button>
              </div>
            </div>

            {/* Account Info */}
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-slate-800/80">
                  <Shield className="h-5 w-5 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-50">Account Information</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-400">Client ID:</span>
                  <p className="text-slate-50 font-medium">{client?.clientId || client?.id || 'N/A'}</p>
                </div>
                {client?.institutionId && (
                  <div>
                    <span className="text-slate-400">Institution:</span>
                    <p className="text-slate-50 font-medium">{client.institutionName || 'N/A'}</p>
                  </div>
                )}
                {client?.createdAt && (
                  <div>
                    <span className="text-slate-400">Member Since:</span>
                    <p className="text-slate-50 font-medium">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default PatientAccount;

