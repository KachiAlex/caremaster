/**
 * Component Tests for CreatePatientModal
 * Tests component rendering, user interactions, and form validation
 */

jest.setTimeout(10000);

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserProvider } from '../../contexts/UserContext';
import CreatePatientModal from '../../components/CreatePatientModal';
import { toast } from 'react-toastify';

// Mock dependencies
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}));

jest.mock('../../api/patientsAPI', () => ({
  createClient: jest.fn()
}));

jest.mock('../../utils/clientDuplicateDetection', () => ({
  checkForDuplicates: jest.fn(),
  shouldBlockRegistration: jest.fn()
}));

jest.mock('../../utils/clientDocumentUpload', () => ({
  uploadClientDocument: jest.fn(),
  validateFile: jest.fn()
}));

jest.mock('qrcode.react', () => {
  return function QRCode({ value }) {
    return <div data-testid="qrcode">{value}</div>;
  };
});

jest.mock('../../contexts/UserContext', () => ({
  ...jest.requireActual('../../contexts/UserContext'),
  useUser: jest.fn()
}));

const { useUser } = require('../../contexts/UserContext');

const mockUserContext = {
  userProfile: {
    id: 'admin-123',
    name: 'Admin User',
    email: 'admin@hospital.com',
    role: 'admin',
    institutionId: 'institution-123'
  },
  institutionId: 'institution-123'
};

const renderWithContext = (component) => {
  useUser.mockReturnValue(mockUserContext);
  return render(component);
};

