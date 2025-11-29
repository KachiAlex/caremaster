/**
 * Client Registration to Queue Component
 * 
 * Used by Receptionist to:
 * - Register new clients or find existing
 * - Add Client to Triage/Vitals queue
 * - Set priority level
 */

import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Search,
  Heart,
  AlertCircle,
  Clock,
  CheckCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { addToQueue, QUEUE_PRIORITY, DEPARTMENT_TYPES } from '../api/queueAPI';
import { getAllClients } from '../api/patientsAPI';

const PatientRegistrationToQueue = ({ institutionId, onPatientAdded }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [priority, setPriority] = useState(QUEUE_PRIORITY.NORMAL);
  const [loading, setLoading] = useState(false);
  const [addingToQueue, setAddingToQueue] = useState(false);

  // New Client form data
  const [newPatientData, setNewPatientData] = useState({
    fullName: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    address: ''
  });

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchPatients();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const searchPatients = async () => {
    try {
      setLoading(true);
      const clients = await getAllClients(institutionId);
      const filtered = clients.filter(p => 
        p.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phoneNumber?.includes(searchTerm) ||
        p.clientId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(filtered.slice(0, 10));
    } catch (error) {
      console.error('Error searching clients:', error);
      toast.error('Failed to search clients');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToQueue = async () => {
    if (!selectedPatient) {
      toast.error('Please select a Client');
      return;
    }

    try {
      setAddingToQueue(true);
      
      const queueEntry = await addToQueue({
        clientId: selectedPatient.id,
        clientName: selectedPatient.fullName || selectedPatient.name,
        institutionId,
        department: DEPARTMENT_TYPES.TRIAGE, // Always start with triage
        priority,
        notes: `Registered by receptionist. Priority: ${priority}`
      });

      toast.success(`Client added to queue! Queue number: ${queueEntry.queueNumber}`);
      
      if (onPatientAdded) {
        onPatientAdded(queueEntry);
      }

      // Reset form
      setSelectedPatient(null);
      setSearchTerm('');
      setPriority(QUEUE_PRIORITY.NORMAL);
    } catch (error) {
      console.error('Error adding to queue:', error);
      toast.error('Failed to add Client to queue');
    } finally {
      setAddingToQueue(false);
    }
  };

  const handleCreateNewPatient = async () => {
    // This would integrate with CreateClientModal
    // For now, just show a message
    toast.info('Please use "Register Client" button to create new Client first');
    setShowNewPatientForm(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-blue-600" />
        Register Client to Queue
      </h3>

      {/* Client Search */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Client
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, phone, or Client ID..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
              {searchResults.map((Client) => (
                <button
                  key={client.id}
                  onClick={() => {
                    setSelectedPatient(Client);
                    setSearchTerm(client.fullName || client.name);
                    setSearchResults([]);
                  }}
                  className={`w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100 ${
                    selectedPatient?.id === client.id ? 'bg-blue-100' : ''
                  }`}
                >
                  <div className="font-medium text-gray-900">
                    {client.fullName || client.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {client.phoneNumber} • {client.clientId || client.id}
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchTerm.length >= 2 && searchResults.length === 0 && !loading && (
            <div className="mt-2 text-center py-4 text-gray-500">
              <p className="text-sm">No clients found</p>
              <button
                onClick={() => setShowNewPatientForm(true)}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Create new Client
              </button>
            </div>
          )}
        </div>

        {/* Selected Client Display */}
        {selectedPatient && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  {selectedPatient.fullName || selectedPatient.name}
                </p>
                <p className="text-sm text-gray-600">
                  {selectedPatient.phoneNumber} • {selectedPatient.clientId || selectedPatient.id}
                </p>
              </div>
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        )}

        {/* Priority Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Priority Level
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setPriority(QUEUE_PRIORITY.NORMAL)}
              className={`px-4 py-2 rounded-lg border-2 transition-all ${
                priority === QUEUE_PRIORITY.NORMAL
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Clock className="h-4 w-4 mx-auto mb-1" />
              <span className="text-xs">Normal</span>
            </button>
            <button
              onClick={() => setPriority(QUEUE_PRIORITY.PRIORITY)}
              className={`px-4 py-2 rounded-lg border-2 transition-all ${
                priority === QUEUE_PRIORITY.PRIORITY
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <AlertCircle className="h-4 w-4 mx-auto mb-1" />
              <span className="text-xs">Priority</span>
            </button>
            <button
              onClick={() => setPriority(QUEUE_PRIORITY.EMERGENCY)}
              className={`px-4 py-2 rounded-lg border-2 transition-all ${
                priority === QUEUE_PRIORITY.EMERGENCY
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <AlertCircle className="h-4 w-4 mx-auto mb-1" />
              <span className="text-xs">Emergency</span>
            </button>
          </div>
        </div>

        {/* Add to Queue Button */}
        <button
          onClick={handleAddToQueue}
          disabled={!selectedPatient || addingToQueue}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {addingToQueue ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Adding to Queue...
            </>
          ) : (
            <>
              <Heart className="h-4 w-4" />
              Add to Triage Queue
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PatientRegistrationToQueue;

