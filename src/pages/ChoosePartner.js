import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { institutionAPI } from '../api/partnerAPI';

const ChoosePartner = () => {
  const navigate = useNavigate();
  const { userProfile } = useUser();
  const [institutions, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const ids = userProfile?.institutionIds || (userProfile?.institutions || []);
        if (!ids || ids.length === 0) {
          setPartners([]);
          setLoading(false);
          return;
        }
        const results = await Promise.all(ids.map(id => institutionAPI.getPartner(id)));
        setPartners(results.filter(Boolean));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userProfile]);

  const choose = (id) => {
    const role = userProfile?.userType || userProfile?.type || userProfile?.role;
    const base = ['doctor','caregiver','nurse','pharmacist'].includes((role||'').toLowerCase())
      ? '/institution-caregiver/dashboard'
      : '/institution-admin/dashboard';
    navigate(`${base}?institution=${encodeURIComponent(id)}`);
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (institutions.length === 0) return <div className="p-6">No institutions assigned.</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Select an Partner</h1>
      <div className="grid grid-cols-1 gap-3">
        {institutions.map((inst) => (
          <button
            key={inst.id}
            onClick={() => choose(inst.id)}
            className="p-4 border rounded-md hover:bg-gray-50 text-left"
          >
            <div className="font-medium">{inst.name}</div>
            <div className="text-sm text-gray-500">{inst.address || inst.city || ''}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChoosePartner;


