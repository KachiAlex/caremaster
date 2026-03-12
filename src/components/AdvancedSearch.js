import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';

/**
 * AdvancedSearch Component
 * A reusable search component with advanced filtering capabilities
 * 
 * @param {Object} props
 * @param {string} props.value - Current search value
 * @param {Function} props.onChange - Callback when search value changes
 * @param {string} props.placeholder - Placeholder text
 * @param {Array} props.filters - Array of filter objects {key, label, type, options}
 * @param {Object} props.activeFilters - Current active filter values
 * @param {Function} props.onFilterChange - Callback when filters change
 * @param {Function} props.onClearFilters - Callback to clear all filters
 */
const AdvancedSearch = ({
  value = '',
  onChange,
  placeholder = 'Search...',
  filters = [],
  activeFilters = {},
  onFilterChange,
  onClearFilters,
  showFilters = true
}) => {
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const hasActiveFilters = Object.values(activeFilters).some(v => v !== '' && v !== null && v !== undefined);

  const handleFilterChange = (key, filterValue) => {
    if (onFilterChange) {
      onFilterChange({ ...activeFilters, [key]: filterValue });
    }
  };

  const handleClearFilters = () => {
    if (onClearFilters) {
      onClearFilters();
    }
    setShowFilterPanel(false);
  };

  return (
    <div className="w-full">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-20 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {value && (
            <button
              onClick={() => onChange('')}
              className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {showFilters && filters.length > 0 && (
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`flex items-center px-3 py-1 rounded-lg text-sm transition-colors ${
                hasActiveFilters
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Toggle filters"
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                  {Object.values(activeFilters).filter(v => v !== '' && v !== null && v !== undefined).length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilterPanel && filters.length > 0 && (
        <div className="mt-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Advanced Filters</h3>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear All
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map((filter) => (
              <div key={filter.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {filter.label}
                </label>
                {filter.type === 'select' ? (
                  <select
                    value={activeFilters[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">All {filter.label}</option>
                    {filter.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : filter.type === 'date' ? (
                  <input
                    type="date"
                    value={activeFilters[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                ) : filter.type === 'dateRange' ? (
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={activeFilters[`${filter.key}Start`] || ''}
                      onChange={(e) => handleFilterChange(`${filter.key}Start`, e.target.value)}
                      placeholder="Start"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <input
                      type="date"
                      value={activeFilters[`${filter.key}End`] || ''}
                      onChange={(e) => handleFilterChange(`${filter.key}End`, e.target.value)}
                      placeholder="End"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                ) : (
                  <input
                    type={filter.type || 'text'}
                    value={activeFilters[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    placeholder={filter.placeholder || `Filter by ${filter.label}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch;

