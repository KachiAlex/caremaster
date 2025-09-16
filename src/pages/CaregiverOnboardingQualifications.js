import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { updateUser } from '../api/usersAPI';

const CaregiverOnboardingQualifications = () => {
  const navigate = useNavigate();
  const { user, userProfile, updateUserProfile } = useUser();
  const [form, setForm] = useState({
    certifications: userProfile?.certifications || [],
    education: userProfile?.education || [],
    skills: userProfile?.skills || [],
    training: userProfile?.training || [],
    licenses: userProfile?.licenses || []
  });
  const [saving, setSaving] = useState(false);
  const [newCertification, setNewCertification] = useState({
    name: '',
    issuingOrganization: '',
    issueDate: '',
    expiryDate: '',
    credentialId: '',
    current: true
  });
  const [newEducation, setNewEducation] = useState({
    institution: '',
    degree: '',
    field: '',
    graduationDate: '',
    gpa: '',
    honors: ''
  });
  const [newSkill, setNewSkill] = useState('');
  const [newTraining, setNewTraining] = useState({
    name: '',
    provider: '',
    completionDate: '',
    hours: '',
    certificate: ''
  });
  const [newLicense, setNewLicense] = useState({
    type: '',
    number: '',
    issuingState: '',
    issueDate: '',
    expiryDate: '',
    current: true
  });

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const addCertification = () => {
    if (newCertification.name && newCertification.issuingOrganization && newCertification.issueDate) {
      setForm(prev => ({
        ...prev,
        certifications: [...prev.certifications, { ...newCertification }]
      }));
      setNewCertification({
        name: '',
        issuingOrganization: '',
        issueDate: '',
        expiryDate: '',
        credentialId: '',
        current: true
      });
    }
  };

  const removeCertification = (index) => {
    setForm(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };

  const addEducation = () => {
    if (newEducation.institution && newEducation.degree && newEducation.field) {
      setForm(prev => ({
        ...prev,
        education: [...prev.education, { ...newEducation }]
      }));
      setNewEducation({
        institution: '',
        degree: '',
        field: '',
        graduationDate: '',
        gpa: '',
        honors: ''
      });
    }
  };

  const removeEducation = (index) => {
    setForm(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const addSkill = () => {
    if (newSkill.trim() && !form.skills.includes(newSkill.trim())) {
      setForm(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const addTraining = () => {
    if (newTraining.name && newTraining.provider && newTraining.completionDate) {
      setForm(prev => ({
        ...prev,
        training: [...prev.training, { ...newTraining }]
      }));
      setNewTraining({
        name: '',
        provider: '',
        completionDate: '',
        hours: '',
        certificate: ''
      });
    }
  };

  const removeTraining = (index) => {
    setForm(prev => ({
      ...prev,
      training: prev.training.filter((_, i) => i !== index)
    }));
  };

  const addLicense = () => {
    if (newLicense.type && newLicense.number && newLicense.issuingState && newLicense.issueDate) {
      setForm(prev => ({
        ...prev,
        licenses: [...prev.licenses, { ...newLicense }]
      }));
      setNewLicense({
        type: '',
        number: '',
        issuingState: '',
        issueDate: '',
        expiryDate: '',
        current: true
      });
    }
  };

  const removeLicense = (index) => {
    setForm(prev => ({
      ...prev,
      licenses: prev.licenses.filter((_, i) => i !== index)
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;
    setSaving(true);
    try {
      await updateUser(user.uid, { 
        ...form, 
        onboardingQualificationsComplete: true
      });
      updateUserProfile({ ...(userProfile || {}), ...form, onboardingQualificationsComplete: true });
      navigate('/caregiver/onboarding/references');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Your Qualifications</h2>
          <p className="text-gray-600 mt-2">Share your certifications, education, and professional credentials</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-8">
          {/* Certifications */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Certifications</h3>
            
            <div className="space-y-4 mb-6">
              {form.certifications.map((cert, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{cert.name}</h4>
                      <p className="text-sm text-gray-600">{cert.issuingOrganization}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCertification(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Issued: {cert.issueDate}</p>
                    {!cert.current && cert.expiryDate && <p>Expires: {cert.expiryDate}</p>}
                    {cert.credentialId && <p>ID: {cert.credentialId}</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-4">Add Certification</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Certification Name</label>
                  <input
                    type="text"
                    value={newCertification.name}
                    onChange={(e) => setNewCertification(prev => ({ ...prev, name: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., Certified Nursing Assistant"
                  />
                </div>
                <div>
                  <label className="form-label">Issuing Organization</label>
                  <input
                    type="text"
                    value={newCertification.issuingOrganization}
                    onChange={(e) => setNewCertification(prev => ({ ...prev, issuingOrganization: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., American Red Cross"
                  />
                </div>
                <div>
                  <label className="form-label">Issue Date</label>
                  <input
                    type="date"
                    value={newCertification.issueDate}
                    onChange={(e) => setNewCertification(prev => ({ ...prev, issueDate: e.target.value }))}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Expiry Date</label>
                  <input
                    type="date"
                    value={newCertification.expiryDate}
                    onChange={(e) => setNewCertification(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="form-input"
                    disabled={newCertification.current}
                  />
                </div>
                <div>
                  <label className="form-label">Credential ID (optional)</label>
                  <input
                    type="text"
                    value={newCertification.credentialId}
                    onChange={(e) => setNewCertification(prev => ({ ...prev, credentialId: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., CNA-12345"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newCertification.current}
                      onChange={(e) => setNewCertification(prev => ({ 
                        ...prev, 
                        current: e.target.checked,
                        expiryDate: e.target.checked ? '' : prev.expiryDate
                      }))}
                      className="form-checkbox"
                    />
                    <span className="ml-2 text-sm text-gray-700">Currently valid</span>
                  </label>
                </div>
              </div>
              <button
                type="button"
                onClick={addCertification}
                className="btn btn-secondary mt-4"
              >
                Add Certification
              </button>
            </div>
          </div>

          {/* Education */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Education</h3>
            
            <div className="space-y-4 mb-6">
              {form.education.map((edu, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{edu.degree} in {edu.field}</h4>
                      <p className="text-sm text-gray-600">{edu.institution}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEducation(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Graduated: {edu.graduationDate}</p>
                    {edu.gpa && <p>GPA: {edu.gpa}</p>}
                    {edu.honors && <p>Honors: {edu.honors}</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-4">Add Education</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Institution</label>
                  <input
                    type="text"
                    value={newEducation.institution}
                    onChange={(e) => setNewEducation(prev => ({ ...prev, institution: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., University of California"
                  />
                </div>
                <div>
                  <label className="form-label">Degree</label>
                  <select
                    value={newEducation.degree}
                    onChange={(e) => setNewEducation(prev => ({ ...prev, degree: e.target.value }))}
                    className="form-input"
                  >
                    <option value="">Select degree</option>
                    <option value="High School Diploma">High School Diploma</option>
                    <option value="Associate Degree">Associate Degree</option>
                    <option value="Bachelor's Degree">Bachelor's Degree</option>
                    <option value="Master's Degree">Master's Degree</option>
                    <option value="Doctorate">Doctorate</option>
                    <option value="Certificate">Certificate</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Field of Study</label>
                  <input
                    type="text"
                    value={newEducation.field}
                    onChange={(e) => setNewEducation(prev => ({ ...prev, field: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., Nursing, Healthcare Administration"
                  />
                </div>
                <div>
                  <label className="form-label">Graduation Date</label>
                  <input
                    type="date"
                    value={newEducation.graduationDate}
                    onChange={(e) => setNewEducation(prev => ({ ...prev, graduationDate: e.target.value }))}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">GPA (optional)</label>
                  <input
                    type="text"
                    value={newEducation.gpa}
                    onChange={(e) => setNewEducation(prev => ({ ...prev, gpa: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., 3.8"
                  />
                </div>
                <div>
                  <label className="form-label">Honors (optional)</label>
                  <input
                    type="text"
                    value={newEducation.honors}
                    onChange={(e) => setNewEducation(prev => ({ ...prev, honors: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., Magna Cum Laude"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={addEducation}
                className="btn btn-secondary mt-4"
              >
                Add Education
              </button>
            </div>
          </div>

          {/* Skills */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Skills</h3>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                className="form-input flex-1"
                placeholder="e.g., Medication Management, Physical Therapy"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              />
              <button type="button" onClick={addSkill} className="btn btn-secondary">
                Add
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {form.skills.map((skill, index) => (
                <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="ml-2 text-purple-600 hover:text-purple-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Training */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Training</h3>
            
            <div className="space-y-4 mb-6">
              {form.training.map((train, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{train.name}</h4>
                      <p className="text-sm text-gray-600">{train.provider}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTraining(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Completed: {train.completionDate}</p>
                    {train.hours && <p>Hours: {train.hours}</p>}
                    {train.certificate && <p>Certificate: {train.certificate}</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-4">Add Training</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Training Name</label>
                  <input
                    type="text"
                    value={newTraining.name}
                    onChange={(e) => setNewTraining(prev => ({ ...prev, name: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., CPR Certification"
                  />
                </div>
                <div>
                  <label className="form-label">Provider</label>
                  <input
                    type="text"
                    value={newTraining.provider}
                    onChange={(e) => setNewTraining(prev => ({ ...prev, provider: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., American Heart Association"
                  />
                </div>
                <div>
                  <label className="form-label">Completion Date</label>
                  <input
                    type="date"
                    value={newTraining.completionDate}
                    onChange={(e) => setNewTraining(prev => ({ ...prev, completionDate: e.target.value }))}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Hours</label>
                  <input
                    type="number"
                    value={newTraining.hours}
                    onChange={(e) => setNewTraining(prev => ({ ...prev, hours: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., 8"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="form-label">Certificate Number (optional)</label>
                  <input
                    type="text"
                    value={newTraining.certificate}
                    onChange={(e) => setNewTraining(prev => ({ ...prev, certificate: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., CPR-2024-001"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={addTraining}
                className="btn btn-secondary mt-4"
              >
                Add Training
              </button>
            </div>
          </div>

          {/* Licenses */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Licenses</h3>
            
            <div className="space-y-4 mb-6">
              {form.licenses.map((license, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{license.type}</h4>
                      <p className="text-sm text-gray-600">License #{license.number}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLicense(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>State: {license.issuingState}</p>
                    <p>Issued: {license.issueDate}</p>
                    {!license.current && license.expiryDate && <p>Expires: {license.expiryDate}</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-4">Add License</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">License Type</label>
                  <select
                    value={newLicense.type}
                    onChange={(e) => setNewLicense(prev => ({ ...prev, type: e.target.value }))}
                    className="form-input"
                  >
                    <option value="">Select license type</option>
                    <option value="CNA">Certified Nursing Assistant (CNA)</option>
                    <option value="LPN">Licensed Practical Nurse (LPN)</option>
                    <option value="RN">Registered Nurse (RN)</option>
                    <option value="LVN">Licensed Vocational Nurse (LVN)</option>
                    <option value="HHA">Home Health Aide (HHA)</option>
                    <option value="PCA">Personal Care Assistant (PCA)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">License Number</label>
                  <input
                    type="text"
                    value={newLicense.number}
                    onChange={(e) => setNewLicense(prev => ({ ...prev, number: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., CNA-12345"
                  />
                </div>
                <div>
                  <label className="form-label">Issuing State</label>
                  <select
                    value={newLicense.issuingState}
                    onChange={(e) => setNewLicense(prev => ({ ...prev, issuingState: e.target.value }))}
                    className="form-input"
                  >
                    <option value="">Select state</option>
                    <option value="CA">California</option>
                    <option value="NY">New York</option>
                    <option value="TX">Texas</option>
                    <option value="FL">Florida</option>
                    <option value="IL">Illinois</option>
                    <option value="PA">Pennsylvania</option>
                    <option value="OH">Ohio</option>
                    <option value="GA">Georgia</option>
                    <option value="NC">North Carolina</option>
                    <option value="MI">Michigan</option>
                    {/* Add more states as needed */}
                  </select>
                </div>
                <div>
                  <label className="form-label">Issue Date</label>
                  <input
                    type="date"
                    value={newLicense.issueDate}
                    onChange={(e) => setNewLicense(prev => ({ ...prev, issueDate: e.target.value }))}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Expiry Date</label>
                  <input
                    type="date"
                    value={newLicense.expiryDate}
                    onChange={(e) => setNewLicense(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="form-input"
                    disabled={newLicense.current}
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newLicense.current}
                      onChange={(e) => setNewLicense(prev => ({ 
                        ...prev, 
                        current: e.target.checked,
                        expiryDate: e.target.checked ? '' : prev.expiryDate
                      }))}
                      className="form-checkbox"
                    />
                    <span className="ml-2 text-sm text-gray-700">Currently valid</span>
                  </label>
                </div>
              </div>
              <button
                type="button"
                onClick={addLicense}
                className="btn btn-secondary mt-4"
              >
                Add License
              </button>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => navigate('/caregiver/onboarding/career')}
              className="btn btn-outline"
            >
              Back
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Continue to References'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CaregiverOnboardingQualifications;
