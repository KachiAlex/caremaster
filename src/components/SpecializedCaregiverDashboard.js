import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Heart, 
  Activity, 
  Brain, 
  Users, 
  Pill, 
  Camera, 
  FileText, 
  Shield,
  Award,
  Clock,
  TrendingUp,
  AlertTriangle,
  Zap,
  Eye,
  MessageSquare,
  Calendar
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { caregiverAPI } from '../api/caregiverAPI';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const SpecializedCaregiverDashboard = () => {
  const { userProfile } = useUser();
  const navigate = useNavigate();
  const [caregiverData, setCaregiverData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCaregiverProfile = async () => {
      if (!userProfile?.id) return;
      
      try {
        const caregiver = await caregiverAPI.getCaregiverById(userProfile.id).catch(err => {
          console.warn('Caregiver profile not found, using default:', err);
          return {
            specializations: ['General Care'],
            certifications: ['CPR Certified'],
            experience: '1 year',
            qualificationLevel: 'basic'
          };
        });
        
        setCaregiverData(caregiver);
      } catch (error) {
        console.error('Error loading caregiver profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCaregiverProfile();
  }, [userProfile?.id]);

  // Determine specialization level and features
  const getSpecializationFeatures = () => {
    if (!caregiverData) return { level: 'basic', features: [] };

    const specializations = caregiverData.specializations || [];
    const certifications = caregiverData.certifications || [];
    
    // Determine qualification level
    let level = 'basic';
    let features = [];

    // Medical Specializations
    if (specializations.includes('Registered Nurse') || specializations.includes('LPN') || certifications.includes('Nursing License')) {
      level = 'medical';
      features = [
        { name: 'Advanced Medication Management', icon: Pill, route: '/service-provider/prescriptions', color: 'bg-blue-600' },
        { name: 'Vital Signs Monitoring', icon: Heart, route: '/service-provider/diagnostics', color: 'bg-red-600' },
        { name: 'Medical Documentation', icon: FileText, route: '/service-provider/medical-records', color: 'bg-green-600' },
        { name: 'Emergency Response', icon: AlertTriangle, route: '/service-provider/emergency', color: 'bg-red-700' },
        { name: 'Health Assessments', icon: Stethoscope, route: '/service-provider/assessments', color: 'bg-purple-600' }
      ];
    }
    
    // Physical Therapy Specializations
    else if (specializations.includes('Physical Therapist') || specializations.includes('Occupational Therapist')) {
      level = 'therapy';
      features = [
        { name: 'Exercise Programs', icon: Activity, route: '/service-provider/therapy', color: 'bg-orange-600' },
        { name: 'Mobility Assessment', icon: TrendingUp, route: '/service-provider/mobility', color: 'bg-blue-600' },
        { name: 'Progress Tracking', icon: FileText, route: '/service-provider/progress', color: 'bg-green-600' },
        { name: 'Equipment Management', icon: Shield, route: '/service-provider/equipment', color: 'bg-gray-600' }
      ];
    }
    
    // Dementia/Memory Care Specializations
    else if (specializations.includes('Dementia Care') || specializations.includes('Memory Care Specialist')) {
      level = 'dementia';
      features = [
        { name: 'Cognitive Monitoring', icon: Brain, route: '/service-provider/cognitive', color: 'bg-purple-600' },
        { name: 'Behavioral Tracking', icon: Eye, route: '/service-provider/behavior', color: 'bg-indigo-600' },
        { name: 'Safety Protocols', icon: Shield, route: '/service-provider/safety', color: 'bg-red-600' },
        { name: 'Family Communication', icon: MessageSquare, route: '/service-provider/family', color: 'bg-blue-600' },
        { name: 'Memory Activities', icon: Users, route: '/service-provider/activities', color: 'bg-green-600' }
      ];
    }
    
    // Companion Care Specializations
    else if (specializations.includes('Companion Care') || specializations.includes('Social Worker')) {
      level = 'companion';
      features = [
        { name: 'Social Activities', icon: Users, route: '/service-provider/social', color: 'bg-green-600' },
        { name: 'Mental Health Support', icon: Heart, route: '/service-provider/mental-health', color: 'bg-pink-600' },
        { name: 'Daily Living Assistance', icon: Clock, route: '/service-provider/daily-care', color: 'bg-blue-600' },
        { name: 'Recreation Planning', icon: Calendar, route: '/service-provider/recreation', color: 'bg-purple-600' }
      ];
    }
    
    // Default Basic Care Features
    else {
      level = 'basic';
      features = [
        { name: 'Basic Care Tasks', icon: Heart, route: '/service-provider/tasks', color: 'bg-blue-600' },
        { name: 'Client Communication', icon: MessageSquare, route: '/service-provider/messages', color: 'bg-green-600' },
        { name: 'Schedule Management', icon: Calendar, route: '/service-provider/schedule', color: 'bg-purple-600' },
        { name: 'Care Documentation', icon: Camera, route: '/service-provider/care-logs', color: 'bg-orange-600' }
      ];
    }

    return { level, features, specializations, certifications };
  };

  const specializationInfo = getSpecializationFeatures();

  const getSpecializationTitle = () => {
    switch (specializationInfo.level) {
      case 'medical': return 'Medical Care Specialist Dashboard';
      case 'therapy': return 'Physical Therapy Specialist Dashboard';
      case 'dementia': return 'Memory Care Specialist Dashboard';
      case 'companion': return 'Companion Care Specialist Dashboard';
      default: return 'General Care Provider Dashboard';
    }
  };

  const getSpecializationDescription = () => {
    switch (specializationInfo.level) {
      case 'medical': return 'Advanced medical care and health monitoring capabilities';
      case 'therapy': return 'Physical rehabilitation and mobility enhancement tools';
      case 'dementia': return 'Specialized cognitive care and safety monitoring';
      case 'companion': return 'Social support and daily living assistance features';
      default: return 'Essential caregiving tools and client management';
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
    <div className="space-y-6">
      {/* Specialization Header */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{getSpecializationTitle()}</h1>
            <p className="text-gray-600 mt-1">{getSpecializationDescription()}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">Qualification Level</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                specializationInfo.level === 'medical' ? 'bg-red-100 text-red-800' :
                specializationInfo.level === 'therapy' ? 'bg-orange-100 text-orange-800' :
                specializationInfo.level === 'dementia' ? 'bg-purple-100 text-purple-800' :
                specializationInfo.level === 'companion' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {specializationInfo.level.charAt(0).toUpperCase() + specializationInfo.level.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Specializations & Certifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Specializations</h3>
          <div className="flex flex-wrap gap-2">
            {specializationInfo.specializations.map((spec, index) => (
              <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {spec}
              </span>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Certifications</h3>
          <div className="flex flex-wrap gap-2">
            {specializationInfo.certifications.map((cert, index) => (
              <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                <Award className="h-3 w-3 inline mr-1" />
                {cert}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Specialized Features */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Specialized Tools</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {specializationInfo.features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <button
                key={index}
                onClick={() => navigate(feature.route)}
                className={`${feature.color} text-white p-4 rounded-lg transition-colors hover:opacity-90 flex flex-col items-center space-y-2`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-sm font-medium text-center">{feature.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Qualification-based Alerts */}
      {specializationInfo.level === 'medical' && (
        <div className="card border-l-4 border-red-500 bg-red-50">
          <div className="flex items-start">
            <Stethoscope className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Medical Caregiver Responsibilities</h4>
              <ul className="text-sm text-red-700 mt-1 space-y-1">
                <li>• Monitor and document vital signs accurately</li>
                <li>• Administer medications as prescribed</li>
                <li>• Recognize and respond to medical emergencies</li>
                <li>• Maintain detailed medical records</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {specializationInfo.level === 'dementia' && (
        <div className="card border-l-4 border-purple-500 bg-purple-50">
          <div className="flex items-start">
            <Brain className="h-5 w-5 text-purple-600 mr-2 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-purple-800">Memory Care Specialist Guidelines</h4>
              <ul className="text-sm text-purple-700 mt-1 space-y-1">
                <li>• Implement cognitive stimulation activities</li>
                <li>• Monitor behavioral changes and triggers</li>
                <li>• Maintain safe, structured environment</li>
                <li>• Provide family education and support</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {specializationInfo.level === 'therapy' && (
        <div className="card border-l-4 border-orange-500 bg-orange-50">
          <div className="flex items-start">
            <Activity className="h-5 w-5 text-orange-600 mr-2 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-orange-800">Physical Therapy Protocols</h4>
              <ul className="text-sm text-orange-700 mt-1 space-y-1">
                <li>• Assess mobility and functional capacity</li>
                <li>• Design personalized exercise programs</li>
                <li>• Monitor progress and adjust treatments</li>
                <li>• Ensure safe exercise environments</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics Based on Specialization */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {specializationInfo.level === 'medical' && (
            <>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Pill className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <div className="text-xl font-bold text-gray-900">98%</div>
                <div className="text-sm text-gray-600">Medication Accuracy</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <Heart className="h-6 w-6 text-red-600 mx-auto mb-2" />
                <div className="text-xl font-bold text-gray-900">156</div>
                <div className="text-sm text-gray-600">Vitals Recorded</div>
              </div>
            </>
          )}
          
          {specializationInfo.level === 'therapy' && (
            <>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <Activity className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                <div className="text-xl font-bold text-gray-900">85%</div>
                <div className="text-sm text-gray-600">Mobility Improvement</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <div className="text-xl font-bold text-gray-900">23</div>
                <div className="text-sm text-gray-600">Exercise Sessions</div>
              </div>
            </>
          )}
          
          {specializationInfo.level === 'dementia' && (
            <>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Brain className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <div className="text-xl font-bold text-gray-900">92%</div>
                <div className="text-sm text-gray-600">Cognitive Stability</div>
              </div>
              <div className="text-center p-4 bg-indigo-50 rounded-lg">
                <Eye className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
                <div className="text-xl font-bold text-gray-900">12</div>
                <div className="text-sm text-gray-600">Behavior Incidents</div>
              </div>
            </>
          )}

          {specializationInfo.level === 'companion' && (
            <>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Users className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <div className="text-xl font-bold text-gray-900">45</div>
                <div className="text-sm text-gray-600">Social Activities</div>
              </div>
              <div className="text-center p-4 bg-pink-50 rounded-lg">
                <Heart className="h-6 w-6 text-pink-600 mx-auto mb-2" />
                <div className="text-xl font-bold text-gray-900">4.9</div>
                <div className="text-sm text-gray-600">Satisfaction Score</div>
              </div>
            </>
          )}

          {/* Common metrics for all levels */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Clock className="h-6 w-6 text-gray-600 mx-auto mb-2" />
            <div className="text-xl font-bold text-gray-900">96%</div>
            <div className="text-sm text-gray-600">Punctuality</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <Award className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <div className="text-xl font-bold text-gray-900">4.8</div>
            <div className="text-sm text-gray-600">Overall Rating</div>
          </div>
        </div>
      </div>

      {/* Continuing Education Recommendations */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Training</h3>
        <div className="space-y-3">
          {specializationInfo.level === 'basic' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900">Advance Your Qualifications</h4>
              <p className="text-sm text-blue-700 mt-1">Consider specialized training to expand your caregiving capabilities:</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">CPR Certification</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">First Aid Training</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Dementia Care</span>
              </div>
            </div>
          )}
          
          {specializationInfo.level === 'medical' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-900">Continuing Medical Education</h4>
              <p className="text-sm text-red-700 mt-1">Stay current with medical best practices:</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Advanced Cardiac Care</span>
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Diabetes Management</span>
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Wound Care Certification</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpecializedCaregiverDashboard;
