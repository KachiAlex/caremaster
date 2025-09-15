import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { updateUser } from '../api/usersAPI';

const OnboardingProfile = () => {
  const navigate = useNavigate();
  const { user, userProfile, updateUserProfile } = useUser();
  const [form, setForm] = useState({
    name: userProfile?.name || userProfile?.displayName || user?.displayName || '',
    phone: userProfile?.phone || '',
    address: userProfile?.address || '',
    dateOfBirth: userProfile?.dateOfBirth || '',
    emergencyContactName: userProfile?.emergencyContactName || '',
    emergencyContactPhone: userProfile?.emergencyContactPhone || ''
  });
  const [saving, setSaving] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;
    setSaving(true);
    try {
      await updateUser(user.uid, { ...form, onboardingProfileComplete: true });
      updateUserProfile({ ...(userProfile || {}), ...form, onboardingProfileComplete: true });
      navigate('/onboarding/medical');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Tell us about you</h2>
          <p className="text-gray-600">This helps caregivers personalize your care.</p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="form-label">Full name</label>
            <input name="name" className="form-input" value={form.name} onChange={onChange} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Phone</label>
              <input name="phone" className="form-input" value={form.phone} onChange={onChange} />
            </div>
            <div>
              <label className="form-label">Date of birth</label>
              <input name="dateOfBirth" type="date" className="form-input" value={form.dateOfBirth} onChange={onChange} />
            </div>
          </div>
          <div>
            <label className="form-label">Address</label>
            <input name="address" className="form-input" value={form.address} onChange={onChange} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Emergency contact name</label>
              <input name="emergencyContactName" className="form-input" value={form.emergencyContactName} onChange={onChange} />
            </div>
            <div>
              <label className="form-label">Emergency contact phone</label>
              <input name="emergencyContactPhone" className="form-input" value={form.emergencyContactPhone} onChange={onChange} />
            </div>
          </div>
          <div className="pt-2">
            <button type="submit" className="btn btn-primary w-full" disabled={saving}>
              {saving ? 'Saving...' : 'Continue to medical history'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OnboardingProfile;


