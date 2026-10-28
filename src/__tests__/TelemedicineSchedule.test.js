import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Telemedicine from '../pages/Telemedicine';
import telemedicineAPI from '../api/telemedicineAPI';
import { sseService } from '../services/sseService';

jest.mock('backend/auth-hooks', () => {
  const user = { uid: 'u1', id: '802d883f-8e23-49a0-9ed2-cf8639da9d06' };
  return { useAuthState: () => [user, false] };
});
jest.mock('../backend/config', () => ({ auth: {} }));
jest.mock('../components/DocumentManager', () => () => null);
jest.mock('../components/ConsultationCall', () => () => null);
jest.mock('../services/sseService', () => ({ sseService: { subscribe: jest.fn(() => () => {}) } }));
jest.mock('../contexts/UserContext', () => ({
  useUser: () => ({ userProfile: { id: '802d883f-8e23-49a0-9ed2-cf8639da9d06', user_type: 'client', name: 'Ogechukwu Akoma' } }),
}));
jest.mock('../api/telemedicineAPI', () => {
  const actual = jest.requireActual('../api/telemedicineAPI').default;
  return { __esModule: true, default: { ...actual, getAppointments: jest.fn(), formatAppointmentForDisplay: (a) => a } };
});

const scheduled = {
  id: 'bce19a27-5335-4997-9b48-e6af00768744',
  clientId: '802d883f-8e23-49a0-9ed2-cf8639da9d06',
  clientName: 'Ogechukwu Akoma',
  doctorId: '42583aab-e14e-43a6-a327-71f759198dd4',
  doctorName: 'Chinyere',
  status: 'scheduled',
  type: 'video',
  duration: 30,
  appointmentDate: '2026-10-28T03:50:00.000Z',
};

describe('client Telemedicine schedule', () => {
  beforeEach(() => {
    sseService.subscribe.mockImplementation(() => () => {});
  });

  test('shows a scheduled video consultation with the doctor name', async () => {
    telemedicineAPI.getAppointments.mockResolvedValue([scheduled]);
    render(<MemoryRouter><Telemedicine /></MemoryRouter>);
    expect((await screen.findAllByText(/Chinyere/)).length).toBeGreaterThan(0);
  });

  test('reloads appointments when the schedule changes', async () => {
    telemedicineAPI.getAppointments.mockResolvedValueOnce([]).mockResolvedValueOnce([scheduled]);
    render(<MemoryRouter><Telemedicine /></MemoryRouter>);
    await waitFor(() => expect(telemedicineAPI.getAppointments).toHaveBeenCalledTimes(1));
    const onChange = sseService.subscribe.mock.calls.find(([table]) => table === 'telemedicine_appointments')[1];
    onChange();
    expect((await screen.findAllByText(/Chinyere/)).length).toBeGreaterThan(0);
    expect(telemedicineAPI.getAppointments).toHaveBeenCalledTimes(2);
  });
});
