import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { X, Info } from 'lucide-react';
import { createInstitution, createLicense, assignInstitutionAdmin, getInstitutions, getLicenses, updateInstitution, deleteInstitution, updateLicense, suspendLicense, activateLicenseById, migrateInstitutionLinks, getInstitutionAdmins, removeInstitutionAdmin, generateLicenseKey } from '../services/licenseService';
import { toast } from 'react-toastify';

// License Tier Definitions
const LICENSE_TIERS = {
  basic: {
    name: 'Basic',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    defaultPrice: { NGN: 15000, USD: 20, EUR: 18, GBP: 16 },
    features: [
      'Up to 25 clients',
      'Up to 10 staff',
      'Basic care management',
      'Mobile app access',
      'Email support (48h)'
    ],
    limits: { clients: 25, staff: 10, admins: 1 }
  },
  standard: {
    name: 'Standard',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    defaultPrice: { NGN: 45000, USD: 60, EUR: 55, GBP: 48 },
    features: [
      'Up to 100 clients',
      'Up to 50 staff',
      'EVV & GPS tracking',
      'Smart scheduling',
      'Care plans & reports',
      'Family portal',
      'Chat support (24h)'
    ],
    limits: { clients: 100, staff: 50, admins: 3 }
  },
  professional: {
    name: 'Professional',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    defaultPrice: { NGN: 120000, USD: 160, EUR: 145, GBP: 125 },
    features: [
      'Unlimited clients',
      'Up to 200 staff',
      'Pharmacy management',
      'Telemedicine',
      'Bed & incident mgmt',
      'Advanced analytics',
      'API access',
      'Priority support (4h)'
    ],
    limits: { clients: -1, staff: 200, admins: 10 }
  },
  enterprise: {
    name: 'Enterprise',
    color: 'bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-900 border-orange-300',
    defaultPrice: { NGN: 350000, USD: 500, EUR: 450, GBP: 400 },
    features: [
      'Unlimited everything',
      'AI-powered features',
      'Multi-facility',
      'Custom branding',
      'Full API access',
      'Dedicated support',
      '24/7 phone support'
    ],
    limits: { clients: -1, staff: -1, admins: -1 }
  }
};

// Currency symbols
const CURRENCY_SYMBOLS = {
  NGN: '₦',
  USD: '$',
  EUR: '€',
  GBP: '£',
  GHS: '₵',
  ZAR: 'R',
  KES: 'KSh'
};

const Card = ({ title, value, accent = 'bg-blue-100 text-blue-800' }) => (
  <div className={`rounded-xl border border-gray-200 p-5 bg-white`}> 
    <div className="text-sm text-gray-500">{title}</div>
    <div className={`mt-2 inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold ${accent}`}>{value}</div>
  </div>
);

