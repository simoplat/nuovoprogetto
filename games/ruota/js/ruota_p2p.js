/**
 * ruota_p2p.js - Controller di Rete P2P per La Ruota della Fortuna
 * 
 * Si interfaccia con P2PRoomManager (WebRTC DataChannel / PeerJS)
 * per coordinare i turni di gioco, il tabellone luminoso, i punteggi
 * e le azioni dei giocatori da remoto via smartphone o PC.
 */

class RuotaP2PController {
  constructor(app) {
    this.app = app;
    this.room = null;
    this.isHost = false;
    this.roomCode = "";
    this.playerName = "";

    try {
      this.playerName = localStorage.getItem("ruota_player_name") || "";
    } catch (e) {}

    // Stato partita sincronizzato
    this.players = []; // [{ id, playerId, name, isHost, online, roundScore, totalScore }]
    this.activePlayerIndex = 0;
    this.currentWedge = null;
    this.turnState = "idle"; // "idle" | "awaiting_spin" | "spinning" | "awaiting_letter" | "awaiting_solve"
    this.usedLetters = {}; // letter -> { found: boolean, count: number }

    this.onStateChange = null;
  }

  initRoom(isHost = false, roomCode = "") {
    this.isHost = isHost;
    this.roomCode = roomCode ? roomCode.toUpperCase() : "";

    this.room = new P2PRoomManager({
      peerPrefix: "ruota-p2p-"
    });

    if (this.playerName) {
      this.room.setPlayerName(this.playerName);
    }

    // Registra listener eventi di rete P2PRoomManager
    this.room.on("player_joined", (player) => this.handlePlayerJoined(player));
    this.room.on("player_left", (data) => this.handlePlayerLeft(data));
    this.room.on("player_reconnected", (data) => this.handlePlayerReconnected(data));
    this.room.on("data", (data) => this.handleIncomingMessage(data));
    this.room.on("host_migrated", (data) => this.handleHostMigrated(data));
  }

  // =========================================================================
  // GESTIONE CONCESSIONE STANZA & PEER
  // =========================================================================

  async createRoom(playerName) {
    this.playerName = playerName;
    this.initRoom(true);

    const pin = await this.room.createRoom(playerName);
    this.roomCode = pin;

    // Aggiungi l'host come primo giocatore
    this.players = [{
      id: this.room.myPeerId,
      playerId: this.room.playerId,
      name: playerName + " (Master)",
      isHost: true,
      online: true,
      roundScore: 0,
      totalScore: 0
    }];

    return pin;
  }

  async joinRoom(roomCode, playerName) {
    this.playerName = playerName;
    this.initRoom(false, roomCode);

    await this.room.joinRoom(roomCode, playerName);
    return true;
  }

  disconnect() {
    if (this.room) {
      this.room.leaveRoom();
      this.room = null;
    }
  }

  // =========================================================================
  // GESTIONE EVENTI GIOCATORI
  // =========================================================================

  handlePlayerJoined(player) {
    if (!this.isHost) return;

    // Controlla se il giocatore esisteva già (riconnessione)
    const existing = this.players.find(p => p.playerId === player.playerId);
    if (existing) {
      existing.online = true;
      existing.id = player.id;
      existing.name = player.name;
    } else {
      this.players.push({
        id: player.id,
        playerId: player.playerId,
        name: player.name,
        isHost: false,
        online: true,
        roundScore: 0,
        totalScore: 0
      });
    }

    // Invia stato completo al nuovo arrivato
    this.broadcastFullState();
  }

  handlePlayerLeft(data) {
    const p = this.players.find(pl => pl.playerId === data.playerId);
    if (p) p.online = false;
    if (this.isHost) {
      this.broadcastFullState();
    }
  }

  handlePlayerReconnected(data) {
    const p = this.players.find(pl => pl.playerId === data.playerId);
    if (p) p.online = true;
    if (this.isHost) {
      this.broadcastFullState();
    }
  }

  handleHostMigrated(data) {
    console.log("[RuotaP2P] Host migrato a:", data.newHostPlayerId);
    if (data.newHostPlayerId === this.room.playerId) {
      this.isHost = true;
    }
  }

  // =========================================================================
  // MESSAGGI PROTOCOLLO DI GIOCO
  // =========================================================================

