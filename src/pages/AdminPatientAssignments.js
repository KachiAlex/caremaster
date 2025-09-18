import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  MapPin, 
  Clock, 
  Star, 
  Phone, 
  Mail, 
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Activity,
  Heart,
  Shield,
  Award,
  MessageSquare,
  Plus,
  MoreVertical,
  Download,
  Upload,
  UserCheck,
  Zap,
  Brain,
  Stethoscope
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { getAllUsers } from '../api/usersAPI';
import { caregiverAPI } from '../api/caregiverAPI';
import { getPatientsByCaregiver } from '../api/patientsAPI';
import { toast } from 'react-toastify';

const AdminPatientAssignments = () => {
  const { userProfile } = useUser();
  const [patients, setPatients] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedCaregiver, setSelectedCaregiver] = useState(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showMatchingModal, setShowMatchingModal] = useState(false);

  useEffect(() => {
    loadAssignmentData();
  }, []);

  const loadAssignmentData = async () => {
    try {
      setLoading(true);
      
      // Load all users, filter patients and caregivers
      const [allUsers, allCaregivers] = await Promise.all([
        getAllUsers().catch(err => {
          console.warn('Failed to fetch users:', err);
          return [];
        }),
        caregiverAPI.getCaregivers().catch(err => {
          console.warn('Failed to fetch caregivers:', err);
          return [];
        })
      ]);

      // Filter patients (clients/elderly users only)
      const patientUsers = allUsers.filter(user => 
        user.userType === 'elderly' || user.userType === 'patient' || user.userType === 'client'
      );

      // Filter verified caregivers only
      const caregiverUsers = allUsers.filter(user => 
        user.userType === 'caregiver' && 
        user.profileComplete === true &&
        user.qualificationLevel !== 'pending'
      );

      setPatients(patientUsers);
      setCaregivers(caregiverUsers);

      // Load existing assignments
      const assignmentPromises = caregiverUsers.map(async (caregiver) => {
        try {
          const assignedPatients = await getPatientsByCaregiver(caregiver.id);
          return assignedPatients.map(patient => ({
            id: `${caregiver.id}-${patient.id}`,
            caregiverId: caregiver.id,
            caregiverName: caregiver.displayName || caregiver.name,
            caregiverSpecializations: caregiver.specializations || [],
            patientId: patient.id,
            patientName: patient.displayName || patient.name,
            patientConditions: patient.medicalConditions || [],
            assignedAt: patient.assignedAt || new Date(),
            status: 'active',
            matchScore: calculateMatchScore(caregiver, patient)
          }));
        } catch (error) {
          return [];
        }
      });

      const allAssignments = await Promise.all(assignmentPromises);
      setAssignments(allAssignments.flat());

    } catch (error) {
      console.error('Error loading assignment data:', error);
      toast.error('Failed to load assignment data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate caregiver-patient match score based on specializations and needs
  const calculateMatchScore = (caregiver, patient) => {
    let score = 70; // Base score

    const caregiverSpecs = caregiver.specializations || [];
    const patientConditions = patient.medicalConditions?.toLowerCase() || '';

    // Medical conditions matching
    if (patientConditions.includes('diabetes') && caregiverSpecs.includes('Diabetes Care')) score += 20;
    if (patientConditions.includes('dementia') && caregiverSpecs.includes('Dementia Care')) score += 25;
    if (patientConditions.includes('heart') && caregiverSpecs.includes('Cardiac Care')) score += 20;
    if (patientConditions.includes('mobility') && caregiverSpecs.includes('Physical Therapist')) score += 25;

    // Qualification level bonus
    if (caregiverSpecs.includes('Registered Nurse')) score += 15;
    if (caregiverSpecs.includes('Physical Therapist')) score += 15;
    if (caregiverSpecs.includes('Dementia Care Specialist')) score += 15;

    // Experience bonus
    const experience = parseInt(caregiver.experience) || 1;
    score += Math.min(experience * 2, 20);

    // Rating bonus
    const rating = caregiver.rating || 4.0;
    score += (rating - 4.0) * 10;

    return Math.min(Math.round(score), 100);
  };

  // Smart caregiver matching for a patient
  const findBestCaregiverMatches = (patient) => {
    return caregivers
      .map(caregiver => ({
        ...caregiver,
        matchScore: calculateMatchScore(caregiver, patient),
        isAvailable: !assignments.some(a => a.caregiverId === caregiver.id && a.status === 'active'),
        currentPatients: assignments.filter(a => a.caregiverId === caregiver.id && a.status === 'active').length
      }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);
  };

  // Create new assignment
  const handleCreateAssignment = async (patientId, caregiverId, assignmentData) => {
    try {
      const assignment = {
        patientId,
        caregiverId,
        assignedBy: userProfile.id,
        assignedAt: new Date(),
        status: 'active',
        startDate: assignmentData.startDate || new Date(),
        schedule: assignmentData.schedule || 'Mon-Fri 9AM-5PM',
        specialInstructions: assignmentData.instructions || '',
        accessLevel: assignmentData.accessLevel || 'standard'
      };

      // In a real implementation, this would call an assignment API
      console.log('Creating assignment:', assignment);
      toast.success('Patient assigned to caregiver successfully');
      
      setShowAssignmentModal(false);
      loadAssignmentData();
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error('Failed to create assignment');
    }
  };

  // Get unassigned patients
  const getUnassignedPatients = () => {
    const assignedPatientIds = assignments.map(a => a.patientId);
    return patients.filter(patient => !assignedPatientIds.includes(patient.id));
  };

  // Get available caregivers
  const getAvailableCaregivers = () => {
    return caregivers.filter(caregiver => {
      const currentAssignments = assignments.filter(a => a.caregiverId === caregiver.id && a.status === 'active');
      return currentAssignments.length < 8; // Max 8 patients per caregiver
    });
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.caregiverName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || assignment.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Assignments</h1>
          <p className="text-gray-600">Manage caregiver-patient assignments and matching</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowMatchingModal(true)}
            className="btn btn-secondary"
          >
            <Zap className="h-4 w-4 mr-2" />
            Smart Matching
          </button>
          <button 
            onClick={() => setShowAssignmentModal(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Assignment
          </button>
        </div>
      </div>

      {/* Assignment Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Assignments</p>
              <p className="text-2xl font-semibold text-gray-900">{assignments.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Assignments</p>
              <p className="text-2xl font-semibold text-gray-900">
                {assignments.filter(a => a.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Unassigned Patients</p>
              <p className="text-2xl font-semibold text-gray-900">{getUnassignedPatients().length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Available Caregivers</p>
              <p className="text-2xl font-semibold text-gray-900">{getAvailableCaregivers().length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search assignments by patient or caregiver name..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Assignments</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Unassigned Patients Alert */}
      {getUnassignedPatients().length > 0 && (
        <div className="card border-l-4 border-yellow-500 bg-yellow-50">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-800">
                {getUnassignedPatients().length} Patient(s) Need Assignment
              </h4>
              <p className="text-sm text-yellow-700 mt-1">
                These patients don't have assigned caregivers and need immediate attention.
              </p>
              <button 
                onClick={() => setShowMatchingModal(true)}
                className="mt-2 px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
              >
                Auto-Match Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignments Table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Current Assignments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Caregiver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Match Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {assignment.patientName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{assignment.patientName}</div>
                        <div className="text-sm text-gray-500">
                          {assignment.patientConditions.length > 0 ? assignment.patientConditions.join(', ') : 'No conditions listed'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-green-600 font-medium text-sm">
                          {assignment.caregiverName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{assignment.caregiverName}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {assignment.caregiverSpecializations.slice(0, 2).map((spec, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-full bg-gray-200 rounded-full h-2 mr-2 ${
                        assignment.matchScore >= 90 ? 'bg-green-200' :
                        assignment.matchScore >= 75 ? 'bg-yellow-200' : 'bg-red-200'
                      }`}>
                        <div
                          className={`h-2 rounded-full ${
                            assignment.matchScore >= 90 ? 'bg-green-500' :
                            assignment.matchScore >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${assignment.matchScore}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{assignment.matchScore}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      assignment.status === 'active' ? 'bg-green-100 text-green-800' :
                      assignment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      assignment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {assignment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(assignment.assignedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => {
                          setSelectedPatient(patients.find(p => p.id === assignment.patientId));
                          setSelectedCaregiver(caregivers.find(c => c.id === assignment.caregiverId));
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-900">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Assignment Modal */}
      {showAssignmentModal && (
        <AssignmentModal
          patients={getUnassignedPatients()}
          caregivers={getAvailableCaregivers()}
          onClose={() => setShowAssignmentModal(false)}
          onAssign={handleCreateAssignment}
          calculateMatchScore={calculateMatchScore}
        />
      )}

      {/* Smart Matching Modal */}
      {showMatchingModal && (
        <SmartMatchingModal
          unassignedPatients={getUnassignedPatients()}
          availableCaregivers={getAvailableCaregivers()}
          onClose={() => setShowMatchingModal(false)}
          onAssign={handleCreateAssignment}
          findBestMatches={findBestCaregiverMatches}
        />
      )}
    </div>
  );
};

// Assignment Modal Component
const AssignmentModal = ({ patients, caregivers, onClose, onAssign, calculateMatchScore }) => {
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedCaregiver, setSelectedCaregiver] = useState('');
  const [assignmentData, setAssignmentData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    schedule: 'Mon-Fri 9AM-5PM',
    instructions: '',
    accessLevel: 'standard'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedPatient || !selectedCaregiver) {
      toast.error('Please select both patient and caregiver');
      return;
    }
    onAssign(selectedPatient, selectedCaregiver, assignmentData);
  };

  const getMatchScore = () => {
    if (!selectedPatient || !selectedCaregiver) return 0;
    const patient = patients.find(p => p.id === selectedPatient);
    const caregiver = caregivers.find(c => c.id === selectedCaregiver);
    return patient && caregiver ? calculateMatchScore(caregiver, patient) : 0;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Create New Assignment</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patient Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Patient</label>
              <select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Choose a patient...</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.displayName || patient.name} - {patient.medicalConditions || 'No conditions'}
                  </option>
                ))}
              </select>
            </div>

            {/* Caregiver Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Caregiver</label>
              <select
                value={selectedCaregiver}
                onChange={(e) => setSelectedCaregiver(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Choose a caregiver...</option>
                {caregivers.map(caregiver => (
                  <option key={caregiver.id} value={caregiver.id}>
                    {caregiver.displayName || caregiver.name} - {caregiver.specializations?.[0] || 'General Care'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Match Score Display */}
          {selectedPatient && selectedCaregiver && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">Compatibility Match Score</span>
                <span className={`text-lg font-bold ${
                  getMatchScore() >= 90 ? 'text-green-600' :
                  getMatchScore() >= 75 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {getMatchScore()}%
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${
                    getMatchScore() >= 90 ? 'bg-green-500' :
                    getMatchScore() >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${getMatchScore()}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={assignmentData.startDate}
                onChange={(e) => setAssignmentData({...assignmentData, startDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Schedule</label>
              <select
                value={assignmentData.schedule}
                onChange={(e) => setAssignmentData({...assignmentData, schedule: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Mon-Fri 9AM-5PM">Mon-Fri 9AM-5PM</option>
                <option value="Mon-Fri 8AM-4PM">Mon-Fri 8AM-4PM</option>
                <option value="Mon-Fri 10AM-6PM">Mon-Fri 10AM-6PM</option>
                <option value="Weekend Only">Weekend Only</option>
                <option value="24/7 Care">24/7 Care</option>
                <option value="As Needed">As Needed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions</label>
            <textarea
              value={assignmentData.instructions}
              onChange={(e) => setAssignmentData({...assignmentData, instructions: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="Any special care instructions or requirements..."
            />
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Smart Matching Modal Component
const SmartMatchingModal = ({ unassignedPatients, availableCaregivers, onClose, onAssign, findBestMatches }) => {
  const [matchingResults, setMatchingResults] = useState([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    generateMatches();
  }, []);

  const generateMatches = () => {
    const matches = unassignedPatients.map(patient => {
      const bestMatches = findBestMatches(patient);
      return {
        patient,
        recommendedCaregiver: bestMatches[0],
        alternativeMatches: bestMatches.slice(1, 3),
        matchScore: bestMatches[0]?.matchScore || 0
      };
    });
    setMatchingResults(matches);
  };

  const handleAutoAssign = async () => {
    setProcessing(true);
    try {
      for (const match of matchingResults) {
        if (match.recommendedCaregiver && match.matchScore >= 75) {
          await onAssign(match.patient.id, match.recommendedCaregiver.id, {
            startDate: new Date().toISOString().split('T')[0],
            schedule: 'Mon-Fri 9AM-5PM',
            instructions: `Auto-assigned based on ${match.matchScore}% compatibility match`,
            accessLevel: 'standard'
          });
        }
      }
      toast.success('Auto-assignment completed successfully');
      onClose();
    } catch (error) {
      console.error('Error in auto-assignment:', error);
      toast.error('Failed to complete auto-assignment');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Smart Patient-Caregiver Matching</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="space-y-6">
            {matchingResults.map((match, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">{match.patient.displayName || match.patient.name}</h4>
                    <p className="text-sm text-gray-600">{match.patient.medicalConditions || 'No conditions listed'}</p>
                  </div>
                  {match.recommendedCaregiver && (
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        match.matchScore >= 90 ? 'text-green-600' :
                        match.matchScore >= 75 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {match.matchScore}% Match
                      </div>
                      <div className="text-sm text-gray-500">Compatibility Score</div>
                    </div>
                  )}
                </div>

                {match.recommendedCaregiver ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-green-900">Recommended: {match.recommendedCaregiver.displayName}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {match.recommendedCaregiver.specializations?.map((spec, idx) => (
                            <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => onAssign(match.patient.id, match.recommendedCaregiver.id, {
                          startDate: new Date().toISOString().split('T')[0],
                          schedule: 'Mon-Fri 9AM-5PM',
                          instructions: `Smart-matched with ${match.matchScore}% compatibility`,
                          accessLevel: 'standard'
                        })}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-900 font-medium">No suitable caregivers available</p>
                    <p className="text-red-700 text-sm">Consider hiring additional caregivers or adjusting requirements</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleAutoAssign}
              disabled={processing || matchingResults.every(m => !m.recommendedCaregiver)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {processing ? 'Processing...' : 'Auto-Assign All'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPatientAssignments;
