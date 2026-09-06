import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  Settings,
  X,
  Check,
  RefreshCw,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  enumerateDevices,
  getSavedDevices,
  saveDevices,
  requestDevicePermissions,
  setAudioOutput,
} from '../services/deviceSettingsService';

/**
 * DeviceSettingsModal Component
 *
 * Allows the user to select their preferred microphone, speaker, and camera
 * for calls and video calls. Preferences are persisted to localStorage and
 * used by the WebRTCService when starting or answering calls.
 *
 * Features:
 * - Live device enumeration with labels (requests permission if needed)
 * - Microphone test with volume meter
 * - Camera preview
 * - Speaker selection (where supported)
 * - Persisted across sessions
 */
const DeviceSettingsModal = ({ isOpen, onClose }) => {
  const [devices, setDevices] = useState({ audioInput: [], audioOutput: [], videoInput: [] });
  const [selected, setSelected] = useState({ audioInput: null, audioOutput: null, videoInput: null });
  const [loading, setLoading] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [testing, setTesting] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const previewVideoRef = useRef(null);
  const previewStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const testAudioRef = useRef(null);

  // Load saved preferences and enumerate devices on open
  useEffect(() => {
    if (!isOpen) return;
    const saved = getSavedDevices();
    setSelected(saved);
    loadDevices();
  }, [isOpen]);

  // Cleanup on close
  useEffect(() => {
    if (isOpen) return;
    stopPreview();
    stopMicTest();
  }, [isOpen]);

  const loadDevices = async () => {
    setLoading(true);
    let devs = await enumerateDevices();

    // If all labels are empty, we need to request permission first
    const hasLabels = [...devs.audioInput, ...devs.videoInput].some(d => d.label);
    if (!hasLabels) {
      setNeedsPermission(true);
      try {
        const granted = await requestDevicePermissions();
        if (granted) {
          devs = await enumerateDevices();
          setNeedsPermission(false);
        }
      } catch (err) {
        toast.error(err.message || 'Permission required to list call devices');
        setLoading(false);
        return;
      }
    }

    setDevices(devs);

    // If no saved selection, pick the first available device for each kind
    setSelected(prev => ({
      audioInput: prev.audioInput || (devs.audioInput[0]?.deviceId ?? null),
      audioOutput: prev.audioOutput || (devs.audioOutput[0]?.deviceId ?? null),
      videoInput: prev.videoInput || (devs.videoInput[0]?.deviceId ?? null),
    }));
    setLoading(false);
  };

  const handleDeviceChange = (kind, deviceId) => {
    setSelected(prev => ({ ...prev, [kind]: deviceId }));
  };

  const handleSave = () => {
    saveDevices(selected);
    toast.success('Call device settings saved');
    stopPreview();
    stopMicTest();
    onClose();
  };

  const handleRefresh = async () => {
    stopPreview();
    stopMicTest();
    await loadDevices();
    toast.info('Device list refreshed');
  };

  // ─── Camera preview ──────────────────────────────────────
  const startPreview = async () => {
    stopPreview();
    if (!selected.videoInput) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: selected.videoInput } },
        audio: false,
      });
      previewStreamRef.current = stream;
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
        previewVideoRef.current.play().catch(() => {});
      }
    } catch (error) {
      toast.error(error.message || 'Failed to preview camera. Please allow camera access.');
    }
  };

  const stopPreview = () => {
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach(t => t.stop());
      previewStreamRef.current = null;
    }
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }
  };

  // Start/stop preview when videoInput selection changes
  useEffect(() => {
    if (isOpen && selected.videoInput) {
      startPreview();
    }
    return () => stopPreview();
  }, [isOpen, selected.videoInput]);

  // ─── Microphone test with volume meter ───────────────────
  const startMicTest = async () => {
    if (!selected.audioInput) return;
    setTesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: selected.audioInput } },
        video: false,
      });
      testAudioRef.current = stream;

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const update = () => {
        if (!analyserRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        // Compute average volume
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(Math.min(100, (avg / 128) * 100));
        animationFrameRef.current = requestAnimationFrame(update);
      };
      update();
    } catch (error) {
      console.error('Mic test error:', error);
      toast.error('Failed to test microphone');
      setTesting(false);
    }
  };

  const stopMicTest = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (testAudioRef.current) {
      testAudioRef.current.getTracks().forEach(t => t.stop());
      testAudioRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
    setTesting(false);
  };

  const toggleMicTest = () => {
    if (testing) stopMicTest();
    else startMicTest();
  };

  if (!isOpen) return null;

  // Helper to render a device dropdown
  const renderSelect = (kind, icon, label, devices, selectedId, placeholder) => {
    const Icon = icon;
    return (
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-ink mb-2">
          <Icon style={{ width: 16, height: 16 }} className="text-[var(--cm-sage)]" />
          {label}
        </label>
        <select
          value={selectedId || ''}
          onChange={(e) => handleDeviceChange(kind, e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-[var(--cm-ink-line,rgba(18,48,44,0.12))] bg-white text-sm text-ink focus:outline-none focus:ring-2 focus:ring-[var(--cm-sage)] focus:border-transparent transition"
        >
          {devices.length === 0 && <option value="">{placeholder}</option>}
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `${label} ${device.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => { stopPreview(); stopMicTest(); onClose(); }}
      />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        style={{ animation: 'slideUp 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--cm-ink-line,rgba(18,48,44,0.08))]">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(107,144,128,0.12)' }}
            >
              <Settings className="text-[var(--cm-sage)]" style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Call Device Settings</h2>
              <p className="text-xs text-[var(--cm-text-soft)]">Choose your microphone, camera, and speaker</p>
            </div>
          </div>
          <button
            onClick={() => { stopPreview(); stopMicTest(); onClose(); }}
            className="p-2 rounded-lg hover:bg-cream transition text-[var(--cm-text-soft)]"
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {needsPermission && (
            <div
              className="flex items-start gap-3 p-3 rounded-lg"
              style={{ background: 'rgba(217,164,65,0.08)', border: '1px solid rgba(217,164,65,0.2)' }}
            >
              <AlertCircle className="text-[var(--cm-gold-deep)] flex-shrink-0" style={{ width: 18, height: 18 }} />
              <p className="text-sm text-[var(--cm-gold-deep)]">
                Device labels are hidden until you grant permission. Click refresh after allowing access.
              </p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-[var(--cm-sage)]" style={{ width: 32, height: 32 }} />
            </div>
          ) : (
            <>
              {/* Microphone selection + test */}
              {renderSelect('audioInput', Mic, 'Microphone', devices.audioInput, selected.audioInput, 'No microphone found')}

              {/* Mic test */}
              {selected.audioInput && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleMicTest}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                      testing
                        ? 'bg-coral text-white hover:opacity-90'
                        : 'bg-cream text-ink hover:bg-[var(--cm-ink-line,rgba(18,48,44,0.08))]'
                    }`}
                  >
                    {testing ? <MicOff style={{ width: 14, height: 14 }} /> : <Mic style={{ width: 14, height: 14 }} />}
                    {testing ? 'Stop Test' : 'Test Mic'}
                  </button>
                  {testing && (
                    <div className="flex-1 flex items-center gap-1">
                      <div className="flex-1 h-2 rounded-full bg-cream overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-75"
                          style={{
                            width: `${audioLevel}%`,
                            background: audioLevel > 60
                              ? 'var(--cm-coral)'
                              : audioLevel > 20
                                ? 'var(--cm-gold)'
                                : 'var(--cm-sage)',
                          }}
                        />
                      </div>
                      <span className="text-xs text-[var(--cm-text-soft)] w-10 text-right">
                        {Math.round(audioLevel)}%
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Speaker selection */}
              {renderSelect('audioOutput', Volume2, 'Speaker (Audio Output)', devices.audioOutput, selected.audioOutput, 'No speaker found')}

              {devices.audioOutput.length === 0 && (
                <p className="text-xs text-[var(--cm-text-soft)] -mt-3">
                  Note: Speaker selection is not supported in Firefox. Chrome/Edge required.
                </p>
              )}

              {/* Camera selection + preview */}
              {renderSelect('videoInput', Video, 'Camera', devices.videoInput, selected.videoInput, 'No camera found')}

              {/* Camera preview */}
              {selected.videoInput && (
                <div className="relative rounded-xl overflow-hidden bg-gray-900" style={{ aspectRatio: '16/9' }}>
                  <video
                    ref={previewVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/50 rounded px-2 py-0.5">
                    <span className="text-white text-xs">Camera Preview</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--cm-ink-line,rgba(18,48,44,0.08))] bg-cream/20">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 text-sm text-[var(--cm-text-soft)] hover:text-ink transition"
          >
            <RefreshCw style={{ width: 16, height: 16 }} />
            Refresh devices
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { stopPreview(); stopMicTest(); onClose(); }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--cm-text-soft)] hover:bg-cream transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-2 transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, var(--cm-sage), var(--cm-ink))' }}
            >
              <Check style={{ width: 16, height: 16 }} />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceSettingsModal;
