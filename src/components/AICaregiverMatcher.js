// AI Caregiver Matching System Component
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Brain, 
  MapPin, 
  Clock, 
  Star, 
  Heart, 
  Shield, 
  Award, 
  Phone, 
  MessageCircle, 
  Calendar, 
  Filter, 
  Search, 
  X, 
  Settings,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import aiService from '../services/aiService';
import hapticService from '../services/hapticService';

const AICaregiverMatcher = ({ isOpen, onClose, patientData }) => {
  const [caregivers, setCaregivers] = useState([]);
  const [matchedCaregivers, setMatchedCaregivers] = useState([]);
  const [isMatching, setIsMatching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [filters, setFilters] = useState({
    maxDistance: 25, // km
    availability: 'flexible', // flexible, specific_hours, weekends_only
    experience: 'any', // any, 1_year, 3_years, 5_years
    specialties: [],
    languages: [],
    rating: 4.0
  });
  const [selectedCaregiver, setSelectedCaregiver] = useState(null);
  const [matchingCriteria, setMatchingCriteria] = useState({
    patientNeeds: [],
    preferredSchedule: 'flexible',
    specialRequirements: [],
    budget: 'standard'
  });

  useEffect(() => {
    if (isOpen) {
      loadCaregivers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (caregivers.length > 0 && patientData) {
      performMatching();
    }
  }, [caregivers, patientData, filters]);

  const loadCaregivers = async () => {
    try {
      // Simulate loading caregivers data
      const mockCaregivers = generateMockCaregivers();
      setCaregivers(mockCaregivers);
    } catch (error) {
      console.error('Failed to load caregivers:', error);
    }
  };

  const generateMockCaregivers = () => {
    const specialties = ['geriatric_care', 'dementia_care', 'diabetes_management', 'mobility_assistance', 'medication_management'];
    const languages = ['English', 'Spanish', 'French', 'Mandarin', 'Arabic'];
    const locations = [
      { name: 'Victoria Island', distance: 5 },
      { name: 'Ikoyi', distance: 8 },
      { name: 'Lekki', distance: 12 },
      { name: 'Surulere', distance: 15 },
      { name: 'Yaba', distance: 18 }
    ];

    return Array.from({ length: 20 }, (_, i) => ({
      id: `caregiver_${i + 1}`,
      name: `Caregiver ${i + 1}`,
      fullName: `Nurse ${['Fatima', 'Aisha', 'Kemi', 'Blessing', 'Grace', 'Mary', 'Sarah', 'Ruth'][i % 8]} ${['Abdullahi', 'Okafor', 'Adebayo', 'Johnson', 'Williams', 'Brown', 'Davis', 'Miller'][i % 8]}`,
      photo: `https://images.unsplash.com/photo-${1559839734 + i}?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80`,
      rating: 4.0 + Math.random() * 1.0,
      experience: Math.floor(Math.random() * 10) + 1,
      specialties: specialties.slice(0, Math.floor(Math.random() * 3) + 1),
      languages: languages.slice(0, Math.floor(Math.random() * 2) + 1),
      location: locations[i % locations.length],
      availability: ['flexible', 'specific_hours', 'weekends_only'][Math.floor(Math.random() * 3)],
      hourlyRate: 25 + Math.random() * 15,
      isAvailable: Math.random() > 0.3,
      completedVisits: Math.floor(Math.random() * 200) + 50,
      responseTime: Math.floor(Math.random() * 30) + 5, // minutes
      certifications: ['CPR', 'First Aid', 'Geriatric Care', 'Medication Management'].slice(0, Math.floor(Math.random() * 3) + 1),
      bio: `Experienced caregiver with ${Math.floor(Math.random() * 10) + 1} years of experience in elderly care. Specialized in ${specialties[Math.floor(Math.random() * specialties.length)]}.`,
      aiMatchScore: 0, // Will be calculated
      aiInsights: []
    }));
  };

  const performMatching = async () => {
    setIsMatching(true);
    hapticService.buttonPress();
    
    try {
      // Simulate AI matching process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const matched = await aiService.matchCaregivers(caregivers, patientData, filters);
      setMatchedCaregivers(matched);
      hapticService.success();
    } catch (error) {
      console.error('Caregiver matching failed:', error);
      hapticService.error();
    } finally {
      setIsMatching(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSpecialtyToggle = (specialty) => {
    setFilters(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const handleLanguageToggle = (language) => {
    setFilters(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
    }));
  };

  const getMatchScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 80) return 'text-blue-600 bg-blue-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getAvailabilityColor = (availability) => {
    switch (availability) {
      case 'flexible': return 'text-green-600 bg-green-100';
      case 'specific_hours': return 'text-yellow-600 bg-yellow-100';
      case 'weekends_only': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatSpecialty = (specialty) => {
    return specialty.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-pink-600 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">AI Caregiver Matcher</h2>
              <p className="text-sm opacity-90">Intelligent caregiver-patient matching</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <Filter className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Max Distance (km)</label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={filters.maxDistance}
                  onChange={(e) => handleFilterChange('maxDistance', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">{filters.maxDistance} km</div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Availability</label>
                <select
                  value={filters.availability}
                  onChange={(e) => handleFilterChange('availability', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="flexible">Flexible</option>
                  <option value="specific_hours">Specific Hours</option>
                  <option value="weekends_only">Weekends Only</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Experience</label>
                <select
                  value={filters.experience}
                  onChange={(e) => handleFilterChange('experience', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="any">Any</option>
                  <option value="1_year">1+ Years</option>
                  <option value="3_years">3+ Years</option>
                  <option value="5_years">5+ Years</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Min Rating</label>
                <input
                  type="range"
                  min="3.0"
                  max="5.0"
                  step="0.1"
                  value={filters.rating}
                  onChange={(e) => handleFilterChange('rating', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">{filters.rating} ⭐</div>
              </div>
            </div>
            
            {/* Specialties */}
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Specialties</label>
              <div className="flex flex-wrap gap-2">
                {['geriatric_care', 'dementia_care', 'diabetes_management', 'mobility_assistance', 'medication_management'].map((specialty) => (
                  <button
                    key={specialty}
                    onClick={() => handleSpecialtyToggle(specialty)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      filters.specialties.includes(specialty)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {formatSpecialty(specialty)}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Languages */}
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Languages</label>
              <div className="flex flex-wrap gap-2">
                {['English', 'Spanish', 'French', 'Mandarin', 'Arabic'].map((language) => (
                  <button
                    key={language}
                    onClick={() => handleLanguageToggle(language)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      filters.languages.includes(language)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {language}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Matching Status */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={performMatching}
                disabled={isMatching}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Search className="w-4 h-4" />
                <span>{isMatching ? 'Matching...' : 'Find Matches'}</span>
              </button>
              
              {matchedCaregivers.length > 0 && (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>{matchedCaregivers.length} matches found!</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Patient:</span>
              <span className="font-medium">{patientData?.name || 'Unknown'}</span>
            </div>
          </div>
        </div>

        {/* Matched Caregivers */}
        {matchedCaregivers.length > 0 && (
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {matchedCaregivers.map((caregiver) => (
                <div key={caregiver.id} className="p-4 border rounded-lg hover:shadow-lg transition-shadow">
                  <div className="flex items-start space-x-4">
                    <img
                      src={caregiver.photo}
                      alt={caregiver.fullName}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900">{caregiver.fullName}</h3>
                          <p className="text-sm text-gray-600">{caregiver.experience} years experience</p>
                        </div>
                        <div className="text-right">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getMatchScoreColor(caregiver.aiMatchScore)}`}>
                            {caregiver.aiMatchScore}% match
                          </div>
                          <div className="flex items-center space-x-1 mt-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span className="text-sm text-gray-600">{caregiver.rating.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4" />
                          <span>{caregiver.location.distance} km away</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>{caregiver.responseTime} min response</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span>{caregiver.completedVisits} visits</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">${caregiver.hourlyRate}/hr</span>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-gray-700">Specialties:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAvailabilityColor(caregiver.availability)}`}>
                            {caregiver.availability.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {caregiver.specialties.map((specialty) => (
                            <span key={specialty} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {formatSpecialty(specialty)}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{caregiver.bio}</p>
                      
                      {/* AI Insights */}
                      {caregiver.aiInsights.length > 0 && (
                        <div className="mb-3 p-2 bg-blue-50 rounded">
                          <h5 className="text-xs font-medium text-blue-900 mb-1">AI Insights:</h5>
                          <ul className="text-xs text-blue-800 space-y-1">
                            {caregiver.aiInsights.map((insight, index) => (
                              <li key={index} className="flex items-start space-x-1">
                                <TrendingUp className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span>{insight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedCaregiver(caregiver)}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          View Profile
                        </button>
                        <button className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                          <Phone className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Matches State */}
        {matchedCaregivers.length === 0 && !isMatching && (
          <div className="flex-1 p-4 flex items-center justify-center">
            <div className="text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Matches Found</h3>
              <p className="text-gray-600">Try adjusting your filters or click "Find Matches" to search</p>
            </div>
          </div>
        )}

        {/* Matching State */}
        {isMatching && (
          <div className="flex-1 p-4 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Finding Best Matches</h3>
              <p className="text-gray-600">AI is analyzing caregiver profiles and patient needs...</p>
            </div>
          </div>
        )}

        {/* Caregiver Detail Modal */}
        {selectedCaregiver && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Caregiver Profile</h3>
                <button
                  onClick={() => setSelectedCaregiver(null)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto">
                <div className="flex items-start space-x-4 mb-4">
                  <img
                    src={selectedCaregiver.photo}
                    alt={selectedCaregiver.fullName}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900">{selectedCaregiver.fullName}</h4>
                    <p className="text-gray-600">{selectedCaregiver.experience} years experience</p>
                    <div className="flex items-center space-x-1 mt-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600">{selectedCaregiver.rating.toFixed(1)} rating</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Certifications</h5>
                    <div className="flex flex-wrap gap-2">
                      {selectedCaregiver.certifications.map((cert) => (
                        <span key={cert} className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded">
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Languages</h5>
                    <div className="flex flex-wrap gap-2">
                      {selectedCaregiver.languages.map((lang) => (
                        <span key={lang} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">About</h5>
                    <p className="text-gray-600">{selectedCaregiver.bio}</p>
                  </div>
                </div>
                
                <div className="flex space-x-2 mt-6">
                  <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Schedule Interview
                  </button>
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AICaregiverMatcher;
