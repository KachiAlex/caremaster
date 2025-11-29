import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

// Statistics Card Component (like in Preclinic template)
export const StatCard = ({ title, value, change, changeType, icon: Icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="h-6 w-6" />
        </div>
        {change && (
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
            changeType === 'increase' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {changeType === 'increase' ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{change}</span>
          </div>
        )}
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
        <p className="text-sm text-gray-600">{title}</p>
        {change && (
          <p className="text-xs text-gray-500 mt-1">
            in last 7 Days
          </p>
        )}
      </div>
    </div>
  );
};

// Table Component (like in Preclinic template)
export const PreclinicTable = ({ headers, data, actions, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
              {actions && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td colSpan={headers.length + (actions ? 1 : 0)} className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    <p className="text-lg font-medium">No data available</p>
                    <p className="text-sm">Data will appear here when available</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                  {Object.values(row).map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-6 py-4 whitespace-nowrap">
                      {cell}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {actions.map((action, actionIndex) => (
                          <button
                            key={actionIndex}
                            onClick={() => action.onClick(row)}
                            className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium transition-colors ${action.className}`}
                          >
                            {action.icon && <action.icon className="h-3 w-3 mr-1" />}
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Status Badge Component
export const StatusBadge = ({ status, customColors }) => {
  const defaultColors = {
    'active': 'bg-green-100 text-green-800',
    'inactive': 'bg-gray-100 text-gray-800',
    'pending': 'bg-yellow-100 text-yellow-800',
    'completed': 'bg-green-100 text-green-800',
    'cancelled': 'bg-red-100 text-red-800',
    'scheduled': 'bg-blue-100 text-blue-800',
    'available': 'bg-green-100 text-green-800',
    'unavailable': 'bg-red-100 text-red-800',
    'online': 'bg-green-100 text-green-800',
    'offline': 'bg-gray-100 text-gray-800',
    'verified': 'bg-green-100 text-green-800',
    'unverified': 'bg-yellow-100 text-yellow-800'
  };

  const colors = customColors || defaultColors;
  const colorClass = colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {status}
    </span>
  );
};

// Page Header Component
export const PageHeader = ({ title, subtitle, actions }) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
        </div>
        {actions && (
          <div className="flex items-center space-x-3">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${action.className}`}
              >
                {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Card Component
export const PreclinicCard = ({ title, children, actions, className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {actions && (
              <div className="flex items-center space-x-2">
                {actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${action.className}`}
                  >
                    {action.icon && <action.icon className="h-4 w-4 mr-1" />}
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

// Form Components
export const PreclinicInput = ({ label, type = 'text', placeholder, value, onChange, required = false, className = '' }) => {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      />
    </div>
  );
};

export const PreclinicSelect = ({ label, options, value, onChange, required = false, className = '' }) => {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      >
        {options.map((option, index) => (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export const PreclinicTextarea = ({ label, placeholder, value, onChange, rows = 4, required = false, className = '' }) => {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
      />
    </div>
  );
};

export default { StatCard, PreclinicTable, StatusBadge, PageHeader, PreclinicCard, PreclinicInput, PreclinicSelect, PreclinicTextarea };
