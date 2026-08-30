/**
 * Institution Lab Technician Dashboard
 * 
 * Mobile lab technician interface for home laboratory services:
 * - View assigned home visits
 * - Navigate to Client locations
 * - Collect samples
 * - Upload collection photos
 * - Track sample chain of custody
 */

import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { 
  TestTube, 
  Calendar, 
  MapPin, 
  Clock, 
  Navigation,
  FileText,
  LogOut
} from 'lucide-react';
import { toast } from 'react-toastify';
import sessionManager from '../utils/sessionManager';
import {
  getHomeLabVisitsByTechnician,
  updateHomeLabVisit,
  recordSampleCollection,
  getSampleCollectionsByTechnician
} from '../api/homeLabServicesAPI';
import { signOut, getAuth } from 'backend/auth';

const InstitutionLabTechnicianDashboard = () => {
  const { user, userProfile, institutionId, institutionData } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('visits'); // visits, collections, history
  const [homeVisits, setHomeVisits] = useState([]);
  const [sampleCollections, setSampleCollections] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [collectionForm, setCollectionForm] = useState({
    sampleType: '',
    collectionMethod: '',
    collectionNotes: '',
    samplePhotos: []
  });

  // Check if user is a lab technician
  const isLabTechnician = userProfile?.role === 'lab_technician' ||
                          userProfile?.userType === 'lab_technician' || 
                          userProfile?.type === 'lab_technician' ||
                          (userProfile?.medicalQualification || '').toLowerCase().includes('lab') ||
                          (userProfile?.medicalQualification || '').toLowerCase().includes('technician');

  useEffect(() => {
    // Redirect if not a lab technician
    if (userProfile && !isLabTechnician) {
      toast.error('Access denied. This dashboard is for lab technicians only.');
      navigate('/');
      return;
    }

    // Validate tab session
    if (userProfile && user) {
      const userRole = userProfile.userType || userProfile.type || userProfile.role;
      const validation = sessionManager.validateTabSession(user, userRole);
      
      if (validation.needsInit) {
        sessionManager.setTabSession(userRole, user.uid, institutionId);
      } else if (!validation.valid) {
        sessionManager.handleSessionConflict(validation, navigate, toast);
        return;
      }
    }
  }, [user, userProfile, institutionId, isLabTechnician, navigate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load home visits - fetch all and filter client-side
      const visits = await getHomeLabVisitsByTechnician(user.uid, {});
      setHomeVisits(visits);

      // Load sample collections
      const collections = await getSampleCollectionsByTechnician(user.uid);
      setSampleCollections(collections);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid && institutionId) {
      loadDashboardData();
    }
  }, [activeTab, user?.uid, institutionId]);

  const handleStartVisit = async (visitId) => {
    try {
      await updateHomeLabVisit(visitId, {
        status: 'in_progress',
        startedAt: new Date().toISOString()
      });
      toast.success('Visit started');
      loadDashboardData();
    } catch (error) {
      console.error('Error starting visit:', error);
      toast.error('Failed to start visit');
    }
  };

  const handleOpenCollectionModal = (visit) => {
    setSelectedVisit(visit);
    setCollectionForm({
      sampleType: visit.testType?.toLowerCase() || 'blood',
      collectionMethod: '',
      collectionNotes: '',
      samplePhotos: []
    });
    setShowCollectionModal(true);
  };

  const handleCollectSample = async () => {
    if (!selectedVisit) return;

    try {
      if (!collectionForm.sampleType || !collectionForm.collectionMethod) {
        toast.error('Please fill in all required fields');
        return;
      }

      await recordSampleCollection(selectedVisit.id, {
        labTechnicianId: user.uid,
        labTechnicianName: userProfile?.name || userProfile?.displayName || 'Lab Technician',
        labTechnicianEmail: userProfile?.email,
        sampleType: collectionForm.sampleType,
        collectionMethod: collectionForm.collectionMethod,
        collectionNotes: collectionForm.collectionNotes,
        samplePhotos: collectionForm.samplePhotos,
        collectionLocation: selectedVisit.patientAddress
      });

      toast.success('Sample collected and recorded successfully');
      setShowCollectionModal(false);
      setSelectedVisit(null);
      loadDashboardData();
    } catch (error) {
      console.error('Error collecting sample:', error);
      toast.error('Failed to record sample collection');
    }
  };

  const handleNavigateToPatient = (address) => {
    if (address) {
      const encodedAddress = encodeURIComponent(address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
    } else {
      toast.error('Client address not available');
    }
  };

  const handleLogout = async () => {
    try {
      sessionManager.clearTabSession();
      const auth = getAuth();
      await signOut(auth);
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'in_progress':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'completed':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'urgent':
        return 'bg-red-500/10 text-red-400';
      case 'normal':
        return 'bg-blue-500/10 text-blue-400';
      default:
        return 'bg-slate-500/10 text-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <TestTube className="h-8 w-8 text-blue-400 animate-pulse mx-auto mb-4" />
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 via-cyan-400 to-blue-500 shadow-lg shadow-blue-500/40">
                <TestTube className="h-5 w-5 text-slate-950" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-50">Lab Technician Dashboard</h1>
                <p className="text-sm text-slate-400">
                  {institutionData?.name || 'ElderX'} • Home Laboratory Services
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 transition-colors flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('visits')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'visits'
                ? 'cm-btn-gold'
                : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700/80'
            }`}
          >
            <Calendar className="h-4 w-4 inline mr-2" />
            Home Visits
          </button>
          <button
            onClick={() => setActiveTab('collections')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'collections'
                ? 'cm-btn-gold'
                : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700/80'
            }`}
          >
            <TestTube className="h-4 w-4 inline mr-2" />
            Sample Collections
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'history'
                ? 'cm-btn-gold'
                : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700/80'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            History
          </button>
        </div>

        {/* Content */}
        {activeTab === 'visits' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-50 mb-4">Scheduled Home Visits</h2>
            {(() => {
              const activeVisits = homeVisits.filter(v => v.status !== 'completed' && v.status !== 'cancelled');
              if (activeVisits.length === 0) {
                return (
                  <div className="text-center py-12 rounded-2xl border border-slate-800/60 bg-slate-900/50">
                    <Calendar className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No scheduled home visits</p>
                  </div>
                );
              }
              return activeVisits.map((visit) => (
                <div
                  key={visit.id}
                  className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-50 mb-2">
                        {visit.clientName}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <TestTube className="h-4 w-4" />
                          {visit.testName || visit.testType}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {visit.scheduledAt ? new Date(visit.scheduledAt).toLocaleString() : 'Not scheduled'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${getUrgencyColor(visit.urgency)}`}>
                          {visit.urgency || 'normal'}
                        </span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs border ${getStatusColor(visit.status)}`}>
                      {visit.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Client Address</p>
                      <p className="text-sm text-slate-300 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {visit.patientAddress || 'Address not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Reason</p>
                      <p className="text-sm text-slate-300">{visit.reason || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {visit.status === 'scheduled' && (
                      <button
                        onClick={() => handleStartVisit(visit.id)}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors flex items-center gap-2"
                      >
                        <Clock className="h-4 w-4" />
                        Start Visit
                      </button>
                    )}
                    {visit.status === 'in_progress' && (
                      <button
                        onClick={() => handleOpenCollectionModal(visit)}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors flex items-center gap-2"
                      >
                        <TestTube className="h-4 w-4" />
                        Collect Sample
                      </button>
                    )}
                    {visit.patientAddress && (
                      <button
                        onClick={() => handleNavigateToPatient(visit.patientAddress)}
                        className="px-4 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 transition-colors flex items-center gap-2"
                      >
                        <Navigation className="h-4 w-4" />
                        Navigate
                      </button>
                    )}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}

        {activeTab === 'collections' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-50 mb-4">Sample Collections</h2>
            {sampleCollections.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border border-slate-800/60 bg-slate-900/50">
                <TestTube className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No sample collections recorded</p>
              </div>
            ) : (
              sampleCollections.map((collection) => (
                <div
                  key={collection.id}
                  className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-50 mb-2">
                        {collection.clientName}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <TestTube className="h-4 w-4" />
                          {collection.testName || collection.testType}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {collection.collectionTime ? new Date(collection.collectionTime).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Collected
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Sample Type</p>
                      <p className="text-sm text-slate-300">{collection.sampleType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Collection Method</p>
                      <p className="text-sm text-slate-300">{collection.collectionMethod}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Chain of Custody</p>
                      <p className="text-sm text-slate-300 capitalize">
                        {collection.chainOfCustody?.status || 'collected'}
                      </p>
                    </div>
                  </div>

                  {collection.collectionNotes && (
                    <div className="mt-4 p-4 rounded-lg bg-slate-800/50">
                      <p className="text-xs text-slate-400 mb-1">Notes</p>
                      <p className="text-sm text-slate-300">{collection.collectionNotes}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-50 mb-4">Visit History</h2>
            {(() => {
              const historyVisits = homeVisits.filter(v => v.status === 'completed' || v.status === 'cancelled');
              if (historyVisits.length === 0) {
                return (
                  <div className="text-center py-12 rounded-2xl border border-slate-800/60 bg-slate-900/50">
                    <Calendar className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No visit history</p>
                  </div>
                );
              }
              return historyVisits.map((visit) => (
                <div key={visit.id} className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-50">
                        {visit.testName || visit.testType || 'Lab Visit'}
                      </h3>
                      <p className="text-sm text-slate-400 mt-1">
                        Client: {visit.clientName || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {(visit.scheduledAt || visit.scheduledTime) ? new Date(visit.scheduledAt || visit.scheduledTime).toLocaleString() : '—'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                      visit.status === 'completed' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                    }`}>
                      {visit.status}
                    </span>
                  </div>
                  {visit.reason && (
                    <p className="text-sm text-slate-400 mt-2">Reason: {visit.reason}</p>
                  )}
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      {/* Sample Collection Modal */}
      {showCollectionModal && selectedVisit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-3xl border border-slate-800/80 bg-slate-950/95 backdrop-blur-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800/60">
              <h2 className="text-xl font-semibold text-slate-50">Collect Sample</h2>
              <button
                onClick={() => setShowCollectionModal(false)}
                className="text-slate-400 hover:text-slate-50 transition-colors"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Sample Type *
                </label>
                <select
                  value={collectionForm.sampleType}
                  onChange={(e) => setCollectionForm({ ...collectionForm, sampleType: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50"
                >
                  <option value="blood">Blood</option>
                  <option value="urine">Urine</option>
                  <option value="swab">Swab</option>
                  <option value="stool">Stool</option>
                  <option value="sputum">Sputum</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Collection Method *
                </label>
                <input
                  type="text"
                  value={collectionForm.collectionMethod}
                  onChange={(e) => setCollectionForm({ ...collectionForm, collectionMethod: e.target.value })}
                  placeholder="e.g., Venipuncture, Midstream catch, etc."
                  className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Collection Notes
                </label>
                <textarea
                  value={collectionForm.collectionNotes}
                  onChange={(e) => setCollectionForm({ ...collectionForm, collectionNotes: e.target.value })}
                  placeholder="Any observations or notes about the collection..."
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-50"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCollectSample}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors"
                >
                  Record Collection
                </button>
                <button
                  onClick={() => setShowCollectionModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstitutionLabTechnicianDashboard;

