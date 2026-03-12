import React from 'react';
import { useFontSize } from '../contexts/FontSizeContext';
import { Type, ZoomIn, ZoomOut } from 'lucide-react';

const FontSizeToggle = ({ className = '' }) => {
  const { fontSize, toggleFontSize, setFontSize } = useFontSize();

  const getIcon = () => {
    switch (fontSize) {
      case 'small':
        return <ZoomOut className="h-4 w-4" />;
      case 'large':
        return <ZoomIn className="h-4 w-4" />;
      default:
        return <Type className="h-4 w-4" />;
    }
  };

  const getLabel = () => {
    switch (fontSize) {
      case 'small':
        return 'Small';
      case 'medium':
        return 'Medium';
      case 'large':
        return 'Large';
      default:
        return 'Medium';
    }
  };

  return (
    <div className={`relative group ${className}`}>
      <button
        onClick={toggleFontSize}
        className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        title={`Font Size: ${getLabel()} (Click to toggle)`}
        aria-label={`Font Size: ${getLabel()}`}
      >
        {getIcon()}
        <span className="ml-2 text-sm font-medium">{getLabel()}</span>
      </button>
      
      {/* Quick size selector dropdown */}
      <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <div className="p-2">
          <button
            onClick={() => setFontSize('small')}
            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
              fontSize === 'small'
                ? 'bg-blue-100 text-blue-800 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center">
              <ZoomOut className="h-4 w-4 mr-2" />
              Small
            </div>
          </button>
          <button
            onClick={() => setFontSize('medium')}
            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
              fontSize === 'medium'
                ? 'bg-blue-100 text-blue-800 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center">
              <Type className="h-4 w-4 mr-2" />
              Medium
            </div>
          </button>
          <button
            onClick={() => setFontSize('large')}
            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
              fontSize === 'large'
                ? 'bg-blue-100 text-blue-800 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center">
              <ZoomIn className="h-4 w-4 mr-2" />
              Large
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FontSizeToggle;

