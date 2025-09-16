import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { updateUser } from '../api/usersAPI';

const CaregiverOnboardingStatement = () => {
  const navigate = useNavigate();
  const { user, userProfile, updateUserProfile } = useUser();
  const [form, setForm] = useState({
    personalStatement: userProfile?.personalStatement || '',
    whyCaregiving: userProfile?.whyCaregiving || '',
    strengths: userProfile?.strengths || '',
    challenges: userProfile?.challenges || '',
    goals: userProfile?.goals || '',
    availability: userProfile?.availability || {
      immediate: false,
      oneWeek: false,
      twoWeeks: false,
      oneMonth: false,
      flexible: false
    },
    additionalInfo: userProfile?.additionalInfo || '',
    consent: userProfile?.consent || {
      backgroundCheck: false,
      referenceCheck: false,
      termsOfService: false,
      privacyPolicy: false
    }
  });
  const [saving, setSaving] = useState(false);

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
    } else if (name.startsWith('consent.')) {
      const consentKey = name.split('.')[1];
      setForm(prev => ({
        ...prev,
        consent: {
          ...prev.consent,
          [consentKey]: checked
        }
      }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;
    
    // Validate required consents
    const requiredConsents = ['backgroundCheck', 'referenceCheck', 'termsOfService', 'privacyPolicy'];
    const missingConsents = requiredConsents.filter(consent => !form.consent[consent]);
    
    if (missingConsents.length > 0) {
      alert('Please agree to all required terms and conditions to continue.');
      return;
    }
    
    setSaving(true);
    try {
      await updateUser(user.uid, { 
        ...form, 
        onboardingStatementComplete: true,
        onboardingComplete: true,
        status: 'pending_approval'
      });
      updateUserProfile({ 
        ...(userProfile || {}), 
        ...form, 
        onboardingStatementComplete: true,
        onboardingComplete: true,
        status: 'pending_approval'
      });
      navigate('/caregiver/dashboard');
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = () => {
    return form.personalStatement.trim().length >= 100 &&
           form.whyCaregiving.trim().length >= 50 &&
           form.strengths.trim().length >= 50 &&
           Object.values(form.consent).every(consent => consent);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Personal Statement</h2>
          <p className="text-gray-600 mt-2">Tell us about yourself and your passion for caregiving</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-8">
          {/* Personal Statement */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Statement</h3>
            <p className="text-sm text-gray-600 mb-4">
              Write a brief personal statement about yourself, your values, and what makes you a great caregiver. 
              This will be visible to potential clients. (Minimum 100 characters)
            </p>
            <textarea
              name="personalStatement"
              value={form.personalStatement}
              onChange={onChange}
              className="form-input"
              rows="6"
              placeholder="I am a compassionate and dedicated caregiver with a passion for helping others maintain their independence and dignity. My approach to caregiving is..."
              required
            />
            <div className="text-right text-sm text-gray-500 mt-2">
              {form.personalStatement.length}/500 characters
            </div>
          </div>

          {/* Why Caregiving */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Why Caregiving?</h3>
            <p className="text-sm text-gray-600 mb-4">
              What draws you to caregiving? What motivates you to help others? (Minimum 50 characters)
            </p>
            <textarea
              name="whyCaregiving"
              value={form.whyCaregiving}
              onChange={onChange}
              className="form-input"
              rows="4"
              placeholder="I chose caregiving because..."
              required
            />
            <div className="text-right text-sm text-gray-500 mt-2">
              {form.whyCaregiving.length}/300 characters
            </div>
          </div>

          {/* Strengths */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Strengths</h3>
            <p className="text-sm text-gray-600 mb-4">
              What are your key strengths as a caregiver? What skills and qualities do you bring to this role? (Minimum 50 characters)
            </p>
            <textarea
              name="strengths"
              value={form.strengths}
              onChange={onChange}
              className="form-input"
              rows="4"
              placeholder="My key strengths include..."
              required
            />
            <div className="text-right text-sm text-gray-500 mt-2">
              {form.strengths.length}/300 characters
            </div>
          </div>

          {/* Challenges */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Challenges & Growth</h3>
            <p className="text-sm text-gray-600 mb-4">
              What challenges have you faced in caregiving, and how have you grown from them? (Optional)
            </p>
            <textarea
              name="challenges"
              value={form.challenges}
              onChange={onChange}
              className="form-input"
              rows="4"
              placeholder="One challenge I've faced is..."
            />
            <div className="text-right text-sm text-gray-500 mt-2">
              {form.challenges.length}/300 characters
            </div>
          </div>

          {/* Goals */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Goals</h3>
            <p className="text-sm text-gray-600 mb-4">
              What are your professional goals in caregiving? How do you see yourself growing in this field? (Optional)
            </p>
            <textarea
              name="goals"
              value={form.goals}
              onChange={onChange}
              className="form-input"
              rows="4"
              placeholder="My professional goals include..."
            />
            <div className="text-right text-sm text-gray-500 mt-2">
              {form.goals.length}/300 characters
            </div>
          </div>

          {/* Availability */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">When can you start?</h3>
            <p className="text-sm text-gray-600 mb-4">Select all that apply:</p>
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
                  <span className="ml-2 text-sm text-gray-700 capitalize">
                    {key === 'immediate' ? 'Immediately' :
                     key === 'oneWeek' ? 'Within 1 week' :
                     key === 'twoWeeks' ? 'Within 2 weeks' :
                     key === 'oneMonth' ? 'Within 1 month' :
                     key === 'flexible' ? 'Flexible' : key}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
            <p className="text-sm text-gray-600 mb-4">
              Is there anything else you'd like to share about yourself or your caregiving approach? (Optional)
            </p>
            <textarea
              name="additionalInfo"
              value={form.additionalInfo}
              onChange={onChange}
              className="form-input"
              rows="4"
              placeholder="Additional information..."
            />
            <div className="text-right text-sm text-gray-500 mt-2">
              {form.additionalInfo.length}/500 characters
            </div>
          </div>

          {/* Consent & Agreements */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Terms & Agreements</h3>
            <div className="space-y-4">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  name="consent.backgroundCheck"
                  checked={form.consent.backgroundCheck}
                  onChange={onChange}
                  className="form-checkbox mt-1"
                  required
                />
                <span className="ml-3 text-sm text-gray-700">
                  I consent to a background check and understand that my application may be rejected based on the results. <span className="text-red-500">*</span>
                </span>
              </label>

              <label className="flex items-start">
                <input
                  type="checkbox"
                  name="consent.referenceCheck"
                  checked={form.consent.referenceCheck}
                  onChange={onChange}
                  className="form-checkbox mt-1"
                  required
                />
                <span className="ml-3 text-sm text-gray-700">
                  I consent to reference checks and understand that ElderX may contact my listed references. <span className="text-red-500">*</span>
                </span>
              </label>

              <label className="flex items-start">
                <input
                  type="checkbox"
                  name="consent.termsOfService"
                  checked={form.consent.termsOfService}
                  onChange={onChange}
                  className="form-checkbox mt-1"
                  required
                />
                <span className="ml-3 text-sm text-gray-700">
                  I agree to the <a href="/terms" className="text-blue-600 hover:text-blue-800 underline">Terms of Service</a> and understand my responsibilities as a caregiver. <span className="text-red-500">*</span>
                </span>
              </label>

              <label className="flex items-start">
                <input
                  type="checkbox"
                  name="consent.privacyPolicy"
                  checked={form.consent.privacyPolicy}
                  onChange={onChange}
                  className="form-checkbox mt-1"
                  required
                />
                <span className="ml-3 text-sm text-gray-700">
                  I agree to the <a href="/privacy" className="text-blue-600 hover:text-blue-800 underline">Privacy Policy</a> and understand how my information will be used. <span className="text-red-500">*</span>
                </span>
              </label>
            </div>
          </div>

          {/* Application Summary */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-3">Application Summary</h3>
            <div className="text-sm text-green-800 space-y-2">
              <p>• Your application will be reviewed by our team within 2-3 business days</p>
              <p>• We may contact you for additional information or clarification</p>
              <p>• Once approved, you'll receive access to your caregiver dashboard</p>
              <p>• You can update your profile and availability at any time</p>
              <p>• We'll notify you when potential clients are interested in your services</p>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => navigate('/caregiver/onboarding/documents')}
              className="btn btn-outline"
            >
              Back
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={saving || !isFormValid()}
            >
              {saving ? 'Submitting Application...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CaregiverOnboardingStatement;
