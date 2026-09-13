/**
 * lupus_p2p_game.js - Controller per la modalità Stanza Online P2P di Lupus in Fabula
 * 
 * Permette a ciascun partecipante di connettersi dal proprio smartphone tramite QR Code / PIN a 4 caratteri,
 * ricevere la propria carta ruolo segreta in stile Dark Fantasy, confermarne la presa visione,
 * e vedere la schermata "Adesso posa il telefono ed ascolta le indicazioni del master".
 * 
 * Funzionalità chiave:
 * 1. Tolleranza totale alle disconnessioni: i giocatori possono bloccare il telefono o perdere la connessione
 *    senza interrompere la partita; nel registro del master viene mostrato "Connesso" / "Disconnesso".
 * 2. Monitoraggio in tempo reale per l'Host di chi ha confermato la carta e chi manca.
 * 3. Integrazione trasparente con la Guida del Narratore (LupusMasterUI) per la gestione della partita.
 */

class LupusP2PController {
  constructor(app) {
    this.app = app;
    this.room = null;
    this.isHost = false;
    this.roomCode = "";
    this.playerName = "";
    try {
      this.playerName = localStorage.getItem("lupus_p2p_name") || "";
    } catch (e) {}

    // Configurazione Lupi e Ruoli per l'Host
    this.wolvesCount = 1;
    this.discussionMinutes = 3;
    try {
      const savedMin = parseInt(localStorage.getItem("lupus_discussion_minutes"), 10);
      if (savedMin >= 1 && savedMin <= 10) this.discussionMinutes = savedMin;
    } catch (e) {}

    this.enabledRoles = {
      veggente: false,
      guardia: false,
      strega: false,
      cupido: false,
      donna: false,
      giullare: false,
      infiltrato: false,
      lupo_bianco: false,
      lupo_stregone: false,
      beccamorto: false,
      idiota: false,
      cane_nero: false,
      necromante: false
    };

    this.hostPlaysInVillage = false; // Il Master fa solo da Narratore/Moderatore esterno e non gioca nel villaggio

    // Giocatori e Ruoli
    this.players = []; // [{ id, peerId, playerId, name, isHost, online }]
    this.assignments = []; // Ruoli assegnati nella partita
    this.confirmedPlayers = new Set(); // playerId di chi ha premuto "Ho memorizzato il mio ruolo"

    // Dati per il Client partecipante
    this.myRoleData = null; // { roleKey, role, allies }
    this.hasConfirmedRole = false;
    this.isRematchMode = false; // Flag attivo quando si prepara una nuova partita da rigiocare

    // Hold-to-reveal sul proprio device
    this.isHolding = false;
    this.holdStartTime = 0;
    this.holdProgressInterval = null;
    this.holdRequiredMs = 350;

    this.bindEvents();
  }

  // =========================================================================
  // BIND DEGLI EVENTI DELLA VISTA P2P
  // =========================================================================

