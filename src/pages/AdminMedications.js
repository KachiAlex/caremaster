import React, { useState, useEffect } from 'react';
import { 
  Pill, 
  Clock, 
  User, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Search,
  Filter,
  Eye,
  Edit,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  Bell,
  Heart,
  Activity,
  Shield,
  Users,
  BarChart3,
  Download,
  Upload
} from 'lucide-react';

const AdminMedications = () => {
  const [medications, setMedications] = useState([]);
  const [filteredMedications, setFilteredMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [stats, setStats] = useState({
    totalMedications: 0,
    activeMedications: 0,
    complianceRate: 0,
    overdueDoses: 0,
    drugInteractions: 0,
    sideEffects: 0
  });

  useEffect(() => {
    // Simulate loading medication data
    const loadMedicationData = async () => {
      try {
        setTimeout(() => {
          const mockMedications = [
            {
              id: 1,
              patientName: 'Adunni Okafor',
              patientId: 'ELD001',
              medicationName: 'Metformin',
              genericName: 'Metformin HCl',
              dosage: '500mg',
              frequency: 'Twice daily',
              route: 'Oral',
              startDate: '2024-01-01',
              endDate: '2024-12-31',
              prescribedBy: 'Dr. Kemi Okafor',
              status: 'active',
              complianceRate: 92,
              totalDoses: 60,
              takenDoses: 55,
              missedDoses: 5,
              lastTaken: '2024-01-20T08:00:00Z',
              nextDose: '2024-01-20T20:00:00Z',
              sideEffects: ['Mild nausea', 'Occasional diarrhea'],
              drugInteractions: ['Warfarin - Monitor INR'],
              instructions: 'Take with food to reduce stomach upset',
              notes: 'Patient reports good tolerance. Blood sugar well controlled.',
              reminders: {
                enabled: true,
                times: ['08:00', '20:00'],
                methods: ['push', 'sms']
              }
            },
            {
              id: 2,
              patientName: 'Adunni Okafor',
              patientId: 'ELD001',
              medicationName: 'Lisinopril',
              genericName: 'Lisinopril',
              dosage: '10mg',
              frequency: 'Once daily',
              route: 'Oral',
              startDate: '2023-12-15',
              endDate: '2024-12-31',
              prescribedBy: 'Dr. Kemi Okafor',
              status: 'active',
              complianceRate: 98,
              totalDoses: 35,
              takenDoses: 34,
              missedDoses: 1,
              lastTaken: '2024-01-20T09:00:00Z',
              nextDose: '2024-01-21T09:00:00Z',
              sideEffects: ['Dry cough'],
              drugInteractions: ['Potassium supplements - Monitor levels'],
              instructions: 'Take at the same time each day',
              notes: 'Blood pressure well controlled. Patient tolerates well.',
              reminders: {
                enabled: true,
                times: ['09:00'],
                methods: ['push', 'email']
              }
            },
            {
              id: 3,
              patientName: 'Grace Johnson',
              patientId: 'ELD002',
              medicationName: 'Calcium Carbonate',
              genericName: 'Calcium Carbonate',
              dosage: '1000mg',
              frequency: 'Twice daily',
              route: 'Oral',
              startDate: '2024-01-10',
              endDate: '2024-12-31',
              prescribedBy: 'Dr. Michael Johnson',
              status: 'active',
              complianceRate: 85,
              totalDoses: 20,
              takenDoses: 17,
              missedDoses: 3,
              lastTaken: '2024-01-19T12:00:00Z',
              nextDose: '2024-01-20T12:00:00Z',
              sideEffects: ['Constipation'],
              drugInteractions: ['Iron supplements - Take 2 hours apart'],
              instructions: 'Take with food and plenty of water',
              notes: 'Patient needs reminder to take with meals.',
              reminders: {
                enabled: true,
                times: ['08:00', '18:00'],
                methods: ['push', 'sms', 'call']
              }
            },
            {
              id: 4,
              patientName: 'Tunde Adebayo',
              patientId: 'ELD003',
              medicationName: 'Insulin Glargine',
              genericName: 'Insulin Glargine',
              dosage: '30 units',
              frequency: 'Once daily',
              route: 'Subcutaneous',
              startDate: '2023-11-01',
              endDate: '2024-12-31',
              prescribedBy: 'Dr. Sarah Williams',
              status: 'active',
              complianceRate: 95,
              totalDoses: 80,
              takenDoses: 76,
              missedDoses: 4,
              lastTaken: '2024-01-20T07:00:00Z',
              nextDose: '2024-01-21T07:00:00Z',
              sideEffects: ['Injection site irritation'],
              drugInteractions: ['Alcohol - Monitor blood sugar'],
              instructions: 'Inject at the same time each day, rotate injection sites',
              notes: 'Blood sugar levels well controlled. Patient self-injects successfully.',
              reminders: {
                enabled: true,
                times: ['07:00'],
                methods: ['push', 'sms']
              }
            },
            {
              id: 5,
              patientName: 'Mary Okonkwo',
              patientId: 'ELD004',
              medicationName: 'Warfarin',
              genericName: 'Warfarin Sodium',
              dosage: '5mg',
              frequency: 'Once daily',
              route: 'Oral',
              startDate: '2024-01-05',
              endDate: '2024-12-31',
              prescribedBy: 'Dr. Kemi Okafor',
              status: 'active',
              complianceRate: 88,
              totalDoses: 15,
              takenDoses: 13,
              missedDoses: 2,
              lastTaken: '2024-01-19T18:00:00Z',
              nextDose: '2024-01-20T18:00:00Z',
              sideEffects: ['Bruising'],
              drugInteractions: ['Metformin - Monitor INR closely', 'Aspirin - Increased bleeding risk'],
              instructions: 'Take at the same time each day. Regular INR monitoring required.',
              notes: 'INR levels stable. Patient educated about bleeding precautions.',
              reminders: {
                enabled: true,
                times: ['18:00'],
                methods: ['push', 'call']
              }
            }
          ];

          // Calculate stats
          const totalMedications = mockMedications.length;
          const activeMedications = mockMedications.filter(m => m.status === 'active').length;
          const avgComplianceRate = mockMedications.reduce((sum, m) => sum + m.complianceRate, 0) / totalMedications;
          const overdueDoses = mockMedications.filter(m => {
            const nextDose = new Date(m.nextDose);
            const now = new Date();
            return nextDose < now && m.status === 'active';
          }).length;
          const drugInteractions = mockMedications.reduce((sum, m) => sum + m.drugInteractions.length, 0);
          const sideEffects = mockMedications.reduce((sum, m) => sum + m.sideEffects.length, 0);

          setStats({
            totalMedications,
            activeMedications,
            complianceRate: Math.round(avgComplianceRate),
            overdueDoses,
            drugInteractions,
            sideEffects
          });

          setMedications(mockMedications);
          setFilteredMedications(mockMedications);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading medication data:', error);
        setLoading(false);
      }
    };

    loadMedicationData();
  }, []);

  useEffect(() => {
    let filtered = medications;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(medication =>
        medication.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        medication.medicationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        medication.genericName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(medication => medication.status === statusFilter);
    }

    setFilteredMedications(filtered);
  }, [searchTerm, statusFilter, medications]);

  const getComplianceColor = (rate) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getComplianceIcon = (rate) => {
    if (rate >= 90) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (rate >= 80) return <Activity className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'discontinued':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleMedicationAction = (action, medication) => {
    setSelectedMedication(medication);
    switch (action) {
      case 'view':
        setShowMedicationModal(true);
        break;
      case 'edit':
        // Handle edit
        break;
      case 'pause':
        // Handle pause
        break;
      case 'discontinue':
        // Handle discontinue
        break;
      default:
        break;
    }
  };

  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const isOverdue = (nextDose) => {
    const nextDoseTime = new Date(nextDose);
    const now = new Date();
    return nextDoseTime < now;
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Medication Management</h1>
          <p className="text-gray-600">Monitor medication compliance and manage prescriptions</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn btn-secondary">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <button className="btn btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Medication
          </button>
        </div>
      </div>

      {/* Medication Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <Pill className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Medications</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalMedications}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeMedications}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Compliance Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.complianceRate}%</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Overdue Doses</p>
              <p className="text-2xl font-bold text-gray-900">{stats.overdueDoses}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-full">
              <Shield className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Drug Interactions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.drugInteractions}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full">
              <Heart className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Side Effects</p>
              <p className="text-2xl font-bold text-gray-900">{stats.sideEffects}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Doses Alert */}
      {stats.overdueDoses > 0 && (
        <div className="card border-l-4 border-red-500 bg-red-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Overdue Medication Doses</h3>
                <p className="text-red-600">
                  {stats.overdueDoses} medication dose{stats.overdueDoses > 1 ? 's' : ''} are overdue and need immediate attention
                </p>
              </div>
            </div>
            <button className="btn btn-red">
              <Bell className="h-4 w-4 mr-2" />
              Send Reminders
            </button>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search medications by patient, medication name, or generic name..."
                className="form-input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              className="form-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="discontinued">Discontinued</option>
            </select>
            <button className="btn btn-secondary">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Medications Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient & Medication
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dosage & Frequency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compliance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Dose
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMedications.map((medication) => {
                const { date, time } = formatDateTime(medication.nextDose);
                const isOverdueDose = isOverdue(medication.nextDose);
                return (
                  <tr key={medication.id} className={`hover:bg-gray-50 ${isOverdueDose ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <Pill className="h-5 w-5 text-gray-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{medication.patientName}</div>
                          <div className="text-sm text-gray-500">{medication.medicationName}</div>
                          <div className="text-xs text-gray-400">{medication.genericName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{medication.dosage}</div>
                      <div className="text-sm text-gray-500">{medication.frequency}</div>
                      <div className="text-xs text-gray-400">{medication.route}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getComplianceIcon(medication.complianceRate)}
                        <span className={`ml-2 text-sm font-medium ${getComplianceColor(medication.complianceRate)}`}>
                          {medication.complianceRate}%
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {medication.takenDoses}/{medication.totalDoses} doses
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${isOverdueDose ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                        {date}
                      </div>
                      <div className={`text-sm ${isOverdueDose ? 'text-red-500' : 'text-gray-500'}`}>
                        {time}
                      </div>
                      {isOverdueDose && (
                        <div className="text-xs text-red-600 font-medium">OVERDUE</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(medication.status)}`}>
                        {medication.status.charAt(0).toUpperCase() + medication.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleMedicationAction('view', medication)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleMedicationAction('edit', medication)}
                          className="text-green-600 hover:text-green-900"
                          title="Edit Medication"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredMedications.length === 0 && (
          <div className="text-center py-12">
            <Pill className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No medications found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'No medications have been added yet.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Medication Details Modal */}
      {showMedicationModal && selectedMedication && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Pill className="h-6 w-6 text-blue-600" />
                  <h3 className="text-lg font-medium text-gray-900">Medication Details</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedMedication.status)}`}>
                    {selectedMedication.status.charAt(0).toUpperCase() + selectedMedication.status.slice(1)}
                  </span>
                </div>
                <button
                  onClick={() => setShowMedicationModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Basic Info */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Medication Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Patient</label>
                        <p className="text-sm text-gray-900">{selectedMedication.patientName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Medication Name</label>
                        <p className="text-sm text-gray-900">{selectedMedication.medicationName}</p>
                        <p className="text-xs text-gray-500">({selectedMedication.genericName})</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Dosage</label>
                          <p className="text-sm text-gray-900">{selectedMedication.dosage}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Route</label>
                          <p className="text-sm text-gray-900">{selectedMedication.route}</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Frequency</label>
                        <p className="text-sm text-gray-900">{selectedMedication.frequency}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Prescribed By</label>
                        <p className="text-sm text-gray-900">{selectedMedication.prescribedBy}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Compliance Tracking</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Compliance Rate</span>
                        <div className="flex items-center">
                          {getComplianceIcon(selectedMedication.complianceRate)}
                          <span className={`ml-2 text-sm font-medium ${getComplianceColor(selectedMedication.complianceRate)}`}>
                            {selectedMedication.complianceRate}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Doses Taken</span>
                        <span className="text-sm text-gray-900">{selectedMedication.takenDoses}/{selectedMedication.totalDoses}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Missed Doses</span>
                        <span className="text-sm text-red-600">{selectedMedication.missedDoses}</span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Last Taken</label>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {formatDateTime(selectedMedication.lastTaken).date} at {formatDateTime(selectedMedication.lastTaken).time}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Additional Info */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Schedule & Reminders</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Next Dose</label>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <span className={`text-sm ${isOverdue(selectedMedication.nextDose) ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                            {formatDateTime(selectedMedication.nextDose).date} at {formatDateTime(selectedMedication.nextDose).time}
                          </span>
                        </div>
                        {isOverdue(selectedMedication.nextDose) && (
                          <span className="text-xs text-red-600 font-medium">OVERDUE</span>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Reminders</label>
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <Bell className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {selectedMedication.reminders.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            Times: {selectedMedication.reminders.times.join(', ')}
                          </div>
                          <div className="text-sm text-gray-500">
                            Methods: {selectedMedication.reminders.methods.join(', ')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Safety Information</h4>
                    <div className="space-y-3">
                      {selectedMedication.sideEffects.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Side Effects</label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedMedication.sideEffects.map((effect, index) => (
                              <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                {effect}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedMedication.drugInteractions.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Drug Interactions</label>
                          <div className="space-y-1 mt-1">
                            {selectedMedication.drugInteractions.map((interaction, index) => (
                              <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                {interaction}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Instructions & Notes</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Instructions</label>
                        <p className="text-sm text-gray-900">{selectedMedication.instructions}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Notes</label>
                        <p className="text-sm text-gray-900">{selectedMedication.notes}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowMedicationModal(false)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
                <button className="btn btn-primary">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Medication
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMedications;
