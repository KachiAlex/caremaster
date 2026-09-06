import React from 'react';
import {
  MessageSquare,
  Calendar,
  Users,
  CheckSquare,
  Clock,
  Activity,
  Stethoscope,
  Pill,
  ClipboardList,
  FileText,
  Heart,
  CheckCircle,
  Eye,
  Star,
  Award
} from 'lucide-react';
import { toast } from 'react-toastify';
import AssignmentCalendar from '../AssignmentCalendar';

const DashboardOverview = ({
  setActiveTab,
  user,
  userProfile,
  caregiver,
  assignedClients,
  recentTasks,
  todaySchedule,
  conversations,
  activeTasks,
  setSelectedTask,
  setShowTaskCompletionModal,
  setShowTaskDetailsModal,
  formatTime,
  getStatusColor,
  toDate,
  isDoctor,
  selectedClient,
  handleNewConsultation,
  handleWritePrescription,
  handleCreateCarePlan,
  setShowNurseReportModal,
  setShowCareLogsModal,
  performance
}) => {
  return (
          <>
            {/* Welcome banner — brand gradient */}
            <div
              className="rounded-2xl p-5 md:p-6 mb-5 text-white relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, var(--cm-ink) 0%, var(--cm-sage) 100%)' }}
            >
              <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-white/70 mb-1">Caregiver Dashboard</p>
                  <h2 className="cm-display text-xl md:text-2xl font-semibold text-white">
                    Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {userProfile?.firstName || userProfile?.displayName || user?.displayName || 'Caregiver'}
                  </h2>
                  <p className="text-sm text-white/80 mt-1 max-w-md">
                    You have {assignedClients.length} client{assignedClients.length !== 1 ? 's' : ''} and {recentTasks.length} task{recentTasks.length !== 1 ? 's' : ''} today.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab('messages')}
                    className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-sm font-medium transition flex items-center gap-2"
                  >
                    <MessageSquare style={{ width: 16, height: 16 }} />
                    Messages
                  </button>
                  <button
                    onClick={() => setActiveTab('schedule')}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-cream text-ink text-sm font-semibold transition shadow-sm flex items-center gap-2"
                  >
                    <Calendar style={{ width: 16, height: 16 }} />
                    Schedule
                  </button>
                </div>
              </div>
              {/* Decorative orbs */}
              <div className="cm-orb w-40 h-40 bg-white -top-10 -right-10" />
              <div className="cm-orb w-28 h-28 bg-[var(--cm-gold)] bottom-0 left-10" />
            </div>

            {/* Assignment Calendar — first thing the caregiver sees */}
            <AssignmentCalendar
              schedule={(todaySchedule || []).map(s => ({
                id: s.id,
                type: s.type || 'task',
                title: s.title || s.client || 'Task',
                time: s.time || s.scheduledTime || '',
                client: s.client || s.clientName || 'Client',
                status: s.status || 'pending',
                priority: s.priority
              }))}
              onItemSelect={() => {}}
            />

            {/* Stats row — brand-aligned, no duplicates */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <button
                onClick={() => setActiveTab('clients')}
                className="cm-stat cm-stat text-left hover:shadow-md transition active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="cm-stat-label">Clients</p>
                    <p className="cm-stat-value">{assignedClients.length}</p>
                  </div>
                  <div className="cm-stat-icon">
                    <Users />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('tasks')}
                className="cm-stat cm-stat-gold text-left hover:shadow-md transition active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="cm-stat-label">Today's Tasks</p>
                    <p className="cm-stat-value">{recentTasks.length}</p>
                  </div>
                  <div className="cm-stat-icon">
                    <CheckSquare />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('tasks')}
                className="cm-stat cm-stat-coral text-left hover:shadow-md transition active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="cm-stat-label">Pending</p>
                    <p className="cm-stat-value">{recentTasks.filter(t => t.status !== 'completed').length}</p>
                  </div>
                  <div className="cm-stat-icon">
                    <Clock />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('messages')}
                className="cm-stat cm-stat-ink text-left hover:shadow-md transition active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="cm-stat-label">Unread</p>
                    <p className="cm-stat-value">{conversations.filter(c => c.unread > 0).length}</p>
                  </div>
                  <div className="cm-stat-icon">
                    <MessageSquare />
                  </div>
                </div>
              </button>
            </div>

            {/* Active Tasks (only if any) */}
            {activeTasks.length > 0 && (
              <div className="cm-card cm-card-accent-sage p-4 md:p-5" style={{ borderColor: 'rgba(107,144,128,0.25)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="cm-display text-base text-ink flex items-center gap-2">
                    <span className="cm-icon-badge cm-icon-badge-sage">
                      <Clock style={{ width: 18, height: 18 }} />
                    </span>
                    Active Tasks ({activeTasks.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {activeTasks.map((task) => {
                    const hours = Math.floor(task.elapsedHours || 0);
                    const minutes = task.elapsedMinutes || 0;
                    const displayTime = hours > 0
                      ? `${hours}:${minutes.toString().padStart(2, '0')}`
                      : `${minutes} min`;
                    return (
                      <div key={task.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(107,144,128,0.06)' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">
                            {task.title || task.taskName || task.type || 'Care Task'}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[12px] text-[var(--cm-sage)] font-medium flex items-center gap-1">
                              <Clock style={{ width: 12, height: 12 }} />
                              {displayTime}
                            </span>
                            {task.clientName && (
                              <span className="text-[12px] text-[var(--cm-text-soft)]">{task.clientName}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => { setSelectedTask(task); setShowTaskCompletionModal(true); }}
                          className="cm-btn-sage text-[13px] px-4 py-1.5 ml-3"
                        >
                          Complete
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Two-column: Today's Schedule + Quick Actions */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-5">
              {/* Today's Schedule — spans 2 columns on desktop */}
              <div className="cm-card cm-card-accent-gold xl:col-span-2">
                <div className="px-5 py-4 border-b border-[var(--cm-ink-line,rgba(18,48,44,0.08))] flex items-center justify-between">
                  <h3 className="cm-display text-base text-ink flex items-center gap-2">
                    <span className="cm-icon-badge cm-icon-badge-gold">
                      <Calendar style={{ width: 18, height: 18 }} />
                    </span>
                    Today's Schedule
                  </h3>
                  <button onClick={() => setActiveTab('schedule')} className="text-[12px] text-[var(--cm-sage)] font-medium hover:underline">
                    View all
                  </button>
                </div>
                <div className="p-4">
                  {(todaySchedule && Array.isArray(todaySchedule) && todaySchedule.length > 0) ? (
                    <div className="space-y-2">
                      {todaySchedule.slice(0, 5).map((schedule) => (
                        <div key={schedule.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--cm-ink-line,rgba(18,48,44,0.06))] hover:shadow-sm transition">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--cm-sage-soft)' }}>
                            <Clock style={{ width: 18, height: 18 }} className="text-[var(--cm-sage)]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-ink truncate">
                              {schedule.client || schedule.title || 'Scheduled Item'}
                            </p>
                            <p className="text-[12px] text-[var(--cm-text-soft)]">
                              {formatTime(schedule.time)}{schedule.duration ? ` · ${schedule.duration}` : ''}
                              {schedule.address ? ` · ${schedule.address}` : ''}
                            </p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${getStatusColor(schedule.status)}`}>
                            {schedule.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar style={{ width: 36, height: 36 }} className="text-[var(--cm-text-soft)]/30 mx-auto mb-2" />
                      <p className="text-sm text-[var(--cm-text-soft)]">No scheduled items for today</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="cm-card cm-card-accent-coral">
                <div className="px-5 py-4 border-b border-[var(--cm-ink-line,rgba(18,48,44,0.08))] flex items-center gap-2">
                  <span className="cm-icon-badge cm-icon-badge-coral">
                    <Activity style={{ width: 18, height: 18 }} />
                  </span>
                  <h3 className="cm-display text-base text-ink">Quick Actions</h3>
                </div>
                <div className="p-4">
                  {isDoctor ? (
                    <div className="grid grid-cols-2 gap-2.5">
                      <button onClick={handleNewConsultation} disabled={!selectedClient}
                        className="flex flex-col items-center p-3.5 rounded-xl border border-[var(--cm-ink-line,rgba(18,48,44,0.08))] hover:bg-cream hover:border-[var(--cm-sage)]/30 transition disabled:opacity-40 disabled:cursor-not-allowed group">
                        <span className="cm-icon-badge cm-icon-badge-sage mb-2 group-hover:scale-105 transition">
                          <Stethoscope style={{ width: 20, height: 20 }} />
                        </span>
                        <span className="text-[12px] font-medium text-ink text-center">Consultation</span>
                      </button>
                      <button onClick={handleWritePrescription} disabled={!selectedClient}
                        className="flex flex-col items-center p-3.5 rounded-xl border border-[var(--cm-ink-line,rgba(18,48,44,0.08))] hover:bg-cream hover:border-[var(--cm-gold)]/30 transition disabled:opacity-40 disabled:cursor-not-allowed group">
                        <span className="cm-icon-badge cm-icon-badge-gold mb-2 group-hover:scale-105 transition">
                          <Pill style={{ width: 20, height: 20 }} />
                        </span>
                        <span className="text-[12px] font-medium text-ink text-center">Prescribe</span>
                      </button>
                      <button onClick={handleCreateCarePlan} disabled={!selectedClient}
                        className="flex flex-col items-center p-3.5 rounded-xl border border-[var(--cm-ink-line,rgba(18,48,44,0.08))] hover:bg-cream hover:border-[var(--cm-ink)]/30 transition disabled:opacity-40 disabled:cursor-not-allowed group">
                        <span className="cm-icon-badge cm-icon-badge-ink mb-2 group-hover:scale-105 transition">
                          <ClipboardList style={{ width: 20, height: 20 }} />
                        </span>
                        <span className="text-[12px] font-medium text-ink text-center">Care Plan</span>
                      </button>
                      <button onClick={() => setActiveTab('messages')}
                        className="flex flex-col items-center p-3.5 rounded-xl border border-[var(--cm-ink-line,rgba(18,48,44,0.08))] hover:bg-cream hover:border-[var(--cm-coral)]/30 transition group">
                        <span className="cm-icon-badge cm-icon-badge-coral mb-2 group-hover:scale-105 transition">
                          <MessageSquare style={{ width: 20, height: 20 }} />
                        </span>
                        <span className="text-[12px] font-medium text-ink text-center">Messages</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                      <button onClick={() => setActiveTab('messages')}
                        className="flex flex-col items-center p-3.5 rounded-xl border border-[var(--cm-ink-line,rgba(18,48,44,0.08))] hover:bg-cream hover:border-[var(--cm-sage)]/30 transition group">
                        <span className="cm-icon-badge cm-icon-badge-sage mb-2 group-hover:scale-105 transition">
                          <MessageSquare style={{ width: 20, height: 20 }} />
                        </span>
                        <span className="text-[12px] font-medium text-ink text-center">Messages</span>
                      </button>
                      <button onClick={() => { if (!selectedClient) { toast.warning('Please select a client first'); return; } setShowNurseReportModal(true); }} disabled={!selectedClient}
                        className="flex flex-col items-center p-3.5 rounded-xl border border-[var(--cm-ink-line,rgba(18,48,44,0.08))] hover:bg-cream hover:border-[var(--cm-gold)]/30 transition disabled:opacity-40 disabled:cursor-not-allowed group">
                        <span className="cm-icon-badge cm-icon-badge-gold mb-2 group-hover:scale-105 transition">
                          <FileText style={{ width: 20, height: 20 }} />
                        </span>
                        <span className="text-[12px] font-medium text-ink text-center">Report</span>
                      </button>
                      <button onClick={() => { if (!selectedClient) { toast.warning('Please select a client first'); return; } setShowCareLogsModal(true); }} disabled={!selectedClient}
                        className="flex flex-col items-center p-3.5 rounded-xl border border-[var(--cm-ink-line,rgba(18,48,44,0.08))] hover:bg-cream hover:border-[var(--cm-coral)]/30 transition disabled:opacity-40 disabled:cursor-not-allowed group">
                        <span className="cm-icon-badge cm-icon-badge-coral mb-2 group-hover:scale-105 transition">
                          <Heart style={{ width: 20, height: 20 }} />
                        </span>
                        <span className="text-[12px] font-medium text-ink text-center">Care Log</span>
                      </button>
                      <button onClick={() => setActiveTab('schedule')}
                        className="flex flex-col items-center p-3.5 rounded-xl border border-[var(--cm-ink-line,rgba(18,48,44,0.08))] hover:bg-cream hover:border-[var(--cm-ink)]/30 transition group">
                        <span className="cm-icon-badge cm-icon-badge-ink mb-2 group-hover:scale-105 transition">
                          <Calendar style={{ width: 20, height: 20 }} />
                        </span>
                        <span className="text-[12px] font-medium text-ink text-center">Schedule</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Tasks + Performance (side by side) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-5">
              {/* Recent Tasks */}
              <div className="cm-card cm-card-accent-sage">
                <div className="px-5 py-4 border-b border-[var(--cm-ink-line,rgba(18,48,44,0.08))] flex items-center justify-between">
                  <h3 className="cm-display text-base text-ink flex items-center gap-2">
                    <span className="cm-icon-badge cm-icon-badge-sage">
                      <CheckSquare style={{ width: 18, height: 18 }} />
                    </span>
                    Recent Tasks
                  </h3>
                  <button onClick={() => setActiveTab('tasks')} className="text-[12px] text-[var(--cm-sage)] font-medium hover:underline">
                    View all
                  </button>
                </div>
                <div className="p-4">
                  {recentTasks.length > 0 ? (
                    <div className="space-y-2">
                      {recentTasks.slice(0, 6).map((task) => {
                        const taskClient = assignedClients.find(c => c.id === task.clientId);
                        const taskClientName = task.clientName || taskClient?.name || taskClient?.fullName || 'Client';
                        const taskTitle = task.title || task.task || task.description || 'Untitled Task';
                        const completedDate = task.completedAt ? toDate(task.completedAt) : (task.updatedAt ? toDate(task.updatedAt) : null);
                        return (
                          <div key={task.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-cream/50 transition">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(107,144,128,0.1)' }}>
                                <CheckCircle style={{ width: 16, height: 16 }} className="text-[var(--cm-sage)]" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-ink truncate">{taskTitle}</p>
                                <p className="text-[11px] text-[var(--cm-text-soft)] truncate">
                                  {taskClientName} · {completedDate ? completedDate.toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Pending'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${getStatusColor(task.status)}`}>
                                {task.status}
                              </span>
                              <button
                                onClick={() => { setSelectedTask(task); setShowTaskDetailsModal(true); }}
                                className="p-1.5 rounded-lg hover:bg-cream text-[var(--cm-text-soft)] transition"
                                title="View details"
                              >
                                <Eye style={{ width: 14, height: 14 }} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckSquare style={{ width: 36, height: 36 }} className="text-[var(--cm-text-soft)]/30 mx-auto mb-2" />
                      <p className="text-sm text-[var(--cm-text-soft)]">No recent tasks</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Performance Overview */}
              <div className="cm-card cm-card-accent-gold">
                <div className="px-5 py-4 border-b border-[var(--cm-ink-line,rgba(18,48,44,0.08))] flex items-center gap-2">
                  <span className="cm-icon-badge cm-icon-badge-gold">
                    <Star style={{ width: 18, height: 18 }} />
                  </span>
                  <h3 className="cm-display text-base text-ink">Performance</h3>
                </div>
                <div className="p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-ink flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: 'var(--cm-sage)' }} />
                      Punctuality
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 sm:w-32 bg-cream rounded-full h-2 overflow-hidden">
                        <div className="h-2 rounded-full" style={{ width: `${performance.punctuality}%`, background: 'linear-gradient(90deg, var(--cm-sage) 0%, #3E5D50 100%)' }} />
                      </div>
                      <span className="text-sm font-bold text-ink w-10 text-right">{performance.punctuality}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-ink flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: 'var(--cm-gold)' }} />
                      Task Completion
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 sm:w-32 bg-cream rounded-full h-2 overflow-hidden">
                        <div className="h-2 rounded-full" style={{ width: `${performance.taskCompletion}%`, background: 'linear-gradient(90deg, var(--cm-gold) 0%, var(--cm-coral) 100%)' }} />
                      </div>
                      <span className="text-sm font-bold text-ink w-10 text-right">{performance.taskCompletion}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-ink flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: 'var(--cm-coral)' }} />
                      Client Satisfaction
                    </span>
                    <div className="flex items-center gap-2">
                      <Star style={{ width: 16, height: 16 }} className="text-[var(--cm-gold)]" />
                      <span className="text-sm font-bold text-ink">{performance.clientSatisfaction}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-ink flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: 'var(--cm-gold)' }} />
                      Communication
                    </span>
                    <div className="flex items-center gap-2">
                      <Star style={{ width: 16, height: 16 }} className="text-[var(--cm-gold)]" />
                      <span className="text-sm font-bold text-ink">{performance.communication}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-ink flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: 'var(--cm-sage)' }} />
                      Safety Record
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 sm:w-32 bg-cream rounded-full h-2 overflow-hidden">
                        <div className="h-2 rounded-full" style={{ width: `${performance.safety}%`, background: 'linear-gradient(90deg, var(--cm-sage) 0%, #3E5D50 100%)' }} />
                      </div>
                      <span className="text-sm font-bold text-ink w-10 text-right">{performance.safety}%</span>
                    </div>
                  </div>
                  {/* Earnings stat */}
                  <div className="pt-3 border-t border-[var(--cm-ink-line,rgba(18,48,44,0.08))] flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[var(--cm-text-soft)]">This Month</span>
                    <span className="text-base font-bold text-[var(--cm-gold-deep)]">₦{(caregiver?.thisMonthEarnings || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Specializations & Certifications — compact */}
            <div className="cm-card cm-card-accent-ink p-4 md:p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="cm-display text-base text-ink flex items-center gap-2">
                  <span className="cm-icon-badge cm-icon-badge-ink">
                    <Award style={{ width: 18, height: 18 }} />
                  </span>
                  Specializations & Certifications
                </h3>
                <button onClick={() => setActiveTab('settings')} className="text-[12px] text-[var(--cm-sage)] font-medium hover:underline">
                  Edit
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {userProfile?.specializations?.length > 0 ? (
                  userProfile.specializations.map((spec, i) => (
                    <span key={`spec-${i}`} className="cm-tag-sage text-[12px]">{spec}</span>
                  ))
                ) : (
                  <span className="text-[12px] text-[var(--cm-text-soft)]">No specializations added</span>
                )}
                {userProfile?.certifications?.length > 0 && (
                  <>
                    {userProfile.certifications.map((cert, i) => (
                      <span key={`cert-${i}`} className="cm-tag-gold text-[12px]">{cert}</span>
                    ))}
                  </>
                )}
              </div>
            </div>
          </>
  );
};

export default DashboardOverview;
