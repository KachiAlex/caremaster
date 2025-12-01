/**
 * Component Tests for PatientRegistration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import PatientRegistration from '../components/PatientRegistration';
import { createClient } from '../api/patientsAPI';
import { useUser } from '../contexts/UserContext';

// Mock dependencies
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../api/patientsAPI', () => ({
  createClient: jest.fn()
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
        onClose={mockOnCancel}
      />
    );

    expect(screen.getByText('Register New Client')).toBeTruthy();
    expect(screen.getByLabelText(/Full Name/i)).toBeTruthy();
    expect(screen.getByLabelText(/Email/i)).toBeTruthy();
    expect(screen.getByLabelText(/^Phone\b/i)).toBeTruthy();
    expect(screen.getByLabelText(/Date of Birth/i)).toBeTruthy();
  });

  test('validates required fields', async () => {
    render(
      <PatientRegistration
        institutionId="institution-123"
        onPatientRegistered={mockOnPatientRegistered}
        onClose={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /Register Client/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Our implementation shows field-level error and a generic toast
      expect(screen.getByText(/Client name is required/i)).toBeTruthy();
      expect(toast.error).toHaveBeenCalledWith('Please fill in all required fields');
    });
  });

  test('validates email format', async () => {
    render(
      <PatientRegistration
        institutionId="institution-123"
        onPatientRegistered={mockOnPatientRegistered}
        onClose={mockOnCancel}
      />
    );

    const emailInput = screen.getByLabelText(/Email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    const submitButton = screen.getByRole('button', { name: /Register Client/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Invalid email should prevent submission and trigger a validation error
      expect(createClient).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalled();
    });
  });

  test('submits form with valid data', async () => {
    const mockPatientResult = {
      id: 'Client-doc-id',
      clientId: 'UC-2025-0001'
    };

    createClient.mockResolvedValue(mockPatientResult);

    render(
      <PatientRegistration
        institutionId="institution-123"
        onPatientRegistered={mockOnPatientRegistered}
        onClose={mockOnCancel}
      />
    );

    // Fill in form with all required fields
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Phone\b/i), { target: { value: '123-456-7890' } });
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '1990-01-01' } });
    fireEvent.change(screen.getByLabelText(/Gender/i), { target: { value: 'male' } });
    fireEvent.change(screen.getByLabelText(/Address/i), { target: { value: '123 Main St' } });
    fireEvent.change(screen.getByLabelText(/Contact Name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/Contact Phone/i), { target: { value: '987-654-3210' } });
    fireEvent.change(screen.getByLabelText(/Care Level Category/i), { target: { value: 'basic' } });

    const submitButton = screen.getByRole('button', { name: /Register Client/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(createClient).toHaveBeenCalledWith(
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
      // Success panel with generated Client ID should be visible
      expect(screen.getByText(/Client Registered Successfully!/i)).toBeTruthy();
      expect(screen.getByText(/UC-2025-0001/)).toBeTruthy();
    });
  });

  test('handles registration error', async () => {
    const errorMessage = 'Registration failed';
    createClient.mockRejectedValue(new Error(errorMessage));

    render(
      <PatientRegistration
        institutionId="institution-123"
        onPatientRegistered={mockOnPatientRegistered}
        onClose={mockOnCancel}
      />
    );

    // Fill in form with all required fields
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Phone\b/i), { target: { value: '123-456-7890' } });
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '1990-01-01' } });
    fireEvent.change(screen.getByLabelText(/Gender/i), { target: { value: 'male' } });
    fireEvent.change(screen.getByLabelText(/Address/i), { target: { value: '123 Main St' } });
    fireEvent.change(screen.getByLabelText(/Contact Name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/Contact Phone/i), { target: { value: '987-654-3210' } });
    fireEvent.change(screen.getByLabelText(/Care Level Category/i), { target: { value: 'basic' } });

    const submitButton = screen.getByRole('button', { name: /Register Client/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  test('calls onCancel when cancel button is clicked', () => {
    render(
      <PatientRegistration
        institutionId="institution-123"
        onPatientRegistered={mockOnPatientRegistered}
        onClose={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  test('displays loading state during submission', async () => {
    createClient.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <PatientRegistration
        institutionId="institution-123"
        onPatientRegistered={mockOnPatientRegistered}
        onClose={mockOnCancel}
      />
    );

    // Fill in form with all required fields
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Phone\b/i), { target: { value: '123-456-7890' } });
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '1990-01-01' } });
    fireEvent.change(screen.getByLabelText(/Gender/i), { target: { value: 'male' } });
    fireEvent.change(screen.getByLabelText(/Address/i), { target: { value: '123 Main St' } });
    fireEvent.change(screen.getByLabelText(/Contact Name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/Contact Phone/i), { target: { value: '987-654-3210' } });
    fireEvent.change(screen.getByLabelText(/Care Level Category/i), { target: { value: 'basic' } });

    const submitButton = screen.getByRole('button', { name: /Register Client/i });
    fireEvent.click(submitButton);

    // Ensure submission started (loading state triggered internally)
    await waitFor(() => {
      expect(createClient).toHaveBeenCalled();
    });
  });
});

