import React from 'react';
import { useUser } from '../contexts/UserContext';
import { Activity, Users, Calendar, Stethoscope, ShieldCheck, Building2 } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, accent }) => (
  <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 px-4 py-3 shadow-lg shadow-black/40">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
          {label}
        </p>
        <p className="mt-2 text-lg font-semibold text-slate-50">{value}</p>
      </div>
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${accent}`}
      >
        <Icon className="h-4 w-4 text-slate-950" />
      </div>
    </div>
  </div>
);

const InstitutionAdminDashboard = () => {
  const { institutionData, userProfile } = useUser();

  const displayName =
    userProfile?.name || userProfile?.displayName || userProfile?.email || 'Institution admin';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Top halo */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top,_#22c55e33,_transparent_60%),radial-gradient(circle_at_30%_20%,_#0ea5e933,_transparent_55%),radial-gradient(circle_at_80%_0,_#4f46e533,_transparent_55%)]" />

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {/* Header */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-sky-400 to-indigo-500 shadow-lg shadow-emerald-500/40">
              <Building2 className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
                Institution admin
              </p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">
                {institutionData?.name || 'UltimateCare institution workspace'}
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                Orchestrate providers, patients, and operations from a single control surface.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/80 px-3 py-2 text-xs text-slate-300">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-slate-200">
              <span className="text-sm font-medium">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-100">{displayName}</p>
              <p className="text-[11px] text-slate-400">Administrator</p>
            </div>
          </div>
        </section>

        {/* Stats row */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Users}
            label="Active patients"
            value={institutionData?.metrics?.activePatients ?? '—'}
            accent="from-emerald-400 to-emerald-300"
          />
          <StatCard
            icon={Stethoscope}
            label="Care team members"
            value={institutionData?.metrics?.careTeam ?? '—'}
            accent="from-sky-400 to-sky-300"
          />
          <StatCard
            icon={Calendar}
            label="Today’s visits"
            value={institutionData?.metrics?.todaysVisits ?? '—'}
            accent="from-indigo-400 to-indigo-300"
          />
          <StatCard
            icon={Activity}
            label="Open escalations"
            value={institutionData?.metrics?.openEscalations ?? '—'}
            accent="from-rose-400 to-orange-300"
          />
        </section>

        {/* Main grid */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr),minmax(0,1fr)]">
          {/* Left: key workflows */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-xl shadow-black/50">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Today
                  </p>
                  <h2 className="mt-2 text-sm font-semibold text-slate-50 sm:text-base">
                    Operational overview
                  </h2>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <button className="flex flex-col items-start gap-1 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-3 py-2 text-left text-xs text-slate-200 hover:border-emerald-400/60 hover:bg-slate-900">
                  <span className="text-[11px] font-medium text-slate-400">Assignments</span>
                  <span className="text-xs font-semibold text-slate-50">Manage care teams</span>
                  <span className="text-[11px] text-slate-500">
                    Match caregivers to patient caseloads.
                  </span>
                </button>
                <button className="flex flex-col items-start gap-1 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-3 py-2 text-left text-xs text-slate-200 hover:border-sky-400/60 hover:bg-slate-900">
                  <span className="text-[11px] font-medium text-slate-400">Utilization</span>
                  <span className="text-xs font-semibold text-slate-50">Shift coverage</span>
                  <span className="text-[11px] text-slate-500">
                    See who is on duty and where gaps exist.
                  </span>
                </button>
                <button className="flex flex-col items-start gap-1 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-3 py-2 text-left text-xs text-slate-200 hover:border-indigo-400/60 hover:bg-slate-900">
                  <span className="text-[11px] font-medium text-slate-400">Quality & safety</span>
                  <span className="text-xs font-semibold text-slate-50">Alerts & incidents</span>
                  <span className="text-[11px] text-slate-500">
                    Track critical events and follow-up actions.
                  </span>
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-xl shadow-black/50">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-50 sm:text-base">
                  Live operations feed
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Streaming
                </span>
              </div>
              <div className="mt-4 space-y-2 text-[11px] text-slate-300">
                <p>• New caregiver onboarding events and license checks will appear here.</p>
                <p>• Patient risk scores and escalations surface in real time as data arrives.</p>
                <p>• You can plug in your own analytics once backend wiring is completed.</p>
              </div>
            </div>
          </div>

          {/* Right: compliance & configuration */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-xl shadow-black/50">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Safety & compliance
                  </p>
                  <p className="mt-1 text-xs text-slate-200">
                    Configure access policies and audit visibility.
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-[11px] text-slate-300">
                <p>• Role-based access aligned with UltimateCare’s institution model.</p>
                <p>• Audit trails available across key clinical and operational actions.</p>
                <p>• Data residency and encryption policies managed centrally.</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 text-[11px] text-slate-300 shadow-xl shadow-black/50">
              <p className="font-medium text-slate-100">Need deeper configuration?</p>
              <p className="mt-1">
                The current dashboard is a streamlined shell. Connect this to your institution’s
                metrics, assignments, and EHR connectors to unlock the full UltimateCare admin
                experience.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default InstitutionAdminDashboard;
