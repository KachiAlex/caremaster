import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, CheckCircle, FileText, Shield, Mail, RefreshCw, LogOut } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

const InstitutionCaregiverPendingApproval = () => {
  const [searchParams] = useSearchParams();
  const { user, userProfile } = useUser();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [institutionName, setInstitutionName] = useState('');

  const urlInstitutionId = searchParams.get('institution');
  const effectiveInstitutionId = urlInstitutionId || userProfile?.institutionId;

  useEffect(() => {
    // Fetch institution name
    const fetchInstitutionName = async () => {
      if (effectiveInstitutionId) {
        try {
          const instDoc = await getDoc(doc(db, 'institutions', effectiveInstitutionId));
          if (instDoc.exists()) {
            setInstitutionName(instDoc.data().name || 'Your Institution');
          }
        } catch (error) {
          console.error('Error fetching institution:', error);
        }
      }
    };
    fetchInstitutionName();
  }, [effectiveInstitutionId]);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      // Refresh user profile from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        if (userData.status === 'active') {
          toast.success('Your account has been approved! Redirecting to dashboard...');
          setTimeout(() => {
            navigate(`/institution-caregiver/dashboard?institution=${effectiveInstitutionId}`);
          }, 1500);
        } else {
          toast.info('Your account is still pending approval. Please wait for admin verification.');
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
      toast.error('Failed to check approval status');
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/institution/login');
      toast.info('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-600 p-8 text-white text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-white/20 p-4 rounded-full">
                <Clock className="h-12 w-12" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">Onboarding Complete!</h1>
            <p className="text-blue-100">Awaiting Admin Verification</p>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="mb-8">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Shield className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Account Under Review</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>Your onboarding is complete, and your account is currently being reviewed by the {institutionName || 'institution'} administrator.</p>
                    </div>
                  </div>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-gray-900 mb-4">What happens next?</h2>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900">Step 1: Document Verification</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      The admin is reviewing your submitted documents including your medical license and certifications.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900">Step 2: Profile Review</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Your professional qualifications and experience are being verified against institutional standards.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900">Step 3: Approval Notification</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      You'll receive an email notification once your account is approved and you can access the dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Expected Timeline</h3>
              <p className="text-sm text-blue-700">
                Most applications are reviewed within 24-48 hours. You'll receive an email at <span className="font-medium">{user?.email}</span> once your account is approved.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleCheckStatus}
                disabled={checking}
                className="flex-1 flex items-center justify-center px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-5 w-5 mr-2 ${checking ? 'animate-spin' : ''}`} />
                {checking ? 'Checking...' : 'Check Approval Status'}
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Logout
              </button>
            </div>

            {/* Contact Support */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Questions? Contact your institution administrator at{' '}
                <a href={`mailto:support@${institutionName.toLowerCase().replace(/\s+/g, '')}.com`} className="text-blue-600 hover:underline">
                  support email
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstitutionCaregiverPendingApproval;

