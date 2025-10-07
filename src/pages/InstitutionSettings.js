import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { 
  Settings, 
  Building2, 
  Shield, 
  Users, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Save,
  Edit,
  Upload,
  Trash2,
  Plus,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const InstitutionSettings = () => {
  const { userProfile, institutionId } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    phone: '',
    email: '',
    website: '',
    licenseNumber: '',
    establishedDate: '',
    specialties: [],
    maxUsers: 100,
    features: {
      telemedicine: true,
      aiAnalysis: true,
      emergencyAlerts: true,
      mobileApp: true,
      apiAccess: false
    },
    branding: {
      logo: null,
      primaryColor: '#3B82F6',
      secondaryColor: '#10B981'
    }
  });

  const [newSpecialty, setNewSpecialty] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      // TODO: Replace with actual API call to fetch institution settings
      const mockSettings = {
        name: 'St. Mary\'s Healthcare Center',
        description: 'Leading healthcare provider specializing in elderly care and rehabilitation services.',
        address: '123 Healthcare Drive',
        city: 'Lagos',
        state: 'Lagos State',
        country: 'Nigeria',
        postalCode: '100001',
        phone: '+234 1 234 5678',
        email: 'info@stmarys.com',
        website: 'https://stmarys.com',
        licenseNumber: 'HC-2024-001',
        establishedDate: '2020-01-15',
        specialties: ['Geriatric Care', 'Physical Therapy', 'Nursing Services', 'Mental Health'],
        maxUsers: 150,
        features: {
          telemedicine: true,
          aiAnalysis: true,
          emergencyAlerts: true,
          mobileApp: true,
          apiAccess: false
        },
        branding: {
          logo: null,
          primaryColor: '#3B82F6',
          secondaryColor: '#10B981'
        }
      };
      
      setSettings(mockSettings);
      setLoading(false);
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: Implement save settings API call
      console.log('Saving settings:', settings);
      
      // Mock delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFeatureToggle = (feature) => {
    setSettings(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: !prev.features[feature]
      }
    }));
  };

  const handleAddSpecialty = () => {
    if (newSpecialty.trim()) {
      setSettings(prev => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty.trim()]
      }));
      setNewSpecialty('');
    }
  };

  const handleRemoveSpecialty = (index) => {
    setSettings(prev => ({
      ...prev,
      specialties: prev.specialties.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Institution Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your institution's information, features, and branding
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
        >
          <Save className="h-5 w-5 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Basic Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Building2 className="h-5 w-5 mr-2" />
          Basic Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Institution Name
            </label>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              License Number
            </label>
            <input
              type="text"
              value={settings.licenseNumber}
              onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={settings.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Established Date
            </label>
            <input
              type="date"
              value={settings.establishedDate}
              onChange={(e) => handleInputChange('establishedDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Users
            </label>
            <input
              type="number"
              value={settings.maxUsers}
              onChange={(e) => handleInputChange('maxUsers', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Mail className="h-5 w-5 mr-2" />
          Contact Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={settings.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <input
              type="url"
              value={settings.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              type="text"
              value={settings.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              value={settings.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <input
              type="text"
              value={settings.state}
              onChange={(e) => handleInputChange('state', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              type="text"
              value={settings.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Postal Code
            </label>
            <input
              type="text"
              value={settings.postalCode}
              onChange={(e) => handleInputChange('postalCode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Specialties */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Specialties
        </h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {settings.specialties.map((specialty, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
            >
              {specialty}
              <button
                onClick={() => handleRemoveSpecialty(index)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add new specialty..."
            value={newSpecialty}
            onChange={(e) => setNewSpecialty(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && handleAddSpecialty()}
          />
          <button
            onClick={handleAddSpecialty}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Features & Permissions
        </h2>
        <div className="space-y-4">
          {Object.entries(settings.features).map(([feature, enabled]) => (
            <div key={feature} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900 capitalize">
                  {feature.replace(/([A-Z])/g, ' $1').trim()}
                </h3>
                <p className="text-sm text-gray-600">
                  {feature === 'telemedicine' && 'Enable video consultations and remote monitoring'}
                  {feature === 'aiAnalysis' && 'AI-powered health insights and predictions'}
                  {feature === 'emergencyAlerts' && 'Real-time emergency notifications and alerts'}
                  {feature === 'mobileApp' && 'Mobile application access for users'}
                  {feature === 'apiAccess' && 'Programmatic API access for integrations'}
                </p>
              </div>
              <button
                onClick={() => handleFeatureToggle(feature)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Branding */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Shield className="h-5 w-5 mr-2" />
          Branding
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Color
            </label>
            <input
              type="color"
              value={settings.branding.primaryColor}
              onChange={(e) => handleInputChange('branding', {
                ...settings.branding,
                primaryColor: e.target.value
              })}
              className="w-full h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secondary Color
            </label>
            <input
              type="color"
              value={settings.branding.secondaryColor}
              onChange={(e) => handleInputChange('branding', {
                ...settings.branding,
                secondaryColor: e.target.value
              })}
              className="w-full h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logo Upload
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Click to upload or drag and drop your institution logo
              </p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  // TODO: Handle file upload
                  console.log('Logo upload:', e.target.files[0]);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstitutionSettings;
