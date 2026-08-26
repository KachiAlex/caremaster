import React from 'react';
import {
  CheckCircle, XCircle, Clock, AlertCircle, Pause, X
} from 'lucide-react';

// ---------- StatCard ----------
export const StatCard = ({ icon: Icon, label, value, sub, accent = 'from-sage to-ink' }) => (
  <div className="cm-stat">
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <p className="cm-stat-label">{label}</p>
        <p className="cm-stat-value">{value}</p>
        {sub && <p className="mt-1 text-xs text-text-soft">{sub}</p>}
      </div>
      <div className={`cm-stat-icon bg-gradient-to-br ${accent}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
    </div>
  </div>
);

// ---------- TenantStatusBadge ----------
export const TenantStatusBadge = ({ status, active }) => {
  const map = {
    active: { label: 'Active', cls: 'bg-green-100 text-green-800 border-green-300', Icon: CheckCircle },
    suspended: { label: 'Suspended', cls: 'bg-yellow-100 text-yellow-800 border-yellow-300', Icon: Pause },
    terminated: { label: 'Terminated', cls: 'bg-red-100 text-red-800 border-red-300', Icon: XCircle },
    expired: { label: 'Expired', cls: 'bg-gray-100 text-gray-700 border-gray-300', Icon: Clock },
    pending: { label: 'Pending', cls: 'bg-blue-100 text-blue-800 border-blue-300', Icon: AlertCircle },
  };
  const effective = !active && status === 'active' ? 'suspended' : (status || (active ? 'active' : 'suspended'));
  const cfg = map[effective] || map.active;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <cfg.Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
};

// ---------- PlanBadge ----------
export const PlanBadge = ({ plan }) => {
  const map = {
    basic: 'bg-gray-100 text-gray-700 border-gray-300',
    standard: 'bg-blue-100 text-blue-800 border-blue-300',
    professional: 'bg-purple-100 text-purple-800 border-purple-300',
    enterprise: 'bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-900 border-orange-300',
  };
  const cls = map[plan] || map.basic;
  const label = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : '—';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {label}
    </span>
  );
};

// ---------- Modal ----------
export const Modal = ({ open, title, onClose, children, size = 'max-w-2xl' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`w-full ${size} bg-white rounded-2xl shadow-xl border border-gray-200 max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

// ---------- ConfirmDialog ----------
export const ConfirmDialog = ({ open, title, message, confirmLabel = 'Confirm', onConfirm, onClose, danger }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600 mb-6">{message}</p>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition text-sm font-medium">
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-lg text-white transition text-sm font-medium ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------- EmptyState ----------
export const EmptyState = ({ icon: Icon, title, message, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {Icon && <Icon className="h-12 w-12 text-gray-300 mb-4" />}
    <h3 className="text-base font-semibold text-gray-700 mb-1">{title}</h3>
    {message && <p className="text-sm text-gray-500 max-w-sm">{message}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

// ---------- SectionCard ----------
export const SectionCard = ({ title, action, children, className = '' }) => (
  <div className={`cm-card p-6 ${className}`}>
    {(title || action) && (
      <div className="flex items-center justify-between mb-4">
        {title && <h3 className="text-base font-semibold text-gray-900">{title}</h3>}
        {action}
      </div>
    )}
    {children}
  </div>
);

// ---------- KVRow (key-value row for detail views) ----------
export const KVRow = ({ label, value }) => (
  <div className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="text-sm font-medium text-gray-900 text-right">{value || '—'}</span>
  </div>
);
