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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-lg p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/90 shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-300">Partner with UltimateCare</p>
            <h3 className="text-2xl font-semibold text-slate-50">Request to become a Tenant Partner</h3>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-slate-400 transition hover:border-emerald-400/60 hover:text-emerald-300"
            aria-label="Close partner request form"
          >
            ✕
          </button>
        </div>
        <form onSubmit={submit} className="px-6 py-6 text-base">
          <div className="grid gap-5">
            <label className="space-y-2 text-base">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Company Name</span>
              <input
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-base text-slate-50 placeholder-slate-500 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Company Name"
              />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-2 text-base">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-base text-slate-50 placeholder-slate-500 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="hello@ultimatecare.health"
                />
              </label>
              <label className="space-y-2 text-base">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Phone Number</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-base text-slate-50 placeholder-slate-500 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="+234 000 000 0000"
                />
              </label>
            </div>
            <label className="space-y-2 text-base">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Website (optional)</span>
              <input
                value={website}
                onChange={e => setWebsite(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-base text-slate-50 placeholder-slate-500 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="https://"
              />
            </label>
            <label className="space-y-2 text-base">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Message</span>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-base text-slate-50 placeholder-slate-500 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Tell us about your institution and care goals…"
              />
            </label>
          </div>
          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-5 py-3 text-base font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/90 px-5 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
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
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="pointer-events-none absolute inset-x-0 -top-48 flex justify-center">
        <div className="h-72 w-[620px] rounded-full bg-emerald-500/20 blur-[160px]" />
      </div>
      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-12 lg:px-12">
        <section className="grid gap-10 rounded-3xl border border-slate-800/70 bg-slate-950/80 p-10 shadow-2xl shadow-black/40 backdrop-blur lg:grid-cols-[1.25fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-1 text-[11px] font-medium uppercase tracking-[0.28em] text-emerald-200">
              <Sparkles className="h-3 w-3" />
              Trusted home-health infrastructure
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
              Welcome to the UltimateCare Partner Portal
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-300">
              Sign in to access your institution's private workspace. Every tenant operates in a secure, isolated environment with role-based access and unified workflows for administrators, caregivers, and pharmacy teams.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-emerald-200">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-slate-900/70 px-4 py-2">
                <Lock className="h-4 w-4" />
                Single sign-on security
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-slate-900/70 px-4 py-2">
                <Shield className="h-4 w-4" />
                HIPAA-inspired safeguards
              </span>
            </div>
            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/auth?tab=login&context=partner')}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/90 px-6 py-3 text-base font-semibold text-slate-950 shadow-xl shadow-emerald-500/30 transition hover:bg-emerald-400"
              >
                Partner login
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 px-6 py-3 text-base font-semibold text-slate-200 transition hover:border-emerald-400 hover:text-white"
              >
                Request access
              </button>
            </div>
            <p className="mt-6 text-sm text-slate-400">
              Need help signing in?{' '}
              <button
                onClick={() => navigate('/support')}
                className="font-semibold text-emerald-300 hover:underline"
              >
                Contact support
              </button>
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-[radial-gradient(circle_at_top,_#2563eb40,_transparent_60%)] from-blue-900/80 via-blue-800/80 to-blue-700/70 p-6 shadow-lg shadow-black/40">
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-200">Impact Snapshot</h2>
            <div className="mt-6 grid gap-5">
              <div className="rounded-xl border border-blue-400/30 bg-white/5 p-4 text-blue-50">
                <p className="text-3xl font-bold">12+</p>
                <p className="text-sm text-blue-100">Institutions modernizing their home-health operations with UltimateCare</p>
              </div>
              <div className="rounded-xl border border-blue-400/30 bg-white/5 p-4 text-blue-50">
                <p className="text-3xl font-bold">4.8 / 5</p>
                <p className="text-sm text-blue-100">Average satisfaction score from caregiver and admin teams</p>
              </div>
              <div className="rounded-xl border border-blue-400/30 bg-white/5 p-4 text-blue-50">
                <p className="text-3xl font-bold">3 continents</p>
                <p className="text-sm text-blue-100">Global reach across Africa, Europe, and North America</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-slate-800/70 bg-slate-950/70 p-10 shadow-xl shadow-black/40 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">How It Works</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-50">Secure access for every tenant</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { step: 'Step 1', title: 'Partner login', body: 'Registered administrators sign in using their institution email. Accounts are provisioned with tenant-specific roles and permissions.' },
              { step: 'Step 2', title: 'Automatic routing', body: 'After authentication we redirect users to their private institution workspace powered by Firestore rules and custom claims.' },
              { step: 'Step 3', title: 'Tenant operations', body: 'Administrators, caregivers, and pharmacy teams collaborate within a shared record system where data never leaves the tenant boundary.' }
            ].map((card, index) => (
              <div key={card.step} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/30">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">{card.step}</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-50">{card.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{card.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-3">
          {[
            { icon: Shield, title: 'For Administrators', body: 'Orchestrate institutions with role governance, analytics, alerts, and automated compliance guardrails.' },
            { icon: Users, title: 'For Care Teams', body: 'Plan shifts, track tasks, collaborate in real time, and capture clinical observations without switching tools.' },
            { icon: Pill, title: 'For Pharmacy', body: 'Streamline medication workflows, automate refills, and sync with care plans for safe dispensing.' }
          ].map((card, index) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/30">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-emerald-300" />
                  <h3 className="text-lg font-semibold text-slate-50">{card.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{card.body}</p>
              </div>
            );
          })}
        </section>

        <section className="mt-20 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/30 p-10 shadow-inner shadow-black/40">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Need an invite?</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-50">Request onboarding for your institution</h2>
              <p className="mt-3 max-w-2xl text-sm text-slate-300">
                We partner closely with healthcare groups to configure workflows, govern access, and train teams. Send us a request and our onboarding specialists will reach out within one business day.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-6 py-3 text-base font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
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


