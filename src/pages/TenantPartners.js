import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, LifeBuoy, Lock, Shield, Users, Pill, Sparkles } from 'lucide-react';

const RequestPartnerModal = ({ isOpen, onClose }) => {
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const submit = (e) => {
    e.preventDefault();
    alert('Request submitted. Our team will reach out shortly.');
    setOrgName('');
    setEmail('');
    setPhone('');
    setWebsite('');
    setMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-5">
          <div>
            <p className="text-sm uppercase tracking-wide text-blue-600">Partner with UltimateCare</p>
            <h3 className="text-2xl font-black text-slate-900">Request to become a Tenant Partner</h3>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
            aria-label="Close partner request form"
          >
            ✕
          </button>
        </div>
        <form onSubmit={submit} className="px-6 py-6 text-base">
          <div className="grid gap-5">
            <label className="space-y-2 text-base">
              <span className="text-slate-700 font-semibold uppercase text-xs tracking-wide">Company Name</span>
              <input
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-base text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Company Name"
              />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-2 text-base">
              <span className="text-slate-700 font-semibold uppercase text-xs tracking-wide">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-base text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="hello@ultimatecare.health"
                />
              </label>
              <label className="space-y-2 text-base">
                <span className="text-slate-700 font-semibold uppercase text-xs tracking-wide">Phone Number</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 text-base text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="+234 000 000 0000"
                />
              </label>
            </div>
            <label className="space-y-2 text-base">
              <span className="text-slate-700 font-semibold uppercase text-xs tracking-wide">Website (optional)</span>
              <input
                value={website}
                onChange={e => setWebsite(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-base text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="https://"
              />
            </label>
            <label className="space-y-2 text-base">
              <span className="text-slate-700 font-semibold uppercase text-xs tracking-wide">Message</span>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-base text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Tell us about your institution and care goals…"
              />
            </label>
          </div>
          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-5 py-3 text-base font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Sparkles className="h-5 w-5" />
              Submit request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TenantPartners = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-blue-50">
      <div className="pointer-events-none absolute inset-x-0 -top-32 flex justify-center">
        <div className="h-64 w-[600px] rounded-full bg-blue-200/40 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-12 lg:px-12">
        <section className="grid gap-10 rounded-3xl bg-white/80 p-10 shadow-xl backdrop-blur lg:grid-cols-[1.25fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <Sparkles className="h-3 w-3" />
              Trusted home-health infrastructure
            </div>
            <h1 className="mt-4 text-4xl font-black text-slate-900 sm:text-5xl">
              Welcome to the UltimateCare Partner Portal
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              Sign in to access your institution's private workspace. Every tenant operates in a secure, isolated environment with role-based access and unified workflows for administrators, caregivers, and pharmacy teams.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-blue-700">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2">
                <Lock className="h-4 w-4" />
                Single sign-on security
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2">
                <Shield className="h-4 w-4" />
                HIPAA-inspired safeguards
              </span>
            </div>
            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/auth?tab=login&context=partner')}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-700"
              >
                Partner login
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-6 py-3 text-base font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
              >
                Request access
              </button>
            </div>
            <p className="mt-6 text-sm text-slate-500">
              Need help signing in? <button onClick={() => navigate('/support')} className="font-semibold text-blue-600 hover:underline">Contact support</button>
            </p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 p-6 text-white shadow-lg">
            <h2 className="text-lg font-semibold uppercase tracking-wide text-blue-100">Impact Snapshot</h2>
            <div className="mt-6 grid gap-5">
              <div className="rounded-xl bg-white/10 p-4">
                <p className="text-3xl font-black">12+</p>
                <p className="text-sm text-blue-100">Institutions modernizing their home-health operations with UltimateCare</p>
              </div>
              <div className="rounded-xl bg-white/10 p-4">
                <p className="text-3xl font-black">4.8 / 5</p>
                <p className="text-sm text-blue-100">Average satisfaction score from caregiver and admin teams</p>
              </div>
              <div className="rounded-xl bg-white/10 p-4">
                <p className="text-3xl font-black">3 continents</p>
                <p className="text-sm text-blue-100">Global reach across Africa, Europe, and North America</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 rounded-3xl bg-white/80 p-10 shadow-xl backdrop-blur">
          <p className="text-xs uppercase tracking-wide text-slate-400">How It Works</p>
          <h2 className="mt-2 text-3xl font-black text-slate-900">Secure access for every tenant</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Step 1</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">Partner login</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Registered administrators sign in using their institution email. Accounts are provisioned with tenant-specific roles and permissions.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Step 2</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">Automatic routing</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                After authentication we redirect users to their private institution workspace powered by Firestore rules and custom claims.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Step 3</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">Tenant operations</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Administrators, caregivers, and pharmacy teams collaborate within a shared record system where data never leaves the tenant boundary.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-900">For Administrators</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Orchestrate institutions with role governance, analytics, alerts, and automated compliance guardrails.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-900">For Care Teams</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Plan shifts, track tasks, collaborate in real time, and capture clinical observations without switching tools.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Pill className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-900">For Pharmacy</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Streamline medication workflows, automate refills, and sync with care plans for safe dispensing.
            </p>
          </div>
        </section>

        <section className="mt-20 rounded-3xl border border-blue-100 bg-blue-50/60 p-10 shadow-inner">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-blue-600">Need an invite?</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Request onboarding for your institution</h2>
              <p className="mt-3 max-w-2xl text-sm text-slate-600">
                We partner closely with healthcare groups to configure workflows, govern access, and train teams. Send us a request and our onboarding specialists will reach out within one business day.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100"
            >
              <LifeBuoy className="h-4 w-4" />
              Request onboarding
            </button>
          </div>
        </section>
      </div>
      <RequestPartnerModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
};

export default TenantPartners;