  handleIncomingMessage({ sender, payload }) {
    if (!payload || !payload.type) return;

    switch (payload.type) {
      case "RUOTA_FULL_STATE":
        this.applyFullState(payload.state);
        break;

      case "RUOTA_START_SPIN":
        if (this.app) {
          this.app.onRemoteSpinStarted(payload.wedgeIndex);
        }
        break;

      case "RUOTA_SPIN_RESULT":
        if (this.app) {
          this.app.onRemoteSpinResult(payload.wedge);
        }
        break;

      case "RUOTA_LETTER_REVEAL":
        if (this.app) {
          this.app.onRemoteLetterReveal(payload.letter, payload.result);
        }
        break;

      case "RUOTA_SOLVE_RESULT":
        if (this.app) {
          this.app.onRemoteSolveResult(payload);
        }
        break;

      case "CLIENT_SPIN_REQUEST":
        if (this.isHost && this.app) {
          this.app.handleClientSpinRequest(payload.playerId);
        }
        break;

      case "CLIENT_CALL_LETTER":
        if (this.isHost && this.app) {
          this.app.handleClientCallLetter(payload.playerId, payload.letter);
        }
        break;

      case "CLIENT_SOLVE_REQUEST":
        if (this.isHost && this.app) {
          this.app.handleClientSolveRequest(payload.playerId, payload.solution);
        }
        break;

      case "RUOTA_EMOTE":
        if (this.app) {
          this.app.showEmote(payload.senderName, payload.emoji);
        }
        break;
    }
  }

  // =========================================================================
  // BROADCAST E SINCRONIZZAZIONE (HOST -> TUTTI)
  // =========================================================================

  broadcastFullState() {
    if (!this.isHost || !this.room) return;

    const boardState = this.app && this.app.board ? this.app.board.getState() : null;

    const state = {
      players: this.players,
      activePlayerIndex: this.activePlayerIndex,
      currentWedge: this.currentWedge,
      turnState: this.turnState,
      usedLetters: this.usedLetters,
      boardState: boardState,
      category: this.app ? this.app.currentCategory : "",
      roundActive: this.app ? this.app.roundActive : false
    };

    this.room.broadcast({
      type: "RUOTA_FULL_STATE",
      state: state
    });

    if (this.onStateChange) this.onStateChange(state);
  }

  applyFullState(state) {
    if (!state) return;

    this.players = state.players || [];
    this.activePlayerIndex = state.activePlayerIndex || 0;
    this.currentWedge = state.currentWedge;
    this.turnState = state.turnState || "idle";
    this.usedLetters = state.usedLetters || {};

    if (this.app) {
      this.app.applyRemoteState(state);
    }

    if (this.onStateChange) this.onStateChange(state);
  }

  // Notifica avvio spin
  broadcastSpinStart(wedgeIndex) {
    if (!this.isHost || !this.room) return;
    this.room.broadcast({
      type: "RUOTA_START_SPIN",
      wedgeIndex: wedgeIndex
    });
  }

  // Notifica risultato spin
  broadcastSpinResult(wedge) {
    if (!this.isHost || !this.room) return;
    this.currentWedge = wedge;
    this.room.broadcast({
      type: "RUOTA_SPIN_RESULT",
      wedge: wedge
    });
  }

  // Notifica illuminazione e svelamento lettera
  broadcastLetterReveal(letter, result) {
    if (!this.isHost || !this.room) return;
    this.room.broadcast({
      type: "RUOTA_LETTER_REVEAL",
      letter: letter,
      result: result
    });
  }

  // Notifica risoluzione frase
  broadcastSolveResult(data) {
    if (!this.isHost || !this.room) return;
    this.room.broadcast({
      type: "RUOTA_SOLVE_RESULT",
      ...data
    });
  }

  // =========================================================================
  // AZIONI DEL CLIENT (CLIENT -> HOST)
  // =========================================================================

  sendSpinRequest() {
    if (this.isHost) {
      if (this.app) this.app.spinWheel();
      return;
    }
    if (!this.room) return;
    this.room.sendToHost({
      type: "CLIENT_SPIN_REQUEST",
      playerId: this.room.playerId
    });
  }

  sendCallLetter(letter) {
    if (this.isHost) {
      if (this.app) this.app.callLetter(letter);
      return;
    }
    if (!this.room) return;
    this.room.sendToHost({
      type: "CLIENT_CALL_LETTER",
      playerId: this.room.playerId,
      letter: letter.toUpperCase()
    });
  }

  sendSolveRequest(solution) {
    if (this.isHost) {
      if (this.app) this.app.verifySolution(solution);
      return;
    }
    if (!this.room) return;
    this.room.sendToHost({
      type: "CLIENT_SOLVE_REQUEST",
      playerId: this.room.playerId,
      solution: solution
    });
  }

  sendEmote(emoji) {
    if (!this.room) return;
    const msg = {
      type: "RUOTA_EMOTE",
      senderName: this.playerName || "Giocatore",
      emoji: emoji
    };
    if (this.isHost) {
      this.room.broadcast(msg);
      if (this.app) this.app.showEmote(msg.senderName, msg.emoji);
    } else {
      this.room.sendToHost(msg);
    }
  }

  // =========================================================================
  // UTILITY
  // =========================================================================

  getActivePlayer() {
    if (!this.players || this.players.length === 0) return null;
    return this.players[this.activePlayerIndex % this.players.length];
  }

  isMyTurn() {
    const active = this.getActivePlayer();
    if (!active || !this.room) return false;
    return active.playerId === this.room.playerId;
  }
}

// Esporta globalmente e per moduli Node
if (typeof window !== "undefined") {
  window.RuotaP2PController = RuotaP2PController;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = RuotaP2PController;
}
