/**
 * Query Security Audit Utility
 * SECURITY FIX: Audits Firestore queries for injection vulnerabilities
 */

import logger from './logger';

/**
 * Validate query parameter to prevent injection
 */
export function validateQueryParameter(value, type = 'string') {
  if (value === null || value === undefined) {
    return { valid: false, error: 'Query parameter cannot be null or undefined' };
  }
  
  // Check for potentially dangerous patterns
  const dangerousPatterns = [
    /[<>]/,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:text\/html/i,
    /eval\(/i,
    /exec\(/i,
    /script/i
  ];
  
  const valueStr = String(value);
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(valueStr)) {
      logger.warn('Potentially dangerous query parameter detected', { 
        value: valueStr.substring(0, 50),
        pattern: pattern.toString()
      });
      return { valid: false, error: 'Invalid query parameter format' };
    }
  }
  
  // Type-specific validation
  if (type === 'string') {
    if (valueStr.length > 1000) {
      return { valid: false, error: 'Query parameter too long' };
    }
  } else if (type === 'number') {
    if (isNaN(Number(value))) {
      return { valid: false, error: 'Query parameter must be a number' };
    }
  } else if (type === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(valueStr)) {
      return { valid: false, error: 'Invalid email format' };
    }
  }
  
  return { valid: true, sanitized: valueStr };
}

/**
 * Sanitize query value for Firestore
 */
export function sanitizeQueryValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  
  // Firestore queries are generally safe, but we should still sanitize
  if (typeof value === 'string') {
    // Remove null bytes and control characters
    let sanitized = value.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Limit length
    if (sanitized.length > 1000) {
      sanitized = sanitized.substring(0, 1000);
    }
    
    return sanitized;
  }
  
  return value;
}

/**
 * Validate Firestore where clause parameters
 */
export function validateWhereClause(field, operator, value) {
  // Validate field name
  if (!field || typeof field !== 'string') {
    return { valid: false, error: 'Field name must be a non-empty string' };
  }
  
  // Validate field name format (alphanumeric and underscore only)
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
    return { valid: false, error: 'Invalid field name format' };
  }
  
  // Validate operator
  const validOperators = ['==', '!=', '<', '<=', '>', '>=', 'in', 'array-contains', 'array-contains-any'];
  if (!validOperators.includes(operator)) {
    return { valid: false, error: `Invalid operator: ${operator}` };
  }
  
  // Validate value
  const valueValidation = validateQueryParameter(value);
  if (!valueValidation.valid) {
    return valueValidation;
  }
  
  return { valid: true, sanitizedValue: sanitizeQueryValue(value) };
}

/**
 * Create secure Firestore query
 */
export function createSecureQuery(collectionRef, constraints = []) {
  try {
    // Validate all constraints
    const validatedConstraints = [];
    
    for (const constraint of constraints) {
      if (constraint.type === 'where') {
        const validation = validateWhereClause(
          constraint.field,
          constraint.operator,
          constraint.value
        );
        
        if (!validation.valid) {
          logger.error('Invalid query constraint', { 
            constraint,
            error: validation.error 
          });
          throw new Error(`Invalid query constraint: ${validation.error}`);
        }
        
        validatedConstraints.push({
          ...constraint,
          value: validation.sanitizedValue
        });
      } else {
        // Other constraint types (orderBy, limit, etc.)
        validatedConstraints.push(constraint);
      }
    }
    
    return { constraints: validatedConstraints, valid: true };
  } catch (error) {
    logger.error('Failed to create secure query', { error: error.message });
    return { valid: false, error: error.message };
  }
}

/**
 * Audit existing query for security issues
 */
export function auditQuery(queryConstraints) {
  const issues = [];
  
  for (const constraint of queryConstraints) {
    if (constraint.type === 'where') {
      // Check for potential injection
      if (typeof constraint.value === 'string') {
        const dangerousPatterns = [
          /[<>]/,
          /javascript:/i,
          /on\w+\s*=/i
        ];
        
        for (const pattern of dangerousPatterns) {
          if (pattern.test(constraint.value)) {
            issues.push({
              severity: 'high',
              type: 'potential_injection',
              field: constraint.field,
              value: constraint.value.substring(0, 50),
              recommendation: 'Sanitize query parameter before use'
            });
          }
        }
      }
      
      // Check for proper operator usage
      if (!['==', '!=', '<', '<=', '>', '>=', 'in', 'array-contains'].includes(constraint.operator)) {
        issues.push({
          severity: 'medium',
          type: 'invalid_operator',
          operator: constraint.operator,
          recommendation: 'Use only valid Firestore operators'
        });
      }
    }
  }
  
  return {
    secure: issues.length === 0,
    issues
  };
}

export default {
  validateQueryParameter,
  sanitizeQueryValue,
  validateWhereClause,
  createSecureQuery,
  auditQuery
};

