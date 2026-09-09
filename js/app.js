/**
 * App Controller Principale - Gioco dell'Impostore
 * Gestione navigazione viste, switch modalità e modale regole
 */

class ImpostorApp {
  constructor() {
    this.currentView = "view-mode-select";
    this.localGame = null;
    this.netGame = null;
    this.init();
  }

  init() {
    // Inizializza controller
    this.localGame = new LocalGameController();
    this.netGame = new NetworkGameController();
    this.p2pGame = new P2PGameController();

    // Riferimenti globali per accesso rapido
    window.LocalGame = this.localGame;
    window.NetGame = this.netGame;
    window.P2PGame = this.p2pGame;

    this.bindGlobalEvents();
    this.updateAudioButtonState();

    // Auto-detect parametri URL:
    // ?room=XXXX -> Apertura automatica stanza P2P (da QR Code o link diretto su GitHub Pages)
    // ?join=1   -> Apertura automatica stanza Wi-Fi LAN
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("room")) {
        this.p2pGame.initView();
      } else if (params.get("join") === "1") {
        this.netGame.initNetworkMode();
      }
    } catch (e) {}
  }

  bindGlobalEvents() {
    // Navigazione Brand -> Torna alla selezione modalità
    const brandBtn = document.getElementById("brand-btn");
    if (brandBtn) {
      brandBtn.addEventListener("click", () => {
        Sound.playClick();
        if (confirm("Vuoi tornare al menu principale? La partita in corso verrà interrotta.")) {
          if (this.localGame.timerInterval) clearInterval(this.localGame.timerInterval);
          this.switchView("view-mode-select");
        }
      });
    }

    // Tasto Regole
    const rulesBtn = document.getElementById("btn-rules");
    const rulesModal = document.getElementById("rules-modal");
    const closeRulesBtn = document.getElementById("btn-close-rules");
    if (rulesBtn && rulesModal) {
      rulesBtn.addEventListener("click", () => {
        Sound.playClick();
        rulesModal.classList.add("open");
      });
    }
    if (closeRulesBtn && rulesModal) {
      closeRulesBtn.addEventListener("click", () => {
        Sound.playClick();
        rulesModal.classList.remove("open");
      });
    }
    if (rulesModal) {
      rulesModal.addEventListener("click", (e) => {
        if (e.target === rulesModal) {
          rulesModal.classList.remove("open");
        }
      });
    }

    // Tasto Audio
    const audioBtn = document.getElementById("btn-audio-toggle");
    if (audioBtn) {
      audioBtn.addEventListener("click", () => {
        const isEnabled = Sound.toggle();
        this.updateAudioButtonState();
      });
    }

    // Selezione Modalità 1: Passa il Telefono
    const selectLocalBtn = document.getElementById("select-mode-local");
    if (selectLocalBtn) {
      selectLocalBtn.addEventListener("click", () => {
        Sound.playClick();
        this.switchView("view-local-setup");
        this.localGame.renderSetupView();
      });
    }

    // Selezione Modalità 2: Stanza Online P2P (Senza PC / GitHub Pages)
    const selectP2PBtn = document.getElementById("select-mode-p2p");
    if (selectP2PBtn) {
      selectP2PBtn.addEventListener("click", () => {
        this.p2pGame.initView();
      });
    }

    // Selezione Modalità 3: Rete Locale Wi-Fi
    const selectNetBtn = document.getElementById("select-mode-network");
    if (selectNetBtn) {
      selectNetBtn.addEventListener("click", () => {
        this.netGame.initNetworkMode();
      });
    }

    // Tasti "Torna al menu" generici
    document.querySelectorAll(".btn-back-to-menu").forEach(btn => {
      btn.addEventListener("click", () => {
        Sound.playClick();
        if (this.localGame.timerInterval) clearInterval(this.localGame.timerInterval);
        this.switchView("view-mode-select");
      });
    });
  }

  updateAudioButtonState() {
    const audioBtn = document.getElementById("btn-audio-toggle");
    if (audioBtn) {
      if (Sound.enabled) {
        audioBtn.innerHTML = "🔊";
        audioBtn.classList.add("active");
        audioBtn.title = "Audio Attivo";
      } else {
        audioBtn.innerHTML = "🔇";
        audioBtn.classList.remove("active");
        audioBtn.title = "Audio Disattivato";
      }
    }
  }

  switchView(viewId) {
    const views = document.querySelectorAll(".app-view");
    views.forEach(v => {
      v.style.display = "none";
    });

    const target = document.getElementById(viewId);
    if (target) {
      target.style.display = "block";
      this.currentView = viewId;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
}

// Avvio applicazione al caricamento del DOM
document.addEventListener("DOMContentLoaded", () => {
  window.App = new ImpostorApp();
});
