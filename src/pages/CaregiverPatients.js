import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  MessageSquare, 
  Camera, 
  FileText, 
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  Star,
  Activity,
  Pill,
  Shield,
  X
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { getPatientsByCaregiver } from '../api/patientsAPI';
import { getTodaysCareTasks } from '../api/careTasksAPI';
import { getLatestVitalSigns, getVitalSignsByPatient } from '../api/vitalSignsAPI';
import { assignmentAPI } from '../api/assignmentAPI';
import { getCareLogsByPatient } from '../api/careLogsAPI';
import { getNurseReportsByPatient } from '../api/nurseReportsAPI';
import { toast } from 'react-toastify';
import { medicationAPI } from '../api/medicationAPI';

const CaregiverPatients = () => {
  const { userProfile, userRole } = useUser();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showAssignmentRequest, setShowAssignmentRequest] = useState(false);
  const [patientLogs, setPatientLogs] = useState([]);
  const [patientVitals, setPatientVitals] = useState([]);
  const [nurseReports, setNurseReports] = useState([]);
  const [showMedsModal, setShowMedsModal] = useState(false);
  const [patientMedications, setPatientMedications] = useState([]);
  const [logsPage, setLogsPage] = useState(1);
  const logsPageSize = 5;

  const loadPatients = async () => {
    const userId = userProfile?.id || userProfile?.uid;
    if (!userId) return;
    
    try {
      setLoading(true);
      
      console.log('🔍 CaregiverPatients loading for userId:', userId);
      
      // Load assigned patients from admin-created assignments AND legacy sources
      const patientsData = await getPatientsByCaregiver(userId).catch(err => {
        console.warn('Failed to fetch assigned patients:', err);
          return [];
        });

      console.log(`✅ Loaded ${patientsData.length} assigned patients for caregiver ${userId}`);
      
      setPatients(patientsData || []);
    } catch (error) {
      console.error('Error loading patients:', error);
      toast.error('Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userId = userProfile?.id || userProfile?.uid;
    if (userId) {
      loadPatients();
      
      // Set up real-time subscription for assignments
      const unsubscribe = assignmentAPI.subscribeToAssignments((assignments) => {
        console.log(`Real-time update: Found ${assignments.length} total assignments`);
        
        // Filter assignments for this specific caregiver
        const caregiverAssignments = assignments.filter(a => a.caregiverId === userId);
        console.log(`Filtered to ${caregiverAssignments.length} for caregiver ${userId}`);
        
        // Extract patient information from assignments
        const patientsData = caregiverAssignments.map(assignment => ({
          id: assignment.patientId,
          name: assignment.patientName,
          email: assignment.patientEmail,
          assignedAt: assignment.assignedAt,
          status: assignment.status,
          assignmentId: assignment.id
        }));
        
        setPatients(patientsData || []);
      }, userProfile.id);
      
      return () => unsubscribe();
    }
  }, [userProfile?.id]);

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.medicalCondition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || patient.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-50 dashboard-full-width dashboard-container">
      {/* Header */}
      <div className="w-full bg-white shadow-sm border-b border-gray-200 px-8 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-green-600 flex items-center justify-center">
              <Heart className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Patients</h1>
              <p className="text-gray-600">Manage your patient information and care</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center">
              <Plus className="h-5 w-5 mr-2" />
              Add Patient
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full p-8 dashboard-full-width">
        {/* Search and Filter */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search patients by name or condition..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Patients</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="critical">Critical</option>
              </select>
              <button className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                More Filters
              </button>
            </div>
          </div>
        </div>

        {/* Patients Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <div key={patient.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Patient Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-lg">
                        {patient.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{patient.name}</h3>
                      <p className="text-sm text-gray-600">{patient.age}y, {patient.gender}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(patient.status)}`}>
                    {patient.status}
                  </span>
                </div>

                {/* Patient Info */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Heart className="h-4 w-4 mr-2 text-red-500" />
                    <span className="font-medium">
                      {patient.condition || patient.medicalCondition || 'No medical conditions recorded'}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2 text-green-500" />
                    <span>{patient.phone || 'No phone number available'}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2 text-blue-500" />
                    <span>{patient.address || 'No address available'}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2 text-purple-500" />
                    <span>
                      Next: {patient.nextAppointment ? new Date(patient.nextAppointment).toLocaleDateString() : 'No upcoming appointments'}
                    </span>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center mb-4">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(patient.rating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-gray-600">{patient.rating}</span>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button 
                    onClick={async () => {
                      setSelectedPatient(patient);
                      try {
                        const logs = await getCareLogsByPatient(patient.id);
                        setPatientLogs(logs);
                      } catch(e) {
                        setPatientLogs([]);
                      }
                      setShowPatientDetails(true);
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-sm"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </button>
                  <button 
                    onClick={async () => {
                      setSelectedPatient(patient);
                      try {
                        const [vitals, reports] = await Promise.all([
                          getVitalSignsByPatient(patient.id),
                          getNurseReportsByPatient(patient.id)
                        ]);
                        setPatientVitals(vitals);
                        setNurseReports(reports);
                      } catch(e) {
                        console.error('Error loading vitals data:', e);
                        setPatientVitals([]);
                        setNurseReports([]);
                      }
                      setShowVitalsModal(true);
                    }}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center text-sm"
                  >
                    <Activity className="h-4 w-4 mr-1" />
                    Vitals
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => window.location.href = `/service-provider/prescriptions?client=${patient.id}`}
                    className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center text-sm"
                  >
                    <Pill className="h-4 w-4 mr-1" />
                    Meds
                  </button>
                  <button 
                    onClick={() => window.location.href = `/service-provider/care-logs?client=${patient.id}`}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center text-sm"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Logs
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredPatients.length === 0 && (
          <div className="text-center py-12">
            <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assigned patients</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search criteria' : 'You don\'t have any assigned patients yet'}
            </p>
            <button 
              onClick={() => setShowAssignmentRequest(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Request Patient Assignment
            </button>
          </div>
        )}

        {/* Assignment Request Section */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Need More Patients?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => setShowAssignmentRequest(true)}
              className="flex items-center justify-center p-4 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Request Assignment
            </button>
            <button 
              onClick={() => window.location.href = '/service-provider/messages?topic=assignment-request'}
              className="flex items-center justify-center p-4 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              Contact Admin
            </button>
            <button 
              onClick={() => window.location.href = '/service-provider/settings?section=availability'}
              className="flex items-center justify-center p-4 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
            >
              <Calendar className="h-5 w-5 mr-2" />
              Update Availability
            </button>
          </div>
        </div>

        {/* Patient Details Modal */}
        {showPatientDetails && selectedPatient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-xl font-semibold text-gray-900">{selectedPatient.name} - Client Details</h3>
                <button
                  onClick={() => setShowPatientDetails(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Basic Information</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Age:</span> {selectedPatient.age}</p>
                      <p><span className="font-medium">Gender:</span> {selectedPatient.gender}</p>
                      <p><span className="font-medium">Phone:</span> {selectedPatient.phone}</p>
                      <p><span className="font-medium">Address:</span> {selectedPatient.address}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Emergency Contact</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Phone:</span> {selectedPatient.emergencyContact}</p>
                      <p><span className="font-medium">Last Visit:</span> {new Date(selectedPatient.lastVisit).toLocaleDateString()}</p>
                      <p><span className="font-medium">Next Appointment:</span> {new Date(selectedPatient.nextAppointment).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Medical Info */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Medical Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Condition:</p>
                      <p className="text-sm text-gray-600">{selectedPatient.medicalCondition}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Allergies:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedPatient.allergies?.map((allergy, index) => (
                          <span key={index} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                            {allergy}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Medications */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Current Medications</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPatient.medications?.map((med, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        {med}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Care Logs */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">Care Logs</h4>
                    <div className="flex items-center gap-2">
                      <input 
                        type="date" 
                        className="px-2 py-1 border border-gray-300 rounded"
                        onChange={async (e)=>{
                          const v = e.target.value;
                          const start = v ? new Date(v).getTime() : null;
                          const logs = await getCareLogsByPatient(selectedPatient.id);
                          setPatientLogs(logs.filter(l=> !start || (l.createdAt?.toDate ? l.createdAt.toDate().getTime()>=start : true)));
                        }}
                        placeholder="Start date"/>
                      <input 
                        type="date" 
                        className="px-2 py-1 border border-gray-300 rounded"
                        onChange={async (e)=>{
                          const v = e.target.value;
                          const end = v ? new Date(v).getTime()+86399999 : null;
                          const logs = await getCareLogsByPatient(selectedPatient.id);
                          setPatientLogs(logs.filter(l=> !end || (l.createdAt?.toDate ? l.createdAt.toDate().getTime()<=end : true)));
                        }}
                        placeholder="End date"/>
                    </div>
                  </div>
                  {patientLogs.length === 0 && (
                    <p className="text-sm text-gray-600">No care logs yet.</p>
                  )}
                  <div className="space-y-3">
                    {patientLogs.slice((logsPage-1)*logsPageSize, logsPage*logsPageSize).map(log => (
                      <div key={log.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900">{log.title || 'Care Log'}</p>
                          <span className="text-xs text-gray-500">{log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : ''}</span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{log.content}</p>
                        {Array.isArray(log.media) && log.media.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {log.media.map((m, idx)=> (
                              <a key={idx} href={m.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 underline">
                                {m.type?.startsWith('image/') ? 'View Image' : m.type?.startsWith('video/') ? 'View Video' : 'View File'}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {patientLogs.length > logsPageSize && (
                    <div className="mt-3 flex items-center justify-between">
                      <button
                        disabled={logsPage<=1}
                        onClick={()=> setLogsPage(p=> Math.max(1, p-1))}
                        className={`px-3 py-1 rounded border ${logsPage<=1? 'text-gray-400 border-gray-200':'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                      >Previous</button>
                      <span className="text-xs text-gray-600">Page {logsPage} of {Math.max(1, Math.ceil(patientLogs.length/logsPageSize))}</span>
                      <button
                        disabled={logsPage>=Math.ceil(patientLogs.length/logsPageSize)}
                        onClick={()=> setLogsPage(p=> Math.min(Math.ceil(patientLogs.length/logsPageSize), p+1))}
                        className={`px-3 py-1 rounded border ${logsPage>=Math.ceil(patientLogs.length/logsPageSize)? 'text-gray-400 border-gray-200':'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                      >Next</button>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={async () => {
                      try {
                        const [vitals, reports] = await Promise.all([
                          getVitalSignsByPatient(selectedPatient.id),
                          getNurseReportsByPatient(selectedPatient.id)
                        ]);
                        setPatientVitals(vitals);
                        setNurseReports(reports);
                        setShowVitalsModal(true);
                      } catch(e) {
                        console.error('Error loading vitals data:', e);
                        toast.error('Failed to load vitals data');
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    View Vitals
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        const meds = await medicationAPI.getMedications({ patientId: selectedPatient.id });
                        setPatientMedications(meds || []);
                        setShowMedsModal(true);
                      } catch (e) {
                        console.error('Failed to load medications', e);
                        toast.error('Failed to load medications');
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Pill className="h-4 w-4 mr-2 inline" />
                    View Medications
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vitals Modal */}
        {showVitalsModal && selectedPatient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-xl font-semibold text-gray-900">{selectedPatient.name} - Vitals & Health Data</h3>
                <button
                  onClick={() => setShowVitalsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Latest Vitals */}
                {patientVitals.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Latest Vital Signs</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {patientVitals.slice(0, 6).map((vital, index) => (
                        <div key={vital.id || index} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-gray-900 capitalize">{vital.type || 'Vital Sign'}</h5>
                            <span className="text-sm text-gray-500">
                              {vital.recordedAt ? new Date(vital.recordedAt).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-blue-600">{vital.value || 'N/A'}</div>
                          <div className="text-sm text-gray-600">{vital.unit || ''}</div>
                          {vital.notes && (
                            <div className="text-xs text-gray-500 mt-1">{vital.notes}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nurse Reports */}
                {nurseReports.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Nurse Reports ({nurseReports.length})</h4>
                    <div className="space-y-4">
                      {nurseReports.slice(0, 5).map((report, index) => (
                        <div key={report.id || index} className="bg-white border rounded-lg p-4 border-l-4 border-blue-500">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                <Activity className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <h5 className="font-medium text-gray-900">Nurse Report</h5>
                                <p className="text-sm text-gray-600">by {report.nurseName || 'Nurse'}</p>
                              </div>
                            </div>
                            <span className="text-sm text-gray-500">
                              {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                          
                          {/* Vital Signs from Report */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                            {report.bloodPressure && (
                              <div className="bg-gray-50 rounded p-2">
                                <div className="text-xs text-gray-600">Blood Pressure</div>
                                <div className="font-medium">{report.bloodPressure}</div>
                              </div>
                            )}
                            {report.heartRate && (
                              <div className="bg-gray-50 rounded p-2">
                                <div className="text-xs text-gray-600">Heart Rate</div>
                                <div className="font-medium">{report.heartRate} bpm</div>
                              </div>
                            )}
                            {report.temperature && (
                              <div className="bg-gray-50 rounded p-2">
                                <div className="text-xs text-gray-600">Temperature</div>
                                <div className="font-medium">{report.temperature}°F</div>
                              </div>
                            )}
                            {report.oxygenSaturation && (
                              <div className="bg-gray-50 rounded p-2">
                                <div className="text-xs text-gray-600">Oxygen</div>
                                <div className="font-medium">{report.oxygenSaturation}%</div>
                              </div>
                            )}
                            {report.weight && (
                              <div className="bg-gray-50 rounded p-2">
                                <div className="text-xs text-gray-600">Weight</div>
                                <div className="font-medium">{report.weight} lbs</div>
                              </div>
                            )}
                            {report.painLevel && (
                              <div className="bg-gray-50 rounded p-2">
                                <div className="text-xs text-gray-600">Pain Level</div>
                                <div className="font-medium">{report.painLevel}/10</div>
                              </div>
                            )}
                          </div>
                          
                          {report.notes && (
                            <div className="bg-blue-50 rounded p-3">
                              <div className="text-sm font-medium text-blue-900 mb-1">Notes:</div>
                              <div className="text-sm text-blue-800">{report.notes}</div>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mt-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              report.status === 'stable' ? 'bg-green-100 text-green-800' :
                              report.status === 'critical' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {report.status || 'Unknown'}
                            </span>
                            <div className="text-xs text-gray-500">
                              {report.createdAt ? new Date(report.createdAt).toLocaleString() : 'N/A'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Data State */}
                {patientVitals.length === 0 && nurseReports.length === 0 && (
                  <div className="text-center py-12">
                    <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Vitals Data Available</h3>
                    <p className="text-gray-600">
                      No vital signs or nurse reports have been recorded for this patient yet.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    onClick={() => setShowVitalsModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Medications Modal */}
        {showMedsModal && selectedPatient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-xl font-semibold text-gray-900">{selectedPatient.name} - Prescriptions</h3>
                <button
                  onClick={() => setShowMedsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {patientMedications.length === 0 && (
                  <div className="text-center py-12">
                    <Pill className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No prescriptions found for this patient.</p>
                  </div>
                )}

                {patientMedications.length > 0 && (
                  <div className="space-y-3">
                    {patientMedications.map((med) => (
                      <div key={med.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-lg font-semibold text-gray-900">{med.name || med.medicationName || 'Medication'}</div>
                            <div className="text-sm text-gray-600">{med.dosage || med.dose} {med.unit || ''} • {med.frequency || med.schedule}</div>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${med.status === 'active' ? 'bg-green-100 text-green-800':'bg-gray-100 text-gray-800'}`}>
                            {med.status || 'active'}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
                          <div>
                            <div className="text-gray-500">Start Date</div>
                            <div>{(med.startDate?.toLocaleDateString?.() || (med.startDate && new Date(med.startDate).toLocaleDateString())) || '—'}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">End Date</div>
                            <div>{(med.endDate?.toLocaleDateString?.() || (med.endDate && new Date(med.endDate).toLocaleDateString())) || '—'}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Prescribed By</div>
                            <div>{med.prescribedBy || med.doctorName || '—'}</div>
                          </div>
                        </div>
                        {med.instructions && (
                          <div className="mt-3 text-sm text-gray-700">
                            <div className="text-gray-500">Instructions</div>
                            <div>{med.instructions}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t">
                <button
                  onClick={() => setShowMedsModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assignment Request Modal */}
        {showAssignmentRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Request Patient Assignment</h3>
                <button
                  onClick={() => setShowAssignmentRequest(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Patient Type</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Any patient type</option>
                    <option value="diabetes">Diabetes care</option>
                    <option value="dementia">Dementia/Memory care</option>
                    <option value="mobility">Mobility assistance</option>
                    <option value="companionship">Companionship care</option>
                    <option value="medical">Medical care</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="full-time">Full-time (Mon-Fri)</option>
                    <option value="part-time">Part-time</option>
                    <option value="weekends">Weekends only</option>
                    <option value="evenings">Evenings only</option>
                    <option value="on-call">On-call basis</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Any specific preferences or requirements..."
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Shield className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800">Assignment Process</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Your request will be reviewed by our admin team who will match you with suitable patients based on your qualifications and availability.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 p-6 border-t">
                <button
                  onClick={() => setShowAssignmentRequest(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    toast.success('Assignment request submitted to admin for review');
                    setShowAssignmentRequest(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaregiverPatients;
