import React, { useState, useEffect } from 'react';
import { 
  Link, 
  Copy, 
  Check, 
  ExternalLink, 
  Settings, 
  AlertTriangle,
  Info,
  Globe,
  Lock,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';

const InstitutionLinkCustomizer = ({ institution, onUpdate, onClose }) => {
  const [customSlug, setCustomSlug] = useState(institution?.customSlug || '');
  const [customDomain, setCustomDomain] = useState(institution?.customDomain || '');
  const [showPreview, setShowPreview] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [copiedField, setCopiedField] = useState(null);

  const baseUrl = window.location.origin;

  // Generate preview URLs
  const generatePreviewUrls = () => {
    const slug = customSlug.trim();
    const domain = customDomain.trim();
    
    if (domain) {
      // Custom domain
      return {
        landing: `https://${domain}`,
        admin: `https://${domain}/admin`,
        caregiver: `https://${domain}/caregiver`,
        pharmacist: `https://${domain}/pharmacist`
      };
    } else if (slug) {
      // Custom slug
      return {
        landing: `${baseUrl}/institution/${slug}`,
        admin: `${baseUrl}/institution/${slug}/admin`,
        caregiver: `${baseUrl}/institution/${slug}/caregiver`,
        pharmacist: `${baseUrl}/institution/${slug}/pharmacist`
      };
    } else {
      // Default institution ID
      return {
        landing: `${baseUrl}/institution/login?institution=${institution.id}`,
        admin: `${baseUrl}/institution/login?institution=${institution.id}&role=admin`,
        caregiver: `${baseUrl}/institution/login?institution=${institution.id}&role=caregiver`,
        pharmacist: `${baseUrl}/institution/login?institution=${institution.id}&role=pharmacist`
      };
    }
  };

  const previewUrls = generatePreviewUrls();

  // Validate custom slug
  const validateSlug = (slug) => {
    if (!slug) return { isValid: true, message: '' };
    
    // Check format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return { 
        isValid: false, 
        message: 'Slug can only contain lowercase letters, numbers, and hyphens' 
      };
    }
    
    // Check length
    if (slug.length < 3) {
      return { 
        isValid: false, 
        message: 'Slug must be at least 3 characters long' 
      };
    }
    
    if (slug.length > 30) {
      return { 
        isValid: false, 
        message: 'Slug must be 30 characters or less' 
      };
    }
    
    // Check for reserved words
    const reservedWords = ['admin', 'api', 'app', 'www', 'mail', 'ftp', 'login', 'dashboard'];
    if (reservedWords.includes(slug.toLowerCase())) {
      return { 
        isValid: false, 
        message: 'This slug is reserved and cannot be used' 
      };
    }
    
    return { isValid: true, message: '' };
  };

  // Validate custom domain
  const validateDomain = (domain) => {
    if (!domain) return { isValid: true, message: '' };
    
    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/;
    if (!domainRegex.test(domain)) {
      return { 
        isValid: false, 
        message: 'Please enter a valid domain (e.g., yourcompany.com)' 
      };
    }
    
    return { isValid: true, message: '' };
  };

  // Handle slug change
  const handleSlugChange = (value) => {
    setCustomSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
    
    // Validate slug
    const validation = validateSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
    setValidationErrors(prev => ({
      ...prev,
      slug: validation.isValid ? '' : validation.message
    }));
  };

  // Handle domain change
  const handleDomainChange = (value) => {
    setCustomDomain(value);
    
    // Validate domain
    const validation = validateDomain(value);
    setValidationErrors(prev => ({
      ...prev,
      domain: validation.isValid ? '' : validation.message
    }));
  };

  // Copy URL to clipboard
  const copyToClipboard = async (url, field) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedField(field);
      toast.success('URL copied to clipboard!');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error('Failed to copy URL');
    }
  };

  // Save customizations
  const handleSave = async () => {
    const slugValidation = validateSlug(customSlug);
    const domainValidation = validateDomain(customDomain);
    
    if (!slugValidation.isValid || !domainValidation.isValid) {
      setValidationErrors({
        slug: slugValidation.isValid ? '' : slugValidation.message,
        domain: domainValidation.isValid ? '' : domainValidation.message
      });
      return;
    }

    setIsUpdating(true);
    
    try {
      const updates = {
        customSlug: customSlug.trim() || null,
        customDomain: customDomain.trim() || null,
        updatedAt: new Date().toISOString()
      };

      await onUpdate(updates);
      toast.success('Institution links updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error updating institution links:', error);
      toast.error('Failed to update institution links');
    } finally {
      setIsUpdating(false);
    }
  };

  const hasErrors = Object.values(validationErrors).some(error => error !== '');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Customize Institution Links</h2>
              <p className="text-blue-100 mt-1">
                {institution?.name} • Make your links more professional and memorable
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Current Links */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Info className="h-5 w-5 mr-2 text-blue-600" />
              Current Links
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Landing Page</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={previewUrls.landing}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(previewUrls.landing, 'landing')}
                    className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    {copiedField === 'landing' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Admin Portal</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={previewUrls.admin}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(previewUrls.admin, 'admin')}
                    className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    {copiedField === 'admin' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Customization Options */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-blue-600" />
              Customization Options
            </h3>

            {/* Custom Slug */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-md font-medium text-gray-900 flex items-center">
                    <Globe className="h-4 w-4 mr-2 text-blue-600" />
                    Custom URL Slug
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Create a memorable URL like: ultimatecare.com/institution/your-company
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Recommended
                </span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Slug
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500 text-sm">{baseUrl}/institution/</span>
                    <input
                      type="text"
                      value={customSlug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="your-company"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {validationErrors.slug && (
                    <p className="text-red-600 text-sm mt-1 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      {validationErrors.slug}
                    </p>
                  )}
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Info className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-blue-900">Example URLs:</span>
                  </div>
                  <div className="space-y-1 text-sm text-blue-800">
                    <p>• Landing: {baseUrl}/institution/{customSlug || 'your-company'}</p>
                    <p>• Admin: {baseUrl}/institution/{customSlug || 'your-company'}/admin</p>
                    <p>• Caregiver: {baseUrl}/institution/{customSlug || 'your-company'}/caregiver</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Domain */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-md font-medium text-gray-900 flex items-center">
                    <Lock className="h-4 w-4 mr-2 text-blue-600" />
                    Custom Domain
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Use your own domain like: your-company.ultimatecare.com or yourcompany.com
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-purple-800">
                  Premium
                </span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Domain
                  </label>
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => handleDomainChange(e.target.value)}
                    placeholder="your-company.ultimatecare.com or yourcompany.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {validationErrors.domain && (
                    <p className="text-red-600 text-sm mt-1 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      {validationErrors.domain}
                    </p>
                  )}
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                    <span className="text-sm font-medium text-yellow-900">Setup Required:</span>
                  </div>
                  <div className="space-y-1 text-sm text-yellow-800">
                    <p>• Contact support to configure DNS settings</p>
                    <p>• SSL certificate will be automatically provisioned</p>
                    <p>• Domain verification required before activation</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900 flex items-center">
                  <Eye className="h-4 w-4 mr-2 text-gray-600" />
                  Preview Your Links
                </h4>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
              </div>
              
              {showPreview && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Landing Page</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={previewUrls.landing}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(previewUrls.landing, 'preview-landing')}
                        className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        {copiedField === 'preview-landing' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Admin Portal</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={previewUrls.admin}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(previewUrls.admin, 'preview-admin')}
                        className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        {copiedField === 'preview-admin' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Caregiver Portal</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={previewUrls.caregiver}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(previewUrls.caregiver, 'preview-caregiver')}
                        className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        {copiedField === 'preview-caregiver' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Pharmacist Portal</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={previewUrls.pharmacist}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(previewUrls.pharmacist, 'preview-pharmacist')}
                        className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        {copiedField === 'preview-pharmacist' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isUpdating || hasErrors}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
            >
              {isUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstitutionLinkCustomizer;
