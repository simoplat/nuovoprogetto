/**
 * P2PRoomManager - Gestore di Rete Generico WebRTC (PeerJS)
 * Modulo riutilizzabile da qualsiasi gioco nel Party Game Hub.
 * 
 * Funzionalità:
 * 1. Creazione e gestione stanze con codice PIN a 4 caratteri e QR Code.
 * 2. Connessione client diretta P2P (WebRTC DataChannel) senza server di gioco.
 * 3. Identificatore stabile del giocatore per riconnessioni trasparenti.
 * 4. Finestra di grazia (25s) per riconnessione rapida dell'Host se perde temporaneamente il segnale.
 * 5. Migrazione automatica dell'Host (Failover) al giocatore successivo se l'Host originale non si riconnette.
 */

class P2PRoomManager {
  constructor(options = {}) {
    this.peerPrefix = options.peerPrefix || "partyhub-v1-";
    this.hostGracePeriodMs = options.hostGracePeriodMs || 25000; // 25 secondi prima della migrazione
    this.peer = null;
    this.isHost = false;
    this.roomCode = "";
    this.myPeerId = null;
    this.playerName = "";
    this.playerId = this.getOrCreatePlayerId();

    // Dati Host
    this.connections = new Map(); // peerId -> { name, conn, playerId, online }
    this.players = []; // [{ id, playerId, name, isHost, online }]

    // Dati Client
    this.hostConn = null;
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectTimer = null;
    this.hostGraceCountdownTimer = null;
    this.hostGraceRemainingSeconds = 0;

    // Sistema Eventi Pub/Sub
    this.listeners = new Map();

    // Ripristina nome salvato
    try {
      this.playerName = localStorage.getItem("partyhub_player_name") || "";
    } catch (e) {}
  }

  getOrCreatePlayerId() {
    let stored = "";
    try {
      stored = sessionStorage.getItem("partyhub_player_id");
    } catch (e) {}
    if (!stored) {
      stored = "p_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now().toString(36);
      try {
        sessionStorage.setItem("partyhub_player_id", stored);
      } catch (e) {}
    }
    return stored;
  }

  setPlayerName(name) {
    this.playerName = (name || "").trim();
    try {
      localStorage.setItem("partyhub_player_name", this.playerName);
    } catch (e) {}
  }

