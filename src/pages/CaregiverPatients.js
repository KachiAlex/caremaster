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
  Star
} from 'lucide-react';

const CaregiverPatients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    // Simulate loading patient data
    const loadPatients = async () => {
      try {
        setTimeout(() => {
          const mockPatients = [
            {
              id: 1,
              name: 'Adunni Okafor',
              age: 72,
              gender: 'Female',
              phone: '+234 801 234 5678',
              address: '123 Victoria Island, Lagos',
              medicalCondition: 'Diabetes',
              emergencyContact: '+234 802 345 6789',
              lastVisit: '2024-01-20',
              nextAppointment: '2024-01-22',
              status: 'active',
              notes: 'Patient has diabetes - monitor blood sugar levels regularly',
              medications: ['Metformin', 'Insulin'],
              allergies: ['Penicillin'],
              caregiverNotes: 'Very cooperative, prefers morning visits',
              rating: 4.8
            },
            {
              id: 2,
              name: 'Grace Johnson',
              age: 68,
              gender: 'Female',
              phone: '+234 803 456 7890',
              address: '456 Ikoyi, Lagos',
              medicalCondition: 'Hypertension',
              emergencyContact: '+234 804 567 8901',
              lastVisit: '2024-01-19',
              nextAppointment: '2024-01-21',
              status: 'active',
              notes: 'Patient prefers quiet environment',
              medications: ['Amlodipine', 'Lisinopril'],
              allergies: ['Shellfish'],
              caregiverNotes: 'Loves gardening, very independent',
              rating: 4.9
            },
            {
              id: 3,
              name: 'Michael Adebayo',
              age: 75,
              gender: 'Male',
              phone: '+234 805 678 9012',
              address: '789 Lekki, Lagos',
              medicalCondition: 'Arthritis',
              emergencyContact: '+234 806 789 0123',
              lastVisit: '2024-01-18',
              nextAppointment: '2024-01-23',
              status: 'inactive',
              notes: 'Requires assistance with mobility',
              medications: ['Ibuprofen', 'Calcium'],
              allergies: ['Latex'],
              caregiverNotes: 'Needs help with daily activities',
              rating: 4.7
            }
          ];

          setPatients(mockPatients);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading patients:', error);
        setLoading(false);
      }
    };

    loadPatients();
  }, []);

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
                    <span className="font-medium">{patient.medicalCondition}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2 text-green-500" />
                    <span>{patient.phone}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2 text-blue-500" />
                    <span>{patient.address}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2 text-purple-500" />
                    <span>Next: {new Date(patient.nextAppointment).toLocaleDateString()}</span>
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
                <div className="flex space-x-2">
                  <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-sm">
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </button>
                  <button className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center text-sm">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Message
                  </button>
                  <button className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    <Edit className="h-4 w-4" />
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try adjusting your search criteria' : 'No patients match the selected filter'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaregiverPatients;
