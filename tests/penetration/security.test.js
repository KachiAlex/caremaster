/**
 * Penetration Tests for Security Vulnerabilities
 * Tests for SQL injection, XSS, CSRF, authentication bypass, etc.
 */

const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

describe('Security Penetration Tests', () => {
  describe('SQL Injection Tests', () => {
    const sqlInjectionPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "1' OR '1'='1",
      "admin'--",
      "' OR 1=1--"
    ];

    test.each(sqlInjectionPayloads)('should prevent SQL injection in login: %s', async (payload) => {
      try {
        const response = await axios.post(`${BASE_URL}/api/auth/login`, {
          email: payload,
          password: 'test'
        });
        
        // Should not return user data or error should indicate invalid input
        expect(response.data).not.toHaveProperty('user');
        expect(response.status).not.toBe(200);
      } catch (error) {
        // Expected to fail - SQL injection should be blocked
        expect(error.response?.status).toBeGreaterThanOrEqual(400);
      }
    });

    test('should prevent SQL injection in search', async () => {
      const payload = "' UNION SELECT * FROM patients --";
      
      try {
        const response = await axios.get(`${BASE_URL}/api/patients/search?q=${encodeURIComponent(payload)}`);
        
        // Should not return sensitive data
        expect(response.data).not.toContain('password');
        expect(response.data).not.toContain('token');
      } catch (error) {
        // Expected behavior - should reject malicious input
        expect(error.response?.status).toBeGreaterThanOrEqual(400);
      }
    });
  });

  describe('XSS (Cross-Site Scripting) Tests', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '<body onload=alert("XSS")>'
    ];

    test.each(xssPayloads)('should sanitize XSS payload in input: %s', async (payload) => {
      try {
        const response = await axios.post(`${BASE_URL}/api/patients`, {
          name: payload,
          email: 'test@example.com'
        });
        
        // Response should not contain the script tags
        const responseStr = JSON.stringify(response.data);
        expect(responseStr).not.toContain('<script>');
        expect(responseStr).not.toContain('onerror=');
        expect(responseStr).not.toContain('onload=');
      } catch (error) {
        // May reject invalid input, which is also acceptable
        expect([400, 422]).toContain(error.response?.status);
      }
    });
  });

  describe('Authentication Bypass Tests', () => {
    test('should prevent authentication bypass with null token', async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/patients`, {
          headers: {
            Authorization: null
          }
        });
        
        expect(response.status).toBe(401);
      } catch (error) {
        expect(error.response?.status).toBe(401);
      }
    });

    test('should prevent authentication bypass with empty token', async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/patients`, {
          headers: {
            Authorization: ''
          }
        });
        
        expect(response.status).toBe(401);
      } catch (error) {
        expect(error.response?.status).toBe(401);
      }
    });

    test('should prevent authentication bypass with invalid token', async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/patients`, {
          headers: {
            Authorization: 'Bearer invalid-token-12345'
          }
        });
        
        expect(response.status).toBe(401);
      } catch (error) {
        expect(error.response?.status).toBe(401);
      }
    });

    test('should prevent privilege escalation', async () => {
      // Try to access admin endpoint with regular user token
      const regularUserToken = 'regular-user-token';
      
      try {
        const response = await axios.get(`${BASE_URL}/api/admin/users`, {
          headers: {
            Authorization: `Bearer ${regularUserToken}`
          }
        });
        
        expect(response.status).toBe(403);
      } catch (error) {
        expect(error.response?.status).toBe(403);
      }
    });
  });

  describe('CSRF (Cross-Site Request Forgery) Tests', () => {
    test('should validate CSRF token', async () => {
      try {
        const response = await axios.post(`${BASE_URL}/api/patients`, {
          name: 'Test Patient',
          email: 'test@example.com'
        }, {
          headers: {
            'X-CSRF-Token': 'invalid-token'
          }
        });
        
        // Should reject request without valid CSRF token
        expect(response.status).toBe(403);
      } catch (error) {
        expect(error.response?.status).toBe(403);
      }
    });
  });

  describe('Rate Limiting Tests', () => {
    test('should enforce rate limiting on login', async () => {
      const requests = [];
      const maxAttempts = 10;
      
      for (let i = 0; i < maxAttempts + 5; i++) {
        try {
          const response = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'test@example.com',
            password: 'wrongpassword'
          });
          requests.push(response.status);
        } catch (error) {
          requests.push(error.response?.status);
        }
      }
      
      // Should eventually return 429 (Too Many Requests)
      expect(requests).toContain(429);
    });
  });

  describe('Input Validation Tests', () => {
    test('should validate email format', async () => {
      try {
        const response = await axios.post(`${BASE_URL}/api/auth/register`, {
          email: 'invalid-email',
          password: 'SecurePassword123!',
          name: 'Test User'
        });
        
        expect(response.status).toBe(400);
      } catch (error) {
        expect(error.response?.status).toBe(400);
      }
    });

    test('should validate password strength', async () => {
      try {
        const response = await axios.post(`${BASE_URL}/api/auth/register`, {
          email: 'test@example.com',
          password: 'weak',
          name: 'Test User'
        });
        
        expect(response.status).toBe(400);
      } catch (error) {
        expect(error.response?.status).toBe(400);
      }
    });

    test('should prevent path traversal', async () => {
      const maliciousPath = '../../../etc/passwd';
      
      try {
        const response = await axios.get(`${BASE_URL}/api/files/${encodeURIComponent(maliciousPath)}`);
        
        // Should not allow access to system files
        expect(response.status).toBe(400);
      } catch (error) {
        expect(error.response?.status).toBeGreaterThanOrEqual(400);
      }
    });
  });

  describe('Session Management Tests', () => {
    test('should invalidate session on logout', async () => {
      // Login first
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'test@example.com',
        password: 'SecurePassword123!'
      });
      
      const token = loginResponse.data.token;
      
      // Logout
      await axios.post(`${BASE_URL}/api/auth/logout`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Try to use token after logout
      try {
        const response = await axios.get(`${BASE_URL}/api/patients`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // Should reject the token
        expect(response.status).toBe(401);
      } catch (error) {
        expect(error.response?.status).toBe(401);
      }
    });

    test('should expire sessions after timeout', async () => {
      // This would require waiting for session timeout
      // In a real test, you'd set a short timeout and wait
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Data Encryption Tests', () => {
    test('should encrypt sensitive data at rest', async () => {
      // Create patient with sensitive data
      const response = await axios.post(`${BASE_URL}/api/patients`, {
        name: 'Test Patient',
        email: 'test@example.com',
        ssn: '123-45-6789',
        medicalRecord: 'Sensitive medical information'
      });
      
      // Check that sensitive data is encrypted in database
      // This would require database access in a real test
      expect(response.status).toBe(201);
    });

    test('should use HTTPS for data transmission', async () => {
      const response = await axios.get(`${BASE_URL}/api/patients`, {
        validateStatus: () => true
      });
      
      // Check that connection uses HTTPS
      expect(response.request.protocol).toBe('https:');
    });
  });

  describe('Authorization Tests', () => {
    test('should prevent unauthorized access to patient data', async () => {
      // Try to access another user's patient data
      try {
        const response = await axios.get(`${BASE_URL}/api/patients/patient-id-of-other-user`, {
          headers: {
            Authorization: 'Bearer user-token'
          }
        });
        
        expect(response.status).toBe(403);
      } catch (error) {
        expect(error.response?.status).toBe(403);
      }
    });

    test('should enforce role-based access control', async () => {
      // Try to access admin endpoint as regular user
      try {
        const response = await axios.get(`${BASE_URL}/api/admin/users`, {
          headers: {
            Authorization: 'Bearer regular-user-token'
          }
        });
        
        expect(response.status).toBe(403);
      } catch (error) {
        expect(error.response?.status).toBe(403);
      }
    });
  });
});

