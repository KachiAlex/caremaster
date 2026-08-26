import React, { useState } from 'react';
import {
  Building2, FileText, Shield, Check, ChevronRight, ChevronLeft,
  Copy, Sparkles
} from 'lucide-react';
import { Modal } from './shared';
import {
  createInstitution, createLicense, assignInstitutionAdmin,
  generateLicenseKey, getInstitutions, getLicenses
} from '../../services/licenseService';
import { toast } from 'react-toastify';

const STEPS = [
  { id: 'institution', label: 'Create Institution', icon: Building2 },
  { id: 'license', label: 'Issue License', icon: FileText },
  { id: 'admin', label: 'Assign Admin', icon: Shield },
  { id: 'summary', label: 'Summary', icon: Check },
];

const LICENSE_TIERS = {
  basic: { name: 'Basic', defaultPrice: 15000, limits: { clients: 25, staff: 10, admins: 1 } },
  standard: { name: 'Standard', defaultPrice: 45000, limits: { clients: 100, staff: 50, admins: 3 } },
  professional: { name: 'Professional', defaultPrice: 120000, limits: { clients: -1, staff: 200, admins: 10 } },
  enterprise: { name: 'Enterprise', defaultPrice: 350000, limits: { clients: -1, staff: -1, admins: -1 } },
};

