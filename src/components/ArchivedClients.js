import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-toastify';
import { 
  Package, 
  Search, 
  RefreshCw, 
  Eye, 
  Calendar,
  User,
  Mail,
  Phone,
  RotateCcw,
  AlertCircle
} from 'lucide-react';

const ArchivedClients = ({ institutionId }) => {
  const [archivedClients, setArchivedClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadArchivedClients();
  }, [institutionId]);

  useEffect(() => {
    filterClients();
  }, [archivedClients, searchTerm]);

  const loadArchivedClients = async () => {
    try {
      setLoading(true);
      
      // Query clients with archived status
      const clientsQuery = query(
        collection(db, 'users'),
        where('institutionId', '==', institutionId),
        where('status', '==', 'archived'),
        where('userType', '==', 'client')
      );
      
      const querySnapshot = await getDocs(clientsQuery);
      const clients = [];
      
      querySnapshot.forEach((doc) => {
        const clientData = doc.data();
        clients.push({
          id: doc.id,
          ...clientData
        });
      });
      
      // Sort by archived date (most recent first)
      clients.sort((a, b) => {
        const dateA = new Date(a.archivedAt || 0);
        const dateB = new Date(b.archivedAt || 0);
        return dateB - dateA;
      });
      
      setArchivedClients(clients);
    } catch (error) {
      console.error('Error loading archived clients:', error);
      toast.error('Failed to load archived clients');
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    if (!searchTerm) {
      setFilteredClients(archivedClients);
      return;
    }

    const filtered = archivedClients.filter(client =>
      client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredClients(filtered);
  };

  const handleRestoreClient = async (clientId) => {
    if (!window.confirm('Are you sure you want to restore this client? They will become active again.')) {
      return;
    }

    try {
      setRestoring(true);
      
      const clientRef = doc(db, 'users', clientId);
      await updateDoc(clientRef, {
        status: 'active',
        restoredAt: new Date().toISOString(),
        archivedAt: null,
        archivedBy: null
      });

      toast.success('Client restored successfully');
      
      // Reload archived clients
      await loadArchivedClients();
      setShowDetailsModal(false);
      setSelectedClient(null);
    } catch (error) {
      console.error('Error restoring client:', error);
      toast.error('Failed to restore client');
    } finally {
      setRestoring(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      return `${Math.floor(diffDays / 365)} years ago`;
    } catch {
      return 'Unknown';
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
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Package className="h-6 w-6 mr-2 text-yellow-600" />
              Archived Clients
            </h2>
            <p className="text-gray-600 mt-1">View and restore archived clients</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={loadArchivedClients}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <div className="text-sm text-gray-500">
              {archivedClients.length} archived client(s)
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search archived clients by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Archived Clients List */}
      {filteredClients.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No matching archived clients' : 'No archived clients'}
          </h3>
          <p className="text-gray-600">
            {searchTerm 
              ? 'Try adjusting your search terms'
              : 'Archived clients will appear here when you archive them from the Clients tab'
            }
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Archived
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-yellow-800">
                            {(client.name || client.fullName || 'C')?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {client.name || client.fullName || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {client.id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      {client.email || 'No email'}
                    </div>
                    {client.phone && (
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        {client.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      {getTimeAgo(client.archivedAt)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(client.archivedAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedClient(client);
                          setShowDetailsModal(true);
                        }}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </button>
                      <button
                        onClick={() => handleRestoreClient(client.id)}
                        disabled={restoring}
                        className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Restore
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Client Details Modal */}
      {showDetailsModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  Archived Client Details
                </h3>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedClient(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <AlertCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Client Info */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Package className="h-5 w-5 text-yellow-600 mr-2" />
                    <span className="text-sm font-medium text-yellow-800">
                      This client is archived
                    </span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Archived {getTimeAgo(selectedClient.archivedAt)} on {formatDate(selectedClient.archivedAt)}
                  </p>
                </div>

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Name</label>
                    <p className="mt-1 text-gray-900">
                      {selectedClient.name || selectedClient.fullName || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="mt-1 text-gray-900">{selectedClient.email || 'No email'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Phone</label>
                    <p className="mt-1 text-gray-900">{selectedClient.phone || 'No phone'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Age</label>
                    <p className="mt-1 text-gray-900">{selectedClient.age || 'Not specified'}</p>
                  </div>
                </div>

                {/* Address */}
                {selectedClient.address && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Address</label>
                    <p className="mt-1 text-gray-900">{selectedClient.address}</p>
                  </div>
                )}

                {/* Medical Info */}
                {selectedClient.medicalConditions && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      Medical Conditions
                    </label>
                    <p className="mt-1 text-gray-900 whitespace-pre-wrap">
                      {selectedClient.medicalConditions}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {selectedClient.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Notes</label>
                    <p className="mt-1 text-gray-900 whitespace-pre-wrap">
                      {selectedClient.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center mt-6 pt-6 border-t">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedClient(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => handleRestoreClient(selectedClient.id)}
                  disabled={restoring}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {restoring ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Restoring...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore Client
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchivedClients;
