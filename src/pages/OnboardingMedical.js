import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { updateUser } from '../api/usersAPI';

const OnboardingMedical = () => {
  const navigate = useNavigate();
  const { user, userProfile, updateUserProfile } = useUser();
  const [form, setForm] = useState({
    allergies: userProfile?.allergies || '',
    medicalConditions: userProfile?.medicalConditions || '',
    medications: userProfile?.medications || '',
    doctorName: userProfile?.primaryCareDoctor || ''
  });
  const [saving, setSaving] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;
    setSaving(true);
    try {
      await updateUser(user.uid, { ...form, onboardingMedicalComplete: true });
      updateUserProfile({ ...(userProfile || {}), ...form, onboardingMedicalComplete: true });
      navigate('/dashboard');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Medical history</h2>
          <p className="text-gray-600">This helps your care team keep you safe.</p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="form-label">Allergies</label>
            <textarea name="allergies" className="form-input" rows={3} value={form.allergies} onChange={onChange} />
          </div>
          <div>
            <label className="form-label">Medical conditions</label>
            <textarea name="medicalConditions" className="form-input" rows={3} value={form.medicalConditions} onChange={onChange} />
          </div>
          <div>
            <label className="form-label">Current medications</label>
            <textarea name="medications" className="form-input" rows={3} value={form.medications} onChange={onChange} />
          </div>
          <div>
            <label className="form-label">Primary care doctor</label>
            <input name="doctorName" className="form-input" value={form.doctorName} onChange={onChange} />
          </div>
          <div className="pt-2">
            <button type="submit" className="btn btn-primary w-full" disabled={saving}>
              {saving ? 'Saving...' : 'Finish onboarding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OnboardingMedical;


