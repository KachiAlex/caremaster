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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-cream shadow-2xl border border-ink/8">
        <div className="flex items-center justify-between border-b border-ink/8 px-6 py-5">
          <div>
            <p className="cm-mono text-[11px] uppercase tracking-[0.12em] text-gold-deep">Partner With CareMaster</p>
            <h3 className="cm-display text-2xl text-ink">Request to become a Tenant Partner</h3>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sage-soft text-ink/60 transition hover:bg-coral-soft hover:text-coral"
            aria-label="Close partner request form"
          >
            ✕
          </button>
        </div>
        <form onSubmit={submit} className="px-6 py-6 text-base">
          <div className="grid gap-5">
            <label className="space-y-2 text-base">
              <span className="text-ink/80 font-semibold uppercase text-xs tracking-wide">Company Name</span>
              <input
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                required
                className="w-full rounded-lg border border-ink/10 bg-white px-4 py-3 text-base text-ink transition focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 placeholder:text-ink/40"
                placeholder="Company Name"
              />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-2 text-base">
                <span className="text-ink/80 font-semibold uppercase text-xs tracking-wide">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-ink/10 bg-white px-4 py-3 text-base text-ink transition focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 placeholder:text-ink/40"
                  placeholder="hello@caremaster.com"
                />
              </label>
              <label className="space-y-2 text-base">
                <span className="text-ink/80 font-semibold uppercase text-xs tracking-wide">Phone Number</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  className="w-full rounded-lg border border-ink/10 bg-white px-4 py-3 text-base text-ink transition focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 placeholder:text-ink/40"
                  placeholder="+234 000 000 0000"
                />
              </label>
            </div>
            <label className="space-y-2 text-base">
              <span className="text-ink/80 font-semibold uppercase text-xs tracking-wide">Website (optional)</span>
              <input
                value={website}
                onChange={e => setWebsite(e.target.value)}
                className="w-full rounded-lg border border-ink/10 bg-white px-4 py-3 text-base text-ink transition focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 placeholder:text-ink/40"
                placeholder="https://"
              />
            </label>
            <label className="space-y-2 text-base">
              <span className="text-ink/80 font-semibold uppercase text-xs tracking-wide">Message</span>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-ink/10 bg-white px-4 py-3 text-base text-ink transition focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 placeholder:text-ink/40"
                placeholder="Tell us about your institution and care goals…"
              />
            </label>
          </div>
          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-ink/10 bg-white px-5 py-3 text-base font-semibold text-ink/80 transition hover:bg-sage-soft hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-3 text-base font-semibold text-ink shadow-sm transition hover:bg-gold-deep"
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
    <div className="relative min-h-screen overflow-hidden bg-cream">
      {/* Decorative brand orbs */}
      <div className="pointer-events-none absolute inset-x-0 -top-32 flex justify-center">
        <div className="h-64 w-[600px] rounded-full bg-sage/20 blur-3xl" />
      </div>
      <div className="pointer-events-none absolute -right-40 top-1/3 h-80 w-80 rounded-full bg-gold/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-20 h-64 w-64 rounded-full bg-sage/15 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-12 lg:px-12">
        {/* Hero */}
        <section className="grid gap-10 rounded-3xl border border-ink/8 bg-white/80 p-10 shadow-xl backdrop-blur lg:grid-cols-[1.25fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-sage-soft px-3 py-1 text-xs font-semibold text-sage">
              <Sparkles className="h-3 w-3" />
              Trusted elder-care infrastructure
            </div>
            <h1 className="cm-display mt-4 text-4xl text-ink sm:text-5xl">
              Welcome to the CareMaster Partner's Portal
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-ink/70">
              Sign in to access your institution's private workspace. Every tenant operates in a secure, isolated environment with role-based access and unified workflows for administrators, caregivers, and pharmacy teams.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-sage">
              <span className="inline-flex items-center gap-2 rounded-full bg-sage-soft px-4 py-2">
                <Lock className="h-4 w-4" />
                Single sign-on security
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-sage-soft px-4 py-2">
                <Shield className="h-4 w-4" />
                HIPAA-inspired safeguards
              </span>
            </div>
            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/login?role=admin')}
                className="inline-flex items-center gap-2 rounded-xl bg-ink px-6 py-3 text-base font-semibold text-sand shadow-lg shadow-ink/20 transition hover:bg-ink-soft"
              >
                Partner login
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-ink/10 bg-white px-6 py-3 text-base font-semibold text-ink transition hover:border-gold hover:text-gold-deep"
              >
                Request access
              </button>
            </div>
            <p className="mt-6 text-sm text-ink/60">
              Need help signing in? <button onClick={() => navigate('/support')} className="font-semibold text-gold-deep hover:underline">Contact support</button>
            </p>
          </div>

          {/* Impact Snapshot */}
          <div className="rounded-2xl border border-ink/8 bg-gradient-to-br from-ink to-sage p-6 text-sand shadow-lg">
            <h2 className="cm-mono text-sm uppercase tracking-[0.12em] text-gold">Impact Snapshot</h2>
            <div className="mt-6 grid gap-5">
              <div className="rounded-xl bg-white/10 p-4">
                <p className="text-3xl font-black text-gold">12+</p>
                <p className="text-sm text-sand/80">Institutions modernizing their elder-care operations with CareMaster</p>
              </div>
              <div className="rounded-xl bg-white/10 p-4">
                <p className="text-3xl font-black text-gold">4.8 / 5</p>
                <p className="text-sm text-sand/80">Average satisfaction score from caregiver and admin teams</p>
              </div>
              <div className="rounded-xl bg-white/10 p-4">
                <p className="text-3xl font-black text-gold">3 continents</p>
                <p className="text-sm text-sand/80">Global reach across Africa, Europe, and North America</p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="mt-16 rounded-3xl border border-ink/8 bg-white/80 p-10 shadow-xl backdrop-blur">
          <p className="cm-mono text-xs uppercase tracking-[0.12em] text-gold-deep">How It Works</p>
          <h2 className="cm-display mt-2 text-3xl text-ink">Secure access for every tenant</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-ink/8 bg-cream/60 p-6 shadow-sm">
              <p className="cm-mono text-sm font-semibold uppercase tracking-wide text-gold">Step 1</p>
              <h3 className="cm-display mt-2 text-xl text-ink">Partner login</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink/70">
                Registered administrators sign in using their institution email. Accounts are provisioned with tenant-specific roles and permissions.
              </p>
            </div>
            <div className="rounded-2xl border border-ink/8 bg-cream/60 p-6 shadow-sm">
              <p className="cm-mono text-sm font-semibold uppercase tracking-wide text-gold">Step 2</p>
              <h3 className="cm-display mt-2 text-xl text-ink">Automatic routing</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink/70">
                After authentication we redirect users to their private institution workspace with tenant-scoped access controls.
              </p>
            </div>
            <div className="rounded-2xl border border-ink/8 bg-cream/60 p-6 shadow-sm">
              <p className="cm-mono text-sm font-semibold uppercase tracking-wide text-gold">Step 3</p>
              <h3 className="cm-display mt-2 text-xl text-ink">Tenant operations</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink/70">
                Administrators, caregivers, and pharmacy teams collaborate within a shared record system where data never leaves the tenant boundary.
              </p>
            </div>
          </div>
        </section>

        {/* Role cards */}
        <section className="mt-16 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-ink/8 bg-white/80 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral-soft">
                <Shield className="h-5 w-5 text-coral" />
              </div>
              <h3 className="cm-display text-lg text-ink">For Administrators</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">
              Orchestrate institutions with role governance, analytics, alerts, and automated compliance guardrails.
            </p>
          </div>
          <div className="rounded-2xl border border-ink/8 bg-white/80 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-soft">
                <Users className="h-5 w-5 text-sage" />
              </div>
              <h3 className="cm-display text-lg text-ink">For Care Teams</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">
              Plan shifts, track tasks, collaborate in real time, and capture clinical observations without switching tools.
            </p>
          </div>
          <div className="rounded-2xl border border-ink/8 bg-white/80 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/20">
                <Pill className="h-5 w-5 text-gold-deep" />
              </div>
              <h3 className="cm-display text-lg text-ink">For Pharmacy</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">
              Streamline medication workflows, automate refills, and sync with care plans for safe dispensing.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-20 rounded-3xl border border-sage/20 bg-sage-soft/40 p-10 shadow-inner">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="cm-mono text-xs uppercase tracking-[0.12em] text-gold-deep">Need an invite?</p>
              <h2 className="cm-display mt-2 text-2xl text-ink">Request onboarding for your institution</h2>
              <p className="mt-3 max-w-2xl text-sm text-ink/70">
                We partner closely with healthcare groups to configure workflows, govern access, and train teams. Send us a request and our onboarding specialists will reach out within one business day.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-ink shadow-sm transition hover:bg-gold hover:text-ink"
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