const OnboardingWizard = ({ open, onClose, onComplete }) => {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  // Step 1: Institution
  const [inst, setInst] = useState({ name: '', email: '', phone: '', domain: '', notes: '' });
  // Step 2: License
  const [lic, setLic] = useState({ plan: 'basic', seats: 10, endsAt: '', price: 15000, currency: 'NGN', billingCycle: 'monthly' });
  // Step 3: Admin
  const [admin, setAdmin] = useState({ email: '', displayName: '', password: '' });
  // Results
  const [results, setResults] = useState({ institution: null, license: null, admin: null });

  const reset = () => {
    setStep(0);
    setInst({ name: '', email: '', phone: '', domain: '', notes: '' });
    setLic({ plan: 'basic', seats: 10, endsAt: '', price: 15000, currency: 'NGN', billingCycle: 'monthly' });
    setAdmin({ email: '', displayName: '', password: '' });
    setResults({ institution: null, license: null, admin: null });
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleComplete = () => {
    reset();
    onComplete();
  };

  // ---- Step handlers ----
  const handleCreateInstitution = async () => {
    if (!inst.name?.trim()) { toast.error('Institution name is required'); return; }
    setBusy(true);
    try {
      const res = await createInstitution({
        name: inst.name.trim(),
        email: inst.email?.trim() || '',
        phone: inst.phone?.trim() || '',
        domain: inst.domain?.trim() || '',
        notes: inst.notes?.trim() || '',
      });
      setResults(r => ({ ...r, institution: res }));
      setLic(l => ({ ...l, institutionId: res.id }));
      setAdmin(a => ({ ...a, institutionId: res.id }));
      toast.success('Institution created');
      setStep(1);
    } catch (e) {
      toast.error(e.message || 'Failed to create institution');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateLicense = async () => {
    if (!lic.endsAt) { toast.error('License end date is required'); return; }
    setBusy(true);
    try {
      const licenseKey = generateLicenseKey();
      const res = await createLicense({
        institutionId: results.institution.id,
        plan: lic.plan,
        seats: lic.seats,
        endsAt: lic.endsAt,
        licenseKey,
        price: lic.price,
        currency: lic.currency,
        billingCycle: lic.billingCycle,
      });
      setResults(r => ({ ...r, license: { ...res, licenseKey } }));
      toast.success('License issued');
      setStep(2);
    } catch (e) {
      toast.error(e.message || 'Failed to issue license');
    } finally {
      setBusy(false);
    }
  };

  const handleAssignAdmin = async () => {
    if (!admin.email?.trim()) { toast.error('Admin email is required'); return; }
    if (!admin.password || admin.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setBusy(true);
    try {
      const res = await assignInstitutionAdmin({
        institutionId: results.institution.id,
        email: admin.email.trim(),
        displayName: admin.displayName?.trim() || admin.email.trim(),
        password: admin.password,
      });
      setResults(r => ({ ...r, admin: res }));
      toast.success('Admin assigned');
      setStep(3);
    } catch (e) {
      toast.error(e.message || 'Failed to assign admin');
    } finally {
      setBusy(false);
    }
  };

  const copyToClipboard = async (text) => {
    try { await navigator.clipboard.writeText(text); toast.success('Copied to clipboard'); }
    catch { toast.error('Could not copy'); }
  };

  const canProceed = () => {
    if (step === 0) return inst.name?.trim();
    if (step === 1) return lic.endsAt;
    if (step === 2) return admin.email?.trim() && admin.password?.length >= 6;
    return true;
  };

  const handleNext = () => {
    if (step === 0) handleCreateInstitution();
    else if (step === 1) handleCreateLicense();
    else if (step === 2) handleAssignAdmin();
    else if (step === 3) handleComplete();
  };

  return (
    <Modal open={open} title="Onboard New Tenant" onClose={handleClose} size="max-w-3xl">
      <div className="space-y-6">
        {/* Stepper */}
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className={`flex items-center gap-2 ${i <= step ? 'text-sage' : 'text-gray-400'}`}>
                <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition ${
                  i < step ? 'bg-sage text-white border-sage' :
                  i === step ? 'border-sage text-sage bg-sage/10' :
                  'border-gray-200 text-gray-400'
                }`}>
                  {i < step ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                </div>
                <span className="text-xs font-medium hidden sm:block">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-sage' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[200px]">
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-gold" />
                <h3 className="text-base font-semibold text-gray-900">Create the Institution</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Institution Name *</label>
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="e.g. Bula Care Nigeria" value={inst.name} onChange={e => setInst({ ...inst, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="info@institution.com" value={inst.email} onChange={e => setInst({ ...inst, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="+234..." value={inst.phone} onChange={e => setInst({ ...inst, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="institution.com" value={inst.domain} onChange={e => setInst({ ...inst, domain: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Internal notes..." value={inst.notes} onChange={e => setInst({ ...inst, notes: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-semibold text-gray-900">Issue a License</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value={lic.plan} onChange={e => {
                    const plan = e.target.value;
                    setLic({ ...lic, plan, price: LICENSE_TIERS[plan]?.defaultPrice || 0 });
                  }}>
                    {Object.entries(LICENSE_TIERS).map(([k, v]) => (
                      <option key={k} value={k}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seats</label>
                  <input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value={lic.seats} onChange={e => setLic({ ...lic, seats: parseInt(e.target.value) || 10 })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                  <input type="date" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value={lic.endsAt} onChange={e => setLic({ ...lic, endsAt: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                  <input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value={lic.price} onChange={e => setLic({ ...lic, price: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value={lic.currency} onChange={e => setLic({ ...lic, currency: e.target.value })}>
                    <option value="NGN">NGN (₦)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing Cycle</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value={lic.billingCycle} onChange={e => setLic({ ...lic, billingCycle: e.target.value })}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-gold" />
                <h3 className="text-base font-semibold text-gray-900">Assign an Admin</h3>
              </div>
              <p className="text-sm text-gray-500">This person will be the institution administrator with full access to manage their tenant.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email *</label>
                  <input type="email" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="admin@institution.com" value={admin.email} onChange={e => setAdmin({ ...admin, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="John Doe" value={admin.displayName} onChange={e => setAdmin({ ...admin, displayName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input type="password" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Min 6 characters" minLength={6} value={admin.password} onChange={e => setAdmin({ ...admin, password: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Check className="h-6 w-6 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Tenant Onboarded Successfully!</h3>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Institution</span>
                  <span className="text-sm font-semibold text-gray-900">{results.institution?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">License Key</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-semibold text-gray-900">{results.license?.licenseKey}</span>
                    <button onClick={() => copyToClipboard(results.license?.licenseKey)} className="p-1 hover:bg-green-100 rounded">
                      <Copy className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Plan</span>
                  <span className="text-sm font-semibold text-gray-900 capitalize">{results.license?.plan}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Admin</span>
                  <span className="text-sm font-semibold text-gray-900">{results.admin?.email}</span>
                </div>
                {results.institution?.accessLink && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Access Link</span>
                    <div className="flex items-center gap-2">
                      <a href={results.institution.accessLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">Portal Link</a>
                      <button onClick={() => copyToClipboard(results.institution.accessLink)} className="p-1 hover:bg-green-100 rounded">
                        <Copy className="h-3.5 w-3.5 text-gray-500" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">Share the license key and access link with the institution admin so they can log in.</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t border-gray-100">
          <button
            onClick={() => step === 0 ? handleClose() : setStep(step - 1)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium transition flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> {step === 0 ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={handleNext}
            disabled={busy || (step < 3 && !canProceed())}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium transition disabled:opacity-50 flex items-center gap-1"
          >
            {busy ? 'Processing...' : step === 3 ? 'Done' : 'Next'}
            {step < 3 && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default OnboardingWizard;
