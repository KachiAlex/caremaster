import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  FileText,
  Users,
  Activity,
  LayoutGrid,
  CalendarDays,
  X,
} from 'lucide-react';

const toDate = (val) => (val?.toDate ? val.toDate() : new Date(val));

const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_MIN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * AssignmentCalendar — brand-aligned weekly/monthly calendar.
 *
 * Default view: current week (7-day strip). A toggle switches to a full
 * month grid. Clicking any day shows that day's appointments/schedules
 * in a detail panel below.
 *
 * Props:
 *   schedule     — array of { id, type, title, time, client, status, priority, dueDate }
 *   onItemSelect — optional callback(item)
 */
const AssignmentCalendar = ({ schedule = [], onItemSelect }) => {
  const [view, setView] = useState('week'); // 'week' | 'month'
  const [weekAnchor, setWeekAnchor] = useState(new Date()); // any date in the visible week
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDayPanel, setShowDayPanel] = useState(false);

  // ── helpers ──────────────────────────────────────────────────
  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const startOfWeek = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - x.getDay()); // back to Sunday
    return x;
  };

  const addDays = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };

  // ── week days ────────────────────────────────────────────────
  const weekDays = useMemo(() => {
    const start = startOfWeek(weekAnchor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [weekAnchor]);

  // ── month days ───────────────────────────────────────────────
  const monthDays = useMemo(() => {
    const first = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const last = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startPad = first.getDay();
    const days = [];
    for (let i = 0; i < startPad; i++) {
      days.push({ date: addDays(first, -startPad + i), inMonth: false });
    }
    for (let d = 1; d <= last.getDate(); d++) {
      days.push({ date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d), inMonth: true });
    }
    while (days.length < 42) {
      const lastDate = days[days.length - 1].date;
      days.push({ date: addDays(lastDate, 1), inMonth: false });
    }
    return days;
  }, [currentMonth]);

  // ── group items by date ──────────────────────────────────────
  const itemsByDate = useMemo(() => {
    const buckets = {};
    (Array.isArray(schedule) ? schedule : []).forEach((item) => {
      if (!item) return;
      let d = item.time ? toDate(item.time) : null;
      if (!d || isNaN(d.getTime())) {
        if (item.dueDate) {
          d = new Date(item.dueDate);
        }
      }
      if (!d || isNaN(d.getTime())) return;
      const key = d.toDateString();
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(item);
    });
    return buckets;
  }, [schedule]);

  const selectedDayItems = useMemo(
    () => (itemsByDate[selectedDate.toDateString()] || []).sort((a, b) => toDate(a.time) - toDate(b.time)),
    [itemsByDate, selectedDate]
  );

  const isPast = (item) => {
    if (!item?.time) return false;
    const d = toDate(item.time);
    return item.status !== 'completed' && d < new Date();
  };

  // ── brand-aligned helpers ────────────────────────────────────
  const typeIcon = (type) => {
    if (type === 'appointment') return <Users style={{ width: 12, height: 12 }} />;
    if (type === 'task') return <Activity style={{ width: 12, height: 12 }} />;
    return <FileText style={{ width: 12, height: 12 }} />;
  };

  const typeChip = (type, past) => {
    if (past) return { bg: 'rgba(221,110,79,0.15)', color: '#DD6E4F' };
    if (type === 'appointment') return { bg: 'rgba(107,144,128,0.15)', color: '#3E5D50' };
    if (type === 'task') return { bg: 'rgba(217,164,65,0.15)', color: '#B9832E' };
    return { bg: 'rgba(18,48,44,0.08)', color: '#12302C' };
  };

  const typeBorder = (type, past) => {
    if (past) return '#DD6E4F';
    if (type === 'appointment') return '#6B9080';
    if (type === 'task') return '#D9A441';
    return '#12302C';
  };

  const today = new Date();
  const monthLabel = `${MONTHS[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
  const weekLabel = `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  // Count for visible period
  const visibleCount = useMemo(() => {
    const dates = view === 'week' ? weekDays : monthDays.filter((d) => d.inMonth).map((d) => d.date);
    return dates.reduce((sum, d) => sum + (itemsByDate[d.toDateString()] || []).length, 0);
  }, [view, weekDays, monthDays, itemsByDate]);

  const brandGradient = 'linear-gradient(135deg, var(--cm-sage) 0%, var(--cm-ink) 100%)';
  const brandGradientGold = 'linear-gradient(135deg, var(--cm-gold) 0%, var(--cm-coral) 100%)';
  const brandGradientCoral = 'linear-gradient(135deg, var(--cm-coral) 0%, #B83A2B 100%)';

  const getDayDotColor = (count) => {
    if (count === 0) return 'var(--cm-sage)';
    if (count <= 2) return 'var(--cm-gold)';
    return 'var(--cm-coral)';
  };

  // ── day click handler ────────────────────────────────────────
  const handleDayClick = (date) => {
    setSelectedDate(date);
    setShowDayPanel(true);
  };

  // ── navigation ───────────────────────────────────────────────
  const goPrev = () => {
    if (view === 'week') setWeekAnchor(addDays(weekAnchor, -7));
    else setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  const goNext = () => {
    if (view === 'week') setWeekAnchor(addDays(weekAnchor, 7));
    else setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  const goToday = () => {
    const now = new Date();
    setWeekAnchor(now);
    setCurrentMonth(now);
    setSelectedDate(now);
  };

  // ── render ───────────────────────────────────────────────────
  return (
    <div className="cm-card overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[var(--cm-ink-line,rgba(18,48,44,0.08))]"
        style={{ background: 'linear-gradient(180deg, rgba(107,144,128,0.04) 0%, rgba(255,255,255,0) 100%)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: brandGradient }}>
            <Calendar className="text-white" style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h2 className="cm-display text-base text-ink leading-tight">Schedule</h2>
            <p className="text-[11px] text-[var(--cm-text-soft)]">
              {visibleCount} item{visibleCount !== 1 ? 's' : ''} {view === 'week' ? 'this week' : 'this month'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* View toggle */}
          <div className="flex items-center bg-[var(--cm-cream,#FBF7EF)] rounded-lg p-0.5 border border-[var(--cm-ink-line,rgba(18,48,44,0.08))]">
            <button
              onClick={() => setView('week')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition ${
                view === 'week'
                  ? 'bg-white text-ink shadow-sm ring-1 ring-[var(--cm-sage)]/20'
                  : 'text-[var(--cm-text-soft)] hover:text-[var(--cm-sage)]'
              }`}
            >
              <LayoutGrid style={{ width: 13, height: 13 }} />
              <span className="hidden sm:inline">Week</span>
            </button>
            <button
              onClick={() => setView('month')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition ${
                view === 'month'
                  ? 'bg-white text-ink shadow-sm ring-1 ring-[var(--cm-sage)]/20'
                  : 'text-[var(--cm-text-soft)] hover:text-[var(--cm-sage)]'
              }`}
            >
              <CalendarDays style={{ width: 13, height: 13 }} />
              <span className="hidden sm:inline">Month</span>
            </button>
          </div>

          {/* Nav */}
          <button
            onClick={goPrev}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded-lg hover:bg-cream hover:text-[var(--cm-sage)] transition text-[var(--cm-text-soft)]"
            aria-label="Previous"
          >
            <ChevronLeft style={{ width: 18, height: 18 }} />
          </button>
          <span className="text-[13px] font-semibold text-ink min-w-0 text-center truncate px-1" style={{ minWidth: 90 }}>
            {view === 'week' ? weekLabel : monthLabel}
          </span>
          <button
            onClick={goNext}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded-lg hover:bg-cream hover:text-[var(--cm-sage)] transition text-[var(--cm-text-soft)]"
            aria-label="Next"
          >
            <ChevronRight style={{ width: 18, height: 18 }} />
          </button>
          <button
            onClick={goToday}
            className="ml-1 px-2.5 py-1.5 min-h-[36px] text-[12px] font-semibold text-white rounded-lg hover:opacity-90 transition shadow-sm"
            style={{ background: brandGradient }}
          >
            Today
          </button>
        </div>
      </div>

      {/* ── Week View ─────────────────────────────────────────── */}
      {view === 'week' && (
        <div className="p-3 sm:p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {weekDays.map((d, i) => (
              <div key={i} className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--cm-text-soft)] hidden sm:block">
                  {WD_SHORT[d.getDay()]}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--cm-text-soft)] sm:hidden">
                  {WD_MIN[d.getDay()]}
                </p>
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((d, i) => {
              const items = itemsByDate[d.toDateString()] || [];
              const isToday = isSameDay(d, today);
              const isSelected = isSameDay(d, selectedDate);

              return (
                <button
                  key={i}
                  onClick={() => handleDayClick(d)}
                  className={`relative min-h-[80px] sm:min-h-[110px] p-1.5 sm:p-2 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-[var(--cm-gold)] bg-[rgba(217,164,65,0.06)] ring-1 ring-[var(--cm-gold)]'
                      : isToday
                      ? 'border-[var(--cm-sage)] bg-[var(--cm-sage-soft,#DDE7DF)]/40'
                      : 'border-[var(--cm-ink-line,rgba(18,48,44,0.08))] hover:border-[var(--cm-sage)] hover:bg-cream/50'
                  }`}
                >
                  <div className={`text-[13px] sm:text-sm font-semibold mb-1 ${
                    isToday ? 'text-[var(--cm-sage)]' : 'text-ink'
                  }`}>
                    {d.getDate()}
                    {isToday && <span className="text-[9px] ml-1 uppercase hidden sm:inline">Today</span>}
                  </div>
                  <div className="space-y-0.5">
                    {items.slice(0, 3).map((item, idx) => {
                      const past = isPast(item);
                      const chip = typeChip(item.type, past);
                      return (
                        <div
                          key={idx}
                          className="text-[10px] sm:text-[11px] leading-tight rounded px-1 py-0.5 truncate flex items-center gap-1"
                          style={{ background: chip.bg, color: chip.color }}
                          title={item.title}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDayClick(d);
                            if (onItemSelect) onItemSelect(item);
                          }}
                        >
                          {typeIcon(item.type)}
                          <span className="truncate hidden sm:inline">{item.title}</span>
                          <span className="truncate sm:hidden">•</span>
                        </div>
                      );
                    })}
                    {items.length > 3 && (
                      <div className="text-[10px] text-[var(--cm-text-soft)] font-medium">
                        +{items.length - 3} more
                      </div>
                    )}
                  </div>
                  {/* Dot indicator for mobile when items exist but are hidden */}
                  {items.length > 0 && items.length <= 3 && (
                    <span className="absolute bottom-1 right-1 sm:hidden w-1.5 h-1.5 rounded-full" style={{ background: getDayDotColor(items.length) }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Month View ────────────────────────────────────────── */}
      {view === 'month' && (
        <div className="p-3 sm:p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WD_SHORT.map((day) => (
              <div key={day} className="text-center text-[11px] font-semibold text-[var(--cm-text-soft)] py-1.5">
                {day}
              </div>
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((dayObj, i) => {
              const items = itemsByDate[dayObj.date.toDateString()] || [];
              const isToday = isSameDay(dayObj.date, today);
              const isSelected = isSameDay(dayObj.date, selectedDate);

              return (
                <button
                  key={i}
                  onClick={() => handleDayClick(dayObj.date)}
                  className={`min-h-[60px] sm:min-h-[80px] p-1.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-[var(--cm-gold)] bg-[rgba(217,164,65,0.06)] ring-1 ring-[var(--cm-gold)]'
                      : isToday
                      ? 'border-[var(--cm-sage)] bg-[var(--cm-sage-soft,#DDE7DF)]/40'
                      : dayObj.inMonth
                      ? 'border-[var(--cm-ink-line,rgba(18,48,44,0.08))] hover:border-[var(--cm-sage)] hover:bg-cream/50'
                      : 'border-transparent bg-cream/30 text-[var(--cm-text-soft)]'
                  }`}
                >
                  <div className={`text-[12px] font-semibold mb-0.5 ${
                    isToday ? 'text-[var(--cm-sage)]' : dayObj.inMonth ? 'text-ink' : 'text-[var(--cm-text-soft)]'
                  }`}>
                    {dayObj.date.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {items.slice(0, 2).map((item, idx) => {
                      const past = isPast(item);
                      const chip = typeChip(item.type, past);
                      return (
                        <div
                          key={idx}
                          className="text-[10px] leading-tight rounded px-1 py-0.5 truncate flex items-center gap-1"
                          style={{ background: chip.bg, color: chip.color }}
                          title={item.title}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDayClick(dayObj.date);
                            if (onItemSelect) onItemSelect(item);
                          }}
                        >
                          <span className="truncate hidden sm:inline">{item.title}</span>
                          <span className="truncate sm:hidden">•</span>
                        </div>
                      );
                    })}
                    {items.length > 2 && (
                      <div className="text-[10px] text-[var(--cm-text-soft)] font-medium">+{items.length - 2}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Day Detail Panel (slide-up) ───────────────────────── */}
      {showDayPanel && (
        <div className="border-t border-[var(--cm-ink-line,rgba(18,48,44,0.08))]" style={{ background: 'linear-gradient(180deg, rgba(107,144,128,0.06) 0%, rgba(251,247,239,0.3) 100%)' }}>
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[var(--cm-ink-line,rgba(18,48,44,0.08))]">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--cm-text-soft)]">Selected Day</p>
              <h3 className="cm-display text-base text-ink">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[var(--cm-text-soft)]">
                {selectedDayItems.length} item{selectedDayItems.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setShowDayPanel(false)}
                className="p-1.5 rounded-lg hover:bg-white transition text-[var(--cm-text-soft)]"
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>

          <div className="p-3 sm:p-4 max-h-[320px] overflow-y-auto">
            {selectedDayItems.length === 0 ? (
              <div className="text-center py-8">
                <Calendar style={{ width: 36, height: 36 }} className="text-[var(--cm-text-soft)]/30 mx-auto mb-2" />
                <p className="text-sm text-[var(--cm-text-soft)]">No assignments for this day</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayItems.map((item) => {
                  const past = isPast(item);
                  const borderColor = typeBorder(item.type, past);
                  const chip = typeChip(item.type, past);
                  const itemTime = toDate(item.time);

                  return (
                    <div
                      key={item.id}
                      onClick={() => onItemSelect && onItemSelect(item)}
                      className="rounded-xl p-3 cursor-pointer bg-white border-l-4 transition hover:shadow-sm"
                      style={{ borderLeftColor: borderColor }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-ink truncate flex items-center gap-1.5">
                            {past && <AlertTriangle style={{ width: 13, height: 13 }} className="text-coral" />}
                            {item.title}
                          </p>
                          <p className="text-[12px] text-[var(--cm-text-soft)] mt-0.5 truncate">
                            {item.client || 'Client'}
                          </p>
                        </div>
                        <div className="text-[11px] text-[var(--cm-text-soft)] flex items-center shrink-0">
                          <Clock style={{ width: 12, height: 12 }} className="mr-1" />
                          {itemTime && !isNaN(itemTime.getTime())
                            ? itemTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'TBD'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium capitalize"
                          style={{ background: chip.bg, color: chip.color }}
                        >
                          {item.type}
                        </span>
                        {item.priority && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            item.priority === 'urgent' ? 'bg-[rgba(221,110,79,0.15)] text-coral' :
                            item.priority === 'high' ? 'bg-[rgba(217,164,65,0.15)] text-[var(--cm-gold-deep)]' :
                            item.priority === 'medium' ? 'bg-[rgba(217,164,65,0.1)] text-[var(--cm-gold-deep)]' :
                            'bg-[var(--cm-ink-line,rgba(18,48,44,0.08))] text-[var(--cm-text-soft)]'
                          }`}>
                            {item.priority}
                          </span>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          item.status === 'completed' ? 'bg-[rgba(107,144,128,0.15)] text-[var(--cm-sage)]' :
                          item.status === 'in_progress' ? 'bg-[rgba(107,144,128,0.1)] text-[var(--cm-sage)]' :
                          past ? 'bg-[rgba(221,110,79,0.15)] text-coral' :
                          'bg-[var(--cm-ink-line,rgba(18,48,44,0.08))] text-[var(--cm-text-soft)]'
                        }`}>
                          {past ? 'overdue' : (item.status || 'pending')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentCalendar;
