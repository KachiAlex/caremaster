import React, { useMemo } from 'react';
import { X, Calendar, Clock, ClipboardList, Users } from 'lucide-react';

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const WeeklyCalendar = ({
  onClose,
  tasks = [],
  appointments = [],
}) => {
  const today = useMemo(() => startOfDay(new Date()), []);
  const end = useMemo(() => addDays(today, 6), [today]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(today, i));
  }, [today]);

  const eventsByDay = useMemo(() => {
    const buckets = {};
    weekDays.forEach(d => {
      buckets[startOfDay(d).toDateString()] = { tasks: [], appointments: [] };
    });

    const withinWeek = (ts) => {
      if (!ts) return false;
      const d = new Date(ts);
      const sd = startOfDay(d);
      return sd >= today && sd <= end;
    };

    (Array.isArray(tasks) ? tasks : []).forEach(t => {
      if (!withinWeek(t.scheduledTime)) return;
      const key = startOfDay(new Date(t.scheduledTime)).toDateString();
      if (!buckets[key]) buckets[key] = { tasks: [], appointments: [] };
      buckets[key].tasks.push(t);
    });

    (Array.isArray(appointments) ? appointments : []).forEach(a => {
      if (!withinWeek(a.scheduledTime)) return;
      const key = startOfDay(new Date(a.scheduledTime)).toDateString();
      if (!buckets[key]) buckets[key] = { tasks: [], appointments: [] };
      buckets[key].appointments.push(a);
    });

    return buckets;
  }, [weekDays, tasks, appointments, today, end]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Calendar className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Weekly Overview</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {weekDays.map((day) => {
              const key = startOfDay(day).toDateString();
              const bucket = eventsByDay[key] || { tasks: [], appointments: [] };
              return (
                <div key={key} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-gray-900 font-semibold">
                      {day.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(bucket.tasks.length + bucket.appointments.length)} items
                    </div>
                  </div>
                  <div className="space-y-2">
                    {bucket.appointments.map((a) => (
                      <div key={a.id} className="bg-white rounded border p-2 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{a.clientName || 'Appointment'}</div>
                            <div className="text-xs text-gray-500">{a.type || 'Consultation'}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {a.scheduledTime ? new Date(a.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'TBD'}
                        </div>
                      </div>
                    ))}

                    {bucket.tasks.map((t) => (
                      <div key={t.id} className="bg-white rounded border p-2 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <ClipboardList className="h-4 w-4 text-green-600" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{t.title || 'Task'}</div>
                            <div className="text-xs text-gray-500">{t.Client || t.clientName || ''}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {t.scheduledTime ? new Date(t.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'TBD'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyCalendar;


