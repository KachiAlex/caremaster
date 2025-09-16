import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { updateUser } from '../api/usersAPI';

const CaregiverOnboardingCareer = () => {
  const navigate = useNavigate();
  const { user, userProfile, updateUserProfile } = useUser();
  const [form, setForm] = useState({
    yearsOfExperience: userProfile?.yearsOfExperience || '',
    specializations: userProfile?.specializations || [],
    languages: userProfile?.languages || [],
    availability: userProfile?.availability || {
      weekdays: false,
      weekends: false,
      evenings: false,
      nights: false,
      holidays: false
    },
    hourlyRate: userProfile?.hourlyRate || '',
    maxDistance: userProfile?.maxDistance || '',
    preferredClients: userProfile?.preferredClients || [],
    workHistory: userProfile?.workHistory || []
  });
  const [saving, setSaving] = useState(false);
  const [newSpecialization, setNewSpecialization] = useState('');
  const [newLanguage, setNewLanguage] = useState('');
  const [newWorkEntry, setNewWorkEntry] = useState({
    company: '',
    position: '',
    startDate: '',
    endDate: '',
    description: '',
    current: false
  });

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('availability.')) {
      const availabilityKey = name.split('.')[1];
      setForm(prev => ({
        ...prev,
        availability: {
          ...prev.availability,
          [availabilityKey]: checked
        }
      }));
    } else if (type === 'checkbox' && name.startsWith('preferredClients.')) {
      const clientType = name.split('.')[1];
      setForm(prev => ({
        ...prev,
        preferredClients: checked 
          ? [...prev.preferredClients, clientType]
          : prev.preferredClients.filter(type => type !== clientType)
      }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const addSpecialization = () => {
    if (newSpecialization.trim() && !form.specializations.includes(newSpecialization.trim())) {
      setForm(prev => ({
        ...prev,
        specializations: [...prev.specializations, newSpecialization.trim()]
      }));
      setNewSpecialization('');
    }
  };

  const removeSpecialization = (specialization) => {
    setForm(prev => ({
      ...prev,
      specializations: prev.specializations.filter(s => s !== specialization)
    }));
  };

  const addLanguage = () => {
    if (newLanguage.trim() && !form.languages.includes(newLanguage.trim())) {
      setForm(prev => ({
        ...prev,
        languages: [...prev.languages, newLanguage.trim()]
      }));
      setNewLanguage('');
    }
  };

  const removeLanguage = (language) => {
    setForm(prev => ({
      ...prev,
      languages: prev.languages.filter(l => l !== language)
    }));
  };

  const addWorkEntry = () => {
    if (newWorkEntry.company && newWorkEntry.position && newWorkEntry.startDate) {
      setForm(prev => ({
        ...prev,
        workHistory: [...prev.workHistory, { ...newWorkEntry }]
      }));
      setNewWorkEntry({
        company: '',
        position: '',
        startDate: '',
        endDate: '',
        description: '',
        current: false
      });
    }
  };

  const removeWorkEntry = (index) => {
    setForm(prev => ({
      ...prev,
      workHistory: prev.workHistory.filter((_, i) => i !== index)
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;
    setSaving(true);
    try {
      await updateUser(user.uid, { 
        ...form, 
        onboardingCareerComplete: true,
        userType: 'caregiver'
      });
      updateUserProfile({ ...(userProfile || {}), ...form, onboardingCareerComplete: true });
      navigate('/caregiver/onboarding/qualifications');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Tell us about your career</h2>
          <p className="text-gray-600 mt-2">Help us understand your professional background and preferences</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-8">
          {/* Experience & Specializations */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Experience & Expertise</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Years of Experience</label>
                <select name="yearsOfExperience" value={form.yearsOfExperience} onChange={onChange} className="form-input" required>
                  <option value="">Select experience level</option>
                  <option value="0-1">0-1 years</option>
                  <option value="2-3">2-3 years</option>
                  <option value="4-5">4-5 years</option>
                  <option value="6-10">6-10 years</option>
                  <option value="10+">10+ years</option>
                </select>
              </div>

              <div>
                <label className="form-label">Hourly Rate ($)</label>
                <input 
                  name="hourlyRate" 
                  type="number" 
                  min="0" 
                  step="0.50"
                  value={form.hourlyRate} 
                  onChange={onChange} 
                  className="form-input" 
                  placeholder="e.g., 25.00"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="form-label">Specializations</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newSpecialization}
                  onChange={(e) => setNewSpecialization(e.target.value)}
                  className="form-input flex-1"
                  placeholder="e.g., Dementia Care, Physical Therapy"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialization())}
                />
                <button type="button" onClick={addSpecialization} className="btn btn-secondary">
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.specializations.map((spec, index) => (
                  <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                    {spec}
                    <button
                      type="button"
                      onClick={() => removeSpecialization(spec)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <label className="form-label">Languages</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  className="form-input flex-1"
                  placeholder="e.g., Spanish, French"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                />
                <button type="button" onClick={addLanguage} className="btn btn-secondary">
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.languages.map((lang, index) => (
                  <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                    {lang}
                    <button
                      type="button"
                      onClick={() => removeLanguage(lang)}
                      className="ml-2 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Availability */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Availability</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(form.availability).map(([key, value]) => (
                <label key={key} className="flex items-center">
                  <input
                    type="checkbox"
                    name={`availability.${key}`}
                    checked={value}
                    onChange={onChange}
                    className="form-checkbox"
                  />
                  <span className="ml-2 text-sm text-gray-700 capitalize">{key}</span>
                </label>
              ))}
            </div>
            <div className="mt-4">
              <label className="form-label">Maximum Distance (miles)</label>
              <input 
                name="maxDistance" 
                type="number" 
                min="1" 
                max="100"
                value={form.maxDistance} 
                onChange={onChange} 
                className="form-input" 
                placeholder="e.g., 25"
              />
            </div>
          </div>

          {/* Preferred Clients */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferred Client Types</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {['elderly', 'disabled', 'recovery', 'companionship', 'medical', 'respite'].map(type => (
                <label key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    name={`preferredClients.${type}`}
                    checked={form.preferredClients.includes(type)}
                    onChange={onChange}
                    className="form-checkbox"
                  />
                  <span className="ml-2 text-sm text-gray-700 capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Work History */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Work History</h3>
            
            <div className="space-y-4 mb-6">
              {form.workHistory.map((entry, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{entry.position} at {entry.company}</h4>
                    <button
                      type="button"
                      onClick={() => removeWorkEntry(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">
                    {entry.startDate} - {entry.current ? 'Present' : entry.endDate}
                  </p>
                  {entry.description && (
                    <p className="text-sm text-gray-700 mt-2">{entry.description}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-4">Add Work Experience</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Company/Organization</label>
                  <input
                    type="text"
                    value={newWorkEntry.company}
                    onChange={(e) => setNewWorkEntry(prev => ({ ...prev, company: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., ABC Care Services"
                  />
                </div>
                <div>
                  <label className="form-label">Position</label>
                  <input
                    type="text"
                    value={newWorkEntry.position}
                    onChange={(e) => setNewWorkEntry(prev => ({ ...prev, position: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., Senior Caregiver"
                  />
                </div>
                <div>
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    value={newWorkEntry.startDate}
                    onChange={(e) => setNewWorkEntry(prev => ({ ...prev, startDate: e.target.value }))}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    value={newWorkEntry.endDate}
                    onChange={(e) => setNewWorkEntry(prev => ({ ...prev, endDate: e.target.value }))}
                    className="form-input"
                    disabled={newWorkEntry.current}
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newWorkEntry.current}
                    onChange={(e) => setNewWorkEntry(prev => ({ ...prev, current: e.target.checked, endDate: e.target.checked ? '' : prev.endDate }))}
                    className="form-checkbox"
                  />
                  <span className="ml-2 text-sm text-gray-700">Currently working here</span>
                </label>
              </div>
              <div className="mt-4">
                <label className="form-label">Description (optional)</label>
                <textarea
                  value={newWorkEntry.description}
                  onChange={(e) => setNewWorkEntry(prev => ({ ...prev, description: e.target.value }))}
                  className="form-input"
                  rows="3"
                  placeholder="Describe your responsibilities and achievements..."
                />
              </div>
              <button
                type="button"
                onClick={addWorkEntry}
                className="btn btn-secondary mt-4"
              >
                Add Experience
              </button>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-outline"
            >
              Back
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Continue to Qualifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CaregiverOnboardingCareer;
