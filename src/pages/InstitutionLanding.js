import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'backend/database';
import { auth, db } from '../backend/config';
import { useUser } from '../contexts/UserContext';
import { onAuthStateChanged } from 'backend/auth';
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
  ExternalLink,
  Heart
} from 'lucide-react';

const InstitutionLanding = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { userProfile } = useUser();
  const institutionId = searchParams.get('institution');
  const effectiveInstitutionId = institutionId || userProfile?.institutionId;

  const [loading, setLoading] = useState(true);
  const [institution, setInstitution] = useState(null);
  const [license, setLicense] = useState(null);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check authentication status - but don't interfere with portal selection
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadInstitutionData = async () => {
      if (!effectiveInstitutionId) {
        setError('No institution ID provided');
        setLoading(false);
        return;
      }

      try {
        const institutionDoc = await getDoc(doc(db, 'institutions', effectiveInstitutionId));

        if (!institutionDoc.exists()) {
          setError('Institution not found');
          setLoading(false);
          return;
        }

        const institutionData = institutionDoc.data();
        setInstitution({ id: institutionDoc.id, ...institutionData });

        const licensesSnapshot = await getDoc(doc(db, 'licenses', effectiveInstitutionId));
        if (licensesSnapshot.exists()) {
          setLicense(licensesSnapshot.data());
        }

        setLoading(false);
      } catch (error) {
        setError('Failed to load institution data');
        setLoading(false);
      }
    };

    loadInstitutionData();
  }, [effectiveInstitutionId]);

  const handleRoleSelect = (role) => {
    navigate(`/institution/login?institution=${effectiveInstitutionId}&role=${role}`);
  };

  const getPortalUrl = (role) => {
    return `${window.location.origin}/institution/login?institution=${effectiveInstitutionId}&role=${role}`;
  };

  const copyPortalLink = (role, title) => {
    const url = getPortalUrl(role);
    navigator.clipboard.writeText(url);
    toast.success(`${title} link copied to clipboard!`);
  };

  if (checkingAuth || loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 text-gold animate-spin mx-auto mb-4" />
          <p className="text-ink/70">{checkingAuth ? 'Checking authentication...' : 'Loading institution...'}</p>
        </div>
      </div>
    );
  }

  if (error || !institution) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-ink/8 shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-coral mx-auto mb-4" />
          <h2 className="cm-display text-2xl text-ink mb-2">Access Error</h2>
          <p className="text-ink/70 mb-6">{error || 'Institution not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-ink text-sand rounded-xl hover:bg-ink-soft transition"
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
      title: 'Admin Portal',
      description: 'Full management access',
      role: 'admin',
      color: 'from-ink to-ink-soft',
      hoverColor: 'hover:from-ink-soft hover:to-ink'
    },
    {
      icon: Users,
      title: 'Caregiver Portal',
      description: 'For Doctors, Nurses & Caregivers',
      role: 'caregiver',
      color: 'from-sage to-sage-soft',
      hoverColor: 'hover:from-sage-soft hover:to-sage'
    },
    {
      icon: Activity,
      title: 'Pharmacist Portal',
      description: 'Pharmacy management access',
      role: 'pharmacist',
      color: 'from-coral to-coral-soft',
      hoverColor: 'hover:from-coral-soft hover:to-coral'
    }
  ];

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-white/80 border-b border-ink/8 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <a
              href="/"
              className="flex items-center text-ink/70 hover:text-gold-deep transition-colors group"
            >
              <Heart className="h-6 w-6 mr-2 group-hover:scale-110 transition-transform" />
              <span className="font-semibold hidden sm:inline">CareMaster Home</span>
            </a>

            <div className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-gold-deep" />
              <div className="text-center">
                <h1 className="cm-display text-2xl text-ink">{institution.name}</h1>
                {institution.slug && (
                  <p className="text-sm text-ink/50">{institution.slug}</p>
                )}
              </div>
            </div>

            <div className="w-24 sm:w-32"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-sage-soft rounded-full text-sm font-medium mb-6 shadow-sm">
            <Shield className="h-4 w-4 mr-2 text-sage" />
            <span className="text-sage font-semibold">Licensed & Active</span>
          </div>

          <h1 className="cm-display text-5xl md:text-6xl text-ink mb-4">
            {institution.name}
          </h1>

          <p className="text-xl text-ink/70 max-w-2xl mx-auto mb-8">
            Healthcare Management Portal
          </p>

          {license && (
            <div className="inline-flex items-center space-x-6 text-sm text-ink/70">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-1 text-sage" />
                <span className="capitalize">{license.plan} Plan</span>
              </div>
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1 text-gold-deep" />
                <span>{license.seats} User Seats</span>
              </div>
            </div>
          )}
        </div>

        {/* Access Roles Section */}
        <div className="max-w-5xl mx-auto">
          <h2 className="cm-display text-3xl text-ink text-center mb-12">
            Select Your Access Portal
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {accessRoles.map((role, index) => {
              const Icon = role.icon;
              return (
                <div key={index} className="space-y-3">
                  <a
                    href={getPortalUrl(role.role)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group relative bg-gradient-to-br ${role.color} ${role.hoverColor} text-white rounded-2xl p-10 shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 block`}
                  >
                    <div className="flex flex-col items-center text-center space-y-6">
                      <div className="h-20 w-20 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-all">
                        <Icon className="h-10 w-10" />
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-2">
                          <h3 className="font-bold text-xl">{role.title}</h3>
                          <ExternalLink className="h-4 w-4" />
                        </div>
                        <p className="text-sm text-white/90 leading-relaxed mt-2">{role.description}</p>
                      </div>
                      <ArrowRight className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </a>

                  <div className="bg-white/80 rounded-xl p-3 shadow-sm border border-ink/8">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 overflow-hidden">
                        <p className="text-xs text-ink/50 mb-1">Direct Link:</p>
                        <p className="text-xs font-mono text-ink/80 truncate">
                          {getPortalUrl(role.role)}
                        </p>
                      </div>
                      <button
                        onClick={() => copyPortalLink(role.role, role.title)}
                        className="flex-shrink-0 p-2 hover:bg-sage-soft rounded-lg transition-colors"
                        title="Copy link"
                      >
                        <Copy className="h-4 w-4 text-ink/70" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <div className="bg-sage-soft/40 border border-sage/20 rounded-2xl p-6 max-w-2xl mx-auto">
              <h3 className="cm-display text-lg text-ink mb-2">How to Access Your Portal</h3>
              <ol className="text-sm text-ink/70 text-left space-y-2">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-gold-deep">1.</span>
                  <span>Click on your portal box above (opens in new tab)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-gold-deep">2.</span>
                  <span>Or copy the direct link using the <Copy className="h-3 w-3 inline" /> button</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-gold-deep">3.</span>
                  <span>Share the link with your team members</span>
                </li>
              </ol>
            </div>

            <p className="text-ink/60 mt-6">
              Don't have an account? Contact your institution administrator to get access credentials.
            </p>
          </div>
        </div>

        {/* Features/Info Section */}
        <div className="mt-20 bg-white/80 border border-ink/8 rounded-2xl shadow-xl p-8 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-12 w-12 bg-sage-soft rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-sage" />
              </div>
              <h3 className="cm-display text-lg text-ink mb-2">Secure & Compliant</h3>
              <p className="text-sm text-ink/70">HIPAA-compliant healthcare data management</p>
            </div>

            <div className="text-center">
              <div className="h-12 w-12 bg-sage-soft rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-sage" />
              </div>
              <h3 className="cm-display text-lg text-ink mb-2">Staff Management</h3>
              <p className="text-sm text-ink/70">Manage doctors, nurses, and caregivers efficiently</p>
            </div>

            <div className="text-center">
              <div className="h-12 w-12 bg-coral-soft rounded-xl flex items-center justify-center mx-auto mb-4">
                <Activity className="h-6 w-6 text-coral" />
              </div>
              <h3 className="cm-display text-lg text-ink mb-2">Real-time Updates</h3>
              <p className="text-sm text-ink/70">Track client care and staff activities in real-time</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstitutionLanding;
