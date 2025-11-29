import React from 'react';

const HospitalShell = ({ title, subtitle, actions = null, children }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[360px] bg-[radial-gradient(circle_at_top,_#22c55e33,_transparent_60%),radial-gradient(circle_at_30%_20%,_#0ea5e933,_transparent_55%),radial-gradient(circle_at_80%_0,_#4f46e533,_transparent_55%)]" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <header className="rounded-3xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-sm p-6 shadow-xl shadow-black/50 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
              ElderX Hospital Operations
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-50">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-400 max-w-2xl">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>

        <section className="space-y-6">{children}</section>
      </div>
    </div>
  );
};

export default HospitalShell;

