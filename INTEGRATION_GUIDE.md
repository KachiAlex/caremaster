# ElderX Security & Features Integration Guide
**Quick Start for Developers**

---

## 1. XSS Protection - Securing User Content Display

### Problem: User-generated content can contain malicious scripts

### Solution: Use sanitization functions

```javascript
// Import the library
import { 
  sanitizeHtml, 
  escapeHtml, 
  detectXssPatterns 
} from '../utils/xssProtection';

// Example 1: Display user comment safely
const UserComment = ({ comment }) => {
  return (
    <div className="comment">
      {/* Option A: Text only (safest) */}
      <p>{escapeHtml(comment.text)}</p>
      
      {/* Option B: Rich text (only safe HTML) */}
      <div dangerouslySetInnerHTML={{ 
        __html: sanitizeHtml(comment.text) 
      }} />
    </div>
  );
};

// Example 2: Check for suspicious patterns before saving
const saveUserInput = async (userText) => {
  const xssCheck = detectXssPatterns(userText);
  
  if (xssCheck.suspicious) {
    alert('Suspicious patterns detected. Input rejected.');
    return;
  }
  
  // Safe to save
  await saveToDB(userText);
};

// Example 3: Sanitize entire object
const userData = {
  name: '<script>alert("xss")</script>John',
  bio: '<img src=x onerror=alert("xss")>My bio',
  website: 'javascript:void(0)'
};

const sanitized = sanitizeObject(userData);
// Result: All scripts and dangerous attributes removed
```

---

## 2. Input Validation - Enforce Data Quality

### Problem: Invalid or malicious inputs break features and create security holes

### Solution: Validate all user inputs before processing

```javascript
// Import validation library
import { 
  validateEmail,
  validatePassword,
  validatePhoneNumber,
  validateFormData,
  validateTextField
} from '../utils/inputValidation';

// Example 1: Validate single field
const handleEmailChange = (email) => {
  const result = validateEmail(email);
  
  if (!result.valid) {
    showError(result.message);  // "Invalid email format"
  } else {
    clearError();
  }
};

// Example 2: Validate password strength
const handlePasswordChange = (password) => {
  const result = validatePassword(password, {
    minLength: 10,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecial: true
  });
  
  if (!result.valid) {
    // Show all requirements not met
    showErrors(result.errors);
  }
};

// Example 3: Batch validation for entire form
const handleSubmitRegistration = async (formData) => {
  const schema = {
    firstName: { type: 'name', options: { minLength: 2 } },
    lastName: { type: 'name', options: { minLength: 2 } },
    email: { type: 'email' },
    password: { type: 'password' },
    phone: { type: 'phone', options: { format: 'international' } },
    dateOfBirth: { type: 'date', options: { maxDate: new Date() } }
  };
  
  const validation = validateFormData(formData, schema);
  
  if (!validation.isValid) {
    // Display all errors at once
    Object.entries(validation.errors).forEach(([field, errors]) => {
      showFieldError(field, errors.join(', '));
    });
    return;
  }
  
  // All valid - proceed
  await submitRegistration(formData);
};

// Example 4: Validate text fields with custom options
const handleCommentSave = (comment) => {
  const result = validateTextField(comment, {
    minLength: 1,
    maxLength: 500,
    required: true,
    allowHtml: false,
    checkXss: true
  });
  
  if (!result.valid) {
    showError(result.message);
  }
};

// Example 5: Validate phone number internationally
const handlePhoneUpdate = (phone) => {
  const result = validatePhoneNumber(phone, 'international');
  
  if (result.valid) {
    console.log(`Phone is valid: ${result.cleaned}`);
  }
};
```

---

## 3. Account Lockout - Prevent Brute Force Attacks

### Problem: Someone tries to repeatedly login with wrong password

### Solution: Lock account after 5 failed attempts

