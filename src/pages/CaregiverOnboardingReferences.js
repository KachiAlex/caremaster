import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { updateUser } from '../api/usersAPI';

const CaregiverOnboardingReferences = () => {
  const navigate = useNavigate();
  const { user, userProfile, updateUserProfile } = useUser();
  const [form, setForm] = useState({
    references: userProfile?.references || [],
    emergencyContacts: userProfile?.emergencyContacts || []
  });
  const [saving, setSaving] = useState(false);
  const [newReference, setNewReference] = useState({
    name: '',
    relationship: '',
    company: '',
    position: '',
    phone: '',
    email: '',
    yearsKnown: '',
    canContact: true
  });
  const [newEmergencyContact, setNewEmergencyContact] = useState({
    name: '',
    relationship: '',
    phone: '',
    email: '',
    address: '',
    primary: false
  });

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const addReference = () => {
    if (newReference.name && newReference.relationship && newReference.phone) {
      setForm(prev => ({
        ...prev,
        references: [...prev.references, { ...newReference }]
      }));
      setNewReference({
        name: '',
        relationship: '',
        company: '',
        position: '',
        phone: '',
        email: '',
        yearsKnown: '',
        canContact: true
      });
    }
  };

  const removeReference = (index) => {
    setForm(prev => ({
      ...prev,
      references: prev.references.filter((_, i) => i !== index)
    }));
  };

  const addEmergencyContact = () => {
    if (newEmergencyContact.name && newEmergencyContact.relationship && newEmergencyContact.phone) {
      setForm(prev => ({
        ...prev,
        emergencyContacts: [...prev.emergencyContacts, { ...newEmergencyContact }]
      }));
      setNewEmergencyContact({
        name: '',
        relationship: '',
        phone: '',
        email: '',
        address: '',
        primary: false
      });
    }
  };

  const removeEmergencyContact = (index) => {
    setForm(prev => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.filter((_, i) => i !== index)
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;
    setSaving(true);
    try {
      await updateUser(user.uid, { 
        ...form, 
        onboardingReferencesComplete: true
      });
      updateUserProfile({ ...(userProfile || {}), ...form, onboardingReferencesComplete: true });
      navigate('/caregiver/onboarding/documents');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">References & Emergency Contacts</h2>
          <p className="text-gray-600 mt-2">Provide professional references and emergency contact information</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-8">
          {/* Professional References */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional References</h3>
            <p className="text-sm text-gray-600 mb-6">Please provide at least 2 professional references who can speak to your caregiving abilities and character.</p>
            
            <div className="space-y-4 mb-6">
              {form.references.map((ref, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{ref.name}</h4>
                      <p className="text-sm text-gray-600">{ref.relationship}</p>
                      {ref.company && ref.position && (
                        <p className="text-sm text-gray-600">{ref.position} at {ref.company}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeReference(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Phone: {ref.phone}</p>
                    {ref.email && <p>Email: {ref.email}</p>}
                    {ref.yearsKnown && <p>Known for: {ref.yearsKnown} years</p>}
                    <p>Can contact: {ref.canContact ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-4">Add Reference</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    value={newReference.name}
                    onChange={(e) => setNewReference(prev => ({ ...prev, name: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., Dr. Sarah Johnson"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Relationship *</label>
                  <select
                    value={newReference.relationship}
                    onChange={(e) => setNewReference(prev => ({ ...prev, relationship: e.target.value }))}
                    className="form-input"
                    required
                  >
                    <option value="">Select relationship</option>
                    <option value="Former Supervisor">Former Supervisor</option>
                    <option value="Colleague">Colleague</option>
                    <option value="Client/Family">Client/Family</option>
                    <option value="Healthcare Professional">Healthcare Professional</option>
                    <option value="Professor/Instructor">Professor/Instructor</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Company/Organization</label>
                  <input
                    type="text"
                    value={newReference.company}
                    onChange={(e) => setNewReference(prev => ({ ...prev, company: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., ABC Care Services"
                  />
                </div>
                <div>
                  <label className="form-label">Position/Title</label>
                  <input
                    type="text"
                    value={newReference.position}
                    onChange={(e) => setNewReference(prev => ({ ...prev, position: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., Director of Nursing"
                  />
                </div>
                <div>
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    value={newReference.phone}
                    onChange={(e) => setNewReference(prev => ({ ...prev, phone: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., (555) 123-4567"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    value={newReference.email}
                    onChange={(e) => setNewReference(prev => ({ ...prev, email: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., sarah.johnson@example.com"
                  />
                </div>
                <div>
                  <label className="form-label">Years Known</label>
                  <select
                    value={newReference.yearsKnown}
                    onChange={(e) => setNewReference(prev => ({ ...prev, yearsKnown: e.target.value }))}
                    className="form-input"
                  >
                    <option value="">Select duration</option>
                    <option value="Less than 1 year">Less than 1 year</option>
                    <option value="1-2 years">1-2 years</option>
                    <option value="3-5 years">3-5 years</option>
                    <option value="6-10 years">6-10 years</option>
                    <option value="More than 10 years">More than 10 years</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newReference.canContact}
                      onChange={(e) => setNewReference(prev => ({ ...prev, canContact: e.target.checked }))}
                      className="form-checkbox"
                    />
                    <span className="ml-2 text-sm text-gray-700">Can we contact this reference?</span>
                  </label>
                </div>
              </div>
              <button
                type="button"
                onClick={addReference}
                className="btn btn-secondary mt-4"
              >
                Add Reference
              </button>
            </div>
          </div>

          {/* Emergency Contacts */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contacts</h3>
            <p className="text-sm text-gray-600 mb-6">Please provide at least 2 emergency contacts who can be reached in case of an emergency.</p>
            
            <div className="space-y-4 mb-6">
              {form.emergencyContacts.map((contact, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{contact.name}</h4>
                      <p className="text-sm text-gray-600">{contact.relationship}</p>
                      {contact.primary && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Primary Contact
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEmergencyContact(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Phone: {contact.phone}</p>
                    {contact.email && <p>Email: {contact.email}</p>}
                    {contact.address && <p>Address: {contact.address}</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-4">Add Emergency Contact</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    value={newEmergencyContact.name}
                    onChange={(e) => setNewEmergencyContact(prev => ({ ...prev, name: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., John Smith"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Relationship *</label>
                  <select
                    value={newEmergencyContact.relationship}
                    onChange={(e) => setNewEmergencyContact(prev => ({ ...prev, relationship: e.target.value }))}
                    className="form-input"
                    required
                  >
                    <option value="">Select relationship</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Child">Child</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Friend">Friend</option>
                    <option value="Other Family">Other Family</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    value={newEmergencyContact.phone}
                    onChange={(e) => setNewEmergencyContact(prev => ({ ...prev, phone: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., (555) 123-4567"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    value={newEmergencyContact.email}
                    onChange={(e) => setNewEmergencyContact(prev => ({ ...prev, email: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., john.smith@example.com"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="form-label">Address</label>
                  <textarea
                    value={newEmergencyContact.address}
                    onChange={(e) => setNewEmergencyContact(prev => ({ ...prev, address: e.target.value }))}
                    className="form-input"
                    rows="2"
                    placeholder="Full address including city, state, and zip code"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newEmergencyContact.primary}
                      onChange={(e) => setNewEmergencyContact(prev => ({ ...prev, primary: e.target.checked }))}
                      className="form-checkbox"
                    />
                    <span className="ml-2 text-sm text-gray-700">Primary emergency contact</span>
                  </label>
                </div>
              </div>
              <button
                type="button"
                onClick={addEmergencyContact}
                className="btn btn-secondary mt-4"
              >
                Add Emergency Contact
              </button>
            </div>
          </div>

          {/* Reference Guidelines */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Reference Guidelines</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>• <strong>Professional References:</strong> Should be people who have worked with you in a professional capacity and can speak to your caregiving skills, reliability, and character.</p>
              <p>• <strong>Contact Permission:</strong> We will only contact references with your permission and will use the information to verify your qualifications and suitability for caregiving positions.</p>
              <p>• <strong>Emergency Contacts:</strong> Should be people who can be reached 24/7 in case of an emergency. At least one should be a family member or close friend.</p>
              <p>• <strong>Privacy:</strong> All reference information is kept confidential and is only used for verification purposes.</p>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => navigate('/caregiver/onboarding/qualifications')}
              className="btn btn-outline"
            >
              Back
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={saving || form.references.length < 2 || form.emergencyContacts.length < 2}
            >
              {saving ? 'Saving...' : 'Continue to Documents'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CaregiverOnboardingReferences;
