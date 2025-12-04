/**
 * Client Registration Component
 * Hospital Operations - Client Registration with Simple ID Generation
 */

import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Heart,
  Pill,
  AlertTriangle,
  Save,
  X,
  UserPlus,
  CheckCircle,
  FileText
} from 'lucide-react';
import { createClient } from '../api/patientsAPI';
import { useUser } from '../contexts/UserContext';
import { toast } from 'react-toastify';

// Common country codes
const countryCodes = [
  { code: '+1', country: 'United States/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+254', country: 'Kenya', flag: '🇰🇪' },
  { code: '+233', country: 'Ghana', flag: '🇬🇭' },
  { code: '+256', country: 'Uganda', flag: '🇺🇬' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
];

const PatientRegistration = ({ onClose, onSuccess, institutionId: propInstitutionId }) => {
  const { userProfile } = useUser();
  const institutionId = propInstitutionId || userProfile?.institutionId;
  
  const [loading, setLoading] = useState(false);
  const [createdPatientId, setCreatedPatientId] = useState(null);
  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    fullName: '',
    dateOfBirth: '',
    gender: '',
    phoneCountryCode: '+234',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    
    // Emergency Contact
    emergencyContactName: '',
    emergencyContactPhoneCountryCode: '+234',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    
    // Medical Information
    bloodType: '',
    genotype: '',
    medicalConditions: '',
    medications: '',
    allergies: '',
    
    // Additional
    insuranceProvider: '',
    insurancePolicyNumber: '',
    careLevel: 'basic'
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Client name is required';
    }
    
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    }
    
    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    
    if (!formData.emergencyContactName.trim()) {
      newErrors.emergencyContactName = 'Emergency contact name is required';
    }
    
    if (!formData.emergencyContactPhone.trim()) {
      newErrors.emergencyContactPhone = 'Emergency contact phone is required';
    }
    
    if (!formData.careLevel) {
      newErrors.careLevel = 'Care level is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!institutionId) {
      toast.error('Institution ID is required for Client registration');
      return;
    }

    setLoading(true);

    try {
      // Prepare Client data
      const clientData = {
        name: formData.name.trim(),
        fullName: formData.fullName.trim() || formData.name.trim(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        phone: `${formData.phoneCountryCode}${formData.phone.trim()}`,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        zipCode: formData.zipCode.trim() || null,
        emergencyContactName: formData.emergencyContactName.trim(),
        emergencyContactPhone: `${formData.emergencyContactPhoneCountryCode}${formData.emergencyContactPhone.trim()}`,
        emergencyContactRelationship: formData.emergencyContactRelationship.trim() || null,
        bloodType: formData.bloodType || null,
        genotype: formData.genotype || null,
        medicalConditions: formData.medicalConditions.trim() 
          ? formData.medicalConditions.split(',').map(c => c.trim()).filter(Boolean)
          : [],
        medications: formData.medications.trim()
          ? formData.medications.split(',').map(m => m.trim()).filter(Boolean)
          : [],
        allergies: formData.allergies.trim()
          ? formData.allergies.split(',').map(a => a.trim()).filter(Boolean)
          : [],
        insuranceProvider: formData.insuranceProvider.trim() || null,
        insurancePolicyNumber: formData.insurancePolicyNumber.trim() || null,
        careLevel: formData.careLevel,
        institutionId: institutionId,
        userType: 'Client',
        type: 'Client'
      };

      // Register Client
      const result = await createClient(clientData, userProfile);
      setCreatedPatientId(result.clientId);
      
      toast.success(
        <div>
          <div className="font-semibold">Client registered successfully!</div>
          <div className="text-sm mt-1">Client ID: <span className="font-mono font-bold text-blue-600">{result.clientId}</span></div>
        </div>,
        { autoClose: 6000 }
      );

      if (onSuccess) {
        onSuccess({ id: result.id, clientId: result.clientId, ...clientData });
      }
      
      // Reset form after a delay to show success
      setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error registering Client:', error);
      
      // Provide more detailed error messages
      let errorMessage = 'Failed to register Client. Please try again.';
      if (error.message) {
        errorMessage = `Failed to register Client: ${error.message}`;
      } else if (error.code) {
        errorMessage = `Registration error (${error.code}). Please check your input and try again.`;
      }
      
      toast.error(errorMessage, { 
        autoClose: 8000,
        style: { fontSize: '14px', minWidth: '350px' }
      });
      
      // Don't close the form on error - let user fix and retry
      // Only reset loading state
    } finally {
      setLoading(false);
    }
  };

  if (createdPatientId) {
    return (
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/95 backdrop-blur-xl shadow-xl shadow-black/50 p-8 max-w-2xl mx-auto">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold text-slate-50 mb-2">Client Registered Successfully!</h3>
          <div className="mt-6 p-6 bg-slate-900/60 rounded-2xl border border-slate-800/60">
            <div className="text-sm text-slate-400 mb-2">Client ID</div>
            <div className="text-3xl font-mono font-bold text-blue-400 mb-4">{createdPatientId}</div>
            <div className="text-sm text-slate-300">
              <div className="mb-1"><span className="text-slate-400">Name:</span> {formData.name}</div>
              <div className="mb-1"><span className="text-slate-400">Date of Birth:</span> {new Date(formData.dateOfBirth).toLocaleDateString()}</div>
              <div><span className="text-slate-400">Gender:</span> {formData.gender}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="mt-6 px-6 py-2 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-950/95 backdrop-blur-xl shadow-xl shadow-black/50 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
            <UserPlus className="h-5 w-5 text-blue-300" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-50">Register New Client</h2>
            <p className="text-xs text-slate-400 mt-1">Hospital Operations - Client Registration</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <User className="h-4 w-4" />
            Basic Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-slate-400 mb-2">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg bg-slate-900/60 text-slate-50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm ${
                  errors.name ? 'border-red-500/50' : 'border-slate-700'
                }`}
                placeholder="Enter Client's full name"
              />
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="dateOfBirth" className="block text-xs font-medium text-slate-400 mb-2">
                Date of Birth <span className="text-red-400">*</span>
              </label>
              <input
                id="dateOfBirth"
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg bg-slate-900/60 text-slate-50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm ${
                  errors.dateOfBirth ? 'border-red-500/50' : 'border-slate-700'
                }`}
              />
              {errors.dateOfBirth && <p className="text-xs text-red-400 mt-1">{errors.dateOfBirth}</p>}
            </div>

            <div>
              <label htmlFor="gender" className="block text-xs font-medium text-slate-400 mb-2">
                Gender <span className="text-red-400">*</span>
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg bg-slate-900/60 text-slate-50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm ${
                  errors.gender ? 'border-red-500/50' : 'border-slate-700'
                }`}
              >
                <option value="" className="bg-slate-900">Select gender</option>
                <option value="male" className="bg-slate-900">Male</option>
                <option value="female" className="bg-slate-900">Female</option>
                <option value="other" className="bg-slate-900">Other</option>
              </select>
              {errors.gender && <p className="text-xs text-red-400 mt-1">{errors.gender}</p>}
            </div>

            <div>
              <label htmlFor="phone" className="block text-xs font-medium text-slate-400 mb-2">
                Phone <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  name="phoneCountryCode"
                  value={formData.phoneCountryCode}
                  onChange={handleChange}
                  className="w-32 px-2 py-2 border border-slate-700 rounded-lg bg-slate-900/60 text-slate-50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
                >
                  {countryCodes.map((country) => (
                    <option key={country.code} value={country.code} className="bg-slate-900">
                      {country.flag} {country.code}
                    </option>
                  ))}
                </select>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`flex-1 px-3 py-2 border rounded-lg bg-slate-900/60 text-slate-50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm ${
                    errors.phone ? 'border-red-500/50' : 'border-slate-700'
                  }`}
                  placeholder="1234567890"
                />
              </div>
              {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate-400 mb-2">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg bg-slate-900/60 text-slate-50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm ${
                  errors.email ? 'border-red-500/50' : 'border-slate-700'
                }`}
                placeholder="Client@example.com"
              />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Blood Type</label>
              <select
                name="bloodType"
                value={formData.bloodType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-900/60 text-slate-50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
              >
                <option value="" className="bg-slate-900">Select blood type</option>
                <option value="A+" className="bg-slate-900">A+</option>
                <option value="A-" className="bg-slate-900">A-</option>
                <option value="B+" className="bg-slate-900">B+</option>
                <option value="B-" className="bg-slate-900">B-</option>
                <option value="AB+" className="bg-slate-900">AB+</option>
                <option value="AB-" className="bg-slate-900">AB-</option>
                <option value="O+" className="bg-slate-900">O+</option>
                <option value="O-" className="bg-slate-900">O-</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Genotype</label>
              <select
                name="genotype"
                value={formData.genotype}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-900/60 text-slate-50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
              >
                <option value="" className="bg-slate-900">Select genotype</option>
                <option value="AA" className="bg-slate-900">AA</option>
                <option value="AS" className="bg-slate-900">AS</option>
                <option value="SS" className="bg-slate-900">SS</option>
                <option value="AC" className="bg-slate-900">AC</option>
                <option value="SC" className="bg-slate-900">SC</option>
                <option value="CC" className="bg-slate-900">CC</option>
                <option value="Unknown" className="bg-slate-900">Unknown</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="address" className="block text-xs font-medium text-slate-400 mb-2">Address</label>
            <input
              id="address"
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-900/60 text-slate-50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
              placeholder="Street address"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-900/60 text-slate-50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
                placeholder="City"
              />
            </div>
            <div>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-900/60 text-slate-50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
                placeholder="State"
              />
            </div>
            <div>
              <input
                type="text"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-900/60 text-slate-50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
                placeholder="ZIP Code"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Emergency Contact
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="emergencyContactName" className="block text-xs font-medium text-slate-400 mb-2">
                Contact Name <span className="text-red-400">*</span>
              </label>
              <input
                id="emergencyContactName"
                type="text"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg bg-slate-900/60 text-slate-50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm ${
                  errors.emergencyContactName ? 'border-red-500/50' : 'border-slate-700'
                }`}
                placeholder="Emergency contact name"
              />
              {errors.emergencyContactName && <p className="text-xs text-red-400 mt-1">{errors.emergencyContactName}</p>}
            </div>

            <div>
              <label htmlFor="emergencyContactPhone" className="block text-xs font-medium text-slate-400 mb-2">
                Contact Phone <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  name="emergencyContactPhoneCountryCode"
                  value={formData.emergencyContactPhoneCountryCode}
                  onChange={handleChange}
                  className="w-32 px-2 py-2 border border-slate-700 rounded-lg bg-slate-900/60 text-slate-50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
                >
                  {countryCodes.map((country) => (
                    <option key={country.code} value={country.code} className="bg-slate-900">
                      {country.flag} {country.code}
                    </option>
                  ))}
                </select>
                <input
                  id="emergencyContactPhone"
                  type="tel"
                  name="emergencyContactPhone"
                  value={formData.emergencyContactPhone}
                  onChange={handleChange}
                  className={`flex-1 px-3 py-2 border rounded-lg bg-slate-900/60 text-slate-50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm ${
                    errors.emergencyContactPhone ? 'border-red-500/50' : 'border-slate-700'
                  }`}
                  placeholder="1234567890"
                />
              </div>
              {errors.emergencyContactPhone && <p className="text-xs text-red-400 mt-1">{errors.emergencyContactPhone}</p>}
            </div>

            <div>
              <label htmlFor="emergencyContactRelationship" className="block text-xs font-medium text-slate-400 mb-2">Relationship</label>
              <input
                id="emergencyContactRelationship"
                type="text"
                name="emergencyContactRelationship"
                value={formData.emergencyContactRelationship}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-900/60 text-slate-50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
                placeholder="e.g., Spouse, Parent, Child"
              />
            </div>
          </div>
        </div>

        {/* Medical Information */}
        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Medical Information
          </h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="medicalConditions" className="block text-xs font-medium text-slate-400 mb-2">Medical Conditions</label>
              <textarea
                id="medicalConditions"
                name="medicalConditions"
                value={formData.medicalConditions}
                onChange={handleChange}
                rows="2"
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-900/60 text-slate-50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
                placeholder="Comma-separated list (e.g., Hypertension, Diabetes)"
              />
            </div>

            <div>
              <label htmlFor="medications" className="block text-xs font-medium text-slate-400 mb-2">Current Medications</label>
              <textarea
                id="medications"
                name="medications"
                value={formData.medications}
                onChange={handleChange}
                rows="2"
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-900/60 text-slate-50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
                placeholder="Comma-separated list (e.g., Aspirin 100mg, Metformin 500mg)"
              />
            </div>

            <div>
              <label htmlFor="allergies" className="block text-xs font-medium text-slate-400 mb-2">Allergies</label>
              <textarea
                id="allergies"
                name="allergies"
                value={formData.allergies}
                onChange={handleChange}
                rows="2"
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-900/60 text-slate-50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
                placeholder="Comma-separated list (e.g., Penicillin, Latex)"
              />
            </div>
          </div>
        </div>

        {/* Care Level */}
        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Care Level
          </h3>
          
          <div>
            <label htmlFor="careLevel" className="block text-xs font-medium text-slate-400 mb-2">
              Care Level Category <span className="text-red-400">*</span>
            </label>
            <select
              id="careLevel"
              name="careLevel"
              value={formData.careLevel}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg bg-slate-900/60 text-slate-50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm ${
                errors.careLevel ? 'border-red-500/50' : 'border-slate-700'
              }`}
            >
              <option value="" className="bg-slate-900">Select care level</option>
              <option value="basic" className="bg-slate-900">Basic Care - Minimal assistance needed</option>
              <option value="intermediate" className="bg-slate-900">Intermediate Care - Moderate assistance required</option>
              <option value="advanced" className="bg-slate-900">Advanced Care - Extensive assistance needed</option>
              <option value="specialized" className="bg-slate-900">Specialized Care - Medical/specialized support required</option>
              <option value="critical" className="bg-slate-900">Critical Care - Intensive medical monitoring</option>
            </select>
            {errors.careLevel && <p className="text-xs text-red-400 mt-1">{errors.careLevel}</p>}
            <p className="text-xs text-slate-500 mt-2">
              <strong>Basic:</strong> Assistance with daily activities, medication reminders<br/>
              <strong>Intermediate:</strong> Help with mobility, personal care, meal preparation<br/>
              <strong>Advanced:</strong> Extensive personal care, medical monitoring, complex medication management<br/>
              <strong>Specialized:</strong> Disease-specific care, therapy, specialized equipment<br/>
              <strong>Critical:</strong> 24/7 monitoring, life support, intensive medical intervention
            </p>
          </div>
        </div>

        {/* Insurance Information */}
        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Insurance Information (Optional)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="insuranceProvider" className="block text-xs font-medium text-slate-400 mb-2">Insurance Provider</label>
              <input
                id="insuranceProvider"
                type="text"
                name="insuranceProvider"
                value={formData.insuranceProvider}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-900/60 text-slate-50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
                placeholder="Insurance company name"
              />
            </div>

            <div>
              <label htmlFor="insurancePolicyNumber" className="block text-xs font-medium text-slate-400 mb-2">Policy Number</label>
              <input
                id="insurancePolicyNumber"
                type="text"
                name="insurancePolicyNumber"
                value={formData.insurancePolicyNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-900/60 text-slate-50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
                placeholder="Policy number"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/60">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-800/60 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-300"></div>
                Registering...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Register Client
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientRegistration;

