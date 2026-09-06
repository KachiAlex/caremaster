import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../contexts/UserContext';
import { saveCaregiverProfile, uploadCaregiverDocument, completeOnboarding } from '../api/caregiverOnboardingAPI';
import { toast } from 'react-toastify';
import {
  Upload, FileText, CheckCircle, AlertCircle, X, File, Shield,
  ShieldCheck, LogOut, ArrowRight, ArrowLeft, User, Briefcase, Sparkles,
  Stethoscope, Heart, Phone, Mail, MapPin, Award, Loader,
} from 'lucide-react';

const InstitutionCaregiverOnboarding = () => {
  const [searchParams] = useSearchParams();
  const { user, userProfile, institutionId, institutionData, refreshUserProfile } = useUser();

  const urlInstitutionId = searchParams.get('institution');
  const effectiveInstitutionId = urlInstitutionId || institutionId || userProfile?.institutionId;
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const [profile, setProfile] = useState({
    name: userProfile?.name || userProfile?.fullName || '',
    email: user?.email || userProfile?.email || '',
    phone: userProfile?.phone || '',
    address: userProfile?.address || '',
    medicalQualification: '',
    yearsOfExperience: '',
    specializations: [],
    licenseNumber: '',
    bio: '',
  });

  const [documents, setDocuments] = useState({
    medicalLicense: null,
    certification: null,
    governmentId: null,
    resume: null,
  });

  const [documentPreviews, setDocumentPreviews] = useState({
    medicalLicense: null,
    certification: null,
    governmentId: null,
    resume: null,
  });

  const qualifications = [
    'Doctor (MD)', 'Doctor (MBBS)', 'Nurse (RN)', 'Nurse (LPN)',
    'Physiotherapist', 'Occupational Therapist', 'Clinical Psychologist',
    'Pharmacist', 'Nutritionist/Dietitian', 'Social Worker',
    'Medical Assistant', 'Home Health Aide', 'Companion Caregiver', 'Other',
  ];

  const specializations = [
    'Geriatric Care', 'Palliative Care', 'Dementia Care', 'Post-Surgery Care',
    'Chronic Disease Management', 'Mental Health', 'Physical Therapy',
    'Occupational Therapy', 'Speech Therapy', 'Wound Care',
    'Medication Management', 'General Care',
  ];

  const steps = [
    { num: 1, label: 'Profile', icon: User },
    { num: 2, label: 'Documents', icon: Briefcase },
    { num: 3, label: 'Review', icon: CheckCircle },
  ];

  useEffect(() => {
    if (userProfile?.onboardingComplete) {
      navigate(`/institution-caregiver/dashboard${effectiveInstitutionId ? `?institution=${effectiveInstitutionId}` : ''}`);
    }
  }, [userProfile, navigate, effectiveInstitutionId]);

  const handleProfileChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSpecializationToggle = (spec) => {
    setProfile(prev => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter(s => s !== spec)
        : [...prev.specializations, spec],
    }));
  };

  const handleFileChange = (docType, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF, JPEG, and PNG files are allowed');
      return;
    }
    setDocuments(prev => ({ ...prev, [docType]: file }));
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentPreviews(prev => ({ ...prev, [docType]: reader.result }));
      };
      reader.readAsDataURL(file);
    } else {
      setDocumentPreviews(prev => ({ ...prev, [docType]: 'pdf' }));
    }
  };

  const removeDocument = (docType) => {
    setDocuments(prev => ({ ...prev, [docType]: null }));
    setDocumentPreviews(prev => ({ ...prev, [docType]: null }));
  };

  const validateStep1 = () => {
    if (!profile.name || !profile.email || !profile.phone) {
      toast.error('Please fill in all required fields');
      return false;
    }
    if (!profile.medicalQualification) {
      toast.error('Please select your medical qualification');
      return false;
    }
    if (profile.specializations.length === 0) {
      toast.error('Please select at least one specialization');
      return false;
    }
    return true;
  };

  const handleStep1Next = async () => {
    if (!validateStep1()) return;
    try {
      setSaving(true);
      if (!user?.uid) {
        toast.error('User not authenticated');
        return;
      }
      await saveCaregiverProfile(user.uid, {
        ...profile,
        institutionId: effectiveInstitutionId,
        onboardingStep: 1,
      });
      toast.success('Profile saved successfully');
      setStep(2);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleStep2Upload = async () => {
    // Documents are optional — Cloudinary may not be configured.
    // Proceed to review even if no documents are uploaded.
    try {
      setSaving(true);
      if (!user?.uid) return;

      // Upload documents that were provided (best-effort)
      const uploadPromises = [];
      Object.entries(documents).forEach(([docType, file]) => {
        if (file) {
          setUploadProgress(prev => ({ ...prev, [docType]: 0 }));
          uploadPromises.push(
            uploadCaregiverDocument(user.uid, file, `documents/${docType}`)
              .then(() => {
                setUploadProgress(prev => ({ ...prev, [docType]: 100 }));
              })
              .catch(err => {
                console.warn(`Upload failed for ${docType}:`, err.message);
                // Don't fail the whole step for one upload error
              })
          );
        }
      });

      if (uploadPromises.length > 0) {
        await Promise.all(uploadPromises);
      }

      // Save onboarding step
      await saveCaregiverProfile(user.uid, { onboardingStep: 2 });

      toast.success(uploadPromises.length > 0 ? 'Documents uploaded successfully' : 'Moving to review');
      setStep(3);
    } catch (error) {
      console.error('Error in document step:', error);
      // Still proceed — documents are optional
      toast.info('Continuing to review step...');
      setStep(3);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    try {
      setSaving(true);
      if (!user?.uid) return;

      await completeOnboarding(user.uid);

      // Refresh the user profile so UserContext picks up onboardingComplete=true
      if (refreshUserProfile) {
        await refreshUserProfile();
      }

      toast.success('Onboarding completed! Redirecting to your dashboard...');

      setTimeout(() => {
        const userType = userProfile?.userType || userProfile?.type || 'caregiver';
        if (userType === 'pharmacist') {
          window.location.href = `/institution-pharmacy/dashboard${effectiveInstitutionId ? `?institution=${effectiveInstitutionId}` : ''}`;
        } else {
          window.location.href = `/institution-caregiver/dashboard${effectiveInstitutionId ? `?institution=${effectiveInstitutionId}` : ''}`;
        }
      }, 1500);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete onboarding: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    import('backend/auth').then(({ signOut, getAuth }) => {
      signOut(getAuth()).finally(() => {
        window.location.href = '/login';
      });
    });
  };

  return (
    <div
      className="min-h-dvh w-full flex flex-col lg:flex-row"
      style={{ background: 'var(--cm-cream, #FBF7EF)' }}
    >
      {/* ===== Left brand panel (desktop) ===== */}
      <div
        className="hidden lg:flex lg:w-[34%] xl:w-[36%] flex-col justify-between p-8 xl:p-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #12302C 0%, #0E2622 60%, #1D423C 100%)' }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute top-[-60px] right-[-60px] w-72 h-72 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #6B9080 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-[-80px] left-[-40px] w-80 h-80 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #D9A441 0%, transparent 70%)' }}
        />

        {/* Logo + tagline */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/15">
              <img
                src="/images/caremaster-logo.jpg"
                alt="Care Master"
                className="w-8 h-8 object-contain rounded-lg"
              />
            </div>
            <div>
              <h1 className="font-display text-2xl text-sand tracking-tight">Care Master</h1>
              <p className="text-xs text-sand/60 font-mono tracking-wide">ONE STOP HEALTH CARE</p>
            </div>
          </div>
        </div>

        {/* Hero message */}
        <div className="relative z-10 max-w-md">
          <h2 className="font-display text-3xl xl:text-4xl text-sand leading-tight tracking-tight">
            Welcome to the
            <br />
            <span className="text-gold">care team.</span>
          </h2>
          <p className="mt-4 text-sand/70 text-base leading-relaxed">
            Complete your professional profile to start managing appointments, vital signs, and patient care — all from one secure platform.
          </p>

          {/* Feature pills */}
          <div className="mt-8 space-y-3">
            {[
              { icon: Stethoscope, label: 'Manage patient consultations' },
              { icon: Heart, label: 'Track vitals & care logs' },
              { icon: Shield, label: 'HIPAA-compliant secure access' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4.5 h-4.5 text-sage" style={{ width: 18, height: 18 }} />
                </div>
                <span className="text-sm text-sand/80">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-sand/40 font-mono">
          © {new Date().getFullYear()} Care Master. All rights reserved.
        </div>
      </div>

      {/* ===== Right onboarding form panel ===== */}
      <div className="flex-1 flex flex-col p-5 sm:p-8 lg:p-10 overflow-y-auto">
        <div className="w-full max-w-[720px] mx-auto">
          {/* Mobile logo + logout row */}
          <div className="flex items-center justify-between mb-6 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-sage to-ink shadow-lg shadow-ink/20">
                <img
                  src="/images/caremaster-logo.jpg"
                  alt="Care Master"
                  className="w-7 h-7 object-contain rounded-lg"
                />
              </div>
              <div>
                <h1 className="font-display text-lg text-ink tracking-tight leading-none">Care Master</h1>
                <p className="text-[10px] text-[var(--cm-text-soft)] font-mono tracking-wide mt-0.5">
                  ONE STOP HEALTH CARE
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--cm-text-soft)] hover:text-coral border border-[var(--cm-ink-line,rgba(18,48,44,0.1))] rounded-lg transition-colors"
            >
              <LogOut style={{ width: 14, height: 14 }} />
              Logout
            </button>
          </div>

          {/* Desktop logout */}
          <div className="hidden lg:flex justify-end mb-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--cm-text-soft)] hover:text-coral border border-[var(--cm-ink-line,rgba(18,48,44,0.1))] rounded-lg transition-colors"
            >
              <LogOut style={{ width: 14, height: 14 }} />
              Logout
            </button>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E8F3E8] to-[#F5F0E3] border border-[#D4E4D4] shadow-sm mb-4">
              <Sparkles className="w-5 h-5 text-[#6B9080]" />
            </div>
            <h2 className="cm-display text-[26px] text-ink tracking-tight">
              Complete your profile
            </h2>
            <p className="text-sm text-[var(--cm-text-soft)] mt-1.5 leading-relaxed">
              {institutionData?.name ? `${institutionData.name} — ` : ''}Let's set up your caregiver account.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((s, i) => {
                const Icon = s.icon;
                const isActive = step === s.num;
                const isComplete = step > s.num;
                return (
                  <React.Fragment key={s.num}>
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                          isActive
                            ? 'bg-[var(--cm-gold)] text-ink shadow-lg shadow-[rgba(217,164,65,0.35)]'
                            : isComplete
                            ? 'bg-[var(--cm-sage)] text-white'
                            : 'bg-white border-2 border-[var(--cm-ink-line,rgba(18,48,44,0.1))] text-[var(--cm-text-soft)]'
                        }`}
                      >
                        {isComplete ? (
                          <CheckCircle style={{ width: 18, height: 18 }} />
                        ) : (
                          <Icon style={{ width: 18, height: 18 }} />
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-medium tracking-wide ${
                          isActive ? 'text-ink' : isComplete ? 'text-[var(--cm-sage)]' : 'text-[var(--cm-text-soft)]'
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 rounded-full transition-all duration-300 ${
                          step > s.num ? 'bg-[var(--cm-sage)]' : 'bg-[var(--cm-ink-line,rgba(18,48,44,0.1))]'
                        }`}
                        style={{ maxWidth: 60 }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Content Card */}
          <div className="cm-card p-6 sm:p-8 bg-white/95 backdrop-blur-sm">
            <AnimatePresence mode="wait">
              {/* Step 1: Profile Information */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-xl font-display text-ink mb-1">Professional Profile</h3>
                  <p className="text-sm text-[var(--cm-text-soft)] mb-6">Tell us about your medical background and expertise.</p>

                  <div className="space-y-5">
                    {/* Name + Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] font-semibold text-ink mb-2">
                          Full Name <span className="text-coral">*</span>
                        </label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B9080] pointer-events-none" style={{ width: 18, height: 18 }} />
                          <input
                            type="text"
                            required
                            value={profile.name}
                            onChange={(e) => handleProfileChange('name', e.target.value)}
                            className="cm-input h-11 rounded-xl"
                            style={{ paddingLeft: '44px' }}
                            placeholder="John Doe"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-ink mb-2">
                          Email <span className="text-coral">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B9080] pointer-events-none" style={{ width: 18, height: 18 }} />
                          <input
                            type="email"
                            required
                            value={profile.email}
                            onChange={(e) => handleProfileChange('email', e.target.value)}
                            className="cm-input h-11 rounded-xl opacity-60 cursor-not-allowed"
                            style={{ paddingLeft: '44px' }}
                            disabled
                          />
                        </div>
                      </div>
                    </div>

                    {/* Phone + Qualification */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] font-semibold text-ink mb-2">
                          Phone <span className="text-coral">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B9080] pointer-events-none" style={{ width: 18, height: 18 }} />
                          <input
                            type="tel"
                            required
                            value={profile.phone}
                            onChange={(e) => handleProfileChange('phone', e.target.value)}
                            className="cm-input h-11 rounded-xl"
                            style={{ paddingLeft: '44px' }}
                            placeholder="+234 800 000 0000"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-ink mb-2">
                          Qualification <span className="text-coral">*</span>
                        </label>
                        <div className="relative">
                          <Award className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B9080] pointer-events-none z-10" style={{ width: 18, height: 18 }} />
                          <select
                            required
                            value={profile.medicalQualification}
                            onChange={(e) => handleProfileChange('medicalQualification', e.target.value)}
                            className="cm-input h-11 rounded-xl appearance-none"
                            style={{ paddingLeft: '44px', paddingRight: '12px' }}
                          >
                            <option value="">Select qualification</option>
                            {qualifications.map(qual => (
                              <option key={qual} value={qual}>{qual}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Experience + License */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] font-semibold text-ink mb-2">
                          Years of Experience
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={profile.yearsOfExperience}
                          onChange={(e) => handleProfileChange('yearsOfExperience', e.target.value)}
                          className="cm-input h-11 rounded-xl"
                          placeholder="5"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-ink mb-2">
                          License Number
                        </label>
                        <input
                          type="text"
                          value={profile.licenseNumber}
                          onChange={(e) => handleProfileChange('licenseNumber', e.target.value)}
                          className="cm-input h-11 rounded-xl"
                          placeholder="LIC-123456"
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-[13px] font-semibold text-ink mb-2">
                        Address
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-3.5 text-[#6B9080] pointer-events-none" style={{ width: 18, height: 18 }} />
                        <textarea
                          rows={2}
                          value={profile.address}
                          onChange={(e) => handleProfileChange('address', e.target.value)}
                          className="cm-input rounded-xl resize-none"
                          style={{ paddingLeft: '44px' }}
                          placeholder="Your full address"
                        />
                      </div>
                    </div>

                    {/* Specializations */}
                    <div>
                      <label className="block text-[13px] font-semibold text-ink mb-2">
                        Specializations <span className="text-coral">*</span>
                        <span className="text-[var(--cm-text-soft)] font-normal text-xs ml-2">(Select at least one)</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {specializations.map(spec => {
                          const selected = profile.specializations.includes(spec);
                          return (
                            <button
                              key={spec}
                              type="button"
                              onClick={() => handleSpecializationToggle(spec)}
                              className={`px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all ${
                                selected
                                  ? 'bg-[var(--cm-sage-soft,#DDE7DF)] text-[var(--cm-sage)] border border-[var(--cm-sage)]'
                                  : 'bg-white text-[var(--cm-text-soft)] border border-[var(--cm-ink-line,rgba(18,48,44,0.1))] hover:border-[var(--cm-sage)] hover:text-ink'
                              }`}
                            >
                              {spec}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bio */}
                    <div>
                      <label className="block text-[13px] font-semibold text-ink mb-2">
                        Professional Bio
                      </label>
                      <textarea
                        rows={3}
                        value={profile.bio}
                        onChange={(e) => handleProfileChange('bio', e.target.value)}
                        className="cm-input rounded-xl resize-none"
                        placeholder="Tell us about your experience and expertise..."
                      />
                    </div>
                  </div>

                  <div className="mt-7 flex justify-end">
                    <button
                      onClick={handleStep1Next}
                      disabled={saving}
                      className="cm-btn cm-btn-gold px-6 py-3 h-12 rounded-xl shadow-lg shadow-[rgba(217,164,65,0.35)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 text-[14px]"
                    >
                      {saving ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <span>Save & Continue</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Document Upload */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-xl font-display text-ink mb-1">Upload Documents</h3>
                  <p className="text-sm text-[var(--cm-text-soft)] mb-6">
                    Upload your professional credentials. <span className="text-[var(--cm-sage)] font-medium">Optional</span> — you can skip this step.
                  </p>

                  <div className="space-y-4">
                    <DocumentUpload
                      label="Medical License/Registration"
                      description="Your medical license or professional registration certificate"
                      file={documents.medicalLicense}
                      preview={documentPreviews.medicalLicense}
                      progress={uploadProgress.medicalLicense}
                      onChange={(file) => handleFileChange('medicalLicense', file)}
                      onRemove={() => removeDocument('medicalLicense')}
                    />
                    <DocumentUpload
                      label="Professional Certification"
                      description="Your professional certification or degree"
                      file={documents.certification}
                      preview={documentPreviews.certification}
                      progress={uploadProgress.certification}
                      onChange={(file) => handleFileChange('certification', file)}
                      onRemove={() => removeDocument('certification')}
                    />
                    <DocumentUpload
                      label="Government-Issued ID"
                      description="Valid government ID (passport, driver's license, etc.)"
                      file={documents.governmentId}
                      preview={documentPreviews.governmentId}
                      progress={uploadProgress.governmentId}
                      onChange={(file) => handleFileChange('governmentId', file)}
                      onRemove={() => removeDocument('governmentId')}
                    />
                    <DocumentUpload
                      label="Resume/CV"
                      description="Your professional resume or curriculum vitae"
                      file={documents.resume}
                      preview={documentPreviews.resume}
                      progress={uploadProgress.resume}
                      onChange={(file) => handleFileChange('resume', file)}
                      onRemove={() => removeDocument('resume')}
                    />
                  </div>

                  <div className="mt-7 flex justify-between">
                    <button
                      onClick={() => setStep(1)}
                      disabled={saving}
                      className="cm-btn cm-btn-ghost-light px-5 py-3 h-12 rounded-xl disabled:opacity-50 flex items-center gap-2 text-[14px]"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      onClick={handleStep2Upload}
                      disabled={saving}
                      className="cm-btn cm-btn-gold px-6 py-3 h-12 rounded-xl shadow-lg shadow-[rgba(217,164,65,0.35)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 text-[14px]"
                    >
                      {saving ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <span>Continue</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Review & Submit */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-6">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, type: 'spring' }}
                      className="mx-auto w-14 h-14 rounded-2xl bg-[var(--cm-sage-soft,#DDE7DF)] flex items-center justify-center mb-3"
                    >
                      <CheckCircle className="w-7 h-7 text-[var(--cm-sage)]" />
                    </motion.div>
                    <h3 className="text-xl font-display text-ink mb-1">Ready to go!</h3>
                    <p className="text-sm text-[var(--cm-text-soft)]">
                      Review your profile and complete onboarding to access your dashboard.
                    </p>
                  </div>

                  {/* Info banner */}
                  <div className="rounded-xl bg-[#F5F0E3] border border-[#E7D9B8] p-4 mb-6">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-[var(--cm-gold-deep)] flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-[13px] font-semibold text-ink mb-1">What happens next?</h4>
                        <ul className="text-xs text-[var(--cm-text-soft)] space-y-1">
                          <li>• Your profile is now active — no admin approval required</li>
                          <li>• You can start accepting client assignments immediately</li>
                          <li>• Documents will be verified in the background</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Profile Summary */}
                  <div className="rounded-xl border border-[var(--cm-ink-line,rgba(18,48,44,0.1))] p-5 mb-6">
                    <h4 className="text-[13px] font-semibold text-ink mb-3">Profile Summary</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <SummaryItem label="Name" value={profile.name} />
                      <SummaryItem label="Qualification" value={profile.medicalQualification} />
                      <SummaryItem label="Experience" value={profile.yearsOfExperience ? `${profile.yearsOfExperience} years` : 'N/A'} />
                      <SummaryItem label="Specializations" value={`${profile.specializations.length} selected`} />
                      <SummaryItem label="Phone" value={profile.phone} />
                      <SummaryItem label="License" value={profile.licenseNumber || 'N/A'} />
                    </div>
                    {profile.specializations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[var(--cm-ink-line,rgba(18,48,44,0.08))]">
                        <div className="flex flex-wrap gap-1.5">
                          {profile.specializations.map(spec => (
                            <span key={spec} className="cm-tag-sage text-[11px] px-2.5 py-1 rounded-lg">
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() => setStep(2)}
                      disabled={saving}
                      className="cm-btn cm-btn-ghost-light px-5 py-3 h-12 rounded-xl disabled:opacity-50 flex items-center gap-2 text-[14px]"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      onClick={handleComplete}
                      disabled={saving}
                      className="cm-btn cm-btn-sage px-6 py-3 h-12 rounded-xl shadow-lg shadow-[rgba(107,144,128,0.35)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 text-[14px]"
                    >
                      {saving ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          <span>Completing...</span>
                        </>
                      ) : (
                        <>
                          <span>Complete Onboarding</span>
                          <CheckCircle className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Trust note */}
          <div className="flex items-center justify-center gap-2 mt-6 py-2 px-3 rounded-full bg-white/60 border border-[var(--cm-ink-line,rgba(18,48,44,0.08))]">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--cm-sage)]" />
            <span className="text-[11px] text-[var(--cm-text-soft)] font-medium">
              Your data is encrypted & HIPAA-compliant
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Summary item component
const SummaryItem = ({ label, value }) => (
  <div>
    <span className="text-[var(--cm-text-soft)] text-xs block">{label}</span>
    <span className="text-ink font-medium text-sm">{value || 'N/A'}</span>
  </div>
);

// Document Upload Component
const DocumentUpload = ({ label, description, file, preview, progress, onChange, onRemove }) => {
  return (
    <div className="rounded-xl border-2 border-dashed border-[var(--cm-ink-line,rgba(18,48,44,0.12))] p-4 hover:border-[var(--cm-sage)] transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <label className="text-[13px] font-semibold text-ink">{label}</label>
          {description && (
            <p className="text-xs text-[var(--cm-text-soft)] mt-0.5">{description}</p>
          )}
        </div>
      </div>

      {!file ? (
        <label className="cursor-pointer block">
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/jpg,image/png"
            onChange={(e) => onChange(e.target.files?.[0])}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center py-6 rounded-lg bg-[var(--cm-cream,#FBF7EF)]/50">
            <Upload className="w-8 h-8 text-[var(--cm-text-soft)] mb-2" />
            <p className="text-xs text-[var(--cm-text-soft)] mb-0.5">
              Click to upload or drag and drop
            </p>
            <p className="text-[11px] text-[var(--cm-text-soft)]/70">
              PDF, JPEG, PNG (Max 5MB)
            </p>
          </div>
        </label>
      ) : (
        <div className="flex items-center justify-between bg-[var(--cm-cream,#FBF7EF)]/60 rounded-lg p-3">
          <div className="flex items-center gap-3">
            {preview === 'pdf' ? (
              <div className="w-10 h-10 rounded-lg bg-coral-soft/40 flex items-center justify-center">
                <FileText className="w-5 h-5 text-coral" />
              </div>
            ) : preview ? (
              <img src={preview} alt="Preview" className="w-12 h-12 object-cover rounded-lg" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-[var(--cm-sage-soft,#DDE7DF)] flex items-center justify-center">
                <File className="w-5 h-5 text-[var(--cm-sage)]" />
              </div>
            )}
            <div>
              <p className="text-[13px] font-medium text-ink truncate max-w-[180px]">{file.name}</p>
              <p className="text-[11px] text-[var(--cm-text-soft)]">
                {(file.size / 1024 / 1024).toFixed(2)} MB
                {progress === 100 && <span className="text-[var(--cm-sage)] ml-1">✓ Uploaded</span>}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="p-2 text-[var(--cm-text-soft)] hover:text-coral rounded-lg hover:bg-coral-soft/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default InstitutionCaregiverOnboarding;
