import React, { useEffect, useState } from 'react';
import { MapPin, Navigation, Clock, Users } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { getClientsByCaregiver } from '../api/patientsAPI';

const RouteOptimization = () => {
  const { userProfile } = useUser();
  const [loading, setLoading] = useState(true);
  const [clients, setPatients] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const caregiverId = userProfile?.id || userProfile?.uid;
        if (!caregiverId) return;
        const pts = await getClientsByCaregiver(caregiverId).catch(() => []);
        setPatients(Array.isArray(pts) ? pts : []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userProfile?.id, userProfile?.uid]);

  const buildMapsUrl = (Client) => {
    const destination = encodeURIComponent(
      client.address || client.location || `${client.city || ''} ${client.state || ''}`.trim()
    );
    if (!destination) return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading routes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MapPin className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Route Optimization</h1>
          </div>
          <div className="text-sm text-gray-600 flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>{clients.length} assigned clients</span>
          </div>
        </div>
        <p className="text-gray-600 mt-2">Tap a Client to open turn-by-turn navigation in your maps app.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((p) => {
          const mapsUrl = buildMapsUrl(p);
          return (
            <div key={p.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold text-gray-900">{p.name || 'Client'}</div>
                  <div className="text-sm text-gray-600">{p.address || p.location || p.city || 'Address unavailable'}</div>
                  <div className="text-xs text-gray-500 mt-1">{p.phone || p.contactPhone || ''}</div>
                </div>
                <Clock className="h-5 w-5 text-gray-400" />
              </div>
              <div className="mt-4">
                <a
                  href={mapsUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex items-center px-4 py-2 rounded-md text-white ${mapsUrl ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
                  onClick={(e) => { if (!mapsUrl) e.preventDefault(); }}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Start Navigation
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RouteOptimization;


