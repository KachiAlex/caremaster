import React, { useState } from 'react';
import { 
  CheckCircle, 
  Clock, 
  User, 
  Stethoscope, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  PenTool, 
  Lock,
  MessageSquare,
  ShieldAlert,
  ArrowRightCircle
} from 'lucide-react';
import { acknowledgeNurseReport } from '../api/nurseReportsAPI';
import { toast } from 'react-toastify';

const NurseReportCard = ({ report, isDoctor, currentUserId, currentUserName, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState('');

  const handleAcknowledge = async () => {
    if (!currentUserId) return;
    setIsAcknowledging(true);
    try {
      await acknowledgeNurseReport(report.id, currentUserId, currentUserName, doctorNotes);
      toast.success('Report acknowledged and nurse notified.');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error acknowledging report:', error);
      toast.error('Failed to acknowledge report.');
    } finally {
      setIsAcknowledging(false);
    }
  };

  const getPriorityConfig = (code) => {
    switch ((code || '').toLowerCase()) {
      case 'red': return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'CRITICAL' };
      case 'orange': return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', label: 'URGENT' };
      case 'yellow': return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: 'STATUS CHANGE' };
      default: return { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-700', label: 'STABLE' };
    }
  };

  const config = getPriorityConfig(report.priorityCode || report.priority);
  const isAcknowledged = report.feedbackStatus === 'acknowledged';

  return (
    <div className={`rounded-2xl border transition-all duration-300 shadow-sm overflow-hidden ${config.bg} ${config.border}`}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <div className={`p-2.5 rounded-xl bg-white shadow-sm ${config.text}`}>
              <Stethoscope size={20} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h4 className="font-bold text-gray-900">{report.nurseName || 'Nurse'}</h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${config.bg} ${config.border} ${config.text}`}>
                  {config.label}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Clock size={12}/> {new Date(report.createdAt).toLocaleString()}</span>
                <span>•</span>
                <span className="capitalize">{report.shiftStart || report.shift} Shift</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-black/5 rounded-full transition"
          >
            {isExpanded ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
          </button>
        </div>

        {/* Vital Signs Preview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 py-3 border-y border-black/5">
          <div className="text-center border-r border-black/5">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Condition</p>
            <p className={`text-sm font-bold capitalize ${config.text}`}>{report.patientCondition || 'Stable'}</p>
          </div>
          <div className="text-center border-r border-black/5">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Mental State</p>
            <p className="text-sm font-bold text-gray-700 capitalize">{report.mentalStatus || 'Alert'}</p>
          </div>
          <div className="text-center border-r border-black/5">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Pain</p>
            <p className="text-sm font-bold text-gray-700">{report.painLevel || 0}/10</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase">NEWS Score</p>
            <div className="flex items-center justify-center gap-1">
               <span className={`text-sm font-black ${report.newsScore >= 5 ? 'text-red-600' : 'text-gray-900'}`}>{report.newsScore || 0}</span>
               {report.newsScore >= 5 && <ShieldAlert size={12} className="text-red-600 animate-pulse" />}
            </div>
          </div>
        </div>

        {/* Expanded View */}
        {isExpanded && (
          <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-top-2">
            {/* SBAR Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-white/60 p-4 rounded-xl border border-black/5">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">S - Situation</p>
                  <p className="text-sm text-gray-800 leading-relaxed italic">"{report.situation}"</p>
                </div>
                <div className="bg-white/60 p-4 rounded-xl border border-black/5">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">B - Background</p>
                  <p className="text-sm text-gray-800 whitespace-pre-line">{report.background || 'No historical background provided.'}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-white/60 p-4 rounded-xl border border-black/5">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">A - Assessment</p>
                  <p className="text-sm text-gray-800 whitespace-pre-line">{report.assessment || 'No detailed assessment provided.'}</p>
                </div>
                <div className="bg-white/60 p-4 rounded-xl border border-black/5">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">R - Recommendation</p>
                  <p className="text-sm font-bold text-gray-900 leading-relaxed italic text-blue-900">"{report.recommendation || 'Continue routine care.'}"</p>
                </div>
              </div>
            </div>

            {/* Coded Observations List */}
            {report.codedObservations && report.codedObservations.length > 0 && (
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                  <ShieldAlert size={14}/> Clinical Findings
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {report.codedObservations.map((obs, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-black/5 text-sm flex gap-3 items-center">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityConfig(obs.code).text.replace('text', 'bg')}`} />
                      <span className="text-gray-700">{obs.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Photos */}
            {report.photos && report.photos.length > 0 && (
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-gray-500 uppercase">Clinical Photo Documentation</h5>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {report.photos.map((p, i) => (
                    <img key={i} src={p.url || p} alt="Clinical evidence" className="h-24 w-24 object-cover rounded-xl border border-white shadow-sm flex-shrink-0" />
                  ))}
                </div>
              </div>
            )}

            {/* Attestation */}
            <div className="flex items-center gap-3 py-3 border-t border-black/5 text-[11px] text-gray-500">
               <PenTool size={14} className="text-green-600" />
               <span>Digitally signed by <strong>{report.nurseName}</strong> (ID: {report.nurseId || 'verified'}) via CareMaster Clinical Audit.</span>
               <Lock size={10} />
            </div>

            {/* Acknowledgment Section */}
            {(isDoctor || isAcknowledged) && (
              <div className={`mt-6 p-6 rounded-2xl border ${isAcknowledged ? 'bg-green-100 border-green-200' : 'bg-white border-blue-200 shadow-lg shadow-blue-100'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h5 className="font-bold text-gray-900 flex items-center gap-2">
                    <CheckCircle className={isAcknowledged ? 'text-green-600' : 'text-blue-600'} size={20} />
                    {isAcknowledged ? 'Report Acknowledged' : 'Doctor Clinical Review'}
                  </h5>
                  {isAcknowledged && (
                    <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">
                      Verified {new Date(report.acknowledgedAt).toLocaleString()}
                    </span>
                  )}
                </div>

                {isAcknowledged ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-800 leading-relaxed font-medium italic">
                      <MessageSquare size={14} className="inline mr-2 text-green-600" />
                      "{report.doctorNotes || 'No notes provided.'}"
                    </p>
                    <p className="text-xs text-gray-500 font-bold">— Reviewed by Dr. {report.acknowledgedBy}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <textarea 
                      placeholder="Add clinical orders or feedback for the nurse..."
                      value={doctorNotes}
                      onChange={(e) => setDoctorNotes(e.target.value)}
                      className="w-full px-4 py-3 border border-blue-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                      rows={2}
                    />
                    <button 
                      onClick={handleAcknowledge}
                      disabled={isAcknowledging}
                      className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50"
                    >
                      {isAcknowledging ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : (
                        <>
                          <ArrowRightCircle size={18} />
                          Acknowledge & Notify Nurse
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NurseReportCard;
