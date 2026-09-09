/**
 * Client di Rete Locale Wi-Fi per il Gioco dell'Impostore
 * Comunica con il server Python locale per sincronizzare Host e Smartphone
 */

class NetworkGameController {
  constructor() {
    let pid = null;
    let pname = "";
    try {
      pid = localStorage.getItem("impostore_net_player_id");
      pname = localStorage.getItem("impostore_net_player_name") || "";
    } catch (e) {}

    this.playerId = pid;
    this.playerName = pname;
    this.isHost = false;
    this.serverUrl = window.location.origin;
    this.pollInterval = null;
    this.roomState = null;
    this.mySecret = null;
    this.hasFetchedSecret = false;
    this.lanInfo = null;
    this.selectedVotePlayerId = null;

    // Gestione Hold to reveal per la versione di rete
    this.holdTimer = null;
    this.holdProgressInterval = null;
    this.holdStartTime = 0;
    this.isHolding = false;
    this.holdRequiredMs = 350;

    this.bindEvents();
  }

  bindEvents() {
    // Unisciti alla stanza (Pulsante Entra)
    const joinBtn = document.getElementById("net-join-btn");
    if (joinBtn) {
      joinBtn.addEventListener("click", () => this.joinRoom());
    }

    // Input invio con Invio da tastiera
    const nameInput = document.getElementById("net-player-name-input");
    if (nameInput) {
      nameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.joinRoom();
      });
    }

    // Copia Link LAN
    const copyUrlBtn = document.getElementById("net-copy-url-btn");
    if (copyUrlBtn) {
      copyUrlBtn.addEventListener("click", () => this.copyLanUrl());
    }

    // Host: Stepper impostori
    const minusBtn = document.getElementById("net-imp-minus");
    const plusBtn = document.getElementById("net-imp-plus");
    if (minusBtn && plusBtn) {
      minusBtn.addEventListener("click", () => this.adjustNetImpostors(-1));
      plusBtn.addEventListener("click", () => this.adjustNetImpostors(1));
    }

    // Host: Avvia partita
    const startBtn = document.getElementById("net-host-start-btn");
    if (startBtn) {
      startBtn.addEventListener("click", () => this.hostStartGame());
    }

    // Host: Avvia discussione
    const startDiscBtn = document.getElementById("net-host-start-disc-btn");
    if (startDiscBtn) {
      startDiscBtn.addEventListener("click", () => this.hostStartDiscussion());
    }

    // Host: Vai al voto
    const startVoteBtn = document.getElementById("net-host-start-vote-btn");
    if (startVoteBtn) {
      startVoteBtn.addEventListener("click", () => this.hostStartVoting());
    }

    // Host: Conferma verdetto
    const confirmVoteBtn = document.getElementById("net-confirm-vote-btn");
    if (confirmVoteBtn) {
      confirmVoteBtn.addEventListener("click", () => this.hostExecuteVote());
    }

    // Host: Reset / Rivincita
    const resetBtn = document.getElementById("net-rematch-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => this.hostResetRoom());
    }

    // Hold Reveal su smartphone
    const holdBtn = document.getElementById("net-hold-reveal-btn");
    if (holdBtn) {
      const startHold = (e) => {
        e.preventDefault();
        this.onHoldStart();
      };
      const endHold = (e) => {
        e.preventDefault();
        this.onHoldEnd();
      };

      holdBtn.addEventListener("pointerdown", startHold);
      window.addEventListener("pointerup", endHold);
      window.addEventListener("pointercancel", endHold);

      holdBtn.addEventListener("touchstart", startHold, { passive: false });
      window.addEventListener("touchend", endHold, { passive: false });
      window.addEventListener("touchcancel", endHold, { passive: false });

      holdBtn.addEventListener("mousedown", startHold);
      window.addEventListener("mouseup", endHold);
    }
  }

  async initNetworkMode() {
    Sound.playClick();
    // Precarica info server LAN
    try {
      const res = await fetch("/api/info");
      if (res.ok) {
        this.lanInfo = await res.json();
        this.renderLanInfo();
      }
    } catch (e) {
      console.warn("Impossibile caricare /api/info (forse aperto come file:// locale):", e);
    }

    // Popola categorie host
    this.renderNetCategories();

    // Se c'è già un nome salvato, precompila il campo
    const nameInput = document.getElementById("net-player-name-input");
    if (nameInput && this.playerName) {
      nameInput.value = this.playerName;
    }

    window.App.switchView("view-network-join");
  }

  renderLanInfo() {
    if (!this.lanInfo) return;
    const urlDisplay = document.getElementById("net-lan-url");
    if (urlDisplay) urlDisplay.textContent = this.lanInfo.url;

    // Genera QR Code
    const qrContainer = document.getElementById("net-qrcode-container");
    if (qrContainer && window.QRCode) {
      qrContainer.innerHTML = "";
      try {
        new window.QRCode(qrContainer, {
          text: this.lanInfo.url,
          width: 180,
          height: 180,
          colorDark: "#090d16",
          colorLight: "#ffffff"
        });
      } catch (e) {
        console.error("Errore generazione QR:", e);
      }
    }
  }

  copyLanUrl() {
    if (!this.lanInfo) return;
    Sound.playClick();
    navigator.clipboard.writeText(this.lanInfo.url).then(() => {
      const btn = document.getElementById("net-copy-url-btn");
      if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = "✅ Copiato!";
        setTimeout(() => { btn.innerHTML = orig; }, 2000);
      }
    });
  }

  renderNetCategories() {
    const select = document.getElementById("net-category-select");
    if (!select) return;

    select.innerHTML = "";
    const cats = getAvailableCategories();
    cats.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      select.appendChild(opt);
    });
  }

  async joinRoom() {
    const nameInput = document.getElementById("net-player-name-input");
    const name = nameInput ? nameInput.value.trim() : "";
    if (!name) {
      alert("Inserisci il tuo nome per entrare!");
      return;
    }

    Sound.playClick();
    this.playerName = name;
    localStorage.setItem("impostore_net_player_name", name);

    try {
      const res = await fetch("/api/room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_name: this.playerName,
          player_id: this.playerId
        })
      });

      if (!res.ok) throw new Error("Errore durante l'accesso alla stanza");

      const data = await res.json();
      this.playerId = data.player_id;
      this.isHost = data.is_host;
      localStorage.setItem("impostore_net_player_id", this.playerId);

      // Passa alla lobby
      window.App.switchView("view-network-lobby");
      this.startPolling();
    } catch (err) {
      alert("Errore di connessione al server: " + err.message);
    }
  }

  startPolling() {
    this.stopPolling();
    this.pollState();
    this.pollInterval = setInterval(() => this.pollState(), 1200);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async pollState() {
    if (!this.playerId) return;
    try {
      const res = await fetch(`/api/room/state?player_id=${encodeURIComponent(this.playerId)}`);
      if (!res.ok) return;

      const state = await res.json();
      this.handleStateUpdate(state);
    } catch (e) {
      // Ignora errori di connessione temporanei nel polling
    }
  }

  handleStateUpdate(state) {
    const prevStatus = this.roomState ? this.roomState.status : null;
    this.roomState = state;
    this.isHost = state.host_id === this.playerId;

    // Aggiorna interfaccia Host vs Giocatore Normale
    const hostControls = document.getElementById("net-host-controls-panel");
    const clientWaiting = document.getElementById("net-client-waiting-panel");
    if (hostControls && clientWaiting) {
      hostControls.style.display = this.isHost ? "block" : "none";
      clientWaiting.style.display = this.isHost ? "none" : "block";
    }

    // Aggiorna lista giocatori connessi
    this.renderLobbyPlayers(state.players);

    // Gestione transizioni di stato
    if (state.status === "lobby") {
      this.hasFetchedSecret = false;
      this.mySecret = null;
      if (prevStatus !== "lobby") {
        window.App.switchView("view-network-lobby");
      }
    } else if (state.status === "revealing") {
      if (!this.hasFetchedSecret) {
        this.fetchMySecret();
      }
      if (prevStatus !== "revealing") {
        window.App.switchView("view-network-secret");
      }
      // Se l'host è in revealing, mostra pulsante per avviare discussione
      const hostNextBtn = document.getElementById("net-host-start-disc-btn");
      if (hostNextBtn) hostNextBtn.style.display = this.isHost ? "inline-flex" : "none";
    } else if (state.status === "discussion") {
      if (prevStatus !== "discussion") {
        window.App.switchView("view-network-discussion");
        Sound.playFanfare();
        const starterEl = document.getElementById("net-starter-player-name");
        if (starterEl) starterEl.textContent = state.starter_name || "Nessuno";
      }
      const hostVoteBtn = document.getElementById("net-host-start-vote-btn");
      if (hostVoteBtn) hostVoteBtn.style.display = this.isHost ? "inline-flex" : "none";
    } else if (state.status === "voting") {
      if (prevStatus !== "voting") {
        window.App.switchView("view-network-voting");
        this.renderNetVotingCards(state.players);
      }
    } else if (state.status === "game_over") {
      if (prevStatus !== "game_over") {
        window.App.switchView("view-network-game-over");
        this.renderNetGameOver(state);
      }
    }
  }

  renderLobbyPlayers(players) {
    const listEl = document.getElementById("net-lobby-players-list");
    const countEl = document.getElementById("net-players-count");
    if (countEl) countEl.textContent = players.length;

    if (!listEl) return;
    listEl.innerHTML = "";

    players.forEach(p => {
      const chip = document.createElement("div");
      chip.className = `lobby-player-chip ${p.id === this.playerId ? "is-you" : ""} ${p.is_host ? "is-host" : ""}`;
      
      const dot = document.createElement("span");
      dot.className = "pulse-dot";

      const name = document.createElement("span");
      let badge = "";
      if (p.is_host) badge = " (Host 👑)";
      else if (p.id === this.playerId) badge = " (Tu)";
      name.textContent = `${p.name}${badge}`;

      chip.appendChild(dot);
      chip.appendChild(name);
      listEl.appendChild(chip);
    });

    // Aggiorna limiti impostori per l'host
    const startBtn = document.getElementById("net-host-start-btn");
    if (startBtn) {
      startBtn.disabled = players.length < 3;
      if (players.length < 3) {
        startBtn.textContent = `Servono almeno 3 giocatori (${players.length}/3)`;
      } else {
        startBtn.textContent = "🚀 Avvia Partita per Tutti";
      }
    }
  }

  adjustNetImpostors(delta) {
    Sound.playClick();
    const playerCount = this.roomState ? this.roomState.player_count : 4;
    const maxImp = Math.max(1, Math.floor((playerCount - 1) / 2));
    let cur = parseInt(document.getElementById("net-imp-value")?.textContent || "1");
    cur = Math.max(1, Math.min(maxImp, cur + delta));

    const valEl = document.getElementById("net-imp-value");
    if (valEl) valEl.textContent = cur;

    const minusBtn = document.getElementById("net-imp-minus");
    const plusBtn = document.getElementById("net-imp-plus");
    if (minusBtn) minusBtn.disabled = cur <= 1;
    if (plusBtn) plusBtn.disabled = cur >= maxImp;
  }

  async hostStartGame() {
    Sound.playClick();
    const impVal = parseInt(document.getElementById("net-imp-value")?.textContent || "1");
    const catVal = document.getElementById("net-category-select")?.value || "random";

    try {
      const res = await fetch("/api/room/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_id: this.playerId,
          impostor_count: impVal,
          category: catVal
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Errore durante l'avvio");
      }
    } catch (e) {
      alert("Errore di connessione: " + e.message);
    }
  }

  async fetchMySecret() {
    this.hasFetchedSecret = true;
    try {
      const res = await fetch(`/api/room/my_secret?player_id=${encodeURIComponent(this.playerId)}`);
      if (!res.ok) return;

      this.mySecret = await res.json();
      this.renderSecretCard();
    } catch (e) {
      console.error("Errore fetch segreto:", e);
    }
  }

  renderSecretCard() {
    const card = document.getElementById("net-secret-revealed-card");
    const holdBtn = document.getElementById("net-hold-reveal-btn");
    const progressBar = document.getElementById("net-hold-progress-bar");

    if (card) card.style.display = "none";
    if (holdBtn) {
      holdBtn.style.display = "flex";
      holdBtn.classList.remove("holding");
    }
    if (progressBar) progressBar.style.width = "0%";
  }

  onHoldStart() {
    if (this.isHolding || !this.mySecret) return;
    this.isHolding = true;
    this.holdStartTime = Date.now();

    const holdBtn = document.getElementById("net-hold-reveal-btn");
    const progressBar = document.getElementById("net-hold-progress-bar");
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

    const holdBtn = document.getElementById("net-hold-reveal-btn");
    const progressBar = document.getElementById("net-hold-progress-bar");
    const card = document.getElementById("net-secret-revealed-card");

    if (holdBtn) holdBtn.classList.remove("holding");
    if (progressBar) progressBar.style.width = "0%";

    if (card && card.style.display !== "none") {
      card.style.display = "none";
      if (holdBtn) holdBtn.style.display = "flex";
    }
  }

  revealMyRole() {
    if (!this.mySecret) return;
    const card = document.getElementById("net-secret-revealed-card");
    const holdBtn = document.getElementById("net-hold-reveal-btn");
    if (!card) return;

    card.className = `secret-card ${this.mySecret.is_impostor ? "impostor" : "innocent"}`;

    if (this.mySecret.is_impostor) {
      Sound.playImpostorReveal();
      card.innerHTML = `
        <div class="secret-badge">Allerta Intrusione ⚠️</div>
        <div class="impostor-title">SEI L'IMPOSTORE!</div>
        <p class="impostor-warning">
          Non conosci la parola segreta! Ascolta gli altri compagni, bluffa con astuzia e cerca di non farti scoprire.
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

  async hostStartDiscussion() {
    Sound.playClick();
    await fetch("/api/room/start_discussion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: this.playerId })
    });
  }

  async hostStartVoting() {
    Sound.playClick();
    await fetch("/api/room/start_voting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: this.playerId })
    });
  }

  renderNetVotingCards(players) {
    const container = document.getElementById("net-vote-grid-container");
    const confirmBtn = document.getElementById("net-confirm-vote-btn");
    const hostNote = document.getElementById("net-host-vote-instruction");

    if (hostNote) {
      hostNote.textContent = this.isHost 
        ? "Tocca il giocatore che il gruppo ha deciso di accusare:"
        : "L'Host sta raccogliendo i voti sul proprio dispositivo...";
    }
    if (confirmBtn) {
      confirmBtn.style.display = this.isHost ? "inline-flex" : "none";
      confirmBtn.disabled = true;
    }

    if (!container) return;
    container.innerHTML = "";
    this.selectedVotePlayerId = null;

    players.forEach(p => {
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
          document.querySelectorAll("#net-vote-grid-container .vote-card").forEach(c => c.classList.remove("selected"));
          card.classList.add("selected");
          this.selectedVotePlayerId = p.id;
          if (confirmBtn) confirmBtn.disabled = false;
        });
      }

      container.appendChild(card);
    });
  }

  async hostExecuteVote() {
    if (!this.isHost || !this.selectedVotePlayerId) return;
    Sound.playClick();

    await fetch("/api/room/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_id: this.playerId,
        target_id: this.selectedVotePlayerId
      })
    });
  }

  renderNetGameOver(state) {
    const titleEl = document.getElementById("net-game-over-title");
    const iconEl = document.getElementById("net-game-over-icon");
    const descEl = document.getElementById("net-game-over-desc");
    const impostorsListEl = document.getElementById("net-game-over-impostors-list");
    const wordEl = document.getElementById("net-game-over-word");
    const rematchBtn = document.getElementById("net-rematch-btn");

    if (rematchBtn) rematchBtn.style.display = this.isHost ? "inline-flex" : "none";

    const voted = state.voted_player;
    if (!voted) return;

    if (voted.was_impostor) {
      Sound.playFanfare();
      if (titleEl) {
        titleEl.textContent = "Vittoria dei Cittadini!";
        titleEl.className = "game-over-title citizens-win";
      }
      if (iconEl) iconEl.textContent = "🎉";
      if (descEl) {
        descEl.innerHTML = `<strong>${voted.name}</strong> era davvero <strong>L'IMPOSTORE!</strong> Complimenti!`;
      }
    } else {
      Sound.playImpostorReveal();
      if (titleEl) {
        titleEl.textContent = "L'Impostore Ha Vinto!";
        titleEl.className = "game-over-title impostor-wins";
      }
      if (iconEl) iconEl.textContent = "😈";
      if (descEl) {
        descEl.innerHTML = `<strong>${voted.name}</strong> era innocente! Gli impostori sono rimasti nell'ombra.`;
      }
    }

    if (impostorsListEl && state.impostors) {
      impostorsListEl.innerHTML = state.impostors.map(name => `
        <div class="impostor-pill">🕵️ ${name}</div>
      `).join("");
    }

    if (wordEl && state.secret_word) {
      wordEl.textContent = `${state.secret_word} (${state.category_name || ""})`;
    }
  }

  async hostResetRoom() {
    if (!this.isHost) return;
    Sound.playClick();
    await fetch("/api/room/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: this.playerId })
    });
  }
}
