/**
 * Component Tests for PatientRegistration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import PatientRegistration from '../components/PatientRegistration';
import { createPatient } from '../api/patientsAPI';
import { useUser } from '../contexts/UserContext';

// Mock dependencies
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../api/patientsAPI', () => ({
  createPatient: jest.fn()
}));

jest.mock('../contexts/UserContext', () => ({
  useUser: jest.fn()
}));

describe('PatientRegistration Component', () => {
  const mockUserProfile = {
    id: 'user-123',
    name: 'Test Admin',
    email: 'admin@test.com',
    userType: 'admin'
  };

  const mockOnPatientRegistered = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useUser.mockReturnValue({
      userProfile: mockUserProfile,
      institutionId: 'institution-123'
    });
  });

  test('renders registration form', () => {
    render(
      <PatientRegistration
        institutionId="institution-123"
        onPatientRegistered={mockOnPatientRegistered}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Register New Patient')).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date of Birth/i)).toBeInTheDocument();
  });

  test('validates required fields', async () => {
    render(
      <PatientRegistration
        institutionId="institution-123"
        onPatientRegistered={mockOnPatientRegistered}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /Register Patient/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Full Name is required/i)).toBeInTheDocument();
    });
  });

  test('validates email format', async () => {
    render(
      <PatientRegistration
        institutionId="institution-123"
        onPatientRegistered={mockOnPatientRegistered}
        onCancel={mockOnCancel}
      />
    );

    const emailInput = screen.getByLabelText(/Email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    const submitButton = screen.getByRole('button', { name: /Register Patient/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Email is invalid/i)).toBeInTheDocument();
    });
  });

  test('submits form with valid data', async () => {
    const mockPatientResult = {
      id: 'patient-doc-id',
      patientId: 'UC-2025-0001'
    };

    createPatient.mockResolvedValue(mockPatientResult);

    render(
      <PatientRegistration
        institutionId="institution-123"
        onPatientRegistered={mockOnPatientRegistered}
        onCancel={mockOnCancel}
      />
    );

    // Fill in form
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: '123-456-7890' } });
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '1990-01-01' } });
    fireEvent.change(screen.getByLabelText(/Address/i), { target: { value: '123 Main St' } });
    fireEvent.change(screen.getByLabelText(/Emergency Contact Name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/Emergency Contact Phone/i), { target: { value: '987-654-3210' } });

    const submitButton = screen.getByRole('button', { name: /Register Patient/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(createPatient).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '123-456-7890',
          institutionId: 'institution-123'
        }),
        mockUserProfile
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
      expect(mockOnPatientRegistered).toHaveBeenCalledWith('patient-doc-id', 'UC-2025-0001');
    });
  });

  test('handles registration error', async () => {
    const errorMessage = 'Registration failed';
    createPatient.mockRejectedValue(new Error(errorMessage));

    render(
      <PatientRegistration
        institutionId="institution-123"
        onPatientRegistered={mockOnPatientRegistered}
        onCancel={mockOnCancel}
      />
    );

    // Fill in form
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: '123-456-7890' } });
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '1990-01-01' } });
    fireEvent.change(screen.getByLabelText(/Address/i), { target: { value: '123 Main St' } });
    fireEvent.change(screen.getByLabelText(/Emergency Contact Name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/Emergency Contact Phone/i), { target: { value: '987-654-3210' } });

    const submitButton = screen.getByRole('button', { name: /Register Patient/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorMessage);
    });
  });

  test('calls onCancel when cancel button is clicked', () => {
    render(
      <PatientRegistration
        institutionId="institution-123"
        onPatientRegistered={mockOnPatientRegistered}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  test('displays loading state during submission', async () => {
    createPatient.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <PatientRegistration
        institutionId="institution-123"
        onPatientRegistered={mockOnPatientRegistered}
        onCancel={mockOnCancel}
      />
    );

    // Fill in form
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: '123-456-7890' } });
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '1990-01-01' } });
    fireEvent.change(screen.getByLabelText(/Address/i), { target: { value: '123 Main St' } });
    fireEvent.change(screen.getByLabelText(/Emergency Contact Name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/Emergency Contact Phone/i), { target: { value: '987-654-3210' } });

    const submitButton = screen.getByRole('button', { name: /Register Patient/i });
    fireEvent.click(submitButton);

    // Check for loading state
    expect(screen.getByRole('button', { name: /Register Patient/i })).toBeDisabled();
  });
});

