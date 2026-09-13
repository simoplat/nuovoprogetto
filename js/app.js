/**
 * PartyHubApp - Controller Principale del Party Game Hub
 * Gestione catalogo giochi modulare, navigazione unificata e ripresa rapida Host
 */

class PartyHubApp {
  constructor() {
    this.currentView = "view-hub";
    this.activeGameId = null;
    this.localGame = null;
    this.p2pGame = null;
    this.init();
  }

  init() {
    // Inizializza controller di gioco
    this.localGame = new LocalGameController();
    this.p2pGame = new P2PGameController();
    this.lupusGame = new LupusGameController();

    // Riferimenti globali per accesso rapido
    window.LocalGame = this.localGame;
    window.P2PGame = this.p2pGame;
    window.LupusGame = this.lupusGame;

    this.renderHub();
    this.checkHostResumeSession();
    this.bindGlobalEvents();
    this.updateAudioButtonState();

    // Aggiornamento dinamico delle categorie parole
    window.addEventListener("wordsLoaded", () => {
      if (this.localGame && typeof this.localGame.renderCategoryOptions === "function") {
        this.localGame.renderCategoryOptions();
      }
      if (this.p2pGame && typeof this.p2pGame.renderCategoryOptions === "function") {
        this.p2pGame.renderCategoryOptions();
      }
    });

    // Auto-detect parametri URL:
    // ?room=XXXX -> Apertura automatica diretta per entrare nella stanza P2P (invito QR/Link)
    try {
      const params = new URLSearchParams(window.location.search);
      const roomCode = params.get("room");
      const gameParam = params.get("game");
      if (roomCode) {
        if (gameParam === "lupus") {
          window.location.href = "games/lupus/index.html?room=" + encodeURIComponent(roomCode);
          return;
        }
        window.location.href = "games/impostore/index.html?room=" + encodeURIComponent(roomCode);
        return;
      } else {
        this.switchView("view-hub");
      }
    } catch (e) {
      this.switchView("view-hub");
    }
  }

  // =========================================================================
  // RENDERING PARTY GAME HUB & CATALOGO MODULARE
  // =========================================================================

  renderHub() {
    const gridEl = document.getElementById("hub-games-grid");
    const registry = window.GameRegistry || window.GlobalGameRegistry;
    if (!gridEl || !registry) return;

    const games = registry.getAll();
    gridEl.replaceChildren();

    games.forEach(game => {
      const card = document.createElement("div");
      const isActive = game.status === "active";
      card.className = `game-card ${isActive ? "active" : "coming-soon"}`;
      card.id = `hub-game-card-${game.id}`;

      const content = document.createElement("div");

      const header = document.createElement("div");
      header.className = "game-card-header";

      const iconSpan = document.createElement("span");
      iconSpan.className = "game-card-icon";
      iconSpan.textContent = game.icon;

      const badgeSpan = document.createElement("span");
      badgeSpan.className = `game-card-badge ${isActive ? "badge-active" : "badge-soon"}`;
      badgeSpan.textContent = isActive ? (game.badge || "Disponibile") : "In Arrivo ⏳";

      header.append(iconSpan, badgeSpan);

      const titleEl = document.createElement("h3");
      titleEl.className = "game-card-title";
      titleEl.textContent = game.title;

      const taglineEl = document.createElement("p");
      taglineEl.className = "game-card-tagline";
      taglineEl.textContent = game.tagline;

      const modesContainer = document.createElement("div");
      modesContainer.className = "game-card-modes";
      (game.modes || []).forEach(m => {
        const pill = document.createElement("span");
        pill.className = "game-mode-pill";
        pill.textContent = (game.modeLabels && game.modeLabels[m]) || (m === "local" ? "📱 Passa il Telefono" : "⚡ Stanza Online");
        modesContainer.append(pill);
      });

      content.append(header, titleEl, taglineEl, modesContainer);

      const footer = document.createElement("div");
      footer.className = "game-card-footer";
      if (isActive) {
        const playBtn = document.createElement("button");
        playBtn.type = "button";
        playBtn.className = "btn btn-primary btn-sm btn-play-game";
        playBtn.dataset.game = game.id;
        playBtn.textContent = "Gioca Ora 🚀";
        playBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.selectGame(game.id);
        });

        const infoBtn = document.createElement("button");
        infoBtn.type = "button";
        infoBtn.className = "btn btn-secondary btn-sm btn-info-game";
        infoBtn.dataset.game = game.id;
        infoBtn.title = "Regole e Info";
        infoBtn.textContent = "📖 Regole";
        infoBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.openGameInfoModal(game);
        });