  // --- PUB / SUB EVENT SYSTEM ---
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      for (const cb of this.listeners.get(event)) {
        try {
          cb(data);
        } catch (err) {
          console.error(`[P2PRoomManager] Errore listener evento "${event}":`, err);
        }
      }
    }
  }

  generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // =========================================================================
  // GESTIONE HOST
  // =========================================================================

  createRoom(customCode = null) {
    this.isHost = true;
    this.roomCode = (customCode || this.generateRoomCode()).toUpperCase();
    this.cleanUp();

    const fullPeerId = `${this.peerPrefix}${this.roomCode.toLowerCase()}`;

    // Memorizza sessione host per consentire riconnessione rapida
    try {
      sessionStorage.setItem("partyhub_host_session", JSON.stringify({
        roomCode: this.roomCode,
        playerName: this.playerName,
        timestamp: Date.now()
      }));
    } catch (e) {}

    try {
      this.peer = new Peer(fullPeerId, {
        debug: 0,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:global.stun.twilio.com:3478" }
          ]
        }
      });
    } catch (err) {
      console.error("[P2P Host] Errore creazione PeerJS:", err);
      this.emit("error", "Impossibile inizializzare WebRTC.");
      return;
    }

    this.peer.on("open", (id) => {
      this.myPeerId = id;
      this.players = [{
        id: "host",
        peerId: id,
        playerId: this.playerId,
        name: this.playerName,
        isHost: true,
        online: true
      }];

      console.log(`[P2P Host] Stanza creata con codice: ${this.roomCode} (ID: ${id})`);
      this.emit("room_created", {
        roomCode: this.roomCode,
        peerId: id,
        players: this.players
      });
    });

    this.peer.on("connection", (conn) => {
      this.handleHostIncomingConnection(conn);
    });

    this.peer.on("error", (err) => {
      console.warn("[P2P Host] Errore peer:", err.type, err.message);
      if (err.type === "unavailable-id") {
        console.log("[P2P Host] Codice occupato, rigenerazione...");
        this.createRoom();
      } else {
        this.emit("error", err.message || "Errore di connessione Host");
      }
    });

    this.peer.on("close", () => {
      console.log("[P2P Host] Connessione Host chiusa.");
    });
  }

  handleHostIncomingConnection(conn) {
    conn.on("open", () => {
      console.log(`[P2P Host] Connessione aperta con peer: ${conn.peer}`);
    });

    conn.on("data", (data) => {
      if (!data || !data.type) return;

      if (data.type === "JOIN_ROOM") {
        this.handlePlayerJoin(conn, data.name, data.playerId);
      } else if (data.type === "RECONNECT") {
        this.handlePlayerReconnect(conn, data.playerId, data.name);
      } else {
        this.emit("message", {
          senderPeer: conn.peer,
          senderPlayerId: data.voterPlayerId || data.playerId,
          type: data.type,
          data: data
        });
      }
    });

    conn.on("close", () => {
      this.handlePeerDisconnected(conn.peer);
    });

    conn.on("error", (err) => {
      console.warn(`[P2P Host] Errore connessione peer ${conn.peer}:`, err);
      this.handlePeerDisconnected(conn.peer);
    });
  }

  handlePlayerJoin(conn, name, playerId) {
    const peerName = (name || "Giocatore").trim().substring(0, 20);
    const existingPlayer = this.players.find(p => p.playerId && p.playerId === playerId);

    if (existingPlayer) {
      this.handlePlayerReconnect(conn, playerId, peerName);
      return;
    }

    const newPlayer = {
      id: conn.peer,
      peerId: conn.peer,
      playerId: playerId || conn.peer,
      name: peerName,
      isHost: false,
      online: true
    };

    this.connections.set(conn.peer, {
      name: peerName,
      conn: conn,
      playerId: newPlayer.playerId,
      online: true
    });

    this.players.push(newPlayer);

    conn.send({
      type: "JOIN_SUCCESS",
      roomCode: this.roomCode,
      players: this.getPublicPlayersList()
    });

    this.broadcastPlayersUpdate();
    this.emit("player_joined", { player: newPlayer, players: this.players });
  }

  handlePlayerReconnect(conn, playerId, name) {
    const existing = this.players.find(p => (playerId && p.playerId === playerId) || p.id === conn.peer);
    if (!existing) {
      this.handlePlayerJoin(conn, name, playerId);
      return;
    }

    const oldPeerId = existing.id;
    existing.id = conn.peer;
    existing.peerId = conn.peer;
    existing.online = true;
    if (name) existing.name = name;

    this.connections.set(conn.peer, {
      name: existing.name,
      conn: conn,
      playerId: existing.playerId,
      online: true
    });

    console.log(`[P2P Host] Giocatore ${existing.name} riconnesso con successo.`);

    conn.send({
      type: "RECONNECT_SUCCESS",
      roomCode: this.roomCode,
      players: this.getPublicPlayersList()
    });

    this.broadcastPlayersUpdate();
    this.emit("player_reconnected", { player: existing, oldPeerId: oldPeerId });
  }

  handlePeerDisconnected(peerId) {
    this.connections.delete(peerId);
    const player = this.players.find(p => p.id === peerId || p.peerId === peerId);
    if (!player) return;

    player.online = false;
    console.log(`[P2P Host] Giocatore ${player.name} disconnesso/offline.`);
    this.broadcastPlayersUpdate();
    this.emit("player_left", { player: player, players: this.players });
  }

  getPublicPlayersList() {
    return this.players.map(p => ({
      id: p.id,
      playerId: p.playerId,
      name: p.name,
      isHost: p.isHost,
      online: p.online !== false
    }));
  }

  broadcastPlayersUpdate() {
    this.broadcast({
      type: "PLAYERS_UPDATE",
      players: this.getPublicPlayersList()
    });
  }

  broadcast(data) {
    if (!this.isHost) return;
    for (const [peerId, client] of this.connections.entries()) {
      if (client.conn && client.conn.open) {
        try {
          client.conn.send(data);
        } catch (e) {
          console.warn(`[P2P Host] Errore invio a ${peerId}:`, e);
        }
      }
    }
  }

  sendTo(peerId, data) {
    const client = this.connections.get(peerId);
    if (client && client.conn && client.conn.open) {
      try {
        client.conn.send(data);
      } catch (e) {
        console.warn(`[P2P Host] Errore invio singolo a ${peerId}:`, e);
      }
    }
  }

  // =========================================================================
  // GESTIONE CLIENT
  // =========================================================================

  joinRoom(code, name = "") {
    this.isHost = false;
    this.roomCode = (code || "").trim().toUpperCase();
    if (name) this.setPlayerName(name);
    this.cleanUp();

    console.log(`[P2P Client] Connessione a stanza ${this.roomCode}...`);

    try {
      this.peer = new Peer({
        debug: 0,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:global.stun.twilio.com:3478" }
          ]
        }
      });
    } catch (err) {
      console.error("[P2P Client] Errore inizializzazione PeerJS:", err);
      this.emit("error", "Impossibile inizializzare WebRTC.");
      return;
    }

    this.peer.on("open", (id) => {
      this.myPeerId = id;
      this.connectToHost();
    });

    this.peer.on("error", (err) => {
      console.warn("[P2P Client] Errore peer client:", err.type, err.message);
      if (!this.isReconnecting) {
        this.attemptClientReconnect();
      }
    });
  }

  connectToHost(isReconnect = false) {
    const targetHostId = `${this.peerPrefix}${this.roomCode.toLowerCase()}`;
    this.hostConn = this.peer.connect(targetHostId, { reliable: true });

    this.hostConn.on("open", () => {
      console.log(`[P2P Client] Connesso con successo all'Host: ${targetHostId}`);
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      this.stopHostGraceCountdown();

      if (isReconnect) {
        this.hostConn.send({
          type: "RECONNECT",
          playerId: this.playerId,
          name: this.playerName
        });
        this.emit("host_reconnected", { roomCode: this.roomCode });
      } else {
        this.hostConn.send({
          type: "JOIN_ROOM",
          name: this.playerName,
          playerId: this.playerId
        });
      }
    });

    this.hostConn.on("data", (data) => {
      this.handleClientIncomingData(data);
    });

    this.hostConn.on("close", () => {
      console.warn("[P2P Client] Connessione con l'Host chiusa.");
      this.handleClientConnectionLost();
    });

    this.hostConn.on("error", (err) => {
      console.warn("[P2P Client] Errore connessione con Host:", err);
      this.handleClientConnectionLost();
    });
  }

  handleClientIncomingData(data) {
    if (!data || !data.type) return;

    if (data.type === "JOIN_SUCCESS") {
      this.players = data.players || [];
      this.emit("room_joined", { roomCode: this.roomCode, players: this.players });
    } else if (data.type === "PLAYERS_UPDATE") {
      this.players = data.players || [];
      this.emit("players_update", { players: this.players });
    } else if (data.type === "RECONNECT_SUCCESS") {
      this.players = data.players || [];
      this.emit("reconnect_success", data);
    } else {
      this.emit("message", {
        type: data.type,
        data: data
      });
    }
  }

  sendToHost(type, payload = {}) {
    if (this.isHost) {
      this.emit("message", {
        senderPeer: "host",
        senderPlayerId: this.playerId,
        type: type,
        data: { type, playerId: this.playerId, ...payload }
      });
      return;
    }

    if (this.hostConn && this.hostConn.open) {
      try {
        this.hostConn.send({
          type: type,
          playerId: this.playerId,
          ...payload
        });
      } catch (err) {
        console.warn(`[P2P Client] Errore invio messaggio ${type} all'host:`, err);
      }
    }
  }

  // =========================================================================
  // HOST RECONNECT GRACE PERIOD & HOST MIGRATION (FAILOVER)
  // =========================================================================

  handleClientConnectionLost() {
    if (this.isHost) return;
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    this.reconnectAttempts = 0;

    this.startHostGraceCountdown();
    this.attemptClientReconnect();
  }

  startHostGraceCountdown() {
    this.stopHostGraceCountdown();
    this.hostGraceRemainingSeconds = Math.round(this.hostGracePeriodMs / 1000);

    this.emit("host_grace_period_tick", {
      remainingSeconds: this.hostGraceRemainingSeconds,
      canMigrate: true
    });

    this.hostGraceCountdownTimer = setInterval(() => {
      this.hostGraceRemainingSeconds--;

      this.emit("host_grace_period_tick", {
        remainingSeconds: this.hostGraceRemainingSeconds,
        canMigrate: true
      });

      if (this.hostGraceRemainingSeconds <= 0) {
        this.stopHostGraceCountdown();
        this.triggerHostMigration();
      }
    }, 1000);
  }

  stopHostGraceCountdown() {
    clearInterval(this.hostGraceCountdownTimer);
    this.hostGraceCountdownTimer = null;
    this.hostGraceRemainingSeconds = 0;
  }

  attemptClientReconnect() {
    if (!this.isReconnecting) return;
    this.reconnectAttempts++;

    console.log(`[P2P Client] Tentativo riconnessione #${this.reconnectAttempts} con l'Host...`);

    try {
      if (this.peer && !this.peer.destroyed) {
        this.connectToHost(true);
      } else {
        this.joinRoom(this.roomCode, this.playerName);
      }
    } catch (e) {
      console.warn("[P2P Client] Errore durante riconnessione:", e);
    }

    if (this.hostGraceRemainingSeconds > 0) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => {
        if (this.isReconnecting && this.hostGraceRemainingSeconds > 0) {
          this.attemptClientReconnect();
        }
      }, 3000);
    }
  }

  triggerHostMigration() {
    console.log("[P2P Migration] Finestra di grazia scaduta. Avvio migrazione dell'Host...");
    clearTimeout(this.reconnectTimer);
    this.isReconnecting = false;

    const availableCandidates = this.players.filter(p => !p.isHost && p.online !== false);

    if (availableCandidates.length === 0) {
      console.warn("[P2P Migration] Nessun giocatore disponibile per la promozione ad Host.");
      this.emit("host_migration_failed", "Tutti i partecipanti sono disconnessi.");
      return;
    }

    const newHostCandidate = availableCandidates[0];
    const isMeNewHost = (newHostCandidate.playerId === this.playerId) || (newHostCandidate.id === this.myPeerId);

    console.log(`[P2P Migration] Nuovo Host eletto: ${newHostCandidate.name} (isMe: ${isMeNewHost})`);

    if (isMeNewHost) {
      this.promoteSelfToHost();
    } else {
      this.emit("host_migrated", {
        newHostName: newHostCandidate.name,
        newHostId: newHostCandidate.id
      });
      setTimeout(() => {
        this.joinRoom(this.roomCode, this.playerName);
      }, 1500);
    }
  }

  promoteSelfToHost() {
    console.log("[P2P Migration] Mi promuovo a nuovo Host della stanza...");
    this.isHost = true;
    this.cleanUp();

    this.players.forEach(p => {
      if (p.isHost) {
        p.online = false;
      }
      if (p.playerId === this.playerId) {
        p.isHost = true;
        p.id = "host";
        p.online = true;
      }
    });

    this.createRoom(this.roomCode);

    this.emit("promoted_to_host", {
      roomCode: this.roomCode,
      players: this.players
    });
  }

  cleanUp() {
    clearTimeout(this.reconnectTimer);
    this.stopHostGraceCountdown();

    if (this.hostConn) {
      try { this.hostConn.close(); } catch (e) {}
      this.hostConn = null;
    }

    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
      this.peer = null;
    }

    this.connections.clear();
  }
}

// Esporta globalmente e come modulo
if (typeof window !== "undefined") {
  window.P2PRoomManager = P2PRoomManager;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = P2PRoomManager;
}
