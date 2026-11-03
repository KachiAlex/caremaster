let ctx = null;
let loopTimer = null;

const getCtx = () => {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};

const tone = (ac, freq, start, dur, gain = 0.25) => {
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(0, ac.currentTime + start);
  amp.gain.linearRampToValueAtTime(gain, ac.currentTime + start + 0.02);
  amp.gain.setValueAtTime(gain, ac.currentTime + start + dur - 0.03);
  amp.gain.linearRampToValueAtTime(0, ac.currentTime + start + dur);
  osc.connect(amp).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur);
};

// Classic ring cadence: two short tones, pause, repeat every 3 seconds.
const playRingBurst = (ac) => {
  tone(ac, 440, 0, 0.4);
  tone(ac, 480, 0, 0.4);
  tone(ac, 440, 0.5, 0.4);
  tone(ac, 480, 0.5, 0.4);
};

export const startRingtone = () => {
  stopRingtone();
  const ac = getCtx();
  if (!ac) return;
  playRingBurst(ac);
  loopTimer = setInterval(() => playRingBurst(ac), 3000);
};

export const stopRingtone = () => {
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
  }
};

export const playConnectedChime = () => {
  const ac = getCtx();
  if (!ac) return;
  tone(ac, 660, 0, 0.15, 0.2);
  tone(ac, 880, 0.18, 0.25, 0.2);
};
