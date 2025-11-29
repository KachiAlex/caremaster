import React from 'react';
import { User, Mail, Phone, Calendar, Heart, Shield, FileText } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import FileViewer from '../components/FileViewer';

const Profile = () => {
  const { user, userProfile } = useUser();

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600">Manage your personal and medical information</p>
      </div>

      {/* Profile Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <User className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="font-medium text-gray-900">
                  {userProfile?.name || userProfile?.displayName || user?.displayName || 'Not provided'}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <Mail className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{user?.email || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-500">Date of Birth</p>
                <p className="font-medium text-gray-900">{formatDate(userProfile?.dateOfBirth)}</p>
                {userProfile?.dateOfBirth && (
                  <p className="text-sm text-gray-500">Age: {calculateAge(userProfile.dateOfBirth)} years</p>
                )}
              </div>
            </div>
            <div className="flex items-center">
              <Shield className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-500">Account Type</p>
                <p className="font-medium text-gray-900 capitalize">{userProfile?.userType || 'elderly'}</p>
              </div>
            </div>
          </div>
          <button className="btn btn-outline mt-4">Edit Personal Info</button>
        </div>

        {/* Medical Information */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Medical Information</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Primary Care Doctor</p>
              <p className="font-medium text-gray-900">{userProfile?.primaryCareDoctor || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Allergies</p>
              <p className="font-medium text-gray-900">{userProfile?.allergies || 'None listed'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Medical Conditions</p>
              <p className="font-medium text-gray-900">{userProfile?.medicalConditions || 'None listed'}</p>
            </div>
          </div>
          <button className="btn btn-outline mt-4">Edit Medical Info</button>
          
          {/* Medical Documents */}
          {userProfile?.medicalDocuments && userProfile.medicalDocuments.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Medical Documents
              </h3>
              <FileViewer files={userProfile.medicalDocuments} />
            </div>
          )}
        </div>

        {/* Emergency Contact */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <User className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium text-gray-900">{userProfile?.emergencyContactName || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Phone className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium text-gray-900">{userProfile?.emergencyContactPhone || 'Not provided'}</p>
              </div>
            </div>
          </div>
          <button className="btn btn-outline mt-4">Edit Emergency Contact</button>
        </div>

        {/* Health Summary */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Health Summary</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Active Medications</span>
              <span className="font-semibold text-gray-900">5</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Upcoming Appointments</span>
              <span className="font-semibold text-gray-900">2</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Vital Signs This Week</span>
              <span className="font-semibold text-gray-900">12</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Medication Adherence</span>
              <span className="font-semibold text-green-600">95%</span>
            </div>
          </div>
          <button className="btn btn-primary mt-4">
            <Heart className="h-4 w-4 mr-2" />
            View Health Reports
          </button>
        </div>

        {/* Medication Documents */}
        {userProfile?.medicationDocuments && userProfile.medicationDocuments.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Medication Documents</h2>
            <FileViewer files={userProfile.medicationDocuments} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
