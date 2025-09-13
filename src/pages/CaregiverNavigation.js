import React, { useState, useEffect } from 'react';
import { 
  Navigation, 
  MapPin, 
  Clock, 
  Phone, 
  MessageCircle, 
  Calendar,
  Star,
  AlertTriangle,
  CheckCircle,
  Route,
  Car,
  Walking,
  Search,
  Filter,
  User,
  Home,
  Building,
  Navigation as NavIcon,
  Target,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

const CaregiverNavigation = () => {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    // Simulate loading route data
    const loadRoutes = async () => {
      try {
        setTimeout(() => {
          const mockRoutes = [
            {
              id: 1,
              patientName: 'Adunni Okafor',
              patientId: 'ELD001',
              address: '123 Victoria Island, Lagos',
              coordinates: { lat: 6.4281, lng: 3.4219 },
              distance: 2.5,
              estimatedTime: 15,
              priority: 'high',
              visitTime: '2024-01-21T09:00:00Z',
              status: 'scheduled',
              notes: 'Morning medication administration',
              contactNumber: '+234 801 234 5678',
              lastVisited: '2024-01-20T09:00:00Z'
            },
            {
              id: 2,
              patientName: 'Grace Johnson',
              patientId: 'ELD002',
              address: '456 Ikoyi, Lagos',
              coordinates: { lat: 6.4474, lng: 3.4288 },
              distance: 5.2,
              estimatedTime: 25,
              priority: 'medium',
              visitTime: '2024-01-21T10:00:00Z',
              status: 'scheduled',
              notes: 'Physical therapy session',
              contactNumber: '+234 802 345 6789',
              lastVisited: '2024-01-19T10:00:00Z'
            },
            {
              id: 3,
              patientName: 'Michael Adebayo',
              patientId: 'ELD003',
              address: '789 Lekki, Lagos',
              coordinates: { lat: 6.4698, lng: 3.5852 },
              distance: 8.7,
              estimatedTime: 35,
              priority: 'low',
              visitTime: '2024-01-21T14:00:00Z',
              status: 'scheduled',
              notes: 'Regular checkup and medication review',
              contactNumber: '+234 803 456 7890',
              lastVisited: '2024-01-18T14:00:00Z'
            },
            {
              id: 4,
              patientName: 'Sarah Williams',
              patientId: 'ELD004',
              address: '321 Surulere, Lagos',
              coordinates: { lat: 6.5018, lng: 3.3584 },
              distance: 12.3,
              estimatedTime: 45,
              priority: 'medium',
              visitTime: '2024-01-21T16:00:00Z',
              status: 'scheduled',
              notes: 'Lunch preparation and care routine',
              contactNumber: '+234 804 567 8901',
              lastVisited: '2024-01-17T16:00:00Z'
            }
          ];

          setRoutes(mockRoutes);
          setSelectedRoute(mockRoutes[0]);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading routes:', error);
        setLoading(false);
      }
    };

    loadRoutes();
  }, []);

  const filteredRoutes = routes.filter(route => {
    const matchesSearch = route.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         route.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || route.priority === filterType;
    return matchesSearch && matchesFilter;
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const handleStartNavigation = (route) => {
    // Simulate starting navigation
    setRoutes(routes.map(r => 
      r.id === route.id 
        ? { ...r, status: 'in-progress' }
        : r
    ));
  };

  const handleCompleteVisit = (route) => {
    // Simulate completing visit
    setRoutes(routes.map(r => 
      r.id === route.id 
        ? { ...r, status: 'completed' }
        : r
    ));
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
            <div className="h-12 w-12 rounded-full bg-purple-600 flex items-center justify-center">
              <Navigation className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Navigation</h1>
              <p className="text-gray-600">Plan your routes and navigate to patient locations</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center">
              <Route className="h-5 w-5 mr-2" />
              Optimize Route
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full h-full flex dashboard-full-width">
        {/* Routes List */}
        <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
          {/* Search and Filter */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search patients or addresses..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>

          {/* Routes */}
          <div className="flex-1 overflow-y-auto">
            {filteredRoutes.map((route) => (
              <div
                key={route.id}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedRoute?.id === route.id ? 'bg-purple-50 border-purple-200' : ''
                }`}
                onClick={() => setSelectedRoute(route)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">{route.patientName}</h3>
                    <p className="text-xs text-gray-600">ID: {route.patientId}</p>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(route.priority)}`}>
                      {route.priority}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(route.status)}`}>
                      {route.status}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center text-xs text-gray-600 mb-2">
                  <MapPin className="h-3 w-3 mr-1" />
                  <span className="truncate">{route.address}</span>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center">
                      <Car className="h-3 w-3 mr-1" />
                      {route.distance} km
                    </span>
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {route.estimatedTime} min
                    </span>
                  </div>
                  <span className="font-medium">{formatTime(route.visitTime)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Map and Details */}
        <div className="flex-1 flex flex-col">
          {selectedRoute ? (
            <>
              {/* Map Placeholder */}
              <div className="h-1/2 bg-gray-200 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Interactive Map</p>
                    <p className="text-sm text-gray-500">Map integration would go here</p>
                  </div>
                </div>
                <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3">
                  <div className="text-sm">
                    <div className="flex items-center mb-1">
                      <Car className="h-4 w-4 mr-2 text-blue-600" />
                      <span className="font-medium">{selectedRoute.distance} km</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-green-600" />
                      <span className="font-medium">{selectedRoute.estimatedTime} min</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Route Details */}
              <div className="h-1/2 bg-white border-t border-gray-200 overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedRoute.patientName}</h2>
                      <p className="text-gray-600">ID: {selectedRoute.patientId}</p>
                    </div>
                    <div className="flex space-x-2">
                      {selectedRoute.status === 'scheduled' && (
                        <button
                          onClick={() => handleStartNavigation(selectedRoute)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
                        >
                          <NavIcon className="h-4 w-4 mr-2" />
                          Start Navigation
                        </button>
                      )}
                      {selectedRoute.status === 'in-progress' && (
                        <button
                          onClick={() => handleCompleteVisit(selectedRoute)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Complete Visit
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Route Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Route Information</h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <MapPin className="h-5 w-5 text-gray-600 mr-3" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Address</p>
                              <p className="text-sm text-gray-600">{selectedRoute.address}</p>
                            </div>
                          </div>
                          <button className="text-blue-600 hover:text-blue-800">
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <Clock className="h-5 w-5 text-gray-600 mr-3" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Visit Time</p>
                              <p className="text-sm text-gray-600">{formatTime(selectedRoute.visitTime)}</p>
                            </div>
                          </div>
                          <span className="text-sm text-gray-500">{formatDate(selectedRoute.visitTime)}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <Car className="h-5 w-5 text-gray-600 mr-3" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Distance & Time</p>
                              <p className="text-sm text-gray-600">{selectedRoute.distance} km • {selectedRoute.estimatedTime} min</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Patient Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Patient Information</h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <Phone className="h-5 w-5 text-gray-600 mr-3" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Contact</p>
                              <p className="text-sm text-gray-600">{selectedRoute.contactNumber}</p>
                            </div>
                          </div>
                          <button className="text-blue-600 hover:text-blue-800">
                            <Phone className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <Calendar className="h-5 w-5 text-gray-600 mr-3" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Last Visit</p>
                              <p className="text-sm text-gray-600">{formatDate(selectedRoute.lastVisited)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-start">
                            <MessageCircle className="h-5 w-5 text-gray-600 mr-3 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Notes</p>
                              <p className="text-sm text-gray-600">{selectedRoute.notes}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Navigation className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a route</h3>
                <p className="text-gray-600">Choose a patient route from the list to view details and start navigation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CaregiverNavigation;
