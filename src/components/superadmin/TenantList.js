import React, { useState, useMemo } from 'react';
import {
  Building2, Search, Plus, CheckSquare, Square, Download,
  Play, Pause, Trash2, Eye, RefreshCw, Users, FileText
} from 'lucide-react';
import { TenantStatusBadge, PlanBadge, EmptyState } from './shared';
import { exportToCSV } from '../../services/exportService';

const TenantList = ({
  institutions = [],
  licenses = [],
  loading,
  onRefresh,
  onSelectTenant,
  onCreateTenant,
  onBulkActivate,
  onBulkDeactivate,
  onBulkDelete,
}) => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [selected, setSelected] = useState(new Set());

  const getLicenseFor = (instId) => licenses.find(l => l.institutionId === instId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return institutions.filter(i => {
      if (q && !(i.name || '').toLowerCase().includes(q) && !(i.email || '').toLowerCase().includes(q) && !(i.id || '').toLowerCase().includes(q)) return false;
      if (statusFilter) {
        const effective = !i.active && i.status === 'active' ? 'suspended' : (i.status || (i.active ? 'active' : 'suspended'));
        if (effective !== statusFilter) return false;
      }
      if (planFilter) {
        const lic = getLicenseFor(i.id);
        const plan = lic?.plan || i.plan || '';
        if (plan !== planFilter) return false;
      }
      return true;
    });
  }, [institutions, query, statusFilter, planFilter]);

  const toggleSelect = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(i => i.id)));
  };

  const handleExport = () => {
    const data = filtered.map(i => {
      const lic = getLicenseFor(i.id);
      return {
        Name: i.name,
        Email: i.email || '',
        Plan: lic?.plan || i.plan || '',
        Seats: lic?.seats || i.seats || 0,
        Status: i.active ? 'Active' : 'Suspended',
        'License Ends': lic?.endsAt ? new Date(lic.endsAt).toLocaleDateString() : '',
        Created: i.createdAt ? new Date(i.createdAt).toLocaleDateString() : '',
      };
    });
    exportToCSV(data, `tenants-${new Date().toISOString().split('T')[0]}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-sage mb-3" />
        <p className="text-sm text-text-soft ml-3">Loading tenants...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="cm-card p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <div className="flex flex-1 gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                placeholder="Search by name, email, or ID..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="terminated">Terminated</option>
              <option value="expired">Expired</option>
            </select>
            <select
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              value={planFilter}
              onChange={e => setPlanFilter(e.target.value)}
            >
              <option value="">All Plans</option>
              <option value="basic">Basic</option>
              <option value="standard">Standard</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={onRefresh} className="cm-btn cm-btn-ghost-light text-sm">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button onClick={handleExport} className="cm-btn cm-btn-ghost-light text-sm">
              <Download className="h-4 w-4" /> Export
            </button>
            <button onClick={onCreateTenant} className="cm-btn cm-btn-gold text-sm">
              <Plus className="h-4 w-4" /> New Tenant
            </button>
          </div>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600">{selected.size} selected</span>
            <button onClick={() => onBulkActivate(Array.from(selected))} className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700">Activate</button>
            <button onClick={() => onBulkDeactivate(Array.from(selected))} className="px-3 py-1 bg-yellow-600 text-white text-xs rounded-lg hover:bg-yellow-700">Suspend</button>
            <button onClick={() => onBulkDelete(Array.from(selected))} className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700">Delete</button>
            <button onClick={() => setSelected(new Set())} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300">Clear</button>
          </div>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No tenants found"
          message={query || statusFilter || planFilter ? "Try adjusting your filters." : "Create your first tenant to get started."}
          action={
            <button onClick={onCreateTenant} className="cm-btn cm-btn-gold text-sm">
              <Plus className="h-4 w-4" /> New Tenant
            </button>
          }
        />
      ) : (
        <div className="cm-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-medium px-4 py-3 w-12">
                    <button onClick={toggleSelectAll} className="p-1 hover:bg-gray-200 rounded">
                      {selected.size === filtered.length && filtered.length > 0
                        ? <CheckSquare className="h-5 w-5 text-blue-600" />
                        : <Square className="h-5 w-5 text-gray-400" />}
                    </button>
                  </th>
                  <th className="text-left font-medium px-4 py-3">Tenant</th>
                  <th className="text-left font-medium px-4 py-3">Plan</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                  <th className="text-left font-medium px-4 py-3">Seats</th>
                  <th className="text-left font-medium px-4 py-3">License Ends</th>
                  <th className="text-left font-medium px-4 py-3">Created</th>
                  <th className="text-left font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(inst => {
                  const lic = getLicenseFor(inst.id);
                  const isSelected = selected.has(inst.id);
                  return (
                    <tr
                      key={inst.id}
                      className={`hover:bg-gray-50 cursor-pointer transition ${isSelected ? 'bg-blue-50/40' : ''}`}
                      onClick={() => onSelectTenant(inst)}
                    >
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <button onClick={() => toggleSelect(inst.id)} className="p-1 hover:bg-gray-200 rounded">
                          {isSelected ? <CheckSquare className="h-5 w-5 text-blue-600" /> : <Square className="h-5 w-5 text-gray-400" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-sage to-ink flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {(inst.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{inst.name}</div>
                            <div className="text-xs text-gray-500">{inst.email || inst.domain || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><PlanBadge plan={lic?.plan || inst.plan} /></td>
                      <td className="px-4 py-3"><TenantStatusBadge status={inst.status} active={inst.active} /></td>
                      <td className="px-4 py-3 text-gray-700">{lic?.seats || inst.seats || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {lic?.endsAt ? new Date(lic.endsAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {inst.createdAt ? new Date(inst.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onSelectTenant(inst)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantList;
