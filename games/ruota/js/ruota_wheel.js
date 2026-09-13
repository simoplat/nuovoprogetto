/**
 * ruota_wheel.js - Ruota della Fortuna Interattiva in HTML5 Canvas
 * 
 * Fisica di rotazione ad alta precisione con calcolo dei pioli,
 * smorzamento inerziale, scatto del cursore e sincronizzazione P2P.
 */

const RUOTA_WEDGES_CONFIG = [
  { label: "100", value: 100, type: "points", bg: "#e11d48", text: "#ffffff" },
  { label: "BANCAROTTA", value: 0, type: "bankrupt", bg: "#09090b", text: "#ff0055" },
  { label: "300", value: 300, type: "points", bg: "#2563eb", text: "#ffffff" },
  { label: "500", value: 500, type: "points", bg: "#16a34a", text: "#ffffff" },
  { label: "PASSA", value: 0, type: "pass", bg: "#ea580c", text: "#ffffff" },
  { label: "200", value: 200, type: "points", bg: "#9333ea", text: "#ffffff" },
  { label: "1000", value: 1000, type: "points", bg: "#eab308", text: "#000000" },
  { label: "400", value: 400, type: "points", bg: "#0891b2", text: "#ffffff" },
  { label: "150", value: 150, type: "points", bg: "#db2777", text: "#ffffff" },
  { label: "BANCAROTTA", value: 0, type: "bankrupt", bg: "#09090b", text: "#ff0055" },
  { label: "600", value: 600, type: "points", bg: "#4f46e5", text: "#ffffff" },
  { label: "JOLLY ⭐", value: 0, type: "jolly", bg: "#f59e0b", text: "#ffffff" },
  { label: "250", value: 250, type: "points", bg: "#059669", text: "#ffffff" },
  { label: "700", value: 700, type: "points", bg: "#d97706", text: "#ffffff" },
  { label: "350", value: 350, type: "points", bg: "#7c3aed", text: "#ffffff" },
  { label: "500", value: 500, type: "points", bg: "#2563eb", text: "#ffffff" },
  { label: "PASSA", value: 0, type: "pass", bg: "#ea580c", text: "#ffffff" },
  { label: "800", value: 800, type: "points", bg: "#0284c7", text: "#ffffff" },
  { label: "1500", value: 1500, type: "points", bg: "#e11d48", text: "#ffffff" },
  { label: "300", value: 300, type: "points", bg: "#16a34a", text: "#ffffff" },
  { label: "BANCAROTTA", value: 0, type: "bankrupt", bg: "#09090b", text: "#ff0055" },
  { label: "450", value: 450, type: "points", bg: "#c026d3", text: "#ffffff" },
  { label: "2000", value: 2000, type: "points", bg: "#facc15", text: "#000000" },
  { label: "200", value: 200, type: "points", bg: "#0d9488", text: "#ffffff" }
];

class RuotaWheel {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext("2d");
    this.options = Object.assign({
      wedges: RUOTA_WEDGES_CONFIG,
      onSpinComplete: null
    }, options);

    this.wedges = this.options.wedges;
    this.numWedges = this.wedges.length;
    this.arc = (2 * Math.PI) / this.numWedges;

    this.currentAngle = 0; // In radianti
    this.isSpinning = false;
    this.animId = null;

    this.lastPegIndex = -1;
    this.pointerBend = 0; // Flessione elastica del cursore

    this.resizeCanvas();
    this.draw();