        footer.append(playBtn, infoBtn);
      } else {
        const infoBtn = document.createElement("button");
        infoBtn.type = "button";
        infoBtn.className = "btn btn-secondary btn-sm btn-info-game w-full";
        infoBtn.dataset.game = game.id;
        infoBtn.textContent = "Dettagli & Regole 📖";
        infoBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.openGameInfoModal(game);
        });
        footer.append(infoBtn);
      }

      card.append(content, footer);

      card.addEventListener("click", () => {
        if (isActive) {
          this.selectGame(game.id);
        } else {
          this.openGameInfoModal(game);
        }
      });

      gridEl.appendChild(card);
    });
  }

  selectGame(gameId) {
    Sound.playClick();
    this.activeGameId = gameId;

    if (gameId === "impostore") {
      try {
        window.location.href = "games/impostore/index.html";
      } catch (e) {
        this.switchView("view-mode-select");
      }
    } else if (gameId === "lupus") {
      try {
        window.location.href = "games/lupus/index.html";
      } catch (e) {
        this.switchView("view-lupus-setup");
        if (this.lupusGame && typeof this.lupusGame.renderSetupView === "function") {
          this.lupusGame.renderSetupView();
        }
      }
    } else if (gameId === "ruota") {
      try {
        window.location.href = "games/ruota/index.html";
      } catch (e) {
        window.location.href = "ruota.html";
      }
    } else {
      const registry = window.GameRegistry || window.GlobalGameRegistry;
      const game = registry ? registry.get(gameId) : null;
      if (game) this.openGameInfoModal(game);
    }
  }

  // =========================================================================
  // HOST SESSION RESUME (Ripresa Stanza Veloce)
  // =========================================================================

  checkHostResumeSession() {
    const banner = document.getElementById("hub-resume-host-banner");
    const codeEl = document.getElementById("hub-resume-code");
    const resumeBtn = document.getElementById("btn-resume-host");
    const dismissBtn = document.getElementById("btn-dismiss-host-resume");

    if (!banner || !codeEl) return;

    try {
      const raw = sessionStorage.getItem("impostore_p2p_host_session");
      if (!raw) {
        banner.style.display = "none";
        return;
      }

      const session = JSON.parse(raw);
      const isFresh = session && session.roomCode && (Date.now() - (session.timestamp || 0)) < 300000; // < 5 minuti

      if (isFresh) {
        codeEl.textContent = session.roomCode;
        banner.style.display = "flex";

        if (resumeBtn) {
          resumeBtn.onclick = () => {
            Sound.playClick();
            banner.style.display = "none";
            this.activeGameId = "impostore";
            this.p2pGame.resumeHostSession();
          };
        }

        if (dismissBtn) {
          dismissBtn.onclick = () => {
            Sound.playClick();
            banner.style.display = "none";
            this.p2pGame.cleanUpHostSession();
          };
        }
      } else {
        banner.style.display = "none";
      }
    } catch (e) {
      banner.style.display = "none";
    }
  }

  // =========================================================================
  // MODALE INFO & REGOLE GIOCO
  // =========================================================================

  openGameInfoModal(game) {
    Sound.playClick();
    const modal = document.getElementById("game-info-modal");
    if (!modal) return;

    const iconEl = document.getElementById("game-info-modal-icon");
    const titleEl = document.getElementById("game-info-modal-title");
    const badgeEl = document.getElementById("game-info-modal-badge");
    const summaryEl = document.getElementById("game-info-modal-summary");
    const modesEl = document.getElementById("game-info-modal-modes");
    const actionEl = document.getElementById("game-info-modal-action-box");

    if (iconEl) iconEl.textContent = game.icon || "🎮";
    if (titleEl) titleEl.textContent = game.title || "Gioco";
    if (badgeEl) {
      badgeEl.textContent = game.status === "active" ? (game.badge || "Attivo") : "In Arrivo ⏳";
      badgeEl.className = `mode-badge ${game.status === "active" ? "" : "badge-soon"}`;
    }
    if (summaryEl) summaryEl.textContent = game.rulesSummary || game.tagline || "";

    if (modesEl) {
      modesEl.replaceChildren();
      (game.modes || []).forEach(m => {
        const label = (game.modeLabels && game.modeLabels[m]) || (m === "local" ? "Passa il Telefono" : "Stanza Online P2P");
        const pill = document.createElement("div");
        pill.className = "game-mode-pill";
        pill.style.padding = "8px 12px";
        pill.style.fontSize = "0.85rem";
        const strong = document.createElement("strong");
        strong.textContent = label;
        pill.append("✅ ", strong);
        modesEl.append(pill);
      });
    }

    if (actionEl) {
      actionEl.replaceChildren();
      if (game.status === "active") {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-primary btn-block";
        btn.id = "modal-btn-play-game";
        btn.textContent = `🚀 Inizia a Giocare a ${game.title}`;
        btn.onclick = () => {
          modal.classList.remove("open");
          this.selectGame(game.id);
        };
        actionEl.append(btn);
      } else {
        const soonBox = document.createElement("div");
        soonBox.style.textAlign = "center";
        soonBox.style.color = "var(--text-muted)";
        soonBox.style.fontSize = "0.85rem";
        soonBox.style.padding = "10px";
        soonBox.style.background = "rgba(0,0,0,0.2)";
        soonBox.style.borderRadius = "var(--radius-md)";
        soonBox.textContent = "⏳ Questo gioco sarà disponibile nei prossimi aggiornamenti del Party Game Hub!";
        actionEl.append(soonBox);
      }
    }

    modal.classList.add("open");
  }

  // =========================================================================
  // EVENTI GLOBALI & NAVIGAZIONE
  // =========================================================================

  bindGlobalEvents() {
    // Navigazione Brand -> Torna all'Hub
    const brandBtn = document.getElementById("brand-btn");
    if (brandBtn) {
      brandBtn.addEventListener("click", () => {
        Sound.playClick();
        if (this.currentView === "view-hub") return;

        if (confirm("Vuoi tornare al Party Game Hub? La sessione corrente verrà interrotta.")) {
          if (this.localGame && this.localGame.timerInterval) {
            clearInterval(this.localGame.timerInterval);
          }
          if (this.lupusGame && this.lupusGame.discussionTimer) {
            clearInterval(this.lupusGame.discussionTimer);
          }
          if (this.p2pGame && this.p2pGame.stopHostGraceCountdown) {
            this.p2pGame.stopHostGraceCountdown();
          }
          this.checkHostResumeSession();
          this.switchView("view-hub");
        }
      });
    }

    // Tasti Torna al Party Game Hub (sia ID che classe)
    document.querySelectorAll("#btn-back-to-hub, .btn-back-to-hub").forEach(btn => {
      btn.addEventListener("click", () => {
        Sound.playClick();
        if (this.lupusGame && this.lupusGame.discussionTimer) {
          clearInterval(this.lupusGame.discussionTimer);
        }
        this.checkHostResumeSession();
        this.switchView("view-hub");
      });
    });

    // Tasto Regole Generali
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

    // Modale Info Gioco
    const gameInfoModal = document.getElementById("game-info-modal");
    const closeGameInfoBtn = document.getElementById("btn-close-game-info");
    if (closeGameInfoBtn && gameInfoModal) {
      closeGameInfoBtn.addEventListener("click", () => {
        Sound.playClick();
        gameInfoModal.classList.remove("open");
      });
    }
    if (gameInfoModal) {
      gameInfoModal.addEventListener("click", (e) => {
        if (e.target === gameInfoModal) {
          gameInfoModal.classList.remove("open");
        }
      });
    }

    // Tasto Audio Toggle
    const audioBtn = document.getElementById("btn-audio-toggle");
    if (audioBtn) {
      audioBtn.addEventListener("click", () => {
        Sound.toggle();
        this.updateAudioButtonState();
      });
    }

    // Selezione Modalità L'Impostore: Passa il Telefono
    const selectLocalBtn = document.getElementById("select-mode-local");
    if (selectLocalBtn) {
      selectLocalBtn.addEventListener("click", () => {
        Sound.playClick();
        this.switchView("view-local-setup");
        this.localGame.renderSetupView();
      });
    }

    // Selezione Modalità L'Impostore: Stanza Online P2P
    const selectP2PBtn = document.getElementById("select-mode-p2p");
    if (selectP2PBtn) {
      selectP2PBtn.addEventListener("click", () => {
        this.p2pGame.initView();
      });
    }

    // Tasti "Torna al menu" generici (ritornano alla selezione modalità del gioco attivo)
    document.querySelectorAll(".btn-back-to-menu").forEach(btn => {
      btn.addEventListener("click", () => {
        Sound.playClick();
        if (this.localGame && this.localGame.timerInterval) {
          clearInterval(this.localGame.timerInterval);
        }
        this.switchView("view-mode-select");
      });
    });
  }

  updateAudioButtonState() {
    const audioBtn = document.getElementById("btn-audio-toggle");
    if (audioBtn) {
      if (Sound.enabled) {
        audioBtn.textContent = "🔊";
        audioBtn.classList.add("active");
        audioBtn.title = "Audio Attivo";
      } else {
        audioBtn.textContent = "🔇";
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

    // Aggiorna branding Header
    const brandIcon = document.getElementById("brand-icon");
    const brandTitle = document.getElementById("brand-title");
    const brandSubtitle = document.getElementById("brand-subtitle");

    if (viewId === "view-hub") {
      if (brandIcon) brandIcon.textContent = "🎮";
      if (brandTitle) brandTitle.textContent = "PARTY HUB";
      if (brandSubtitle) brandSubtitle.textContent = "GIOCHI TRA AMICI";
    } else if (viewId.startsWith("view-lupus-")) {
      if (brandIcon) brandIcon.textContent = "🐺";
      if (brandTitle) brandTitle.textContent = "LUPUS IN FABULA";
      if (brandSubtitle) brandSubtitle.textContent = "PARTY GAME LOCALE";
    } else {
      if (brandIcon) brandIcon.textContent = "🕵️";
      if (brandTitle) brandTitle.textContent = "L'IMPOSTORE";
      if (brandSubtitle) brandSubtitle.textContent = "PARTY GAME";
    }
  }
}

// Avvio applicazione al caricamento del DOM
document.addEventListener("DOMContentLoaded", () => {
  window.App = new PartyHubApp();
});

