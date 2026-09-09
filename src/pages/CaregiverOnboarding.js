import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { saveCaregiverProfile, uploadCaregiverDocument, completeOnboarding } from '../api/caregiverOnboardingAPI';
import { toast } from 'react-toastify';

const CaregiverOnboarding = () => {
  const { user, userProfile } = useUser();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: userProfile?.name || '',
    email: user?.email || userProfile?.email || '',
    phone: '',
    address: '',
    medicalQualification: '',
    yearsOfExperience: '',
    specializations: [],
  });

  // Backfill email/name from userProfile when it arrives asynchronously
  useEffect(() => {
    if (!userProfile) return;
    setProfile(prev => ({
      ...prev,
      email: prev.email || userProfile.email || user?.email || '',
      name: prev.name || userProfile.name || userProfile.fullName ||
        `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim(),
      phone: prev.phone || userProfile.phone || '',
    }));
  }, [userProfile, user?.email]);
  const [licenseFile, setLicenseFile] = useState(null);
  const [idFile, setIdFile] = useState(null);

  const handleNext = async () => {
    try {
      setSaving(true);
      if (!user?.uid) return;
      await saveCaregiverProfile(user.uid, profile);
      setStep(step + 1);
    } catch (e) {
      toast.error('Failed to save');
    } finally { setSaving(false); }
  };

  const handleUpload = async () => {
    if (!user?.uid) return;
    try {
      setSaving(true);
      if (!licenseFile) throw new Error('Medical license is required');
      await uploadCaregiverDocument(user.uid, licenseFile, 'documents');
      if (idFile) await uploadCaregiverDocument(user.uid, idFile, 'documents');
      setStep(step + 1);
    } catch (e) {
      toast.error(e.message || 'Upload failed');
    } finally { setSaving(false); }
  };

  const handleComplete = async () => {
    try {
      setSaving(true);
      // Use user.id (UUID) if available, fallback to user.uid
      const userId = user?.id || user?.uid;
      if (!userId) {
        throw new Error('User session expired. Please log in again.');
      }
      await completeOnboarding(userId);
      toast.success('Onboarding complete');

      // Redirect based on user type and institution
      const userType = userProfile?.userType || userProfile?.type || 'caregiver';
      const hasInstitution = !!userProfile?.institutionId;

      if (hasInstitution) {
        // Institution-affiliated users go to their institution dashboard
        if (userType === 'pharmacist') {
          window.location.replace('/institution-pharmacy');
        } else {
          window.location.replace('/institution-caregiver');
        }
      } else {
        // Independent service providers
        window.location.replace('/service-provider');
      }
    } catch (e) {
      console.error('Onboarding completion failed:', e);
      toast.error(e.message || 'Failed to complete onboarding. Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {step === 1 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Caregiver Profile</h2>
          <div className="space-y-3">
            <input className="w-full border p-2" placeholder="Full name" value={profile.name} onChange={e=>setProfile({...profile, name:e.target.value})} />
            <input className="w-full border p-2" placeholder="Phone" value={profile.phone} onChange={e=>setProfile({...profile, phone:e.target.value})} />
            <input className="w-full border p-2" placeholder="Address" value={profile.address} onChange={e=>setProfile({...profile, address:e.target.value})} />
            <input className="w-full border p-2" placeholder="Medical Qualification (e.g., RN, MD)" value={profile.medicalQualification} onChange={e=>setProfile({...profile, medicalQualification:e.target.value})} />
            <input className="w-full border p-2" placeholder="Years of Experience" value={profile.yearsOfExperience} onChange={e=>setProfile({...profile, yearsOfExperience:e.target.value})} />
          </div>
          <div className="mt-4 flex justify-end">
            <button disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleNext}>Save & Continue</button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Upload Documents</h2>
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium">Medical License (PDF/Image) - Required</div>
              <input type="file" accept="application/pdf,image/*" onChange={e=>setLicenseFile(e.target.files?.[0]||null)} />
            </div>
            <div>
              <div className="text-sm">Government ID (optional)</div>
              <input type="file" accept="application/pdf,image/*" onChange={e=>setIdFile(e.target.files?.[0]||null)} />
            </div>
          </div>
          <div className="mt-4 flex justify-between">
            <button disabled={saving} className="px-4 py-2 bg-gray-200 rounded" onClick={()=>setStep(1)}>Back</button>
            <button disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleUpload}>Upload & Continue</button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Submit for Verification</h2>
          <p className="text-gray-600 mb-4">Submit your profile and documents for admin verification. You'll be redirected to the dashboard.</p>
          <div className="flex justify-end">
            <button disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded" onClick={handleComplete}>Submit</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaregiverOnboarding;