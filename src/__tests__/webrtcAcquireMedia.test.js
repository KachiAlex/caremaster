jest.mock('backend/database', () => ({
  collection: jest.fn(), doc: jest.fn(), addDoc: jest.fn(), getDocs: jest.fn(), onSnapshot: jest.fn(),
  updateDoc: jest.fn(), deleteDoc: jest.fn(), query: jest.fn(), where: jest.fn(), orderBy: jest.fn(),
  serverTimestamp: jest.fn(), limit: jest.fn(),
}));
jest.mock('../backend/config', () => ({ auth: { currentUser: null }, db: {} }));
jest.mock('../services/deviceSettingsService', () => ({ buildConstraints: jest.fn() }));

import WebRTCService from '../services/webrtcService';

describe('WebRTCService.acquireMedia', () => {
  const stream = { id: 'ok' };
  let getUserMedia;

  beforeEach(() => {
    getUserMedia = jest.fn();
    Object.defineProperty(global.navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  test('returns the stream when the requested devices are available', async () => {
    getUserMedia.mockResolvedValueOnce(stream);
    const svc = new WebRTCService();
    await expect(svc.acquireMedia({ video: true, audio: true })).resolves.toBe(stream);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  test('retries without saved deviceIds when the saved device is missing', async () => {
    const exact = { deviceId: { exact: 'gone' }, width: 1280 };
    getUserMedia
      .mockRejectedValueOnce(Object.assign(new Error('gone'), { name: 'OverconstrainedError' }))
      .mockResolvedValueOnce(stream);
    const svc = new WebRTCService();
    await expect(svc.acquireMedia({ video: exact, audio: { deviceId: { exact: 'mic' } } })).resolves.toBe(stream);
    const retry = getUserMedia.mock.calls[1][0];
    expect(retry.video.deviceId).toBeUndefined();
    expect(retry.audio.deviceId).toBeUndefined();
    expect(retry.video.width).toBe(1280);
  });

  test('falls back to audio only when no camera can be used', async () => {
    getUserMedia
      .mockRejectedValueOnce(Object.assign(new Error('no camera'), { name: 'NotFoundError' }))
      .mockRejectedValueOnce(Object.assign(new Error('no camera'), { name: 'NotFoundError' }))
      .mockResolvedValueOnce(stream);
    const svc = new WebRTCService();
    await expect(svc.acquireMedia({ video: true, audio: true })).resolves.toBe(stream);
    expect(getUserMedia.mock.calls[2][0]).toEqual({ video: false, audio: true });
  });

  test('rethrows the original error when nothing works', async () => {
    const original = Object.assign(new Error('denied'), { name: 'NotAllowedError' });
    getUserMedia.mockRejectedValue(original);
    const svc = new WebRTCService();
    await expect(svc.acquireMedia({ video: true, audio: true })).rejects.toBe(original);
  });
});
