import React, { useState, useCallback } from 'react';
import { AlertTriangle, X, Phone, MapPin, Send, Loader } from 'lucide-react';
import { toast } from 'react-toastify';
import { emergencyAPI } from '../api/emergencyAPI';
import { useUser } from '../contexts/UserContext';

const EMERGENCY_TYPES = [
  { value: 'medical', label: 'Medical Emergency' },
  { value: 'fall', label: 'Fall Incident' },
  { value: 'cardiac', label: 'Cardiac Emergency' },
  { value: 'respiratory', label: 'Respiratory Distress' },
  { value: 'medication', label: 'Medication Error' },
  { value: 'behavioral', label: 'Behavioral Emergency' },
  { value: 'environmental', label: 'Environmental Hazard' },
  { value: 'other', label: 'Other Emergency' },
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

/**
 * Reusable Emergency Button for all dashboards.
 *
 * Renders a compact red SOS button suitable for placement in any dashboard
 * header. When clicked, opens a modal to collect emergency details and
 * dispatches an alert via emergencyAPI.
 *
 * Props:
 *   institutionId  – optional override (defaults to UserContext.institutionId)
 *   clientId       – optional client ID the emergency is about
 *   clientName     – optional client name
 *   variant        – "header" (compact, for header bars) | "floating" (FAB)
 */
const EmergencyButton = ({
  institutionId: propInstitutionId,
  clientId,
  clientName,
  variant = 'header',
}) => {
  const { user, userProfile, institutionId: ctxInstitutionId } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    emergencyType: 'medical',
    severity: 'critical',
    description: '',
    location: '',
    contactNumber: '',
  });

  const institutionId = propInstitutionId || ctxInstitutionId || userProfile?.institutionId;

  const handleChange = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    if (!form.description.trim()) {
      toast.error('Please describe the emergency.');
      return;
    }

    setLoading(true);
    try {
      const triggeredBy = user?.uid || user?.id || userProfile?.uid || userProfile?.id;
      const triggeredByName =
        userProfile?.displayName ||
        userProfile?.name ||
        `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() ||
        userProfile?.email ||
        'Unknown User';

      const emergencyData = {
        clientId: clientId || null,
        clientName: clientName || null,
        triggeredBy,
        institutionId: institutionId || null,
        // The backend emergency_alerts table only accepts specific columns.
        // Pack the extra context into metadata (jsonb) so it survives the
        // writable-field filter and is available for notification dispatch.
        type: form.emergencyType,
        severity: form.severity,
        description: form.description.trim(),
        location: form.location.trim() || 'Not specified',
        metadata: {
          emergencyType: form.emergencyType,
          triggeredByName,
          userRole: userProfile?.userType || userProfile?.type || userProfile?.role || null,
          contactNumber: form.contactNumber.trim() || userProfile?.phone || '',
          clientName: clientName || null,
          description: form.description.trim(),
          location: form.location.trim() || 'Not specified',
        },
        triggeredAt: new Date().toISOString(),
      };

      const result = await emergencyAPI.createEmergency(emergencyData);

      // Best-effort notification dispatch (non-blocking)
      try {
        await emergencyAPI.sendEmergencyNotification(result.id, {
          recipients: ['admin', 'doctors', 'emergency_services'],
          message: `Emergency Alert: ${form.emergencyType} — ${form.description.slice(0, 80)}`,
          priority: 'high',
        });
      } catch {
        /* notification failure is non-fatal */
      }

      toast.success('Emergency alert sent. Help is on the way.');
      setShowModal(false);
      setForm({
        emergencyType: 'medical',
        severity: 'critical',
        description: '',
        location: '',
        contactNumber: '',
      });
    } catch (error) {
      console.error('Error triggering emergency alert:', error);
      toast.error('Failed to send emergency alert. Please call your emergency number directly.');
    } finally {
      setLoading(false);
    }
  }, [form, user, userProfile, institutionId, clientId, clientName]);

  const buttonClasses =
    variant === 'floating'
      ? 'fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-full bg-red-600 text-white shadow-xl hover:bg-red-700 transition-all duration-200 animate-pulse'
      : 'flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 text-white text-sm font-semibold shadow-sm hover:bg-red-700 transition-colors flex-shrink-0';

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={buttonClasses}
        aria-label="Trigger emergency alert"
        title="Emergency Alert"
      >
        <AlertTriangle className={variant === 'floating' ? 'h-5 w-5' : 'h-4 w-4'} />
        <span>SOS</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-red-100 bg-red-50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-red-700">Emergency Alert</h2>
                  <p className="text-xs text-red-600">This will notify your care team immediately</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-red-100 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-red-600" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Emergency Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Type
                </label>
                <select
                  value={form.emergencyType}
                  onChange={(e) => handleChange('emergencyType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
                >
                  {EMERGENCY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity
                </label>
                <div className="flex gap-2">
                  {SEVERITY_LEVELS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => handleChange('severity', s.value)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        form.severity === s.value
                          ? s.value === 'critical'
                            ? 'bg-red-600 text-white'
                            : s.value === 'high'
                            ? 'bg-orange-500 text-white'
                            : s.value === 'medium'
                            ? 'bg-yellow-500 text-white'
                            : 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Describe the Emergency <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                  required
                  placeholder="What is happening? Be as specific as possible."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm resize-none"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    placeholder="Where is the emergency?"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Contact Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    value={form.contactNumber}
                    onChange={(e) => handleChange('contactNumber', e.target.value)}
                    placeholder="Phone number to reach you"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Alert
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default EmergencyButton;
