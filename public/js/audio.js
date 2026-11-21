// Synthesized Sound Generator for Restaurant Notifications (Web Audio API)
class RestaurantAudio {
  constructor() {
    this.audioCtx = null;
    this.muted = false;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // Pleasant Service Bell Chime (Order Placed / Kitchen Alert)
  playOrderBell() {
    if (this.muted) return;
    try {
      this.init();
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // Note 1 (High tone)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 1.2);

      // Note 2 (Chime harmony)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1318.51, now + 0.15); // E6
      gain2.gain.setValueAtTime(0.25, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 1.6);
    } catch (e) {
      console.warn("Audio playback error:", e);
    }
  }

  // Urgent kitchen alert (30s grace passed -> Cooking starts!)
  playCookingAlert() {
    if (this.muted) return;
    try {
      this.init();
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C - E - G - C arpeggio
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.2, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.5);
      });
    } catch (e) {
      console.warn("Audio playback error:", e);
    }
  }

  // Cancelled sound (Low subtle double beep)
  playCancelSound() {
    if (this.muted) return;
    try {
      this.init();
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      [350, 260].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + i * 0.18);
        gain.gain.setValueAtTime(0.15, now + i * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.18);
        osc.stop(now + i * 0.18 + 0.25);
      });
    } catch (e) {
      console.warn("Audio playback error:", e);
    }
  }
}

window.restaurantAudio = new RestaurantAudio();