  bindEvents() {
    // 1. Tab Switch: Crea Stanza (Host) vs Entra con Codice (Client)
    const tabCreate = document.getElementById("lupus-p2p-tab-create");
    const tabJoin = document.getElementById("lupus-p2p-tab-join");
    const panelCreate = document.getElementById("lupus-p2p-panel-create");
    const panelJoin = document.getElementById("lupus-p2p-panel-join");

    if (tabCreate && tabJoin && panelCreate && panelJoin) {
      tabCreate.addEventListener("click", () => {
        try { Sound.playClick(); } catch (e) {}
        tabCreate.classList.add("active");
        tabJoin.classList.remove("active");
        panelCreate.style.display = "block";
        panelJoin.style.display = "none";
      });

      tabJoin.addEventListener("click", () => {
        try { Sound.playClick(); } catch (e) {}
        tabJoin.classList.add("active");
        tabCreate.classList.remove("active");
        panelJoin.style.display = "block";
        panelCreate.style.display = "none";
      });
    }

    // 2. Crea Stanza (Host)
    const btnCreate = document.getElementById("lupus-p2p-btn-create-room");
    if (btnCreate) {
      btnCreate.addEventListener("click", () => this.createRoomAsHost());
    }

    // 3. Entra nella Stanza (Client)
    const btnJoin = document.getElementById("lupus-p2p-btn-join-room");
    if (btnJoin) {
      btnJoin.addEventListener("click", () => this.joinRoomAsClient());
    }

    // Invio con tasto Enter nei campi nome e codice
    const hostNameInput = document.getElementById("lupus-p2p-host-name-input");
    if (hostNameInput) {
      hostNameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.createRoomAsHost();
      });
    }

    const joinCodeInput = document.getElementById("lupus-p2p-join-code-input");
    const joinNameInput = document.getElementById("lupus-p2p-join-name-input");
    if (joinNameInput) {
      joinNameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.joinRoomAsClient();
      });
    }

    // Copia Link / Codice Stanza
    const copyLinkBtn = document.getElementById("lupus-p2p-copy-link-btn");
    if (copyLinkBtn) {
      copyLinkBtn.addEventListener("click", () => this.copyRoomLink());
    }

    // Tasti Torna al Menu Modalità (con delegazione eventi)
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".lupus-btn-back-to-mode-select");
      if (btn && this.app) {
        try { Sound.playClick(); } catch (err) {}
        this.cleanUp();
        this.app.switchView("view-lupus-mode-select");
      }
    });

    // 4. Stepper Lupi nella Lobby P2P
    const wolvesMinus = document.getElementById("lupus-p2p-wolves-minus");
    const wolvesPlus = document.getElementById("lupus-p2p-wolves-plus");
    if (wolvesMinus) wolvesMinus.addEventListener("click", () => this.adjustWolves(-1));
    if (wolvesPlus) wolvesPlus.addEventListener("click", () => this.adjustWolves(1));

    // 5. Stepper Tempo Discussione nella Lobby P2P
    const timeMinus = document.getElementById("lupus-p2p-time-minus");
    const timePlus = document.getElementById("lupus-p2p-time-plus");
    if (timeMinus) timeMinus.addEventListener("click", () => this.adjustTime(-1));
    if (timePlus) timePlus.addEventListener("click", () => this.adjustTime(1));

    // 6. Toggles Ruoli Speciali nella Lobby P2P
    Object.keys(this.enabledRoles).forEach(roleKey => {
      const toggle = document.getElementById(`lupus-p2p-toggle-${roleKey}`);
      if (toggle) {
        toggle.checked = !!this.enabledRoles[roleKey];
        toggle.addEventListener("change", () => {
          this.enabledRoles[roleKey] = toggle.checked;
          try { Sound.playClick(); } catch (e) {}
          this.validateRolesAndSummary();
        });
      }
    });

    // 7. Tasto Distribuisci Ruoli (Host)
    const btnDistribute = document.getElementById("lupus-p2p-btn-distribute-roles");
    if (btnDistribute) {
      btnDistribute.addEventListener("click", () => this.hostDistributeRoles());
    }

    // 8. Tasto Conferma Ruolo (Client): "Ho memorizzato il mio ruolo!"
    const btnConfirmRole = document.getElementById("lupus-p2p-btn-confirm-role");
    if (btnConfirmRole) {
      btnConfirmRole.addEventListener("click", () => this.clientConfirmRole());
    }

    // 9. Hold-to-Reveal per la carta del giocatore
    const holdBtn = document.getElementById("lupus-p2p-hold-reveal-btn");
    const secretCard = document.getElementById("lupus-p2p-secret-revealed-card");

    if (holdBtn) {
      const startHold = (e) => {
        if (e.cancelable && e.type === "touchstart") e.preventDefault();
        this.onHoldStart(false);
      };
      const endHold = () => {
        if (!this.isHolding) return;
        this.onHoldEnd();
      };

      holdBtn.addEventListener("pointerdown", startHold);
      window.addEventListener("pointerup", endHold);
      window.addEventListener("pointercancel", endHold);

      holdBtn.addEventListener("touchstart", startHold, { passive: false });
      window.addEventListener("touchend", endHold);
      window.addEventListener("touchcancel", endHold);

      holdBtn.addEventListener("mousedown", startHold);
      window.addEventListener("mouseup", endHold);

      if (secretCard) {
        secretCard.addEventListener("pointerup", endHold);
        secretCard.addEventListener("touchend", endHold);
        secretCard.addEventListener("mouseup", endHold);
        secretCard.addEventListener("pointercancel", endHold);
        secretCard.addEventListener("touchcancel", endHold);
      }
    }

    // 10. Tasto Rivedi Carta nella schermata "Posa il telefono"
    const btnReviewRole = document.getElementById("lupus-p2p-btn-review-role");
    const reviewModal = document.getElementById("lupus-p2p-review-modal");
    const btnCloseReview = document.getElementById("lupus-p2p-btn-close-review");

    if (btnReviewRole && reviewModal) {
      btnReviewRole.addEventListener("click", () => {
        try { Sound.playClick(); } catch (e) {}
        this.renderReviewCardContent();
        reviewModal.style.display = "flex";
      });
    }

    if (btnCloseReview && reviewModal) {
      btnCloseReview.addEventListener("click", () => {
        try { Sound.playClick(); } catch (e) {}
        reviewModal.style.display = "none";
      });
      reviewModal.addEventListener("click", (e) => {
        if (e.target === reviewModal) reviewModal.style.display = "none";
      });
    }

    // 11. Tasto Host Avvia Guida del Narratore (dal Monitor di conferma)
    const btnStartMasterGuide = document.getElementById("lupus-p2p-btn-start-master-guide");
    if (btnStartMasterGuide) {
      btnStartMasterGuide.addEventListener("click", () => this.hostStartMasterGuide());
    }
  }

  // =========================================================================
  // CREAZIONE E GESTIONE STANZA HOST
  // =========================================================================

  createRoomAsHost() {
    const nameInput = document.getElementById("lupus-p2p-host-name-input");
    const name = (nameInput ? nameInput.value : "").trim() || "Simone";
    this.playerName = name;
    try {
      localStorage.setItem("lupus_p2p_name", name);
    } catch (e) {}

    const statusEl = document.getElementById("lupus-p2p-create-status");
    if (statusEl) statusEl.textContent = "Inizializzazione della stanza WebRTC...";

    try { Sound.playClick(); } catch (e) {}

    this.cleanUp();
    this.isHost = true;

    // Crea gestore stanza P2P riutilizzabile
    this.room = new P2PRoomManager({
      peerPrefix: "lupus-v1-"
    });
    this.room.setPlayerName(this.playerName);

    this.setupRoomEvents();
    this.room.createRoom();
  }

  setupRoomEvents() {
    if (!this.room) return;

    // Stanza creata con successo (Host)
    this.room.on("room_created", (data) => {
      this.roomCode = data.roomCode;
      this.players = data.players || [];
      console.log(`[Lupus P2P] Stanza creata: ${this.roomCode}`);

      this.app.switchView("view-lupus-p2p-lobby");
      this.renderLobbyUI();
    });

    // Unione alla stanza avvenuta con successo (Client)
    this.room.on("room_joined", (data) => {
      this.roomCode = data.roomCode;
      this.players = data.players || [];
      console.log(`[Lupus P2P] Connesso alla stanza: ${this.roomCode}`);

      this.app.switchView("view-lupus-p2p-lobby");
      this.renderLobbyUI();
    });

    // Giocatore entrato nella stanza
    this.room.on("player_joined", (data) => {
      this.players = data.players || [];
      try { Sound.playPlayerJoin(); } catch (e) {}
      this.renderLobbyUI();
      if (this.isHost) this.validateRolesAndSummary();
    });

    // Aggiornamento elenco giocatori
    this.room.on("players_update", (data) => {
      this.players = data.players || [];
      this.renderLobbyUI();
      if (this.isHost) {
        this.validateRolesAndSummary();
        this.updateMasterMonitorUI();
        this.syncPlayerConnectionStatusToGame();
      }
    });

    // Giocatore disconnesso
    this.room.on("player_left", (data) => {
      this.players = data.players || [];
      console.log(`[Lupus P2P] Giocatore disconnesso/offline: ${data.player ? data.player.name : ''}`);
      this.renderLobbyUI();
      if (this.isHost) {
        this.validateRolesAndSummary();
        this.updateMasterMonitorUI();
        this.syncPlayerConnectionStatusToGame();
      }
    });

    // Giocatore riconnesso
    this.room.on("player_reconnected", (data) => {
      this.players = this.room.players || [];
      console.log(`[Lupus P2P] Giocatore riconnesso: ${data.player ? data.player.name : ''}`);
      this.renderLobbyUI();
      if (this.isHost) {
        this.validateRolesAndSummary();
        this.updateMasterMonitorUI();
        this.syncPlayerConnectionStatusToGame();

        // Se la partita è già iniziata, reinvia la carta privata al giocatore riconnesso
        if (this.assignments && this.assignments.length > 0) {
          const assign = this.assignments.find(a => a.playerId === data.player.playerId || a.name === data.player.name);
          if (assign && data.player.id) {
            this.room.sendTo(data.player.id, {
              type: "LUPUS_ROLE_ASSIGNMENT",
              roleData: {
                roleKey: assign.roleKey,
                role: assign.role,
                allies: assign.allies || []
              }
            });
          }
        }
      }
    });

    // Giocatore rimosso / espulso dal Master
    this.room.on("kicked", (data) => {
      alert(data && data.reason ? data.reason : "Sei stato rimosso dalla stanza dal Master.");
      this.cleanUp();
      this.app.switchView("view-lupus-mode-select");
    });

    // Messaggi di gioco P2P
    this.room.on("message", (msg) => {
      this.handleIncomingP2PMessage(msg);
    });

    // Errori WebRTC
    this.room.on("error", (errText) => {
      console.warn("[Lupus P2P] Errore di rete:", errText);
      const statusEl = document.getElementById("lupus-p2p-create-status") || document.getElementById("lupus-p2p-join-status");
      if (statusEl) statusEl.textContent = `Errore: ${errText}`;
    });
  }

  // =========================================================================
  // UNIONE ALLA STANZA CLIENT
  // =========================================================================

  joinRoomAsClient(presetCode = null) {
    const codeInput = document.getElementById("lupus-p2p-join-code-input");
    const nameInput = document.getElementById("lupus-p2p-join-name-input");
    const code = (presetCode || (codeInput ? codeInput.value : "")).trim().toUpperCase();

    const defaultJoinNames = [
      "Matteo", "Alessandra", "Giorgia", "Davide", "Leonardo",
      "Pietro", "Cristian", "Francesca", "Daniele", "Riccardo", "Jacopo", "Noemi", "Francesco"
    ];
    let fallbackName = defaultJoinNames[0];
    if (this.players && this.players.length > 0) {
      const unused = defaultJoinNames.find(n => !this.players.some(p => (p.name || "").toLowerCase() === n.toLowerCase()));
      if (unused) fallbackName = unused;
    }
    const name = (nameInput ? nameInput.value : "").trim() || fallbackName;

    if (!code || code.length < 3) {
      alert("Inserisci un codice stanza valido (4 lettere)!");
      return;
    }

    this.playerName = name;
    this.roomCode = code;
    try {
      localStorage.setItem("lupus_p2p_name", name);
    } catch (e) {}

    const statusEl = document.getElementById("lupus-p2p-join-status");
    if (statusEl) statusEl.textContent = "Connessione alla stanza del Villaggio...";

    try { Sound.playClick(); } catch (e) {}

    this.cleanUp();
    this.isHost = false;

    this.room = new P2PRoomManager({
      peerPrefix: "lupus-v1-"
    });
    this.room.setPlayerName(this.playerName);

    this.setupRoomEvents();
    this.room.joinRoom(this.roomCode, this.playerName);
  }

  // =========================================================================
  // GESTIONE MESSAGGI DI GIOCO P2P
  // =========================================================================

  handleIncomingP2PMessage(msg) {
    if (!msg || !msg.type) return;

    // 1. Il Client riceve la propria carta ruolo dal Master
    if (msg.type === "LUPUS_ROLE_ASSIGNMENT") {
      this.myRoleData = msg.data.roleData;
      this.hasConfirmedRole = false;
      this.prepareRoleRevealScreen();
      this.app.switchView("view-lupus-p2p-role");
    }

    // 2. L'Host riceve la conferma che un giocatore ha visto e memorizzato la carta
    else if (msg.type === "LUPUS_ROLE_CONFIRMED") {
      const senderPlayerId = msg.senderPlayerId || (msg.data && msg.data.playerId);
      if (senderPlayerId) {
        this.confirmedPlayers.add(senderPlayerId);
        try { Sound.playClick(); } catch (e) {}
        this.updateMasterMonitorUI();
      }
    }

    // 3. Notifica di preparazione nuova partita / rematch (Client)
    else if (msg.type === "LUPUS_REMATCH_PREPARE") {
      console.log("[Lupus P2P Client] Nuova partita in preparazione dal Master...");
      this.myRoleData = null;
      this.hasConfirmedRole = false;
      const reviewModal = document.getElementById("lupus-p2p-review-modal");
      if (reviewModal) reviewModal.style.display = "none";
      this.app.switchView("view-lupus-p2p-lobby");
      const waitTitle = document.getElementById("lupus-p2p-client-waiting-title");
      const waitDesc = document.getElementById("lupus-p2p-client-waiting-desc");
      if (waitTitle) waitTitle.textContent = "🔄 Nuova Partita in Arrivo!";
      if (waitDesc) waitDesc.textContent = "Il Master sta preparando i nuovi ruoli. Tieni lo schermo acceso e la connessione attiva per ricevere la nuova carta!";
    }

    // 4. Notifica di avvio partita o sincronizzazione
    else if (msg.type === "LUPUS_GAME_STARTED") {
      console.log("[Lupus P2P] Partita avviata dal Narratore.");
    }
  }

  // =========================================================================
  // RENDERING LOBBY P2P
  // =========================================================================

  renderLobbyUI() {
    const codeDisplay = document.getElementById("lupus-p2p-lobby-code-display");
    if (codeDisplay) codeDisplay.textContent = this.roomCode || "----";

    const countEl = document.getElementById("lupus-p2p-players-count");
    if (countEl) countEl.textContent = this.players.length;

    // Render QR Code (visibile per tutti, ma fondamentale per l'Host)
    this.renderQRCode();

    // Visualizza URL della stanza
    const urlDisplayBox = document.getElementById("lupus-p2p-url-display-box");
    const urlText = document.getElementById("lupus-p2p-room-url-text");
    const roomUrl = this.getRoomDirectUrl();
    if (urlDisplayBox && urlText) {
      urlText.textContent = roomUrl;
      urlDisplayBox.style.display = "flex";
    }

    // Lista dei giocatori connessi in tempo reale
    const listEl = document.getElementById("lupus-p2p-lobby-players-list");
    if (listEl) {
      listEl.replaceChildren();
      this.players.forEach(p => {
        const card = document.createElement("div");
        card.className = `lobby-player-card ${p.online === false ? 'is-offline' : ''}`;
        const isOnline = p.online !== false;

        const infoDiv = document.createElement("div");
        infoDiv.className = "lobby-player-info";

        const iconSpan = document.createElement("span");
        iconSpan.style.fontSize = "1.2rem";
        iconSpan.textContent = "👤";

        const nameDiv = document.createElement("div");
        nameDiv.className = "lobby-player-name";
        nameDiv.textContent = p.name;

        infoDiv.append(iconSpan, nameDiv);
        if (p.isHost) {
          const hostBadge = document.createElement("span");
          hostBadge.className = "lobby-player-host-badge";
          hostBadge.textContent = "👑 Master";
          infoDiv.appendChild(hostBadge);
        }

        const actionsDiv = document.createElement("div");
        actionsDiv.style.display = "flex";
        actionsDiv.style.alignItems = "center";
        actionsDiv.style.gap = "8px";

        const connPill = document.createElement("span");
        connPill.className = `conn-pill ${isOnline ? 'online' : 'offline'}`;
        connPill.textContent = isOnline ? "🟢 Connesso" : "⚪ Disconnesso";
        actionsDiv.appendChild(connPill);

        if (this.isHost && !p.isHost) {
          const kickBtn = document.createElement("button");
          kickBtn.type = "button";
          kickBtn.className = "btn-kick-player";
          kickBtn.title = `Rimuovi ${p.name} dalla stanza`;
          kickBtn.textContent = "❌";
          kickBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.hostRemovePlayer(p.playerId || p.id, p.name);
          });
          actionsDiv.appendChild(kickBtn);
        }

        card.append(infoDiv, actionsDiv);
        listEl.appendChild(card);
      });
    }

    // Mostra/Nascondi controlli specifici Host vs Client
    const hostControls = document.getElementById("lupus-p2p-host-controls-panel");
    const clientWaiting = document.getElementById("lupus-p2p-client-waiting-panel");

    if (this.isHost) {
      if (hostControls) hostControls.style.display = "block";
      if (clientWaiting) clientWaiting.style.display = "none";
      this.validateRolesAndSummary();
    } else {
      if (hostControls) hostControls.style.display = "none";
      if (clientWaiting) clientWaiting.style.display = "block";
    }
  }

  renderQRCode() {
    const qrContainer = document.getElementById("lupus-p2p-qrcode-container");
    if (!qrContainer) return;
    qrContainer.replaceChildren();

    const roomUrl = this.getRoomDirectUrl();
    if (typeof QRCode !== "undefined") {
      try {
        new QRCode(qrContainer, {
          text: roomUrl,
          width: 160,
          height: 160,
          colorDark: "#06070a",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch (err) {
        console.warn("[Lupus P2P] Errore generazione QR:", err);
      }
    }
  }

  getRoomDirectUrl() {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?room=${this.roomCode}`;
  }

  copyRoomLink() {
    const url = this.getRoomDirectUrl();
    const btn = document.getElementById("lupus-p2p-copy-link-btn");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        try { Sound.playClick(); } catch (e) {}
        if (btn) {
          btn.textContent = "✅ Link Copiato!";
          setTimeout(() => { btn.textContent = "📋 Copia Link"; }, 2000);
        }
      }).catch(() => {
        this.fallbackCopyText(url, btn);
      });
    } else {
      this.fallbackCopyText(url, btn);
    }
  }

  fallbackCopyText(text, btn) {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      if (btn) {
        btn.textContent = "✅ Copiato!";
        setTimeout(() => { btn.textContent = "📋 Copia Link"; }, 2000);
      }
    } catch (e) {
      alert(`Copia questo link: ${text}`);
    }
    document.body.removeChild(ta);
  }

  // =========================================================================
  // SETUP CONFIGURAZIONE RUOLI NELLA LOBBY
  // =========================================================================

  adjustWolves(delta) {
    try { Sound.playClick(); } catch (e) {}
    const totalPlayers = this.getEffectivePlayerCount();
    const maxWolves = Math.max(1, Math.floor((totalPlayers || 6) / 2));
    this.wolvesCount = Math.max(1, Math.min(maxWolves, this.wolvesCount + delta));

    const wolvesDisplay = document.getElementById("lupus-p2p-wolves-value");
    if (wolvesDisplay) wolvesDisplay.textContent = this.wolvesCount;

    this.validateRolesAndSummary();
  }

  adjustTime(delta) {
    try { Sound.playClick(); } catch (e) {}
    this.discussionMinutes = Math.max(1, Math.min(10, this.discussionMinutes + delta));
    try {
      localStorage.setItem("lupus_discussion_minutes", this.discussionMinutes);
    } catch (e) {}

    const timeDisplay = document.getElementById("lupus-p2p-time-value");
    if (timeDisplay) timeDisplay.textContent = `${this.discussionMinutes} min`;
  }

  getEffectivePlayerCount() {
    return this.players.filter(p => !p.isHost).length;
  }

  getEffectivePlayers() {
    return this.players.filter(p => !p.isHost);
  }

  validateRolesAndSummary() {
    const summaryBox = document.getElementById("lupus-p2p-roles-summary");
    const startBtn = document.getElementById("lupus-p2p-btn-distribute-roles");
    const wolvesDisplay = document.getElementById("lupus-p2p-wolves-value");
    const rematchBanner = document.getElementById("lupus-p2p-rematch-banner");

    const effectivePlayers = this.getEffectivePlayers();
    const totalCount = effectivePlayers.length;
    const disconnectedPlayers = effectivePlayers.filter(p => p.online === false);
    const hasDisconnected = disconnectedPlayers.length > 0;

    // Gestione Banner Rematch & Riconnessione
    if (rematchBanner) {
      if (hasDisconnected) {
        rematchBanner.style.display = "flex";
        rematchBanner.className = "lupus-rematch-banner warning";

        const titleDiv = document.createElement("div");
        titleDiv.className = "lupus-rematch-banner-title";
        titleDiv.textContent = `⚠️ Giocatori Disconnessi (${disconnectedPlayers.length})`;

        const descDiv = document.createElement("div");
        descDiv.textContent = "Tutti i giocatori devono essere connessi prima di poter distribuire o riassegnare i ruoli!";

        const chipsDiv = document.createElement("div");
        chipsDiv.style.display = "flex";
        chipsDiv.style.flexWrap = "wrap";
        chipsDiv.style.gap = "6px";
        chipsDiv.style.margin = "6px 0";
        disconnectedPlayers.forEach(p => {
          const chip = document.createElement("span");
          chip.style.display = "inline-flex";
          chip.style.alignItems = "center";
          chip.style.gap = "4px";
          chip.style.padding = "2px 8px";
          chip.style.borderRadius = "4px";
          chip.style.fontSize = "0.8rem";
          chip.style.background = "rgba(239,68,68,0.2)";
          chip.style.border = "1px solid rgba(239,68,68,0.4)";
          chip.style.color = "#fca5a5";
          chip.textContent = `⚪ ${p.name} (Disconnesso)`;
          chipsDiv.appendChild(chip);
        });

        const guideDiv = document.createElement("div");
        guideDiv.style.fontSize = "0.82rem";
        guideDiv.style.color = "var(--df-text-ash)";
        guideDiv.style.marginTop = "4px";
        guideDiv.append(document.createTextNode("💡 Opzioni per il Master:"));

        const ul = document.createElement("ul");
        ul.style.margin = "4px 0 0 16px";
        ul.style.padding = "0";

        const li1 = document.createElement("li");
        const st1 = document.createElement("strong");
        st1.textContent = "Attendi: ";
        li1.append(st1, document.createTextNode("chiedi ai giocatori di sbloccare il proprio telefono o ricaricare la pagina."));

        const li2 = document.createElement("li");
        const st2 = document.createElement("strong");
        st2.textContent = "Rimuovi: ";
        const stX = document.createElement("strong");
        stX.textContent = "❌";
        li2.append(st2, document.createTextNode("se un giocatore non gioca più, usa "), stX, document.createTextNode(" nella lista in alto per eliminarlo dalla stanza."));

        const li3 = document.createElement("li");
        const st3 = document.createElement("strong");
        st3.textContent = "Oppure: ";
        const emQuit = document.createElement("em");
        emQuit.textContent = '"Esci dalla Stanza"';
        li3.append(st3, document.createTextNode("clicca in basso "), emQuit, document.createTextNode(" per tornare al menu principale."));

        ul.append(li1, li2, li3);
        guideDiv.appendChild(ul);

        rematchBanner.replaceChildren(titleDiv, descDiv, chipsDiv, guideDiv);
      } else if (this.isRematchMode) {
        rematchBanner.style.display = "flex";
        rematchBanner.className = "lupus-rematch-banner success";

        const titleDiv = document.createElement("div");
        titleDiv.className = "lupus-rematch-banner-title";
        titleDiv.textContent = "🟢 Tutti i giocatori sono connessi!";

        const descDiv = document.createElement("div");
        descDiv.style.fontSize = "0.86rem";
        descDiv.textContent = `Tutti gli abitanti del villaggio (${totalCount}) sono online e pronti a ricevere la nuova carta ruolo.`;

        rematchBanner.replaceChildren(titleDiv, descDiv);
      } else {
        rematchBanner.style.display = "none";
        rematchBanner.replaceChildren();
      }
    }

    // Aggiorna stepper lupi max
    const maxWolves = Math.max(1, Math.floor(Math.max(4, totalCount) / 2));
    if (this.wolvesCount > maxWolves) this.wolvesCount = maxWolves;
    if (wolvesDisplay) wolvesDisplay.textContent = this.wolvesCount;

    // Calcola figure speciali attive
    let specialWolves = 0;
    if (this.enabledRoles.lupo_stregone) specialWolves++;
    if (this.enabledRoles.cane_nero) specialWolves++;
    if (this.enabledRoles.infiltrato) specialWolves++;
    if (this.enabledRoles.lupo_bianco) specialWolves++;

    let specialVillageAndSolo = 0;
    if (this.enabledRoles.veggente) specialVillageAndSolo++;
    if (this.enabledRoles.guardia) specialVillageAndSolo++;
    if (this.enabledRoles.strega) specialVillageAndSolo++;
    if (this.enabledRoles.cupido) specialVillageAndSolo++;
    if (this.enabledRoles.donna) specialVillageAndSolo++;
    if (this.enabledRoles.beccamorto) specialVillageAndSolo++;
    if (this.enabledRoles.idiota) specialVillageAndSolo++;
    if (this.enabledRoles.necromante) specialVillageAndSolo++;
    if (this.enabledRoles.giullare) specialVillageAndSolo++;

    // Totale figure uniche e contadini
    const totalWolves = Math.max(this.wolvesCount, specialWolves);
    const normalWolves = Math.max(0, totalWolves - specialWolves);
    const totalFixed = totalWolves + specialVillageAndSolo;
    const villagersCount = Math.max(0, totalCount - totalFixed);

    const isValid = totalCount >= 4 && totalFixed <= totalCount && !hasDisconnected;

    if (summaryBox) {
      if (hasDisconnected) {
        summaryBox.className = "lupus-summary-box warning";
        const title = document.createElement("div");
        title.style.fontWeight = "700";
        title.style.color = "#f0caca";
        title.textContent = `⚠️ Impossibile distribuire: ${disconnectedPlayers.length} giocatore/i disconnesso/i`;

        const sub = document.createElement("div");
        sub.style.fontSize = "0.85rem";
        sub.style.color = "var(--df-text-ash)";
        sub.style.marginTop = "4px";
        sub.textContent = "Attendi che tutti i giocatori si riconnettano per ricevere il proprio ruolo segreto sul telefono.";

        summaryBox.replaceChildren(title, sub);
      } else if (totalCount < 4) {
        summaryBox.className = "lupus-summary-box warning";
        const title = document.createElement("div");
        title.style.fontWeight = "700";
        title.style.color = "#f0caca";
        title.textContent = "⚠️ Servono almeno 4 giocatori per giocare a Lupus in Fabula!";

        const sub = document.createElement("div");
        sub.style.fontSize = "0.85rem";
        sub.style.color = "var(--df-text-ash)";
        sub.style.marginTop = "4px";

        const strong = document.createElement("strong");
        strong.textContent = totalCount;

        sub.append(
          document.createTextNode("Attualmente connessi: "),
          strong,
          document.createTextNode(" giocatori. Condividi il PIN o il QR code per invitare amici.")
        );
        summaryBox.replaceChildren(title, sub);
      } else if (totalFixed > totalCount) {
        summaryBox.className = "lupus-summary-box danger";
        const title = document.createElement("div");
        title.style.fontWeight = "700";
        title.style.color = "#f0caca";
        title.textContent = `⚠️ Troppe figure speciali per ${totalCount} giocatori!`;

        const sub = document.createElement("div");
        sub.style.fontSize = "0.85rem";
        sub.style.color = "var(--df-text-ash)";
        sub.style.marginTop = "4px";
        sub.textContent = `Figure selezionate: ${totalFixed}. Riduci le figure o attendi altri partecipanti.`;

        summaryBox.replaceChildren(title, sub);
      } else {
        summaryBox.className = "lupus-summary-box success";
        const title = document.createElement("div");
        title.style.fontWeight = "700";
        title.style.color = "#dfbaa6";
        title.style.marginBottom = "6px";
        title.textContent = `Composizione Villaggio (${totalCount} Abitanti):`;

        const chipsWrap = document.createElement("div");
        chipsWrap.style.display = "flex";
        chipsWrap.style.flexWrap = "wrap";
        chipsWrap.style.gap = "8px";
        chipsWrap.style.fontSize = "0.84rem";

        const wolfChip = document.createElement("span");
        wolfChip.className = "lupus-summary-chip chip-wolf";
        wolfChip.textContent = `🐺 ${totalWolves} Lupi (${normalWolves} base + ${specialWolves} spec.)`;

        const specChip = document.createElement("span");
        specChip.className = "lupus-summary-chip chip-special";
        specChip.textContent = `✨ ${specialVillageAndSolo} Figure Speciali`;

        const vilChip = document.createElement("span");
        vilChip.className = "lupus-summary-chip chip-villager";
        vilChip.textContent = `🌾 ${villagersCount} Contadini`;

        chipsWrap.append(wolfChip, specChip, vilChip);
        summaryBox.replaceChildren(title, chipsWrap);
      }
    }

    if (startBtn) {
      startBtn.disabled = !isValid;
      if (hasDisconnected) {
        const connectedCount = totalCount - disconnectedPlayers.length;
        startBtn.textContent = `⏳ In attesa che tutti si riconnettano (${connectedCount}/${totalCount})...`;
      } else if (totalCount < 4) {
        startBtn.textContent = `⏳ In attesa di partecipanti (${totalCount}/4)...`;
      } else if (totalFixed > totalCount) {
        startBtn.textContent = "⚠️ Riduci Ruoli Speciali";
      } else {
        startBtn.textContent = "🎴 Distribuisci Ruoli ai Giocatori";
      }
    }
  }

  // =========================================================================
  // DISTRIBUZIONE DEI RUOLI AI DISPOSITIVI DEI PARTECIPANTI
  // =========================================================================

  hostDistributeRoles() {
    if (!this.isHost) return;

    const effectivePlayers = this.getEffectivePlayers();
    const disconnected = effectivePlayers.filter(p => p.online === false);
    if (disconnected.length > 0) {
      alert(`Impossibile distribuire i ruoli: i seguenti partecipanti risultano disconnessi:\n${disconnected.map(p => '• ' + p.name).join('\n')}\n\nAttendi che si riconnettano o rimuovili dalla stanza con ❌.`);
      return;
    }

    const total = effectivePlayers.length;
    if (total < 4) {
      alert("Servono almeno 4 giocatori!");
      return;
    }

    try { Sound.playClick(); } catch (e) {}

    // Costruisci il mazzo ruoli
    const wolves = this.wolvesCount;
    const roleDeck = [];

    let specialWolvesCount = 0;
    if (this.enabledRoles.lupo_stregone) { roleDeck.push("lupo_stregone"); specialWolvesCount++; }
    if (this.enabledRoles.cane_nero) { roleDeck.push("cane_nero"); specialWolvesCount++; }
    if (this.enabledRoles.infiltrato) { roleDeck.push("infiltrato"); specialWolvesCount++; }
    if (this.enabledRoles.lupo_bianco) { roleDeck.push("lupo_bianco"); specialWolvesCount++; }

    const normalWolves = Math.max(0, wolves - specialWolvesCount);
    for (let i = 0; i < normalWolves; i++) {
      roleDeck.push("lupo");
    }

    if (this.enabledRoles.veggente) roleDeck.push("veggente");
    if (this.enabledRoles.guardia) roleDeck.push("guardia");
    if (this.enabledRoles.strega) roleDeck.push("strega");
    if (this.enabledRoles.cupido) roleDeck.push("cupido");
    if (this.enabledRoles.donna) roleDeck.push("donna");
    if (this.enabledRoles.beccamorto) roleDeck.push("beccamorto");
    if (this.enabledRoles.idiota) roleDeck.push("idiota");
    if (this.enabledRoles.necromante) roleDeck.push("necromante");
    if (this.enabledRoles.giullare) roleDeck.push("giullare");

    while (roleDeck.length < total) {
      roleDeck.push("contadino");
    }

    // Mescola il mazzo (Fisher-Yates)
    for (let i = roleDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roleDeck[i], roleDeck[j]] = [roleDeck[j], roleDeck[i]];
    }

    const rolesRef = (typeof window !== "undefined" && window.LUPUS_ROLES) ? window.LUPUS_ROLES : LUPUS_ROLES;

    // Assegna i ruoli a ciascun giocatore
    this.assignments = effectivePlayers.map((p, idx) => {
      const roleKey = roleDeck[idx];
      return {
        id: `p_${idx}`,
        playerId: p.playerId || p.id,
        peerId: p.peerId || p.id,
        name: p.name,
        roleKey: roleKey,
        role: rolesRef[roleKey],
        isAlive: true,
        isLover: false,
        isTransformed: false,
        online: p.online !== false,
        isHost: false
      };
    });

    // Identifica tutti i lupi per la lista alleati
    const wolfPlayerNames = this.assignments
      .filter(a => a.role && a.role.faction === "lupi")
      .map(a => a.name);

    // Invia i ruoli segreti a ciascun client via WebRTC
    this.assignments.forEach(assign => {
      const isWolf = assign.role && assign.role.faction === "lupi";
      const allies = isWolf
        ? wolfPlayerNames.filter(name => name !== assign.name)
        : [];

      assign.allies = allies;

      const rolePacket = {
        roleKey: assign.roleKey,
        role: assign.role,
        allies: allies
      };

      // Invio remoto al client
      this.room.sendTo(assign.peerId, {
        type: "LUPUS_ROLE_ASSIGNMENT",
        roleData: rolePacket
      });
    });

    // Resetta conferme e stato rematch
    this.confirmedPlayers.clear();
    this.isRematchMode = false;

    // Salva stato partita per consentire recupero persistente
    try {
      localStorage.setItem("lupus_p2p_active_game", JSON.stringify({
        roomCode: this.roomCode,
        assignments: this.assignments,
        discussionMinutes: this.discussionMinutes,
        enabledRoles: this.enabledRoles,
        timestamp: Date.now()
      }));
    } catch (e) {}

    // L'Host passa al monitor delle conferme
    this.app.switchView("view-lupus-p2p-master-monitor");
    this.updateMasterMonitorUI();
  }

  // =========================================================================
  // SCHERMATA RUOLO CLIENT & CONFERMA PRESA VISIONE
  // =========================================================================

  renderPlayerRoleCard() {
    if (!this.myRoleData || !this.myRoleData.role) return;

    const data = this.myRoleData;
    const role = data.role;

    const factionBadge = document.getElementById("lupus-p2p-role-faction");
    const roleTitle = document.getElementById("lupus-p2p-role-title");
    const roleDesc = document.getElementById("lupus-p2p-role-desc");
    const roleImg = document.getElementById("lupus-p2p-role-img");
    const alliesBox = document.getElementById("lupus-p2p-role-allies-box");
    const alliesList = document.getElementById("lupus-p2p-role-allies-list");

    if (factionBadge) {
      factionBadge.textContent = role.faction === "lupi"
        ? "Branco dei Lupi 🐺"
        : (role.faction === "villaggio" ? "Villaggio 🏛️" : "Fazione Solitaria 🃏");
      factionBadge.className = `lupus-faction-badge faction-${role.faction}`;
    }

    if (roleTitle) roleTitle.textContent = `${role.name} ${role.icon}`;
    if (roleDesc) roleDesc.textContent = role.description;

    if (roleImg) {
      roleImg.src = role.image || `img/${data.roleKey}.webp`;
      roleImg.alt = role.name;
    }

    if (alliesBox && alliesList) {
      if (data.allies && data.allies.length > 0) {
        alliesBox.style.display = "block";
        alliesList.replaceChildren();
        data.allies.forEach(a => {
          const chip = document.createElement("span");
          chip.className = "lupus-ally-chip";
          chip.textContent = `🐺 ${a}`;
          alliesList.appendChild(chip);
        });
      } else {
        alliesBox.style.display = "none";
        alliesList.replaceChildren();
      }
    }

    // Mostra il pulsante di conferma ruolo
    const confirmBtn = document.getElementById("lupus-p2p-btn-confirm-role");
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "✅ Ho memorizzato il mio ruolo!";
    }
  }

  prepareRoleRevealScreen() {
    this.isHolding = false;
    if (this.holdProgressInterval) {
      clearInterval(this.holdProgressInterval);
      this.holdProgressInterval = null;
    }

    const holdBtn = document.getElementById("lupus-p2p-hold-reveal-btn");
    const progressBar = document.getElementById("lupus-p2p-hold-progress-bar");
    const confirmContainer = document.getElementById("lupus-p2p-confirm-btn-container");
    const secretCard = document.getElementById("lupus-p2p-secret-revealed-card");

    if (holdBtn) {
      holdBtn.style.display = "flex";
      holdBtn.classList.remove("holding");
    }
    if (progressBar) progressBar.style.width = "0%";
    if (confirmContainer) confirmContainer.style.display = "none";
    if (secretCard) secretCard.style.display = "none";
    document.body.style.overflow = "";

    this.renderPlayerRoleCard();
  }

  onHoldStart() {
    if (this.isHolding || !this.myRoleData) return;
    this.isHolding = true;
    this.holdStartTime = Date.now();

    const holdBtn = document.getElementById("lupus-p2p-hold-reveal-btn");
    const progressBar = document.getElementById("lupus-p2p-hold-progress-bar");
    if (holdBtn) holdBtn.classList.add("holding");

    try { Sound.playHoldTick(); } catch (e) {}

    clearInterval(this.holdProgressInterval);
    this.holdProgressInterval = setInterval(() => {
      if (!this.isHolding) return;
      const elapsed = Date.now() - this.holdStartTime;
      const pct = Math.min(100, Math.round((elapsed / this.holdRequiredMs) * 100));
      if (progressBar) progressBar.style.width = `${pct}%`;

      if (elapsed >= this.holdRequiredMs) {
        clearInterval(this.holdProgressInterval);
        this.revealCardContent();
      }
    }, 25);
  }

  revealCardContent() {
    if (!this.myRoleData) return;
    this.renderPlayerRoleCard();
    const modal = document.getElementById("lupus-p2p-secret-revealed-card");
    if (modal) {
      modal.style.display = "flex";
      document.body.style.overflow = "hidden";
    }
  }

  onHoldEnd() {
    if (!this.isHolding) return;
    this.isHolding = false;
    clearInterval(this.holdProgressInterval);

    const holdBtn = document.getElementById("lupus-p2p-hold-reveal-btn");
    const progressBar = document.getElementById("lupus-p2p-hold-progress-bar");
    const modal = document.getElementById("lupus-p2p-secret-revealed-card");
    const confirmContainer = document.getElementById("lupus-p2p-confirm-btn-container");

    if (holdBtn) holdBtn.classList.remove("holding");
    if (progressBar) progressBar.style.width = "0%";
    document.body.style.overflow = "";

    if (modal && modal.style.display !== "none") {
      modal.style.display = "none";
      if (confirmContainer) {
        confirmContainer.style.display = "block";
      }
    }
  }

  renderReviewCardContent() {
    if (!this.myRoleData || !this.myRoleData.role) return;
    const data = this.myRoleData;
    const role = data.role;

    const img = document.getElementById("lupus-p2p-review-img");
    const faction = document.getElementById("lupus-p2p-review-faction");
    const title = document.getElementById("lupus-p2p-review-title");
    const desc = document.getElementById("lupus-p2p-review-desc");
    const alliesBox = document.getElementById("lupus-p2p-review-allies-box");
    const alliesList = document.getElementById("lupus-p2p-review-allies-list");

    if (img) img.src = role.image || `img/${data.roleKey}.webp`;
    if (faction) {
      faction.textContent = role.faction === "lupi"
        ? "Branco dei Lupi 🐺"
        : (role.faction === "villaggio" ? "Villaggio 🏛️" : "Fazione Solitaria 🃏");
      faction.className = `lupus-faction-badge faction-${role.faction}`;
    }
    if (title) title.textContent = `${role.name} ${role.icon}`;
    if (desc) desc.textContent = role.description;

    if (alliesBox && alliesList) {
      if (data.allies && data.allies.length > 0) {
        alliesBox.style.display = "block";
        alliesList.replaceChildren();
        data.allies.forEach(a => {
          const chip = document.createElement("span");
          chip.className = "lupus-ally-chip";
          chip.textContent = `🐺 ${a}`;
          alliesList.appendChild(chip);
        });
      } else {
        alliesBox.style.display = "none";
        alliesList.replaceChildren();
      }
    }
  }

  clientConfirmRole() {
    try { Sound.playClick(); } catch (e) {}
    this.hasConfirmedRole = true;

    // Invia conferma al Master
    if (this.room) {
      this.room.sendToHost("LUPUS_ROLE_CONFIRMED", {
        playerName: this.playerName
      });
    }

    // Mostra la schermata richiesta: "Adesso posa il telefono ed ascolta le indicazioni del master"
    this.app.switchView("view-lupus-p2p-ready");
  }

  // =========================================================================
  // MONITOR DI CONFERMA HOST
  // =========================================================================

  updateMasterMonitorUI() {
    if (!this.isHost) return;

    const totalCount = this.assignments.length;
    const confirmedCount = this.confirmedPlayers.size;

    const counterEl = document.getElementById("lupus-p2p-seen-counter");
    if (counterEl) counterEl.textContent = `${confirmedCount} / ${totalCount}`;

    const fillEl = document.getElementById("lupus-p2p-seen-progress-fill");
    if (fillEl) {
      const pct = totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 0;
      fillEl.style.width = `${pct}%`;
    }

    // Giocatori mancanti
    const missingAssignments = this.assignments.filter(a => !this.confirmedPlayers.has(a.playerId));
    const missingContainer = document.getElementById("lupus-p2p-seen-missing-container");
    const missingChipsEl = document.getElementById("lupus-p2p-seen-missing-chips");
    const allReadyEl = document.getElementById("lupus-p2p-seen-all-ready");
    const startGuideBtn = document.getElementById("lupus-p2p-btn-start-master-guide");

    const allReady = totalCount > 0 && missingAssignments.length === 0;

    if (allReady) {
      if (missingContainer) missingContainer.style.display = "none";
      if (allReadyEl) allReadyEl.style.display = "block";
      if (startGuideBtn) {
        startGuideBtn.disabled = false;
        startGuideBtn.classList.add("pulse-glow");
        startGuideBtn.textContent = "🐺 Tutti Pronti: Avvia Guida del Narratore";
      }
    } else {
      if (missingContainer) missingContainer.style.display = "flex";
      if (allReadyEl) allReadyEl.style.display = "none";
      if (missingChipsEl) {
        missingChipsEl.replaceChildren();
        missingAssignments.forEach(a => {
          const chip = document.createElement("span");
          chip.className = "missing-chip";
          chip.textContent = a.name;
          missingChipsEl.appendChild(chip);
        });
      }
      if (startGuideBtn) {
        startGuideBtn.disabled = false; // L'host può comunque forzare l'avvio se confermano a voce
        startGuideBtn.classList.remove("pulse-glow");
        const remaining = missingAssignments.length;
        startGuideBtn.textContent = remaining === 1
          ? "⏳ In attesa di 1 giocatore (o avvia ora)"
          : `⏳ In attesa di ${remaining} giocatori (o avvia ora)`;
      }
    }

    // Lista dettagliata con Nome, Stato Connessione e Stato Carta
    const monitorListEl = document.getElementById("lupus-p2p-monitor-players-list");
    if (monitorListEl) {
      monitorListEl.replaceChildren();
      this.assignments.forEach(a => {
        // Sincronizza stato online dal network
        const peerRecord = this.players.find(p => (p.playerId && p.playerId === a.playerId) || p.id === a.peerId);
        if (peerRecord) a.online = peerRecord.online !== false;

        const isConfirmed = this.confirmedPlayers.has(a.playerId);
        const row = document.createElement("div");
        row.className = "monitor-player-row";

        const leftDiv = document.createElement("div");
        leftDiv.className = "monitor-player-left";

        const iconSpan = document.createElement("span");
        iconSpan.style.fontSize = "1.2rem";
        iconSpan.textContent = a.role ? a.role.icon : "👤";

        const textDiv = document.createElement("div");
        const nameDiv = document.createElement("div");
        nameDiv.style.fontWeight = "700";
        nameDiv.style.fontFamily = "var(--df-font-serif)";
        nameDiv.style.fontSize = "0.95rem";
        nameDiv.style.color = "var(--df-text-bone)";
        nameDiv.textContent = a.name;

        const roleDiv = document.createElement("div");
        roleDiv.style.fontSize = "0.78rem";
        roleDiv.style.color = "var(--df-text-ash)";
        roleDiv.textContent = a.role ? a.role.name : "Ruolo Assegnato";

        textDiv.append(nameDiv, roleDiv);
        leftDiv.append(iconSpan, textDiv);

        const rightDiv = document.createElement("div");
        rightDiv.className = "monitor-player-right";

        const connPill = document.createElement("span");
        connPill.className = `conn-pill ${a.online ? 'online' : 'offline'}`;
        connPill.textContent = a.online ? "🟢 Connesso" : "⚪ Disconnesso";

        const seenBadge = document.createElement("span");
        seenBadge.className = `monitor-seen-badge ${isConfirmed ? 'confirmed' : 'waiting'}`;
        seenBadge.textContent = isConfirmed ? "✅ Ruolo Visto" : "⏳ In attesa";

        rightDiv.append(connPill, seenBadge);
        row.append(leftDiv, rightDiv);
        monitorListEl.appendChild(row);
      });
    }
  }

  syncPlayerConnectionStatusToGame() {
    if (!this.assignments || this.assignments.length === 0) return;

    this.assignments.forEach(a => {
      const peerRecord = this.players.find(p => (p.playerId && p.playerId === a.playerId) || p.id === a.peerId);
      if (peerRecord) {
        a.online = peerRecord.online !== false;
      }
    });

    // Se la Guida del Narratore è già attiva, aggiorna il registro visivo
    if (this.app.lupusGame && typeof this.app.lupusGame.renderMasterRoster === "function") {
      this.app.lupusGame.renderMasterRoster();
    }
  }

  // =========================================================================
  // AVVIO DELLA GUIDA DEL NARRATORE (DASHBOARD DEL MASTER)
  // =========================================================================

  hostStartMasterGuide() {
    if (!this.isHost) return;

    try { Sound.playClick(); } catch (e) {}

    // Notifica ai client che la partita ha inizio
    if (this.room) {
      this.room.broadcast({
        type: "LUPUS_GAME_STARTED"
      });
    }

    // Configura il controller del gioco principale (LupusGameController) con i dati P2P
    const game = this.app.lupusGame;
    if (!game) {
      console.error("[Lupus P2P] LupusGameController non trovato.");
      return;
    }

    game.isP2PMode = true;
    game.players = this.assignments.map(a => a.name);
    game.assignments = this.assignments;
    game.wolvesCount = this.wolvesCount;
    game.discussionMinutes = this.discussionMinutes;
    game.discussionSeconds = this.discussionMinutes * 60;
    game.initialDiscussionSeconds = game.discussionSeconds;
    game.enabledRoles = { ...this.enabledRoles };

    // Passa alla vista Narratore
    this.app.switchView("view-lupus-master");
    game.initMasterDashboard();
  }

  // =========================================================================
  // GESTIONE NUOVA PARTITA (REMATCH) E RIMOZIONE GIOCATORI
  // =========================================================================

  hostRemovePlayer(playerId, playerName) {
    if (!this.isHost) return;

    const confirmed = confirm(`Vuoi rimuovere "${playerName || 'questo giocatore'}" dalla stanza?`);
    if (!confirmed) return;

    if (this.room && typeof this.room.removePlayer === "function") {
      this.room.removePlayer(playerId);
    } else {
      this.players = this.players.filter(p => (p.playerId !== playerId && p.id !== playerId));
    }

    if (this.assignments && this.assignments.length > 0) {
      this.assignments = this.assignments.filter(a => (a.playerId !== playerId && a.peerId !== playerId));
    }

    try { Sound.playClick(); } catch (e) {}
    this.renderLobbyUI();
    this.validateRolesAndSummary();
  }

  hostPrepareRematch() {
    if (!this.isHost) return;

    this.isRematchMode = true;
    this.confirmedPlayers.clear();
    this.myRoleData = null;
    this.hasConfirmedRole = false;
    this.assignments = [];

    // Arresta timer e resetta controller Narratore se attivo
    const game = this.app.lupusGame;
    if (game) {
      if (game.timerInterval) {
        clearInterval(game.timerInterval);
        game.timerInterval = null;
      }
      game.isTimerRunning = false;
      game.phase = "setup";
    }

    try { Sound.playClick(); } catch (e) {}

    // Notifica a tutti i client di tornare alla lobby per nuova partita
    if (this.room) {
      this.room.broadcast({
        type: "LUPUS_REMATCH_PREPARE"
      });
    }

    // Torna alla lobby P2P
    this.app.switchView("view-lupus-p2p-lobby");
    this.renderLobbyUI();
    this.validateRolesAndSummary();
  }

  // =========================================================================
  // PULIZIA E DISCONNESSIONE
  // =========================================================================

  cleanUp() {
    if (this.room) {
      try { this.room.cleanUp(); } catch (e) {}
      this.room = null;
    }
    this.isHost = false;
    this.isRematchMode = false;
    this.players = [];
    this.assignments = [];
    this.confirmedPlayers.clear();
    this.myRoleData = null;
    this.hasConfirmedRole = false;

    const rematchBanner = document.getElementById("lupus-p2p-rematch-banner");
    if (rematchBanner) rematchBanner.style.display = "none";
  }
}

// Esporta globalmente
if (typeof window !== "undefined") {
  window.LupusP2PController = LupusP2PController;
}
