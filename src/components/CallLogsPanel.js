import React, { useEffect, useState } from 'react';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video } from 'lucide-react';
import CallService from '../services/callService';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'received', label: 'Received' },
  { key: 'missed', label: 'Missed' },
  { key: 'outgoing', label: 'Outgoing' }
];

const CallLogsPanel = ({ userId }) => {
  const [calls, setCalls] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [callService] = useState(() => new CallService());

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true);
      const data = await callService.getUserCalls(userId, filter, 100);
      setCalls(data);
      setLoading(false);
    };
    load();
  }, [userId, filter, callService]);

  const iconFor = (c) => {
    if (c.direction === 'incoming' && (c.status === 'initiating' || c.status === 'rejected')) return <PhoneMissed className="h-4 w-4 text-red-600"/>;
    if (c.direction === 'incoming') return <PhoneIncoming className="h-4 w-4 text-green-600"/>;
    return <PhoneOutgoing className="h-4 w-4 text-blue-600"/>;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center space-x-2">
          <Phone className="h-5 w-5 text-gray-600"/>
          <h3 className="font-semibold text-gray-800">Call Logs</h3>
        </div>
        <div className="flex items-center space-x-2">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`px-2 py-1 text-sm rounded ${filter===f.key? 'bg-blue-600 text-white':'bg-gray-100 text-gray-700'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="p-4 text-sm text-gray-500">Loading...</div>
      ) : calls.length === 0 ? (
        <div className="p-4 text-sm text-gray-500">No calls to display</div>
      ) : (
        <ul className="divide-y">
          {calls.map((c) => (
            <li key={c.id} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {iconFor(c)}
                <div>
                  <div className="text-sm font-medium text-gray-800 capitalize">{c.callType || 'voice'}</div>
                  <div className="text-xs text-gray-500">{c.status} • {c.direction}</div>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {c.createdAt?.toDate?.()?.toLocaleString?.() || ''}
              </div>
            </li>)
          )}
        </ul>
      )}
    </div>
  );
};

export default CallLogsPanel;


