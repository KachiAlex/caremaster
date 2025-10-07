import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  Building2, 
  Users, 
  Shield, 
  CheckCircle, 
  ArrowRight,
  Loader,
  AlertCircle
} from 'lucide-react';

const InstitutionLanding = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const institutionId = searchParams.get('institution');
  
  const [loading, setLoading] = useState(true);
  const [institution, setInstitution] = useState(null);
  const [license, setLicense] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadInstitutionData = async () => {
      if (!institutionId) {
        setError('No institution ID provided');
        setLoading(false);
        return;
      }

      try {
        // Fetch institution data
        const institutionDoc = await getDoc(doc(db, 'institutions', institutionId));
        
        if (!institutionDoc.exists()) {
          setError('Institution not found');
          setLoading(false);
          return;
        }

        const institutionData = institutionDoc.data();
        setInstitution({ id: institutionDoc.id, ...institutionData });

        // Fetch license data
        const licensesSnapshot = await getDoc(doc(db, 'licenses', institutionId));
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

    loadInstitutionData();
  }, [institutionId]);

  const handleGetStarted = () => {
    navigate(`/institution/login?institution=${institutionId}`);
  };

  const handleSignIn = () => {
    navigate(`/institution/login?institution=${institutionId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading institution...</p>
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
          <p className="text-gray-600 mb-6">{error || 'Institution not found'}</p>
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

  const features = [
    {
      icon: Users,
      title: 'Staff Management',
      description: 'Manage doctors, nurses, and caregivers efficiently'
    },
    {
      icon: Shield,
      title: 'Secure & Compliant',
      description: 'HIPAA-compliant healthcare data management'
    },
    {
      icon: CheckCircle,
      title: 'Real-time Updates',
      description: 'Track patient care and staff activities in real-time'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{institution.name}</h1>
                {institution.slug && (
                  <p className="text-sm text-gray-500">{institution.slug}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleSignIn}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Hero Content */}
          <div>
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-6">
              <Shield className="h-4 w-4 mr-2" />
              Licensed Healthcare Platform
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Welcome to Your Healthcare Management Portal
            </h2>
            
            <p className="text-xl text-gray-600 mb-8">
              Streamline your institution's operations with our comprehensive platform for 
              managing staff, patients, and care delivery.
            </p>

            <div className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <feature.icon className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleGetStarted}
              className="inline-flex items-center px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold text-lg"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </div>

          {/* Right Column - Info Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Institution Details</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Institution</span>
                <span className="font-semibold text-gray-900">{institution.name}</span>
              </div>

              {institution.domain && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Domain</span>
                  <span className="font-semibold text-gray-900">{institution.domain}</span>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Status</span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  institution.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {institution.active ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Active
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Inactive
                    </>
                  )}
                </span>
              </div>

              {license && (
                <>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Plan</span>
                    <span className="font-semibold text-gray-900 capitalize">{license.plan}</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">User Seats</span>
                    <span className="font-semibold text-gray-900">{license.seats}</span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>New to the platform?</strong> Click "Get Started" to create your account 
                and access your institution's dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Section */}
        <div className="mt-16 pt-8 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">24/7</div>
              <p className="text-gray-600">Support Available</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">100%</div>
              <p className="text-gray-600">Data Security</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">HIPAA</div>
              <p className="text-gray-600">Compliant Platform</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstitutionLanding;