```javascript
// Import account lockout service
import {
  recordFailedAttempt,
  isAccountLocked,
  recordSuccessfulLogin,
  getSecurityStats,
  unlockAccount
} from '../services/accountLockoutService';

// Example 1: In your login component
const handleLoginAttempt = async (email, password, ipAddress) => {
  try {
    // Check if account is locked FIRST
    const lockStatus = await isAccountLocked(email);
    
    if (lockStatus.locked) {
      showError(
        `Account locked until ${lockStatus.lockedUntil.toLocaleTimeString()}. ` +
        `Reason: ${lockStatus.reason}`
      );
      return;
    }
    
    // Attempt login
    const user = await firebase.auth().signInWithEmailAndPassword(email, password);
    
    // Success: Record successful login
    await recordSuccessfulLogin(
      user.uid,
      email,
      ipAddress,
      navigator.userAgent
    );
    
    // Clear failed attempts and log in user
    navigateToDashboard();
    
  } catch (error) {
    if (error.code === 'auth/wrong-password') {
      // Record failed attempt (triggers lockout check)
      await recordFailedAttempt(email, ipAddress);
      
      showError('Invalid email or password');
    }
  }
};

// Example 2: Check security stats in admin dashboard
const SecurityDashboard = () => {
  const [stats, setStats] = React.useState(null);
  
  React.useEffect(() => {
    const loadStats = async () => {
      const securityStats = await getSecurityStats();
      setStats(securityStats);
    };
    
    loadStats();
  }, []);
  
  return (
    <div>
      <h2>Security Stats</h2>
      {stats && (
        <>
          <p>Locked Accounts: {stats.lockedAccounts}</p>
          <p>Failed Logins (24h): {stats.failedAttemptsLast24h}</p>
          <p>Blocked IP Addresses: {stats.blockedIps}</p>
        </>
      )}
    </div>
  );
};

// Example 3: Unlock account manually (admin action)
const AdminUnlockUser = ({ userEmail }) => {
  const handleUnlock = async () => {
    try {
      await unlockAccount(userEmail);
      showSuccess('Account unlocked');
    } catch (error) {
      showError('Failed to unlock account');
    }
  };
  
  return <button onClick={handleUnlock}>Unlock Account</button>;
};
```

---

## 4. Enhanced Authentication - Secure Login & Registration

### Problem: Standard Firebase auth doesn't include lockout, validation, or XSS protection

### Solution: Use enhanced auth service

```javascript
// Import enhanced auth service
import {
  secureLogin,
  secureRegister,
  sendPasswordResetEmailSecure,
  confirmPasswordResetSecure,
  getCurrentUserSecure
} from '../services/enhancedAuthService';

// Example 1: Secure login with all protections
const LoginForm = () => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await secureLogin(email, password, true); // Remember me
      
      if (result.success) {
        // Navigate to dashboard
        navigate('/dashboard');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleLogin}>
      <input 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input 
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      {error && <span className="error">{error}</span>}
      <button disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
    </form>
  );
};

// Example 2: Secure registration
const RegisterForm = () => {
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    fullName: '',
    role: 'patient'
  });
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await secureRegister(
        formData.email,
        formData.password,
        formData.fullName,
        formData.role
      );
      
      if (result.success) {
        // Navigate to login
        navigate('/login?registered=true');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleRegister}>
      {/* Form fields */}
      {error && <span className="error">{error}</span>}
      <button disabled={loading}>{loading ? 'Registering...' : 'Register'}</button>
    </form>
  );
};

// Example 3: Track current user securely
const Dashboard = () => {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUserSecure();
        setUser(currentUser);
      } catch (error) {
        // Redirect to login if account is locked
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, []);
  
  if (loading) return <div>Loading...</div>;
  
  return <div>Welcome, {user?.displayName}</div>;
};

// Example 4: Password reset
const PasswordReset = ({ email }) => {
  const handleResetPassword = async () => {
    try {
      const result = await sendPasswordResetEmailSecure(email);
      showSuccess(result.message);
    } catch (error) {
      showError(error.message);
    }
  };
  
  return <button onClick={handleResetPassword}>Send Reset Email</button>;
};
```

---

## 5. Notifications - Multi-Channel Communication

### Problem: Need to send reminders, alerts, and updates via SMS/Email/Push

### Solution: Use notification service

```javascript
// Import notification service
import {
  sendSmsNotification,
  sendWhatsAppNotification,
  sendEmailNotification,
  sendAppointmentReminder,
  sendQueuePositionUpdate,
  sendLabResultsNotification,
  NOTIFICATION_CATEGORIES
} from '../services/notificationService';

// Example 1: Send SMS appointment reminder
const scheduleAppointmentReminder = async (appointment, patient) => {
  try {
    const result = await sendSmsNotification(
      patient.phoneNumber,
      `Reminder: Your appointment is on ${formatDate(appointment.dateTime)}. ` +
      `Please arrive 10 minutes early.`,
      {
        category: NOTIFICATION_CATEGORIES.APPOINTMENT_REMINDER,
        priority: 'high',
        metadata: {
          appointmentId: appointment.id,
          patientId: patient.id
        }
      }
    );
    
    console.log('SMS sent:', result.notificationId);
  } catch (error) {
    console.error('SMS failed:', error);
  }
};

// Example 2: Send WhatsApp notification with rich text
const notifyQueuePosition = async (patient, position, provider) => {
  const message = position === 1
    ? `🎯 *You're next!* Please proceed to ${provider.room}`
    : `📍 Queue Position: #${position}\n⏱ Estimated wait: 15 minutes`;
  
  await sendWhatsAppNotification(
    patient.whatsappNumber,
    message,
    {
      category: NOTIFICATION_CATEGORIES.QUEUE_POSITION,
      priority: position === 1 ? 'high' : 'normal'
    }
  );
};

