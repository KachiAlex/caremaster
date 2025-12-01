/**
 * Currency Formatting Utility
 * 
 * Provides currency formatting functions based on institution settings
 */

import { getInstitution } from '../api/institutionAPI';

/**
 * Format currency based on institution settings
 * @param {number} amount - Amount to format
 * @param {Object} institutionSettings - Institution settings object with currency info
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, institutionSettings = null) => {
  if (!institutionSettings) {
    // Default to USD if no settings provided
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  }

  const {
    currency = 'USD',
    currencySymbol = '$',
    currencyPosition = 'before'
  } = institutionSettings;

  // Use Intl.NumberFormat with the currency code
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);

  // If the symbol position needs to be customized, we can override
  // For now, Intl.NumberFormat handles most cases correctly
  return formatted;
};

/**
 * Get institution currency settings
 * @param {string} institutionId - Institution ID
 * @returns {Promise<Object>} Institution currency settings
 */
export const getInstitutionCurrencySettings = async (institutionId) => {
  try {
    if (!institutionId) {
      return {
        currency: 'USD',
        currencySymbol: '$',
        currencyPosition: 'before',
        taxRate: 0
      };
    }

    const institution = await getInstitution(institutionId);
    
    if (!institution) {
      return {
        currency: 'USD',
        currencySymbol: '$',
        currencyPosition: 'before',
        taxRate: 0
      };
    }

    return {
      currency: institution.currency || 'USD',
      currencySymbol: institution.currencySymbol || '$',
      currencyPosition: institution.currencyPosition || 'before',
      taxRate: institution.taxRate !== undefined ? institution.taxRate : 0
    };
  } catch (error) {
    console.error('Error fetching institution currency settings:', error);
    // Return defaults on error
    return {
      currency: 'USD',
      currencySymbol: '$',
      currencyPosition: 'before',
      taxRate: 0
    };
  }
};

/**
 * Format currency with custom symbol position (if needed)
 * @param {number} amount - Amount to format
 * @param {string} symbol - Currency symbol
 * @param {string} position - 'before' or 'after'
 * @returns {string} Formatted currency string
 */
export const formatCurrencyWithPosition = (amount, symbol, position = 'before') => {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);

  if (position === 'after') {
    return `${formattedAmount} ${symbol}`;
  }
  return `${symbol}${formattedAmount}`;
};

/**
 * Format currency amount (alias for formatCurrency for backward compatibility)
 * @param {number} amount - Amount to format
 * @param {Object} institutionSettings - Institution settings object with currency info
 * @returns {string} Formatted currency string
 */
export const formatCurrencyAmount = (amount, institutionSettings = null) => {
  return formatCurrency(amount, institutionSettings);
};

