import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc } from '../services/databaseCompat';
import { useUser } from '../contexts/UserContext';
import { toast } from 'react-toastify';
import { 
  Building2, 
  Users, 
  Shield, 
  CheckCircle, 
  ArrowRight,
  Loader,
  AlertCircle,
  Activity,
  Copy,
  ExternalLink
} from 'lucide-react';
import { getDoc, doc } from 'backend/database';
import { onAuthStateChanged } from 'backend/auth';
import { db, auth } from '../backend/config';

const PartnerLanding = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { userProfile } = useUser();
  const institutionId = searchParams.get('institution');
  const effectivePartnerId = institutionId || userProfile?.institutionId;
  
  const [loading, setLoading] = useState(true);
  const [institution, setPartner] = useState(null);
  const [license, setLicense] = useState(null);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check authentication status - but don't interfere with portal selection
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setCheckingAuth(false);
      
      // Don't do anything with the auth state here
      // Users can access this page regardless of login status
      // Portal selection will handle appropriate routing
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadPartnerData = async () => {
      if (!effectivePartnerId) {
        setError('No institution ID provided');
        setLoading(false);
        return;
      }

      try {
        // Fetch institution data
        const institutionDoc = await getDoc(doc(db, 'institutions', effectivePartnerId));
        
        if (!institutionDoc.exists()) {
          setError('Partner not found');
          setLoading(false);
          return;
        }

        const institutionData = institutionDoc.data();
        setPartner({ id: institutionDoc.id, ...institutionData });

        // Fetch license data
        const licensesSnapshot = await getDoc(doc(db, 'licenses', effectivePartnerId));
        if (licensesSnapshot.exists()) {
          setLicense(licensesSnapshot.data());
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading institution:', error);
        setError('Failed to load institution data');
        setLoading(false);
      }
    };

    loadPartnerData();
  }, [effectivePartnerId]);

  const handleRoleSelect = (role) => {
    console.log('🔷 Portal selected:', role, '| Partner:', effectivePartnerId);
    
    // Simply navigate to the login page with the role parameter
    // The PartnerLogin component will handle authentication and routing
    navigate(`/login?institution=${effectivePartnerId}&role=${role}`);
  };


  if (checkingAuth || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{checkingAuth ? 'Checking authentication...' : 'Loading institution...'}</p>
        </div>
      </div>
    );
  }

  if (error || !institution) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Error</h2>
          <p className="text-gray-600 mb-6">{error || 'Partner not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  const getPortalUrl = (role) => {
    return `${window.location.origin}/login?institution=${effectivePartnerId}&role=${role}`;
  };

  const copyPortalLink = (role, title) => {
    const url = getPortalUrl(role);
    navigator.clipboard.writeText(url);
    toast.success(`${title} link copied to clipboard!`);
  };

  const accessRoles = [
    {
      icon: Shield,
      title: 'Admin Portal',
      description: 'Full management access',
      role: 'admin',
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700'
    },
    {
      icon: Users,
      title: 'Caregiver Portal',
      description: 'For Doctors, Nurses & Caregivers',
      role: 'caregiver',
      color: 'from-green-500 to-green-600',
      hoverColor: 'hover:from-green-600 hover:to-green-700'
    },
    {
      icon: Activity,
      title: 'Pharmacist Portal',
      description: 'Pharmacy management access',
      role: 'pharmacist',
      color: 'from-purple-500 to-purple-600',
      hoverColor: 'hover:from-purple-600 hover:to-purple-700'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Back to Home Button */}
            <a 
              href="/" 
              className="flex items-center text-gray-600 hover:text-blue-600 transition-colors group"
            >
              <img src="/images/caremaster-logo.jpg" alt="Caremaster" className="h-8 mr-2" />
              <span className="font-semibold hidden sm:inline">Home</span>
            </a>

            {/* Partner Info */}
            <div className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">{institution.name}</h1>
                {institution.slug && (
                  <p className="text-sm text-gray-500">{institution.slug}</p>
                )}
              </div>
            </div>

            {/* Spacer for balance */}
            <div className="w-24 sm:w-32"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-white rounded-full text-sm font-medium mb-6 shadow-sm">
            <Shield className="h-4 w-4 mr-2 text-green-600" />
            <span className="text-green-600 font-semibold">Licensed & Active</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
            {institution.name}
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Healthcare Management Portal
          </p>

          {license && (
            <div className="inline-flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                <span className="capitalize">{license.plan} Plan</span>
              </div>
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1 text-blue-600" />
                <span>{license.seats} User Seats</span>
              </div>
            </div>
          )}
        </div>

        {/* Access Roles Section */}
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Select Your Access Portal
          </h2>
          
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {accessRoles.map((role, index) => (
                <div key={index} className="space-y-3">
                  {/* Portal Box - Opens in New Tab */}
                  <a
                    href={getPortalUrl(role.role)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group relative bg-gradient-to-br ${role.color} ${role.hoverColor} text-white rounded-2xl p-10 shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 block`}
                  >
                    <div className="flex flex-col items-center text-center space-y-6">
                      <div className="h-20 w-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center group-hover:bg-opacity-30 transition-all">
                        <role.icon className="h-10 w-10" />
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-2">
                          <h3 className="font-bold text-xl">{role.title}</h3>
                          <ExternalLink className="h-4 w-4" />
                        </div>
                        <p className="text-sm text-white text-opacity-90 leading-relaxed mt-2">{role.description}</p>
                      </div>
                      <ArrowRight className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </a>
                  
                  {/* Copyable Link */}
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 overflow-hidden">
                        <p className="text-xs text-gray-500 mb-1">Direct Link:</p>
                        <p className="text-xs font-mono text-gray-700 truncate">
                          {getPortalUrl(role.role)}
                        </p>
                      </div>
                      <button
                        onClick={() => copyPortalLink(role.role, role.title)}
                        className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Copy link"
                      >
                        <Copy className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 text-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto">
              <h3 className="font-semibold text-blue-900 mb-2">How to Access Your Portal</h3>
              <ol className="text-sm text-blue-800 text-left space-y-2">
                <li className="flex items-start gap-2">
                  <span className="font-bold">1.</span>
                  <span>Click on your portal box above (opens in new tab)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">2.</span>
                  <span>Or copy the direct link using the <Copy className="h-3 w-3 inline" /> button</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">3.</span>
                  <span>Share the link with your team members</span>
                </li>
              </ol>
            </div>
            
            <p className="text-gray-600 mt-6">
              Don't have an account? Contact your institution administrator to get access credentials.
            </p>
          </div>
        </div>

        {/* Features/Info Section */}
        <div className="mt-20 bg-white rounded-2xl shadow-xl p-8 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Secure & Compliant</h3>
              <p className="text-sm text-gray-600">HIPAA-compliant healthcare data management</p>
            </div>
            
            <div className="text-center">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Staff Management</h3>
              <p className="text-sm text-gray-600">Manage doctors, nurses, and caregivers efficiently</p>
            </div>
            
            <div className="text-center">
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Real-time Updates</h3>
              <p className="text-sm text-gray-600">Track client care and staff activities in real-time</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerLanding;

