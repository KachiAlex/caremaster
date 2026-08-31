import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { validateLicenseKey, activateLicense, fetchLicenseStatus } from '../services/licenseService';
import { toast } from 'react-toastify';
import { 
  Shield, 
  Key, 
  AlertTriangle, 
  CheckCircle,
  Loader,
  Heart,
  Mail,
  Phone,
  ArrowLeft
} from 'lucide-react';
import { getDoc, doc } from 'backend/database';
import { db } from '../backend/config';

const LicenseRequired = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const institutionId = searchParams.get('institution');
  const reason = searchParams.get('reason') || 'no_license';
  
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [institution, setInstitution] = useState(null);
  const [loadingInstitution, setLoadingInstitution] = useState(true);

  useEffect(() => {
    if (!institutionId) {
      setLoadingInstitution(false);
      return;
    }

    const loadInstitution = async () => {
      try {
        const institutionDoc = await getDoc(doc(db, 'institutions', institutionId));
        if (institutionDoc.exists()) {
          setInstitution({ id: institutionDoc.id, ...institutionDoc.data() });
        }
      } catch (error) {
        console.error('Error loading institution:', error);
      } finally {
        setLoadingInstitution(false);
      }
    };

    loadInstitution();
  }, [institutionId]);

  const handleActivateLicense = async (e) => {
    e.preventDefault();
    
    if (!licenseKey.trim()) {
      toast.error('Please enter a license key');
      return;
    }

    // Validate license key format
    const validation = validateLicenseKey(licenseKey.trim().toUpperCase());
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setLoading(true);

    try {
      // Activate license using license key
      const result = await activateLicense(licenseKey.trim().toUpperCase(), institutionId);
      
      if (!result.success) {
        toast.error(result.error || 'Failed to activate license. Please check your license key.');
        setLoading(false);
        return;
      }

      // Re-check license status to verify activation
      console.log('🔄 Re-checking license status after activation...');
      const licenseStatus = await fetchLicenseStatus(institutionId);
      
      if (!licenseStatus.active) {
        // License still not active
        toast.error(`License activation failed: ${licenseStatus.reason}. Please contact support.`);
        setLoading(false);
        return;
      }

      // License is now active!
      toast.success('✅ License activated successfully! Redirecting to dashboard...', {
        autoClose: 4000
      });
      
      // Redirect back to dashboard with a slight delay for the toast
      setTimeout(() => {
        window.location.href = institutionId ? 
          `/institution-admin/dashboard?institution=${institutionId}` : 
          '/institution-admin/dashboard';
      }, 2000);

    } catch (error) {
      console.error('Error activating license:', error);
      toast.error('Failed to activate license. Please check your license key or contact support.');
      setLoading(false);
    }
  };

  if (loadingInstitution) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Back to Home */}
        <div className="mb-6">
          <a 
            href="/" 
            className="inline-flex items-center text-gray-600 hover:text-blue-600 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Home</span>
          </a>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 p-8 text-white text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mb-4">
              <Shield className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-bold mb-2">License Activation Required</h1>
            <p className="text-orange-100">
              {institution ? `${institution.name} needs` : 'Your institution needs'} an active license to access Care Master
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Alert Box */}
            <div className={`border-l-4 p-4 mb-6 ${
              reason === 'license_expired' ? 'bg-red-50 border-red-500' :
              reason === 'license_suspended' ? 'bg-yellow-50 border-yellow-500' :
              'bg-orange-50 border-orange-500'
            }`}>
              <div className="flex items-start">
                <AlertTriangle className={`h-6 w-6 mr-3 flex-shrink-0 mt-0.5 ${
                  reason === 'license_expired' ? 'text-red-500' :
                  reason === 'license_suspended' ? 'text-yellow-500' :
                  'text-orange-500'
                }`} />
                <div>
                  <h3 className={`font-bold mb-1 ${
                    reason === 'license_expired' ? 'text-red-900' :
                    reason === 'license_suspended' ? 'text-yellow-900' :
                    'text-orange-900'
                  }`}>
                    {reason === 'license_expired' ? 'License Expired' :
                     reason === 'license_suspended' ? 'License Suspended' :
                     'Access Restricted'}
                  </h3>
                  <p className={`text-sm ${
                    reason === 'license_expired' ? 'text-red-800' :
                    reason === 'license_suspended' ? 'text-yellow-800' :
                    'text-orange-800'
                  }`}>
                    {reason === 'license_expired' ? 
                      'Your institution license has expired. Please renew your license or enter a new license key to restore access.' :
                     reason === 'license_suspended' ? 
                      'Your institution license has been suspended. Please enter a valid license key to reactivate access or contact support.' :
                     reason === 'no_license' ?
                      'Your institution does not have an active license. Please enter your license key below to activate access.' :
                      'Unable to verify your license status. Please enter your license key or contact support.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Institution Info */}
            {institution && (
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-1">Institution</p>
                <p className="text-lg font-bold text-gray-900">{institution.name}</p>
                {institution.slug && (
                  <p className="text-sm text-gray-500">{institution.slug}</p>
                )}
              </div>
            )}

            {/* License Activation Form */}
            <form onSubmit={handleActivateLicense} className="space-y-6">
              <div>
                <label htmlFor="licenseKey" className="block text-sm font-medium text-gray-700 mb-2">
                  <Key className="inline h-4 w-4 mr-1" />
                  License Key
                </label>
                <input
                  id="licenseKey"
                  type="text"
                  required
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-lg tracking-wider"
                  placeholder="LIC-XXXX-XXXX-XXXX-XXXX"
                  maxLength="24"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Enter the 20-character license key provided by Care Master
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader className="h-5 w-5 mr-2 animate-spin" />
                    Activating License...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Activate License
                  </>
                )}
              </button>
            </form>

            {/* Help Section */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4">Need Help?</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <Key className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Don't have a license key?</p>
                    <p className="text-sm text-gray-600">Contact our sales team to purchase a license for your institution.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Mail className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Email Support</p>
                    <a href="mailto:licensing@caremaster.com" className="text-sm text-blue-600 hover:text-blue-700">
                      licensing@caremaster.com
                    </a>
                  </div>
                </div>
                <div className="flex items-start">
                  <Phone className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Call Us</p>
                    <a href="tel:+2348000000000" className="text-sm text-blue-600 hover:text-blue-700">
                      +234 800 000 0000
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Trial Information */}
            <div className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
              <h4 className="font-bold text-gray-900 mb-2 flex items-center">
                <Heart className="h-5 w-5 text-green-600 mr-2" />
                New to Care Master?
              </h4>
              <p className="text-sm text-gray-700 mb-4">
                Start with a free 30-day trial to explore all features before purchasing a license.
              </p>
              <a
                href="/"
                className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold text-sm"
              >
                Learn More & Schedule Demo
                <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LicenseRequired;

