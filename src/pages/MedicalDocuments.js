import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  User, 
  Search, 
  Filter,
  Eye,
  DollarSign,
  Pill,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import telemedicineAPI from '../api/telemedicineAPI';
import DocumentManager from '../components/DocumentManager';
import { toast } from 'react-toastify';

const MedicalDocuments = () => {
  const { userProfile } = useUser();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showDocuments, setShowDocuments] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => {
    loadAppointments();
  }, [userProfile]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      
      // Load completed appointments that can have documents
      const completedAppointments = await telemedicineAPI.getAppointmentsByPatient(userProfile.id)
        .then(apts => apts.filter(apt => apt.status === 'completed'))
        .catch(err => {
          console.warn('Failed to fetch appointments:', err);
          return [];
        });

      setAppointments(completedAppointments);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast.error('Failed to load medical documents');
    } finally {
      setLoading(false);
    }
  };

  const openDocuments = (appointment) => {
    setSelectedAppointment(appointment);
    setShowDocuments(true);
  };

  const getFilteredAppointments = () => {
    return appointments.filter(appointment => {
      const matchesSearch = appointment.doctorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           appointment.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesFilter = true;
      switch (filterType) {
        case 'invoices':
          matchesFilter = appointment.paymentStatus !== 'free';
          break;
        case 'prescriptions':
          matchesFilter = appointment.prescription && appointment.prescription.medications?.length > 0;
          break;
        case 'recent':
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          matchesFilter = new Date(appointment.appointmentDate) > thirtyDaysAgo;
          break;
        default:
          matchesFilter = true;
      }
      
      return matchesSearch && matchesFilter;
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const filteredAppointments = getFilteredAppointments();

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
          <h1 className="text-2xl font-bold text-gray-900">Medical Documents</h1>
          <p className="text-gray-600">Download invoices and prescriptions from your consultations</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn btn-secondary">
            <Download className="h-4 w-4 mr-2" />
            Download All
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Documents</p>
              <p className="text-2xl font-semibold text-gray-900">{appointments.length * 2}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Pill className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Prescriptions</p>
              <p className="text-2xl font-semibold text-gray-900">{appointments.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Invoices</p>
              <p className="text-2xl font-semibold text-gray-900">{appointments.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-semibold text-gray-900">
                {appointments.filter(apt => {
                  const aptDate = new Date(apt.appointmentDate);
                  const now = new Date();
                  return aptDate.getMonth() === now.getMonth() && aptDate.getFullYear() === now.getFullYear();
                }).length}
              </p>
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
                placeholder="Search documents by doctor name or consultation notes..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Documents</option>
              <option value="invoices">Invoices Only</option>
              <option value="prescriptions">Prescriptions Only</option>
              <option value="recent">Recent (30 days)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents List */}
      {filteredAppointments.length === 0 ? (
        <div className="card">
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Medical Documents</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'No documents match your search criteria' : 'You don\'t have any completed consultations yet'}
            </p>
            <button 
              onClick={() => window.location.href = '/telemedicine'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Schedule Consultation
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appointment) => (
            <div key={appointment.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {appointment.doctorName || 'Healthcare Provider'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {appointment.doctorSpecialty || 'General Practice'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(appointment.appointmentDate)} • {appointment.duration || 30} minutes
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Document Status Indicators */}
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center text-green-600">
                      <Pill className="h-4 w-4 mr-1" />
                      <span className="text-xs">Prescription</span>
                    </div>
                    <div className="flex items-center text-blue-600">
                      <DollarSign className="h-4 w-4 mr-1" />
                      <span className="text-xs">Invoice</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openDocuments(appointment)}
                      className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </button>
                    <button
                      onClick={() => openDocuments(appointment)}
                      className="flex items-center px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </button>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Diagnosis:</span>
                    <span className="ml-2 font-medium">{appointment.diagnosis || 'General consultation'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Payment:</span>
                    <span className={`ml-2 font-medium ${
                      appointment.paymentStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {appointment.paymentStatus || 'Paid'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Documents:</span>
                    <span className="ml-2 font-medium text-blue-600">2 available</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Manager Modal */}
      {showDocuments && selectedAppointment && (
        <DocumentManager
          appointment={selectedAppointment}
          patientInfo={{
            name: userProfile?.displayName || userProfile?.name,
            email: userProfile?.email,
            phone: userProfile?.phone || '+234 XXX XXX XXXX',
            address: userProfile?.address || 'Patient Address',
            age: userProfile?.age || 65,
            gender: userProfile?.gender || 'Not specified',
            id: userProfile?.id
          }}
          doctorInfo={{
            name: selectedAppointment.doctorName || 'Healthcare Provider',
            specialty: selectedAppointment.doctorSpecialty || 'General Practice',
            email: 'doctor@elderx.com',
            phone: '+234 800 ELDERX',
            licenseNumber: 'MD-2024-001',
            qualifications: ['MBBS', 'MD'],
            hospital: 'ElderX Telemedicine Platform'
          }}
          onClose={() => setShowDocuments(false)}
        />
      )}
    </div>
  );
};

export default MedicalDocuments;
