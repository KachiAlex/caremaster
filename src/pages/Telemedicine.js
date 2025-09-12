import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Phone, 
  MessageSquare, 
  Calendar, 
  Clock, 
  User, 
  Camera, 
  Mic, 
  MicOff, 
  VideoOff, 
  PhoneOff,
  Settings,
  Share,
  Circle,
  StopCircle,
  Download,
  Upload,
  FileText,
  Heart,
  Activity,
  AlertTriangle,
  CheckCircle,
  Star,
  MapPin,
  Phone as PhoneIcon,
  Mail,
  Camera as CameraIcon,
  Users,
  Plus,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react';

const Telemedicine = () => {
  const [appointments, setAppointments] = useState([]);
  const [activeCall, setActiveCall] = useState(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTelemedicineData();
  }, []);

  const loadTelemedicineData = async () => {
    try {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        const mockAppointments = [
          {
            id: 1,
            doctorName: 'Dr. Kemi Adebayo',
            doctorSpecialty: 'Cardiologist',
            doctorImage: null,
            patientName: 'Adunni Okafor',
            patientAge: 72,
            appointmentDate: '2024-01-20T15:00:00Z',
            duration: 30,
            status: 'scheduled',
            type: 'video',
            notes: 'Follow-up consultation for heart condition',
            symptoms: ['Chest pain', 'Shortness of breath'],
            vitalSigns: {
              bloodPressure: '140/90',
              heartRate: 85,
              temperature: 98.6
            },
            prescription: null,
            recording: null
          },
          {
            id: 2,
            doctorName: 'Dr. Tunde Williams',
            doctorSpecialty: 'General Practitioner',
            doctorImage: null,
            patientName: 'Grace Johnson',
            patientAge: 68,
            appointmentDate: '2024-01-20T16:30:00Z',
            duration: 45,
            status: 'completed',
            type: 'video',
            notes: 'Regular checkup and medication review',
            symptoms: ['Fatigue', 'Joint pain'],
            vitalSigns: {
              bloodPressure: '130/80',
              heartRate: 72,
              temperature: 98.4
            },
            prescription: {
              medications: [
                { name: 'Metformin', dosage: '500mg', frequency: 'twice daily' },
                { name: 'Ibuprofen', dosage: '200mg', frequency: 'as needed' }
              ]
            },
            recording: {
              url: 'https://example.com/recording1.mp4',
              duration: '42 minutes',
              size: '1.2GB'
            }
          },
          {
            id: 3,
            doctorName: 'Dr. Sarah Okafor',
            doctorSpecialty: 'Dermatologist',
            doctorImage: null,
            patientName: 'Tunde Adebayo',
            patientAge: 75,
            appointmentDate: '2024-01-21T10:00:00Z',
            duration: 20,
            status: 'scheduled',
            type: 'audio',
            notes: 'Skin condition consultation',
            symptoms: ['Rash on arms', 'Itching'],
            vitalSigns: null,
            prescription: null,
            recording: null
          }
        ];

        setAppointments(mockAppointments);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error loading telemedicine data:', error);
      setLoading(false);
    }
  };

  const startCall = (appointment) => {
    setActiveCall(appointment);
  };

  const endCall = () => {
    setActiveCall(null);
    setIsVideoOn(true);
    setIsAudioOn(true);
    setIsRecording(false);
  };

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn);
  };

  const toggleAudio = () => {
    setIsAudioOn(!isAudioOn);
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
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
          <h1 className="text-2xl font-bold text-gray-900">Telemedicine</h1>
          <p className="text-gray-600">Virtual consultations and remote healthcare</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn btn-secondary">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Appointment
          </button>
          <button className="btn btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            New Consultation
          </button>
        </div>
      </div>

      {/* Active Call Interface */}
      {activeCall && (
        <div className="card bg-gray-900 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white font-medium">
                  {activeCall.doctorName.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold">{activeCall.doctorName}</h3>
                <p className="text-gray-300">{activeCall.doctorSpecialty}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-300">Call Duration: 15:32</span>
              <button
                onClick={endCall}
                className="p-2 bg-red-600 rounded-full hover:bg-red-700"
              >
                <PhoneOff className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Video/Audio Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Doctor's Video */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="aspect-video bg-gray-700 rounded-lg flex items-center justify-center mb-4">
                {isVideoOn ? (
                  <div className="text-center">
                    <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400">Doctor's Video</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <VideoOff className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400">Video Off</p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{activeCall.doctorName}</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleVideo}
                    className={`p-2 rounded-full ${isVideoOn ? 'bg-gray-700' : 'bg-red-600'}`}
                  >
                    {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={toggleAudio}
                    className={`p-2 rounded-full ${isAudioOn ? 'bg-gray-700' : 'bg-red-600'}`}
                  >
                    {isAudioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Patient's Video */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="aspect-video bg-gray-700 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400">Your Video</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">You</span>
                <div className="flex items-center space-x-2">
                  <button className="p-2 bg-gray-700 rounded-full">
                    <Video className="h-4 w-4" />
                  </button>
                  <button className="p-2 bg-gray-700 rounded-full">
                    <Mic className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Call Controls */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full ${isVideoOn ? 'bg-gray-700' : 'bg-red-600'}`}
            >
              {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </button>
            <button
              onClick={toggleAudio}
              className={`p-3 rounded-full ${isAudioOn ? 'bg-gray-700' : 'bg-red-600'}`}
            >
              {isAudioOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </button>
            <button
              onClick={toggleRecording}
              className={`p-3 rounded-full ${isRecording ? 'bg-red-600' : 'bg-gray-700'}`}
            >
              {isRecording ? <StopCircle className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
            </button>
            <button className="p-3 bg-gray-700 rounded-full">
              <Share className="h-6 w-6" />
            </button>
            <button className="p-3 bg-gray-700 rounded-full">
              <Settings className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {/* Upcoming Appointments */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h2>
          <button className="btn btn-secondary">
            <Search className="h-4 w-4 mr-2" />
            Search
          </button>
        </div>
        <div className="space-y-4">
          {appointments.filter(apt => apt.status === 'scheduled').map((appointment) => (
            <div key={appointment.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
                      {appointment.doctorName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{appointment.doctorName}</h3>
                      <span className="text-sm text-gray-500">{appointment.doctorSpecialty}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                        {appointment.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        <span>Patient: {appointment.patientName} ({appointment.patientAge}y)</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>{formatDateTime(appointment.appointmentDate).date}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>{formatDateTime(appointment.appointmentDate).time} ({appointment.duration}min)</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">{appointment.notes}</p>
                      {appointment.symptoms && (
                        <div className="mt-2">
                          <span className="text-sm font-medium text-gray-700">Symptoms: </span>
                          <span className="text-sm text-gray-600">{appointment.symptoms.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => startCall(appointment)}
                    className="btn btn-primary"
                  >
                    {appointment.type === 'video' ? <Video className="h-4 w-4 mr-2" /> : <Phone className="h-4 w-4 mr-2" />}
                    Start Call
                  </button>
                  <button className="btn btn-secondary">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Consultations */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Consultations</h2>
          <button className="btn btn-secondary">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
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
              {appointments.filter(apt => apt.status === 'completed').map((appointment) => (
                <tr key={appointment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {appointment.doctorName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{appointment.doctorName}</div>
                        <div className="text-sm text-gray-500">{appointment.doctorSpecialty}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{appointment.patientName}</div>
                    <div className="text-sm text-gray-500">Age: {appointment.patientAge}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDateTime(appointment.appointmentDate).date}</div>
                    <div className="text-sm text-gray-500">{formatDateTime(appointment.appointmentDate).time}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {appointment.type === 'video' ? <Video className="h-4 w-4 text-blue-600 mr-1" /> : <Phone className="h-4 w-4 text-green-600 mr-1" />}
                      <span className="text-sm text-gray-900 capitalize">{appointment.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {appointment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <FileText className="h-4 w-4" />
                      </button>
                      {appointment.recording && (
                        <button className="text-green-600 hover:text-green-900">
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                      <button className="text-purple-600 hover:text-purple-900">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Telemedicine;
