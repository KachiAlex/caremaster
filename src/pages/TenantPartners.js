import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { institutionAPI } from '../api/institutionAPI';
import { Building2, Shield, Stethoscope, Pill, Plus, Info } from 'lucide-react';

const RequestPartnerModal = ({ isOpen, onClose }) => {
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const submit = (e) => {
    e.preventDefault();
    alert('Request submitted. Our team will reach out shortly.');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
        <div className="p-5 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Request to become a Tenant Partner</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Organization Name</label>
            <input value={orgName} onChange={e=>setOrgName(e.target.value)} required className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Website (optional)</label>
            <input value={website} onChange={e=>setWebsite(e.target.value)} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Message</label>
            <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={4} className="w-full border rounded-md px-3 py-2"/>
          </div>
          <div className="pt-2 flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white">Submit Request</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TenantPartners = () => {
  const navigate = useNavigate();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // For now, we’ll list a few institutions by reading slugs/domains example.
    // In a full implementation, we’d query the institutions collection (requires read security rules).
    // Here we show placeholders and rely on admin-prepared links when clicked.
    (async () => {
      try {
        // Placeholder sample partners; swap for a query if allowed.
        const base = window.location.origin;
        setPartners([
          { id: 'YlRg0VHMK9BrvPQuYXqm', name: 'Bulah Health Care', city: 'Lagos', logo: null },
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const goToPortals = (id) => {
    // Show portal choices; for now navigate to admin; the portal switcher also exists in dashboards.
    navigate(`/tenant/${id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
            <Building2 className="h-7 w-7 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome, Tenant Partners</h1>
          <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
            ElderX helps healthcare institutions deliver modern, connected elder-care. Manage staff, coordinate care, communicate in real time, and streamline pharmacy workflows—all in one secure platform.
          </p>
          <div className="mt-4 inline-flex items-center text-blue-700 bg-blue-50 px-3 py-1 rounded-full text-sm">
            <Info className="h-4 w-4 mr-1"/> Multi-institution support. Role-based portals for Admin, Caregivers, and Pharmacists.
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Current Tenant Partners</h2>
          <button onClick={()=>setShowModal(true)} className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2"/> Request to become a partner
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading partners...</div>
        ) : partners.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No tenant partners yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {partners.map(p => (
              <div key={p.id} className="bg-white rounded-xl border hover:shadow-md transition p-5 flex flex-col">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <Building2 className="h-5 w-5 text-blue-600"/>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.city || '—'}</div>
                  </div>
                </div>
                <div className="text-sm text-gray-600 flex-1">
                  Secure, role-based portals:
                  <div className="mt-2 space-x-2">
                    <button onClick={()=>navigate(`/institution-admin/dashboard?institution=${encodeURIComponent(p.id)}`)} className="px-2 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 inline-flex items-center text-xs"><Shield className="h-3 w-3 mr-1"/> Admin</button>
                    <button onClick={()=>navigate(`/institution-caregiver/dashboard?institution=${encodeURIComponent(p.id)}`)} className="px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 inline-flex items-center text-xs"><Stethoscope className="h-3 w-3 mr-1"/> Caregiver</button>
                    <button onClick={()=>navigate(`/institution-caregiver/dashboard?institution=${encodeURIComponent(p.id)}#pharmacy`)} className="px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 inline-flex items-center text-xs"><Pill className="h-3 w-3 mr-1"/> Pharmacist</button>
                  </div>
                </div>
                <div className="pt-4">
                  <button onClick={()=>goToPortals(p.id)} className="w-full px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200">Open Institution</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-xl border">
            <h3 className="font-semibold text-gray-900 mb-2">For Administrators</h3>
            <p className="text-sm text-gray-600">Onboard staff, manage roles, configure custom links, and monitor operations in real time with analytics and alerts.</p>
          </div>
          <div className="bg-white p-5 rounded-xl border">
            <h3 className="font-semibold text-gray-900 mb-2">For Care Teams</h3>
            <p className="text-sm text-gray-600">Coordinate patient care, manage schedules and tasks, message securely, and run telemedicine calls—all in one place.</p>
          </div>
          <div className="bg-white p-5 rounded-xl border">
            <h3 className="font-semibold text-gray-900 mb-2">For Pharmacy</h3>
            <p className="text-sm text-gray-600">Streamline prescription workflows and medication management integrated with the care team’s daily operations.</p>
          </div>
        </div>
      </div>
      <RequestPartnerModal isOpen={showModal} onClose={()=>setShowModal(false)} />
    </div>
  );
};

export default TenantPartners;


