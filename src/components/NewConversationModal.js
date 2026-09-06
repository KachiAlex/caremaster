import React, { useState, useMemo } from 'react';
import { X, Search, User, Stethoscope, Heart, Pill, Shield, UserCheck, Users } from 'lucide-react';

/**
 * NewConversationModal — CareMaster-branded modal for starting a new
 * conversation with a member of the current tenant.
 *
 * Props:
 *   open         — boolean, whether the modal is visible
 *   onClose      — function() to close the modal
 *   members      — array of tenant member objects (caregivers, nurses, doctors, admins, clients)
 *   currentUserId— string, the current user's ID (excluded from the list)
 *   onSelect     — function(member) called when a member is chosen
 */
const NewConversationModal = ({ open, onClose, members = [], currentUserId, onSelect }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'caregiver' | 'nurse' | 'doctor' | 'admin' | 'client'

  const roleConfig = {
    admin: { label: 'Admin', icon: Shield, color: 'var(--cm-coral)', bg: 'rgba(221,110,79,0.12)' },
    institutionAdmin: { label: 'Admin', icon: Shield, color: 'var(--cm-coral)', bg: 'rgba(221,110,79,0.12)' },
    doctor: { label: 'Doctor', icon: Stethoscope, color: 'var(--cm-sage)', bg: 'rgba(107,144,128,0.12)' },
    nurse: { label: 'Nurse', icon: Heart, color: 'var(--cm-coral)', bg: 'rgba(221,110,79,0.1)' },
    pharmacist: { label: 'Pharmacist', icon: Pill, color: 'var(--cm-gold-deep)', bg: 'rgba(217,164,65,0.12)' },
    caregiver: { label: 'Caregiver', icon: UserCheck, color: 'var(--cm-sage)', bg: 'rgba(107,144,128,0.1)' },
    client: { label: 'Client', icon: User, color: 'var(--cm-ink)', bg: 'rgba(18,48,44,0.06)' },
  };

  const getRoleConfig = (role) => roleConfig[role] || { label: role || 'Member', icon: User, color: 'var(--cm-text-soft)', bg: 'rgba(18,48,44,0.06)' };

  const filteredMembers = useMemo(() => {
    let list = members.filter((m) => m.id !== currentUserId);

    if (filter !== 'all') {
      list = list.filter((m) => {
        const role = m.role || m.userType || m.type || '';
        return role === filter;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) => {
        const name = (m.name || m.displayName || '').toLowerCase();
        const email = (m.email || '').toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }

    return list;
  }, [members, currentUserId, filter, search]);

  const counts = useMemo(() => {
    const c = { all: 0, admin: 0, doctor: 0, nurse: 0, pharmacist: 0, caregiver: 0, client: 0 };
    members.forEach((m) => {
      if (m.id === currentUserId) return;
      c.all++;
      const role = m.role || m.userType || m.type || '';
      if (c[role] !== undefined) c[role]++;
    });
    return c;
  }, [members, currentUserId]);

  const filterTabs = [
    { id: 'all', label: 'All' },
    { id: 'admin', label: 'Admins' },
    { id: 'doctor', label: 'Doctors' },
    { id: 'nurse', label: 'Nurses' },
    { id: 'caregiver', label: 'Caregivers' },
    { id: 'pharmacist', label: 'Pharmacists' },
    { id: 'client', label: 'Clients' },
  ].filter((t) => t.id === 'all' || counts[t.id] > 0);

  const handleSelect = (member) => {
    onSelect(member);
    setSearch('');
    setFilter('all');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 cm-animate-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--cm-ink-line,rgba(18,48,44,0.08))] flex items-center justify-between">
          <div>
            <h2 className="cm-display text-lg text-ink">New Conversation</h2>
            <p className="text-[12px] text-[var(--cm-text-soft)] mt-0.5">
              Select a member of your institution to message
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-cream transition text-[var(--cm-text-soft)]"
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-[var(--cm-ink-line,rgba(18,48,44,0.08))]">
          <div className="relative">
            <Search
              style={{ width: 16, height: 16 }}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cm-text-soft)]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="cm-input w-full pl-9 pr-3 py-2 text-sm"
              autoFocus
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1">
            {filterTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition ${
                  filter === t.id
                    ? 'bg-ink text-sand'
                    : 'bg-cream text-[var(--cm-text-soft)] hover:bg-sand-deep/30'
                }`}
              >
                {t.label}
                {t.id !== 'all' && counts[t.id] > 0 && (
                  <span className="ml-1 opacity-70">{counts[t.id]}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Member list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Users style={{ width: 40, height: 40 }} className="text-[var(--cm-text-soft)]/30 mx-auto mb-3" />
              <p className="text-sm text-[var(--cm-text-soft)]">
                {search.trim() ? 'No members match your search' : 'No members available'}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredMembers.map((member) => {
                const role = member.role || member.userType || member.type || '';
                const rc = getRoleConfig(role);
                const RoleIcon = rc.icon;
                const initials = (member.name || member.displayName || 'U')
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();
                const avatar = member.photoURL || member.avatar || member.profilePicture || member.profilePictureUrl;

                return (
                  <button
                    key={member.id}
                    onClick={() => handleSelect(member)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-cream transition text-left group"
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={member.name}
                          className="w-11 h-11 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                          style={{ background: 'linear-gradient(155deg, var(--cm-sage), var(--cm-ink))' }}
                        >
                          {initials}
                        </div>
                      )}
                      {/* Role badge */}
                      <div
                        className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white"
                        style={{ background: rc.bg }}
                        title={rc.label}
                      >
                        <RoleIcon style={{ width: 11, height: 11, color: rc.color }} />
                      </div>
                    </div>

                    {/* Name + email */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">
                        {member.name || member.displayName || 'Unknown'}
                      </p>
                      <p className="text-[12px] text-[var(--cm-text-soft)] truncate">
                        {member.email || rc.label}
                      </p>
                    </div>

                    {/* Role tag */}
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                      style={{ background: rc.bg, color: rc.color }}
                    >
                      {rc.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewConversationModal;
