/**
 * Schedule Home Lab Visit Modal
 * 
 * Allows admins/doctors to schedule home laboratory visits for patients
 */

import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, TestTube, User, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { createHomeLabVisit } from '../api/homeLabServicesAPI';
import { useUser } from '../contexts/UserContext';
import { getPatientsByInstitution } from '../api/patientsAPI';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const ScheduleHomeLabVisitModal = ({ open, onClose, onSuccess, patientId: initialPatientId = null }) => {
  const { userProfile, institutionId } = useUser();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [labTechnicians, setLabTechnicians] = useState([]);
  const [formData, setFormData] = useState({
    patientId: initialPatientId || '',
    patientName: '',
    patientAddress: '',
    assignedLabTechnicianId: '',
    assignedLabTechnicianName: '',
    testType: '',
    testName: '',
    reason: '',
    urgency: 'normal',
    scheduledAt: '',
    notes: ''
  });

  useEffect(() => {
    if (open) {
      loadPatients();
      loadLabTechnicians();
      if (initialPatientId) {
        // Load patient details if patient ID is provided
        loadPatientDetails(initialPatientId);
      }
    }
  }, [open, initialPatientId, institutionId]);

  const loadPatients = async () => {
    try {
      const patientsData = await getPatientsByInstitution(institutionId);
      setPatients(patientsData);
    } catch (error) {
      console.error('Error loading patients:', error);
      toast.error('Failed to load patients');
    }
  };

  const loadLabTechnicians = async () => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('institutionId', '==', institutionId),
        where('userType', 'in', ['lab_technician', 'caregiver'])
      );
      
      const snapshot = await getDocs(q);
      const technicians = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const qualification = (data.medicalQualification || '').toLowerCase();
        if (qualification.includes('lab') || qualification.includes('technician')) {
          technicians.push({
            id: doc.id,
            name: data.name || data.displayName,
            email: data.email,
            medicalQualification: data.medicalQualification
          });
        }
      });
      
      setLabTechnicians(technicians);
    } catch (error) {
      console.error('Error loading lab technicians:', error);
      toast.error('Failed to load lab technicians');
    }
  };

  const loadPatientDetails = async (patientId) => {
    try {
      const patient = patients.find(p => p.id === patientId);
      if (patient) {
        setFormData(prev => ({
          ...prev,
          patientId: patient.id,
          patientName: patient.name || patient.fullName,
          patientAddress: patient.address || `${patient.city || ''}, ${patient.state || ''} ${patient.zipCode || ''}`.trim()
        }));
      }
    } catch (error) {
      console.error('Error loading patient details:', error);
    }
  };

  const handlePatientChange = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      setFormData(prev => ({
        ...prev,
        patientId: patient.id,
        patientName: patient.name || patient.fullName,
        patientAddress: patient.address || `${patient.city || ''}, ${patient.state || ''} ${patient.zipCode || ''}`.trim()
      }));
    }
  };

  const handleTechnicianChange = (technicianId) => {
    const technician = labTechnicians.find(t => t.id === technicianId);
    if (technician) {
      setFormData(prev => ({
        ...prev,
        assignedLabTechnicianId: technician.id,
        assignedLabTechnicianName: technician.name
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.patientId || !formData.assignedLabTechnicianId || !formData.testType || !formData.scheduledAt) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await createHomeLabVisit({
        patientId: formData.patientId,
        patientName: formData.patientName,
        patientAddress: formData.patientAddress,
        assignedLabTechnicianId: formData.assignedLabTechnicianId,
        assignedLabTechnicianName: formData.assignedLabTechnicianName,
        testType: formData.testType,
        testName: formData.testName || formData.testType,
        reason: formData.reason,
        urgency: formData.urgency,
        scheduledAt: formData.scheduledAt,
        notes: formData.notes,
        orderedBy: userProfile?.id || userProfile?.uid,
        orderedByName: userProfile?.name || userProfile?.displayName,
        orderedByEmail: userProfile?.email,
        doctorId: userProfile?.id || userProfile?.uid,
        doctorName: userProfile?.name || userProfile?.displayName,
        institutionId: institutionId
      });

      toast.success('Home lab visit scheduled successfully');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error scheduling home lab visit:', error);
      toast.error('Failed to schedule home lab visit');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/95 backdrop-blur-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <TestTube className="h-5 w-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-50">Schedule Home Lab Visit</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-50 transition-colors p-1 rounded-lg hover:bg-slate-800/80"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Patient Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Patient *
            </label>
            <select
              value={formData.patientId}
              onChange={(e) => handlePatientChange(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">Select Patient</option>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.name || patient.fullName} ({patient.patientId || patient.id})
                </option>
              ))}
            </select>
          </div>

          {/* Patient Address Display */}
          {formData.patientAddress && (
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400 mb-1">Patient Address</p>
                  <p className="text-sm text-slate-300">{formData.patientAddress}</p>
                </div>
              </div>
            </div>
          )}

          {/* Lab Technician Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Lab Technician *
            </label>
            <select
              value={formData.assignedLabTechnicianId}
              onChange={(e) => handleTechnicianChange(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">Select Lab Technician</option>
              {labTechnicians.map(tech => (
                <option key={tech.id} value={tech.id}>
                  {tech.name} ({tech.medicalQualification || 'Lab Technician'})
                </option>
              ))}
            </select>
          </div>

          {/* Test Type */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Test Type *
            </label>
            <input
              type="text"
              value={formData.testType}
              onChange={(e) => setFormData(prev => ({ ...prev, testType: e.target.value }))}
              placeholder="e.g., Blood Test, Urine Test, Swab"
              required
              className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Test Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Test Name (Optional)
            </label>
            <input
              type="text"
              value={formData.testName}
              onChange={(e) => setFormData(prev => ({ ...prev, testName: e.target.value }))}
              placeholder="Specific test name if applicable"
              className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Reason for Test
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Reason for ordering this test..."
              rows={3}
              className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Urgency *
            </label>
            <select
              value={formData.urgency}
              onChange={(e) => setFormData(prev => ({ ...prev, urgency: e.target.value }))}
              required
              className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Scheduled Date/Time */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Scheduled Date & Time *
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
              required
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Additional Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any special instructions or notes..."
              rows={3}
              className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Scheduling...' : 'Schedule Visit'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleHomeLabVisitModal;