const Modal = ({ open, title, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

const SuperAdminLicensing = () => {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  // Data
  const [institutions, setInstitutions] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Forms
  const [institution, setInstitution] = useState({ name: '', domain: '', notes: '' });
  const [license, setLicense] = useState({ 
    institutionId: '', 
    plan: 'basic', 
    seats: 10, 
    endsAt: '',
    licenseKey: '',
    price: 15000,
    currency: 'NGN',
    billingCycle: 'monthly'
  });
  const [adminUser, setAdminUser] = useState({ institutionId: '', email: '', displayName: '' });

  // Modals
  const [showInstitutionModal, setShowInstitutionModal] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showEditInstitutionModal, setShowEditInstitutionModal] = useState(false);
  const [showEditLicenseModal, setShowEditLicenseModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Edit state
  const [editingInstitution, setEditingInstitution] = useState(null);
  const [editingLicense, setEditingLicense] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  // Admin management
  const [currentAdmins, setCurrentAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [selectedInstitutionForAdmin, setSelectedInstitutionForAdmin] = useState(null);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [institutionsData, licensesData] = await Promise.all([
          getInstitutions(),
          getLicenses()
        ]);
        setInstitutions(institutionsData || []);
        setLicenses(licensesData || []);
        
        // Auto-migrate if any institutions have old/missing links
        const needsMigration = institutionsData?.some(inst => 
          !inst.accessLink || 
          !inst.accessLink.includes('/onboard?institution=')
        );
        
        if (needsMigration) {
          console.log('🔄 Auto-migrating institution links to new format...');
          try {
            const result = await migrateInstitutionLinks({ force: true });
            console.log('✅ Auto-migration complete:', result);
            
            // Refresh data to show updated links
            const updatedInstitutions = await getInstitutions();
            setInstitutions(updatedInstitutions || []);
            setMessage('Institution links automatically updated to new format');
          } catch (migrationError) {
            console.error('Auto-migration failed:', migrationError);
            // Don't show error to user, they can manually click the button
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setMessage('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleEditInstitution = (institution) => {
    setEditingInstitution(institution);
    setShowEditInstitutionModal(true);
  };

  const handleUpdateInstitution = async () => {
    if (!editingInstitution) return;
    
    setBusy(true);
    setMessage('');
    
    try {
      await updateInstitution(editingInstitution.id, {
        name: editingInstitution.name,
        domain: editingInstitution.domain,
        notes: editingInstitution.notes,
        active: editingInstitution.active
      });
      
      setMessage(`Institution "${editingInstitution.name}" updated successfully`);
      
      // Refresh data
      const updatedInstitutions = await getInstitutions();
      setInstitutions(updatedInstitutions || []);
      
      setShowEditInstitutionModal(false);
      setEditingInstitution(null);
    } catch (e) {
      setMessage(e.message || 'Failed to update institution');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteInstitution = (institution) => {
    setDeleteTarget({ type: 'institution', data: institution });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    
    setBusy(true);
    setMessage('');
    
    try {
      await deleteInstitution(deleteTarget.data.id);
      setMessage(`Institution "${deleteTarget.data.name}" deleted successfully`);
      
      // Refresh data
      const updatedInstitutions = await getInstitutions();
      setInstitutions(updatedInstitutions || []);
      const updatedLicenses = await getLicenses();
      setLicenses(updatedLicenses || []);
      
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    } catch (e) {
      setMessage(e.message || 'Failed to delete institution');
    } finally {
      setBusy(false);
    }
  };

  const handleEditLicense = (license) => {
    // Handle Firestore Timestamp conversion safely
    let endsAtDate = '';
    if (license.endsAt) {
      try {
        const date = license.endsAt.toDate ? license.endsAt.toDate() : new Date(license.endsAt);
        if (!isNaN(date.getTime())) {
          endsAtDate = date.toISOString().split('T')[0];
        }
      } catch (e) {
        console.error('Error converting endsAt date:', e);
      }
    }
    
    setEditingLicense({
      ...license,
      endsAt: endsAtDate,
      price: license.price || LICENSE_TIERS[license.plan]?.defaultPrice.NGN || 0,
      currency: license.currency || 'NGN',
      billingCycle: license.billingCycle || 'monthly'
    });
    setShowEditLicenseModal(true);
  };

  const handleUpdateLicense = async () => {
    if (!editingLicense) return;
    
    setBusy(true);
    setMessage('');
    
    try {
      await updateLicense(editingLicense.id, {
        plan: editingLicense.plan,
        seats: editingLicense.seats,
        endsAt: editingLicense.endsAt,
        active: editingLicense.active,
        price: editingLicense.price,
        currency: editingLicense.currency,
        billingCycle: editingLicense.billingCycle
      });
      
      setMessage('License updated successfully');
      
      // Refresh data
      const updatedLicenses = await getLicenses();
      setLicenses(updatedLicenses || []);
      
      setShowEditLicenseModal(false);
      setEditingLicense(null);
    } catch (e) {
      setMessage(e.message || 'Failed to update license');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleLicense = async (license) => {
    setBusy(true);
    setMessage('');
    
    try {
      if (license.active !== false) {
        if (!window.confirm('Suspend this license? Users will lose access immediately.')) {
          setBusy(false);
          return;
        }
        await suspendLicense(license.id);
        toast.success('License suspended successfully');
        setMessage('License suspended successfully');
      } else {
        await activateLicenseById(license.id);
        toast.success('License activated successfully');
        setMessage('License activated successfully');
      }
      
      // Refresh data to show updated button state
      console.log('🔄 Refreshing licenses after toggle...');
      const updatedLicenses = await getLicenses();
      setLicenses(updatedLicenses || []);
      console.log('✅ Licenses refreshed:', updatedLicenses.length);
    } catch (e) {
      setMessage(e.message || 'Failed to toggle license status');
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return institutions;
    return institutions.filter(i =>
      (i.name || '').toLowerCase().includes(q) ||
      (i.domain || '').toLowerCase().includes(q) ||
      (i.id || '').toLowerCase().includes(q)
    );
  }, [institutions, query]);

  const handleCreateInstitution = async () => {
    setBusy(true); setMessage('');
    
    // Validate form data
    if (!institution.name?.trim()) {
      setMessage('Institution name is required');
      setBusy(false);
      return;
    }
    
    try {
      const res = await createInstitution({
        name: institution.name.trim(),
        domain: institution.domain?.trim() || '',
        notes: institution.notes?.trim() || ''
      });
      // Show success message with access link
      const accessLink = res.accessLink || `https://elderx-f5c2b.web.app/institution-admin?institution=${res.id}`;
      setMessage(`Institution created! Access Link: ${accessLink}`);
      
      // Refresh institutions data
      try {
        const updatedInstitutions = await getInstitutions();
        setInstitutions(updatedInstitutions || []);
      } catch (error) {
        console.error('Error refreshing institutions:', error);
      }
      
      setLicense(l => ({ ...l, institutionId: res.id }));
      setAdminUser(a => ({ ...a, institutionId: res.id }));
      setShowInstitutionModal(false);
      setInstitution({ name: '', domain: '', notes: '' });
      
      // Auto-copy link to clipboard
      try {
        await navigator.clipboard.writeText(accessLink);
        setTimeout(() => setMessage(prev => prev + ' (Link copied to clipboard!)'), 100);
      } catch (err) {
        console.log('Could not copy to clipboard:', err);
      }
    } catch (e) {
      setMessage(e.message || 'Failed to create institution');
    } finally { setBusy(false); }
  };

  const handleCreateLicense = async () => {
    setBusy(true); setMessage('');
    
    // Validate form data
    if (!license.institutionId?.trim()) {
      setMessage('Institution ID is required');
      setBusy(false);
      return;
    }
    
    if (!license.endsAt) {
      setMessage('License end date is required');
      setBusy(false);
      return;
    }
    
    if (!license.price || license.price <= 0) {
      setMessage('License price must be greater than 0');
      setBusy(false);
      return;
    }
    
    try {
      // Generate license key if not provided
      const licenseKey = license.licenseKey || generateLicenseKey();
      
      const res = await createLicense({
        institutionId: license.institutionId.trim(),
        plan: license.plan,
        seats: license.seats,
        endsAt: license.endsAt,
        licenseKey: licenseKey,
        price: license.price,
        currency: license.currency,
        billingCycle: license.billingCycle
      });
      
      // Copy license key to clipboard
      try {
        await navigator.clipboard.writeText(licenseKey);
        setMessage(`License created successfully! License Key: ${licenseKey} (Copied to clipboard)`);
      } catch (err) {
        setMessage(`License created successfully! License Key: ${licenseKey}`);
      }
      
      // Refresh licenses data
      try {
        const updatedLicenses = await getLicenses();
        setLicenses(updatedLicenses || []);
      } catch (error) {
        console.error('Error refreshing licenses:', error);
      }
      
      setShowLicenseModal(false);
      setLicense({ 
        institutionId: '', 
        plan: 'basic', 
        seats: 10, 
        endsAt: '', 
        licenseKey: '',
        price: 15000,
        currency: 'NGN',
        billingCycle: 'monthly'
      });
    } catch (e) {
      setMessage(e.message || 'Failed to create license');
    } finally { setBusy(false); }
  };

  const handleAssignAdmin = async () => {
    setBusy(true); setMessage('');
    
    // Validate form data
    if (!adminUser.institutionId?.trim()) {
      setMessage('Institution ID is required');
      setBusy(false);
      return;
    }
    
    if (!adminUser.email?.trim()) {
      setMessage('Email is required');
      setBusy(false);
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminUser.email.trim())) {
      setMessage('Please enter a valid email address');
      setBusy(false);
      return;
    }
    
    // Password validation
    if (!adminUser.password || adminUser.password.length < 6) {
      setMessage('Password must be at least 6 characters');
      setBusy(false);
      return;
    }
    
    try {
      const res = await assignInstitutionAdmin({
        institutionId: adminUser.institutionId.trim(),
        email: adminUser.email.trim(),
        displayName: adminUser.displayName?.trim() || adminUser.email.trim(),
        password: adminUser.password
      });
      setMessage(`Admin assigned: ${res.email}`);
      
      // Refresh admins list
      try {
        const updatedAdmins = await getInstitutionAdmins(adminUser.institutionId);
        setCurrentAdmins(updatedAdmins || []);
      } catch (error) {
        console.error('Error refreshing admins:', error);
      }
      
      // Clear form but keep modal open to add more admins
      setAdminUser({ institutionId: adminUser.institutionId, email: '', displayName: '' });
    } catch (e) {
      setMessage(e.message || 'Failed to assign admin');
    } finally { setBusy(false); }
  };

  const handleFixAdminProfile = async (adminId, adminEmail, institutionId) => {
    if (!confirm(`Fix profile for ${adminEmail}?\n\nThis will add institutionId: ${institutionId} to their user document.`)) {
      return;
    }

    setBusy(true);
    toast.info(`Fixing profile for ${adminEmail}...`);
    
    try {
      // Directly update the user document to add institutionId
      const userRef = doc(db, 'users', adminId);
      await updateDoc(userRef, {
        institutionId: institutionId,
        institutionAdmin: true,
        type: 'admin',
        userType: 'admin',
        role: 'admin',
        updatedAt: new Date()
      });
      
      toast.success(`✅ Profile fixed for ${adminEmail}! They can now log in.`);
      setMessage(`Profile fixed for ${adminEmail}`);
      
      // Refresh the admins list
      if (selectedInstitutionForAdmin) {
        const updatedAdmins = await getInstitutionAdmins(selectedInstitutionForAdmin.id);
        setCurrentAdmins(updatedAdmins || []);
      }
    } catch (e) {
      console.error('Error fixing admin profile:', e);
      toast.error(`Failed to fix profile: ${e.message}`);
      setMessage(e.message || 'Failed to fix admin profile');
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveAdmin = async (adminId, adminEmail) => {
    if (!confirm(`Are you sure you want to remove ${adminEmail} from this institution?`)) {
      return;
    }

    setBusy(true);
    try {
      // Call the Cloud Function to actually remove the admin
      await removeInstitutionAdmin({ 
        institutionId: selectedInstitutionForAdmin?.id || adminUser.institutionId, 
        adminId 
      });
      
      // Refresh the admins list from the server
      if (selectedInstitutionForAdmin) {
        const updatedAdmins = await getInstitutionAdmins(selectedInstitutionForAdmin.id);
        setCurrentAdmins(updatedAdmins || []);
      }
      
      setMessage(`Admin ${adminEmail} removed successfully!`);
    } catch (e) {
      setMessage(e.message || 'Failed to remove admin');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/super-admin/login');
    } catch (error) {
      console.error('Error logging out:', error);
      setMessage('Failed to log out');
    }
  };

  const handleNavigateToDashboard = () => {
    navigate('/super-admin/dashboard');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Licensing Console</h1>
          <p className="text-gray-600 text-sm">Manage institutions, licenses, and administrators</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleNavigateToDashboard} className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">Dashboard</button>
          <button onClick={() => setShowInstitutionModal(true)} className="px-3 py-2 bg-blue-600 text-white rounded-md">New Institution</button>
          <button onClick={() => setShowLicenseModal(true)} className="px-3 py-2 bg-indigo-600 text-white rounded-md">New License</button>
          <button onClick={() => setShowAdminModal(true)} className="px-3 py-2 bg-teal-600 text-white rounded-md">Assign Admin</button>
          <button onClick={handleLogout} className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Logout</button>
        </div>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-800">{message}</div>
      )}

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card title="Institutions" value={loading ? "..." : (institutions.length || 0).toString()} />
        <Card 
          title="Active Licenses" 
          value={loading ? "..." : (licenses.filter(l => l.active !== false).length || 0).toString()} 
          accent="bg-emerald-100 text-emerald-800" 
        />
        <Card title="Total Licenses" value={loading ? "..." : (licenses.length || 0).toString()} accent="bg-amber-100 text-amber-800" />
      </div>

      {/* Toolbar */}
      <div className="bg-white border rounded-xl p-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <input 
            className="border rounded-md p-2 w-full md:max-w-md"
            placeholder="Search institutions by name, domain, or ID"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await migrateInstitutionLinks({ force: true });
                  setMessage(`${result.message}`);
                  // Refresh data
                  const updated = await getInstitutions();
                  setInstitutions(updated || []);
                } catch (e) {
                  setMessage(e.message || 'Migration failed');
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              className="px-3 py-2 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50"
              title="Force update all institution links to new /onboard format"
            >
              🔄 Force Update Links
            </button>
            <button
              onClick={() => setShowInstitutionModal(true)}
              className="px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              + New Institution
            </button>
          </div>
        </div>
      </div>

      {/* Institutions table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left font-medium px-4 py-3">Name</th>
                <th className="text-left font-medium px-4 py-3">Access Link</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3">Created</th>
                <th className="text-left font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">No institutions yet</td>
                </tr>
              )}
              {filtered.map((i) => (
                <tr key={i.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{i.name}</div>
                    {i.slug && <div className="text-xs text-gray-500">{i.slug}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {i.accessLink ? (
                      <div className="space-y-1">
                        <a 
                          href={i.accessLink} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                        >
                          <span>Portal Link</span>
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(i.accessLink);
                            setMessage('Link copied to clipboard!');
                            setTimeout(() => setMessage(''), 2000);
                          }}
                          className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Copy Link</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No link</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${i.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
                      {i.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {i.createdAt ? (
                      i.createdAt.toDate ? 
                        i.createdAt.toDate().toLocaleDateString() : 
                        new Date(i.createdAt).toLocaleDateString()
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleEditInstitution(i)} 
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        title="Edit Institution"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => setLicense(l => ({ ...l, institutionId: i.id })) || setShowLicenseModal(true)} 
                        className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        title="Create License"
                      >
                        License
                      </button>
                      <button 
                        onClick={async () => {
                          setSelectedInstitutionForAdmin(i);
                          setAdminUser({ institutionId: i.id, email: '', displayName: '' });
                          setLoadingAdmins(true);
                          setShowAdminModal(true);
                          try {
                            const admins = await getInstitutionAdmins(i.id);
                            setCurrentAdmins(admins || []);
                          } catch (error) {
                            console.error('Error loading admins:', error);
                            setCurrentAdmins([]);
                          } finally {
                            setLoadingAdmins(false);
                          }
                        }} 
                        className="px-2 py-1 text-xs bg-teal-600 text-white rounded hover:bg-teal-700"
                        title="Manage Admins"
                      >
                        Admins
                      </button>
                      <button 
                        onClick={() => handleDeleteInstitution(i)} 
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        title="Delete Institution"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Licenses Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Licenses</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institution</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License Key</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seats</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ends At</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-500">Loading licenses...</td>
                </tr>
              ) : licenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-500">No licenses yet</td>
                </tr>
              ) : (
                licenses.map((license) => {
                  const institution = institutions.find(i => i.id === license.institutionId);
                  return (
                    <tr key={license.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {institution?.name || 'Unknown Institution'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                            {license.licenseKey || 'N/A'}
                          </code>
                          {license.licenseKey && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(license.licenseKey);
                                toast.success('License key copied!');
                              }}
                              className="text-blue-600 hover:text-blue-800"
                              title="Copy License Key"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          LICENSE_TIERS[license.plan]?.color || 'bg-gray-100 text-gray-800 border-gray-300'
                        }`}>
                          {LICENSE_TIERS[license.plan]?.name || license.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {license.price && license.currency ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">
                              {CURRENCY_SYMBOLS[license.currency] || license.currency}
                              {license.price.toLocaleString()}
                            </span>
                            <span className="text-xs text-gray-500 capitalize">
                              {license.billingCycle || 'monthly'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Not set</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{license.seats}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          license.active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {license.active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {(() => {
                          if (!license.endsAt) return '—';
                          try {
                            const date = license.endsAt.toDate ? license.endsAt.toDate() : new Date(license.endsAt);
                            return isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
                          } catch (e) {
                            return '—';
                          }
                        })()}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {(() => {
                          if (!license.createdAt) return '—';
                          try {
                            const date = license.createdAt.toDate ? license.createdAt.toDate() : new Date(license.createdAt);
                            return isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
                          } catch (e) {
                            return '—';
                          }
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button 
                            onClick={() => handleEditLicense(license)} 
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            title="Edit License"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleToggleLicense(license)} 
                            className={`px-2 py-1 text-xs text-white rounded ${
                              license.active !== false 
                                ? 'bg-yellow-600 hover:bg-yellow-700' 
                                : 'bg-green-600 hover:bg-green-700'
                            }`}
                            title={license.active !== false ? 'Suspend License' : 'Activate License'}
                          >
                            {license.active !== false ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Institution Modal */}
      <Modal open={showInstitutionModal} title="Create Institution" onClose={() => setShowInstitutionModal(false)}>
        <div className="grid grid-cols-1 gap-3">
          <input className="border rounded p-2" placeholder="Name" value={institution.name} onChange={e => setInstitution({ ...institution, name: e.target.value })} />
          <input className="border rounded p-2" placeholder="Domain (optional)" value={institution.domain} onChange={e => setInstitution({ ...institution, domain: e.target.value })} />
          <input className="border rounded p-2" placeholder="Notes (optional)" value={institution.notes} onChange={e => setInstitution({ ...institution, notes: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowInstitutionModal(false)} className="px-4 py-2 border rounded-md">Cancel</button>
            <button disabled={busy} onClick={handleCreateInstitution} className="px-4 py-2 bg-blue-600 text-white rounded-md">Create</button>
          </div>
        </div>
      </Modal>

      {/* Create License Modal */}
      <Modal open={showLicenseModal} title="Create License" onClose={() => setShowLicenseModal(false)}>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Institution ID *</label>
            <input 
              className="border rounded p-2 w-full" 
              placeholder="Institution ID" 
              value={license.institutionId} 
              onChange={e => setLicense({ ...license, institutionId: e.target.value })} 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">License Key</label>
            <div className="flex gap-2">
              <input 
                className="border rounded p-2 w-full font-mono text-sm" 
                placeholder="Auto-generated if empty" 
                value={license.licenseKey} 
                onChange={e => setLicense({ ...license, licenseKey: e.target.value.toUpperCase() })} 
                maxLength={24}
              />
              <button
                type="button"
                onClick={() => setLicense({ ...license, licenseKey: generateLicenseKey() })}
                className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 whitespace-nowrap text-sm"
              >
                Generate
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Format: LIC-XXXX-XXXX-XXXX-XXXX</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Plan *</label>
            <div className="space-y-3">
              {Object.entries(LICENSE_TIERS).map(([key, tier]) => (
                <div 
                  key={key}
                  onClick={() => {
                    const newPrice = tier.defaultPrice[license.currency] || tier.defaultPrice.NGN;
                    setLicense({ ...license, plan: key, price: newPrice });
                  }}
                  className={`
                    relative p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${license.plan === key 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="radio"
                          name="plan"
                          value={key}
                          checked={license.plan === key}
                          onChange={(e) => {
                            const newPrice = tier.defaultPrice[license.currency] || tier.defaultPrice.NGN;
                            setLicense({ ...license, plan: e.target.value, price: newPrice });
                          }}
                          className="h-4 w-4 text-blue-600"
                        />
                        <span className="font-semibold text-gray-900">{tier.name}</span>
                        <span className="text-sm text-gray-600">
                          Suggested: {CURRENCY_SYMBOLS[license.currency] || license.currency}{' '}
                          {tier.defaultPrice[license.currency]?.toLocaleString() || tier.defaultPrice.NGN.toLocaleString()}
                        </span>
                      </div>
                      <ul className="ml-6 space-y-1">
                        {tier.features.map((feature, idx) => (
                          <li key={idx} className="text-xs text-gray-600 flex items-center gap-1">
                            <svg className="h-3 w-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {license.plan === key && (
                      <div className="ml-2">
                        <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
                Tier limits are enforced automatically. Users will see upgrade prompts when approaching limits.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency *</label>
              <select 
                className="border rounded p-2 w-full" 
                value={license.currency} 
                onChange={e => {
                  const newCurrency = e.target.value;
                  const newPrice = LICENSE_TIERS[license.plan]?.defaultPrice[newCurrency] || license.price;
                  setLicense({ ...license, currency: newCurrency, price: newPrice });
                }}
              >
                <option value="NGN">🇳🇬 Nigerian Naira (₦)</option>
                <option value="USD">🇺🇸 US Dollar ($)</option>
                <option value="EUR">🇪🇺 Euro (€)</option>
                <option value="GBP">🇬🇧 British Pound (£)</option>
                <option value="GHS">🇬🇭 Ghana Cedi (₵)</option>
                <option value="ZAR">🇿🇦 South African Rand (R)</option>
                <option value="KES">🇰🇪 Kenyan Shilling (KSh)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500 font-semibold">
                  {CURRENCY_SYMBOLS[license.currency] || license.currency}
                </span>
                <input 
                  className="border rounded p-2 pl-8 w-full" 
                  type="number" 
                  placeholder="Price" 
                  value={license.price} 
                  onChange={e => setLicense({ ...license, price: Number(e.target.value) })} 
                  min={0}
                  step={license.currency === 'NGN' ? 1000 : 1}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Suggested: {CURRENCY_SYMBOLS[license.currency]}{LICENSE_TIERS[license.plan]?.defaultPrice[license.currency]?.toLocaleString() || '—'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Billing Cycle *</label>
              <select 
                className="border rounded p-2 w-full" 
                value={license.billingCycle} 
                onChange={e => setLicense({ ...license, billingCycle: e.target.value })}
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly (3 months)</option>
                <option value="biannual">Bi-Annual (6 months)</option>
                <option value="annual">Annual (12 months)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seats *</label>
            <input 
              className="border rounded p-2 w-full" 
              type="number" 
              placeholder="Number of seats" 
              value={license.seats} 
              onChange={e => setLicense({ ...license, seats: Number(e.target.value) })} 
              min={1}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expires On *</label>
            <input 
              className="border rounded p-2 w-full" 
              type="date" 
              value={license.endsAt} 
              onChange={e => setLicense({ ...license, endsAt: e.target.value })} 
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button onClick={() => setShowLicenseModal(false)} className="px-4 py-2 border rounded-md hover:bg-gray-50">Cancel</button>
            <button disabled={busy} onClick={handleCreateLicense} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
              {busy ? 'Creating...' : 'Create License'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Manage Admins Modal */}
      <Modal 
        open={showAdminModal} 
        title={`Manage Admins - ${selectedInstitutionForAdmin?.name || 'Institution'}`} 
        onClose={() => {
          setShowAdminModal(false);
          setCurrentAdmins([]);
          setSelectedInstitutionForAdmin(null);
        }}
      >
        <div className="space-y-4">
          {/* Current Admins List */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Current Admins</h4>
            {loadingAdmins ? (
              <div className="text-center py-4 text-gray-500">Loading admins...</div>
            ) : currentAdmins.length === 0 ? (
              <div className="text-center py-4 text-gray-500 bg-gray-50 rounded border">
                No admins assigned yet
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded p-2">
                {currentAdmins.map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{admin.displayName || admin.email}</div>
                      <div className="text-sm text-gray-600">{admin.email}</div>
                      {!admin.institutionId && (
                        <div className="text-xs text-red-600 mt-1">⚠️ Missing institutionId</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        admin.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {admin.active ? 'Active' : 'Inactive'}
                      </span>
                      {!admin.institutionId && (
                        <button
                          onClick={() => handleFixAdminProfile(admin.id, admin.email, selectedInstitutionForAdmin?.id)}
                          className="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                          title="Fix missing institutionId"
                        >
                          Fix
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="Remove admin"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Admin Form */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Add New Admin</h4>
            <div className="grid grid-cols-1 gap-3">
              <input 
                className="border rounded p-2" 
                placeholder="Email" 
                type="email"
                value={adminUser.email} 
                onChange={e => setAdminUser({ ...adminUser, email: e.target.value })} 
              />
              <input 
                className="border rounded p-2" 
                placeholder="Display Name (optional)" 
                value={adminUser.displayName} 
                onChange={e => setAdminUser({ ...adminUser, displayName: e.target.value })} 
              />
              <input 
                className="border rounded p-2" 
                placeholder="Password (min 6 characters)" 
                type="password"
                minLength={6}
                value={adminUser.password || ''} 
                onChange={e => setAdminUser({ ...adminUser, password: e.target.value })} 
              />
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => {
                    setShowAdminModal(false);
                    setCurrentAdmins([]);
                    setSelectedInstitutionForAdmin(null);
                  }} 
                  className="px-4 py-2 border rounded-md"
                >
                  Close
                </button>
                <button 
                  disabled={busy || !adminUser.email || !adminUser.password || (adminUser.password && adminUser.password.length < 6)} 
                  onClick={handleAssignAdmin} 
                  className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50"
                  title={!adminUser.password || adminUser.password.length < 6 ? 'Password must be at least 6 characters' : ''}
                >
                  {busy ? 'Adding...' : 'Add Admin'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Institution Modal */}
      <Modal open={showEditInstitutionModal} title="Edit Institution" onClose={() => setShowEditInstitutionModal(false)}>
        {editingInstitution && (
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input 
                className="border rounded p-2 w-full" 
                value={editingInstitution.name} 
                onChange={e => setEditingInstitution({ ...editingInstitution, name: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
              <input 
                className="border rounded p-2 w-full" 
                value={editingInstitution.domain || ''} 
                onChange={e => setEditingInstitution({ ...editingInstitution, domain: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea 
                className="border rounded p-2 w-full" 
                rows={3}
                value={editingInstitution.notes || ''} 
                onChange={e => setEditingInstitution({ ...editingInstitution, notes: e.target.value })} 
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <label className="text-sm font-medium text-gray-700">Active Status</label>
              <button
                onClick={() => setEditingInstitution({ ...editingInstitution, active: !editingInstitution.active })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  editingInstitution.active ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  editingInstitution.active ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowEditInstitutionModal(false)} className="px-4 py-2 border rounded-md">Cancel</button>
              <button disabled={busy} onClick={handleUpdateInstitution} className="px-4 py-2 bg-blue-600 text-white rounded-md">Update</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit License Modal */}
      <Modal open={showEditLicenseModal} title="Edit License" onClose={() => setShowEditLicenseModal(false)}>
        {editingLicense && (
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select 
                className="border rounded p-2 w-full" 
                value={editingLicense.plan} 
                onChange={e => {
                  const newPlan = e.target.value;
                  const newPrice = LICENSE_TIERS[newPlan]?.defaultPrice[editingLicense.currency] || editingLicense.price;
                  setEditingLicense({ ...editingLicense, plan: newPlan, price: newPrice });
                }}
              >
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select 
                  className="border rounded p-2 w-full" 
                  value={editingLicense.currency || 'NGN'} 
                  onChange={e => {
                    const newCurrency = e.target.value;
                    const newPrice = LICENSE_TIERS[editingLicense.plan]?.defaultPrice[newCurrency] || editingLicense.price;
                    setEditingLicense({ ...editingLicense, currency: newCurrency, price: newPrice });
                  }}
                >
                  <option value="NGN">₦ NGN</option>
                  <option value="USD">$ USD</option>
                  <option value="EUR">€ EUR</option>
                  <option value="GBP">£ GBP</option>
                  <option value="GHS">₵ GHS</option>
                  <option value="ZAR">R ZAR</option>
                  <option value="KES">KSh KES</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500 font-semibold text-sm">
                    {CURRENCY_SYMBOLS[editingLicense.currency] || editingLicense.currency}
                  </span>
                  <input 
                    className="border rounded p-2 pl-8 w-full" 
                    type="number" 
                    value={editingLicense.price || 0} 
                    onChange={e => setEditingLicense({ ...editingLicense, price: Number(e.target.value) })} 
                    min={0}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing</label>
                <select 
                  className="border rounded p-2 w-full" 
                  value={editingLicense.billingCycle || 'monthly'} 
                  onChange={e => setEditingLicense({ ...editingLicense, billingCycle: e.target.value })}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="biannual">Bi-Annual</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seats</label>
              <input 
                className="border rounded p-2 w-full" 
                type="number" 
                value={editingLicense.seats} 
                onChange={e => setEditingLicense({ ...editingLicense, seats: Number(e.target.value) })} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ends At</label>
              <input 
                className="border rounded p-2 w-full" 
                type="date" 
                value={editingLicense.endsAt} 
                onChange={e => setEditingLicense({ ...editingLicense, endsAt: e.target.value })} 
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowEditLicenseModal(false)} className="px-4 py-2 border rounded-md">Cancel</button>
              <button disabled={busy} onClick={handleUpdateLicense} className="px-4 py-2 bg-blue-600 text-white rounded-md">Update</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={showDeleteConfirm} title="Confirm Deletion" onClose={() => setShowDeleteConfirm(false)}>
        {deleteTarget && (
          <div>
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">
                <strong>Warning:</strong> This action cannot be undone. Deleting this institution will also delete all associated licenses and data.
              </p>
            </div>
            <p className="text-gray-700 mb-4">
              Are you sure you want to delete <strong>{deleteTarget.data.name}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 border rounded-md">Cancel</button>
              <button disabled={busy} onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                {busy ? 'Deleting...' : 'Delete Institution'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SuperAdminLicensing;


