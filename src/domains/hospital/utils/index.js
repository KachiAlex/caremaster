export const calculateBedOccupancy = (capacity = 0, occupied = 0) => {
  if (!capacity) return 0;
  return Math.min(100, Math.round((occupied / capacity) * 100));
};

export const getIncidentSeverityLabel = (severity = 'low') => {
  const map = {
    low: { label: 'Low', color: 'text-slate-400' },
    medium: { label: 'Medium', color: 'text-amber-300' },
    high: { label: 'High', color: 'text-rose-300' },
  };
  return map[severity] || map.low;
};

