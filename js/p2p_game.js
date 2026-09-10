/**
 * Controller Peer-to-Peer (WebRTC tramite PeerJS)
 * Funziona 100% lato client su GitHub Pages senza bisogno di alcun server PC!
 * Uno smartphone o computer fa da Host, gli altri si collegano tramite codice PIN o QR Code.
 */

class P2PGameController {
  constructor() {
    this.peer = null;
    this.isHost = false;
    this.roomCode = "";
    this.peerPrefix = "impostore-v1-";
    
    this.myPeerId = null;
    this.playerName = "";
    try {
      this.playerName = localStorage.getItem("impostore_p2p_name") || "";
    } catch (e) {}

    // Dati per l'Host
    this.connections = new Map(); // peerId -> { name, conn }
    this.players = []; // [{ id, name, isHost }]
    this.impostorCount = 1;
    this.category = "random";
    this.customWord = "";
    this.secretWord = "";
    this.categoryName = "";
    this.assignments = new Map(); // peerId -> { isImpostor, word, category }
    this.selectedVotePlayerId = null;
    this.wordChooserId = null;
    this.wordChooserName = "";
    this.enableClue = false;
    try {
      this.enableClue = localStorage.getItem("impostore_p2p_enable_clue") === "true";
    } catch (e) {}
    this.secretClue = "";
    this.discussionMinutes = 3;
    try {
      const savedMin = parseInt(localStorage.getItem("impostore_p2p_discussion_minutes"), 10);
      if (savedMin >= 1 && savedMin <= 10) this.discussionMinutes = savedMin;
    } catch (e) {}
    this.timerSeconds = this.discussionMinutes * 60;
    this.timerInterval = null;

    // Dati per il Client partecipante
    this.hostConn = null;
    this.mySecret = null;
    this.status = "idle"; // idle, lobby, revealing, discussion, voting, game_over
    this.seenRolePlayerIds = new Set();
    this.hasReportedSeen = false;

    // Identificatore univoco e stabile del giocatore (permette riconnessione trasparente)
    let storedPlayerId = "";
    try {
      storedPlayerId = sessionStorage.getItem("impostore_p2p_player_id");
    } catch (e) {}
    if (!storedPlayerId) {
      storedPlayerId = "p_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now().toString(36);
      try {
        sessionStorage.setItem("impostore_p2p_player_id", storedPlayerId);
      } catch (e) {}
    }
    this.playerId = storedPlayerId;

    // Stato riconnessione automatica
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 8;
    this.reconnectTimer = null;
    this.bannerHideTimer = null;

    // Hold reveal
    this.isHolding = false;
    this.holdStartTime = 0;
    this.holdProgressInterval = null;
    this.holdRequiredMs = 350;

    this.bindEvents();
  }

  showReconnectBanner(text, isSuccess = false, autoHideMs = 0) {
    const banner = document.getElementById("p2p-reconnect-banner");
    const textEl = document.getElementById("p2p-reconnect-text");
    const iconEl = document.getElementById("p2p-reconnect-icon");
    if (!banner || !textEl) return;

    clearTimeout(this.bannerHideTimer);

    textEl.textContent = text;
    banner.className = "reconnect-banner" + (isSuccess ? " success" : (autoHideMs > 0 && !isSuccess ? " error" : ""));
    if (iconEl) {
      iconEl.textContent = isSuccess ? "✅" : (autoHideMs > 0 && !isSuccess ? "❌" : "🔄");
    }
    banner.style.display = "flex";

    if (autoHideMs > 0) {
      this.bannerHideTimer = setTimeout(() => {
        banner.style.display = "none";
      }, autoHideMs);
    }
  }

  hideReconnectBanner() {
    const banner = document.getElementById("p2p-reconnect-banner");
    if (banner) banner.style.display = "none";
    clearTimeout(this.bannerHideTimer);
  }

  generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  bindEvents() {
    // Tab switch: Crea Stanza vs Unisciti
    const tabCreate = document.getElementById("p2p-tab-create");
    const tabJoin = document.getElementById("p2p-tab-join");
    const panelCreate = document.getElementById("p2p-panel-create");
    const panelJoin = document.getElementById("p2p-panel-join");

    if (tabCreate && tabJoin && panelCreate && panelJoin) {
      tabCreate.addEventListener("click", () => {
        Sound.playClick();
        tabCreate.classList.add("active");
        tabJoin.classList.remove("active");
        panelCreate.style.display = "block";
        panelJoin.style.display = "none";
      });

      tabJoin.addEventListener("click", () => {
        Sound.playClick();
        tabJoin.classList.add("active");
        tabCreate.classList.remove("active");
        panelJoin.style.display = "block";
        panelCreate.style.display = "none";
      });
    }

    // Tasto "Crea Stanza da questo Smartphone"
    const btnCreateRoom = document.getElementById("p2p-btn-create-room");
    if (btnCreateRoom) {
      btnCreateRoom.addEventListener("click", () => this.createRoomAsHost());
    }

    // Tasto "Unisciti alla Stanza"
    const btnJoinRoom = document.getElementById("p2p-btn-join-room");
    if (btnJoinRoom) {
      btnJoinRoom.addEventListener("click", () => this.joinRoomAsClient());
    }

    // Invio con tasto Enter sul campo nome (Join ed Host)
    const nameInputJoin = document.getElementById("p2p-join-name-input");
    if (nameInputJoin) {
      nameInputJoin.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.joinRoomAsClient();
      });
    }

    const nameInputHost = document.getElementById("p2p-host-name-input");
    if (nameInputHost) {
      nameInputHost.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.createRoomAsHost();
      });
    }

    // Copia codice / link stanza
    const btnCopyCode = document.getElementById("p2p-copy-link-btn");
    if (btnCopyCode) {
      btnCopyCode.addEventListener("click", () => this.copyRoomLink());
    }

    // Host: Stepper impostori
    const minusBtn = document.getElementById("p2p-imp-minus");
    const plusBtn = document.getElementById("p2p-imp-plus");
    if (minusBtn && plusBtn) {
      minusBtn.addEventListener("click", () => this.adjustImpostorCount(-1));
      plusBtn.addEventListener("click", () => this.adjustImpostorCount(1));
    }

    // Host: Stepper Durata Discussione
    const p2pTimeMinus = document.getElementById("p2p-time-minus");
    const p2pTimePlus = document.getElementById("p2p-time-plus");
    if (p2pTimeMinus && p2pTimePlus) {
      p2pTimeMinus.addEventListener("click", () => this.adjustDiscussionTime(-1));
      p2pTimePlus.addEventListener("click", () => this.adjustDiscussionTime(1));
    }

    // Host: Categoria parole
    const catSelect = document.getElementById("p2p-category-select");
    if (catSelect) {
      catSelect.addEventListener("change", (e) => {
        this.category = e.target.value;
        const customBox = document.getElementById("p2p-custom-word-container");
        const clueGroup = document.getElementById("p2p-clue-toggle-group");
        if (customBox) customBox.style.display = this.category === "custom" ? "block" : "none";
        if (clueGroup) clueGroup.style.display = this.category === "custom" ? "none" : "block";
      });
    }

    // Host: Toggle Indizio Impostore
    const p2pClueToggle = document.getElementById("p2p-clue-toggle");
    if (p2pClueToggle) {
      p2pClueToggle.checked = this.enableClue;
      p2pClueToggle.addEventListener("change", (e) => {
        this.enableClue = e.target.checked;
        Sound.playClick();
        try { localStorage.setItem("impostore_p2p_enable_clue", this.enableClue); } catch (err) {}
      });
    }

    // Conferma Parola Scelta dal giocatore estratto a sorte
    const btnSubmitChosenWord = document.getElementById("p2p-btn-submit-chosen-word");
    if (btnSubmitChosenWord) {
      btnSubmitChosenWord.addEventListener("click", () => this.submitChosenWord());
    }

    const inputChosenWord = document.getElementById("p2p-input-chosen-word");
    if (inputChosenWord) {
      inputChosenWord.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.submitChosenWord();
      });
    }

    // Host: Avvia Partita
    const btnStart = document.getElementById("p2p-host-start-btn");
    if (btnStart) {
      btnStart.addEventListener("click", () => this.hostStartGame());
    }

    // Host: Avvia Discussione
    const btnStartDisc = document.getElementById("p2p-host-start-disc-btn");
    if (btnStartDisc) {
      btnStartDisc.addEventListener("click", () => this.hostStartDiscussion());
    }

    // Host: Apri Voto
    const btnStartVote = document.getElementById("p2p-host-start-vote-btn");
    if (btnStartVote) {
      btnStartVote.addEventListener("click", () => this.hostStartVoting());
    }

    // Host: Conferma Voto
    const btnConfirmVote = document.getElementById("p2p-confirm-vote-btn");
    if (btnConfirmVote) {
      btnConfirmVote.addEventListener("click", () => this.hostExecuteVote());
    }

    // Host: Nuova Partita / Rivincita
    const btnRematch = document.getElementById("p2p-rematch-btn");
    if (btnRematch) {
      btnRematch.addEventListener("click", () => this.hostResetLobby());
    }

    // Hold reveal per P2P
    const holdBtn = document.getElementById("p2p-hold-reveal-btn");
    if (holdBtn) {
      const startHold = (e) => {
        if (e.cancelable) e.preventDefault();
        this.onHoldStart();
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
    }
  }

  initView() {
    Sound.playClick();
    this.renderCategoryOptions();

    // Se salvato un nome, precompila
    const nameInputCreate = document.getElementById("p2p-host-name-input");
    const nameInputJoin = document.getElementById("p2p-join-name-input");
    if (nameInputCreate && this.playerName) nameInputCreate.value = this.playerName;
    if (nameInputJoin && this.playerName) nameInputJoin.value = this.playerName;

    // Controlla se l'URL ha ?room=XXXX (invito diretto da link o QR code)
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get("room");

    const tabContainer = document.getElementById("p2p-tab-container");
    const panelCreate = document.getElementById("p2p-panel-create");
    const panelJoin = document.getElementById("p2p-panel-join");
    const inviteBanner = document.getElementById("p2p-direct-invite-banner");
    const roomCodeText = document.getElementById("p2p-direct-room-code");
    const joinCodeGroup = document.getElementById("p2p-join-code-group");
    const codeInput = document.getElementById("p2p-join-code-input");

    if (roomParam) {
      // BYPASS SELEZIONE: Entra direttamente nella schermata dove inserire il nome!
      const codeUpper = roomParam.trim().toUpperCase();
      this.roomCode = codeUpper;
      if (codeInput) codeInput.value = codeUpper;
      if (roomCodeText) roomCodeText.textContent = codeUpper;

      if (tabContainer) tabContainer.style.display = "none";
      if (panelCreate) panelCreate.style.display = "none";
      if (panelJoin) panelJoin.style.display = "block";
      if (inviteBanner) inviteBanner.style.display = "block";
      if (joinCodeGroup) joinCodeGroup.style.display = "none";

      window.App.switchView("view-p2p-setup");

      setTimeout(() => {
        if (nameInputJoin) {
          nameInputJoin.focus();
          if (nameInputJoin.value) nameInputJoin.select();
        }
      }, 150);
    } else {
      // Apertura normale: mostra le opzioni Crea / Entra
      if (tabContainer) tabContainer.style.display = "flex";
      if (inviteBanner) inviteBanner.style.display = "none";
      if (joinCodeGroup) joinCodeGroup.style.display = "block";

      const tabCreate = document.getElementById("p2p-tab-create");
      if (tabCreate) tabCreate.click();

      window.App.switchView("view-p2p-setup");
    }
  }

  renderCategoryOptions() {
    const select = document.getElementById("p2p-category-select");
    if (!select) return;

    const currentVal = select.value || this.category || "random";
    select.innerHTML = "";
    const cats = getAvailableCategories();
    cats.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      if (c.id === currentVal) opt.selected = true;
      select.appendChild(opt);
    });

    const customOpt = document.createElement("option");
    customOpt.value = "custom";
    customOpt.textContent = "🎲 Parola a Scelta (Segreta da 1 Giocatore)";
    if (currentVal === "custom") customOpt.selected = true;
    select.appendChild(customOpt);

    this.category = select.value;
    const customBox = document.getElementById("p2p-custom-word-container");
    const clueGroup = document.getElementById("p2p-clue-toggle-group");
    if (customBox) customBox.style.display = this.category === "custom" ? "block" : "none";
    if (clueGroup) clueGroup.style.display = this.category === "custom" ? "none" : "block";
  }

  // =========================================================================
  // HOST: Creazione Stanza
  // =========================================================================
  createRoomAsHost() {
    const nameInput = document.getElementById("p2p-host-name-input");
    const name = nameInput ? nameInput.value.trim() : "";
    if (!name) {
      alert("Inserisci il tuo nome!");
      return;
    }

    Sound.playClick();
    this.playerName = name;
    try { localStorage.setItem("impostore_p2p_name", name); } catch (e) {}

    this.isHost = true;
    this.roomCode = this.generateRoomCode();
    const fullPeerId = `${this.peerPrefix}${this.roomCode.toLowerCase()}`;

    const statusEl = document.getElementById("p2p-create-status");
    if (statusEl) statusEl.textContent = "Connessione alla rete P2P in corso...";

    // Distruggi eventuale istanza precedente
    if (this.peer) this.peer.destroy();

    try {
      this.peer = new Peer(fullPeerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });
    } catch (err) {
      alert("Errore inizializzazione WebRTC: " + err.message);
      return;
    }

    this.peer.on("open", (id) => {
      this.myPeerId = id;
      this.players = [{ id: "host", name: this.playerName, isHost: true }];
      this.status = "lobby";

      // Renderizza codice e QR code
      this.renderHostRoomInfo();
      window.App.switchView("view-p2p-lobby");
      this.renderP2PLobbyPlayers();
    });

    this.peer.on("connection", (conn) => {
      conn.on("open", () => {
        conn.on("data", (data) => this.handleHostIncomingData(conn, data));
      });

      conn.on("close", () => {
        this.handlePeerDisconnected(conn.peer);
      });

      conn.on("error", () => {
        this.handlePeerDisconnected(conn.peer);
      });
    });

    this.peer.on("disconnected", () => {
      console.log("Host disconnesso dal broker di segnalazione PeerJS. Tento la riconnessione...");
      if (this.peer && !this.peer.destroyed) {
        this.peer.reconnect();
      }
    });

    this.peer.on("error", (err) => {
      console.warn("PeerJS Host error:", err);
      if (err.type === "unavailable-id") {
        // Se il codice stanza è già occupato, rigenera
        this.roomCode = this.generateRoomCode();
        this.createRoomAsHost();
      } else {
        alert("Errore di connessione: " + err.message);
      }
    });
  }

  async getEffectiveRoomUrl() {
    let origin = window.location.origin;
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      try {
        const res = await fetch("/api/info");
        if (res.ok) {
          const data = await res.json();
          if (data.lan_ip && !data.lan_ip.startsWith("127.")) {
            origin = `http://${data.lan_ip}:${data.port || window.location.port || 8000}`;
          }
        }
      } catch (e) {}
    }
    return `${origin}${window.location.pathname}?room=${this.roomCode}`;
  }

  async renderHostRoomInfo() {
    const codeBadge = document.getElementById("p2p-lobby-code-display");
    if (codeBadge) codeBadge.textContent = this.roomCode;

    const roomUrl = await this.getEffectiveRoomUrl();

    // Mostra URL testuale se presente il container
    const urlBox = document.getElementById("p2p-url-display-box");
    const urlText = document.getElementById("p2p-room-url-text");
    if (urlBox && urlText) {
      urlText.textContent = roomUrl;
      urlBox.style.display = "flex";
    }

    // Genera QR Code con l'URL effettivo (NON localhost)
    const qrContainer = document.getElementById("p2p-qrcode-container");
    if (qrContainer && window.QRCode) {
      qrContainer.innerHTML = "";
      try {
        new window.QRCode(qrContainer, {
          text: roomUrl,
          width: 170,
          height: 170,
          colorDark: "#090d16",
          colorLight: "#ffffff"
        });
      } catch (e) {}
    }

    const hostPanel = document.getElementById("p2p-host-controls-panel");
    const clientWaiting = document.getElementById("p2p-client-waiting-panel");
    const p2pClueToggle = document.getElementById("p2p-clue-toggle");
    if (p2pClueToggle) p2pClueToggle.checked = this.enableClue;
    if (hostPanel) hostPanel.style.display = "block";
    if (clientWaiting) clientWaiting.style.display = "none";
  }

  async copyRoomLink() {
    Sound.playClick();
    const roomUrl = await this.getEffectiveRoomUrl();
    navigator.clipboard.writeText(roomUrl).then(() => {
      const btn = document.getElementById("p2p-copy-link-btn");
      if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = "✅ Link Copiato!";
        setTimeout(() => { btn.innerHTML = orig; }, 2000);
      }
    });
  }

  handleHostIncomingData(conn, data) {
    if (!data || !data.type) return;

    if (data.type === "JOIN") {
      const peerName = (data.name || `Giocatore ${this.players.length + 1}`).trim();
      const playerId = data.playerId || conn.peer;
      this.connections.set(conn.peer, { name: peerName, conn: conn, playerId: playerId });

      // Se la partita è già iniziata e questo giocatore sta provando a rientrare
      const existingPlayer = this.players.find(p => (playerId && p.playerId === playerId) || (peerName && p.name.toLowerCase() === peerName.toLowerCase()));
      if (existingPlayer && this.status !== "lobby") {
        this.handlePlayerReconnect(conn, existingPlayer, playerId);
        return;
      }

      // Se non c'è già nella lista giocatori, aggiungilo
      if (!this.players.some(p => p.id === conn.peer)) {
        this.players.push({ id: conn.peer, playerId: playerId, name: peerName, isHost: false, online: true });
      }

      // Invia conferma e lista giocatori
      conn.send({
        type: "JOIN_SUCCESS",
        roomCode: this.roomCode,
        players: this.players.map(p => ({ id: p.id, name: p.name, isHost: p.isHost, online: p.online !== false }))
      });

      this.broadcast({
        type: "PLAYERS_UPDATE",
        players: this.players.map(p => ({ id: p.id, name: p.name, isHost: p.isHost, online: p.online !== false }))
      });

      this.renderP2PLobbyPlayers();
    } else if (data.type === "RECONNECT") {
      const peerName = (data.name || "").trim();
      const playerId = data.playerId;
      const existingPlayer = this.players.find(p => (playerId && p.playerId === playerId) || (peerName && p.name.toLowerCase() === peerName.toLowerCase()));

      if (existingPlayer) {
        this.handlePlayerReconnect(conn, existingPlayer, playerId);
      } else {
        conn.send({
          type: "JOIN_SUCCESS",
          roomCode: this.roomCode,
          players: this.players.map(p => ({ id: p.id, name: p.name, isHost: p.isHost, online: p.online !== false }))
        });
      }
    } else if (data.type === "ROLE_SEEN") {
      const clientPlayer = this.players.find(p => p.id === conn.peer || (data.playerId && p.playerId === data.playerId));
      if (clientPlayer) {
        this.seenRolePlayerIds.add(clientPlayer.id);
        if (clientPlayer.playerId) this.seenRolePlayerIds.add(clientPlayer.playerId);
      }
      this.seenRolePlayerIds.add(conn.peer);
      this.broadcastSeenStatus();
    } else if (data.type === "CUSTOM_WORD_SUBMITTED") {
      if (this.status === "word_picking" && data.word) {
        this.finalizeWordAndDistributeRoles(data.word, "Parola a Scelta", "");
      }
    }
  }

  handlePlayerReconnect(conn, existingPlayer, playerId) {
    const oldPeerId = existingPlayer.id;
    existingPlayer.id = conn.peer;
    if (playerId) existingPlayer.playerId = playerId;
    existingPlayer.online = true;

    this.connections.set(conn.peer, { name: existingPlayer.name, conn: conn, playerId: existingPlayer.playerId });

    // Se aveva un ruolo assegnato con il vecchio peerId, migralo al nuovo peerId
    let secret = this.assignments.get(oldPeerId) || this.assignments.get(existingPlayer.playerId);
    if (secret) {
      this.assignments.set(conn.peer, secret);
    }

    // Se aveva già visto il ruolo, aggiorna il set dei visti
    if (this.seenRolePlayerIds.has(oldPeerId) || (existingPlayer.playerId && this.seenRolePlayerIds.has(existingPlayer.playerId))) {
      this.seenRolePlayerIds.delete(oldPeerId);
      this.seenRolePlayerIds.add(conn.peer);
      if (existingPlayer.playerId) this.seenRolePlayerIds.add(existingPlayer.playerId);
    }

    console.log(`[Host] Giocatore ${existingPlayer.name} riconnesso con successo.`);

    const missingPlayers = this.players
      .filter(p => !this.seenRolePlayerIds.has(p.id) && !(p.playerId && this.seenRolePlayerIds.has(p.playerId)))
      .map(p => p.name);
    const seenCount = Math.max(0, this.players.length - missingPlayers.length);
    const hasSeenRole = this.seenRolePlayerIds.has(conn.peer) || (existingPlayer.playerId && this.seenRolePlayerIds.has(existingPlayer.playerId));

    // Invia pacchetto completo di sincronizzazione al client per riprendere la partita
    conn.send({
      type: "RECONNECT_SUCCESS",
      roomCode: this.roomCode,
      status: this.status,
      players: this.players.map(p => ({ id: p.id, name: p.name, isHost: p.isHost, online: p.online !== false })),
      starterName: this.starterName,
      categoryName: this.categoryName,
      secret: secret || null,
      seenCount: seenCount,
      totalCount: this.players.length,
      missingPlayers: missingPlayers,
      hasSeenRole: hasSeenRole,
      chooserId: this.wordChooserId
    });

    this.broadcast({
      type: "PLAYERS_UPDATE",
      players: this.players.map(p => ({ id: p.id, name: p.name, isHost: p.isHost, online: p.online !== false }))
    });

    if (this.status === "revealing") {
      this.broadcastSeenStatus();
    }
  }

  handlePeerDisconnected(peerId) {
    this.connections.delete(peerId);

    if (this.status === "lobby") {
      // In lobby rimuoviamo normalmente il giocatore
      this.players = this.players.filter(p => p.id !== peerId);
      this.broadcast({
        type: "PLAYERS_UPDATE",
        players: this.players.map(p => ({ id: p.id, name: p.name, isHost: p.isHost, online: true }))
      });
      this.renderP2PLobbyPlayers();
    } else {
      // PARTITA IN CORSO: Preserva il giocatore e il suo ruolo segreto!
      const player = this.players.find(p => p.id === peerId);
      if (player) {
        player.online = false;
        console.log(`[Host] Giocatore ${player.name} temporaneamente offline. Ruolo preservato in attesa di riconnessione.`);
      }

      // Se il giocatore che stava scegliendo la parola è caduto, estrai un nuovo giocatore online
      if (this.status === "word_picking" && peerId === this.wordChooserId) {
        console.log("Il giocatore che stava scegliendo la parola si è disconnesso. Estraggo un sostituto...");
        const remaining = this.players.filter(p => p.online !== false);
        if (remaining.length >= 3) {
          const newChooser = remaining[Math.floor(Math.random() * remaining.length)];
          this.wordChooserId = newChooser.id;
          this.broadcast({
            type: "START_WORD_PICKING",
            chooserId: this.wordChooserId
          });
          this.renderP2PWordPickScreen(this.wordChooserId === this.myPeerId);
        }
      }
      this.broadcast({
        type: "PLAYERS_UPDATE",
        players: this.players.map(p => ({ id: p.id, name: p.name, isHost: p.isHost, online: p.online !== false }))
      });
    }
  }

  broadcast(message) {
    this.connections.forEach(client => {
      try {
        if (client.conn && client.conn.open) {
          client.conn.send(message);
        }
      } catch (e) {}
    });
  }

  // =========================================================================
  // CLIENT: Connessione a Stanza Esistente
  // =========================================================================
  joinRoomAsClient() {
    const nameInput = document.getElementById("p2p-join-name-input");
    const codeInput = document.getElementById("p2p-join-code-input");

    const name = nameInput ? nameInput.value.trim() : "";
    const code = codeInput ? codeInput.value.trim().toUpperCase() : "";

    if (!name) {
      alert("Inserisci il tuo nome!");
      return;
    }
    if (!code || code.length < 3) {
      alert("Inserisci il codice della stanza valido!");
      return;
    }

    Sound.playClick();
    this.playerName = name;
    this.roomCode = code;
    this.isHost = false;
    try {
      localStorage.setItem("impostore_p2p_name", name);
      sessionStorage.setItem("impostore_p2p_active_room", code);
      sessionStorage.setItem("impostore_p2p_active_name", name);
    } catch (e) {}

    const statusEl = document.getElementById("p2p-join-status");
    if (statusEl) statusEl.textContent = "Connessione all'Host in corso...";

    if (this.peer) this.peer.destroy();

    this.peer = new Peer(null, {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    this.peer.on("open", (id) => {
      this.myPeerId = id;
      const targetHostId = `${this.peerPrefix}${this.roomCode.toLowerCase()}`;
      
      this.hostConn = this.peer.connect(targetHostId, { reliable: true });

      this.hostConn.on("open", () => {
        this.hideReconnectBanner();
        this.hostConn.send({
          type: "JOIN",
          name: this.playerName,
          playerId: this.playerId
        });
      });

      this.hostConn.on("data", (data) => this.handleClientIncomingData(data));

      this.hostConn.on("close", () => {
        this.handleClientConnectionLost();
      });

      this.hostConn.on("error", (err) => {
        console.warn("P2P Client connection error:", err);
        this.handleClientConnectionLost();
      });
    });

    this.peer.on("disconnected", () => {
      console.log("Client disconnesso dal broker di segnalazione. Tento la riconnessione...");
      if (this.peer && !this.peer.destroyed) {
        this.peer.reconnect();
      }
    });

    this.peer.on("error", (err) => {
      console.warn("PeerJS Client error:", err);
      if (this.isReconnecting) {
        const delay = Math.min(1800 + (this.reconnectAttempts * 600), 4500);
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.attemptClientReconnect(), delay);
        return;
      }
      if (statusEl) statusEl.textContent = "Errore: stanza non trovata o Host disconnesso.";
      alert("Impossibile connettersi alla stanza " + this.roomCode + ". Verifica che il codice sia corretto e che l'Host sia attivo.");
    });
  }

  handleClientConnectionLost() {
    if (this.status === "idle") return;
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 8;

    this.showReconnectBanner("⚠️ Connessione persa. Riconnessione in corso... (1/8)");
    this.attemptClientReconnect();
  }

  attemptClientReconnect() {
    if (!this.isReconnecting) return;
    this.reconnectAttempts++;

    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      this.isReconnecting = false;
      this.showReconnectBanner("❌ Riconnessione non riuscita. L'Host potrebbe essersi disconnesso.", false, 4000);
      return;
    }

    this.showReconnectBanner(`⚠️ Connessione persa. Riconnessione in corso... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    try {
      if (this.peer && !this.peer.destroyed) {
        this.peer.destroy();
      }
    } catch (e) {}

    this.peer = new Peer(null, {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    this.peer.on("open", (id) => {
      this.myPeerId = id;
      const targetHostId = `${this.peerPrefix}${this.roomCode.toLowerCase()}`;
      this.hostConn = this.peer.connect(targetHostId, { reliable: true });

      this.hostConn.on("open", () => {
        this.isReconnecting = false;
        this.hostConn.send({
          type: "RECONNECT",
          playerId: this.playerId,
          name: this.playerName
        });
      });

      this.hostConn.on("data", (data) => this.handleClientIncomingData(data));
      this.hostConn.on("close", () => {
        if (!this.isReconnecting) this.handleClientConnectionLost();
      });
      this.hostConn.on("error", () => {
        if (!this.isReconnecting) this.handleClientConnectionLost();
      });
    });

    this.peer.on("error", () => {
      const delay = Math.min(1800 + (this.reconnectAttempts * 600), 4500);
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => this.attemptClientReconnect(), delay);
    });
  }

  handleClientIncomingData(data) {
    if (!data || !data.type) return;

    if (data.type === "JOIN_SUCCESS") {
      this.isReconnecting = false;
      this.hideReconnectBanner();
      this.players = data.players;
      this.status = "lobby";

      const hostPanel = document.getElementById("p2p-host-controls-panel");
      const clientWaiting = document.getElementById("p2p-client-waiting-panel");
      if (hostPanel) hostPanel.style.display = "none";
      if (clientWaiting) clientWaiting.style.display = "block";

      const codeBadge = document.getElementById("p2p-lobby-code-display");
      if (codeBadge) codeBadge.textContent = this.roomCode;

      // Nascondi QR code per i normali giocatori (non serve che lo mostrino)
      const qrBox = document.getElementById("p2p-qr-wrapper");
      if (qrBox) qrBox.style.display = "none";

      window.App.switchView("view-p2p-lobby");
      this.renderP2PLobbyPlayers();
    } else if (data.type === "RECONNECT_SUCCESS") {
      this.isReconnecting = false;
      this.status = data.status;
      this.players = data.players;
      this.starterName = data.starterName;
      if (data.secret) {
        this.mySecret = data.secret;
      }
      if (data.hasSeenRole) {
        this.hasReportedSeen = true;
      }

      this.showReconnectBanner("✅ Riconnesso con successo!", true, 2500);

      // Ripristina la schermata di gioco esatta
      if (this.status === "lobby") {
        window.App.switchView("view-p2p-lobby");
        this.renderP2PLobbyPlayers();
      } else if (this.status === "word_picking") {
        window.App.switchView("view-p2p-word-pick");
        this.renderP2PWordPickScreen(data.chooserId === this.myPeerId);
      } else if (this.status === "revealing") {
        window.App.switchView("view-p2p-secret");
        this.renderP2PSecretScreen();
        if (data.seenCount !== undefined) {
          this.updateSeenStatusUI(data.seenCount, data.totalCount, data.missingPlayers);
        }
      } else if (this.status === "discussion") {
        const starterEl = document.getElementById("p2p-starter-player-name");
        if (starterEl) starterEl.textContent = this.starterName;
        window.App.switchView("view-p2p-discussion");
      } else if (this.status === "voting") {
        window.App.switchView("view-p2p-voting");
        this.renderP2PVotingCards();
      } else if (this.status === "game_over") {
        window.App.switchView("view-p2p-game-over");
      }
    } else if (data.type === "START_WORD_PICKING") {
      this.status = "word_picking";
      this.renderP2PWordPickScreen(data.chooserId === this.myPeerId);
      window.App.switchView("view-p2p-word-pick");
    } else if (data.type === "PLAYERS_UPDATE") {
      this.players = data.players;
      this.renderP2PLobbyPlayers();
    } else if (data.type === "SECRET_ROLE") {
      this.mySecret = {
        isImpostor: data.isImpostor,
        word: data.word,
        category: data.category,
        clue: data.clue || null
      };
    } else if (data.type === "GAME_STARTED") {
      this.status = "revealing";
      this.hasReportedSeen = false;
      this.starterName = data.starterName;
      this.renderP2PSecretScreen();
      window.App.switchView("view-p2p-secret");
    } else if (data.type === "SEEN_STATUS_UPDATE") {
      this.updateSeenStatusUI(data.seenCount, data.totalCount, data.missingPlayers);
    } else if (data.type === "START_DISCUSSION") {
      this.status = "discussion";
      if (data.starterName) this.starterName = data.starterName;
      this.startDiscussionTimer(data.duration || (this.discussionMinutes * 60));
    } else if (data.type === "START_VOTING") {
      clearInterval(this.timerInterval);
      this.status = "voting";
      window.App.switchView("view-p2p-voting");
      this.renderP2PVotingCards();
    } else if (data.type === "GAME_OVER") {
      clearInterval(this.timerInterval);
      this.status = "game_over";
      window.App.switchView("view-p2p-game-over");
      this.renderP2PGameOver(data);
    } else if (data.type === "RESET_LOBBY") {
      clearInterval(this.timerInterval);
      this.status = "lobby";
      this.mySecret = null;
      this.hasReportedSeen = false;
      this.wordChooserId = null;
      this.wordChooserName = "";
      window.App.switchView("view-p2p-lobby");
      this.renderP2PLobbyPlayers();
    }
  }

  renderP2PLobbyPlayers() {
    const listEl = document.getElementById("p2p-lobby-players-list");
    const countEl = document.getElementById("p2p-players-count");
    if (countEl) countEl.textContent = this.players.length;

    if (!listEl) return;
    listEl.innerHTML = "";

    this.players.forEach(p => {
      const isOnline = p.online !== false;
      const chip = document.createElement("div");
      const isMe = (this.isHost && p.isHost) || (!this.isHost && p.id === this.myPeerId);
      chip.className = `lobby-player-chip ${isMe ? "is-you" : ""} ${p.isHost ? "is-host" : ""} ${!isOnline ? "is-offline" : ""}`;

      const dot = document.createElement("span");
      dot.className = "pulse-dot";

      const name = document.createElement("span");
      let badge = "";
      if (p.isHost) badge = " (Host 👑)";
      else if (isMe) badge = " (Tu)";
      else if (!isOnline) badge = " (Offline)";
      name.textContent = `${p.name}${badge}`;

      chip.appendChild(dot);
      chip.appendChild(name);
      listEl.appendChild(chip);
    });

    if (this.isHost) {
      const startBtn = document.getElementById("p2p-host-start-btn");
      if (startBtn) {
        startBtn.disabled = this.players.length < 3;
        if (this.players.length < 3) {
          startBtn.textContent = `Servono almeno 3 giocatori (${this.players.length}/3)`;
        } else {
          startBtn.textContent = "🚀 Avvia Partita per Tutti";
        }
      }
      this.updateHostImpostorLimits();
      this.updateHostDiscussionTimeLimits();
    }
  }

  adjustDiscussionTime(delta) {
    Sound.playClick();
    this.discussionMinutes = Math.max(1, Math.min(10, this.discussionMinutes + delta));
    try { localStorage.setItem("impostore_p2p_discussion_minutes", this.discussionMinutes); } catch (e) {}
    this.updateHostDiscussionTimeLimits();
  }

  updateHostDiscussionTimeLimits() {
    const valEl = document.getElementById("p2p-time-value");
    if (valEl) valEl.textContent = `${this.discussionMinutes} min`;

    const minusBtn = document.getElementById("p2p-time-minus");
    const plusBtn = document.getElementById("p2p-time-plus");
    if (minusBtn) minusBtn.disabled = this.discussionMinutes <= 1;
    if (plusBtn) plusBtn.disabled = this.discussionMinutes >= 10;
  }

  adjustImpostorCount(delta) {
    Sound.playClick();
    const maxImp = Math.max(1, Math.floor(this.players.length / 2));
    this.impostorCount = Math.max(1, Math.min(maxImp, this.impostorCount + delta));
    this.updateHostImpostorLimits();
  }

  updateHostImpostorLimits() {
    const maxImp = Math.max(1, Math.floor(this.players.length / 2));
    if (this.impostorCount > maxImp) this.impostorCount = maxImp;

    const valEl = document.getElementById("p2p-imp-value");
    if (valEl) valEl.textContent = this.impostorCount;

    const minusBtn = document.getElementById("p2p-imp-minus");
    const plusBtn = document.getElementById("p2p-imp-plus");
    if (minusBtn) minusBtn.disabled = this.impostorCount <= 1;
    if (plusBtn) plusBtn.disabled = this.impostorCount >= maxImp;
  }

  // =========================================================================
  // HOST: Distribuzione Ruoli e Avvio Gioco
  // =========================================================================
  hostStartGame() {
    if (!this.isHost || this.players.length < 3) return;
    Sound.playClick();

    // Vincolo: massimo la metà per difetto (es. 5 giocatori -> max 2 impostori)
    const maxImp = Math.max(1, Math.floor(this.players.length / 2));
    this.impostorCount = Math.max(1, Math.min(maxImp, this.impostorCount));

    this.seenRolePlayerIds.clear();
    this.hasReportedSeen = false;

    // Se è selezionata la modalità "Parola a Scelta", estrai 1 giocatore casuale per sceglierla!
    if (this.category === "custom") {
      this.status = "word_picking";
      const onlinePlayers = this.players.filter(p => p.online !== false);
      const chooser = onlinePlayers[Math.floor(Math.random() * onlinePlayers.length)];
      this.wordChooserId = chooser.id;
      this.wordChooserName = chooser.name;

      this.broadcast({
        type: "START_WORD_PICKING",
        chooserId: this.wordChooserId
      });

      this.renderP2PWordPickScreen(this.wordChooserId === this.myPeerId);
      window.App.switchView("view-p2p-word-pick");
      return;
    }

    // Modalità standard con categoria estratta
    this.wordChooserId = null;
    const picked = pickSecretWord(this.category);
    this.finalizeWordAndDistributeRoles(picked.word, picked.categoryName, picked.clue);
  }

  submitChosenWord() {
    const input = document.getElementById("p2p-input-chosen-word");
    const submitBtn = document.getElementById("p2p-btn-submit-chosen-word");
    const word = input ? input.value.trim() : "";

    if (!word || word.length < 2) {
      alert("Inserisci una parola segreta valida di almeno 2 lettere!");
      return;
    }

    Sound.playClick();

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "⏳ Invio parola in corso...";
    }

    if (this.isHost) {
      this.finalizeWordAndDistributeRoles(word, "Parola a Scelta", "");
    } else {
      if (this.hostConn && this.hostConn.open) {
        this.hostConn.send({
          type: "CUSTOM_WORD_SUBMITTED",
          word: word
        });
      }
    }
  }

  renderP2PWordPickScreen(isChooser) {
    const activePanel = document.getElementById("p2p-word-picker-active");
    const waitingPanel = document.getElementById("p2p-word-picker-waiting");
    const input = document.getElementById("p2p-input-chosen-word");
    const submitBtn = document.getElementById("p2p-btn-submit-chosen-word");

    if (isChooser) {
      if (activePanel) activePanel.style.display = "block";
      if (waitingPanel) waitingPanel.style.display = "none";
      if (input) {
        input.value = "";
        setTimeout(() => {
          input.focus();
        }, 150);
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "✨ Conferma Parola e Avvia Round";
      }
    } else {
      if (activePanel) activePanel.style.display = "none";
      if (waitingPanel) waitingPanel.style.display = "block";
    }
  }

  finalizeWordAndDistributeRoles(secretWord, categoryName = "Parola a Scelta", clue = "") {
    if (!this.isHost) return;

    this.secretWord = secretWord.trim();
    this.categoryName = categoryName;

    // Se la modalità è "Parola a Scelta", nessun indizio viene assegnato all'impostore
    const isCustomChosenWord = this.category === "custom" || this.wordChooserId != null || categoryName === "Parola a Scelta";
    this.secretClue = isCustomChosenWord ? "" : (clue || (typeof getWordClue === "function" ? getWordClue(this.secretWord) : ""));

    // Distribuzione ruoli:
    // Se c'è un wordChooserId, quel giocatore è un Cittadino Innocente (ha scelto la parola)!
    // Gli impostori vengono estratti a sorte tra gli altri giocatori eleggibili
    let eligibleForImpostor = this.players;
    if (this.wordChooserId) {
      eligibleForImpostor = this.players.filter(p => p.id !== this.wordChooserId);
    }

    const candidateIds = eligibleForImpostor.map(p => p.id);
    for (let i = candidateIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidateIds[i], candidateIds[j]] = [candidateIds[j], candidateIds[i]];
    }

    const impostorSet = new Set(candidateIds.slice(0, this.impostorCount));
    this.assignments.clear();

    this.players.forEach(p => {
      const isImp = impostorSet.has(p.id);
      const playerClue = (isImp && this.enableClue && !isCustomChosenWord) ? this.secretClue : null;

      this.assignments.set(p.id, {
        isImpostor: isImp,
        word: this.secretWord,
        category: this.categoryName,
        clue: playerClue
      });

      if (p.isHost) {
        this.mySecret = {
          isImpostor: isImp,
          word: isImp ? null : this.secretWord,
          category: this.categoryName,
          clue: playerClue
        };
      } else {
        const client = this.connections.get(p.id);
        if (client && client.conn && client.conn.open) {
          client.conn.send({
            type: "SECRET_ROLE",
            isImpostor: isImp,
            word: isImp ? null : this.secretWord,
            category: this.categoryName,
            clue: playerClue
          });
        }
      }
    });

    // Estrai chi inizia a parlare
    const starter = this.players[Math.floor(Math.random() * this.players.length)];
    this.starterName = starter.name;

    // Broadcast inizio partita e rivelazione
    this.broadcast({
      type: "GAME_STARTED",
      starterName: this.starterName
    });

    this.status = "revealing";
    this.renderP2PSecretScreen();
    this.broadcastSeenStatus();
    window.App.switchView("view-p2p-secret");
  }

  renderP2PSecretScreen() {
    this.hasReportedSeen = false;
    const card = document.getElementById("p2p-secret-revealed-card");
    const holdBtn = document.getElementById("p2p-hold-reveal-btn");
    const progressBar = document.getElementById("p2p-hold-progress-bar");
    const hostDiscBtn = document.getElementById("p2p-host-start-disc-btn");

    if (card) card.style.display = "none";
    if (holdBtn) {
      holdBtn.style.display = "flex";
      holdBtn.classList.remove("holding");
    }
    if (progressBar) progressBar.style.width = "0%";
    if (hostDiscBtn) {
      hostDiscBtn.style.display = this.isHost ? "inline-flex" : "none";
      hostDiscBtn.classList.remove("pulse-glow");
      hostDiscBtn.disabled = true;
      hostDiscBtn.innerHTML = "⏳ In attesa che tutti vedano la carta...";
    }

    if (this.isHost) {
      this.broadcastSeenStatus();
    } else {
      this.updateSeenStatusUI(0, this.players.length, this.players.map(p => p.name));
    }
  }

  onHoldStart() {
    if (this.isHolding || !this.mySecret) return;
    this.isHolding = true;
    this.holdStartTime = Date.now();

    const holdBtn = document.getElementById("p2p-hold-reveal-btn");
    const progressBar = document.getElementById("p2p-hold-progress-bar");
    if (holdBtn) holdBtn.classList.add("holding");

    Sound.playHoldTick();

    clearInterval(this.holdProgressInterval);
    this.holdProgressInterval = setInterval(() => {
      const elapsed = Date.now() - this.holdStartTime;
      const pct = Math.min(100, (elapsed / this.holdRequiredMs) * 100);
      if (progressBar) progressBar.style.width = `${pct}%`;

      if (elapsed >= this.holdRequiredMs) {
        clearInterval(this.holdProgressInterval);
        this.revealMyRole();
      }
    }, 25);
  }

  onHoldEnd() {
    if (!this.isHolding) return;
    this.isHolding = false;
    clearInterval(this.holdProgressInterval);

    const holdBtn = document.getElementById("p2p-hold-reveal-btn");
    const progressBar = document.getElementById("p2p-hold-progress-bar");
    const card = document.getElementById("p2p-secret-revealed-card");

    if (holdBtn) holdBtn.classList.remove("holding");
    if (progressBar) progressBar.style.width = "0%";

    if (card && card.style.display !== "none") {
      card.style.display = "none";
      if (holdBtn) holdBtn.style.display = "flex";
    }
  }

  revealMyRole() {
    if (!this.mySecret) return;
    const card = document.getElementById("p2p-secret-revealed-card");
    const holdBtn = document.getElementById("p2p-hold-reveal-btn");
    if (!card) return;

    this.hasReportedSeen = true;
    if (this.isHost) {
      const hostPlayer = this.players.find(p => p.isHost);
      const hostId = hostPlayer ? hostPlayer.id : "host";
      this.seenRolePlayerIds.add(hostId);
      this.seenRolePlayerIds.add("host");
      if (this.myPeerId) this.seenRolePlayerIds.add(this.myPeerId);
      this.broadcastSeenStatus();
    } else {
      if (this.hostConn && this.hostConn.open) {
        this.hostConn.send({ type: "ROLE_SEEN", playerId: this.playerId });
      }
    }

    card.className = `secret-card ${this.mySecret.isImpostor ? "impostor" : "innocent"}`;

    if (this.mySecret.isImpostor) {
      Sound.playImpostorReveal();
      let clueHtml = "";
      if (this.mySecret.clue) {
        clueHtml = `
          <div class="impostor-clue-box">
            <div class="impostor-clue-label">💡 Indizio sul Contesto:</div>
            <div class="impostor-clue-text">"${this.mySecret.clue}"</div>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="secret-badge">Allerta Intrusione ⚠️</div>
        <div class="impostor-title">SEI L'IMPOSTORE!</div>
        ${clueHtml}
        <p class="impostor-warning">
          Non conosci la parola esatta! Ascolta gli altri, ${this.mySecret.clue ? "usa l'indizio per bluffare" : "bluffa con astuzia"} e cerca di non farti scoprire.
        </p>
      `;
    } else {
      Sound.playInnocentReveal();
      card.innerHTML = `
        <div class="secret-badge">Cittadino Innocente 🛡️</div>
        <div class="secret-word-title">La tua parola segreta è:</div>
        <div class="secret-word-value">${this.mySecret.word}</div>
        <div class="secret-category">Categoria: ${this.mySecret.category}</div>
      `;
    }

    card.style.display = "block";
    if (holdBtn) holdBtn.style.display = "none";
  }

  broadcastSeenStatus() {
    if (!this.isHost) return;
    const missingPlayers = this.players
      .filter(p => !this.seenRolePlayerIds.has(p.id) && !(p.playerId && this.seenRolePlayerIds.has(p.playerId)))
      .map(p => p.name);
    const totalCount = this.players.length;
    const seenCount = Math.max(0, totalCount - missingPlayers.length);

    const payload = {
      type: "SEEN_STATUS_UPDATE",
      seenCount,
      totalCount,
      missingPlayers
    };

    this.broadcast(payload);
    this.updateSeenStatusUI(seenCount, totalCount, missingPlayers);
  }

  updateSeenStatusUI(seenCount, totalCount, missingPlayers = []) {
    const counterEl = document.getElementById("p2p-seen-counter");
    const progressFill = document.getElementById("p2p-seen-progress-fill");
    const missingContainer = document.getElementById("p2p-seen-missing-container");
    const missingChipsEl = document.getElementById("p2p-seen-missing-chips");
    const allReadyEl = document.getElementById("p2p-seen-all-ready");
    const hostDiscBtn = document.getElementById("p2p-host-start-disc-btn");

    if (counterEl) counterEl.textContent = `${seenCount} / ${totalCount}`;

    if (progressFill) {
      const pct = totalCount > 0 ? Math.round((seenCount / totalCount) * 100) : 0;
      progressFill.style.width = `${pct}%`;
    }

    const allSeen = totalCount > 0 && missingPlayers.length === 0 && seenCount >= totalCount;

    if (allSeen) {
      if (missingContainer) missingContainer.style.display = "none";
      if (allReadyEl) allReadyEl.style.display = "block";
      if (this.isHost && hostDiscBtn) {
        hostDiscBtn.disabled = false;
        hostDiscBtn.classList.add("pulse-glow");
        hostDiscBtn.innerHTML = "🗣️ Tutti Hanno Visto: Inizia Discussione";
      }
    } else {
      if (missingContainer) missingContainer.style.display = "flex";
      if (allReadyEl) allReadyEl.style.display = "none";
      if (this.isHost && hostDiscBtn) {
        hostDiscBtn.disabled = true;
        hostDiscBtn.classList.remove("pulse-glow");
        const remainingCount = missingPlayers.length;
        hostDiscBtn.innerHTML = remainingCount === 1
          ? "⏳ In attesa di 1 giocatore..."
          : `⏳ In attesa di ${remainingCount} giocatori...`;
      }

      if (missingChipsEl) {
        missingChipsEl.innerHTML = "";
        missingPlayers.forEach(name => {
          const chip = document.createElement("span");
          const isMe = name === this.playerName;
          chip.className = `missing-chip ${isMe ? "is-you" : ""}`;
          chip.textContent = isMe ? `${name} (Tu)` : name;
          missingChipsEl.appendChild(chip);
        });
      }
    }
  }

  hostStartDiscussion() {
    if (!this.isHost) return;

    // Impedisci l'avvio se non tutti i giocatori hanno visualizzato la carta
    const missingPlayers = this.players
      .filter(p => !this.seenRolePlayerIds.has(p.id) && !(p.playerId && this.seenRolePlayerIds.has(p.playerId)));
    if (this.players.length === 0 || missingPlayers.length > 0) {
      console.warn("[Host] Avvio discussione bloccato: non tutti i giocatori hanno visto la propria carta.", missingPlayers.map(p => p.name));
      return;
    }

    Sound.playClick();
    this.status = "discussion";

    const duration = this.discussionMinutes * 60;
    this.broadcast({
      type: "START_DISCUSSION",
      starterName: this.starterName,
      duration: duration
    });

    this.startDiscussionTimer(duration);
  }

  startDiscussionTimer(duration) {
    Sound.playFanfare();
    const starterEl = document.getElementById("p2p-starter-player-name");
    if (starterEl) starterEl.textContent = this.starterName;

    const hostVoteBtn = document.getElementById("p2p-host-start-vote-btn");
    const clientWaiting = document.getElementById("p2p-client-vote-waiting");
    if (hostVoteBtn) hostVoteBtn.style.display = this.isHost ? "inline-flex" : "none";
    if (clientWaiting) clientWaiting.style.display = this.isHost ? "none" : "block";

    this.timerSeconds = duration;
    this.updateP2PTimerDisplay();

    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.status !== "discussion") {
        clearInterval(this.timerInterval);
        return;
      }

      if (this.timerSeconds > 0) {
        this.timerSeconds--;
        this.updateP2PTimerDisplay();

        if (this.timerSeconds <= 10 && this.timerSeconds > 0) {
          Sound.playTimerTick(true);
        } else if (this.timerSeconds % 30 === 0 && this.timerSeconds > 0) {
          Sound.playTimerTick(false);
        }

        if (this.timerSeconds === 0) {
          clearInterval(this.timerInterval);
          Sound.playTimerEnd();
          if (this.isHost) {
            setTimeout(() => {
              if (this.status === "discussion") {
                this.hostStartVoting();
              }
            }, 1200);
          }
        }
      }
    }, 1000);

    window.App.switchView("view-p2p-discussion");
  }

  updateP2PTimerDisplay() {
    const el = document.getElementById("p2p-timer-display");
    if (!el) return;
    const mins = Math.floor(this.timerSeconds / 60);
    const secs = this.timerSeconds % 60;
    el.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    if (this.timerSeconds <= 10 && this.timerSeconds > 0) {
      el.classList.add("urgent");
    } else {
      el.classList.remove("urgent");
    }
  }

  hostStartVoting() {
    if (!this.isHost) return;
    Sound.playClick();
    clearInterval(this.timerInterval);
    this.status = "voting";

    this.broadcast({ type: "START_VOTING" });
    window.App.switchView("view-p2p-voting");
    this.renderP2PVotingCards();
  }

  renderP2PVotingCards() {
    const container = document.getElementById("p2p-vote-grid-container");
    const confirmBtn = document.getElementById("p2p-confirm-vote-btn");
    const instructionEl = document.getElementById("p2p-vote-instruction");

    if (instructionEl) {
      instructionEl.textContent = this.isHost
        ? "Tocca il giocatore che il gruppo accusa di essere l'impostore:"
        : "L'Host sta selezionando il giocatore accusato dal gruppo...";
    }

    if (confirmBtn) {
      confirmBtn.style.display = this.isHost ? "inline-flex" : "none";
      confirmBtn.disabled = true;
    }

    if (!container) return;
    container.innerHTML = "";
    this.selectedVotePlayerId = null;

    this.players.forEach(p => {
      const card = document.createElement("div");
      card.className = "vote-card";

      const avatar = document.createElement("div");
      avatar.className = "vote-avatar";
      avatar.textContent = p.name.charAt(0).toUpperCase();

      const name = document.createElement("div");
      name.className = "vote-name";
      name.textContent = p.name;

      card.appendChild(avatar);
      card.appendChild(name);

      if (this.isHost) {
        card.addEventListener("click", () => {
          Sound.playClick();
          document.querySelectorAll("#p2p-vote-grid-container .vote-card").forEach(c => c.classList.remove("selected"));
          card.classList.add("selected");
          this.selectedVotePlayerId = p.id;
          if (confirmBtn) confirmBtn.disabled = false;
        });
      }

      container.appendChild(card);
    });
  }

  hostExecuteVote() {
    if (!this.isHost || !this.selectedVotePlayerId) return;
    Sound.playClick();

    const target = this.players.find(p => p.id === this.selectedVotePlayerId);
    if (!target) return;

    const assignment = this.assignments.get(target.id);
    const wasImpostor = assignment ? assignment.isImpostor : false;
    const impostorsList = this.players
      .filter(p => this.assignments.get(p.id)?.isImpostor)
      .map(p => p.name);

    const gameOverPayload = {
      type: "GAME_OVER",
      votedName: target.name,
      wasImpostor: wasImpostor,
      secretWord: this.secretWord,
      category: this.categoryName,
      impostors: impostorsList
    };

    this.broadcast(gameOverPayload);
    this.status = "game_over";
    window.App.switchView("view-p2p-game-over");
    this.renderP2PGameOver(gameOverPayload);
  }

  renderP2PGameOver(data) {
    const titleEl = document.getElementById("p2p-game-over-title");
    const iconEl = document.getElementById("p2p-game-over-icon");
    const descEl = document.getElementById("p2p-game-over-desc");
    const impostorsListEl = document.getElementById("p2p-game-over-impostors-list");
    const wordEl = document.getElementById("p2p-game-over-word");
    const rematchBtn = document.getElementById("p2p-rematch-btn");

    if (rematchBtn) rematchBtn.style.display = this.isHost ? "inline-flex" : "none";

    if (data.wasImpostor) {
      Sound.playFanfare();
      if (titleEl) {
        titleEl.textContent = "Vittoria dei Cittadini!";
        titleEl.className = "game-over-title citizens-win";
      }
      if (iconEl) iconEl.textContent = "🎉";
      if (descEl) descEl.innerHTML = `<strong>${data.votedName}</strong> era davvero <strong>L'IMPOSTORE!</strong> Complimenti!`;
    } else {
      Sound.playImpostorReveal();
      if (titleEl) {
        titleEl.textContent = "L'Impostore Ha Vinto!";
        titleEl.className = "game-over-title impostor-wins";
      }
      if (iconEl) iconEl.textContent = "😈";
      if (descEl) descEl.innerHTML = `<strong>${data.votedName}</strong> era innocente! Gli impostori hanno ingannato il gruppo.`;
    }

    if (impostorsListEl && data.impostors) {
      impostorsListEl.innerHTML = data.impostors.map(name => `
        <div class="impostor-pill">🕵️ ${name}</div>
      `).join("");
    }

    if (wordEl) {
      wordEl.textContent = `${data.secretWord} (${data.category})`;
    }
  }

  hostResetLobby() {
    if (!this.isHost) return;
    Sound.playClick();
    clearInterval(this.timerInterval);
    this.status = "lobby";
    this.mySecret = null;
    this.assignments.clear();
    this.seenRolePlayerIds.clear();
    this.hasReportedSeen = false;
    this.wordChooserId = null;
    this.wordChooserName = "";

    this.broadcast({ type: "RESET_LOBBY" });

    window.App.switchView("view-p2p-lobby");
    this.renderP2PLobbyPlayers();
  }
}
