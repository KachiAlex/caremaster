import React from 'react';
import { Link } from 'react-router-dom';
import { 
  HeartPulse,
  Sparkles,
  ShieldCheck,
  Activity,
  Clock, 
  Phone, 
  ArrowRight,
  Stethoscope,
  Users2,
  LineChart,
  TabletSmartphone,
  ChevronRight,
} from 'lucide-react';

const Landing = () => {
  const stats = [
    { label: 'Elderly supported', value: '12k+' },
    { label: 'Care sessions completed', value: '2.4M+' },
    { label: 'Average response time', value: '< 5 min' },
  ];

  const pillars = [
    {
      icon: Stethoscope,
      title: 'Clinical-grade home care',
      description:
        'Nurses, doctors, and caregivers orchestrated around each patient with clear care plans and digital workflows.',
      tag: 'Care delivery',
    },
    {
      icon: LineChart,
      title: 'Real-time health intelligence',
      description:
        'Vitals, medications, and activity streams unified in a single timeline for proactive interventions.',
      tag: 'Intelligence',
    },
    {
      icon: Users2,
      title: 'Family-first collaboration',
      description:
        'Give families a live window into care — updates, notes, and alerts in one secure experience.',
      tag: 'Family',
    },
  ];

  const personas = [
    {
      title: 'Health systems & hospitals',
      description:
        'Extend your clinical footprint into the home with a fully managed virtual ward for post-discharge and chronic care.',
      cta: 'Talk to our team',
    },
    {
      title: 'Home-care providers',
      description:
        'Run high-performing field teams with routing, scheduling, documentation, and compliance in one place.',
      cta: 'Digitise your operations',
    },
    {
      title: 'Families & caregivers',
      description:
        'Request trusted home-care, track each visit, and stay connected to the professionals supporting your loved ones.',
      cta: 'Explore the family app',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Top gradient halo */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[520px] bg-[radial-gradient(circle_at_top,_#22c55e33,_transparent_60%),radial-gradient(circle_at_20%_40%,_#38bdf833,_transparent_55%),radial-gradient(circle_at_80%_0,_#4f46e533,_transparent_55%)]" />

      {/* Navigation */}
      <header className="relative z-10 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-sky-400 to-indigo-500 shadow-lg shadow-emerald-500/30">
              <HeartPulse className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold tracking-tight text-slate-50">
                  UltimateCare
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-300">
                  <Sparkles className="h-3 w-3 text-emerald-300" />
                  New
                </span>
              </div>
              <p className="text-xs text-slate-400">The operating system for modern home healthcare</p>
            </div>
          </div>

          <nav className="hidden items-center gap-8 text-xs font-medium text-slate-300 sm:flex">
            <a href="#platform" className="hover:text-emerald-300">
              Platform
            </a>
            <a href="#who-we-serve" className="hover:text-emerald-300">
              Who we serve
            </a>
            <a href="#security" className="hover:text-emerald-300">
              Security
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/auth"
              className="hidden rounded-full border border-slate-700 px-4 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 hover:text-white sm:inline-flex"
            >
              Log in
            </Link>
              <Link
                to="/institution"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 hover:bg-emerald-300 sm:px-5 sm:text-sm"
              >
              Launch institution portal
              <ArrowRight className="h-3.5 w-3.5" />
              </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10">
        <section className="border-b border-slate-800/60">
          <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:flex-row lg:px-8 lg:pb-20 lg:pt-20">
            {/* Left column */}
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Live in Lagos, Abuja & Port Harcourt
        </div>

              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
                Reimagining
                <span className="bg-gradient-to-r from-emerald-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                  {' '}
                  connected care
                </span>{' '}
                at home.
            </h1>

              <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                UltimateCare is a full-stack home-health platform that connects providers, field
                caregivers, and families in one secure experience — from request to recovery.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/institution"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 hover:bg-emerald-300"
              >
                  Book a demo for your institution
                  <ChevronRight className="h-4 w-4" />
              </Link>
                <Link
                  to="/services"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-950/60 px-5 py-2 text-xs font-medium text-slate-200 hover:border-slate-500 hover:text-white"
                >
                  Explore family app
                  <TabletSmartphone className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-6 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                  NDPR-ready • HIPAA-inspired controls
              </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-sky-300" />
                  24/7 triage & emergency escalation
                </div>
              </div>

              <div className="mt-8 grid max-w-md grid-cols-3 gap-4 text-xs text-slate-300 sm:text-sm">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <div className="text-base font-semibold text-slate-50 sm:text-lg">
                      {stat.value}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400 sm:text-xs">{stat.label}</div>
              </div>
                ))}
              </div>
            </div>

            {/* Right column – product preview */}
            <div className="flex-1">
              <div className="relative mx-auto max-w-md rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950 p-4 shadow-2xl shadow-slate-950/80">
                <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-2.5 py-1">
                    <div className="flex h-1.5 w-5 items-center justify-between">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400/80" />
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400/80" />
          </div>
                    Live visit · Nurse Amina
                  </div>
                  <span>UltimateCare OS</span>
                </div>

                <div className="space-y-3 rounded-2xl bg-slate-900/80 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-slate-200">Morning home visit</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        BP, medication, mobility check, family update.
            </p>
          </div>
                    <div className="rounded-xl bg-emerald-400/10 px-3 py-1 text-[10px] font-medium text-emerald-300">
                      In progress
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-300">
                    <div className="rounded-xl bg-slate-950/60 p-2">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Activity className="h-3 w-3 text-emerald-300" />
                        Vitals
                </div>
                      <p className="mt-1 text-xs font-semibold text-slate-50">118/74 · 72 bpm</p>
          </div>
                    <div className="rounded-xl bg-slate-950/60 p-2">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock className="h-3 w-3 text-sky-300" />
                        Next dose
        </div>
                      <p className="mt-1 text-xs font-semibold text-slate-50">08:30 PM</p>
          </div>
                    <div className="rounded-xl bg-slate-950/60 p-2">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Users2 className="h-3 w-3 text-indigo-300" />
                        Family
                </div>
                      <p className="mt-1 text-[11px] text-emerald-300">Update sent</p>
              </div>
            </div>
            
                  <div className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-3 text-[11px] text-slate-300">
                    <p className="mb-1 font-medium text-slate-200">
                      “UltimateCare feels like having a digital matron coordinating every visit.”
                    </p>
                    <p className="text-[10px] text-slate-500">
                      — Director of Nursing, partner hospital in Lagos
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Platform pillars */}
        <section
          id="platform"
          className="border-b border-slate-800/60 bg-[radial-gradient(circle_at_top,_#0f172a,_#020617)] py-14 sm:py-16"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
                  Platform
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
                  Built for the new era of home and virtual care.
                </h2>
                <p className="mt-3 max-w-xl text-sm text-slate-300">
                  UltimateCare connects clinical teams, caregivers, families, and data in a single
                  secure spine — so every visit is coordinated, visible, and measurable.
                </p>
              </div>
            </div>
            
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {pillars.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={pillar.title}
                    className="group rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shadow-lg shadow-black/40 transition hover:border-emerald-400/50 hover:shadow-emerald-500/20"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                        {pillar.tag}
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                        <Icon className="h-4 w-4" />
                </div>
              </div>
                    <h3 className="mt-4 text-sm font-semibold text-slate-50">{pillar.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">
                      {pillar.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Who we serve */}
        <section
          id="who-we-serve"
          className="border-b border-slate-800/60 bg-slate-950 py-14 sm:py-16"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
                  Who we serve
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
                  One platform, tailored journeys.
                </h2>
              </div>
              <a
                href="tel:+2340000000000"
                className="inline-flex items-center gap-2 text-xs font-medium text-emerald-300 hover:text-emerald-200"
              >
                <Phone className="h-3.5 w-3.5" />
                Speak with our team
              </a>
                </div>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {personas.map((persona) => (
                <div
                  key={persona.title}
                  className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-200"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-slate-50">{persona.title}</h3>
                    <p className="mt-3 text-xs leading-relaxed text-slate-300">
                      {persona.description}
                    </p>
                  </div>
                  <button className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-emerald-300 hover:text-emerald-200">
                    {persona.cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
              </div>
            ))}
          </div>
        </div>
      </section>

        {/* Security & compliance */}
        <section
          id="security"
          className="border-b border-slate-800/60 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 py-14 sm:py-16"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 md:grid-cols-[minmax(0,1.1fr),minmax(0,1fr)] md:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
                  Security & trust
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
                  Designed for regulated healthcare environments.
                </h2>
                <p className="mt-3 text-sm text-slate-300">
                  UltimateCare ships with opinionated defaults for data protection, access control,
                  and auditability — giving your compliance and IT teams confidence from day one.
                </p>

                <div className="mt-6 grid gap-4 text-xs text-slate-300 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 rounded-full bg-emerald-400/10 p-1.5 text-emerald-300">
                      <ShieldCheck className="h-3.5 w-3.5" />
                </div>
                <div>
                      <p className="font-medium text-slate-100">Fine-grained access</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Role- and institution-aware permissions for admins, clinicians, and field
                        caregivers.
                  </p>
                </div>
              </div>
              
                  <div className="flex items-start gap-3">
                    <div className="mt-1 rounded-full bg-sky-400/10 p-1.5 text-sky-300">
                      <Activity className="h-3.5 w-3.5" />
                </div>
                <div>
                      <p className="font-medium text-slate-100">End-to-end audit trails</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Every change, visit, and health event is captured with rich metadata.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 via-slate-900/90 to-slate-950 p-4 text-[11px] text-slate-100 shadow-lg shadow-emerald-500/20">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/70 px-3 py-1 text-[10px] text-emerald-200">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Security posture · UltimateCare Cloud
                  </div>
                  <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] text-emerald-200">
                    Realtime monitoring
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-slate-200">
                    <span>Data residency</span>
                    <span className="text-emerald-300">Africa + EU options</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-200">
                    <span>Encryption</span>
                    <span className="text-emerald-300">In transit & at rest</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-200">
                    <span>Operational uptime</span>
                    <span className="text-emerald-300">&gt; 99.9% last 12 months</span>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/60 bg-slate-950 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <div>
            <div className="flex items-center gap-2 text-slate-200">
              <HeartPulse className="h-4 w-4 text-emerald-300" />
              <span className="text-sm font-semibold">UltimateCare</span>
            </div>
            <p className="mt-2 text-[11px]">
              © {new Date().getFullYear()} UltimateCare. Empowering safer, smarter home healthcare
              across Africa.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <a href="/privacy" className="hover:text-emerald-300">
              Privacy
            </a>
            <a href="/terms" className="hover:text-emerald-300">
              Terms
            </a>
            <a href="/pricing" className="hover:text-emerald-300">
              Pricing
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