describe('CreatePatientModal Component Tests', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    test('should render modal when open', () => {
      renderWithContext(
        <CreatePatientModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Header title should be visible
      expect(screen.getByText(/register new client/i)).toBeTruthy();
    });

    test('should not render modal when closed', () => {
      renderWithContext(
        <CreatePatientModal open={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      expect(screen.queryByText(/register new client/i)).toBeNull();
    });

    test('should render all form steps', () => {
      renderWithContext(
        <CreatePatientModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Check for step indicators
      expect(screen.getByText(/step.*1/i)).toBeTruthy();
    });
  });

  describe('Form Input', () => {
    test('should accept name input', () => {
      renderWithContext(
        <CreatePatientModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const nameInput = screen.getByLabelText(/name/i);
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });

      expect(nameInput.value).toBe('John Doe');
    });

    test('should accept email input', () => {
      renderWithContext(
        <CreatePatientModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } });

      expect(emailInput.value).toBe('john@example.com');
    });

    test('should keep invalid email value for later validation', () => {
      renderWithContext(
        <CreatePatientModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);

      // Value is preserved; validation happens on submit, not on blur
      expect(emailInput.value).toBe('invalid-email');
      expect(screen.queryByText(/invalid.*email/i)).toBeNull();
    });

    test('should accept phone input', () => {
      renderWithContext(
        <CreatePatientModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const phoneInput = screen.getByLabelText(/phone/i);
      fireEvent.change(phoneInput, { target: { value: '+1234567890' } });

      expect(phoneInput.value).toBe('+1234567890');
    });

    test('should accept date of birth', () => {
      renderWithContext(
        <CreatePatientModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const dobInput = screen.getByLabelText(/date.*birth/i);
      fireEvent.change(dobInput, { target: { value: '1980-01-01' } });

      expect(dobInput.value).toBe('1980-01-01');
    });
  });

  describe('Form Validation', () => {
    test('should require name field', async () => {
      renderWithContext(
        <CreatePatientModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Leave name empty, fill other required fields on step 1
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '+1234567890' } });
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Client name is required');
      });
    });

    test('should allow submission without email', async () => {
      const { createClient } = require('../../api/patientsAPI');
      createClient.mockResolvedValue({
        id: 'patient-123',
        clientId: 'UC-2025-0001'
      });

      renderWithContext(
        <CreatePatientModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '+1234567890' } });
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });

      // Step 1 → Step 2
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      // Fill required emergency contact fields
      fireEvent.change(screen.getByLabelText(/contact name/i), { target: { value: 'Jane Doe' } });
      fireEvent.change(screen.getByLabelText(/contact phone/i), { target: { value: '+1 555 987 6543' } });

      // Step 2 → Step 3
      fireEvent.click(nextButton);

      const submitButton = screen.getByRole('button', { name: /register client/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(createClient).toHaveBeenCalled();
      });
    });

    test('should sanitize phone number input', () => {
      renderWithContext(
        <CreatePatientModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const phoneInput = screen.getByLabelText(/phone/i);
      fireEvent.change(phoneInput, { target: { value: 'abc123!!' } });
      fireEvent.blur(phoneInput);

      expect(phoneInput.value).toBe('123');
    });
  });

  describe('Form Submission', () => {
    test('should submit form with valid data', async () => {
      const { createClient } = require('../../api/patientsAPI');
      createClient.mockResolvedValue({
        id: 'patient-123',
        clientId: 'UC-2025-0001'
      });

      renderWithContext(
        <CreatePatientModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Fill required fields across steps
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '+1234567890' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });

      // Step 1 → Step 2
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      // Fill required emergency contact fields
      fireEvent.change(screen.getByLabelText(/contact name/i), { target: { value: 'Jane Doe' } });
      fireEvent.change(screen.getByLabelText(/contact phone/i), { target: { value: '+1 555 987 6543' } });

      // Step 2 → Step 3
      fireEvent.click(nextButton);

      const submitButton = screen.getByRole('button', { name: /register client/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(createClient).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalled();
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    test('should handle submission errors', async () => {
      const { createClient } = require('../../api/patientsAPI');
      createClient.mockRejectedValue(new Error('Failed to create patient'));

      renderWithContext(
        <CreatePatientModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Fill required fields across steps
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '+1 555 123 4567' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });

      // Step 1 → Step 2
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      // Fill required emergency contact fields
      fireEvent.change(screen.getByLabelText(/contact name/i), { target: { value: 'Jane Doe' } });
      fireEvent.change(screen.getByLabelText(/contact phone/i), { target: { value: '+1 555 987 6543' } });

      // Step 2 → Step 3 (where submit button is rendered)
      fireEvent.click(nextButton);

      const submitButton = screen.getByRole('button', { name: /register client/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Duplicate Detection', () => {
    test('should check for duplicates before submission', async () => {
      const { checkForDuplicates } = require('../../utils/clientDuplicateDetection');
      checkForDuplicates.mockResolvedValue({
        isDuplicate: true,
        matches: [{ clientId: 'UC-2025-0001', name: 'John Doe' }]
      });

      renderWithContext(
        <CreatePatientModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '+1 555 123 4567' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });

      // Step 1 → Step 2
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      // Fill required emergency contact fields
      fireEvent.change(screen.getByLabelText(/contact name/i), { target: { value: 'Jane Doe' } });
      fireEvent.change(screen.getByLabelText(/contact phone/i), { target: { value: '+1 555 987 6543' } });

      // Step 2 → Step 3
      fireEvent.click(nextButton);

      const submitButton = screen.getByRole('button', { name: /register client/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(checkForDuplicates).toHaveBeenCalled();
      });
    });
  });

  describe('Document Upload', () => {
    test('should handle file upload', async () => {
      const { uploadClientDocument, validateFile } = require('../../utils/clientDocumentUpload');
      validateFile.mockResolvedValue(true);
      uploadClientDocument.mockResolvedValue('https://storage.example.com/file.pdf');

      renderWithContext(
        <CreatePatientModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Fill required fields for step 1
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '+1 555 123 4567' } });

      // Go to step 2
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      // Fill required fields for step 2
      fireEvent.change(screen.getByLabelText(/contact name/i), { target: { value: 'Jane Doe' } });
      fireEvent.change(screen.getByLabelText(/contact phone/i), { target: { value: '+1 555 987 6543' } });

      // Go to step 3 (Medical Information + Documents)
      fireEvent.click(nextButton);

      const [fileInput] = screen.getAllByTestId('file-input');
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(validateFile).toHaveBeenCalled();
      });
    });

    test('should reject invalid file types', async () => {
      const { validateFile } = require('../../utils/clientDocumentUpload');
      validateFile.mockResolvedValue(false);

      renderWithContext(
        <CreatePatientModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Fill required fields for step 1
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '+1 555 123 4567' } });

      // Go to step 2
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      // Fill required fields for step 2
      fireEvent.change(screen.getByLabelText(/contact name/i), { target: { value: 'Jane Doe' } });
      fireEvent.change(screen.getByLabelText(/contact phone/i), { target: { value: '+1 555 987 6543' } });

      // Go to step 3 (Medical Information + Documents)
      fireEvent.click(nextButton);

      const [fileInput] = screen.getAllByTestId('file-input');
      const file = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(validateFile).toHaveBeenCalledWith(file);
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Modal Interactions', () => {
    test('should close modal on close button click', () => {
      renderWithContext(
        <CreatePatientModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    test('should close modal on backdrop click', () => {
      renderWithContext(
        <CreatePatientModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const backdrop = screen.getByTestId('modal-backdrop');
      fireEvent.click(backdrop);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});


