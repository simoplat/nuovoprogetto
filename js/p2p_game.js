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
    this.starterName = "";
    this.assignments = new Map(); // peerId -> { isImpostor, word, category }
    this.selectedVotePlayerId = null;

    // Dati per il Client partecipante
    this.hostConn = null;
    this.mySecret = null;
    this.status = "idle"; // idle, lobby, revealing, discussion, voting, game_over

    // Hold reveal
    this.isHolding = false;
    this.holdStartTime = 0;
    this.holdProgressInterval = null;
    this.holdRequiredMs = 350;

    this.bindEvents();
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

    // Host: Categoria parole
    const catSelect = document.getElementById("p2p-category-select");
    if (catSelect) {
      catSelect.addEventListener("change", (e) => {
        this.category = e.target.value;
        const customBox = document.getElementById("p2p-custom-word-container");
        if (customBox) customBox.style.display = this.category === "custom" ? "block" : "none";
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

    // Controlla se l'URL ha ?room=XXXX
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get("room");
    if (roomParam) {
      const codeInput = document.getElementById("p2p-join-code-input");
      if (codeInput) codeInput.value = roomParam.toUpperCase();

      // Mostra direttamente la tab Unisciti
      const tabJoin = document.getElementById("p2p-tab-join");
      if (tabJoin) tabJoin.click();
    }

    window.App.switchView("view-p2p-setup");
  }

  renderCategoryOptions() {
    const select = document.getElementById("p2p-category-select");
    if (!select) return;

    select.innerHTML = "";
    const cats = getAvailableCategories();
    cats.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      select.appendChild(opt);
    });

    const customOpt = document.createElement("option");
    customOpt.value = "custom";
    customOpt.textContent = "✏️ Parola Personalizzata";
    select.appendChild(customOpt);
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
      this.connections.set(conn.peer, { name: peerName, conn: conn });

      // Se non c'è già nella lista giocatori, aggiungilo
      if (!this.players.some(p => p.id === conn.peer)) {
        this.players.push({ id: conn.peer, name: peerName, isHost: false });
      }

      // Invia conferma e lista giocatori
      conn.send({
        type: "JOIN_SUCCESS",
        roomCode: this.roomCode,
        players: this.players.map(p => ({ id: p.id, name: p.name, isHost: p.isHost }))
      });

      this.broadcast({
        type: "PLAYERS_UPDATE",
        players: this.players.map(p => ({ id: p.id, name: p.name, isHost: p.isHost }))
      });

      this.renderP2PLobbyPlayers();
    }
  }

  handlePeerDisconnected(peerId) {
    this.connections.delete(peerId);
    this.players = this.players.filter(p => p.id !== peerId);
    this.broadcast({
      type: "PLAYERS_UPDATE",
      players: this.players.map(p => ({ id: p.id, name: p.name, isHost: p.isHost }))
    });
    this.renderP2PLobbyPlayers();
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
    try { localStorage.setItem("impostore_p2p_name", name); } catch (e) {}

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
        this.hostConn.send({ type: "JOIN", name: this.playerName });
      });

      this.hostConn.on("data", (data) => this.handleClientIncomingData(data));

      this.hostConn.on("close", () => {
        alert("L'Host si è disconnesso o la stanza è stata chiusa.");
        window.App.switchView("view-mode-select");
      });

      this.hostConn.on("error", (err) => {
        alert("Errore di connessione all'Host: " + err.message);
      });
    });

    this.peer.on("error", (err) => {
      if (statusEl) statusEl.textContent = "Errore: stanza non trovata o Host disconnesso.";
      alert("Impossibile connettersi alla stanza " + this.roomCode + ". Verifica che il codice sia corretto e che l'Host sia attivo.");
    });
  }

  handleClientIncomingData(data) {
    if (!data || !data.type) return;

    if (data.type === "JOIN_SUCCESS") {
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
    } else if (data.type === "PLAYERS_UPDATE") {
      this.players = data.players;
      this.renderP2PLobbyPlayers();
    } else if (data.type === "SECRET_ROLE") {
      this.mySecret = {
        isImpostor: data.isImpostor,
        word: data.word,
        category: data.category
      };
    } else if (data.type === "GAME_STARTED") {
      this.status = "revealing";
      this.starterName = data.starterName;
      this.renderP2PSecretScreen();
      window.App.switchView("view-p2p-secret");
    } else if (data.type === "START_DISCUSSION") {
      this.status = "discussion";
      Sound.playFanfare();
      const starterEl = document.getElementById("p2p-starter-player-name");
      if (starterEl) starterEl.textContent = this.starterName;
      window.App.switchView("view-p2p-discussion");
    } else if (data.type === "START_VOTING") {
      this.status = "voting";
      window.App.switchView("view-p2p-voting");
      this.renderP2PVotingCards();
    } else if (data.type === "GAME_OVER") {
      this.status = "game_over";
      window.App.switchView("view-p2p-game-over");
      this.renderP2PGameOver(data);
    } else if (data.type === "RESET_LOBBY") {
      this.status = "lobby";
      this.mySecret = null;
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
      const chip = document.createElement("div");
      const isMe = (this.isHost && p.isHost) || (!this.isHost && p.id === this.myPeerId);
      chip.className = `lobby-player-chip ${isMe ? "is-you" : ""} ${p.isHost ? "is-host" : ""}`;

      const dot = document.createElement("span");
      dot.className = "pulse-dot";

      const name = document.createElement("span");
      let badge = "";
      if (p.isHost) badge = " (Host 👑)";
      else if (isMe) badge = " (Tu)";
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
    }
  }

  adjustImpostorCount(delta) {
    Sound.playClick();
    const maxImp = Math.max(1, Math.floor((this.players.length - 1) / 2));
    this.impostorCount = Math.max(1, Math.min(maxImp, this.impostorCount + delta));
    this.updateHostImpostorLimits();
  }

  updateHostImpostorLimits() {
    const maxImp = Math.max(1, Math.floor((this.players.length - 1) / 2));
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

    // Estrai parola
    if (this.category === "custom") {
      const customInput = document.getElementById("p2p-custom-word-input");
      this.secretWord = customInput ? customInput.value.trim() : "";
      if (!this.secretWord) {
        alert("Inserisci la parola segreta personalizzata!");
        return;
      }
      this.categoryName = "Parola Personalizzata";
    } else {
      const picked = pickSecretWord(this.category);
      this.secretWord = picked.word;
      this.categoryName = picked.categoryName;
    }

    // Mescola e assegna impostori
    const playerIds = this.players.map(p => p.id);
    for (let i = playerIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playerIds[i], playerIds[j]] = [playerIds[j], playerIds[i]];
    }

    const impostorSet = new Set(playerIds.slice(0, this.impostorCount));
    this.assignments.clear();

    this.players.forEach(p => {
      const isImp = impostorSet.has(p.id);
      this.assignments.set(p.id, {
        isImpostor: isImp,
        word: this.secretWord,
        category: this.categoryName
      });

      if (p.isHost) {
        this.mySecret = {
          isImpostor: isImp,
          word: isImp ? null : this.secretWord,
          category: this.categoryName
        };
      } else {
        const client = this.connections.get(p.id);
        if (client && client.conn && client.conn.open) {
          client.conn.send({
            type: "SECRET_ROLE",
            isImpostor: isImp,
            word: isImp ? null : this.secretWord,
            category: this.categoryName
          });
        }
      }
    });

    // Estrai chi inizia
    const starter = this.players[Math.floor(Math.random() * this.players.length)];
    this.starterName = starter.name;

    // Broadcast inizio partita
    this.broadcast({
      type: "GAME_STARTED",
      starterName: this.starterName
    });

    this.status = "revealing";
    this.renderP2PSecretScreen();
    window.App.switchView("view-p2p-secret");
  }

  renderP2PSecretScreen() {
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
    if (hostDiscBtn) hostDiscBtn.style.display = this.isHost ? "inline-flex" : "none";
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

    card.className = `secret-card ${this.mySecret.isImpostor ? "impostor" : "innocent"}`;

    if (this.mySecret.isImpostor) {
      Sound.playImpostorReveal();
      card.innerHTML = `
        <div class="secret-badge">Allerta Intrusione ⚠️</div>
        <div class="impostor-title">SEI L'IMPOSTORE!</div>
        <p class="impostor-warning">
          Non conosci la parola segreta! Ascolta gli altri, bluffa con astuzia e cerca di non farti scoprire.
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

  hostStartDiscussion() {
    if (!this.isHost) return;
    Sound.playClick();
    this.status = "discussion";

    this.broadcast({ type: "START_DISCUSSION" });

    Sound.playFanfare();
    const starterEl = document.getElementById("p2p-starter-player-name");
    if (starterEl) starterEl.textContent = this.starterName;

    const hostVoteBtn = document.getElementById("p2p-host-start-vote-btn");
    if (hostVoteBtn) hostVoteBtn.style.display = "inline-flex";

    window.App.switchView("view-p2p-discussion");
  }

  hostStartVoting() {
    if (!this.isHost) return;
    Sound.playClick();
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
    this.status = "lobby";
    this.mySecret = null;
    this.assignments.clear();

    this.broadcast({ type: "RESET_LOBBY" });

    window.App.switchView("view-p2p-lobby");
    this.renderP2PLobbyPlayers();
  }
}