// Example 3: Send email with attachment
const notifyLabResults = async (patient, results) => {
  await sendEmailNotification(
    patient.email,
    'Your Lab Results Are Ready',
    'lab_results_notification',
    {
      patientName: patient.fullName,
      testDate: formatDate(results.date),
      resultsLink: `https://app.elderx.com/results/${results.id}`
    },
    {
      category: NOTIFICATION_CATEGORIES.LAB_RESULTS,
      attachments: results.pdfUrl ? [results.pdfUrl] : [],
      priority: 'high'
    }
  );
};

// Example 4: Use pre-built appointment reminder
const handleAppointmentBooked = async (appointment, patient, provider) => {
  try {
    await sendAppointmentReminder(appointment, patient, provider);
    showSuccess('Confirmation sent to patient');
  } catch (error) {
    console.error('Notification failed:', error);
  }
};

// Example 5: Send billing notification
const notifyPaymentDue = async (patient, invoice) => {
  await sendBillingNotification(
    patient,
    invoice.amount,
    invoice.dueDate
  );
};
```

---

## 6. Patient Registration - Multi-Step Onboarding

### Problem: Complex registration with validation, duplicates, and QR codes

### Solution: Use EnhancedPatientRegistration component

```javascript
// Import the component
import EnhancedPatientRegistration from '../components/EnhancedPatientRegistration';

// Example 1: Use in a page
const PatientManagement = () => {
  const [showRegistration, setShowRegistration] = React.useState(false);
  const [patients, setPatients] = React.useState([]);
  
  const handleNewPatient = async (patientData) => {
    try {
      // Save to Firestore
      const patientRef = await firebase
        .firestore()
        .collection('patients')
        .add({
          ...patientData,
          createdAt: new Date(),
          status: 'active'
        });
      
      // Refresh list
      await loadPatients();
      
      showSuccess('Patient registered successfully');
    } catch (error) {
      showError('Failed to register patient');
    }
  };
  
  const loadPatients = async () => {
    // Load and display patients
  };
  
  return (
    <div>
      <h1>Patient Management</h1>
      
      <button onClick={() => setShowRegistration(true)}>
        Register New Patient
      </button>
      
      <EnhancedPatientRegistration
        isOpen={showRegistration}
        onClose={() => setShowRegistration(false)}
        onPatientRegistered={handleNewPatient}
      />
      
      {/* Patient list */}
      <PatientList patients={patients} />
    </div>
  );
};

// Example 2: Handle QR code in patient profile
const PatientProfile = ({ patientId }) => {
  const [patient, setPatient] = React.useState(null);
  
  React.useEffect(() => {
    // Load patient with QR code
    loadPatient(patientId);
  }, [patientId]);
  
  const handleDownloadQR = () => {
    // Download patient's QR code
    const link = document.createElement('a');
    link.href = patient.qrCode;
    link.download = `${patient.fullName}_qr.png`;
    link.click();
  };
  
  return (
    <div>
      <h2>{patient?.fullName}</h2>
      
      {patient?.qrCode && (
        <div>
          <img src={patient.qrCode} alt="Patient QR Code" />
          <button onClick={handleDownloadQR}>Download QR</button>
        </div>
      )}
      
      {/* Display documents */}
      {patient?.documents?.map(doc => (
        <a key={doc.id} href={doc.url}>
          {doc.type} - {doc.fileName}
        </a>
      ))}
    </div>
  );
};
```

---

## Integration Checklist

- [ ] Import and use XSS protection in all user content displays
- [ ] Add input validation to all forms
- [ ] Update login flow with secureLogin function
- [ ] Update registration with secureRegister function
- [ ] Add EnhancedPatientRegistration to patient management
- [ ] Configure Twilio credentials for SMS/WhatsApp
- [ ] Test notification delivery with real phone numbers
- [ ] Set up Firebase Cloud Messaging for push notifications
- [ ] Create Firestore security rules for new collections
- [ ] Deploy and monitor security dashboards

---

## Troubleshooting

### "DOMPurify is not defined"
**Solution:** Install DOMPurify in your project
```bash
npm install dompurify
```

### "Account lockout not working"
**Solution:** Make sure failedLoginAttempts collection exists in Firestore
**Check:** Manually created in Firebase Console

### "Notifications not sending"
**Solution:** Verify Twilio/SendGrid credentials in environment variables
**Also:** Check phone number format (E.164 format: +1234567890)

### "Patient duplicate check is slow"
**Solution:** Add Firestore composite index for duplicate detection query
**Link:** Copy query from console error, create index in Firebase Console

---

## Support

For questions or issues:
1. Check the main documentation: `SECURITY_AND_FEATURES_IMPLEMENTATION_COMPLETE.md`
2. Review the service files for detailed comments
3. Check Firestore console for error logs
4. Review browser console for validation errors

