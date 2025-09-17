import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { updateUser } from '../api/usersAPI';
import { 
  Shield, 
  AlertTriangle, 
  Heart, 
  Brain, 
  FileText, 
  Award,
  CheckCircle,
  XCircle
} from 'lucide-react';

const CaregiverOnboardingQualifications = () => {
  const navigate = useNavigate();
  const { user, userProfile, updateUserProfile } = useUser();
  const [form, setForm] = useState({
    // Medical Qualifications
    medicalQualification: userProfile?.medicalQualification || '',
    licenseNumber: userProfile?.licenseNumber || '',
    licensingBoard: userProfile?.licensingBoard || '',
    licenseExpiry: userProfile?.licenseExpiry || '',
    
    // Health Screening
    hasDisabilities: userProfile?.hasDisabilities || false,
    disabilityDetails: userProfile?.disabilityDetails || '',
    hasHealthConditions: userProfile?.hasHealthConditions || false,
    healthConditionDetails: userProfile?.healthConditionDetails || '',
    hasMentalHealthHistory: userProfile?.hasMentalHealthHistory || false,
    mentalHealthDetails: userProfile?.mentalHealthDetails || '',
    takingMedications: userProfile?.takingMedications || false,
    medicationDetails: userProfile?.medicationDetails || '',
    hasAllergies: userProfile?.hasAllergies || false,
    allergyDetails: userProfile?.allergyDetails || '',
    
    // Background Checks
    hasConvictions: userProfile?.hasConvictions || false,
    convictionDetails: userProfile?.convictionDetails || '',
    backgroundCheckConsent: userProfile?.backgroundCheckConsent || false,
    drugTestConsent: userProfile?.drugTestConsent || false,
    medicalExamConsent: userProfile?.medicalExamConsent || false
  });
  const [saving, setSaving] = useState(false);

  const medicalQualifications = [
    'Doctor (MD)',
    'Nurse (RN)',
    'Licensed Practical Nurse (LPN)',
    'Physiotherapist',
    'Pharmacist',
    'Lab Technician',
    'Psychologist',
    'Psychiatrist',
    'Certified Nursing Assistant (CNA)',
    'Home Health Aide (HHA)',
    'Personal Care Assistant',
    'Caregiver (Non-Medical)',
    'Other'
  ];

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;

    // Validation
    if (!form.medicalQualification) {
      alert('Please select your medical qualification');
      return;
    }

    if (!form.backgroundCheckConsent || !form.drugTestConsent || !form.medicalExamConsent) {
      alert('Please consent to all required screenings');
      return;
    }

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Medical Qualifications & Health Screening</h2>
          <p className="text-gray-600">Please provide your medical qualifications and complete health screening</p>
        </div>

        <form className="space-y-8" onSubmit={onSubmit}>
          {/* Medical Qualifications Section */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center mb-4">
              <Award className="h-6 w-6 text-blue-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Medical Qualifications</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Medical Qualification *
                </label>
                <select
                  name="medicalQualification"
                  value={form.medicalQualification}
                  onChange={onChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select your qualification</option>
                  {medicalQualifications.map((qual) => (
                    <option key={qual} value={qual}>{qual}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Number
                </label>
                <input
                  name="licenseNumber"
                  value={form.licenseNumber}
                  onChange={onChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Professional license number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Licensing Board/Authority
                </label>
                <input
                  name="licensingBoard"
                  value={form.licensingBoard}
                  onChange={onChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., State Board of Nursing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Expiry Date
                </label>
                <input
                  type="date"
                  name="licenseExpiry"
                  value={form.licenseExpiry}
                  onChange={onChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Health Screening Section */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center mb-4">
              <Heart className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Health Screening</h3>
            </div>

            <div className="space-y-6">
              {/* Disabilities */}
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <input
                    type="checkbox"
                    name="hasDisabilities"
                    checked={form.hasDisabilities}
                    onChange={onChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Do you have any disabilities that may affect your ability to provide care?
                  </label>
                </div>
                {form.hasDisabilities && (
                  <textarea
                    name="disabilityDetails"
                    value={form.disabilityDetails}
                    onChange={onChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-2"
                    placeholder="Please describe your disabilities and any accommodations needed"
                  />
                )}
              </div>

              {/* Health Conditions */}
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <input
                    type="checkbox"
                    name="hasHealthConditions"
                    checked={form.hasHealthConditions}
                    onChange={onChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Do you have any chronic health conditions?
                  </label>
                </div>
                {form.hasHealthConditions && (
                  <textarea
                    name="healthConditionDetails"
                    value={form.healthConditionDetails}
                    onChange={onChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-2"
                    placeholder="Please list any chronic health conditions"
                  />
                )}
              </div>

              {/* Mental Health History */}
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <input
                    type="checkbox"
                    name="hasMentalHealthHistory"
                    checked={form.hasMentalHealthHistory}
                    onChange={onChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Do you have any history of mental health conditions?
                  </label>
                </div>
                {form.hasMentalHealthHistory && (
                  <textarea
                    name="mentalHealthDetails"
                    value={form.mentalHealthDetails}
                    onChange={onChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-2"
                    placeholder="Please provide details (this information is confidential)"
                  />
                )}
              </div>

              {/* Medications */}
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <input
                    type="checkbox"
                    name="takingMedications"
                    checked={form.takingMedications}
                    onChange={onChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Are you currently taking any medications?
                  </label>
                </div>
                {form.takingMedications && (
                  <textarea
                    name="medicationDetails"
                    value={form.medicationDetails}
                    onChange={onChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-2"
                    placeholder="Please list current medications and dosages"
                  />
                )}
              </div>

              {/* Allergies */}
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <input
                    type="checkbox"
                    name="hasAllergies"
                    checked={form.hasAllergies}
                    onChange={onChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Do you have any allergies?
                  </label>
                </div>
                {form.hasAllergies && (
                  <textarea
                    name="allergyDetails"
                    value={form.allergyDetails}
                    onChange={onChange}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-2"
                    placeholder="Please list any allergies (medications, foods, environmental)"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Background Check Section */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center mb-4">
              <Shield className="h-6 w-6 text-green-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Background Screening</h3>
            </div>

            <div className="space-y-6">
              {/* Criminal History */}
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <input
                    type="checkbox"
                    name="hasConvictions"
                    checked={form.hasConvictions}
                    onChange={onChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Have you ever been convicted of a crime?
                  </label>
                </div>
                {form.hasConvictions && (
                  <textarea
                    name="convictionDetails"
                    value={form.convictionDetails}
                    onChange={onChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-2"
                    placeholder="Please provide details of any convictions"
                  />
                )}
              </div>

              {/* Consent Checkboxes */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    name="backgroundCheckConsent"
                    checked={form.backgroundCheckConsent}
                    onChange={onChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-1"
                    required
                  />
                  <label className="text-sm text-gray-700">
                    <span className="font-medium">Background Check Consent *</span><br />
                    I consent to a comprehensive background check including criminal history, employment verification, and reference checks.
                  </label>
                </div>

                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    name="drugTestConsent"
                    checked={form.drugTestConsent}
                    onChange={onChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-1"
                    required
                  />
                  <label className="text-sm text-gray-700">
                    <span className="font-medium">Drug Test Consent *</span><br />
                    I consent to drug and alcohol testing as required for healthcare positions.
                  </label>
                </div>

                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    name="medicalExamConsent"
                    checked={form.medicalExamConsent}
                    onChange={onChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-1"
                    required
                  />
                  <label className="text-sm text-gray-700">
                    <span className="font-medium">Medical Examination Consent *</span><br />
                    I consent to a medical examination to verify my fitness for providing healthcare services.
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start">
              <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3 mt-1" />
              <div>
                <h4 className="font-semibold text-yellow-800 mb-2">Important Notice</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• All information provided will be kept confidential and used only for screening purposes</li>
                  <li>• Providing false information may result in immediate disqualification</li>
                  <li>• Medical and background checks are required for all healthcare positions</li>
                  <li>• You will be notified of the results within 3-5 business days</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => navigate('/caregiver/onboarding/career')}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              type="submit"
              disabled={saving || !form.medicalQualification || !form.backgroundCheckConsent || !form.drugTestConsent || !form.medicalExamConsent}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Continue to References'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CaregiverOnboardingQualifications;