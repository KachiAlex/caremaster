/**
 * Component Tests for CreatePatientModal
 * Tests component rendering, user interactions, and form validation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserContext } from '../../contexts/UserContext';
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

const mockUserContext = {
  userProfile: {
    id: 'admin-123',
    name: 'Admin User',
    email: 'admin@hospital.com',
    role: 'admin'
  },
  institutionId: 'institution-123'
};

const renderWithContext = (component) => {
  return render(
    <UserContext.Provider value={mockUserContext}>
      {component}
    </UserContext.Provider>
  );
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

      expect(screen.getByText(/create.*patient/i)).toBeInTheDocument();
    });

    test('should not render modal when closed', () => {
      renderWithContext(
        <CreatePatientModal open={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      expect(screen.queryByText(/create.*patient/i)).not.toBeInTheDocument();
    });

    test('should render all form steps', () => {
      renderWithContext(
        <CreatePatientModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Check for step indicators
      expect(screen.getByText(/step.*1/i)).toBeInTheDocument();
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

    test('should validate email format', () => {
      renderWithContext(
        <CreatePatientModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);

      // Should show validation error
      expect(screen.getByText(/invalid.*email/i)).toBeInTheDocument();
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

      const submitButton = screen.getByRole('button', { name: /submit|save|create/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name.*required/i)).toBeInTheDocument();
      });
    });

    test('should require email field', async () => {
      renderWithContext(
        <CreatePatientModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const nameInput = screen.getByLabelText(/name/i);
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });

      const submitButton = screen.getByRole('button', { name: /submit|save|create/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email.*required/i)).toBeInTheDocument();
      });
    });

    test('should validate phone number format', () => {
      renderWithContext(
        <CreatePatientModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const phoneInput = screen.getByLabelText(/phone/i);
      fireEvent.change(phoneInput, { target: { value: '123' } });
      fireEvent.blur(phoneInput);

      expect(screen.getByText(/invalid.*phone/i)).toBeInTheDocument();
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

      // Fill in form
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'John Doe' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '+1234567890' } });

      const submitButton = screen.getByRole('button', { name: /submit|save|create/i });
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

      // Fill in form
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'John Doe' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });

      const submitButton = screen.getByRole('button', { name: /submit|save|create/i });
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

      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'John Doe' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });

      const submitButton = screen.getByRole('button', { name: /submit|save|create/i });
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

      const fileInput = screen.getByLabelText(/upload|document/i);
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

      const fileInput = screen.getByLabelText(/upload|document/i);
      const file = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/invalid.*file/i)).toBeInTheDocument();
      });
    });
  });

  describe('Modal Interactions', () => {
    test('should close modal on close button click', () => {
      renderWithContext(
        <CreatePatientModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const closeButton = screen.getByRole('button', { name: /close|x/i });
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

