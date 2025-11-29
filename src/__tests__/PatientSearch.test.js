/**
 * Component Tests for PatientSearch
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import PatientSearch from '../components/PatientSearch';
import { searchPatients } from '../api/patientsAPI';
import { useUser } from '../contexts/UserContext';

// Mock dependencies
jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn()
  }
}));

jest.mock('../api/patientsAPI', () => ({
  searchPatients: jest.fn()
}));

jest.mock('../contexts/UserContext', () => ({
  useUser: jest.fn()
}));

describe('PatientSearch Component', () => {
  const mockUserProfile = {
    id: 'user-123',
    institutionId: 'institution-123'
  };

  const mockOnSelectPatient = jest.fn();

  const mockPatients = [
    {
      id: 'Client-1',
      clientId: 'UC-2025-0001',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890'
    },
    {
      id: 'Client-2',
      clientId: 'UC-2025-0002',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '987-654-3210'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useUser.mockReturnValue({
      userProfile: mockUserProfile
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('renders search input', () => {
    render(<PatientSearch onSelectPatient={mockOnSelectPatient} />);

    expect(screen.getByPlaceholderText(/Search clients/i)).toBeInTheDocument();
  });

  test('searches clients on input change', async () => {
    searchPatients.mockResolvedValue(mockPatients);

    render(<PatientSearch onSelectPatient={mockOnSelectPatient} />);

    const searchInput = screen.getByPlaceholderText(/Search clients/i);
    fireEvent.change(searchInput, { target: { value: 'John' } });

    // Fast-forward debounce timer
    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(searchPatients).toHaveBeenCalledWith('John', 'institution-123');
    });
  });

  test('displays search results', async () => {
    searchPatients.mockResolvedValue(mockPatients);

    render(<PatientSearch onSelectPatient={mockOnSelectPatient} />);

    const searchInput = screen.getByPlaceholderText(/Search clients/i);
    fireEvent.change(searchInput, { target: { value: 'John' } });

    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('UC-2025-0001')).toBeInTheDocument();
    });
  });

  test('calls onSelectPatient when Client is clicked', async () => {
    searchPatients.mockResolvedValue(mockPatients);

    render(<PatientSearch onSelectPatient={mockOnSelectPatient} />);

    const searchInput = screen.getByPlaceholderText(/Search clients/i);
    fireEvent.change(searchInput, { target: { value: 'John' } });

    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const patientItem = screen.getByText('John Doe').closest('li');
    fireEvent.click(patientItem);

    expect(mockOnSelectPatient).toHaveBeenCalledWith(mockPatients[0]);
  });

  test('handles keyboard navigation', async () => {
    searchPatients.mockResolvedValue(mockPatients);

    render(<PatientSearch onSelectPatient={mockOnSelectPatient} />);

    const searchInput = screen.getByPlaceholderText(/Search clients/i);
    fireEvent.change(searchInput, { target: { value: 'John' } });

    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Arrow down
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    // Enter
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(mockOnSelectPatient).toHaveBeenCalled();
  });

  test('clears search on Escape key', async () => {
    searchPatients.mockResolvedValue(mockPatients);

    render(<PatientSearch onSelectPatient={mockOnSelectPatient} />);

    const searchInput = screen.getByPlaceholderText(/Search clients/i);
    fireEvent.change(searchInput, { target: { value: 'John' } });

    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    fireEvent.keyDown(searchInput, { key: 'Escape' });

    expect(searchInput.value).toBe('');
  });

  test('displays loading state', async () => {
    searchPatients.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<PatientSearch onSelectPatient={mockOnSelectPatient} />);

    const searchInput = screen.getByPlaceholderText(/Search clients/i);
    fireEvent.change(searchInput, { target: { value: 'John' } });

    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText(/Searching/i)).toBeInTheDocument();
    });
  });

  test('displays no results message', async () => {
    searchPatients.mockResolvedValue([]);

    render(<PatientSearch onSelectPatient={mockOnSelectPatient} />);

    const searchInput = screen.getByPlaceholderText(/Search clients/i);
    fireEvent.change(searchInput, { target: { value: 'NonExistent' } });

    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText(/No clients found/i)).toBeInTheDocument();
    });
  });

  test('handles search error', async () => {
    searchPatients.mockRejectedValue(new Error('Search failed'));

    render(<PatientSearch onSelectPatient={mockOnSelectPatient} />);

    const searchInput = screen.getByPlaceholderText(/Search clients/i);
    fireEvent.change(searchInput, { target: { value: 'John' } });

    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to search clients.');
    });
  });
});

