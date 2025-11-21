import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { useUser } from '../contexts/UserContext';
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
  Activity,
  Copy,
  ExternalLink,
  HeartPulse,
  Sparkles,
  ShieldCheck
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
      
      // Don't do anything with the auth state here
      // Users can access this page regardless of login status
      // Portal selection will handle appropriate routing
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
        // Fetch institution data
        const institutionDoc = await getDoc(doc(db, 'institutions', effectiveInstitutionId));
        
        if (!institutionDoc.exists()) {
          setError('Institution not found');
          setLoading(false);
          return;
        }

        const institutionData = institutionDoc.data();
        setInstitution({ id: institutionDoc.id, ...institutionData });

        // Fetch license data
        const licensesSnapshot = await getDoc(doc(db, 'licenses', effectiveInstitutionId));
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
  }, [effectiveInstitutionId]);

  const handleRoleSelect = (role) => {
    console.log('🔷 Portal selected:', role, '| Institution:', effectiveInstitutionId);
    
    // Simply navigate to the login page with the role parameter
    // The InstitutionLogin component will handle authentication and routing
    navigate(`/institution/login?institution=${effectiveInstitutionId}&role=${role}`);
  };


  if (checkingAuth || loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300">{checkingAuth ? 'Checking authentication...' : 'Loading institution...'}</p>
        </div>
      </div>
    );
  }

  if (error || !institution) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center backdrop-blur">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-slate-50 mb-2">Access Error</h2>
          <p className="text-slate-300 mb-6">{error || 'Institution not found'}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-400 text-slate-950 rounded-full font-semibold hover:bg-blue-300 shadow-lg shadow-blue-500/40"
          >
            Return to Home
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const getPortalUrl = (role) => {
    return `${window.location.origin}/institution/login?institution=${effectiveInstitutionId}&role=${role}`;
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
      role: 'admin'
    },
    {
      icon: Users,
      title: 'Caregiver Portal',
      description: 'For Doctors, Nurses & Caregivers',
      role: 'caregiver'
    },
    {
      icon: Activity,
      title: 'Pharmacist Portal',
      description: 'Pharmacy management access',
      role: 'pharmacist'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Top gradient halo */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[520px] bg-[radial-gradient(circle_at_top,_#22c55e33,_transparent_60%),radial-gradient(circle_at_20%_40%,_#38bdf833,_transparent_55%),radial-gradient(circle_at_80%_0,_#4f46e533,_transparent_55%)]" />

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 via-blue-400 to-blue-500 shadow-lg shadow-blue-500/30">
                <HeartPulse className="h-5 w-5 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold tracking-tight text-slate-50">
                    UltimateCare
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-400/30 bg-blue-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-blue-300">
                    <Sparkles className="h-3 w-3 text-blue-300" />
                    Institution
                  </span>
                </div>
                <p className="text-xs text-slate-400">The operating system for modern home healthcare</p>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="hidden rounded-full border border-slate-700 px-4 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 hover:text-white sm:inline-flex"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300 backdrop-blur mb-6">
              <Shield className="h-3.5 w-3.5 text-blue-400" />
              <span className="font-medium">Licensed & Active</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-slate-50 mb-4">
              <span className="bg-gradient-to-r from-blue-300 via-blue-300 to-blue-300 bg-clip-text text-transparent">
                {institution.name}
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-8">
              Healthcare Management Portal
            </p>

            {license && (
              <div className="inline-flex items-center gap-6 text-xs sm:text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-400" />
                  <span className="capitalize">{license.plan} Plan</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span>{license.seats} User Seats</span>
                </div>
              </div>
            )}
          </div>

          {/* Access Roles Section */}
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300 mb-3">
                Access Portals
              </p>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-50">
                Select Your Access Portal
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {accessRoles.map((role, index) => (
                <div key={index} className="space-y-3">
                  {/* Portal Box - Opens in New Tab */}
                  <a
                    href={getPortalUrl(role.role)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-lg shadow-black/40 hover:border-blue-400/50 hover:shadow-blue-500/20 transition-all duration-200 block"
                  >
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-400/15 text-blue-300 group-hover:bg-blue-400/25 transition-colors">
                        <role.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <h3 className="text-sm font-semibold text-slate-50">{role.title}</h3>
                          <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                        </div>
                        <p className="text-xs leading-relaxed text-slate-300">{role.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </a>
                  
                  {/* Copyable Link */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 overflow-hidden">
                        <p className="text-[10px] text-slate-400 mb-1 uppercase tracking-wider">Direct Link:</p>
                        <p className="text-[11px] font-mono text-slate-300 truncate">
                          {getPortalUrl(role.role)}
                        </p>
                      </div>
                      <button
                        onClick={() => copyPortalLink(role.role, role.title)}
                        className="flex-shrink-0 p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Copy link"
                      >
                        <Copy className="h-4 w-4 text-slate-400 hover:text-blue-300" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 text-center">
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 max-w-2xl mx-auto">
              <h3 className="font-semibold text-slate-50 mb-3">How to Access Your Portal</h3>
              <ol className="text-xs text-slate-300 text-left space-y-2">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-blue-300">1.</span>
                  <span>Click on your portal box above (opens in new tab)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-blue-300">2.</span>
                  <span>Or copy the direct link using the <Copy className="h-3 w-3 inline text-slate-400" /> button</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-blue-300">3.</span>
                  <span>Share the link with your team members</span>
                </li>
              </ol>
            </div>
            
            <p className="text-slate-400 mt-6 text-sm">
              Don't have an account? Contact your institution administrator to get access credentials.
            </p>
          </div>
        </div>

        {/* Features/Info Section */}
        <div className="border-t border-slate-800/60 bg-[radial-gradient(circle_at_top,_#0f172a,_#020617)] py-14 sm:py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300 mb-3">
                Platform Features
              </p>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-50">
                Built for modern healthcare operations
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="group rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-center shadow-lg shadow-black/40 transition hover:border-blue-400/50 hover:shadow-blue-500/20">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-400/15 text-blue-300 mx-auto mb-4">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-50 mb-2 text-sm">Secure & Compliant</h3>
                <p className="text-xs text-slate-300 leading-relaxed">NDPR-ready • HIPAA-inspired healthcare data management</p>
              </div>
              
              <div className="group rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-center shadow-lg shadow-black/40 transition hover:border-blue-400/50 hover:shadow-blue-500/20">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-400/15 text-blue-300 mx-auto mb-4">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-50 mb-2 text-sm">Staff Management</h3>
                <p className="text-xs text-slate-300 leading-relaxed">Manage doctors, nurses, and caregivers efficiently</p>
              </div>
              
              <div className="group rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-center shadow-lg shadow-black/40 transition hover:border-blue-400/50 hover:shadow-blue-500/20">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-400/15 text-blue-300 mx-auto mb-4">
                  <Activity className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-50 mb-2 text-sm">Real-time Updates</h3>
                <p className="text-xs text-slate-300 leading-relaxed">Track client care and staff activities in real-time</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/60 bg-slate-950 py-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-6 px-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2 text-slate-200">
              <HeartPulse className="h-4 w-4 text-blue-300" />
              <span className="text-sm font-semibold">UltimateCare</span>
            </div>
            <p className="mt-2 text-[11px]">
              © {new Date().getFullYear()} UltimateCare. Empowering safer, smarter home healthcare
              across Africa.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link to="/privacy" className="hover:text-blue-300">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-blue-300">
              Terms
            </Link>
            <Link to="/pricing" className="hover:text-blue-300">
              Pricing
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default InstitutionLanding;

