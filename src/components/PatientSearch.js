/**
 * Client Search Component
 * Search clients by simple ID, name, email, or phone
 * 
 * @component
 * @param {Function} onSelectPatient - Callback function called when a Client is selected
 * @param {string} placeholder - Placeholder text for the search input (default: "Search by Client ID, name, email, or phone...")
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Search,
  User,
  Mail,
  Phone,
  Calendar,
  FileText,
  X,
  Loader2
} from 'lucide-react';
import { searchPatients, getPatientByPatientId } from '../api/patientsAPI';
import { useUser } from '../contexts/UserContext';

const PatientSearch = ({ onSelectPatient, placeholder }) => {
  const { userProfile } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    const performSearch = async () => {
      if (!searchTerm.trim()) {
        setResults([]);
        setShowResults(false);
        return;
      }

      setLoading(true);
      try {
        // If search term looks like a Client ID (UC-YYYY-NNNN format), try direct lookup first
        if (/^UC-\d{4}-\d{4}$/i.test(searchTerm.trim())) {
          try {
            const Client = await getPatientByPatientId(searchTerm.trim().toUpperCase());
            setResults([Client]);
            setShowResults(true);
            setLoading(false);
            return;
          } catch (error) {
            // Not found by ID, continue with general search
          }
        }

        // General search
        const searchResults = await searchPatients(
          searchTerm,
          userProfile?.institutionId || null
        );
        setResults(searchResults);
        setShowResults(searchResults.length > 0);
      } catch (error) {
        console.error('Error searching clients:', error);
        setResults([]);
        setShowResults(false);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, userProfile?.institutionId]);

  const handleSelect = (Client) => {
    setSearchTerm('');
    setShowResults(false);
    setSelectedIndex(-1);
    if (onSelectPatient) {
      onSelectPatient(Client);
    }
  };

  const handleKeyDown = (e) => {
    if (!showResults || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowResults(false);
      setSelectedIndex(-1);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString();
    } catch (e) {
      return 'N/A';
    }
  };

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) {
              setShowResults(true);
            }
          }}
          onBlur={() => {
            // Delay to allow click events to fire
            setTimeout(() => setShowResults(false), 200);
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-slate-700 bg-slate-900/60 text-slate-50 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('');
              setResults([]);
              setShowResults(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {loading && (
          <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
          </div>
        )}
      </div>

      {/* Search Results */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-slate-950 border border-slate-800/80 rounded-2xl shadow-xl shadow-black/50 max-h-96 overflow-y-auto">
          <div className="p-2">
            {results.map((client, index) => (
              <div
                key={client.id || client.clientId || index}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(client);
                }}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  index === selectedIndex
                    ? 'bg-blue-500/20 border border-blue-500/30'
                    : 'bg-slate-900/60 hover:bg-slate-800/60 border border-transparent'
                } ${index < results.length - 1 ? 'mb-2' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <div className="font-semibold text-slate-50 truncate">
                        {client.name || client.fullName || 'Unknown Client'}
                      </div>
                      {client.clientId && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded text-xs font-mono flex-shrink-0">
                          {client.clientId}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-2">
                      {client.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {client.dateOfBirth && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(client.dateOfBirth)}</span>
                        </div>
                      )}
                    </div>
                    
                    {client.gender && (
                      <div className="text-xs text-slate-500 mt-1">
                        {client.gender} • {client.status || 'active'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {showResults && !loading && searchTerm && results.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-slate-950 border border-slate-800/80 rounded-2xl shadow-xl shadow-black/50 p-4">
          <div className="text-center text-slate-400 text-sm">
            No clients found matching "{searchTerm}"
          </div>
        </div>
      )}
    </div>
  );
};

PatientSearch.propTypes = {
  onSelectPatient: PropTypes.func,
  placeholder: PropTypes.string
};

PatientSearch.defaultProps = {
  placeholder: "Search by Client ID, name, email, or phone..."
};

export default PatientSearch;

