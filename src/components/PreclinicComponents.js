import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

// Statistics Card Component (like in Preclinic template)
export const StatCard = ({ title, value, change, changeType, icon: Icon, color = 'blue' }) => {
  const accentColors = {
    blue: 'from-sky-400 to-sky-300',
    red: 'from-rose-400 to-rose-300',
    green: 'from-emerald-400 to-emerald-300',
    yellow: 'from-amber-400 to-amber-300',
    purple: 'from-indigo-400 to-indigo-300'
  };

  return (
    <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 px-4 py-3 shadow-lg shadow-black/40">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${accentColors[color]}`}>
          <Icon className="h-4 w-4 text-slate-950" />
        </div>
        {change && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
            changeType === 'increase' 
              ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/30' 
              : 'bg-rose-400/10 text-rose-300 border border-rose-400/30'
          }`}>
            {changeType === 'increase' ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{change}</span>
          </div>
        )}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-50 mb-1">{value}</h3>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">{title}</p>
        {change && (
          <p className="text-[10px] text-slate-500 mt-1">
            in last 7 Days
          </p>
        )}
      </div>
    </div>
  );
};

// Table Component (like in Preclinic template)
export const PreclinicTable = ({ headers, data, actions, loading = false }) => {
  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-800 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 bg-slate-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 shadow-xl shadow-black/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800/60">
          <thead className="bg-slate-900/60">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-[11px] font-medium text-slate-400 uppercase tracking-[0.18em]"
                >
                  {header}
                </th>
              ))}
              {actions && (
                <th className="px-6 py-3 text-right text-[11px] font-medium text-slate-400 uppercase tracking-[0.18em]">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-slate-950/60 divide-y divide-slate-800/60">
            {data.length === 0 ? (
              <tr>
                <td colSpan={headers.length + (actions ? 1 : 0)} className="px-6 py-12 text-center">
                  <div className="text-slate-400">
                    <p className="text-sm font-medium">No data available</p>
                    <p className="text-xs mt-1">Data will appear here when available</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-slate-900/60 transition-colors">
                  {Object.values(row).map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {cell}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                      <div className="flex justify-end gap-2">
                        {actions.map((action, actionIndex) => (
                          <button
                            key={actionIndex}
                            onClick={() => action.onClick(row)}
                            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium transition-colors ${action.className || 'text-emerald-300 hover:text-emerald-200'}`}
                          >
                            {action.icon && <action.icon className="h-3 w-3 mr-1" />}
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Status Badge Component
export const StatusBadge = ({ status, customColors }) => {
  const defaultColors = {
    'active': 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/30',
    'inactive': 'bg-slate-800/60 text-slate-400 border border-slate-700',
    'pending': 'bg-amber-400/10 text-amber-300 border border-amber-400/30',
    'completed': 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/30',
    'cancelled': 'bg-rose-400/10 text-rose-300 border border-rose-400/30',
    'scheduled': 'bg-sky-400/10 text-sky-300 border border-sky-400/30',
    'available': 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/30',
    'unavailable': 'bg-rose-400/10 text-rose-300 border border-rose-400/30',
    'online': 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/30',
    'offline': 'bg-slate-800/60 text-slate-400 border border-slate-700',
    'verified': 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/30',
    'unverified': 'bg-amber-400/10 text-amber-300 border border-amber-400/30'
  };

  const colors = customColors || defaultColors;
  const colorClass = colors[status?.toLowerCase()] || 'bg-slate-800/60 text-slate-400 border border-slate-700';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${colorClass}`}>
      {status}
    </span>
  );
};

// Page Header Component
export const PageHeader = ({ title, subtitle, actions }) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">{title}</h1>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        {actions && (
          <div className="flex items-center gap-3">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${action.className || 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'}`}
              >
                {action.icon && <action.icon className="h-3.5 w-3.5 mr-1.5" />}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Card Component
export const PreclinicCard = ({ title, children, actions, className = '' }) => {
  return (
    <div className={`rounded-3xl border border-slate-800/80 bg-slate-950/80 shadow-xl shadow-black/50 ${className}`}>
      {title && (
        <div className="px-4 py-3 border-b border-slate-800/60">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-50">{title}</h3>
            {actions && (
              <div className="flex items-center gap-2">
                {actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium transition-colors ${action.className || 'text-emerald-300 hover:text-emerald-200'}`}
                  >
                    {action.icon && <action.icon className="h-3.5 w-3.5 mr-1" />}
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};

// Form Components
export const PreclinicInput = ({ label, type = 'text', placeholder, value, onChange, required = false, className = '' }) => {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-slate-300 mb-2">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-3 py-2 border border-slate-700 bg-slate-900/60 text-slate-50 rounded-lg focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors placeholder:text-slate-500"
      />
    </div>
  );
};

export const PreclinicSelect = ({ label, options, value, onChange, required = false, className = '' }) => {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-slate-300 mb-2">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      <select
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-3 py-2 border border-slate-700 bg-slate-900/60 text-slate-50 rounded-lg focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors"
      >
        {options.map((option, index) => (
          <option key={index} value={option.value} className="bg-slate-900">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export const PreclinicTextarea = ({ label, placeholder, value, onChange, rows = 4, required = false, className = '' }) => {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-slate-300 mb-2">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows}
        required={required}
        className="w-full px-3 py-2 border border-slate-700 bg-slate-900/60 text-slate-50 rounded-lg focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors resize-none placeholder:text-slate-500"
      />
    </div>
  );
};

export default { StatCard, PreclinicTable, StatusBadge, PageHeader, PreclinicCard, PreclinicInput, PreclinicSelect, PreclinicTextarea };
