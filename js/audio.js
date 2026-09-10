/**
 * Effetti Sonori & Tattili tramite Web Audio API
 * Genera suoni sintetizzati ad alta fedeltà senza dipendere da file audio esterni
 */

class SoundSystem {
  constructor() {
    this.ctx = null;
    let enabled = true;
    try {
      enabled = localStorage.getItem("impostore_audio_enabled") !== "false";
    } catch (e) {
      enabled = true;
    }
    this.enabled = enabled;
    this.hapticEnabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem("impostore_audio_enabled", this.enabled);
    } catch (e) {}
    if (this.enabled) {
      this.init();
      this.playClick();
    }
    return this.enabled;
  }

  vibrate(pattern = [50]) {
    if (this.hapticEnabled && "vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Ignora su browser che non supportano o bloccano vibrazione
      }
    }
  }

  playClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
    this.vibrate(15);
  }

  playHoldTick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(520, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.07);
    this.vibrate(25);
  }

  playInnocentReveal() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // Accordo solenne e rassicurante (Do maggiore con arpeggio veloce)
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = this.ctx.currentTime + idx * 0.07;

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.55);
    });

    this.vibrate([40, 60, 80]);
  }

  playImpostorReveal() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // Suono drammatico e tensivo (sirena / discesa minacciosa)
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc2.type = "sine";

    // Frequenza cupa dissonante
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(65, this.ctx.currentTime + 0.7);

    osc2.frequency.setValueAtTime(280, this.ctx.currentTime);
    osc2.frequency.linearRampToValueAtTime(110, this.ctx.currentTime + 0.7);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.85);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc2.start();
    osc.stop(this.ctx.currentTime + 0.9);
    osc2.stop(this.ctx.currentTime + 0.9);

    this.vibrate([100, 50, 150, 50, 200]);
  }

  playTimerTick(isUrgent = false) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isUrgent ? "sawtooth" : "sine";
    osc.frequency.setValueAtTime(isUrgent ? 880 : 440, this.ctx.currentTime);

    gain.gain.setValueAtTime(isUrgent ? 0.2 : 0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);

    if (isUrgent) {
      this.vibrate(50);
    }
  }

  playTimerEnd() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // Triplo allarme di fine tempo
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime + i * 0.22;

      osc.type = "square";
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.setValueAtTime(800, t + 0.08);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.2);
    }
    this.vibrate([150, 100, 150, 100, 300]);
  }

  playFanfare() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // Melodia trionfale di vittoria
    const notes = [392, 523.25, 659.25, 783.99, 1046.5];
    const delays = [0, 0.12, 0.24, 0.36, 0.52];

    delays.forEach((delay, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime + delay;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(notes[idx], t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + (idx === delays.length - 1 ? 0.8 : 0.25));

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
    });
    this.vibrate([80, 50, 80, 50, 200]);
  }

  playSuccess() {
    this.playFanfare();
  }

  playGameOver() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // Sequenza cupa discendente per eliminazioni e sconfitte
    const notes = [220, 196, 174.61, 146.83];
    const delays = [0, 0.2, 0.4, 0.65];

    delays.forEach((delay, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime + delay;

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(notes[idx], t);
      osc.frequency.exponentialRampToValueAtTime(notes[idx] * 0.85, t + 0.3);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + (idx === delays.length - 1 ? 0.7 : 0.28));

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + (idx === delays.length - 1 ? 0.75 : 0.3));
    });
    this.vibrate([100, 80, 150]);
  }
}

// Istanza globale
const Sound = new SoundSystem();
