import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { X, Building2, Shield, FileText, RefreshCw, Plus, LogOut, ExternalLink, Copy, Edit, Trash2, UserPlus } from 'lucide-react';
import { createInstitution, createLicense, assignInstitutionAdmin, getInstitutions, getLicenses, updateInstitution, deleteInstitution, updateLicense, suspendLicense, activateLicense, migrateInstitutionLinks, getInstitutionAdmins, removeInstitutionAdmin, forceUpdateAllInstitutionLinks } from '../services/licenseService';

const Card = ({ title, value, accent = 'text-emerald-300', icon: Icon }) => (
  <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-sm p-6 shadow-xl shadow-black/50">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
          {title}
        </p>
        <p className={`mt-2 text-2xl font-semibold ${accent}`}>{value}</p>
      </div>
      {Icon && (
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${
          accent.includes('emerald') ? 'from-emerald-400 to-emerald-600' :
          accent.includes('sky') ? 'from-sky-400 to-sky-600' :
          accent.includes('amber') ? 'from-amber-400 to-amber-600' :
          'from-slate-400 to-slate-600'
        } shadow-lg`}>
          <Icon className="h-5 w-5 text-slate-950" />
        </div>
      )}
    </div>
  </div>
);

const Modal = ({ open, title, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-slate-800/80 bg-slate-950/90 backdrop-blur-sm shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-slate-800/60 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-50">{title}</h3>
          <button onClick={onClose} className="rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-400 hover:border-emerald-400/60 hover:text-emerald-200 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 text-slate-200">{children}</div>
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
  const [license, setLicense] = useState({ institutionId: '', plan: 'basic', seats: 10, endsAt: '' });
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

  const inputClass =
    'rounded-xl border border-slate-800/60 bg-slate-900/60 backdrop-blur-sm px-4 py-2.5 text-sm text-slate-50 placeholder-slate-500 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors';

  // Helper function to fix old domain links
  const fixInstitutionLinks = (institutions) => {
    console.log('🔧 fixInstitutionLinks called with:', institutions?.length, 'institutions');
    if (!institutions || !Array.isArray(institutions)) {
      console.log('🔧 fixInstitutionLinks: Invalid input, returning as-is');
      return institutions;
    }
    const fixed = institutions.map(inst => {
      let needsFix = false;
      let fixedAccessLink = inst.accessLink;
      let fixedLoginLink = inst.loginLink;
      
      // Check and fix accessLink
      if (inst.accessLink && (inst.accessLink.includes('elderx') || !inst.accessLink.includes('ultimatecare-2025'))) {
        fixedAccessLink = `https://ultimatecare-2025.web.app/onboard?institution=${inst.id}`;
        needsFix = true;
        console.log(`🔧 FIXING accessLink for ${inst.id}:`, {
          old: inst.accessLink,
          new: fixedAccessLink
        });
      }
      
      // Check and fix loginLink
      if (inst.loginLink && (inst.loginLink.includes('elderx') || !inst.loginLink.includes('ultimatecare-2025'))) {
        fixedLoginLink = `https://ultimatecare-2025.web.app/institution/login?institution=${inst.id}`;
        needsFix = true;
        console.log(`🔧 FIXING loginLink for ${inst.id}:`, {
          old: inst.loginLink,
          new: fixedLoginLink
        });
      }
      
      if (needsFix) {
        const fixed = {
          ...inst,
          accessLink: fixedAccessLink,
          loginLink: fixedLoginLink
        };
        console.log(`✅ Fixed institution ${inst.id}:`, {
          oldAccessLink: inst.accessLink,
          newAccessLink: fixed.accessLink,
          oldLoginLink: inst.loginLink,
          newLoginLink: fixed.loginLink
        });
        return fixed;
      }
      return inst;
    });
    console.log('🔧 fixInstitutionLinks: Returning', fixed.length, 'institutions');
    return fixed;
  };

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [institutionsData, licensesData] = await Promise.all([
          getInstitutions(),
          getLicenses()
        ]);
        // Fix any old domain links
        const fixedInstitutions = fixInstitutionLinks(institutionsData);
        setInstitutions(fixedInstitutions || []);
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
            let updatedInstitutions = await getInstitutions();
            // Fix any old domain links
            updatedInstitutions = fixInstitutionLinks(updatedInstitutions);
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
      let updatedInstitutions = await getInstitutions();
      updatedInstitutions = fixInstitutionLinks(updatedInstitutions);
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
      let updatedInstitutions = await getInstitutions();
      updatedInstitutions = fixInstitutionLinks(updatedInstitutions);
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
    setEditingLicense({
      ...license,
      endsAt: license.endsAt ? new Date(license.endsAt).toISOString().split('T')[0] : ''
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
        active: editingLicense.active
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
        setMessage('License suspended successfully');
      } else {
        await activateLicense(license.id);
        setMessage('License activated successfully');
      }
      
      // Refresh data
      const updatedLicenses = await getLicenses();
      setLicenses(updatedLicenses || []);
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
      // Use the accessLink from the response, or construct from current origin
      const baseURL = window.location.origin;
      const accessLink = res.accessLink || `${baseURL}/onboard?institution=${res.id}`;
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
    
    try {
      const res = await createLicense({
        institutionId: license.institutionId.trim(),
        plan: license.plan,
        seats: license.seats,
        endsAt: license.endsAt
      });
      setMessage(`License created: ${res.id}`);
      
      // Refresh licenses data
      try {
        const updatedLicenses = await getLicenses();
        setLicenses(updatedLicenses || []);
      } catch (error) {
        console.error('Error refreshing licenses:', error);
      }
      
      setShowLicenseModal(false);
      setLicense({ institutionId: '', plan: 'basic', seats: 10, endsAt: '' });
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
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Top gradient halo */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top,_#22c55e33,_transparent_60%),radial-gradient(circle_at_30%_20%,_#0ea5e933,_transparent_55%),radial-gradient(circle_at_80%_0,_#4f46e533,_transparent_55%)]" />

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-sm sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 via-amber-400 to-orange-500 shadow-lg shadow-rose-500/40">
                <Shield className="h-5 w-5 text-slate-950" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-300">
                  Super admin
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">
                  Licensing Console
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleNavigateToDashboard}
                className="px-4 py-2 rounded-xl border border-slate-800/60 bg-slate-900/60 text-slate-300 text-sm font-medium hover:border-emerald-400/60 hover:text-emerald-300 transition-colors"
              >
                Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl border border-rose-500/60 bg-rose-500/10 text-rose-300 text-sm font-medium hover:border-rose-400 hover:bg-rose-500/20 transition-colors flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {/* Page Header */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-sm p-6 shadow-xl shadow-black/50">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                UltimateCare Licensing
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-50">Manage Institutions & Licenses</h2>
              <p className="mt-1 text-sm text-slate-400 max-w-2xl">
                Manage tenants, license plans, and administrator access. Every change syncs instantly across the UltimateCare network.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowInstitutionModal(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/30"
              >
                <Plus className="h-4 w-4" />
                New Institution
              </button>
              <button
                onClick={() => setShowLicenseModal(true)}
                className="px-4 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 flex items-center gap-2 transition-colors shadow-lg shadow-sky-500/30"
              >
                <FileText className="h-4 w-4" />
                New License
              </button>
              <button
                onClick={() => setShowAdminModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/30"
              >
                <UserPlus className="h-4 w-4" />
                Assign Admin
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div className="rounded-3xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 backdrop-blur-sm">
            {message}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            title="Institutions"
            value={loading ? '...' : (institutions.length || 0).toString()}
            accent="text-emerald-300"
            icon={Building2}
          />
          <Card
            title="Active Licenses"
            value={loading ? '...' : (licenses.filter(l => l.active !== false).length || 0).toString()}
            accent="text-sky-300"
            icon={Shield}
          />
          <Card
            title="Total Licenses"
            value={loading ? '...' : (licenses.length || 0).toString()}
            accent="text-amber-300"
            icon={FileText}
          />
        </div>

        {/* Search and Actions */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-sm p-6 shadow-xl shadow-black/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <input
              className={`${inputClass} w-full md:max-w-md`}
              placeholder="Search institutions by name, domain, or ID"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  setBusy(true);
                  setMessage('🚀 Force updating ALL institution links in database...');
                  try {
                    console.log('🚀🚀🚀 Starting FORCE UPDATE of all institution links...');
                    const result = await forceUpdateAllInstitutionLinks();
                    console.log('✅ Force update result:', result);
                    setMessage(`✅ ${result.message || 'Force update completed successfully'}`);
                    
                    // Clear any cached institution data (if cacheManager is available)
                    try {
                      const { default: cacheManager } = await import('../utils/cacheManager');
                      const keys = cacheManager.keys();
                      keys.forEach(key => {
                        if (key.startsWith('institution_')) {
                          cacheManager.delete(key);
                        }
                      });
                    } catch (cacheError) {
                      // Cache clearing is optional, don't fail if it doesn't work
                      console.log('Cache clearing skipped:', cacheError);
                    }
                    
                    // Wait a moment for database to propagate
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Refresh institutions list
                    console.log('🔄 Refreshing institutions list after force update...');
                    let updated = await getInstitutions();
                    console.log('✅ Updated institutions RAW from getInstitutions():', JSON.stringify(updated, null, 2));
                    console.log('✅ Updated institutions:', updated);
                    
                    // Apply frontend fix as safety net
                    console.log('🔧 Applying frontend safety fix...');
                    if (updated && Array.isArray(updated)) {
                      updated = updated.map(inst => {
                        const newAccess = `https://ultimatecare-2025.web.app/onboard?institution=${inst.id}`;
                        const newLogin = `https://ultimatecare-2025.web.app/institution/login?institution=${inst.id}`;
                        
                        // Always use the correct URLs regardless of what the function returned
                        return {
                          ...inst,
                          accessLink: newAccess,
                          loginLink: newLogin
                        };
                      });
                      console.log('🔧 FORCED fix on all institutions');
                    }
                    updated = fixInstitutionLinks(updated);
                    console.log('🔧 AFTER fix - First institution:', updated?.[0]);
                    
                    // Verify the fix worked
                    if (updated && updated.length > 0) {
                      const firstInst = updated[0];
                      console.log('🔍 VERIFICATION - First institution after fix:');
                      console.log('  - accessLink:', firstInst.accessLink);
                      console.log('  - loginLink:', firstInst.loginLink);
                      console.log('  - Contains elderx?', firstInst.accessLink?.includes('elderx') || firstInst.loginLink?.includes('elderx'));
                      console.log('  - Contains ultimatecare?', firstInst.accessLink?.includes('ultimatecare') || firstInst.loginLink?.includes('ultimatecare'));
                    }
                    
                    // Log each institution's accessLink to verify they're correct (AFTER fix)
                    updated?.forEach(inst => {
                      const hasOldDomain = inst.accessLink?.includes('elderx') || inst.loginLink?.includes('elderx');
                      if (hasOldDomain) {
                        console.error(`❌ CRITICAL: Institution ${inst.id} STILL has old domain AFTER fix!`, {
                          accessLink: inst.accessLink,
                          loginLink: inst.loginLink,
                          id: inst.id,
                          name: inst.name
                        });
                        // Force fix one more time as emergency backup
                        inst.accessLink = `https://ultimatecare-2025.web.app/onboard?institution=${inst.id}`;
                        inst.loginLink = `https://ultimatecare-2025.web.app/institution/login?institution=${inst.id}`;
                        console.log(`🔧 EMERGENCY FIX applied to ${inst.id}`);
                      } else {
                        console.log(`✅ Institution ${inst.id} (${inst.name}) has correct domain:`, inst.accessLink);
                      }
                    });
                    // Force state update
                    setInstitutions([]); // Clear first
                    setTimeout(() => {
                      setInstitutions(updated || []);
                      setMessage(`✅ ${result.message || 'Migration completed'} - Refreshed ${(updated || []).length} institutions`);
                      
                      // Check if any still have old domain
                      const stillHasOldDomain = (updated || []).some(inst => 
                        inst.accessLink?.includes('elderx') || inst.loginLink?.includes('elderx')
                      );
                      if (stillHasOldDomain) {
                        console.error('❌ CRITICAL: Some institutions still have old domain after refresh!');
                        setMessage('⚠️ Warning: Some links may still show old domain. Please check console logs.');
                      }
                    }, 100);
                  } catch (e) {
                    console.error('❌ Migration error:', e);
                    setMessage(`❌ Migration failed: ${e.message || 'Unknown error'}`);
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
                className="px-4 py-2 rounded-xl border border-slate-800/60 bg-slate-900/60 text-slate-300 text-sm font-medium hover:border-emerald-400/60 hover:text-emerald-300 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
                Force Update Links
              </button>
              <button
                onClick={() => setShowInstitutionModal(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-medium transition-colors shadow-lg shadow-emerald-500/30 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Institution
              </button>
            </div>
          </div>
        </div>

        {/* Institutions Table */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-sm shadow-xl shadow-black/50 overflow-hidden">
          <div className="p-6 border-b border-slate-800/60">
            <h3 className="text-xl font-semibold text-slate-50 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-400" />
              Institutions
            </h3>
            <p className="text-sm text-slate-400 mt-1">Manage all healthcare institutions</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/70 border-b border-slate-800/60">
                <tr>
                  <th className="text-left font-medium px-6 py-4 text-slate-400 uppercase text-xs tracking-wider">Name</th>
                  <th className="text-left font-medium px-6 py-4 text-slate-400 uppercase text-xs tracking-wider">Access Link</th>
                  <th className="text-left font-medium px-6 py-4 text-slate-400 uppercase text-xs tracking-wider">Status</th>
                  <th className="text-left font-medium px-6 py-4 text-slate-400 uppercase text-xs tracking-wider">Created</th>
                  <th className="text-left font-medium px-6 py-4 text-slate-400 uppercase text-xs tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500">No institutions yet</td>
                  </tr>
                )}
                {filtered.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-50">{i.name}</div>
                      {i.slug && <div className="text-xs text-slate-500 mt-1">{i.slug}</div>}
                    </td>
                    <td className="px-6 py-4">
                      {i.accessLink ? (
                        <div className="space-y-2">
                          <a 
                            href={i.accessLink} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-emerald-300 hover:text-emerald-200 text-xs flex items-center gap-1 transition-colors"
                          >
                            <span>Portal Link</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(i.accessLink);
                              setMessage('Link copied to clipboard!');
                              setTimeout(() => setMessage(''), 2000);
                            }}
                            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                          >
                            <Copy className="h-3 w-3" />
                            <span>Copy Link</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">No link</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        i.active !== false 
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/40' 
                          : 'bg-slate-800/60 text-slate-400 border border-slate-700/60'
                      }`}>
                        {i.active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">{i.createdAt ? new Date(i.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditInstitution(i)}
                          className="px-3 py-1.5 text-xs rounded-lg border border-slate-700/60 bg-slate-900/60 text-slate-200 hover:border-emerald-400/60 hover:text-emerald-300 transition-colors flex items-center gap-1"
                          title="Edit Institution"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => setLicense(l => ({ ...l, institutionId: i.id })) || setShowLicenseModal(true)}
                          className="px-3 py-1.5 text-xs rounded-lg border border-slate-700/60 bg-slate-900/60 text-slate-200 hover:border-sky-400/60 hover:text-sky-300 transition-colors"
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
                          className="px-3 py-1.5 text-xs rounded-lg border border-slate-700/60 bg-slate-900/60 text-slate-200 hover:border-indigo-400/60 hover:text-indigo-300 transition-colors"
                          title="Manage Admins"
                        >
                          Admins
                        </button>
                        <button
                          onClick={() => handleDeleteInstitution(i)}
                          className="px-3 py-1.5 text-xs rounded-lg border border-rose-500/60 bg-rose-500/10 text-rose-200 hover:border-rose-400 hover:bg-rose-500/20 transition-colors flex items-center gap-1"
                          title="Delete Institution"
                        >
                          <Trash2 className="h-3 w-3" />
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
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-sm shadow-xl shadow-black/50 overflow-hidden">
        <div className="p-6 border-b border-slate-800/60">
          <h3 className="text-xl font-semibold text-slate-50 flex items-center gap-2">
            <FileText className="h-5 w-5 text-sky-400" />
            Licenses
          </h3>
          <p className="text-sm text-slate-400 mt-1">Manage all institution licenses</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/70 border-b border-slate-800/60">
              <tr>
                <th className="text-left font-medium px-6 py-4 text-slate-400 uppercase text-xs tracking-wider">Institution</th>
                <th className="text-left font-medium px-6 py-4 text-slate-400 uppercase text-xs tracking-wider">Plan</th>
                <th className="text-left font-medium px-6 py-4 text-slate-400 uppercase text-xs tracking-wider">Seats</th>
                <th className="text-left font-medium px-6 py-4 text-slate-400 uppercase text-xs tracking-wider">Status</th>
                <th className="text-left font-medium px-6 py-4 text-slate-400 uppercase text-xs tracking-wider">Ends At</th>
                <th className="text-left font-medium px-6 py-4 text-slate-400 uppercase text-xs tracking-wider">Created</th>
                <th className="text-left font-medium px-6 py-4 text-slate-400 uppercase text-xs tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {licenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">No licenses yet</td>
                </tr>
              )}
              {licenses.map((l) => {
                const institution = institutions.find(inst => inst.id === l.institutionId);
                return (
                  <tr key={l.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-50">{institution?.name || l.institutionId || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-sky-500/15 text-sky-300 border border-sky-400/40 capitalize">
                        {l.plan || 'basic'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-200">{l.seats || 0}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        l.active !== false 
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/40' 
                          : 'bg-slate-800/60 text-slate-400 border border-slate-700/60'
                      }`}>
                        {l.active !== false ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {l.endsAt ? new Date(l.endsAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {l.createdAt ? new Date(l.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditLicense(l)}
                          className="px-3 py-1.5 text-xs rounded-lg border border-slate-700/60 bg-slate-900/60 text-slate-200 hover:border-sky-400/60 hover:text-sky-300 transition-colors flex items-center gap-1"
                          title="Edit License"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleLicense(l)}
                          disabled={busy}
                          className={`px-3 py-1.5 text-xs rounded-lg border transition-colors flex items-center gap-1 ${
                            l.active !== false
                              ? 'border-amber-500/60 bg-amber-500/10 text-amber-200 hover:border-amber-400 hover:bg-amber-500/20'
                              : 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400 hover:bg-emerald-500/20'
                          } disabled:opacity-50`}
                          title={l.active !== false ? 'Suspend License' : 'Activate License'}
                        >
                          {l.active !== false ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </div>
      {/* Create Institution Modal */}
      <Modal open={showInstitutionModal} title="Create Institution" onClose={() => setShowInstitutionModal(false)}>
        <div className="grid grid-cols-1 gap-3">
          <input className={inputClass} placeholder="Name" value={institution.name} onChange={e => setInstitution({ ...institution, name: e.target.value })} />
          <input className={inputClass} placeholder="Domain (optional)" value={institution.domain} onChange={e => setInstitution({ ...institution, domain: e.target.value })} />
          <input className={inputClass} placeholder="Notes (optional)" value={institution.notes} onChange={e => setInstitution({ ...institution, notes: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowInstitutionModal(false)} className="px-4 py-2 rounded-xl border border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-slate-600 transition-colors">Cancel</button>
            <button disabled={busy} onClick={handleCreateInstitution} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 disabled:opacity-50 transition-colors">Create</button>
          </div>
        </div>
      </Modal>

      {/* Create License Modal */}
      <Modal open={showLicenseModal} title="Create License" onClose={() => setShowLicenseModal(false)}>
        <div className="grid grid-cols-1 gap-3">
          <input className={inputClass} placeholder="Institution ID" value={license.institutionId} onChange={e => setLicense({ ...license, institutionId: e.target.value })} />
          <select className={inputClass} value={license.plan} onChange={e => setLicense({ ...license, plan: e.target.value })}>
            <option value="basic">Basic</option>
            <option value="standard">Standard</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <input className={inputClass} type="number" placeholder="Seats" value={license.seats} onChange={e => setLicense({ ...license, seats: Number(e.target.value) })} />
          <input className={inputClass} type="date" placeholder="Ends At" value={license.endsAt} onChange={e => setLicense({ ...license, endsAt: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowLicenseModal(false)} className="px-4 py-2 rounded-xl border border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-slate-600 transition-colors">Cancel</button>
            <button disabled={busy} onClick={handleCreateLicense} className="px-4 py-2 rounded-xl bg-sky-600 text-white font-semibold shadow-lg shadow-sky-500/30 hover:bg-sky-700 disabled:opacity-50 transition-colors">Create</button>
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
            <h4 className="text-sm font-semibold text-slate-50 mb-2">Current Admins</h4>
            {loadingAdmins ? (
              <div className="text-center py-4 text-slate-500">Loading admins...</div>
            ) : currentAdmins.length === 0 ? (
              <div className="text-center py-4 text-slate-500 border border-slate-800/60 rounded-xl bg-slate-900/40">
                No admins assigned yet
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-800/60 rounded-2xl bg-slate-900/40 p-3">
                {currentAdmins.map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
                    <div className="flex-1">
                      <div className="font-medium text-slate-50">{admin.displayName || admin.email}</div>
                      <div className="text-sm text-slate-400">{admin.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        admin.active ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/40' : 'bg-slate-800/60 text-slate-400 border border-slate-700/60'
                      }`}>
                        {admin.active ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                        className="p-1.5 text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 rounded-lg transition-colors"
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
          <div className="border-t border-slate-800 pt-4">
            <h4 className="text-sm font-semibold text-slate-50 mb-3">Add New Admin</h4>
            <div className="grid grid-cols-1 gap-3">
              <input 
                className={inputClass} 
                placeholder="Email" 
                type="email"
                value={adminUser.email} 
                onChange={e => setAdminUser({ ...adminUser, email: e.target.value })} 
              />
              <input 
                className={inputClass} 
                placeholder="Display Name (optional)" 
                value={adminUser.displayName} 
                onChange={e => setAdminUser({ ...adminUser, displayName: e.target.value })} 
              />
              <input 
                className={inputClass} 
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
                  className="px-4 py-2 rounded-xl border border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-slate-600 transition-colors"
                >
                  Close
                </button>
                <button 
                  disabled={busy || !adminUser.email || !adminUser.password || (adminUser.password && adminUser.password.length < 6)} 
                  onClick={handleAssignAdmin} 
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
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
              <label className="block text-sm font-semibold text-slate-50 mb-1">Name</label>
              <input
                className={inputClass}
                value={editingInstitution.name}
                onChange={e => setEditingInstitution({ ...editingInstitution, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-50 mb-1">Domain</label>
              <input
                className={inputClass}
                value={editingInstitution.domain || ''}
                onChange={e => setEditingInstitution({ ...editingInstitution, domain: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-50 mb-1">Notes</label>
              <textarea
                className={`${inputClass} min-h-[90px]`}
                rows={3}
                value={editingInstitution.notes || ''}
                onChange={e => setEditingInstitution({ ...editingInstitution, notes: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-800 bg-slate-900/70">
              <label className="text-sm font-semibold text-slate-50">Active Status</label>
              <button
                onClick={() => setEditingInstitution({ ...editingInstitution, active: !editingInstitution.active })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  editingInstitution.active ? 'bg-emerald-500/80' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    editingInstitution.active ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowEditInstitutionModal(false)} className="px-4 py-2 rounded-xl border border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-slate-600 transition-colors">Cancel</button>
              <button disabled={busy} onClick={handleUpdateInstitution} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 disabled:opacity-50 transition-colors">Update</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit License Modal */}
      <Modal open={showEditLicenseModal} title="Edit License" onClose={() => setShowEditLicenseModal(false)}>
        {editingLicense && (
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-50 mb-1">Plan</label>
              <select
                className={inputClass}
                value={editingLicense.plan}
                onChange={e => setEditingLicense({ ...editingLicense, plan: e.target.value })}
              >
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-50 mb-1">Seats</label>
              <input
                className={inputClass}
                type="number"
                value={editingLicense.seats}
                onChange={e => setEditingLicense({ ...editingLicense, seats: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-50 mb-1">Ends At</label>
              <input
                className={inputClass}
                type="date"
                value={editingLicense.endsAt}
                onChange={e => setEditingLicense({ ...editingLicense, endsAt: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowEditLicenseModal(false)} className="px-4 py-2 rounded-xl border border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-slate-600 transition-colors">Cancel</button>
              <button disabled={busy} onClick={handleUpdateLicense} className="px-4 py-2 rounded-xl bg-sky-600 text-white font-semibold shadow-lg shadow-sky-500/30 hover:bg-sky-700 disabled:opacity-50 transition-colors">Update</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={showDeleteConfirm} title="Confirm Deletion" onClose={() => setShowDeleteConfirm(false)}>
        {deleteTarget && (
          <div>
            <div className="mb-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
              <p>
                <strong>Warning:</strong> This action cannot be undone. Deleting this institution will also delete all associated licenses and data.
              </p>
            </div>
            <p className="text-slate-200 mb-4">
              Are you sure you want to delete <span className="font-semibold">{deleteTarget.data.name}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 rounded-xl border border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-slate-600 transition-colors">Cancel</button>
              <button disabled={busy} onClick={confirmDelete} className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold shadow-lg shadow-rose-500/30 hover:bg-rose-700 disabled:opacity-50 transition-colors">
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


