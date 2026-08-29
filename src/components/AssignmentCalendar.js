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
} from 'lucide-react';

const toDate = (val) => val?.toDate ? val.toDate() : new Date(val);

/**
 * AssignmentCalendar — a month-grid calendar that displays assignments,
 * tasks, and appointments plotted on their due dates.
 *
 * Props:
 *   schedule    — array of { id, type, title, time, client, status, priority, description, dueDate }
 *   onItemSelect— optional callback(item) when a calendar item is clicked
 */
const AssignmentCalendar = ({ schedule = [], onItemSelect }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // --- helpers ---
  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const monthDays = useMemo(() => {
    const first = startOfMonth(currentMonth);
    const last = endOfMonth(currentMonth);
    // Start from the Sunday of the week containing the 1st
    const startPad = first.getDay();
    const days = [];
    for (let i = 0; i < startPad; i++) {
      days.push({ date: new Date(first.getFullYear(), first.getMonth(), -startPad + i + 1), inMonth: false });
    }
    for (let d = 1; d <= last.getDate(); d++) {
      days.push({ date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d), inMonth: true });
    }
    // Pad to 6 weeks (42 cells)
    while (days.length < 42) {
      const lastDate = days[days.length - 1].date;
      days.push({ date: new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate() + 1), inMonth: false });
    }
    return days;
  }, [currentMonth]);

  // Group schedule items by date string
  const itemsByDate = useMemo(() => {
    const buckets = {};
    (Array.isArray(schedule) ? schedule : []).forEach((item) => {
      if (!item || !item.time) return;
      const d = toDate(item.time);
      if (isNaN(d.getTime())) {
        // Try dueDate as fallback
        if (item.dueDate) {
          const dd = new Date(item.dueDate);
          if (!isNaN(dd.getTime())) {
            const key = dd.toDateString();
            if (!buckets[key]) buckets[key] = [];
            buckets[key].push(item);
          }
        }
        return;
      }
      const key = d.toDateString();
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(item);
    });
    return buckets;
  }, [schedule]);

  const selectedDayItems = useMemo(() => {
    return itemsByDate[selectedDate.toDateString()] || [];
  }, [itemsByDate, selectedDate]);

  const isPast = (item) => {
    if (!item?.time) return false;
    const d = toDate(item.time);
    return item.status !== 'completed' && d < new Date();
  };

  const typeIcon = (type) => {
    if (type === 'appointment') return <Users className="h-3 w-3" />;
    if (type === 'task') return <Activity className="h-3 w-3" />;
    return <FileText className="h-3 w-3" />;
  };

  const typeColor = (type, past) => {
    if (past) return 'bg-red-500 text-white';
    if (type === 'appointment') return 'bg-blue-500 text-white';
    if (type === 'task') return 'bg-green-500 text-white';
    return 'bg-purple-500 text-white';
  };

  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const today = new Date();

  // Count totals for the current month
  const monthItemCount = useMemo(() => {
    let count = 0;
    monthDays.forEach((d) => {
      if (d.inMonth) {
        count += (itemsByDate[d.date.toDateString()] || []).length;
      }
    });
    return count;
  }, [monthDays, itemsByDate]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-blue-600" />
          <div>
            <h2 className="text-lg font-bold text-gray-900">Assignment Calendar</h2>
            <p className="text-xs text-gray-500">{monthItemCount} item{monthItemCount !== 1 ? 's' : ''} this month</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-gray-900 min-w-[140px] text-center">{monthLabel}</span>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}
            className="ml-2 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
          >
            Today
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Calendar Grid */}
        <div className="flex-1 p-3 sm:p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((dayObj, i) => {
              const key = dayObj.date.toDateString();
              const items = itemsByDate[key] || [];
              const isToday = isSameDay(dayObj.date, today);
              const isSelected = isSameDay(dayObj.date, selectedDate);

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(dayObj.date)}
                  className={`min-h-[70px] sm:min-h-[90px] p-1.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                      : isToday
                      ? 'border-blue-300 bg-blue-50/50'
                      : dayObj.inMonth
                      ? 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                      : 'border-transparent bg-gray-50/50 text-gray-400'
                  }`}
                >
                  <div className={`text-xs font-semibold mb-1 ${isToday ? 'text-blue-600' : dayObj.inMonth ? 'text-gray-700' : 'text-gray-400'}`}>
                    {dayObj.date.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {items.slice(0, 3).map((item, idx) => {
                      const past = isPast(item);
                      return (
                        <div
                          key={idx}
                          className={`text-[10px] leading-tight rounded px-1 py-0.5 truncate flex items-center gap-1 ${typeColor(item.type, past)}`}
                          title={item.title}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(dayObj.date);
                            if (onItemSelect) onItemSelect(item);
                          }}
                        >
                          {typeIcon(item.type)}
                          <span className="truncate">{item.title}</span>
                        </div>
                      );
                    })}
                    {items.length > 3 && (
                      <div className="text-[10px] text-gray-500 font-medium">+{items.length - 3} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details Panel */}
        <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-100 p-4 bg-gray-50/50">
          <div className="mb-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">Selected Day</p>
            <h3 className="text-lg font-bold text-gray-900">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">{selectedDayItems.length} item{selectedDayItems.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {selectedDayItems.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No assignments for this day</p>
              </div>
            ) : (
              selectedDayItems
                .sort((a, b) => toDate(a.time) - toDate(b.time))
                .map((item) => {
                  const past = isPast(item);
                  const itemTime = toDate(item.time);
                  return (
                    <div
                      key={item.id}
                      onClick={() => onItemSelect && onItemSelect(item)}
                      className={`rounded-lg p-3 cursor-pointer border-l-4 transition hover:shadow-sm ${
                        past
                          ? 'bg-red-50 border-red-500'
                          : item.type === 'appointment'
                          ? 'bg-blue-50 border-blue-500'
                          : item.type === 'task'
                          ? 'bg-green-50 border-green-500'
                          : 'bg-purple-50 border-purple-500'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${past ? 'text-red-900' : 'text-gray-900'}`}>
                            {past && <AlertTriangle className="h-3 w-3 inline mr-1 text-red-600" />}
                            {item.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5 truncate">
                            {item.client || 'Client'}
                          </p>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center shrink-0 ml-2">
                          <Clock className="h-3 w-3 mr-1" />
                          {itemTime && !isNaN(itemTime.getTime())
                            ? itemTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'TBD'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize ${
                          past ? 'bg-red-100 text-red-700' :
                          item.type === 'appointment' ? 'bg-blue-100 text-blue-700' :
                          item.type === 'task' ? 'bg-green-100 text-green-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {item.type}
                        </span>
                        {item.priority && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            item.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                            item.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                            item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {item.priority}
                          </span>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          item.status === 'completed' ? 'bg-green-100 text-green-700' :
                          item.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          past ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {past ? 'overdue' : (item.status || 'pending')}
                        </span>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentCalendar;