    window.addEventListener("resize", () => {
      this.resizeCanvas();
      this.draw();
    });
  }

  resizeCanvas() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const size = Math.min(parent.clientWidth || 320, 420);
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.canvas.style.width = size + "px";
    this.canvas.style.height = size + "px";

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.width = size;
    this.height = size;
    this.centerX = size / 2;
    this.centerY = size / 2;
    this.radius = size / 2 - 12;
  }

  draw() {
    const ctx = this.ctx;
    const cx = this.centerX;
    const cy = this.centerY;
    const r = this.radius;

    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.currentAngle);

    // 1. Spicchi della ruota
    for (let i = 0; i < this.numWedges; i++) {
      const angle = i * this.arc;
      const wedge = this.wedges[i];

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, angle, angle + this.arc, false);
      ctx.closePath();

      // Colore di sfondo dello spicchio
      ctx.fillStyle = wedge.bg;
      ctx.fill();

      // Bordo dorato di separazione
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.stroke();

      // 2. Testo dello spicchio (orientato dal bordo verso il centro)
      ctx.save();
      ctx.rotate(angle + this.arc / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = wedge.text;

      if (wedge.type === "bankrupt") {
        ctx.font = "bold 10px 'Outfit', sans-serif";
        ctx.fillText("BANCAROTTA 💀", r - 16, 0);
      } else if (wedge.type === "pass") {
        ctx.font = "bold 11px 'Outfit', sans-serif";
        ctx.fillText("PASSA 🚫", r - 16, 0);
      } else if (wedge.type === "jolly") {
        ctx.font = "bold 11px 'Outfit', sans-serif";
        ctx.fillText("JOLLY ⭐", r - 16, 0);
      } else {
        ctx.font = "900 13px 'Outfit', sans-serif";
        ctx.fillText(wedge.label, r - 18, 0);
      }
      ctx.restore();

      // 3. Pioli argentati / cromati sul bordo per ogni spicchio
      const pegAngle = angle;
      const pegX = (r - 4) * Math.cos(pegAngle);
      const pegY = (r - 4) * Math.sin(pegAngle);

      ctx.beginPath();
      ctx.arc(pegX, pegY, 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = "#f8fafc";
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#475569";
      ctx.stroke();
    }

    // 4. Anello metallico esterno
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, 2 * Math.PI);
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#1e293b";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, r - 3, 0, 2 * Math.PI);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.stroke();

    // 5. Mozzo centrale dorato / cromato
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, 2 * Math.PI);
    ctx.fillStyle = "#0f172a";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#eab308";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, 2 * Math.PI);
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
    grad.addColorStop(0, "#fde047");
    grad.addColorStop(1, "#b45309");
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.restore();

    // 6. Cursore / Clacker triangolare in cima (orientato verso il basso alle ore 12)
    this.drawPointer(cx, cy - r + 4);
  }

  drawPointer(x, y) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.pointerBend);

    // Corpo freccia dorata
    ctx.beginPath();
    ctx.moveTo(-10, -14);
    ctx.lineTo(10, -14);
    ctx.lineTo(0, 16);
    ctx.closePath();

    ctx.fillStyle = "#ff0055";
    ctx.shadowColor = "rgba(255, 0, 85, 0.6)";
    ctx.shadowBlur = 8;
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    // Perno
    ctx.beginPath();
    ctx.arc(0, -10, 4, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.restore();
  }

  /**
   * Avvia lo spin della ruota.
   * Se targetIndex è specificato (es. generato dall'host in P2P), la ruota rallenterà
   * con precisione millimetrica esattamente su quello spicchio.
   */
  spin(targetIndex = null, callback = null) {
    if (this.isSpinning) return;
    this.isSpinning = true;

    // Se non è fornito il target, sceglilo a caso
    let selectedWedgeIndex = targetIndex;
    if (selectedWedgeIndex === null || selectedWedgeIndex < 0 || selectedWedgeIndex >= this.numWedges) {
      selectedWedgeIndex = Math.floor(Math.random() * this.numWedges);
    }

    // Il cursore si trova a -PI/2 (ore 12).
    // Dobbiamo calcolare l'angolo finale in modo che selectedWedgeIndex sia alle ore 12.
    // L'angolo al centro dello spicchio i è: (i + 0.5) * arc.
    // Con la rotazione theta: -PI/2 = angle + theta => theta = -PI/2 - (i + 0.5)*arc.
    const wedgeCenterAngle = (selectedWedgeIndex + 0.5) * this.arc;
    const targetBaseAngle = (1.5 * Math.PI) - wedgeCenterAngle;

    // Aggiungi 5-8 giri completi per una rotazione avvincente
    const fullSpins = (5 + Math.floor(Math.random() * 3)) * 2 * Math.PI;
    const currentModulo = this.currentAngle % (2 * Math.PI);
    const finalAngle = this.currentAngle + (2 * Math.PI - currentModulo) + fullSpins + (targetBaseAngle % (2 * Math.PI));

    const totalDistance = finalAngle - this.currentAngle;
    const duration = 4500 + Math.random() * 1000; // ~5 secondi di suspense
    const startTime = performance.now();
    const startAngle = this.currentAngle;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Curva di decelerazione cubica morbida (ease-out cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      this.currentAngle = startAngle + totalDistance * easeOut;

      // Calcola velocità istantanea per suono pioli
      const currentSpeed = (1 - progress) * (1 - progress);

      // Calcola piolo attraversato per suono e flessione cursore
      const normalizedAngle = (this.currentAngle / this.arc);
      const currentPeg = Math.floor(normalizedAngle);

      if (currentPeg !== this.lastPegIndex) {
        this.lastPegIndex = currentPeg;
        if (window.RuotaSound) {
          window.RuotaSound.playWheelTick(currentSpeed);
        }
        this.pointerBend = 0.22 * (currentSpeed > 0.1 ? 1 : 0.4);
      } else {
        this.pointerBend *= 0.85; // Ritorno elastico del cursore
      }

      this.draw();

      if (progress < 1) {
        this.animId = requestAnimationFrame(animate);
      } else {
        this.isSpinning = false;
        this.pointerBend = 0;
        this.draw();

        const resultWedge = this.getWedgeAtPointer();
        if (this.options.onSpinComplete) {
          this.options.onSpinComplete(resultWedge, selectedWedgeIndex);
        }
        if (callback) {
          callback(resultWedge, selectedWedgeIndex);
        }
      }
    };

    this.animId = requestAnimationFrame(animate);
  }

  /**
   * Determina quale spicchio si trova esattamente sotto il cursore alle ore 12
   */
  getWedgeAtPointer() {
    // Puntatore alle ore 12 = 3*PI/2 (o -PI/2)
    const pointerAngle = 1.5 * Math.PI;
    let relAngle = (pointerAngle - (this.currentAngle % (2 * Math.PI))) % (2 * Math.PI);
    if (relAngle < 0) relAngle += 2 * Math.PI;

    const index = Math.floor(relAngle / this.arc) % this.numWedges;
    return this.wedges[index];
  }
}

// Esporta globalmente e per moduli Node
if (typeof window !== "undefined") {
  window.RUOTA_WEDGES_CONFIG = RUOTA_WEDGES_CONFIG;
  window.RuotaWheel = RuotaWheel;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    RUOTA_WEDGES_CONFIG,
    RuotaWheel
  };
}
