import React from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';

/**
 * GlobalAllergyAlert Component
 * 
 * A high-visibility safety component that displays a prominent alert banner
 * if the selected patient has any recorded allergies.
 */
const GlobalAllergyAlert = ({ patient, onClose }) => {
  if (!patient) return null;

  // Extract allergies from various possible formats
  let allergies = [];
  if (Array.isArray(patient.allergies)) {
    allergies = patient.allergies;
  } else if (typeof patient.allergies === 'string' && patient.allergies.trim()) {
    allergies = patient.allergies.split(',').map(a => a.trim());
  } else if (patient.metadata?.allergies) {
    allergies = Array.isArray(patient.metadata.allergies) 
      ? patient.metadata.allergies 
      : patient.metadata.allergies.split(',').map(a => a.trim());
  }

  // Filter out empty strings or "None"
  const activeAllergies = allergies.filter(a => a && a.toLowerCase() !== 'none' && a.toLowerCase() !== 'no');

  if (activeAllergies.length === 0) return null;

  return (
    <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="bg-red-600 border border-red-500 rounded-2xl shadow-xl shadow-red-900/20 overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md animate-pulse">
              <ShieldAlert className="text-white h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none">
                CRITICAL ALLERGY ALERT
              </h3>
              <p className="mt-1.5 text-red-50 font-bold text-lg">
                {activeAllergies.join(' • ')}
              </p>
            </div>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
            >
              <X size={20} />
            </button>
          )}
        </div>
        <div className="bg-black/10 px-5 py-1.5 flex items-center gap-2">
          <AlertTriangle size={12} className="text-red-200" />
          <span className="text-[10px] font-bold text-red-100 uppercase tracking-tighter">
            Verify all medications and treatments against these allergies before proceeding
          </span>
        </div>
      </div>
    </div>
  );
};

export default GlobalAllergyAlert;
