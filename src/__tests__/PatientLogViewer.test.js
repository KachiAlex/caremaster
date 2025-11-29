/**
 * Component Tests for PatientLogViewer
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PatientLogViewer from '../components/PatientLogViewer';
import { getPatientLogs, getLogsByCategory } from '../utils/patientLogger';

// Mock dependencies
jest.mock('../utils/patientLogger', () => ({
  getPatientLogs: jest.fn(),
  getLogsByCategory: jest.fn()
}));

describe('PatientLogViewer Component', () => {
  const mockLogs = [
    {
      id: 'log-1',
      clientId: 'UC-2025-0001',
      clinicianName: 'Dr. Smith',
      clinicianRole: 'doctor',
      action: 'vital_signs_recorded',
      category: 'vital_signs',
      description: 'Vital signs recorded',
      timestamp: { toDate: () => new Date('2025-01-15T10:00:00Z') },
      dateTime: '2025-01-15T10:00:00Z',
      details: { type: 'Blood Pressure', value: '120/80' }
    },
    {
      id: 'log-2',
      clientId: 'UC-2025-0001',
      clinicianName: 'Nurse Jane',
      clinicianRole: 'nurse',
      action: 'medication_administered',
      category: 'medication',
      description: 'Medication administered',
      timestamp: { toDate: () => new Date('2025-01-15T09:00:00Z') },
      dateTime: '2025-01-15T09:00:00Z',
      details: { medicationName: 'Aspirin', dose: '100mg' }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders log viewer', () => {
    getPatientLogs.mockResolvedValue([]);

    render(<PatientLogViewer clientId="UC-2025-0001" clientName="John Doe" />);

    expect(screen.getByText(/Client Activity Log/i)).toBeInTheDocument();
  });

  test('loads and displays Client logs', async () => {
    getPatientLogs.mockResolvedValue(mockLogs);

    render(<PatientLogViewer clientId="UC-2025-0001" clientName="John Doe" />);

    await waitFor(() => {
      expect(getPatientLogs).toHaveBeenCalledWith('UC-2025-0001', 50);
    });

    await waitFor(() => {
      expect(screen.getByText('Vital signs recorded')).toBeInTheDocument();
      expect(screen.getByText('Medication administered')).toBeInTheDocument();
    });
  });

  test('displays loading state', () => {
    getPatientLogs.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<PatientLogViewer clientId="UC-2025-0001" clientName="John Doe" />);

    expect(screen.getByText(/Loading Client logs/i)).toBeInTheDocument();
  });

  test('filters logs by category', async () => {
    getPatientLogs.mockResolvedValue(mockLogs);
    getLogsByCategory.mockResolvedValue([mockLogs[0]]);

    render(<PatientLogViewer clientId="UC-2025-0001" clientName="John Doe" />);

    await waitFor(() => {
      expect(screen.getByText('Vital signs recorded')).toBeInTheDocument();
    });

    const categoryFilter = screen.getByRole('combobox');
    fireEvent.change(categoryFilter, { target: { value: 'vital_signs' } });

    await waitFor(() => {
      expect(getLogsByCategory).toHaveBeenCalledWith('UC-2025-0001', 'vital_signs', 50);
    });
  });

  test('searches logs by term', async () => {
    getPatientLogs.mockResolvedValue(mockLogs);

    render(<PatientLogViewer clientId="UC-2025-0001" clientName="John Doe" />);

    await waitFor(() => {
      expect(screen.getByText('Vital signs recorded')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search logs/i);
    fireEvent.change(searchInput, { target: { value: 'vital' } });

    await waitFor(() => {
      expect(screen.getByText('Vital signs recorded')).toBeInTheDocument();
      expect(screen.queryByText('Medication administered')).not.toBeInTheDocument();
    });
  });

  test('expands log entry on click', async () => {
    getPatientLogs.mockResolvedValue(mockLogs);

    render(<PatientLogViewer clientId="UC-2025-0001" clientName="John Doe" />);

    await waitFor(() => {
      expect(screen.getByText('Vital signs recorded')).toBeInTheDocument();
    });

    const logEntry = screen.getByText('Vital signs recorded').closest('div');
    fireEvent.click(logEntry);

    await waitFor(() => {
      expect(screen.getByText(/Activity Type/i)).toBeInTheDocument();
      expect(screen.getByText(/Clinician Email/i)).toBeInTheDocument();
    });
  });

  test('displays no logs message when empty', async () => {
    getPatientLogs.mockResolvedValue([]);

    render(<PatientLogViewer clientId="UC-2025-0001" clientName="John Doe" />);

    await waitFor(() => {
      expect(screen.getByText(/No activities found/i)).toBeInTheDocument();
    });
  });

  test('handles error loading logs', async () => {
    getPatientLogs.mockRejectedValue(new Error('Failed to load logs'));

    render(<PatientLogViewer clientId="UC-2025-0001" clientName="John Doe" />);

    await waitFor(() => {
      expect(screen.getByText(/No activities found/i)).toBeInTheDocument();
    });
  });

  test('displays clinician information', async () => {
    getPatientLogs.mockResolvedValue(mockLogs);

    render(<PatientLogViewer clientId="UC-2025-0001" clientName="John Doe" />);

    await waitFor(() => {
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
      expect(screen.getByText('(doctor)')).toBeInTheDocument();
    });
  });
});

