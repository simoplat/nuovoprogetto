/**
 * ruota_sound.js - Effetti Sonori & Tattili tramite Web Audio API
 * Genera suoni sintetizzati professionali a zero latenza e senza file audio esterni.
 */

class RuotaSoundSystem {
  constructor() {
    this.ctx = null;
    let enabled = true;
    try {
      enabled = localStorage.getItem("ruota_audio_enabled") !== "false";
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
      localStorage.setItem("ruota_audio_enabled", this.enabled);
    } catch (e) {}
    if (this.enabled) {
      this.init();
      this.playTileDing();
    }
    return this.enabled;
  }

  vibrate(pattern = [40]) {
    if (this.hapticEnabled && "vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }

  /**
   * Iconico rintocco di campana metallica brillante quando la casella si illumina ("DING!")
   */
  playTileDing(occurrenceIndex = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // Frequenze armoniche per timbro cristallino a campana di studio TV
    const baseFreq = 1174.66; // D6
    // Leggera variazione armonica se ci sono lettere multiple consecutive
    const pitchOffset = Math.min(occurrenceIndex * 35, 150);
    const fundamental = baseFreq + pitchOffset;

    const harmonics = [
      { f: fundamental, gain: 0.28, decay: 0.65 },
      { f: fundamental * 2.02, gain: 0.14, decay: 0.45 },
      { f: fundamental * 3.01, gain: 0.08, decay: 0.35 },
      { f: fundamental * 4.25, gain: 0.05, decay: 0.25 }
    ];

    const now = this.ctx.currentTime;

    harmonics.forEach(h => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(h.f, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(h.gain, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + h.decay);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + h.decay + 0.05);
    });

    this.vibrate([40]);
  }

  /**
   * Fruscio / scatto quando la tessera compie la rotazione 3D per mostrare la lettera
   */
  playLetterFlip() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  /**
   * Click meccanico del piolo della ruota che colpisce il puntatore
   */
  playWheelTick(velocityRatio = 1) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Più veloce gira la ruota, più secco e alto è il click
    const freq = 650 + Math.min(velocityRatio * 350, 450);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.025);

    const volume = Math.min(0.05 + velocityRatio * 0.12, 0.2);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);

    if (velocityRatio > 0.4) {
      this.vibrate([10]);
    }
  }

  /**
   * Buzzer classico per lettera assente o soluzione errata ("Eh-ehhh!")
   */
  playBuzzer() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.15;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = "sawtooth";
      osc2.type = "square";

      osc1.frequency.setValueAtTime(145, t);
      osc2.frequency.setValueAtTime(153, t);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(t);
      osc1.stop(t + 0.13);
      osc2.start(t);
      osc2.stop(t + 0.13);
    }

    this.vibrate([80, 40, 120]);
  }

  /**
   * Suono Bancarotta: discesa cromatica cupa
   */
  playBankrupt() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [293.66, 277.18, 261.63, 246.94, 233.08, 110];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.14;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = idx === notes.length - 1 ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(freq, t);
      if (idx === notes.length - 1) {
        osc.frequency.exponentialRampToValueAtTime(55, t + 0.5);
      }

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + (idx === notes.length - 1 ? 0.6 : 0.13));

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + (idx === notes.length - 1 ? 0.65 : 0.14));
    });

    this.vibrate([150, 100, 250]);
  }

  /**
   * Fanfara trionfale della vittoria e soluzione indovinata!
   */
  playSolveFanfare() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const melody = [
      { f: 523.25, t: 0, d: 0.12 },
      { f: 523.25, t: 0.14, d: 0.12 },
      { f: 523.25, t: 0.28, d: 0.12 },
      { f: 659.25, t: 0.42, d: 0.22 },
      { f: 783.99, t: 0.68, d: 0.22 },
      { f: 1046.50, t: 0.94, d: 0.75 }
    ];

    melody.forEach(m => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const st = now + m.t;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(m.f, st);

      gain.gain.setValueAtTime(0, st);
      gain.gain.linearRampToValueAtTime(0.25, st + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.005, st + m.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(st);
      osc.stop(st + m.d + 0.05);
    });

    const chordTime = now + 0.94;
    [1046.50, 1318.51, 1567.98].forEach(freq => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, chordTime);

      gain.gain.setValueAtTime(0.12, chordTime);
      gain.gain.exponentialRampToValueAtTime(0.001, chordTime + 1.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(chordTime);
      osc.stop(chordTime + 1.25);
    });

    this.vibrate([60, 40, 60, 40, 100, 50, 300]);
  }

  playClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(350, now + 0.035);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.035);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }
}

// Istanza globale esportata
if (typeof window !== "undefined") {
  window.RuotaSound = new RuotaSoundSystem();
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = RuotaSoundSystem;
}
