export function createSoundBus() {
  let audioContext = null;

  const getContext = () => {
    if (audioContext) {
      return audioContext;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    audioContext = new AudioContextClass();
    return audioContext;
  };

  const playTone = ({ frequency, duration = 0.12, type = "square", volume = 0.035, slide = 0 }) => {
    const context = getContext();

    if (!context) {
      return;
    }

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const now = context.currentTime;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.linearRampToValueAtTime(frequency + slide, now + duration);

    gainNode.gain.setValueAtTime(volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  };

  return {
    unlock() {
      const context = getContext();
      if (context?.state === "suspended") {
        context.resume();
      }
    },
    play(name) {
      const palette = {
        jump: { frequency: 380, duration: 0.11, type: "triangle", slide: 120 },
        coin: { frequency: 720, duration: 0.08, type: "square", slide: 60 },
        hit: { frequency: 160, duration: 0.18, type: "sawtooth", slide: -40, volume: 0.04 },
        box: { frequency: 520, duration: 0.14, type: "square", slide: 180, volume: 0.04 },
        power: { frequency: 620, duration: 0.2, type: "triangle", slide: 240, volume: 0.045 },
        stomp: { frequency: 290, duration: 0.12, type: "square", slide: -80 },
        finish: { frequency: 880, duration: 0.26, type: "triangle", slide: 240, volume: 0.05 },
      };

      if (palette[name]) {
        playTone(palette[name]);
      }
    },
  };
}
