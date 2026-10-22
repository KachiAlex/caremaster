import React from 'react';
import { render, screen, act, fireEvent, within } from '@testing-library/react';
import GlobalCallHandler from '../components/GlobalCallHandler';

// ---- Mocks ---------------------------------------------------------------

let mockUserState = { user: { uid: 'u-1' }, userProfile: { id: 'profile-1' } };
jest.mock('../contexts/UserContext', () => ({
  useUser: () => mockUserState,
}));

jest.mock('react-toastify', () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

let mockIncomingCallback = null;
const mockCallService = {
  listenForIncomingCalls: jest.fn(),
  answerCall: jest.fn().mockResolvedValue({ success: true }),
  rejectCall: jest.fn().mockResolvedValue({ success: true }),
  endCall: jest.fn().mockResolvedValue({ success: true }),
  cleanupSignalingRecords: jest.fn().mockResolvedValue(),
  cleanupCallNotifications: jest.fn().mockResolvedValue(),
};
jest.mock('../services/callService', () => ({
  __esModule: true,
  default: class { constructor() { return mockCallService; } },
}));

let mockSignalingCallback = null;
let mockLastWebrtc = null;
const makeWebrtc = () => ({
  initialize: jest.fn().mockResolvedValue(),
  answerCall: jest.fn().mockResolvedValue(),
  listenForSignaling: jest.fn((callId, cb) => {
    mockSignalingCallback = cb;
    return jest.fn();
  }),
  /* keep impl — instances are fresh per accept, so this survives clears */
  handleOffer: jest.fn().mockResolvedValue(),
  handleIceCandidate: jest.fn().mockResolvedValue(),
  endCall: jest.fn().mockResolvedValue(),
  sendSignalingMessage: jest.fn().mockResolvedValue(),
  sendEndBeacon: jest.fn(),
  setCallbacks: jest.fn(),
});
jest.mock('../services/webrtcService', () => ({
  __esModule: true,
  default: class {
    constructor() {
      mockLastWebrtc = makeWebrtc();
      return mockLastWebrtc;
    }
  },
}));

jest.mock('../components/CallInterface', () => (props) => (
  <div data-testid={props.isIncoming ? 'incoming-call' : 'active-call'}>
    <span data-testid="participant-name">{props.participantInfo?.name}</span>
    {props.externalWebrtcService && <span data-testid="has-external-webrtc" />}
    <button onClick={props.onCallAccepted}>accept</button>
    <button onClick={props.onCallRejected}>reject</button>
    <button onClick={props.onClose}>close</button>
  </div>
));

// ---- Helpers -------------------------------------------------------------

const fireIncoming = (overrides = {}) =>
  act(() => {
    mockIncomingCallback({
      status: 'incoming',
      callId: 'call-1',
      callerId: 'caller-9',
      callerName: 'Dr Test',
      callType: 'video',
      ...overrides,
    });
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockIncomingCallback = null;
  mockSignalingCallback = null;
  mockLastWebrtc = null;
  mockUserState = { user: { uid: 'u-1' }, userProfile: { id: 'profile-1' } };
  mockCallService.listenForIncomingCalls.mockImplementation((userId, cb) => {
    mockIncomingCallback = cb;
    return jest.fn();
  });
  mockCallService.answerCall.mockResolvedValue({ success: true });
  mockCallService.rejectCall.mockResolvedValue({ success: true });
  mockCallService.endCall.mockResolvedValue({ success: true });
  mockCallService.cleanupSignalingRecords.mockResolvedValue();
  mockCallService.cleanupCallNotifications.mockResolvedValue();
});

// ---- Tests ---------------------------------------------------------------

describe('GlobalCallHandler', () => {
  test('registers an incoming-call listener for the resolved user id', () => {
    render(<GlobalCallHandler />);
    expect(mockCallService.listenForIncomingCalls).toHaveBeenCalledWith(
      'profile-1',
      expect.any(Function)
    );
  });

  test('renders nothing and registers no listener when logged out', () => {
    mockUserState = { user: null, userProfile: null };
    render(<GlobalCallHandler />);
    expect(mockCallService.listenForIncomingCalls).not.toHaveBeenCalled();
    expect(screen.queryByTestId('incoming-call')).toBeNull();
  });

  test('shows the ring overlay for a fresh incoming notification', () => {
    render(<GlobalCallHandler />);
    fireIncoming();
    expect(screen.getByTestId('incoming-call')).toBeInTheDocument();
    expect(screen.getByTestId('participant-name').textContent).toBe('Dr Test');
  });

  test('ignores non-incoming notifications', () => {
    render(<GlobalCallHandler />);
    act(() => {
      mockIncomingCallback({ status: 'answered', callId: 'call-x', callerId: 'c' });
      mockIncomingCallback({ status: 'ended', callId: 'call-y', callerId: 'c' });
    });
    expect(screen.queryByTestId('incoming-call')).toBeNull();
  });

  test('accept: notification-level answer then WebRTC answer with signaling', async () => {
    render(<GlobalCallHandler />);
    fireIncoming();

    await act(async () => {
      fireEvent.click(within(screen.getByTestId('incoming-call')).getByText('accept'));
    });

    expect(mockCallService.answerCall).toHaveBeenCalledWith('call-1', 'profile-1');
    expect(mockLastWebrtc.initialize).toHaveBeenCalled();
    expect(mockLastWebrtc.answerCall).toHaveBeenCalledWith('call-1', 'video');
    expect(mockLastWebrtc.listenForSignaling).toHaveBeenCalledWith('call-1', expect.any(Function));

    // Incoming overlay replaced by active call UI driven by the external service
    expect(screen.queryByTestId('incoming-call')).toBeNull();
    expect(screen.getByTestId('active-call')).toBeInTheDocument();
    expect(screen.getByTestId('has-external-webrtc')).toBeInTheDocument();
  });

  test('reject: notifies backend and closes the overlay', async () => {
    render(<GlobalCallHandler />);
    fireIncoming();

    await act(async () => {
      fireEvent.click(within(screen.getByTestId('incoming-call')).getByText('reject'));
    });

    expect(mockCallService.rejectCall).toHaveBeenCalledWith('call-1', 'profile-1');
    expect(screen.queryByTestId('incoming-call')).toBeNull();
    expect(mockCallService.answerCall).not.toHaveBeenCalled();
  });

  test('a second call while ringing is rejected, current ring preserved', () => {
    render(<GlobalCallHandler />);
    fireIncoming();
    act(() => {
      mockIncomingCallback({
        status: 'incoming',
        callId: 'call-2',
        callerId: 'other',
        callerName: 'Second',
        callType: 'audio',
      });
    });
    expect(mockCallService.rejectCall).toHaveBeenCalledWith('call-2', 'profile-1');
    expect(screen.getByTestId('participant-name').textContent).toBe('Dr Test');
  });

  test('same callId re-delivered on resubscribe is ignored', () => {
    render(<GlobalCallHandler />);
    fireIncoming();
    fireIncoming(); // identical notification again
    expect(mockCallService.rejectCall).not.toHaveBeenCalled();
    expect(screen.getByTestId('incoming-call')).toBeInTheDocument();
  });

  test('offer and ICE signaling messages reach the WebRTC service', async () => {
    render(<GlobalCallHandler />);
    fireIncoming();
    await act(async () => {
      fireEvent.click(within(screen.getByTestId('incoming-call')).getByText('accept'));
    });

    const offer = { sdp: 'v=0' };
    await act(async () => {
      mockSignalingCallback({ type: 'offer', data: { offer } });
    });
    expect(mockLastWebrtc.handleOffer).toHaveBeenCalledWith(offer, 'video');

    const candidate = { candidate: 'cand' };
    await act(async () => {
      mockSignalingCallback({ type: 'ice-candidate', data: { candidate } });
    });
    expect(mockLastWebrtc.handleIceCandidate).toHaveBeenCalledWith(candidate);
  });

  test('peer end signal tears down the active call', async () => {
    render(<GlobalCallHandler />);
    fireIncoming();
    await act(async () => {
      fireEvent.click(within(screen.getByTestId('incoming-call')).getByText('accept'));
    });
    expect(screen.getByTestId('active-call')).toBeInTheDocument();

    await act(async () => {
      mockSignalingCallback({ type: 'end' });
    });

    expect(mockLastWebrtc.endCall).toHaveBeenCalled();
    expect(screen.queryByTestId('active-call')).toBeNull();
  });

  test('hangup: sends end signal, ends call record, cleans up records', async () => {
    render(<GlobalCallHandler />);
    fireIncoming();
    await act(async () => {
      fireEvent.click(within(screen.getByTestId('incoming-call')).getByText('accept'));
    });

    await act(async () => {
      fireEvent.click(within(screen.getByTestId('active-call')).getByText('close'));
    });

    expect(mockLastWebrtc.sendSignalingMessage).toHaveBeenCalledWith('end', {});
    expect(mockCallService.endCall).toHaveBeenCalledWith('call-1', 0);
    expect(mockCallService.cleanupSignalingRecords).toHaveBeenCalledWith('call-1');
    expect(mockCallService.cleanupCallNotifications).toHaveBeenCalledWith('call-1');
    expect(screen.queryByTestId('active-call')).toBeNull();
  });
});
