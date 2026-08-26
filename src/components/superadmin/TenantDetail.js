import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Activity, FileText, Users, Shield, Settings as SettingsIcon,
  Building2, RefreshCw, Play, Pause, AlertTriangle, TrendingUp, Clock, DollarSign
} from 'lucide-react';
import { TenantStatusBadge, PlanBadge, StatCard, SectionCard, KVRow, Modal, ConfirmDialog } from './shared';
import { getInstitutionAdmins, removeInstitutionAdmin, assignInstitutionAdmin, updateLicense, suspendLicense, activateLicenseById, updateInstitution, generateLicenseKey } from '../../services/licenseService';
import { collection, query, getDocs, where } from 'backend/database';
import { db } from '../../backend/config';
import { toast } from 'react-toastify';

const SUB_TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'license', label: 'License', icon: FileText },
  { id: 'admins', label: 'Admins', icon: Shield },
  { id: 'activity', label: 'Activity', icon: TrendingUp },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

const TenantDetail = ({ tenant, license, onBack, onRefresh }) => {
  const [subTab, setSubTab] = useState('overview');
  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [usersCount, setUsersCount] = useState(0);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState({ email: '', displayName: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [editingLicense, setEditingLicense] = useState(null);

  // Load admins and user count
  useEffect(() => {
    if (tenant?.id) {
      loadAdmins(tenant.id);
      loadUserCount(tenant.id);
      loadAuditLogs(tenant.id);
    }
  }, [tenant?.id]);

  const loadAdmins = async (instId) => {
    setLoadingAdmins(true);
    try {
      const res = await getInstitutionAdmins(instId);
      setAdmins(res || []);
    } catch (e) {
      console.error('Failed to load admins:', e);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const loadUserCount = async (instId) => {
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('institutionId', '==', instId)));
      setUsersCount(snap.size);
    } catch (e) {
      console.error('Failed to load user count:', e);
    }
  };

  const loadAuditLogs = async (instId) => {
    try {
      const snap = await getDocs(query(collection(db, 'auditLogs'), where('institutionId', '==', instId)));
      const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      logs.sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0));
      setAuditLogs(logs.slice(0, 20));
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    }
  };

  // ---- Actions ----
  const handleSuspend = async () => {
    setBusy(true);
    try {
      await updateInstitution(tenant.id, { active: false, status: 'suspended' });
      if (license?.id) await suspendLicense(license.id);
      toast.success('Tenant suspended');
      setShowSuspendModal(false);
      onRefresh();
    } catch (e) {
      toast.error(e.message || 'Failed to suspend');
    } finally {
      setBusy(false);
    }
  };

  const handleTerminate = async () => {
    setBusy(true);
    try {
      await updateInstitution(tenant.id, { active: false, status: 'terminated' });
      if (license?.id) await suspendLicense(license.id);
      toast.success('Tenant terminated');
      setShowTerminateModal(false);
      onBack();
    } catch (e) {
      toast.error(e.message || 'Failed to terminate');
    } finally {
      setBusy(false);
    }
  };

  const handleReactivate = async () => {
    setBusy(true);
    try {
      await updateInstitution(tenant.id, { active: true, status: 'active' });
      if (license?.id) await activateLicenseById(license.id);
      toast.success('Tenant reactivated');
      onRefresh();
    } catch (e) {
      toast.error(e.message || 'Failed to reactivate');
    } finally {
      setBusy(false);
    }
  };

  const handleAssignAdmin = async () => {
    if (!adminForm.email || !adminForm.password) {
      toast.error('Email and password are required');
      return;
    }
    setBusy(true);
    try {
      await assignInstitutionAdmin({
        institutionId: tenant.id,
        email: adminForm.email.trim(),
        displayName: adminForm.displayName || adminForm.email,
        password: adminForm.password,
      });
      toast.success('Admin assigned');
      setAdminForm({ email: '', displayName: '', password: '' });
      setShowAdminModal(false);
      loadAdmins(tenant.id);
    } catch (e) {
      toast.error(e.message || 'Failed to assign admin');
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveAdmin = async (adminId, adminEmail) => {
    if (!confirm(`Remove ${adminEmail} from this tenant?`)) return;
    setBusy(true);
    try {
      await removeInstitutionAdmin({ institutionId: tenant.id, adminId });
      toast.success('Admin removed');
      loadAdmins(tenant.id);
    } catch (e) {
      toast.error(e.message || 'Failed to remove admin');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveLicense = async () => {
    if (!editingLicense) return;
    setBusy(true);
    try {
      await updateLicense(editingLicense.id, {
        plan: editingLicense.plan,
        seats: editingLicense.seats,
        endsAt: editingLicense.endsAt,
        active: editingLicense.active,
      });
      toast.success('License updated');
      setEditingLicense(null);
      onRefresh();
    } catch (e) {
      toast.error(e.message || 'Failed to update license');
    } finally {
      setBusy(false);
    }
  };

  if (!tenant) return null;

  const isActive = tenant.active !== false && tenant.status !== 'terminated' && tenant.status !== 'suspended';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="cm-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <button onClick={onBack} className="mt-1 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-sage to-ink flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {(tenant.name || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{tenant.name}</h2>
              <div className="flex items-center gap-3 mt-1">
                <TenantStatusBadge status={tenant.status} active={tenant.active} />
                <PlanBadge plan={license?.plan || tenant.plan} />
                <span className="text-xs text-gray-500">{tenant.email || '—'}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onRefresh} className="cm-btn cm-btn-ghost-light text-sm">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            {isActive ? (
              <>
                <button onClick={() => setShowSuspendModal(true)} className="px-3 py-2 rounded-lg bg-yellow-100 text-yellow-800 hover:bg-yellow-200 text-sm font-medium transition">
                  <Pause className="h-4 w-4 inline mr-1" /> Suspend
                </button>
                <button onClick={() => setShowTerminateModal(true)} className="px-3 py-2 rounded-lg bg-red-100 text-red-800 hover:bg-red-200 text-sm font-medium transition">
                  <AlertTriangle className="h-4 w-4 inline mr-1" /> Terminate
                </button>
              </>
            ) : (
              <button onClick={handleReactivate} className="px-3 py-2 rounded-lg bg-green-100 text-green-800 hover:bg-green-200 text-sm font-medium transition">
                <Play className="h-4 w-4 inline mr-1" /> Reactivate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              subTab === tab.id
                ? 'border-sage text-sage'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total Users" value={usersCount} accent="from-sage to-ink" />
            <StatCard icon={Shield} label="Admins" value={admins.length} accent="from-gold to-gold-deep" />
            <StatCard icon={FileText} label="License Plan" value={license?.plan ? license.plan.charAt(0).toUpperCase() + license.plan.slice(1) : 'None'} accent="from-blue-500 to-blue-700" />
            <StatCard icon={Clock} label="License Ends" value={license?.endsAt ? new Date(license.endsAt).toLocaleDateString() : '—'} accent="from-coral to-gold" />
          </div>
          <SectionCard title="Tenant Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <KVRow label="Name" value={tenant.name} />
              <KVRow label="Email" value={tenant.email} />
              <KVRow label="Phone" value={tenant.phone} />
              <KVRow label="Website" value={tenant.website} />
              <KVRow label="Address" value={[tenant.address, tenant.city, tenant.state, tenant.country].filter(Boolean).join(', ')} />
              <KVRow label="Plan" value={<PlanBadge plan={license?.plan || tenant.plan} />} />
              <KVRow label="Seats" value={license?.seats || tenant.seats} />
              <KVRow label="Status" value={<TenantStatusBadge status={tenant.status} active={tenant.active} />} />
              <KVRow label="Created" value={tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : '—'} />
              <KVRow label="License Key" value={license?.licenseKey || tenant.licenseKey || '—'} />
            </div>
          </SectionCard>
          <SectionCard title="Recent Activity">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {auditLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="h-2 w-2 rounded-full bg-sage flex-shrink-0" />
                    <span className="text-sm text-gray-700 flex-1">{log.action || log.message || 'Activity'}</span>
                    <span className="text-xs text-gray-400">{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {subTab === 'license' && (
        <div className="space-y-6">
          {license ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard icon={FileText} label="Plan" value={license.plan ? license.plan.charAt(0).toUpperCase() + license.plan.slice(1) : '—'} accent="from-blue-500 to-blue-700" />
                <StatCard icon={Users} label="Seats" value={license.seats || '—'} accent="from-sage to-ink" />
                <StatCard icon={Clock} label="Status" value={license.active !== false ? 'Active' : 'Suspended'} accent={license.active !== false ? 'from-green-500 to-green-700' : 'from-yellow-500 to-yellow-700'} />
              </div>
              <SectionCard
                title="License Details"
                action={
                  <button
                    onClick={() => setEditingLicense({ ...license, endsAt: license.endsAt ? new Date(license.endsAt).toISOString().split('T')[0] : '' })}
                    className="cm-btn cm-btn-ghost-light text-sm"
                  >
                    <SettingsIcon className="h-4 w-4" /> Edit
                  </button>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <KVRow label="License Key" value={license.licenseKey || '—'} />
                  <KVRow label="Plan" value={<PlanBadge plan={license.plan} />} />
                  <KVRow label="Seats" value={license.seats} />
                  <KVRow label="Status" value={license.active !== false ? 'Active' : 'Suspended'} />
                  <KVRow label="Starts" value={license.startsAt ? new Date(license.startsAt).toLocaleDateString() : '—'} />
                  <KVRow label="Ends" value={license.endsAt ? new Date(license.endsAt).toLocaleDateString() : '—'} />
                  <KVRow label="Created" value={license.createdAt ? new Date(license.createdAt).toLocaleDateString() : '—'} />
                </div>
              </SectionCard>
            </>
          ) : (
            <SectionCard title="License">
              <p className="text-sm text-gray-500 py-4 text-center">No license assigned to this tenant.</p>
            </SectionCard>
          )}

          {/* Edit License Modal */}
          {editingLicense && (
            <Modal open={true} title="Edit License" onClose={() => setEditingLicense(null)}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    value={editingLicense.plan || 'basic'}
                    onChange={e => setEditingLicense({ ...editingLicense, plan: e.target.value })}
                  >
                    <option value="basic">Basic</option>
                    <option value="standard">Standard</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seats</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    value={editingLicense.seats || 10}
                    onChange={e => setEditingLicense({ ...editingLicense, seats: parseInt(e.target.value) || 10 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    value={editingLicense.endsAt || ''}
                    onChange={e => setEditingLicense({ ...editingLicense, endsAt: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingLicense.active !== false}
                    onChange={e => setEditingLicense({ ...editingLicense, active: e.target.checked })}
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setEditingLicense(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium">Cancel</button>
                  <button onClick={handleSaveLicense} disabled={busy} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
                    {busy ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}

      {subTab === 'admins' && (
        <div className="space-y-6">
          <SectionCard
            title="Institution Admins"
            action={
              <button onClick={() => setShowAdminModal(true)} className="cm-btn cm-btn-gold text-sm">
                <Shield className="h-4 w-4" /> Assign Admin
              </button>
            }
          >
            {loadingAdmins ? (
              <p className="text-sm text-gray-500 py-4 text-center">Loading admins...</p>
            ) : admins.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No admins assigned to this tenant.</p>
            ) : (
              <div className="space-y-2">
                {admins.map(admin => (
                  <div key={admin.id} className="flex items-center justify-between py-3 px-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-gold to-gold-deep flex items-center justify-center text-white text-xs font-bold">
                        {(admin.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{admin.displayName || admin.firstName || admin.email}</div>
                        <div className="text-xs text-gray-500">{admin.email}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                      disabled={busy}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Assign Admin Modal */}
          {showAdminModal && (
            <Modal open={true} title="Assign Institution Admin" onClose={() => setShowAdminModal(false)} size="max-w-lg">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="admin@example.com"
                    value={adminForm.email}
                    onChange={e => setAdminForm({ ...adminForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="John Doe"
                    value={adminForm.displayName}
                    onChange={e => setAdminForm({ ...adminForm, displayName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password (min 6 chars)</label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="••••••"
                    minLength={6}
                    value={adminForm.password}
                    onChange={e => setAdminForm({ ...adminForm, password: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Required only for new users. Existing users will be updated.</p>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowAdminModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium">Cancel</button>
                  <button onClick={handleAssignAdmin} disabled={busy} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
                    {busy ? 'Assigning...' : 'Assign Admin'}
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}

      {subTab === 'activity' && (
        <SectionCard title="Activity Log">
          {auditLogs.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No activity recorded for this tenant.</p>
          ) : (
            <div className="space-y-2">
              {auditLogs.map(log => (
                <div key={log.id} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                  <div className="h-2 w-2 rounded-full bg-sage mt-1.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{log.action || log.message || 'Activity'}</div>
                    {log.details && <div className="text-xs text-gray-500 mt-0.5">{typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}</div>}
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {subTab === 'settings' && (
        <SectionCard title="Tenant Settings">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <KVRow label="Tenant ID" value={tenant.id} />
              <KVRow label="Name" value={tenant.name} />
              <KVRow label="Email" value={tenant.email} />
              <KVRow label="Phone" value={tenant.phone} />
              <KVRow label="Website" value={tenant.website} />
              <KVRow label="Address" value={tenant.address} />
              <KVRow label="City" value={tenant.city} />
              <KVRow label="State" value={tenant.state} />
              <KVRow label="Country" value={tenant.country} />
              <KVRow label="Zip Code" value={tenant.zipCode} />
            </div>
            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Danger Zone</h4>
              <div className="flex gap-3">
                {isActive && (
                  <>
                    <button onClick={() => setShowSuspendModal(true)} className="px-4 py-2 rounded-lg bg-yellow-100 text-yellow-800 hover:bg-yellow-200 text-sm font-medium transition">
                      <Pause className="h-4 w-4 inline mr-1" /> Suspend Tenant
                    </button>
                    <button onClick={() => setShowTerminateModal(true)} className="px-4 py-2 rounded-lg bg-red-100 text-red-800 hover:bg-red-200 text-sm font-medium transition">
                      <AlertTriangle className="h-4 w-4 inline mr-1" /> Terminate Tenant
                    </button>
                  </>
                )}
                {!isActive && (
                  <button onClick={handleReactivate} className="px-4 py-2 rounded-lg bg-green-100 text-green-800 hover:bg-green-200 text-sm font-medium transition">
                    <Play className="h-4 w-4 inline mr-1" /> Reactivate Tenant
                  </button>
                )}
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Suspend Modal */}
      <ConfirmDialog
        open={showSuspendModal}
        title="Suspend Tenant"
        message={`Suspending "${tenant.name}" will immediately block all users from accessing the platform. The license will be suspended and a grace period of 30 days will apply before data is eligible for cleanup. You can reactivate at any time.`}
        confirmLabel="Suspend Now"
        danger
        onConfirm={handleSuspend}
        onClose={() => setShowSuspendModal(false)}
      />

      {/* Terminate Modal */}
      <ConfirmDialog
        open={showTerminateModal}
        title="Terminate Tenant"
        message={`Terminating "${tenant.name}" is a severe action. All users will lose access immediately. Data will be retained for 90 days before permanent deletion. This action can be reversed within the retention period by reactivating.`}
        confirmLabel="Terminate Permanently"
        danger
        onConfirm={handleTerminate}
        onClose={() => setShowTerminateModal(false)}
      />
    </div>
  );
};

export default TenantDetail;
