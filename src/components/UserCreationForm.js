import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  Stethoscope, 
  Heart, 
  UserCheck,
  Eye,
  EyeOff,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const UserCreationForm = ({ onClose, userRole = 'elderly' }) => {
  const [formData, setFormData] = useState({
    // Basic Information
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    
    // Role-specific fields
    role: userRole,
    
    // Elderly/Patient specific
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    },
    medicalConditions: [],
    medications: [],
    allergies: [],
    insuranceInfo: {
      provider: '',
      policyNumber: '',
      groupNumber: ''
    },
    
    // Caregiver specific
    qualifications: [],
    certifications: [],
    experience: '',
    hourlyRate: '',
    availability: {
      monday: { available: false, startTime: '', endTime: '' },
      tuesday: { available: false, startTime: '', endTime: '' },
      wednesday: { available: false, startTime: '', endTime: '' },
      thursday: { available: false, startTime: '', endTime: '' },
      friday: { available: false, startTime: '', endTime: '' },
      saturday: { available: false, startTime: '', endTime: '' },
      sunday: { available: false, startTime: '', endTime: '' }
    },
    services: [],
    languages: [],
    
    // Doctor specific
    medicalLicense: '',
    specialty: '',
    hospitalAffiliation: '',
    education: [],
    yearsOfExperience: '',
    
    // Admin specific
    permissions: [],
    department: '',
    accessLevel: 'standard'
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});

  const totalSteps = userRole === 'elderly' ? 4 : userRole === 'caregiver' ? 5 : userRole === 'doctor' ? 4 : 3;

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else if (field.includes('availability.')) {
      const [, day, timeField] = field.split('.');
      setFormData(prev => ({
        ...prev,
        availability: {
          ...prev.availability,
          [day]: {
            ...prev.availability[day],
            [timeField]: value
          }
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleArrayFieldChange = (field, value, action = 'add') => {
    if (action === 'add') {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value]
      }));
    } else if (action === 'remove') {
      setFormData(prev => ({
        ...prev,
        [field]: prev[field].filter((_, index) => index !== value)
      }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
      if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }

    if (step === 2) {
      if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
      if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
      if (!formData.gender) newErrors.gender = 'Gender is required';
    }

    if (userRole === 'elderly' && step === 3) {
      if (!formData.emergencyContact.name.trim()) newErrors['emergencyContact.name'] = 'Emergency contact name is required';
      if (!formData.emergencyContact.phone.trim()) newErrors['emergencyContact.phone'] = 'Emergency contact phone is required';
    }

    if (userRole === 'caregiver' && step === 3) {
      if (!formData.experience) newErrors.experience = 'Experience is required';
      if (!formData.hourlyRate) newErrors.hourlyRate = 'Hourly rate is required';
    }

    if (userRole === 'doctor' && step === 3) {
      if (!formData.medicalLicense.trim()) newErrors.medicalLicense = 'Medical license is required';
      if (!formData.specialty) newErrors.specialty = 'Specialty is required';
      if (!formData.yearsOfExperience) newErrors.yearsOfExperience = 'Years of experience is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      const user = userCredential.user;

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: `${formData.firstName} ${formData.lastName}`
      });

      // Create user document in Firestore
      const userData = {
        id: user.uid,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: new Date(formData.dateOfBirth),
        gender: formData.gender,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        role: formData.role,
        status: 'active',
        profilePicture: null,
        joinDate: new Date(),
        lastActive: new Date(),
        
        // Role-specific data
        ...(userRole === 'elderly' && {
          emergencyContact: formData.emergencyContact,
          medicalConditions: formData.medicalConditions,
          medications: formData.medications,
          allergies: formData.allergies,
          insuranceInfo: formData.insuranceInfo
        }),
        
        ...(userRole === 'caregiver' && {
          qualifications: formData.qualifications,
          certifications: formData.certifications,
          experience: formData.experience,
          hourlyRate: parseFloat(formData.hourlyRate),
          availability: formData.availability,
          services: formData.services,
          languages: formData.languages
        }),
        
        ...(userRole === 'doctor' && {
          medicalLicense: formData.medicalLicense,
          specialty: formData.specialty,
          hospitalAffiliation: formData.hospitalAffiliation,
          education: formData.education,
          yearsOfExperience: parseInt(formData.yearsOfExperience)
        }),
        
        ...(userRole === 'admin' && {
          permissions: formData.permissions,
          department: formData.department,
          accessLevel: formData.accessLevel
        })
      };

      await setDoc(doc(db, 'users', user.uid), userData);

      toast.success(`${userRole.charAt(0).toUpperCase() + userRole.slice(1)} user created successfully!`);
      onClose();
      
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(`Failed to create user: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            First Name *
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.firstName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter first name"
          />
          {errors.firstName && (
            <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Last Name *
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.lastName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter last name"
          />
          {errors.lastName && (
            <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Address *
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter email address"
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-1">{errors.email}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password *
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password *
          </label>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Confirm password"
          />
          {errors.confirmPassword && (
            <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderPersonalInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number *
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter phone number"
          />
          {errors.phone && (
            <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date of Birth *
          </label>
          <input
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.dateOfBirth && (
            <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Gender *
        </label>
        <select
          value={formData.gender}
          onChange={(e) => handleInputChange('gender', e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.gender ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
          <option value="prefer-not-to-say">Prefer not to say</option>
        </select>
        {errors.gender && (
          <p className="text-red-500 text-sm mt-1">{errors.gender}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Address
        </label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter address"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            City
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter city"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            State
          </label>
          <input
            type="text"
            value={formData.state}
            onChange={(e) => handleInputChange('state', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter state"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ZIP Code
          </label>
          <input
            type="text"
            value={formData.zipCode}
            onChange={(e) => handleInputChange('zipCode', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter ZIP code"
          />
        </div>
      </div>
    </div>
  );

  const renderRoleSpecificInfo = () => {
    if (userRole === 'elderly') {
      return (
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Name *
                </label>
                <input
                  type="text"
                  value={formData.emergencyContact.name}
                  onChange={(e) => handleInputChange('emergencyContact.name', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors['emergencyContact.name'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter emergency contact name"
                />
                {errors['emergencyContact.name'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['emergencyContact.name']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Phone *
                </label>
                <input
                  type="tel"
                  value={formData.emergencyContact.phone}
                  onChange={(e) => handleInputChange('emergencyContact.phone', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors['emergencyContact.phone'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter emergency contact phone"
                />
                {errors['emergencyContact.phone'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['emergencyContact.phone']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Relationship
                </label>
                <select
                  value={formData.emergencyContact.relationship}
                  onChange={(e) => handleInputChange('emergencyContact.relationship', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select relationship</option>
                  <option value="spouse">Spouse</option>
                  <option value="child">Child</option>
                  <option value="sibling">Sibling</option>
                  <option value="parent">Parent</option>
                  <option value="friend">Friend</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Medical Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medical Conditions
                </label>
                <input
                  type="text"
                  placeholder="Add medical condition (press Enter to add)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const value = e.target.value.trim();
                      if (value) {
                        handleArrayFieldChange('medicalConditions', value);
                        e.target.value = '';
                      }
                    }
                  }}
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.medicalConditions.map((condition, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {condition}
                      <button
                        type="button"
                        onClick={() => handleArrayFieldChange('medicalConditions', index, 'remove')}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Medications
                </label>
                <input
                  type="text"
                  placeholder="Add medication (press Enter to add)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const value = e.target.value.trim();
                      if (value) {
                        handleArrayFieldChange('medications', value);
                        e.target.value = '';
                      }
                    }
                  }}
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.medications.map((medication, index) => (
                    <span
                      key={index}
                      className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {medication}
                      <button
                        type="button"
                        onClick={() => handleArrayFieldChange('medications', index, 'remove')}
                        className="text-green-600 hover:text-green-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allergies
                </label>
                <input
                  type="text"
                  placeholder="Add allergy (press Enter to add)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const value = e.target.value.trim();
                      if (value) {
                        handleArrayFieldChange('allergies', value);
                        e.target.value = '';
                      }
                    }
                  }}
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.allergies.map((allergy, index) => (
                    <span
                      key={index}
                      className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {allergy}
                      <button
                        type="button"
                        onClick={() => handleArrayFieldChange('allergies', index, 'remove')}
                        className="text-red-600 hover:text-red-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (userRole === 'caregiver') {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Years of Experience *
              </label>
              <input
                type="number"
                value={formData.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.experience ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter years of experience"
                min="0"
              />
              {errors.experience && (
                <p className="text-red-500 text-sm mt-1">{errors.experience}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hourly Rate ($) *
              </label>
              <input
                type="number"
                value={formData.hourlyRate}
                onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.hourlyRate ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter hourly rate"
                min="0"
                step="0.01"
              />
              {errors.hourlyRate && (
                <p className="text-red-500 text-sm mt-1">{errors.hourlyRate}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Qualifications
            </label>
            <input
              type="text"
              placeholder="Add qualification (press Enter to add)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const value = e.target.value.trim();
                  if (value) {
                    handleArrayFieldChange('qualifications', value);
                    e.target.value = '';
                  }
                }
              }}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.qualifications.map((qualification, index) => (
                <span
                  key={index}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                >
                  {qualification}
                  <button
                    type="button"
                    onClick={() => handleArrayFieldChange('qualifications', index, 'remove')}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Services Offered
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {['Personal Care', 'Medication Management', 'Meal Preparation', 'Transportation', 'Housekeeping', 'Companionship', 'Physical Therapy', 'Medical Monitoring'].map(service => (
                <label key={service} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.services.includes(service)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleArrayFieldChange('services', service);
                      } else {
                        handleArrayFieldChange('services', formData.services.indexOf(service), 'remove');
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">{service}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (userRole === 'doctor') {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medical License Number *
              </label>
              <input
                type="text"
                value={formData.medicalLicense}
                onChange={(e) => handleInputChange('medicalLicense', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.medicalLicense ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter medical license number"
              />
              {errors.medicalLicense && (
                <p className="text-red-500 text-sm mt-1">{errors.medicalLicense}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specialty *
              </label>
              <select
                value={formData.specialty}
                onChange={(e) => handleInputChange('specialty', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.specialty ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select specialty</option>
                <option value="geriatrics">Geriatrics</option>
                <option value="internal-medicine">Internal Medicine</option>
                <option value="family-medicine">Family Medicine</option>
                <option value="cardiology">Cardiology</option>
                <option value="neurology">Neurology</option>
                <option value="psychiatry">Psychiatry</option>
                <option value="physical-therapy">Physical Therapy</option>
                <option value="occupational-therapy">Occupational Therapy</option>
                <option value="other">Other</option>
              </select>
              {errors.specialty && (
                <p className="text-red-500 text-sm mt-1">{errors.specialty}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hospital Affiliation
            </label>
            <input
              type="text"
              value={formData.hospitalAffiliation}
              onChange={(e) => handleInputChange('hospitalAffiliation', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter hospital or clinic name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Years of Experience *
            </label>
            <input
              type="number"
              value={formData.yearsOfExperience}
              onChange={(e) => handleInputChange('yearsOfExperience', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.yearsOfExperience ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter years of experience"
              min="0"
            />
            {errors.yearsOfExperience && (
              <p className="text-red-500 text-sm mt-1">{errors.yearsOfExperience}</p>
            )}
          </div>
        </div>
      );
    }

    if (userRole === 'admin') {
      return (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <select
              value={formData.department}
              onChange={(e) => handleInputChange('department', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select department</option>
              <option value="operations">Operations</option>
              <option value="human-resources">Human Resources</option>
              <option value="finance">Finance</option>
              <option value="it">Information Technology</option>
              <option value="customer-service">Customer Service</option>
              <option value="quality-assurance">Quality Assurance</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Access Level
            </label>
            <select
              value={formData.accessLevel}
              onChange={(e) => handleInputChange('accessLevel', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="standard">Standard</option>
              <option value="supervisor">Supervisor</option>
              <option value="manager">Manager</option>
              <option value="director">Director</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permissions
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {['user-management', 'system-config', 'reports', 'analytics', 'emergency-access', 'billing'].map(permission => (
                <label key={permission} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(permission)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleArrayFieldChange('permissions', permission);
                      } else {
                        handleArrayFieldChange('permissions', formData.permissions.indexOf(permission), 'remove');
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">{permission.replace('-', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderBasicInfo();
      case 2:
        return renderPersonalInfo();
      case 3:
        return renderRoleSpecificInfo();
      case 4:
        if (userRole === 'elderly') {
          return (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Insurance Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Insurance Provider
                  </label>
                  <input
                    type="text"
                    value={formData.insuranceInfo.provider}
                    onChange={(e) => handleInputChange('insuranceInfo.provider', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter insurance provider"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Policy Number
                  </label>
                  <input
                    type="text"
                    value={formData.insuranceInfo.policyNumber}
                    onChange={(e) => handleInputChange('insuranceInfo.policyNumber', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter policy number"
                  />
                </div>
              </div>
            </div>
          );
        }
        if (userRole === 'caregiver') {
          return (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Availability Schedule</h3>
              <div className="space-y-4">
                {Object.entries(formData.availability).map(([day, schedule]) => (
                  <div key={day} className="flex items-center space-x-4">
                    <div className="w-24">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={schedule.available}
                          onChange={(e) => handleInputChange(`availability.${day}.available`, e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium capitalize">{day}</span>
                      </label>
                    </div>
                    {schedule.available && (
                      <div className="flex space-x-2">
                        <input
                          type="time"
                          value={schedule.startTime}
                          onChange={(e) => handleInputChange(`availability.${day}.startTime`, e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded text-sm"
                        />
                        <span className="text-sm">to</span>
                        <input
                          type="time"
                          value={schedule.endTime}
                          onChange={(e) => handleInputChange(`availability.${day}.endTime`, e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        }
        return null;
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Basic Information';
      case 2:
        return 'Personal Details';
      case 3:
        return userRole === 'elderly' ? 'Emergency Contact & Medical Info' :
               userRole === 'caregiver' ? 'Professional Information' :
               userRole === 'doctor' ? 'Medical Credentials' :
               'Admin Configuration';
      case 4:
        return userRole === 'elderly' ? 'Insurance Information' :
               'Availability Schedule';
      default:
        return 'Additional Information';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Create {userRole.charAt(0).toUpperCase() + userRole.slice(1)} User
            </h2>
            <p className="text-gray-600 mt-1">{getStepTitle()}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    i + 1 <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Form Content */}
          <div className="min-h-[400px]">
            {renderCurrentStep()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className={`px-6 py-2 rounded-lg font-medium ${
                currentStep === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Previous
            </button>

            <div className="flex space-x-4">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>

              {currentStep === totalSteps ? (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Create User</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserCreationForm;
