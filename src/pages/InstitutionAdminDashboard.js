import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { Activity, Users, Calendar, Stethoscope, ShieldCheck, Building2, Bed, UserCog, Heart, UserPlus } from 'lucide-react';
import CreatePatientModal from '../components/CreatePatientModal';

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
  const navigate = useNavigate();
  const [showCreatePatientModal, setShowCreatePatientModal] = useState(false);

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
            label="Today's visits"
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

        {/* Quick Actions */}
        <section className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-xl shadow-black/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-50 sm:text-base">Quick Actions</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button
              onClick={() => setShowCreatePatientModal(true)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-600/10 px-4 py-4 text-center hover:border-emerald-500/50 hover:bg-emerald-600/20 transition-colors group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg group-hover:shadow-emerald-500/50 transition-shadow">
                <Heart className="h-5 w-5 text-slate-950" />
              </div>
              <span className="text-xs font-semibold text-slate-50">Register Patient</span>
              <span className="text-[10px] text-slate-400">Create new patient record</span>
            </button>
            <button
              onClick={() => navigate('/institution-admin/users')}
              className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-4 py-4 text-center hover:border-sky-400/50 hover:bg-slate-900 transition-colors group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 shadow-lg">
                <UserPlus className="h-5 w-5 text-slate-950" />
              </div>
              <span className="text-xs font-semibold text-slate-50">Manage Users</span>
              <span className="text-[10px] text-slate-400">View all users</span>
            </button>
            <button
              onClick={() => navigate('/institution-admin/hospital-operations')}
              className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-4 py-4 text-center hover:border-indigo-400/50 hover:bg-slate-900 transition-colors group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-lg">
                <Bed className="h-5 w-5 text-slate-950" />
              </div>
              <span className="text-xs font-semibold text-slate-50">Hospital Ops</span>
              <span className="text-[10px] text-slate-400">Bed management</span>
            </button>
            <button
              onClick={() => navigate('/institution-admin/staff-management')}
              className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-4 py-4 text-center hover:border-amber-400/50 hover:bg-slate-900 transition-colors group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
                <UserCog className="h-5 w-5 text-slate-950" />
              </div>
              <span className="text-xs font-semibold text-slate-50">Staff Management</span>
              <span className="text-[10px] text-slate-400">Team & shifts</span>
            </button>
          </div>
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
              <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <button 
                  onClick={() => navigate('/institution-admin/hospital-operations')}
                  className="flex flex-col items-start gap-1 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-3 py-2 text-left text-xs text-slate-200 hover:border-emerald-400/60 hover:bg-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Bed className="h-4 w-4 text-emerald-400" />
                    <span className="text-[11px] font-medium text-slate-400">Hospital Operations</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-50">Bed & Incident Management</span>
                  <span className="text-[11px] text-slate-500">
                    Monitor bed occupancy, incidents, and hospital KPIs.
                  </span>
                </button>
                <button 
                  onClick={() => navigate('/institution-admin/staff-management')}
                  className="flex flex-col items-start gap-1 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-3 py-2 text-left text-xs text-slate-200 hover:border-sky-400/60 hover:bg-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <UserCog className="h-4 w-4 text-sky-400" />
                    <span className="text-[11px] font-medium text-slate-400">Staff Management</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-50">Team & Shift Coordination</span>
                  <span className="text-[11px] text-slate-500">
                    Manage staff roster, shifts, and assignments.
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

      {/* Create Patient Modal */}
      <CreatePatientModal
        open={showCreatePatientModal}
        onClose={() => setShowCreatePatientModal(false)}
        onSuccess={(result) => {
          // Optionally refresh data or show success message
          console.log('Patient created:', result);
        }}
      />
    </div>
  );
};

export default InstitutionAdminDashboard;
