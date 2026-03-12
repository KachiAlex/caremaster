/**
 * Enhanced Patient Registration Modal Component
 * Features: QR code generation, duplicate detection, file uploads, form validation
 */

import React, { useState, useEffect } from 'react';
import {
  generatePatientQRCodeData,
  downloadQRCode
} from '../utils/patientQRCodeGenerator';
import {
  checkForDuplicates,
  calculateMatchScore
} from '../utils/patientDuplicateDetection';
import {
  uploadPatientDocument,
  validatePatientDocument,
  getUploadedDocuments
} from '../utils/patientDocumentUpload';
import {
  validateEmail,
  validatePhoneNumber,
  validateFullName,
  validateDate,
  validateFormData,
  createValidationResult
} from '../utils/inputValidation';
import { sanitizeObject, escapeHtml } from '../utils/xssProtection';
import logger from '../utils/logger';
import './EnhancedPatientRegistration.css';

const EnhancedPatientRegistration = ({ isOpen, onClose, onPatientRegistered }) => {
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: 'not-specified',
    bloodType: '',
    nationalId: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    emergencyContact: '',
    emergencyPhone: ''
  });

  // UI state
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [qrCode, setQrCode] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [documentUploading, setDocumentUploading] = useState(false);
  const [documentErrors, setDocumentErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  // Step 1: Basic Information Validation
  const validateStep1 = () => {
    const step1Schema = {
      firstName: { type: 'name', options: { minLength: 2, maxLength: 50 } },
      lastName: { type: 'name', options: { minLength: 2, maxLength: 50 } },
      email: { type: 'email' },
      phoneNumber: { type: 'phone', options: { format: 'international' } },
      dateOfBirth: { type: 'date', options: { maxDate: new Date() } }
    };

    const validation = validateFormData(
      {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        dateOfBirth: formData.dateOfBirth
      },
      step1Schema
    );

    if (!validation.isValid) {
      setErrors(validation.errors);
      return false;
    }

    setErrors({});
    return true;
  };

  // Step 2: Duplicate Detection
  const checkForDuplicatePatients = async () => {
    try {
      setLoading(true);

      const searchData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        dateOfBirth: formData.dateOfBirth,
        phoneNumber: formData.phoneNumber.trim()
      };

      const duplicateResults = await checkForDuplicates(searchData);

      if (duplicateResults.found && duplicateResults.matches.length > 0) {
        setDuplicates(duplicateResults.matches);
        return false;
      }

      setDuplicates([]);
      return true;
    } catch (error) {
      logger.error('Duplicate check failed', { error });
      setErrors({ duplicate: 'Failed to check for duplicates. Please try again.' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Generate QR Code
  const generateQRCode = async () => {
    try {
      setLoading(true);

      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      
      const qrData = {
        fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        bloodType: formData.bloodType,
        nationalId: formData.nationalId,
        timestamp: new Date().toISOString()
      };

      const qrCode = await generatePatientQRCodeData(qrData);
      setQrCode(qrCode);

      logger.info('QR code generated', { fullName: fullName.substring(0, 20) });

      return true;
    } catch (error) {
      logger.error('QR code generation failed', { error });
      setErrors({ qr: 'Failed to generate QR code. Please try again.' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Download QR Code
  const handleDownloadQR = async () => {
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      await downloadQRCode(fullName, formData.email);
      setSuccessMessage('QR code downloaded successfully');
    } catch (error) {
      logger.error('QR code download failed', { error });
      setErrors({ qr: 'Failed to download QR code' });
    }
  };

  // Handle file upload
  const handleDocumentUpload = async (e, documentType) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setDocumentUploading(true);

      // Validate document
      const validation = validatePatientDocument(file, {
        allowedTypes: ['id', 'referral', 'medicalRecord'],
        maxSizeMB: 10
      });

      if (!validation.valid) {
        setDocumentErrors(prev => ({
          ...prev,
          [documentType]: validation.error
        }));
        return;
      }

      // Upload document
      const result = await uploadPatientDocument(
        file,
        {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email
        },
        documentType
      );

      if (result.success) {
        setUploadedDocuments(prev => [...prev, result.document]);
        setSuccessMessage(`${documentType} document uploaded successfully`);
        setDocumentErrors(prev => ({
          ...prev,
          [documentType]: null
        }));

        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setDocumentErrors(prev => ({
          ...prev,
          [documentType]: result.error || 'Upload failed'
        }));
      }
    } catch (error) {
      logger.error('Document upload failed', { error });
      setDocumentErrors(prev => ({
        ...prev,
        [documentType]: 'Upload failed. Please try again.'
      }));
    } finally {
      setDocumentUploading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Handle step progression
  const handleNextStep = async () => {
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
    } else if (step === 2) {
      const isDuplicate = await checkForDuplicatePatients();
      if (!isDuplicate) {
        // Show duplicates for user review
        return;
      }
      setStep(3);
    } else if (step === 3) {
      const generated = await generateQRCode();
      if (generated) {
        setStep(4);
      }
    }
  };

  const handlePreviousStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Handle registration completion
  const handleCompleteRegistration = async () => {
    try {
      setLoading(true);

      // Sanitize form data
      const sanitizedData = sanitizeObject(formData);

      // Prepare registration payload
      const registrationPayload = {
        ...sanitizedData,
        fullName: `${sanitizedData.firstName} ${sanitizedData.lastName}`,
        documents: uploadedDocuments,
        qrCode: qrCode,
        registeredAt: new Date().toISOString(),
        status: 'active'
      };

      // Call parent callback
      if (onPatientRegistered) {
        await onPatientRegistered(registrationPayload);
      }

      setSuccessMessage('Patient registered successfully!');
      logger.info('Patient registration completed', {
        fullName: registrationPayload.fullName.substring(0, 20)
      });

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      logger.error('Registration completion failed', { error });
      setErrors({ registration: 'Failed to complete registration. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Dismiss duplicate and continue
  const handleDismissDuplicate = () => {
    setDuplicates([]);
    setStep(3);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content enhanced-registration">
        <div className="modal-header">
          <h2>Patient Registration</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="progress-bar">
          <div className="progress" style={{ width: `${(step / 4) * 100}%` }}></div>
        </div>

        <div className="modal-body">
          {/* Success Message */}
          {successMessage && (
            <div className="alert alert-success">
              <strong>Success!</strong> {successMessage}
            </div>
          )}

          {/* Error Messages */}
          {Object.keys(errors).length > 0 && (
            <div className="alert alert-error">
              <strong>Please fix the following errors:</strong>
              <ul>
                {Object.entries(errors).map(([field, fieldErrors]) => (
                  <li key={field}>
                    {typeof fieldErrors === 'string' ? fieldErrors : fieldErrors.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="step-content">
              <h3>Basic Information</h3>
              
              <div className="form-group">
                <label htmlFor="firstName">First Name *</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="Enter first name"
                  maxLength="50"
                />
                {errors.firstName && <span className="field-error">{errors.firstName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last Name *</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Enter last name"
                  maxLength="50"
                />
                {errors.lastName && <span className="field-error">{errors.lastName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="phoneNumber">Phone Number *</label>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                />
                {errors.phoneNumber && <span className="field-error">{errors.phoneNumber}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="dateOfBirth">Date of Birth *</label>
                <input
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                />
                {errors.dateOfBirth && <span className="field-error">{errors.dateOfBirth}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="gender">Gender</label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                  >
                    <option value="not-specified">Not Specified</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="bloodType">Blood Type</label>
                  <select
                    id="bloodType"
                    name="bloodType"
                    value={formData.bloodType}
                    onChange={handleInputChange}
                  >
                    <option value="">Select blood type</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Duplicate Detection */}
          {step === 2 && (
            <div className="step-content">
              <h3>Checking for Duplicate Records...</h3>
              
              {loading && (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <p>Searching database for existing records...</p>
                </div>
              )}

              {duplicates.length > 0 && !loading && (
                <div className="duplicates-found">
                  <div className="alert alert-warning">
                    <strong>Potential Duplicate Records Found!</strong>
                    <p>Please review the following records to ensure you're not creating a duplicate:</p>
                  </div>

                  <div className="duplicates-list">
                    {duplicates.map((duplicate, index) => (
                      <div key={index} className="duplicate-record">
                        <div className="match-score">
                          Match Score: {Math.round(duplicate.matchScore * 100)}%
                        </div>
                        <div className="record-details">
                          <p><strong>Name:</strong> {escapeHtml(duplicate.fullName)}</p>
                          <p><strong>DOB:</strong> {duplicate.dateOfBirth}</p>
                          <p><strong>Phone:</strong> {escapeHtml(duplicate.phoneNumber)}</p>
                          <p><strong>Registered:</strong> {new Date(duplicate.registeredAt).toLocaleDateString()}</p>
                        </div>
                        <div className="record-actions">
                          <button 
                            className="btn btn-secondary"
                            onClick={() => {
                              // Handle viewing existing record
                              logger.info('View duplicate record', { duplicateId: duplicate.id });
                            }}
                          >
                            View Record
                          </button>
                          <button 
                            className="btn btn-primary"
                            onClick={() => {
                              // Use existing record instead
                              logger.info('Using existing record', { duplicateId: duplicate.id });
                              onClose();
                            }}
                          >
                            Use Existing
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="duplicate-actions">
                    <button 
                      className="btn btn-primary"
                      onClick={handleDismissDuplicate}
                    >
                      Continue with New Record
                    </button>
                  </div>
                </div>
              )}

              {duplicates.length === 0 && !loading && (
                <div className="no-duplicates">
                  <div className="success-check">✓</div>
                  <p>No duplicate records found. You can proceed with registration.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: QR Code & Documents */}
          {step === 3 && (
            <div className="step-content">
              <h3>QR Code & Documentation</h3>

              <div className="qr-section">
                <p>Generating QR code for patient identification...</p>
                <button 
                  className="btn btn-primary"
                  onClick={generateQRCode}
                  disabled={loading}
                >
                  {loading ? 'Generating...' : 'Generate QR Code'}
                </button>
              </div>

              <div className="documents-section">
                <h4>Upload Documents</h4>
                
                {['id', 'referral', 'medicalRecord'].map(docType => (
                  <div key={docType} className="document-upload">
                    <label htmlFor={`${docType}-upload`}>
                      {docType === 'id' && 'ID/Identity Document'}
                      {docType === 'referral' && 'Referral Letter'}
                      {docType === 'medicalRecord' && 'Medical Record'}
                      <span className="optional">(Optional)</span>
                    </label>
                    
                    <input
                      type="file"
                      id={`${docType}-upload`}
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleDocumentUpload(e, docType)}
                      disabled={documentUploading}
                      style={{ display: 'none' }}
                    />
                    
                    <button
                      className="btn btn-secondary"
                      onClick={() => document.getElementById(`${docType}-upload`).click()}
                      disabled={documentUploading}
                    >
                      {documentUploading ? 'Uploading...' : 'Upload'}
                    </button>

                    {documentErrors[docType] && (
                      <span className="field-error">{documentErrors[docType]}</span>
                    )}

                    {uploadedDocuments.find(d => d.type === docType) && (
                      <span className="success-text">✓ Uploaded</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Review & Confirm */}
          {step === 4 && (
            <div className="step-content">
              <h3>Review & Confirm</h3>

              {qrCode && (
                <div className="qr-display">
                  <h4>Patient QR Code</h4>
                  <img src={qrCode} alt="Patient QR Code" />
                  <button 
                    className="btn btn-secondary"
                    onClick={handleDownloadQR}
                  >
                    Download QR Code
                  </button>
                </div>
              )}

              <div className="registration-summary">
                <h4>Registration Summary</h4>
                <div className="summary-item">
                  <span className="label">Full Name:</span>
                  <span className="value">{escapeHtml(`${formData.firstName} ${formData.lastName}`)}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Email:</span>
                  <span className="value">{escapeHtml(formData.email)}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Phone:</span>
                  <span className="value">{escapeHtml(formData.phoneNumber)}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Date of Birth:</span>
                  <span className="value">{formData.dateOfBirth}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Documents Uploaded:</span>
                  <span className="value">{uploadedDocuments.length}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          {step > 1 && (
            <button 
              className="btn btn-secondary"
              onClick={handlePreviousStep}
              disabled={loading}
            >
              Previous
            </button>
          )}
          
          {step < 4 && (
            <button 
              className="btn btn-primary"
              onClick={handleNextStep}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Next'}
            </button>
          )}

          {step === 4 && (
            <>
              <button 
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success btn-large"
                onClick={handleCompleteRegistration}
                disabled={loading}
              >
                {loading ? 'Completing...' : 'Complete Registration'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedPatientRegistration;
