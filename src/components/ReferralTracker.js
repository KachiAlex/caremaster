import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  Clock, 
  CheckCircle, 
  MapPin, 
  FileText, 
  Plus,
  Search,
  ExternalLink,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { createReferral, getSentReferrals, updateReferralStatus } from '../api/referralsAPI';
import { toast } from 'react-toastify';

const ReferralTracker = ({ institutionId, userRole }) => {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newReferral, setNewReferral] = useState({
    patientId: '',
    patientName: '',
    referredToFacility: '',
    referralReason: '',
    clinicalNotes: '',
    priority: 'normal'
  });

  useEffect(() => {
    if (institutionId) {
      loadReferrals();
    }
  }, [institutionId]);

  const loadReferrals = async () => {
    try {
      setLoading(true);
      const data = await getSentReferrals(institutionId);
      setReferrals(data);
    } catch (error) {
      console.error('Error loading referrals:', error);
      toast.error('Failed to load referrals');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createReferral({
        ...newReferral,
        referredByInstitutionId: institutionId
      });
      toast.success('Referral submitted successfully');
      setShowAddForm(false);
      loadReferrals();
      setNewReferral({
        patientId: '',
        patientName: '',
        referredToFacility: '',
        referralReason: '',
        clinicalNotes: '',
        priority: 'normal'
      });
    } catch (error) {
      console.error('Error creating referral:', error);
      toast.error('Failed to create referral');
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'sent': return { label: 'Sent', color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock };
      case 'received': return { label: 'Received', color: 'text-purple-600', bg: 'bg-purple-50', icon: CheckCircle };
      case 'appointment_scheduled': return { label: 'Scheduled', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Clock };
      case 'responded': return { label: 'Responded', color: 'text-green-600', bg: 'bg-green-50', icon: MessageSquare };
      case 'closed': return { label: 'Closed', color: 'text-gray-600', bg: 'bg-gray-50', icon: CheckCircle };
      default: return { label: status, color: 'text-gray-600', bg: 'bg-gray-50', icon: AlertCircle };
    }
  };

  const [updatingId, setUpdatingId] = useState(null);
  const [updateForm, setUpdateData] = useState({
    status: '',
    specialistResponse: '',
    nextActions: ''
  });

  const handleUpdateStatus = async (referral) => {
    try {
      await updateReferralStatus(referral.id, updateForm);
      toast.success('Referral updated');
      setUpdatingId(null);
      loadReferrals();
    } catch (error) {
      toast.error('Failed to update referral');
    }
  };

  const filteredReferrals = referrals.filter(r => 
    (r.patientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.referredToFacility || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Referral Tracking</h2>
          <p className="text-sm text-gray-500">Monitor outgoing referrals and specialist feedback</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          New Referral
        </button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by patient or facility..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Create External Referral</h3>
              <button onClick={() => setShowAddForm(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Patient Name</label>
                  <input 
                    required
                    value={newReferral.patientName}
                    onChange={e => setNewReferral({...newReferral, patientName: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Target Facility / Specialist</label>
                  <input 
                    required
                    value={newReferral.referredToFacility}
                    onChange={e => setNewReferral({...newReferral, referredToFacility: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    placeholder="e.g. City General Hospital"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reason for Referral</label>
                <textarea 
                  required
                  value={newReferral.referralReason}
                  onChange={e => setNewReferral({...newReferral, referralReason: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Clinical Notes</label>
                <textarea 
                  value={newReferral.clinicalNotes}
                  onChange={e => setNewReferral({...newReferral, clinicalNotes: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-6 py-2 text-gray-600 font-bold">Cancel</button>
                <button type="submit" className="px-8 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-lg shadow-blue-200">Send Referral</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredReferrals.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
             <FileText className="mx-auto text-gray-300 mb-3" size={48} />
             <p className="text-gray-500">No active referrals found.</p>
          </div>
        ) : (
          filteredReferrals.map(referral => {
            const status = getStatusConfig(referral.status);
            const StatusIcon = status.icon;
            return (
              <div key={referral.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className={`p-3 rounded-xl ${status.bg} ${status.color}`}>
                        <StatusIcon size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg">{referral.patientName}</h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                           <span className="flex items-center gap-1 font-medium text-blue-600"><ArrowRight size={14}/> {referral.referredToFacility}</span>
                           <span>•</span>
                           <span>Sent: {new Date(referral.sentAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${status.bg} ${status.color} border border-current/20`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-50">
                    <div>
                      <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Reason & Notes</h5>
                      <p className="text-sm text-gray-800 font-medium">"{referral.referralReason}"</p>
                      {referral.clinicalNotes && <p className="text-xs text-gray-600 mt-2">{referral.clinicalNotes}</p>}
                    </div>
                    <div>
                      <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Specialist Response</h5>
                      {referral.specialistResponse ? (
                        <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                           <p className="text-xs text-green-800 font-medium">{referral.specialistResponse}</p>
                           {referral.nextActions && (
                             <div className="mt-2 pt-2 border-t border-green-200/50">
                               <p className="text-[10px] font-bold text-green-700 uppercase">Next Action:</p>
                               <p className="text-xs text-green-900 font-bold">{referral.nextActions}</p>
                             </div>
                           )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-400 italic text-xs py-2">
                           <Clock size={14}/> Waiting for specialist review...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {updatingId === referral.id ? (
                  <div className="p-6 bg-blue-50 border-t border-blue-100 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Current Status</label>
                        <select 
                          value={updateForm.status}
                          onChange={e => setUpdateData({...updateForm, status: e.target.value})}
                          className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                        >
                          <option value="sent">Sent</option>
                          <option value="received">Received</option>
                          <option value="appointment_scheduled">Appointment Scheduled</option>
                          <option value="responded">Responded</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Specialist's Response</label>
                      <textarea 
                        value={updateForm.specialistResponse}
                        onChange={e => setUpdateData({...updateForm, specialistResponse: e.target.value})}
                        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Recommended Next Action</label>
                      <input 
                        value={updateForm.nextActions}
                        onChange={e => setUpdateData({...updateForm, nextActions: e.target.value})}
                        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setUpdatingId(null)} className="px-4 py-2 text-sm font-bold text-gray-500">Cancel</button>
                      <button onClick={() => handleUpdateStatus(referral)} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md shadow-blue-200">Update Tracking</button>
                    </div>
                  </div>
                ) : referral.status !== 'closed' && (
                  <div className="bg-gray-50 px-6 py-3 flex justify-end gap-3 border-t border-gray-100">
                    <button 
                      onClick={() => {
                        setUpdatingId(referral.id);
                        setUpdateData({
                          status: referral.status,
                          specialistResponse: referral.specialistResponse || '',
                          nextActions: referral.nextActions || ''
                        });
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Clock size={14}/> Update Status
                    </button>
                    <button className="text-xs font-bold text-gray-600 hover:text-gray-800 flex items-center gap-1">
                      <ExternalLink size={14}/> View Full History
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ReferralTracker;
