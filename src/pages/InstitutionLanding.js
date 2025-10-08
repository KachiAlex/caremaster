import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { toast } from 'react-toastify';
import { 
  Building2, 
  Users, 
  Shield, 
  CheckCircle, 
  ArrowRight,
  Loader,
  AlertCircle,
  Activity
} from 'lucide-react';

const InstitutionLanding = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const institutionId = searchParams.get('institution');
  
  const [loading, setLoading] = useState(true);
  const [institution, setInstitution] = useState(null);
  const [license, setLicense] = useState(null);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check authentication status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setCheckingAuth(false);
      
      // If not logged in, redirect to institution login
      if (!currentUser && institutionId) {
        navigate(`/institution/login?institution=${institutionId}&returnTo=/onboard`);
      }
    });

    return () => unsubscribe();
  }, [institutionId, navigate]);

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

  const handleRoleSelect = async (role) => {
    // If user is already logged in, navigate directly to their dashboard
    if (user) {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userRole = userData.type || userData.userType;
          
          // Navigate based on role
          if (role === 'admin' && (userRole === 'admin' || userData.institutionAdmin)) {
            navigate('/institution-admin/dashboard');
          } else if (role === 'doctor' && userRole === 'doctor') {
            navigate('/service-provider');
          } else if (role === 'nurse' && userRole === 'nurse') {
            navigate('/service-provider');
          } else if (role === 'caregiver' && userRole === 'caregiver') {
            navigate('/service-provider');
          } else {
            // User clicked wrong role, ask them to login with correct role
            toast.error(`You are logged in as ${userRole}, not ${role}. Please logout and login with the correct role.`);
          }
          return;
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      }
    }
    
    // Not logged in or error - go to login
    navigate(`/institution/login?institution=${institutionId}&role=${role}`);
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

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null;
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

  const accessRoles = [
    {
      icon: Shield,
      title: 'Institution Admin',
      description: 'Full management access',
      role: 'admin',
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700'
    },
    {
      icon: Users,
      title: 'Doctor',
      description: 'Medical staff access',
      role: 'doctor',
      color: 'from-purple-500 to-purple-600',
      hoverColor: 'hover:from-purple-600 hover:to-purple-700'
    },
    {
      icon: Users,
      title: 'Nurse',
      description: 'Nursing staff access',
      role: 'nurse',
      color: 'from-green-500 to-green-600',
      hoverColor: 'hover:from-green-600 hover:to-green-700'
    },
    {
      icon: Users,
      title: 'Caregiver',
      description: 'Care provider access',
      role: 'caregiver',
      color: 'from-orange-500 to-orange-600',
      hoverColor: 'hover:from-orange-600 hover:to-orange-700'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">{institution.name}</h1>
                {institution.slug && (
                  <p className="text-sm text-gray-500">{institution.slug}</p>
                )}
              </div>
            </div>
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
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Select Your Access Level
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {accessRoles.map((role, index) => (
              <button
                key={index}
                onClick={() => handleRoleSelect(role.role)}
                className={`group relative bg-gradient-to-br ${role.color} ${role.hoverColor} text-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200`}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="h-16 w-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center group-hover:bg-opacity-30 transition-all">
                    <role.icon className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">{role.title}</h3>
                    <p className="text-sm text-white text-opacity-90">{role.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">
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
              <p className="text-sm text-gray-600">Track patient care and staff activities in real-time</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstitutionLanding;

