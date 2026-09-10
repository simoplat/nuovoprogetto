/**
 * LupusGameController - Controller per "Lupus in Fabula" (Modalità Locale "Passa il Telefono")
 * 
 * Supporta:
 * - Selezione N giocatori (4-20) con interfaccia identica a L'Impostore (Nomi modificabili, aggiunta, nomi casuali)
 * - Selezione lupi obbligatori (< N / 2)
 * - Timer di discussione villaggio configurabile (con possibilità di terminare in anticipo)
 * - Ruoli speciali disattivabili a piacere:
 *   * Veggente 🔮
 *   * Guardia 🛡️ (sceglie ogni notte un cittadino da difendere con il suo scudo)
 *   * Strega 🧙‍♀️
 *   * Cupido 💘
 *   * La Donna (Meretrice) 💃
 * - Calcolo automatico Contadini
 * - Rivelazione di sicurezza con Hold-to-Reveal (la carta resta visibile solo tenendo premuto)
 * - Sequenza Unificata Continua: Notte -> Alba -> Discussione & Timer -> Votazione Rogo (selezione di 1 solo giocatore)
 * - Risoluzione della condanna con verifica vittoria e prosecuzione fluida al round / notte successiva
 */

// Configurazione probabilistica per la trasformazione dell'Infiltrato (Lupo Mannaro Latente)
const INFILTRATO_CONFIG = {
  baseChance: 0.10,      // Probabilità Notte 1: 10%
  chancePerNight: 0.08,  // Incremento a ogni notte successiva: +8% (Notte 2: 18%, Notte 3: 26%...)
  maxChance: 0.45        // SOGLIA MASSIMA MODIFICABILE (45%)
};

const LUPUS_ROLES = {
  lupo: {
    id: "lupo",
    name: "Lupo",
    faction: "lupi",
    factionLabel: "Branco dei Lupi 🐺",
    icon: "🐺",
    image: "img/lupus/lupo.jpg",
    color: "#ff2a5f",
    description: "Ogni notte ti svegli insieme agli altri Lupi per scegliere una vittima da sbranare. Di giorno, bluffa e confondi il villaggio per non farti mandare al rogo!",
    nightAction: "I Lupi aprono gli occhi insieme, si coordinano silenziosamente e indicano la vittima al Narratore."
  },
  veggente: {
    id: "veggente",
    name: "Veggente",
    faction: "villaggio",
    factionLabel: "Villaggio 🔮",
    icon: "🔮",
    image: "img/lupus/veggente.jpg",
    color: "#a855f7",
    description: "Ogni notte puoi interrogare il Narratore su un giocatore per scoprire se appartiene al Branco dei Lupi o agli innocenti. Guida il villaggio senza esporti troppo!",
    nightAction: "Il Veggente apre gli occhi e indica un giocatore. Il Narratore annuisce (Lupo) o scuote la testa (Non Lupo)."
  },
  guardia: {
    id: "guardia",
    name: "Guardia",
    faction: "villaggio",
    factionLabel: "Villaggio 🛡️",
    icon: "🛡️",
    image: "img/lupus/guardia.jpg",
    color: "#3b82f6",
    description: "Ogni notte indichi un giocatore (puoi scegliere anche te stesso) per proteggerlo con il suo scudo. Se i Lupi lo attaccano, sopravviverà!",
    nightAction: "La Guardia apre gli occhi e indica chi proteggere per la notte."
  },
  strega: {
    id: "strega",
    name: "Strega",
    faction: "villaggio",
    factionLabel: "Villaggio 🧙‍♀️",
    icon: "🧙‍♀️",
    image: "img/lupus/strega.jpg",
    color: "#10b981",
    description: "Possiedi 2 potenti pozioni utilizzabili una sola volta per partita: la Pozione di Vita per salvare chiunque tu scelga, e la Pozione di Morte per avvelenare un sospettato.",
    nightAction: "La Strega può decidere chi salvare con la Pozione di Vita (anche su chi non è attaccato) e chi eliminare con la Pozione di Morte."
  },
  cupido: {
    id: "cupido",
    name: "Cupido",
    faction: "villaggio",
    factionLabel: "Villaggio 💘",
    icon: "💘",
    image: "img/lupus/cupido.jpg",
    color: "#f43f5e",
    description: "Solo la Prima Notte, scagli le tue frecce su due giocatori legandoli per la vita. Se uno dei due muore in qualunque momento, l'altro muore all'istante di crepacuore!",
    nightAction: "Cupido apre gli occhi solo la prima notte e sceglie 2 giocatori da innamorare toccando loro la spalla."
  },
  donna: {
    id: "donna",
    name: "La Donna (Meretrice)",
    faction: "villaggio",
    factionLabel: "Villaggio 💃",
    icon: "💃",
    image: "img/lupus/donna.jpg",
    color: "#ec4899",
    description: "Ogni notte scegli un abitante da visitare per rifugiarti a casa sua. Se visiti un Lupo muori sbranata! Se i lupi attaccano te sei salva (non eri a casa), ma se sbranano il tuo ospite morite entrambi!",
    nightAction: "La Donna apre gli occhi e indica con chi trascorrerà la notte."
  },
  contadino: {
    id: "contadino",
    name: "Contadino",
    faction: "villaggio",
    factionLabel: "Villaggio 👨‍🌾",
    icon: "👨‍🌾",
    image: "img/lupus/contadino.jpg",
    color: "#eab308",
    description: "Non hai poteri notturni speciali. La tua forza risiede nella deduzione, nell'osservazione e nel voto diurno per mandare al rogo i Lupi Mannari!",
    nightAction: "I Contadini dormono sonni profondi durante tutta la notte."
  },
  giullare: {
    id: "giullare",
    name: "Il Giullare",
    faction: "solitario",
    factionLabel: "Fazione Solitaria 🃏",
    icon: "🃏",
    image: "img/lupus/giullare.jpg",
    color: "#f59e0b",
    description: "Il generatore di caos per eccellenza! Non appartieni a nessuna fazione e vinci UNICAMENTE se riesci a farti condannare al rogo dal villaggio. Comportati in modo ambiguo, semina il dubbio e fatti bruciare!",
    nightAction: "Il Giullare dorme sonni tranquilli tutta la notte sognando il suo rogo trionfale."
  },
  infiltrato: {
    id: "infiltrato",
    name: "Lupo Mannaro",
    faction: "lupi",
    factionLabel: "Branco dei Lupi 🐺🌕",
    icon: "🐺🌕",
    image: "img/lupus/lupo_mannaro.jpg",
    color: "#ef4444",
    description: "Umano affetto da licantropia latente! Dormi con gli umani e al Veggente appari Non Lupo, ma ogni notte il dado della Luna Piena può trasformarti definitivamente in un vero Lupo del branco! Una volta trasformato, ti sveglierai con i lupi e conterai a tutti gli effetti come lupo.",
    nightAction: "Ogni notte viene lanciato il dado della Luna Piena: se si trasforma, diventa per sempre un Lupo a tutti gli effetti (non può più tornare umano)."
  },
  lupo_bianco: {
    id: "lupo_bianco",
    name: "Il Lupo Bianco",
    faction: "solitario",
    factionLabel: "Fazione Solitaria 🐺❄️",
    icon: "🐺❄️",
    image: "img/lupus/lupo_bianco.jpg",
    color: "#38bdf8",
    description: "Ti svegli ogni notte con il branco e fingi alleanza. A notti alterne (notte 2, 4, 6...), però, ti svegli una seconda volta da solo e puoi sbranare uno degli altri lupi! Vinci SOLO se resti l'ultimo e unico sopravvissuto della partita.",
    nightAction: "Si sveglia con il branco per scegliere la vittima del villaggio. A notti alterne (pari) si sveglia da solo e può eliminare un compagno lupo."
  },
  lupo_stregone: {
    id: "lupo_stregone",
    name: "Il Lupo Stregone",
    faction: "lupi",
    factionLabel: "Branco dei Lupi 🐺🔮",
    icon: "🐺🔮",
    image: "img/lupus/lupo_stregone.jpg",
    color: "#9333ea",
    description: "Ti svegli con il branco dei Lupi ogni notte. Subito dopo, ti svegli da solo e puoi scagliare la tua maledizione: indica un abitante al Narratore. Se quel giocatore ha un potere notturno attivo (Guardia, Veggente, Strega, Beccamorto), il suo potere sarà bloccato per questa notte!",
    nightAction: "Si sveglia con i lupi. Subito dopo apre gli occhi da solo e indica un giocatore per bloccarne il potere notturno se attivo."
  },
  beccamorto: {
    id: "beccamorto",
    name: "Il Beccamorto",
    faction: "villaggio",
    factionLabel: "Villaggio ⚰️",
    icon: "⚰️",
    image: "img/lupus/beccamorto.jpg",
    color: "#64748b",
    description: "I morti ti parlano nel silenzio del cimitero. Dalla Notte 2 in poi, ogni notte il Narratore ti sveglia e ti rivela segretamente il ruolo esatto del giocatore morto nel round precedente (con 1 giorno di ritardo).",
    nightAction: "Dalla Notte 2 in poi, il Beccamorto apre gli occhi. Il Narratore gli mostra la carta o mima il ruolo del morto del round precedente."
  },
  idiota: {
    id: "idiota",
    name: "L'Idiota del Villaggio",
    faction: "villaggio",
    factionLabel: "Villaggio 🤡",
    icon: "🤡",
    image: "img/lupus/idiota.jpg",
    color: "#14b8a6",
    description: "Sei un membro innocente del Villaggio, ma i tuoi modi stralunati ingannano le visioni mistiche: se il Veggente ti scruta di notte, il Narratore gli risponderà falsamente che sei un LUPO! Difenditi dal rogo!",
    nightAction: "L'Idiota dorme sonni beati. Al Veggente risulterà falsamente come 'Lupo'."
  },
  cane_nero: {
    id: "cane_nero",
    name: "Il Cane Nero (Lupo Illusionista)",
    faction: "lupi",
    factionLabel: "Branco dei Lupi 🐕‍🦺",
    icon: "🐕‍🦺",
    image: "img/lupus/cane_nero.jpg",
    color: "#dc2626",
    description: "Sei un feroce Lupo Mannaro sotto le sembianze di un fedele segugio nero. Ti svegli ogni notte con il branco per scegliere la vittima. La tua abilità illusoria: al Veggente risulti insospettabile come 'NON Lupo'!",
    nightAction: "Si sveglia con il branco dei lupi ogni notte. Se il Veggente lo scruta, il Narratore risponde che è 'Non Lupo'."
  }
};

class LupusGameController {
  constructor() {
    this.players = this.loadSavedPlayers() || [
      "Marco", "Sofia", "Luca", "Giulia", "Matteo", "Elena"
    ];
    this.wolvesCount = 1;

    // Timer Discussione (come Impostore)
    this.discussionMinutes = 3;
    try {
      const savedMin = parseInt(localStorage.getItem("lupus_discussion_minutes"), 10);
      if (savedMin >= 1 && savedMin <= 10) this.discussionMinutes = savedMin;
    } catch (e) {}
    this.discussionSeconds = this.discussionMinutes * 60;
    this.initialDiscussionSeconds = this.discussionSeconds;
    this.discussionTimer = null;
    this.isDiscussionRunning = false;

    // Ruoli speciali abilitati
    this.enabledRoles = {
      veggente: true,
      guardia: true,
      strega: true,
      cupido: true,
      donna: false,
      giullare: false,
      infiltrato: false,
      lupo_bianco: false,
      lupo_stregone: false,
      beccamorto: false,
      idiota: false,
      cane_nero: false
    };

    // Stato partita
    this.assignments = []; // [{ id, name, roleKey, role, isAlive, isLover }]
    this.currentTurnIndex = 0;

    // Gestione Hold-to-Reveal di sicurezza (come Impostore)
    this.holdProgressInterval = null;
    this.holdStartTime = 0;
    this.isHolding = false;
    this.holdRequiredMs = 350;

    // Master Dashboard state: round continuo
    this.nightCount = 1;
    this.masterStepIndex = 0;
    this.selectedVotePlayerId = null;
    this.voteConfirmed = false;
    this.autoNextNightTimer = null;

    // Configurazione probabilità Infiltrato (modificabile da settings o codice)
    this.infiltratoConfig = { ...INFILTRATO_CONFIG };

    // Stato notturno interattivo e pozioni persistenti
    this.lovers = []; // [id1, id2]
    this.witchLifeUsed = false;
    this.witchDeathUsed = false;
    this.lastRoundDeaths = [];
    this.nightActions = {
      cupidoLovers: [],
      donnaTarget: null,
      wolfTarget: null,
      stregoneTarget: null,
      lupoBiancoTarget: null,
      guardTarget: null,
      seerTarget: null,
      witchHeal: false,
      witchHealTarget: null,
      witchKill: null,
      infiltratoRoll: null
    };
    this.nightResolved = false;
    this.preDawnAliveSnapshot = null;
    this.preDawnWitchLifeSnapshot = false;
    this.preDawnWitchDeathSnapshot = false;
    this.dawnReport = null;

    this.bindSetupEvents();
  }

  loadSavedPlayers() {
    try {
      const saved = localStorage.getItem("lupus_saved_players");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 4) return parsed;
      }
    } catch (e) {}
    return null;
  }

  savePlayers() {
    try {
      localStorage.setItem("lupus_saved_players", JSON.stringify(this.players));
    } catch (e) {}
  }

  // =========================================================================
  // SETUP & CONFIGURAZIONE (Stile L'Impostore)
  // =========================================================================

  bindSetupEvents() {
    // Stepper Lupi
    const minusWolves = document.getElementById("lupus-wolves-minus");
    const plusWolves = document.getElementById("lupus-wolves-plus");
    if (minusWolves && plusWolves) {
      minusWolves.addEventListener("click", () => this.adjustWolvesCount(-1));
      plusWolves.addEventListener("click", () => this.adjustWolvesCount(1));
    }

    // Stepper Durata Discussione
    const timeMinus = document.getElementById("lupus-time-minus");
    const timePlus = document.getElementById("lupus-time-plus");
    if (timeMinus && timePlus) {
      timeMinus.addEventListener("click", () => this.adjustDiscussionTime(-1));
      timePlus.addEventListener("click", () => this.adjustDiscussionTime(1));
    }

    // Aggiungi Giocatore
    const addBtn = document.getElementById("lupus-add-player-btn");
    if (addBtn) {
      addBtn.addEventListener("click", () => this.addNewPlayer());
    }

    // Nomi Rapidi Casuali
    const quickBtn = document.getElementById("lupus-quick-names-btn");
    if (quickBtn) {
      quickBtn.addEventListener("click", () => this.fillQuickNames());
    }

    // Tasti Ruoli Speciali (Checkbox/Toggles)
    [
      "veggente", "guardia", "strega", "cupido", "donna",
      "giullare", "infiltrato", "lupo_bianco", "lupo_stregone", "beccamorto", "idiota", "cane_nero"
    ].forEach(roleKey => {
      const toggle = document.getElementById(`lupus-toggle-${roleKey}`);
      if (toggle) {
        toggle.addEventListener("change", (e) => {
          this.enabledRoles[roleKey] = e.target.checked;
          Sound.playClick();
          this.validateRolesAndRenderSummary();
        });
      }
    });

    // Avvia Partita
    const startBtn = document.getElementById("lupus-btn-start-game");
    if (startBtn) {
      startBtn.addEventListener("click", () => this.startGame());
    }

    // Gestione Tasto Hold to Reveal (Tieni premuto per vedere di sicurezza)
    const holdBtn = document.getElementById("lupus-hold-reveal-btn");
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

      const secretCard = document.getElementById("lupus-secret-revealed-card");
      if (secretCard) {
        secretCard.addEventListener("pointerup", endHold);
        secretCard.addEventListener("touchend", endHold);
        secretCard.addEventListener("mouseup", endHold);
        secretCard.addEventListener("pointercancel", endHold);
        secretCard.addEventListener("touchcancel", endHold);
      }
    }

    // Tasto Avanzamento Turno Passa il Telefono
    const nextTurnBtn = document.getElementById("lupus-next-turn-btn");
    if (nextTurnBtn) {
      nextTurnBtn.addEventListener("click", () => this.nextTurn());
    }

    // Master Dashboard Step Controls (Scorrimento continuo di tutte le fasi)
    const nextStepBtn = document.getElementById("lupus-master-next-step");
    if (nextStepBtn) {
      nextStepBtn.addEventListener("click", () => this.masterNextStep());
    }

    const prevStepBtn = document.getElementById("lupus-master-prev-step");
    if (prevStepBtn) {
      prevStepBtn.addEventListener("click", () => this.masterPrevStep());
    }

    // Timer Discussione Giorno / Rogo
    const timerBtn = document.getElementById("lupus-timer-toggle-btn");
    if (timerBtn) {
      timerBtn.addEventListener("click", () => this.toggleDiscussionTimer());
    }

    // Concludi Timer in Anticipo & Vai al Voto del Rogo
    const earlyEndBtn = document.getElementById("lupus-end-discussion-early-btn");
    if (earlyEndBtn) {
      earlyEndBtn.addEventListener("click", () => this.endDiscussionEarly());
    }

    // Tasto Conferma Votazione del Rogo (Unico giocatore)
    const confirmVoteBtn = document.getElementById("lupus-confirm-vote-btn");
    if (confirmVoteBtn) {
      confirmVoteBtn.addEventListener("click", () => this.confirmRogoVote());
    }

    // Tasto Passa alla Notte Successiva
    const nextNightBtn = document.getElementById("lupus-btn-next-night");
    if (nextNightBtn) {
      nextNightBtn.addEventListener("click", () => this.startNextNight());
    }

    // Riavvia / Nuova Partita
    const resetGameBtn = document.getElementById("lupus-btn-restart-game");
    if (resetGameBtn) {
      resetGameBtn.addEventListener("click", () => {
        if (confirm("Vuoi iniziare una nuova partita con gli stessi giocatori?")) {
          this.startGame();
        }
      });
    }
  }

  renderSetupView() {
    this.renderPlayersList();
    this.ensureValidWolvesCount();
    this.updateWolvesDisplay();
    this.updateDiscussionTimeLimits();

    // Aggiorna checkbox ruoli
    Object.keys(this.enabledRoles).forEach(roleKey => {
      const toggle = document.getElementById(`lupus-toggle-${roleKey}`);
      if (toggle) toggle.checked = !!this.enabledRoles[roleKey];
    });

    this.validateRolesAndRenderSummary();
  }

  renderPlayersList() {
    const container = document.getElementById("lupus-players-container");
    const countEl = document.getElementById("lupus-players-count");
    if (!container) return;

    if (countEl) countEl.textContent = this.players.length;
    container.innerHTML = "";

    this.players.forEach((name, index) => {
      const row = document.createElement("div");
      row.className = "player-row";

      const numSpan = document.createElement("span");
      numSpan.className = "player-num";
      numSpan.textContent = `${index + 1}.`;

      const input = document.createElement("input");
      input.type = "text";
      input.className = "player-input";
      input.value = name;
      input.maxLength = 22;
      input.placeholder = `Nome giocatore ${index + 1}`;
      input.addEventListener("input", (e) => {
        this.players[index] = e.target.value.trim() || `Giocatore ${index + 1}`;
        this.savePlayers();
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "player-delete-btn";
      deleteBtn.innerHTML = "✖";
      deleteBtn.title = "Rimuovi giocatore";
      deleteBtn.disabled = this.players.length <= 4;
      deleteBtn.addEventListener("click", () => {
        if (this.players.length > 4) {
          Sound.playClick();
          this.players.splice(index, 1);
          this.savePlayers();
          this.renderPlayersList();
          this.ensureValidWolvesCount();
          this.validateRolesAndRenderSummary();
        }
      });

      row.appendChild(numSpan);
      row.appendChild(input);
      row.appendChild(deleteBtn);
      container.appendChild(row);
    });

    const addBtn = document.getElementById("lupus-add-player-btn");
    if (addBtn) addBtn.disabled = this.players.length >= 20;
  }

  addNewPlayer() {
    if (this.players.length >= 20) return;
    Sound.playClick();
    const newIdx = this.players.length + 1;
    this.players.push(`Giocatore ${newIdx}`);
    this.savePlayers();
    this.renderPlayersList();
    this.ensureValidWolvesCount();
    this.validateRolesAndRenderSummary();

    // Focus sull'ultimo input appena aggiunto
    setTimeout(() => {
      const container = document.getElementById("lupus-players-container");
      if (container && container.lastElementChild) {
        const input = container.lastElementChild.querySelector("input");
        if (input) input.focus();
      }
    }, 50);
  }

  fillQuickNames() {
    Sound.playClick();
    const italianNames = [
      "Marco", "Sofia", "Luca", "Giulia", "Andrea", "Chiara",
      "Matteo", "Elena", "Davide", "Valentina", "Lorenzo", "Federica",
      "Alessandro", "Francesca", "Gabriele", "Sara", "Simone", "Martina", "Tommaso", "Alice"
    ];
    const shuffled = [...italianNames].sort(() => 0.5 - Math.random());
    const count = Math.max(4, this.players.length);
    this.players = [];
    for (let i = 0; i < count; i++) {
      this.players.push(shuffled[i % shuffled.length]);
    }
    this.savePlayers();
    this.renderPlayersList();
    this.ensureValidWolvesCount();
    this.validateRolesAndRenderSummary();
  }

  adjustDiscussionTime(delta) {
    Sound.playClick();
    this.discussionMinutes = Math.max(1, Math.min(10, this.discussionMinutes + delta));
    this.initialDiscussionSeconds = this.discussionMinutes * 60;
    this.discussionSeconds = this.initialDiscussionSeconds;
    try { localStorage.setItem("lupus_discussion_minutes", this.discussionMinutes); } catch (e) {}
    this.updateDiscussionTimeLimits();
  }

  updateDiscussionTimeLimits() {
    const valEl = document.getElementById("lupus-time-value");
    if (valEl) valEl.textContent = `${this.discussionMinutes} min`;

    const minusBtn = document.getElementById("lupus-time-minus");
    const plusBtn = document.getElementById("lupus-time-plus");
    if (minusBtn) minusBtn.disabled = this.discussionMinutes <= 1;
    if (plusBtn) plusBtn.disabled = this.discussionMinutes >= 10;
  }

  adjustWolvesCount(delta) {
    Sound.playClick();
    const maxWolves = Math.max(1, Math.floor((this.players.length - 1) / 2));
    this.wolvesCount = Math.min(Math.max(1, this.wolvesCount + delta), maxWolves);
    this.updateWolvesDisplay();
    this.validateRolesAndRenderSummary();
  }

  ensureValidWolvesCount() {
    const maxWolves = Math.max(1, Math.floor((this.players.length - 1) / 2));
    if (this.wolvesCount > maxWolves) {
      this.wolvesCount = maxWolves;
    }
    if (this.wolvesCount < 1) {
      this.wolvesCount = 1;
    }
    this.updateWolvesDisplay();
  }

  updateWolvesDisplay() {
    const valEl = document.getElementById("lupus-wolves-value");
    if (valEl) valEl.textContent = this.wolvesCount;
  }

  validateRolesAndRenderSummary() {
    const summaryBox = document.getElementById("lupus-roles-summary");
    const startBtn = document.getElementById("lupus-btn-start-game");
    if (!summaryBox) return;

    const total = this.players.length;
    const wolves = this.wolvesCount;

    let specials = 0;
    const activeSpecialNames = [];
    if (this.enabledRoles.veggente) { specials++; activeSpecialNames.push("1 Veggente 🔮"); }
    if (this.enabledRoles.guardia) { specials++; activeSpecialNames.push("1 Guardia 🛡️"); }
    if (this.enabledRoles.strega) { specials++; activeSpecialNames.push("1 Strega 🧙‍♀️"); }
    if (this.enabledRoles.cupido) { specials++; activeSpecialNames.push("1 Cupido 💘"); }
    if (this.enabledRoles.donna) { specials++; activeSpecialNames.push("1 Donna 💃"); }
    if (this.enabledRoles.beccamorto) { specials++; activeSpecialNames.push("1 Beccamorto ⚰️"); }
    if (this.enabledRoles.idiota) { specials++; activeSpecialNames.push("1 Idiota 🤡"); }
    if (this.enabledRoles.lupo_stregone) { specials++; activeSpecialNames.push("1 Lupo Stregone 🐺🔮"); }
    if (this.enabledRoles.cane_nero) { specials++; activeSpecialNames.push("1 Cane Nero 🐕‍🦺"); }
    if (this.enabledRoles.infiltrato) { specials++; activeSpecialNames.push("1 Lupo Mannaro 🐺🌕"); }
    if (this.enabledRoles.giullare) { specials++; activeSpecialNames.push("1 Giullare 🃏"); }
    if (this.enabledRoles.lupo_bianco) { specials++; activeSpecialNames.push("1 Lupo Bianco 🐺❄️"); }

    const peasants = total - (wolves + specials);

    if (peasants < 0) {
      summaryBox.className = "lupus-summary-box error";
      summaryBox.innerHTML = `
        <div style="color: var(--accent-danger); font-weight: 700;">⚠️ Troppi ruoli speciali selezionati!</div>
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
          Con ${total} giocatori e ${wolves} lupi base, puoi attivare al massimo ${Math.max(0, total - wolves)} figure speciali. Disattivane qualcuna per procedere.
        </div>
      `;
      if (startBtn) startBtn.disabled = true;
      return;
    }

    if (startBtn) startBtn.disabled = false;
    summaryBox.className = "lupus-summary-box";

    const parts = [`<strong>${wolves}</strong> Lup${wolves === 1 ? "o" : "i"} Base 🐺`];
    if (activeSpecialNames.length > 0) {
      parts.push(activeSpecialNames.join(", "));
    }
    if (peasants > 0) {
      parts.push(`<strong>${peasants}</strong> Contadin${peasants === 1 ? "o" : "i"} 👨‍🌾`);
    } else {
      parts.push(`<span style="color: var(--accent-warning);">0 Contadini</span>`);
    }

    summaryBox.innerHTML = `
      <div style="font-size: 0.82rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px;">Composizione Villaggio (${total} Giocatori):</div>
      <div style="font-size: 0.95rem; margin-top: 5px; line-height: 1.5; color: var(--text-primary);">${parts.join(" • ")}</div>
    `;
  }

  // =========================================================================
  // AVVIO PARTITA & DISTRIBUZIONE RUOLI
  // =========================================================================

  startGame() {
    Sound.playClick();

    // Raccogli nomi validi
    this.players = this.players.map((p, idx) => (p || "").trim() || `Giocatore ${idx + 1}`);
    this.savePlayers();

    if (this.players.length < 4) {
      alert("Sono necessari almeno 4 giocatori per Lupus in Fabula!");
      return;
    }

    const total = this.players.length;
    const wolves = this.wolvesCount;
    const roleDeck = [];

    // 1. Inserisci Lupi base
    for (let i = 0; i < wolves; i++) {
      roleDeck.push("lupo");
    }

    // 2. Inserisci ruoli speciali attivi
    if (this.enabledRoles.veggente) roleDeck.push("veggente");
    if (this.enabledRoles.guardia) roleDeck.push("guardia");
    if (this.enabledRoles.strega) roleDeck.push("strega");
    if (this.enabledRoles.cupido) roleDeck.push("cupido");
    if (this.enabledRoles.donna) roleDeck.push("donna");
    if (this.enabledRoles.beccamorto) roleDeck.push("beccamorto");
    if (this.enabledRoles.idiota) roleDeck.push("idiota");
    if (this.enabledRoles.lupo_stregone) roleDeck.push("lupo_stregone");
    if (this.enabledRoles.cane_nero) roleDeck.push("cane_nero");
    if (this.enabledRoles.infiltrato) roleDeck.push("infiltrato");
    if (this.enabledRoles.giullare) roleDeck.push("giullare");
    if (this.enabledRoles.lupo_bianco) roleDeck.push("lupo_bianco");

    // 3. I restanti sono Contadini
    while (roleDeck.length < total) {
      roleDeck.push("contadino");
    }

    // 4. Mescola il mazzo (Fisher-Yates)
    for (let i = roleDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roleDeck[i], roleDeck[j]] = [roleDeck[j], roleDeck[i]];
    }

    // 5. Assegna a ciascun giocatore
    this.assignments = this.players.map((name, i) => {
      const roleKey = roleDeck[i];
      return {
        id: `p_${i}`,
        name: name,
        roleKey: roleKey,
        role: LUPUS_ROLES[roleKey],
        isAlive: true,
        isLover: false,
        isTransformed: false
      };
    });

    if (this.autoNextNightTimer) {
      clearInterval(this.autoNextNightTimer);
      this.autoNextNightTimer = null;
    }

    const victoryBanner = document.getElementById("lupus-victory-banner");
    if (victoryBanner) victoryBanner.style.display = "none";
    const gameoverWidget = document.getElementById("lupus-step-gameover-widget");
    if (gameoverWidget) gameoverWidget.style.display = "none";

    this.currentTurnIndex = 0;
    this.isHolding = false;
    this.nightCount = 1;
    this.masterStepIndex = 0;
    this.selectedVotePlayerId = null;
    this.voteConfirmed = false;

    this.lovers = [];
    this.witchLifeUsed = false;
    this.witchDeathUsed = false;
    this.lastRoundDeaths = [];
    this.nightActions = {
      cupidoLovers: [],
      donnaTarget: null,
      wolfTarget: null,
      stregoneTarget: null,
      lupoBiancoTarget: null,
      guardTarget: null,
      seerTarget: null,
      witchHeal: false,
      witchHealTarget: null,
      witchKill: null,
      infiltratoRoll: null
    };
    this.nightResolved = false;
    this.preDawnAliveSnapshot = null;
    this.dawnReport = null;

    window.App.switchView("view-lupus-pass");
    this.renderTurnReveal();
  }

  // =========================================================================
  // ROTAZIONE "PASSA IL TELEFONO" CON HOLD-TO-REVEAL (Stile L'Impostore)
  // =========================================================================

  renderTurnReveal() {
    const current = this.assignments[this.currentTurnIndex];
    if (!current) return;

    const targetNameEl = document.getElementById("lupus-pass-target-name");
    const progressEl = document.getElementById("lupus-pass-progress-chip");
    const promptWrap = document.getElementById("lupus-pass-prompt-wrap");
    const secretCard = document.getElementById("lupus-secret-revealed-card");
    const holdBtn = document.getElementById("lupus-hold-reveal-btn");
    const nextBtnContainer = document.getElementById("lupus-pass-next-btn-container");
    const progressBar = document.getElementById("lupus-hold-progress-bar");
    const nextTurnBtn = document.getElementById("lupus-next-turn-btn");

    if (targetNameEl) targetNameEl.textContent = current.name;
    if (progressEl) progressEl.textContent = `Giocatore ${this.currentTurnIndex + 1} di ${this.assignments.length}`;
    if (promptWrap) promptWrap.style.display = "block";

    if (secretCard) secretCard.style.display = "none";
    document.body.style.overflow = "";
    if (holdBtn) {
      holdBtn.style.display = "flex";
      holdBtn.classList.remove("holding");
    }
    if (nextBtnContainer) nextBtnContainer.style.display = "none";
    if (progressBar) progressBar.style.width = "0%";

    if (nextTurnBtn) {
      if (this.currentTurnIndex < this.assignments.length - 1) {
        nextTurnBtn.innerHTML = "✅ Ho visto! Passa al prossimo giocatore";
      } else {
        nextTurnBtn.innerHTML = "📜 Ho visto! Vai alla Guida del Narratore";
      }
    }

    window.scrollTo(0, 0);
  }

  onHoldStart() {
    if (this.isHolding) return;
    this.isHolding = true;
    this.holdStartTime = Date.now();

    const holdBtn = document.getElementById("lupus-hold-reveal-btn");
    const progressBar = document.getElementById("lupus-hold-progress-bar");
    if (holdBtn) holdBtn.classList.add("holding");

    Sound.playHoldTick();

    clearInterval(this.holdProgressInterval);
    this.holdProgressInterval = setInterval(() => {
      const elapsed = Date.now() - this.holdStartTime;
      const pct = Math.min(100, (elapsed / this.holdRequiredMs) * 100);
      if (progressBar) progressBar.style.width = `${pct}%`;

      if (elapsed >= this.holdRequiredMs) {
        clearInterval(this.holdProgressInterval);
        this.revealCardContent();
      }
    }, 25);
  }

  onHoldEnd() {
    if (!this.isHolding) return;
    this.isHolding = false;
    clearInterval(this.holdProgressInterval);

    const holdBtn = document.getElementById("lupus-hold-reveal-btn");
    const progressBar = document.getElementById("lupus-hold-progress-bar");
    const promptWrap = document.getElementById("lupus-pass-prompt-wrap");
    const progressEl = document.getElementById("lupus-pass-progress-chip");
    if (holdBtn) holdBtn.classList.remove("holding");
    if (progressBar) progressBar.style.width = "0%";

    // Ripristina lo scroll del body
    document.body.style.overflow = "";

    // Per sicurezza la carta modale viene occultata all'istante non appena si rilascia il dito
    const secretCard = document.getElementById("lupus-secret-revealed-card");
    const nextBtnContainer = document.getElementById("lupus-pass-next-btn-container");
    if (secretCard && secretCard.style.display !== "none") {
      secretCard.style.display = "none";
      if (promptWrap) promptWrap.style.display = "block";
      if (progressEl) progressEl.textContent = `Giocatore ${this.currentTurnIndex + 1} di ${this.assignments.length}`;
      if (holdBtn) holdBtn.style.display = "flex";
      if (nextBtnContainer) nextBtnContainer.style.display = "block";
    }
  }

  revealCardContent() {
    const current = this.assignments[this.currentTurnIndex];
    if (!current) return;

    const secretCard = document.getElementById("lupus-secret-revealed-card");
    const holdBtn = document.getElementById("lupus-hold-reveal-btn");
    const promptWrap = document.getElementById("lupus-pass-prompt-wrap");
    const progressEl = document.getElementById("lupus-pass-progress-chip");
    if (!secretCard) return;

    const role = current.role;

    // Ottimizzazione visuale: nascondi istruzioni ingombranti e mostra nome sul badge compatto
    if (promptWrap) promptWrap.style.display = "none";
    if (progressEl) {
      progressEl.innerHTML = `👤 <strong>${current.name}</strong> • Giocatore ${this.currentTurnIndex + 1} di ${this.assignments.length}`;
    }

    // Popola carta
    const imgEl = document.getElementById("lupus-card-img");
    const titleEl = document.getElementById("lupus-card-title");
    const factionEl = document.getElementById("lupus-card-faction");
    const descEl = document.getElementById("lupus-card-desc");
    const alliesBox = document.getElementById("lupus-card-allies-box");
    const alliesList = document.getElementById("lupus-card-allies-list");
    const cardContainer = document.getElementById("lupus-card-box");

    if (imgEl) {
      imgEl.src = role.image;
      imgEl.alt = role.name;
    }
    if (titleEl) titleEl.textContent = role.name;
    if (factionEl) {
      factionEl.textContent = role.factionLabel;
      factionEl.className = `lupus-faction-badge faction-${role.faction}`;
    }
    if (descEl) descEl.textContent = role.description;

    if (cardContainer) {
      cardContainer.className = `lupus-tarot-card theme-${role.faction}`;
    }

    const isWakingWithWolves = ["lupo", "lupo_bianco", "lupo_stregone", "cane_nero"].includes(role.id);

    if (isWakingWithWolves) {
      Sound.playImpostorReveal();
      const otherWolves = this.assignments
        .filter(a => ["lupo", "lupo_bianco", "lupo_stregone", "cane_nero"].includes(a.roleKey) && a.name !== current.name)
        .map(a => a.name);

      if (alliesBox && alliesList) {
        alliesBox.style.display = "block";
        const titleSpan = alliesBox.querySelector(".lupus-allies-title");
        if (titleSpan) {
          titleSpan.textContent = role.id === "lupo_bianco"
            ? "🐺 Branco con cui fingi alleanza (Lupi):"
            : "🐺 Compagni del Branco (Lupi):";
        }
        if (otherWolves.length > 0) {
          alliesList.innerHTML = otherWolves.map(name => `
            <span class="lupus-ally-pill">🐺 ${name} (Lupo)</span>
          `).join(" ");
        } else {
          alliesList.innerHTML = `<span class="lupus-ally-pill solo">Sei l'unico Lupo del branco! 🐺</span>`;
        }
      }
    } else {
      Sound.playInnocentReveal();
      if (alliesBox) alliesBox.style.display = "none";
    }

    if (holdBtn) holdBtn.style.display = "none";
    secretCard.style.display = "flex";
    document.body.style.overflow = "hidden";
    const modalTheme = role.faction === "lupi" ? "impostor" : role.faction === "solitario" ? "solitario" : "innocent";
    secretCard.className = `secret-card lupus-card-modal-overlay ${modalTheme}`;

    // Fissa la vista in alto per evitare che scenda e tagli
    window.scrollTo(0, 0);
  }

  nextTurn() {
    Sound.playClick();
    this.currentTurnIndex++;

    if (this.currentTurnIndex < this.assignments.length) {
      this.renderTurnReveal();
    } else {
      // Tutti i partecipanti hanno scoperto la loro identità: vai alla Guida Narratore
      this.initMasterDashboard();
      window.App.switchView("view-lupus-master");
    }
  }

  // =========================================================================
  // DASHBOARD INTERATTIVA DEL NARRATORE (Sequenza Unificata Continua)
  // =========================================================================

  initMasterDashboard() {
    this.nightCount = 1;
    this.masterStepIndex = 0;
    this.selectedVotePlayerId = null;
    this.voteConfirmed = false;
    this.resetDiscussionTimer();

    this.renderMasterRoster();
    this.renderMasterPhaseGuide();
    this.checkVictoryCondition();
  }

  renderMasterRoster() {
    const grid = document.getElementById("lupus-master-roster");
    if (!grid) return;

    const steps = this.getRoundSteps();
    const curStep = steps[this.masterStepIndex];
    // Solo all'Alba (risveglio villaggio) è possibile segnare chi è morto nella notte!
    // Durante la notte, il dibattito e la votazione, lo stato è esclusivamente informativo.
    const isDawn = curStep && curStep.type === "dawn";
    const isStatusDisabled = !isDawn;

    const rosterLabel = document.getElementById("lupus-roster-label");
    if (rosterLabel) {
      if (!curStep) {
        rosterLabel.textContent = "👥 Registro Abitanti:";
      } else if (curStep.type === "dawn") {
        rosterLabel.textContent = "👥 Registro Abitanti (tocca per segnare chi è morto nella notte):";
      } else if (curStep.type === "night") {
        rosterLabel.textContent = "👥 Registro Abitanti (notte in corso • status informativo):";
      } else if (curStep.type === "discussion") {
        rosterLabel.textContent = "👥 Registro Abitanti (dibattito in corso • status informativo):";
      } else if (curStep.type === "voting") {
        rosterLabel.textContent = "👥 Registro Abitanti (Status informativo • Vota nella sezione sotto):";
      } else {
        rosterLabel.textContent = "👥 Registro Abitanti (status informativo):";
      }
    }

    grid.innerHTML = "";
    this.assignments.forEach(player => {
      const chip = document.createElement("div");
      chip.className = `lupus-roster-chip ${player.isAlive ? "alive" : "dead"} ${isStatusDisabled ? "readonly-phase" : ""}`;

      let btnTitle = "";
      if (isStatusDisabled) {
        if (curStep && curStep.type === "night") {
          btnTitle = "Durante la notte il villaggio dorme: annuncia i caduti al risveglio all'Alba.";
        } else if (curStep && curStep.type === "voting") {
          btnTitle = "Status informativo durante la votazione: seleziona e vota nella sezione apposita sottostante.";
        } else if (curStep && curStep.type === "discussion") {
          btnTitle = "Status informativo durante il dibattito: vota al rogo nel passaggio successivo.";
        } else {
          btnTitle = "Status informativo: modifica abilitata solo al risveglio all'Alba.";
        }
      } else {
        btnTitle = player.isAlive ? "Segna come Eliminato nella notte" : "Riporta in Vita";
      }

      chip.innerHTML = `
        <div class="roster-chip-info">
          <span class="roster-chip-icon">${player.role.icon}</span>
          <div>
            <div class="roster-chip-name">${player.name}${player.isLover ? ' <span style="font-size: 0.75rem;" title="Innamorato">❤️</span>' : ''}</div>
            <div class="roster-chip-role">${player.role.name}</div>
          </div>
        </div>
        <button type="button" class="btn-roster-status ${isStatusDisabled ? 'readonly-status' : ''}" ${isStatusDisabled ? 'disabled aria-disabled="true"' : ''} title="${btnTitle}">
          ${player.isAlive ? "🟢 Vivo" : "🔴 Morto"}
        </button>
      `;

      const statusBtn = chip.querySelector(".btn-roster-status");
      if (!isStatusDisabled) {
        statusBtn.addEventListener("click", () => {
          try { Sound.playClick(); } catch (e) {}
          player.isAlive = !player.isAlive;
          this.renderMasterRoster();
          const isGameOver = this.checkVictoryCondition();
          if (isGameOver) {
            this.renderGameOverCard(player, isGameOver);
          } else {
            // Se eravamo nello step del voto, riaggiorna la griglia
            const currentSteps = this.getRoundSteps();
            if (currentSteps[this.masterStepIndex] && currentSteps[this.masterStepIndex].type === "voting") {
              this.renderVotingGrid();
            }
          }
        });
      }

      grid.appendChild(chip);
    });

    const aliveCount = this.assignments.filter(p => p.isAlive).length;
    const totalCount = this.assignments.length;
    const countBadge = document.getElementById("lupus-alive-count-badge");
    if (countBadge) countBadge.textContent = `${aliveCount}/${totalCount} Vivi`;
  }

  /**
   * Genera l'elenco sequenziale completo di tutti i passaggi del round:
   * Chiamate Notturne -> Alba & Risveglio -> Discussione Diurna & Timer -> Votazione Rogo (1 solo giocatore)
   */
  /**
   * Genera l'elenco sequenziale completo di tutti i passaggi del round:
   * Chiamate Notturne -> Alba & Risveglio -> Discussione Diurna & Timer -> Votazione Rogo (1 solo giocatore)
   */
  getRoundSteps() {
    const steps = [];

    // 1. Calano le tenebre
    steps.push({
      type: "night",
      stepSubtype: "intro",
      phaseBadge: `Notte ${this.nightCount} 🌙`,
      badgeClass: "badge-night",
      title: `🌙 Calano le Tenebre (Notte ${this.nightCount})`,
      instruction: "Il Narratore annuncia ad alta voce: <em>'Cala la notte sul villaggio. Tutti gli abitanti chiudono gli occhi e si addormentano!'</em>"
    });

    // 2. Cupido (SOLO Notte 1 se abilitato)
    if (this.enabledRoles.cupido && this.nightCount === 1) {
      steps.push({
        type: "night",
        stepSubtype: "cupido",
        phaseBadge: `Notte ${this.nightCount} 🌙`,
        badgeClass: "badge-night",
        title: "💘 Risveglio di Cupido",
        instruction: "Il Narratore dice: <em>'Cupido, apri gli occhi e indica i due Innamorati.'</em> Cupido indica due persone. Il Narratore annuisce, fa richiudere gli occhi a Cupido e tocca discretamente le spalle dei due innamorati, dicendo: <em>'Gli Innamorati aprano gli occhi per guardarsi e riconoscersi.'</em>"
      });
    }

    // 3. La Donna (se abilitata e viva)
    const donnaAlive = this.assignments.some(p => p.roleKey === "donna" && p.isAlive);
    if (this.enabledRoles.donna && donnaAlive) {
      steps.push({
        type: "night",
        stepSubtype: "donna",
        phaseBadge: `Notte ${this.nightCount} 🌙`,
        badgeClass: "badge-night",
        title: "💃 Risveglio della Donna",
        instruction: "Il Narratore dice: <em>'La Donna apre gli occhi e indica con chi trascorrerà la notte.'</em> La Donna indica un giocatore. Se sceglie un Lupo o se il suo ospite muore, muore anche lei!"
      });
    }

    // 3b. La Luna Piena del Lupo Mannaro (se abilitato, vivo e non ancora trasformato)
    const infiltratoPlayer = this.assignments.find(p => p.roleKey === "infiltrato" && p.isAlive);
    if (this.enabledRoles.infiltrato && infiltratoPlayer && !infiltratoPlayer.isTransformed) {
      steps.push({
        type: "night",
        stepSubtype: "infiltrato_moon",
        phaseBadge: `Notte ${this.nightCount} 🌙`,
        badgeClass: "badge-night",
        title: "🌕 Il Richiamo della Luna (Lupo Mannaro)",
        instruction: "Il Narratore verifica la Luna Piena per il Lupo Mannaro: tocca <strong>🎲 Lancia Dado</strong>. Se la luna è piena, si trasforma permanentemente in un feroce Lupo del branco! (Il Narratore toccherà con discrezione la sua spalla per avvisarlo di aprire gli occhi con i Lupi nel passaggio successivo)."
      });
    }

    // 4. I Lupi (se ci sono lupi del branco vivi: normali, stregone, cane nero, lupo bianco o lupo mannaro trasformato)
    const wolfRoles = ["lupo", "lupo_stregone", "cane_nero", "lupo_bianco"];
    const wolvesAlive = this.assignments.some(p => (wolfRoles.includes(p.roleKey) || (p.roleKey === "infiltrato" && p.isTransformed)) && p.isAlive);
    if (wolvesAlive) {
      const infiltratoTransformed = this.assignments.find(p => p.roleKey === "infiltrato" && p.isAlive && p.isTransformed);
      const infiltratoNote = infiltratoTransformed
        ? ` (🐺 Il Lupo Mannaro si è trasformato e ORA si sveglia con i lupi!)`
        : ` (Il Lupo Mannaro NON si sveglia finché non si trasforma).`;
      steps.push({
        type: "night",
        stepSubtype: "lupi",
        phaseBadge: `Notte ${this.nightCount} 🌙`,
        badgeClass: "badge-night",
        title: "🐺 Risveglio del Branco dei Lupi",
        instruction: `Il Narratore dice: <em>'I Lupi aprano gli occhi, si riconoscano e scelgano silenziosamente la loro vittima.'</em> (Si svegliano tutti i Lupi del branco: normali, Lupo Stregone, Cane Nero, Lupo Bianco${infiltratoTransformed ? ', e il Lupo Mannaro trasformato' : ''}).${infiltratoNote} I lupi concordano una vittima indicandola al Narratore.`
      });
    }

    // 4b. Il Lupo Stregone (se abilitato e vivo)
    const stregoneAlive = this.assignments.some(p => p.roleKey === "lupo_stregone" && p.isAlive);
    if (this.enabledRoles.lupo_stregone && stregoneAlive) {
      steps.push({
        type: "night",
        stepSubtype: "lupo_stregone",
        phaseBadge: `Notte ${this.nightCount} 🌙`,
        badgeClass: "badge-night",
        title: "🐺🔮 Risveglio del Lupo Stregone",
        instruction: "Il Narratore dice: <em>'Il Lupo Stregone apra gli occhi.'</em> Il Lupo Stregone indica un giocatore al Narratore per annullarne il potere notturno. Se quel giocatore ha un potere notturno attivo (Guardia, Veggente, Strega, Beccamorto), il suo potere è <strong>bloccato</strong> per questa notte!"
      });
    }

    // 4c. Il Lupo Bianco (a notti alterne: 2, 4, 6... se abilitato e vivo)
    const lupoBiancoAlive = this.assignments.some(p => p.roleKey === "lupo_bianco" && p.isAlive);
    if (this.enabledRoles.lupo_bianco && lupoBiancoAlive && (this.nightCount % 2 === 0)) {
      steps.push({
        type: "night",
        stepSubtype: "lupo_bianco",
        phaseBadge: `Notte ${this.nightCount} 🌙`,
        badgeClass: "badge-night",
        title: "🐺❄️ Risveglio Solitario del Lupo Bianco",
        instruction: "A notti alterne (notte pari), il Lupo Bianco si risveglia da solo per tradire il branco! Può decidere di sbranare uno degli altri Lupi indicandolo al Narratore, oppure rinunciare."
      });
    }

    // 5. La Guardia (se abilitata e viva)
    const guardiaAlive = this.assignments.some(p => p.roleKey === "guardia" && p.isAlive);
    if (this.enabledRoles.guardia && guardiaAlive) {
      steps.push({
        type: "night",
        stepSubtype: "guardia",
        phaseBadge: `Notte ${this.nightCount} 🌙`,
        badgeClass: "badge-night",
        title: "🛡️ Risveglio della Guardia",
        instruction: "Il Narratore dice: <em>'La Guardia apra gli occhi e indichi chi proteggere con il suo scudo.'</em> La Guardia indica un abitante (può proteggere anche se stessa). Se i Lupi hanno attaccato quel giocatore, il suo scudo lo salverà!"
      });
    }

    // 6. Il Veggente (se abilitato e vivo)
    const veggenteAlive = this.assignments.some(p => p.roleKey === "veggente" && p.isAlive);
    if (this.enabledRoles.veggente && veggenteAlive) {
      steps.push({
        type: "night",
        stepSubtype: "veggente",
        phaseBadge: `Notte ${this.nightCount} 🌙`,
        badgeClass: "badge-night",
        title: "🔮 Risveglio del Veggente",
        instruction: "Il Narratore dice: <em>'Il Veggente apra gli occhi e indichi la persona di cui vuole scoprire l'identità.'</em> Tocca il giocatore indicato per visualizzare il responso esatto."
      });
    }

    // 6b. Il Beccamorto (dalla Notte 2 in poi, se abilitato e vivo)
    const beccamortoAlive = this.assignments.some(p => p.roleKey === "beccamorto" && p.isAlive);
    if (this.enabledRoles.beccamorto && beccamortoAlive && this.nightCount >= 2) {
      steps.push({
        type: "night",
        stepSubtype: "beccamorto",
        phaseBadge: `Notte ${this.nightCount} 🌙`,
        badgeClass: "badge-night",
        title: "⚰️ Risveglio del Beccamorto",
        instruction: "Il Narratore dice: <em>'Il Beccamorto apra gli occhi.'</em> Il Narratore rivela segretamente al Beccamorto (mostrando la carta o mimando il ruolo) l'<strong>esatta identità del giocatore morto nel round precedente</strong>."
      });
    }

    // 7. La Strega (se abilitata e viva)
    const stregaAlive = this.assignments.some(p => p.roleKey === "strega" && p.isAlive);
    if (this.enabledRoles.strega && stregaAlive) {
      steps.push({
        type: "night",
        stepSubtype: "strega",
        phaseBadge: `Notte ${this.nightCount} 🌙`,
        badgeClass: "badge-night",
        title: "🧙‍♀️ Risveglio della Strega",
        instruction: "Il Narratore dice: <em>'La Strega apra gli occhi.'</em> Il Narratore le indica la vittima dei lupi. La Strega decide se usare la pozione di vita e/o la pozione di morte su qualcun altro."
      });
    }

    // 8. Risveglio del Villaggio (Alba)
    steps.push({
      type: "dawn",
      stepSubtype: "dawn",
      phaseBadge: "Alba 🌅",
      badgeClass: "badge-day",
      title: `☀️ Risveglio del Villaggio (Giorno ${this.nightCount})`,
      instruction: "Il Narratore annuncia ad alta voce: <em>'Sorge il sole sul villaggio! Tutti gli abitanti aprano gli occhi!'</em> L'esito della notte è calcolato e mostrato di seguito."
    });

    // 9. Dibattito & Timer del Villaggio (Giorno)
    steps.push({
      type: "discussion",
      stepSubtype: "discussion",
      phaseBadge: `Giorno ${this.nightCount} ☀️`,
      badgeClass: "badge-day",
      title: "⏱️ Dibattito & Timer del Villaggio",
      instruction: "Gli abitanti discutono animatamente per trovare i colpevoli. Avvia il timer di discussione oppure concludi in anticipo non appena il gruppo è pronto a votare."
    });

    // 10. Votazione del Rogo (Eliminazione di un solo giocatore)
    steps.push({
      type: "voting",
      stepSubtype: "voting",
      phaseBadge: "Rogo ⚖️",
      badgeClass: "badge-night",
      title: "🔥 Votazione del Rogo",
      instruction: "Il villaggio vota chi mandare al rogo. Seleziona <strong>l'unico abitante</strong> accusato dalla maggioranza:"
    });

    return steps;
  }

  renderMasterPhaseGuide() {
    const phaseTitle = document.getElementById("lupus-phase-title");
    const phaseBadge = document.getElementById("lupus-phase-badge");
    const stepTitle = document.getElementById("lupus-step-title");
    const stepDesc = document.getElementById("lupus-step-desc");
    const stepCounter = document.getElementById("lupus-step-counter");
    const timerWidget = document.getElementById("lupus-step-timer-widget");
    const votingWidget = document.getElementById("lupus-step-voting-widget");
    const actionWidget = document.getElementById("lupus-step-action-widget");
    const dawnWidget = document.getElementById("lupus-dawn-summary-widget");
    const navControls = document.getElementById("lupus-step-nav-controls");
    const prevBtn = document.getElementById("lupus-master-prev-step");
    const nextBtn = document.getElementById("lupus-master-next-step");

    const steps = this.getRoundSteps();
    if (this.masterStepIndex >= steps.length) {
      this.masterStepIndex = steps.length - 1;
    }
    if (this.masterStepIndex < 0) {
      this.masterStepIndex = 0;
    }

    const curStep = steps[this.masterStepIndex];
    if (!curStep) return;

    const gameoverWidget = document.getElementById("lupus-step-gameover-widget");
    if (gameoverWidget) gameoverWidget.style.display = "none";

    if (phaseTitle) phaseTitle.textContent = `Round ${this.nightCount} 🐺`;
    if (phaseBadge) {
      phaseBadge.textContent = curStep.phaseBadge;
      phaseBadge.className = `phase-badge ${curStep.badgeClass}`;
    }
    if (stepCounter) stepCounter.textContent = `Passaggio ${this.masterStepIndex + 1} di ${steps.length}`;
    if (stepTitle) {
      stepTitle.textContent = curStep.title;
      stepTitle.style.color = "";
    }
    if (stepDesc) stepDesc.innerHTML = curStep.instruction;

    if (prevBtn) prevBtn.disabled = this.masterStepIndex === 0;

    // Gestione Widget specifici per ciascun passaggio
    if (curStep.type === "night") {
      if (timerWidget) timerWidget.style.display = "none";
      if (votingWidget) votingWidget.style.display = "none";
      if (dawnWidget) dawnWidget.style.display = "none";
      if (actionWidget) {
        actionWidget.style.display = "block";
        this.renderNightActionWidget(curStep.stepSubtype);
      }
      if (navControls) navControls.style.display = "flex";
      if (nextBtn) {
        nextBtn.style.display = "inline-flex";
        nextBtn.textContent = "Avanti ➡️";
      }
      this.stopDiscussionTimer();
    } else if (curStep.type === "dawn") {
      if (timerWidget) timerWidget.style.display = "none";
      if (votingWidget) votingWidget.style.display = "none";
      if (actionWidget) actionWidget.style.display = "none";
      if (dawnWidget) {
        dawnWidget.style.display = "block";
        if (!this.nightResolved) {
          this.resolveNight();
        }
        this.renderDawnSummaryWidget();
      }
      if (navControls) navControls.style.display = "flex";
      if (nextBtn) {
        nextBtn.style.display = "inline-flex";
        nextBtn.textContent = "Vai al Dibattito ☀️";
      }
      this.stopDiscussionTimer();
    } else if (curStep.type === "discussion") {
      if (actionWidget) actionWidget.style.display = "none";
      if (dawnWidget) dawnWidget.style.display = "none";
      if (timerWidget) timerWidget.style.display = "block";
      if (votingWidget) votingWidget.style.display = "none";
      if (navControls) navControls.style.display = "flex";
      if (nextBtn) nextBtn.style.display = "none";
      this.startDiscussionTimerAuto();
    } else if (curStep.type === "voting") {
      if (actionWidget) actionWidget.style.display = "none";
      if (dawnWidget) dawnWidget.style.display = "none";
      if (timerWidget) timerWidget.style.display = "none";
      if (votingWidget) votingWidget.style.display = "block";
      this.renderVotingGrid();

      if (navControls) navControls.style.display = "flex";
      if (nextBtn) nextBtn.style.display = "none";
      this.stopDiscussionTimer();
    }

    // Aggiorna sempre il registro abitanti per riflettere lo stato informativo/interattivo della fase corrente
    this.renderMasterRoster();
  }

  stopDiscussionTimer() {
    if (this.isDiscussionRunning) {
      clearInterval(this.discussionTimer);
      this.discussionTimer = null;
      this.isDiscussionRunning = false;
      const timerBtn = document.getElementById("lupus-timer-toggle-btn");
      if (timerBtn) timerBtn.textContent = "▶️ Riprendi Timer";
    }
  }

  masterNextStep() {
    Sound.playClick();
    const steps = this.getRoundSteps();
    if (this.masterStepIndex < steps.length - 1) {
      this.masterStepIndex++;
      this.renderMasterPhaseGuide();
    }
  }

  masterPrevStep() {
    Sound.playClick();
    const steps = this.getRoundSteps();
    const curStep = steps[this.masterStepIndex];
    if (this.masterStepIndex > 0) {
      // Se stiamo tornando indietro dall'Alba o oltre verso un passaggio notturno, ripristina lo stato precedente
      if (curStep && curStep.type === "dawn" && this.nightResolved && this.preDawnAliveSnapshot) {
        this.assignments.forEach((p, idx) => {
          p.isAlive = this.preDawnAliveSnapshot[idx];
        });
        this.witchLifeUsed = this.preDawnWitchLifeSnapshot;
        this.witchDeathUsed = this.preDawnWitchDeathSnapshot;
        this.nightResolved = false;
        this.dawnReport = null;
      }
      this.masterStepIndex--;
      this.renderMasterPhaseGuide();
    }
  }

  // =========================================================================
  // WIDGET AZIONI NOTTURNE INTERATTIVE
  // =========================================================================

  renderNightActionWidget(stepSubtype) {
    const actionWidget = document.getElementById("lupus-step-action-widget");
    if (!actionWidget) return;

    if (stepSubtype === "intro") {
      actionWidget.innerHTML = `
        <div class="lupus-action-widget" style="text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 6px;">🌙💤</div>
          <div style="font-size: 0.95rem; font-weight: 700; color: #fff; margin-bottom: 4px;">Tutti gli abitanti dormono</div>
          <div style="font-size: 0.85rem; color: #94a3b8;">
            Tocca <strong>Avanti ➡️</strong> per chiamare i ruoli speciali uno alla volta.
          </div>
        </div>
      `;
      return;
    }

    if (stepSubtype === "cupido") {
      const alive = this.assignments.filter(p => p.isAlive);
      const currentSelected = this.nightActions.cupidoLovers || [];
      const chipsHtml = alive.map(p => {
        const isSel = currentSelected.includes(p.id);
        return `
          <div class="lupus-action-card ${isSel ? 'selected selected-cupido' : ''}" data-player-id="${p.id}">
            <div class="action-card-avatar">${isSel ? '❤️' : p.role.icon}</div>
            <div class="action-card-name">${p.name}</div>
            <div class="action-card-role">${p.role.name}</div>
          </div>
        `;
      }).join("");

      let statusText = "";
      if (currentSelected.length === 2) {
        const p1 = this.assignments.find(p => p.id === currentSelected[0]);
        const p2 = this.assignments.find(p => p.id === currentSelected[1]);
        statusText = `💘 Innamorati legati: <strong>${p1?.name}</strong> ❤️ <strong>${p2?.name}</strong> (Se uno muore, muore anche l'altro!)`;
      } else {
        statusText = `Tocca 2 giocatori (${currentSelected.length}/2 scelti)`;
      }

      actionWidget.innerHTML = `
        <div class="lupus-action-widget">
          <div class="lupus-action-prompt">💘 Tocca i due giocatori scelti da Cupido come Innamorati:</div>
          <div class="lupus-action-grid">${chipsHtml}</div>
          <div class="lupus-action-status">${statusText}</div>
        </div>
      `;

      actionWidget.querySelectorAll(".lupus-action-card").forEach(card => {
        card.addEventListener("click", () => {
          try { Sound.playClick(); } catch (e) {}
          const pid = card.dataset.playerId;
          let lovers = [...(this.nightActions.cupidoLovers || [])];
          if (lovers.includes(pid)) {
            lovers = lovers.filter(id => id !== pid);
          } else {
            if (lovers.length >= 2) {
              lovers.shift();
            }
            lovers.push(pid);
          }
          this.nightActions.cupidoLovers = lovers;
          this.lovers = lovers;
          this.assignments.forEach(p => {
            p.isLover = lovers.includes(p.id);
          });
          this.renderNightActionWidget("cupido");
          this.renderMasterRoster();
        });
      });
      return;
    }

    if (stepSubtype === "donna") {
      const donnaPlayer = this.assignments.find(p => p.roleKey === "donna" && p.isAlive);
      const candidates = this.assignments.filter(p => p.isAlive && p.id !== donnaPlayer?.id);
      const selectedId = this.nightActions.donnaTarget;

      const isHome = (selectedId === null);
      const homeCard = `
        <div class="lupus-action-card action-none ${isHome ? 'selected selected-donna' : ''}" data-player-id="HOME">
          <div class="action-card-avatar">🏠</div>
          <div class="action-card-name">A Casa Sua</div>
          <div class="action-card-role">Nessun rifugio</div>
        </div>
      `;

      const candidatesHtml = candidates.map(p => {
        const isSel = (selectedId === p.id);
        return `
          <div class="lupus-action-card ${isSel ? 'selected selected-donna' : ''}" data-player-id="${p.id}">
            <div class="action-card-avatar">${p.role.icon}</div>
            <div class="action-card-name">${p.name}</div>
            <div class="action-card-role">${p.role.name}</div>
          </div>
        `;
      }).join("");

      let statusText = "";
      if (isHome) {
        statusText = "🏠 La Donna resta a casa sua stanotte (vulnerabile se attaccata).";
      } else {
        const host = this.assignments.find(p => p.id === selectedId);
        const isHostWolf = host && (["lupo", "lupo_stregone", "cane_nero", "lupo_bianco"].includes(host.roleKey) || (host.roleKey === "infiltrato" && host.isTransformed));
        statusText = `💃 Rifugio: <strong>${host?.name}</strong> ${isHostWolf ? '⚠️ (È un LUPO! La Donna morirà all\'Alba)' : '(Innocente: se attaccata a casa è salva!)'}`;
      }

      actionWidget.innerHTML = `
        <div class="lupus-action-widget">
          <div class="lupus-action-prompt">💃 Tocca la persona da cui la Donna si rifugia stanotte:</div>
          <div class="lupus-action-grid">${homeCard}${candidatesHtml}</div>
          <div class="lupus-action-status">${statusText}</div>
        </div>
      `;

      actionWidget.querySelectorAll(".lupus-action-card").forEach(card => {
        card.addEventListener("click", () => {
          try { Sound.playClick(); } catch (e) {}
          const pid = card.dataset.playerId;
          this.nightActions.donnaTarget = (pid === "HOME") ? null : pid;
          this.renderNightActionWidget("donna");
        });
      });
      return;
    }

    if (stepSubtype === "infiltrato_moon") {
      const infiltratoPlayer = this.assignments.find(p => p.roleKey === "infiltrato" && p.isAlive);
      if (!infiltratoPlayer) return;

      const currentNight = this.nightCount || 1;
      const rawChance = this.infiltratoConfig.baseChance + (currentNight - 1) * this.infiltratoConfig.chancePerNight;
      const moonChance = Math.min(this.infiltratoConfig.maxChance, rawChance);
      const pct = Math.round(moonChance * 100);
      const maxPct = Math.round(this.infiltratoConfig.maxChance * 100);

      const rollData = this.nightActions.infiltratoRoll;
      const isTransformed = infiltratoPlayer.isTransformed;

      let resultHtml = "";
      if (isTransformed) {
        resultHtml = `
          <div class="lupus-moon-result-box transformed">
            <div style="font-size: 2.2rem; margin-bottom: 4px;">🌕🐺</div>
            <div style="font-size: 1.25rem; font-weight: 900; letter-spacing: 0.5px;">LUNA PIENA: TRASFORMAZIONE AVVENUTA!</div>
            <div style="font-size: 0.9rem; margin-top: 6px; line-height: 1.4;">
              ${rollData ? `Dado estratto: <strong>${rollData.value}%</strong> (Soglia: &le; ${pct}%)<br>` : ''}
              <strong>${infiltratoPlayer.name}</strong> è diventato a tutti gli effetti un <strong>Lupo Mannaro</strong>!<br>
              <em>Non potrà mai più tornare normale.</em>
            </div>
            <div style="font-size: 0.85rem; margin-top: 10px; background: rgba(0,0,0,0.35); border: 1px solid rgba(254, 240, 138, 0.3); border-radius: var(--radius-sm); padding: 9px; color: #fef08a; text-align: left;">
              👉 <strong>Istruzione Narratore:</strong> Tocca con discrezione la spalla di <strong>${infiltratoPlayer.name}</strong> per fargli capire che ora è un Lupo e dovrà svegliarsi al prossimo richiamo del branco!
            </div>
          </div>
        `;
      } else if (rollData && !rollData.success) {
        resultHtml = `
          <div class="lupus-moon-result-box dormant">
            <div style="font-size: 2.2rem; margin-bottom: 4px;">🌑</div>
            <div style="font-size: 1.15rem; font-weight: 800;">LUNA VELATA: NESSUNA TRASFORMAZIONE</div>
            <div style="font-size: 0.88rem; margin-top: 6px;">
              Dado estratto: <strong>${rollData.value}%</strong> (Soglia: &le; ${pct}%)<br>
              <strong>${infiltratoPlayer.name}</strong> rimane umano e dorme con gli innocenti.
            </div>
          </div>
        `;
      }

      actionWidget.innerHTML = `
        <div class="lupus-action-widget">
          <div class="lupus-moon-box">
            <div style="font-size: 1.05rem; font-weight: 800; color: #e9d5ff; margin-bottom: 6px;">
              🌕 Verifica Licantropia: ${infiltratoPlayer.name} (Lupo Mannaro)
            </div>
            <div class="lupus-moon-chance-bar">
              <span>Notte ${currentNight}: <strong>${pct}%</strong> di probabilità</span>
              <span style="opacity: 0.8; font-size: 0.8rem;">(Tetto Max: ${maxPct}%)</span>
            </div>
            
            <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 10px;">
              ${!isTransformed ? `
                <button type="button" class="btn btn-primary btn-sm" id="lupus-btn-roll-moon">
                  🎲 Lancia Dado Luna Piena
                </button>
                <button type="button" class="btn btn-secondary btn-sm" id="lupus-btn-force-transform">
                  ⚡ Forza Trasformazione
                </button>
              ` : `
                <button type="button" class="btn btn-secondary btn-sm" id="lupus-btn-undo-transform">
                  ↩️ Annulla Trasformazione (Errore)
                </button>
              `}
            </div>
            ${resultHtml}
          </div>
        </div>
      `;

      const rollBtn = actionWidget.querySelector("#lupus-btn-roll-moon");
      if (rollBtn) {
        rollBtn.addEventListener("click", () => {
          const roll = Math.floor(Math.random() * 100) + 1;
          const success = roll <= pct;
          this.nightActions.infiltratoRoll = { value: roll, success: success };
          if (success) {
            infiltratoPlayer.isTransformed = true;
            try { Sound.playImpostorReveal(); } catch (e) {}
          } else {
            infiltratoPlayer.isTransformed = false;
            try { Sound.playClick(); } catch (e) {}
          }
          this.renderNightActionWidget("infiltrato_moon");
        });
      }

      const forceBtn = actionWidget.querySelector("#lupus-btn-force-transform");
      if (forceBtn) {
        forceBtn.addEventListener("click", () => {
          infiltratoPlayer.isTransformed = true;
          this.nightActions.infiltratoRoll = { value: 1, success: true, forced: true };
          try { Sound.playImpostorReveal(); } catch (e) {}
          this.renderNightActionWidget("infiltrato_moon");
        });
      }

      const undoBtn = actionWidget.querySelector("#lupus-btn-undo-transform");
      if (undoBtn) {
        undoBtn.addEventListener("click", () => {
          infiltratoPlayer.isTransformed = false;
          this.nightActions.infiltratoRoll = null;
          try { Sound.playClick(); } catch (e) {}
          this.renderNightActionWidget("infiltrato_moon");
        });
      }
      return;
    }

    if (stepSubtype === "lupi") {
      const candidates = this.assignments.filter(p => p.isAlive);
      const selectedId = this.nightActions.wolfTarget;

      const cardsHtml = candidates.map(p => {
        const isSel = (selectedId === p.id);
        return `
          <div class="lupus-action-card ${isSel ? 'selected selected-wolf' : ''}" data-player-id="${p.id}">
            <div class="action-card-avatar">${p.role.icon}</div>
            <div class="action-card-name">${p.name}</div>
            <div class="action-card-role">${p.role.name}</div>
          </div>
        `;
      }).join("");

      let statusText = "";
      if (selectedId) {
        const victim = this.assignments.find(p => p.id === selectedId);
        statusText = `🩸 Vittima designata dai Lupi: <strong>${victim?.name}</strong> (${victim?.role.name})`;
      } else {
        statusText = "Tocca un giocatore per memorizzare l'attacco del branco.";
      }

      actionWidget.innerHTML = `
        <div class="lupus-action-widget">
          <div class="lupus-action-prompt">🐺 Tocca la vittima che i Lupi indicano di voler sbranare:</div>
          <div class="lupus-action-grid">${cardsHtml}</div>
          <div class="lupus-action-status">${statusText}</div>
        </div>
      `;

      actionWidget.querySelectorAll(".lupus-action-card").forEach(card => {
        card.addEventListener("click", () => {
          try { Sound.playClick(); } catch (e) {}
          this.nightActions.wolfTarget = card.dataset.playerId;
          this.renderNightActionWidget("lupi");
        });
      });
      return;
    }

    if (stepSubtype === "lupo_stregone") {
      const stregonePlayer = this.assignments.find(p => p.roleKey === "lupo_stregone" && p.isAlive);
      const candidates = this.assignments.filter(p => p.isAlive && p.id !== stregonePlayer?.id);
      const selectedId = this.nightActions.stregoneTarget;

      const noneCard = `
        <div class="lupus-action-card action-none ${selectedId === null ? 'selected selected-stregone' : ''}" data-player-id="NONE">
          <div class="action-card-avatar">🚫</div>
          <div class="action-card-name">Nessuno</div>
          <div class="action-card-role">Non silenzia</div>
        </div>
      `;

      const cardsHtml = candidates.map(p => {
        const isSel = (selectedId === p.id);
        return `
          <div class="lupus-action-card ${isSel ? 'selected selected-stregone' : ''}" data-player-id="${p.id}">
            <div class="action-card-avatar">${p.role.icon}</div>
            <div class="action-card-name">${p.name}</div>
            <div class="action-card-role">${p.role.name}</div>
          </div>
        `;
      }).join("");

      let statusText = "";
      if (selectedId) {
        const target = this.assignments.find(p => p.id === selectedId);
        const hasPower = ["guardia", "veggente", "strega", "beccamorto"].includes(target?.roleKey);
        statusText = `🔮 Giocatore silenziato: <strong>${target?.name}</strong> ${hasPower ? '⛔ (Potere notturno annullato per stanotte!)' : '(Nessun potere notturno bloccabile)'}`;
      } else {
        statusText = "🚫 Nessun giocatore silenziato per questa notte.";
      }

      actionWidget.innerHTML = `
        <div class="lupus-action-widget">
          <div class="lupus-action-prompt">🐺🔮 Tocca il giocatore da silenziare/bloccare:</div>
          <div class="lupus-action-grid">${noneCard}${cardsHtml}</div>
          <div class="lupus-action-status">${statusText}</div>
        </div>
      `;

      actionWidget.querySelectorAll(".lupus-action-card").forEach(card => {
        card.addEventListener("click", () => {
          try { Sound.playClick(); } catch (e) {}
          const pid = card.dataset.playerId;
          this.nightActions.stregoneTarget = (pid === "NONE") ? null : pid;
          this.renderNightActionWidget("lupo_stregone");
        });
      });
      return;
    }

    if (stepSubtype === "lupo_bianco") {
      const lupoBiancoPlayer = this.assignments.find(p => p.roleKey === "lupo_bianco" && p.isAlive);
      const packWolves = this.assignments.filter(p => p.isAlive && ["lupo", "lupo_stregone", "cane_nero"].includes(p.roleKey));
      const selectedId = this.nightActions.lupoBiancoTarget;

      const passCard = `
        <div class="lupus-action-card action-none ${selectedId === null ? 'selected selected-lupobianco' : ''}" data-player-id="PASS">
          <div class="action-card-avatar">🚫</div>
          <div class="action-card-name">Passa (Nessuno)</div>
          <div class="action-card-role">Rinuncia stanotte</div>
        </div>
      `;

      const cardsHtml = packWolves.map(p => {
        const isSel = (selectedId === p.id);
        return `
          <div class="lupus-action-card ${isSel ? 'selected selected-lupobianco' : ''}" data-player-id="${p.id}">
            <div class="action-card-avatar">${p.role.icon}</div>
            <div class="action-card-name">${p.name}</div>
            <div class="action-card-role">${p.role.name}</div>
          </div>
        `;
      }).join("");

      let statusText = "";
      if (selectedId) {
        const victim = this.assignments.find(p => p.id === selectedId);
        statusText = `🐺❄️ Bersaglio Lupo Bianco: <strong>${victim?.name}</strong> (Morirà all'Alba!)`;
      } else {
        statusText = "🚫 Il Lupo Bianco non sbrana nessun compagno stanotte.";
      }

      actionWidget.innerHTML = `
        <div class="lupus-action-widget">
          <div class="lupus-action-prompt">🐺❄️ Il Lupo Bianco sceglie se sbranare un compagno lupo alle spalle:</div>
          <div class="lupus-action-grid">${passCard}${cardsHtml}</div>
          <div class="lupus-action-status">${statusText}</div>
        </div>
      `;

      actionWidget.querySelectorAll(".lupus-action-card").forEach(card => {
        card.addEventListener("click", () => {
          try { Sound.playClick(); } catch (e) {}
          const pid = card.dataset.playerId;
          this.nightActions.lupoBiancoTarget = (pid === "PASS") ? null : pid;
          this.renderNightActionWidget("lupo_bianco");
        });
      });
      return;
    }

    if (stepSubtype === "guardia") {
      const guardiaPlayer = this.assignments.find(p => p.roleKey === "guardia" && p.isAlive);
      const isSilenced = guardiaPlayer && (this.nightActions.stregoneTarget === guardiaPlayer.id);

      if (isSilenced) {
        actionWidget.innerHTML = `
          <div class="lupus-action-widget">
            <div class="lupus-silenced-alert">
              ⛔ <strong>POTERE BLOCCATO DAL LUPO STREGONE!</strong><br>
              La Guardia è stata silenziata questa notte. Qualsiasi indicazione non avrà effetto: lo scudo non proteggerà nessuno.
            </div>
          </div>
        `;
        return;
      }

      const candidates = this.assignments.filter(p => p.isAlive);
      const selectedId = this.nightActions.guardTarget;

      const cardsHtml = candidates.map(p => {
        const isSel = (selectedId === p.id);
        return `
          <div class="lupus-action-card ${isSel ? 'selected selected-guard' : ''}" data-player-id="${p.id}">
            <div class="action-card-avatar">${p.role.icon}</div>
            <div class="action-card-name">${p.name}</div>
            <div class="action-card-role">${p.role.name}</div>
          </div>
        `;
      }).join("");

      let statusText = "";
      if (selectedId) {
        const target = this.assignments.find(p => p.id === selectedId);
        statusText = `🛡️ Protetto dallo Scudo: <strong>${target?.name}</strong> (Sopravvive se attaccato dai Lupi)`;
      } else {
        statusText = "Tocca un giocatore da difendere con lo scudo.";
      }

      actionWidget.innerHTML = `
        <div class="lupus-action-widget">
          <div class="lupus-action-prompt">🛡️ La Guardia indica chi proteggere per questa notte:</div>
          <div class="lupus-action-grid">${cardsHtml}</div>
          <div class="lupus-action-status">${statusText}</div>
        </div>
      `;

      actionWidget.querySelectorAll(".lupus-action-card").forEach(card => {
        card.addEventListener("click", () => {
          try { Sound.playClick(); } catch (e) {}
          this.nightActions.guardTarget = card.dataset.playerId;
          this.renderNightActionWidget("guardia");
        });
      });
      return;
    }

    if (stepSubtype === "veggente") {
      const veggentePlayer = this.assignments.find(p => p.roleKey === "veggente" && p.isAlive);
      const isSilenced = veggentePlayer && (this.nightActions.stregoneTarget === veggentePlayer.id);

      if (isSilenced) {
        actionWidget.innerHTML = `
          <div class="lupus-action-widget">
            <div class="lupus-silenced-alert">
              ⛔ <strong>POTERE BLOCCATO DAL LUPO STREGONE!</strong><br>
              Il Veggente è stato silenziato dal Lupo Stregone. La sua vista mistica è oscurata per questa notte.
            </div>
          </div>
        `;
        return;
      }

      const candidates = this.assignments.filter(p => p.isAlive && p.id !== veggentePlayer?.id);
      const selectedId = this.nightActions.seerTarget;

      const cardsHtml = candidates.map(p => {
        const isSel = (selectedId === p.id);
        return `
          <div class="lupus-action-card ${isSel ? 'selected' : ''}" data-player-id="${p.id}">
            <div class="action-card-avatar">${p.role.icon}</div>
            <div class="action-card-name">${p.name}</div>
            <div class="action-card-role">${p.role.name}</div>
          </div>
        `;
      }).join("");

      let resultHtml = "";
      if (selectedId) {
        const target = this.assignments.find(p => p.id === selectedId);
        const isWolfAnswer = target && (
          ["lupo", "lupo_stregone", "lupo_bianco", "idiota"].includes(target.roleKey) ||
          (target.roleKey === "infiltrato" && target.isTransformed)
        );

        if (isWolfAnswer) {
          let note = "";
          if (target.roleKey === "idiota") {
            note = `<div style="font-size: 0.8rem; margin-top: 4px; color: #fde68a;">⚠️ È l'<strong>Idiota del Villaggio</strong>! Innocente, ma per le sue follie appare come LUPO.</div>`;
          } else if (target.roleKey === "infiltrato" && target.isTransformed) {
            note = `<div style="font-size: 0.8rem; margin-top: 4px; color: #fca5a5;">⚠️ È il <strong>Lupo Mannaro Trasformato</strong>! La luna piena l'ha risvegliato: appare LUPO.</div>`;
          }
          resultHtml = `
            <div class="lupus-seer-result-box wolf">
              <div style="font-size: 1.8rem; margin-bottom: 2px;">🐺</div>
              <div style="font-size: 1.25rem; font-weight: 900; letter-spacing: 0.5px;">RISPOSTA: LUPO!</div>
              <div style="font-size: 0.88rem; margin-top: 2px; opacity: 0.95;">(Annuisci silenziosamente con la testa)</div>
              ${note}
            </div>
          `;
        } else {
          let note = "";
          if (target.roleKey === "cane_nero") {
            note = `<div style="font-size: 0.8rem; margin-top: 4px; color: #a7f3d0;">⚠️ È il <strong>Cane Nero</strong>! Lupo Mannaro sotto mentite spoglie: appare NON LUPO.</div>`;
          } else if (target.roleKey === "infiltrato" && !target.isTransformed) {
            note = `<div style="font-size: 0.8rem; margin-top: 4px; color: #a7f3d0;">⚠️ È il <strong>Lupo Mannaro (Latente)</strong>! Non si è ancora trasformato: appare NON LUPO.</div>`;
          }
          resultHtml = `
            <div class="lupus-seer-result-box innocent">
              <div style="font-size: 1.8rem; margin-bottom: 2px;">👤</div>
              <div style="font-size: 1.25rem; font-weight: 900; letter-spacing: 0.5px;">RISPOSTA: NON LUPO</div>
              <div style="font-size: 0.88rem; margin-top: 2px; opacity: 0.95;">(Scuoti la testa dicendo NO)</div>
              ${note}
            </div>
          `;
        }
      }

      actionWidget.innerHTML = `
        <div class="lupus-action-widget">
          <div class="lupus-action-prompt">🔮 Tocca il giocatore indicato dal Veggente per scoprire la risposta:</div>
          <div class="lupus-action-grid">${cardsHtml}</div>
          ${resultHtml}
        </div>
      `;

      actionWidget.querySelectorAll(".lupus-action-card").forEach(card => {
        card.addEventListener("click", () => {
          try { Sound.playClick(); } catch (e) {}
          this.nightActions.seerTarget = card.dataset.playerId;
          this.renderNightActionWidget("veggente");
        });
      });
      return;
    }

    if (stepSubtype === "beccamorto") {
      const beccamortoPlayer = this.assignments.find(p => p.roleKey === "beccamorto" && p.isAlive);
      const isSilenced = beccamortoPlayer && (this.nightActions.stregoneTarget === beccamortoPlayer.id);

      if (isSilenced) {
        actionWidget.innerHTML = `
          <div class="lupus-action-widget">
            <div class="lupus-silenced-alert">
              ⛔ <strong>POTERE BLOCCATO DAL LUPO STREGONE!</strong><br>
              Il Beccamorto è stato silenziato. I morti tacciono stanotte.
            </div>
          </div>
        `;
        return;
      }

      const deadPlayers = this.lastRoundDeaths || [];
      let contentHtml = "";

      if (deadPlayers.length === 0) {
        contentHtml = `
          <div style="text-align: center; padding: 12px; color: #94a3b8; font-size: 0.9rem;">
            ⚰️ Nessun giocatore è morto nel round precedente. Fa' segno che non ci sono nuovi spiriti.
          </div>
        `;
      } else {
        const cards = deadPlayers.map(p => `
          <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: var(--radius-md); padding: 12px; margin-bottom: 8px; display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 2rem;">${p.role.icon}</span>
            <div>
              <div style="font-size: 0.98rem; font-weight: 800; color: #fff;">${p.name}</div>
              <div style="font-size: 0.85rem; color: #fbbf24; font-weight: 700;">Ruolo Esatto: ${p.role.name} (${p.role.factionLabel})</div>
            </div>
          </div>
        `).join("");

        contentHtml = `
          <div style="margin: 10px 0;">
            <div style="font-size: 0.84rem; color: #cbd5e1; margin-bottom: 8px;">
              🤫 Mostra discretamente lo schermo o mima al Beccamorto l'identità del caduto:
            </div>
            ${cards}
          </div>
        `;
      }

      actionWidget.innerHTML = `
        <div class="lupus-action-widget">
          <div class="lupus-action-prompt">⚰️ Identità del/i giocatore/i eliminato/i nel round precedente:</div>
          ${contentHtml}
        </div>
      `;
      return;
    }

    if (stepSubtype === "strega") {
      const stregaPlayer = this.assignments.find(p => p.roleKey === "strega" && p.isAlive);
      const isSilenced = stregaPlayer && (this.nightActions.stregoneTarget === stregaPlayer.id);

      if (isSilenced) {
        actionWidget.innerHTML = `
          <div class="lupus-action-widget">
            <div class="lupus-silenced-alert">
              ⛔ <strong>POTERE BLOCCATO DAL LUPO STREGONE!</strong><br>
              La Strega è stata silenziata dal Lupo Stregone e non può usare alcuna pozione questa notte.
            </div>
          </div>
        `;
        return;
      }

      const wolfVictim = this.nightActions.wolfTarget ? this.assignments.find(p => p.id === this.nightActions.wolfTarget) : null;
      const isLifeAvailable = !this.witchLifeUsed;
      const isDeathAvailable = !this.witchDeathUsed;
      const healTargetId = this.nightActions.witchHealTarget;
      const poisonTargetId = this.nightActions.witchKill;

      // Section 1: Life potion (ora selezionabile su qualsiasi giocatore vivo)
      let lifeSection = "";
      if (isLifeAvailable) {
        const healCandidates = this.assignments.filter(p => p.isAlive);
        const wolfInfo = wolfVictim
          ? `<div style="font-size: 0.88rem; color: #fca5a5; margin-bottom: 8px; font-weight: 600;">🐺 Vittima attaccata dai Lupi: <strong>${wolfVictim.name}</strong> (${wolfVictim.role.name})</div>`
          : `<div style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 8px;">🐺 Nessuna vittima indicata dai Lupi questa notte.</div>`;

        const noneHealCard = `
          <div class="lupus-action-card action-none ${healTargetId === null ? 'selected selected-heal' : ''}" data-action="heal" data-player-id="NO_HEAL">
            <div class="action-card-avatar">🚫</div>
            <div class="action-card-name">Non Usare</div>
            <div class="action-card-role">Conserva pozione</div>
          </div>
        `;
        const healCards = healCandidates.map(p => {
          const isSel = (healTargetId === p.id);
          const isWolfTarget = (wolfVictim && wolfVictim.id === p.id);
          return `
            <div class="lupus-action-card ${isSel ? 'selected selected-heal' : ''} ${isWolfTarget ? 'card-wolf-target' : ''}" data-action="heal" data-player-id="${p.id}">
              <div class="action-card-avatar">${p.role.icon}</div>
              <div class="action-card-name">${p.name} ${isWolfTarget ? '⚠️' : ''}</div>
              <div class="action-card-role">${isWolfTarget ? 'Attaccato dai Lupi!' : p.role.name}</div>
            </div>
          `;
        }).join("");

        const chosenHealPlayer = healTargetId ? this.assignments.find(p => p.id === healTargetId) : null;
        let healStatus = "";
        if (chosenHealPlayer) {
          if (wolfVictim && chosenHealPlayer.id === wolfVictim.id) {
            healStatus = `🧪 Pozione di Vita su <strong>${chosenHealPlayer.name}</strong> (Salva dall'attacco dei Lupi!)`;
          } else {
            healStatus = `🧪 Pozione di Vita su <strong>${chosenHealPlayer.name}</strong> (Protegge anche se non attaccato!)`;
          }
        } else {
          healStatus = "🚫 Nessuna Pozione di Vita usata stanotte.";
        }

        lifeSection = `
          ${wolfInfo}
          <div style="font-size: 0.84rem; color: #cbd5e1; margin-bottom: 6px;">Tocca chi salvare/benedire con la Pozione di Vita (anche chi non è attaccato):</div>
          <div class="lupus-action-grid">${noneHealCard}${healCards}</div>
          <div class="lupus-action-status" style="margin-top: 6px;">${healStatus}</div>
        `;
      } else {
        lifeSection = `
          <div style="font-size: 0.85rem; color: #f87171;">
            ❌ Pozione di Vita già consumata in una notte precedente.
          </div>
        `;
      }

      // Section 2: Death potion (poison)
      let deathSection = "";
      if (isDeathAvailable) {
        const candidates = this.assignments.filter(p => p.isAlive && p.id !== stregaPlayer?.id);
        const noneCard = `
          <div class="lupus-action-card action-none ${poisonTargetId === null ? 'selected selected-poison' : ''}" data-action="poison" data-player-id="NO_POISON">
            <div class="action-card-avatar">🚫</div>
            <div class="action-card-name">Non Avvelenare</div>
            <div class="action-card-role">Conserva pozione</div>
          </div>
        `;
        const poisonCards = candidates.map(p => {
          const isSel = (poisonTargetId === p.id);
          return `
            <div class="lupus-action-card ${isSel ? 'selected selected-poison' : ''}" data-action="poison" data-player-id="${p.id}">
              <div class="action-card-avatar">${p.role.icon}</div>
              <div class="action-card-name">${p.name}</div>
              <div class="action-card-role">${p.role.name}</div>
            </div>
          `;
        }).join("");

        let poisonStatus = poisonTargetId
          ? `☠️ Bersaglio veleno: <strong>${this.assignments.find(p => p.id === poisonTargetId)?.name}</strong> (Morirà all'Alba!)`
          : "🚫 Nessun veleno usato stanotte.";

        deathSection = `
          <div style="font-size: 0.85rem; color: #cbd5e1; margin-bottom: 6px;">Tocca chi avvelenare (oppure conserva la pozione):</div>
          <div class="lupus-action-grid">${noneCard}${poisonCards}</div>
          <div class="lupus-action-status" style="margin-top: 6px;">${poisonStatus}</div>
        `;
      } else {
        deathSection = `
          <div style="font-size: 0.85rem; color: #f87171;">
            ❌ Pozione di Morte già consumata in una notte precedente.
          </div>
        `;
      }

      actionWidget.innerHTML = `
        <div class="lupus-action-widget">
          <div class="lupus-action-prompt">🧙‍♀️ Gestione Pozioni della Strega:</div>
          
          <div class="witch-potions-box">
            <!-- Pozione di Vita -->
            <div class="witch-potion-item">
              <div class="witch-potion-header">
                <div class="witch-potion-title">🧪 Pozione di Vita</div>
                <span class="potion-status-badge ${isLifeAvailable ? 'potion-available' : 'potion-spent'}">
                  ${isLifeAvailable ? 'Disponibile' : 'Usata'}
                </span>
              </div>
              ${lifeSection}
            </div>

            <!-- Pozione di Morte -->
            <div class="witch-potion-item">
              <div class="witch-potion-header">
                <div class="witch-potion-title">☠️ Pozione di Morte (Veleno)</div>
                <span class="potion-status-badge ${isDeathAvailable ? 'potion-available' : 'potion-spent'}">
                  ${isDeathAvailable ? 'Disponibile' : 'Usata'}
                </span>
              </div>
              ${deathSection}
            </div>
          </div>
        </div>
      `;

      // Bind heal cards
      actionWidget.querySelectorAll('.lupus-action-card[data-action="heal"]').forEach(card => {
        card.addEventListener("click", () => {
          try { Sound.playClick(); } catch (e) {}
          const pid = card.dataset.playerId;
          this.nightActions.witchHealTarget = (pid === "NO_HEAL") ? null : pid;
          this.nightActions.witchHeal = (pid !== "NO_HEAL" && pid === (wolfVictim ? wolfVictim.id : null));
          this.renderNightActionWidget("strega");
        });
      });

      // Bind poison cards
      actionWidget.querySelectorAll('.lupus-action-card[data-action="poison"]').forEach(card => {
        card.addEventListener("click", () => {
          try { Sound.playClick(); } catch (e) {}
          const pid = card.dataset.playerId;
          this.nightActions.witchKill = (pid === "NO_POISON") ? null : pid;
          this.renderNightActionWidget("strega");
        });
      });
      return;
    }
  }

  // =========================================================================
  // RISOLUZIONE AUTOMATICA DELLA NOTTE ALL'ALBA
  // =========================================================================

  resolveNight() {
    if (this.nightResolved) return;

    // Snapshot pre-alba per consentire rollback se il Narratore torna indietro
    this.preDawnAliveSnapshot = this.assignments.map(p => p.isAlive);
    this.preDawnWitchLifeSnapshot = this.witchLifeUsed;
    this.preDawnWitchDeathSnapshot = this.witchDeathUsed;

    const stregoneTargetId = this.nightActions.stregoneTarget;
    const guardiaPlayer = this.assignments.find(p => p.roleKey === "guardia" && p.isAlive);
    const isGuardSilenced = guardiaPlayer && (stregoneTargetId === guardiaPlayer.id);

    const stregaPlayer = this.assignments.find(p => p.roleKey === "strega" && p.isAlive);
    const isStregaSilenced = stregaPlayer && (stregoneTargetId === stregaPlayer.id);

    const wolfVictimId = this.nightActions.wolfTarget;
    const wolfVictim = wolfVictimId ? this.assignments.find(p => p.id === wolfVictimId && p.isAlive) : null;

    const donnaPlayer = this.assignments.find(p => p.roleKey === "donna" && p.isAlive);
    const donnaTargetId = donnaPlayer ? this.nightActions.donnaTarget : null;
    const donnaHost = donnaTargetId ? this.assignments.find(p => p.id === donnaTargetId && p.isAlive) : null;
    const isDonnaVisitingWolf = donnaHost && (
      ["lupo", "lupo_stregone", "cane_nero", "lupo_bianco"].includes(donnaHost.roleKey) ||
      (donnaHost.roleKey === "infiltrato" && donnaHost.isTransformed)
    );
    const wereWolvesTargetingDonna = wolfVictim && donnaPlayer && (wolfVictim.id === donnaPlayer.id);

    // Protezioni e Pozione di Vita
    const isProtectedByGuard = !isGuardSilenced && wolfVictim && (this.nightActions.guardTarget === wolfVictim.id);
    const healTargetId = (!isStregaSilenced && !this.witchLifeUsed) ? this.nightActions.witchHealTarget : null;
    const healTargetPlayer = healTargetId ? this.assignments.find(p => p.id === healTargetId && p.isAlive) : null;
    if (healTargetPlayer) {
      this.witchLifeUsed = true;
    }
    const isHealedByWitch = healTargetPlayer && wolfVictim && (healTargetPlayer.id === wolfVictim.id);

    const deaths = new Map(); // id -> reason
    const events = [];
    const getSfx = (name) => (name.endsWith("a") ? "a" : "o");

    // 1. Risoluzione attacco dei Lupi
    if (wolfVictim) {
      if (wereWolvesTargetingDonna && donnaHost && !isDonnaVisitingWolf) {
        events.push({
          type: "saved",
          icon: "💃🛡️",
          text: `I Lupi hanno attaccato la casa di <strong>${donnaPlayer.name} (La Donna)</strong>, ma lei era rifugiata da ${donnaHost.name} ed è salva!`
        });
      } else if (isProtectedByGuard) {
        events.push({
          type: "saved",
          icon: "🛡️",
          text: `<strong>${wolfVictim.name}</strong> è stat${getSfx(wolfVictim.name)} attaccat${getSfx(wolfVictim.name)} dai Lupi, ma lo <strong>scudo della Guardia</strong> l'ha salvat${getSfx(wolfVictim.name)}!`
        });
      } else if (isHealedByWitch) {
        events.push({
          type: "saved",
          icon: "🧪",
          text: `<strong>${wolfVictim.name}</strong> è stat${getSfx(wolfVictim.name)} attaccat${getSfx(wolfVictim.name)} dai Lupi, ma la <strong>Pozione di Vita della Strega</strong> l'ha salvat${getSfx(wolfVictim.name)}!`
        });
      } else {
        deaths.set(wolfVictim.id, `Sbranat${getSfx(wolfVictim.name)} dai Lupi Mannari`);
        events.push({
          type: "death",
          icon: "🐺",
          text: `<strong>${wolfVictim.name}</strong> (${wolfVictim.role.name}) è stat${getSfx(wolfVictim.name)} sbranat${getSfx(wolfVictim.name)} dai Lupi Mannari.`
        });

        // Se la Donna era ospite di questa vittima sbranata, muore anche la Donna!
        if (donnaPlayer && donnaHost && donnaHost.id === wolfVictim.id) {
          deaths.set(donnaPlayer.id, "Morta insieme al suo ospite sbranato dai lupi");
          events.push({
            type: "death",
            icon: "💃💔",
            text: `<strong>${donnaPlayer.name}</strong> (La Donna) era ospite di ${donnaHost.name} ed è morta insieme a lui!`
          });
        }
      }
    }

    // Se la Strega ha usato la Pozione di Vita su qualcuno non attaccato dai Lupi
    if (healTargetPlayer && (!wolfVictim || healTargetPlayer.id !== wolfVictim.id)) {
      events.push({
        type: "saved",
        icon: "🧪",
        text: `La Strega ha somministrato la sua <strong>Pozione di Vita</strong> su <strong>${healTargetPlayer.name}</strong> (${healTargetPlayer.role.name}), che non era in pericolo mortale dai Lupi. La pozione è stata consumata!`
      });
    }

    // 2. Risoluzione Donna che visita un Lupo
    if (donnaPlayer && isDonnaVisitingWolf && !deaths.has(donnaPlayer.id)) {
      deaths.set(donnaPlayer.id, "Sbranata per essersi rifugiata da un Lupo Mannaro");
      events.push({
        type: "death",
        icon: "💃🐺",
        text: `<strong>${donnaPlayer.name}</strong> (La Donna) si è rifugiata da <strong>${donnaHost.name}</strong> che era un Lupo ed è morta sbranata!`
      });
    }

    // 3. Risoluzione Lupo Bianco
    const lupoBiancoPlayer = this.assignments.find(p => p.roleKey === "lupo_bianco" && p.isAlive);
    const lupoBiancoTargetId = lupoBiancoPlayer ? this.nightActions.lupoBiancoTarget : null;
    const lupoBiancoVictim = lupoBiancoTargetId ? this.assignments.find(p => p.id === lupoBiancoTargetId && p.isAlive) : null;
    if (lupoBiancoVictim && !deaths.has(lupoBiancoVictim.id)) {
      deaths.set(lupoBiancoVictim.id, "Sbranato alle spalle dal Lupo Bianco");
      events.push({
        type: "death",
        icon: "🐺❄️",
        text: `<strong>${lupoBiancoVictim.name}</strong> (${lupoBiancoVictim.role.name}) è stat${getSfx(lupoBiancoVictim.name)} sbranat${getSfx(lupoBiancoVictim.name)} a tradimento dal Lupo Bianco!`
      });
    }

    // 4. Risoluzione Pozione di Morte della Strega
    const witchKillId = (!isStregaSilenced && !this.witchDeathUsed) ? this.nightActions.witchKill : null;
    const witchVictim = witchKillId ? this.assignments.find(p => p.id === witchKillId && p.isAlive) : null;
    if (witchVictim && !deaths.has(witchVictim.id)) {
      this.witchDeathUsed = true;
      if (healTargetPlayer && healTargetPlayer.id === witchVictim.id) {
        events.push({
          type: "saved",
          icon: "🧪☠️",
          text: `La Strega ha somministrato sia la Pozione di Morte che la Pozione di Vita a <strong>${witchVictim.name}</strong>: l'antidoto ha neutralizzato il veleno!`
        });
      } else {
        deaths.set(witchVictim.id, "Avvelenato dalla Strega");
        events.push({
          type: "death",
          icon: "☠️",
          text: `<strong>${witchVictim.name}</strong> (${witchVictim.role.name}) è stat${getSfx(witchVictim.name)} avvelenat${getSfx(witchVictim.name)} dalla Strega con la Pozione di Morte!`
        });
      }
    }

    // 5. Risoluzione Innamorati a Catena (Cupido)
    if (this.lovers && this.lovers.length === 2) {
      const [lovId1, lovId2] = this.lovers;
      const lover1 = this.assignments.find(p => p.id === lovId1);
      const lover2 = this.assignments.find(p => p.id === lovId2);

      if (deaths.has(lovId1) && lover2 && lover2.isAlive && !deaths.has(lovId2)) {
        deaths.set(lovId2, `Morto di crepacuore per la perdita dell'innamorato (${lover1.name})`);
        events.push({
          type: "death",
          icon: "💔",
          text: `<strong>${lover2.name}</strong> muore all'istante di crepacuore per la morte del suo amore <strong>${lover1.name}</strong>!`
        });
      } else if (deaths.has(lovId2) && lover1 && lover1.isAlive && !deaths.has(lovId1)) {
        deaths.set(lovId1, `Morto di crepacuore per la perdita dell'innamorato (${lover2.name})`);
        events.push({
          type: "death",
          icon: "💔",
          text: `<strong>${lover1.name}</strong> muore all'istante di crepacuore per la morte del suo amore <strong>${lover2.name}</strong>!`
        });
      }
    }

    // 6. Notte serena se nessun morto
    if (deaths.size === 0) {
      events.push({
        type: "peaceful",
        icon: "☀️",
        text: "<strong>Notte serena:</strong> nessun abitante ha perso la vita stanotte! Il villaggio si risveglia illeso."
      });
    }

    // Applica le morti a assignments
    deaths.forEach((reason, playerId) => {
      const player = this.assignments.find(p => p.id === playerId);
      if (player) {
        player.isAlive = false;
      }
    });

    this.lastRoundDeaths = Array.from(deaths.keys()).map(id => this.assignments.find(p => p.id === id)).filter(Boolean);
    this.nightResolved = true;
    this.dawnReport = events;

    // Aggiorna registro e verifica vittoria
    this.renderMasterRoster();
    const winType = this.checkVictoryCondition();
    if (winType) {
      this.renderGameOverCard(null, winType);
    }
  }

  renderDawnSummaryWidget() {
    const dawnWidget = document.getElementById("lupus-dawn-summary-widget");
    if (!dawnWidget) return;
    dawnWidget.style.display = "block";

    if (!this.dawnReport || this.dawnReport.length === 0) {
      dawnWidget.innerHTML = `
        <div class="lupus-dawn-card">
          <div class="lupus-dawn-title">🌅 Risoluzione Notte ${this.nightCount}</div>
          <div class="lupus-dawn-event peaceful">☀️ Calcolo esiti della notte in corso...</div>
        </div>
      `;
      return;
    }

    const eventsHtml = this.dawnReport.map(ev => `
      <div class="lupus-dawn-event ${ev.type}">
        <span style="font-size: 1.25rem; line-height: 1;">${ev.icon}</span>
        <div>${ev.text}</div>
      </div>
    `).join("");

    const deadCount = this.lastRoundDeaths ? this.lastRoundDeaths.length : 0;

    dawnWidget.innerHTML = `
      <div class="lupus-dawn-card">
        <div class="lupus-dawn-title">
          <span>🌅 Esito Ufficiale della Notte ${this.nightCount}</span>
          <span style="font-size: 0.8rem; margin-left: auto; color: ${deadCount > 0 ? '#fca5a5' : '#6ee7b7'}; font-weight: 700;">
            ${deadCount === 0 ? 'Nessun Caduto' : `${deadCount} Cadut${deadCount === 1 ? 'o' : 'i'}`}
          </span>
        </div>
        ${eventsHtml}
        <div style="font-size: 0.82rem; color: #94a3b8; margin-top: 10px; text-align: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 8px;">
          📢 Il Narratore legge a voce alta l'esito. Il Registro Abitanti è stato aggiornato in automatico.
        </div>
      </div>
    `;
  }

  // =========================================================================
  // GESTIONE TIMER DISCUSSIONE / ROGO (Come Impostore)
  // =========================================================================

  resetDiscussionTimer() {
    clearInterval(this.discussionTimer);
    this.discussionTimer = null;
    this.isDiscussionRunning = false;
    this.discussionSeconds = this.initialDiscussionSeconds;
    this.updateTimerDisplay();
    const timerBtn = document.getElementById("lupus-timer-toggle-btn");
    if (timerBtn) timerBtn.textContent = "▶️ Avvia Timer";
  }

  updateTimerDisplay() {
    const timerDisplay = document.getElementById("lupus-timer-display");
    if (timerDisplay) {
      const mins = Math.floor(this.discussionSeconds / 60);
      const secs = this.discussionSeconds % 60;
      timerDisplay.textContent = `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }
  }

  startDiscussionTimerAuto() {
    if (this.isDiscussionRunning) return;
    if (this.discussionSeconds <= 0) {
      this.discussionSeconds = this.initialDiscussionSeconds;
    }
    this.isDiscussionRunning = true;
    const timerBtn = document.getElementById("lupus-timer-toggle-btn");
    if (timerBtn) timerBtn.textContent = "⏸️ Pausa Timer";
    this.updateTimerDisplay();

    clearInterval(this.discussionTimer);
    this.discussionTimer = setInterval(() => {
      if (this.discussionSeconds > 0) {
        this.discussionSeconds--;
        this.updateTimerDisplay();

        // Audio feedback
        if (this.discussionSeconds <= 10 && this.discussionSeconds > 0) {
          Sound.playTimerTick(true);
        } else if (this.discussionSeconds % 30 === 0 && this.discussionSeconds > 0) {
          Sound.playTimerTick(false);
        }
      } else {
        clearInterval(this.discussionTimer);
        this.discussionTimer = null;
        this.isDiscussionRunning = false;
        Sound.playTimerEnd();
        const tb = document.getElementById("lupus-timer-toggle-btn");
        if (tb) tb.textContent = "⏱️ Tempo Scaduto!";
        this.updateTimerDisplay();

        // Dopo 1 secondo avanza direttamente alla votazione del rogo
        setTimeout(() => {
          const steps = this.getRoundSteps();
          const votingIdx = steps.findIndex(s => s.type === "voting");
          if (votingIdx !== -1 && this.masterStepIndex !== votingIdx) {
            this.masterStepIndex = votingIdx;
            this.renderMasterPhaseGuide();
          }
        }, 1200);
      }
    }, 1000);
  }

  toggleDiscussionTimer() {
    Sound.playClick();
    const timerBtn = document.getElementById("lupus-timer-toggle-btn");

    if (this.isDiscussionRunning) {
      clearInterval(this.discussionTimer);
      this.discussionTimer = null;
      this.isDiscussionRunning = false;
      if (timerBtn) timerBtn.textContent = "▶️ Riprendi Timer";
    } else {
      this.startDiscussionTimerAuto();
    }
  }

  endDiscussionEarly() {
    Sound.playClick();
    clearInterval(this.discussionTimer);
    this.isDiscussionRunning = false;
    this.discussionSeconds = 0;
    this.updateTimerDisplay();
    Sound.playTimerEnd();

    // Avanza direttamente allo step di votazione
    const steps = this.getRoundSteps();
    const votingIdx = steps.findIndex(s => s.type === "voting");
    if (votingIdx !== -1) {
      this.masterStepIndex = votingIdx;
      this.renderMasterPhaseGuide();
    }
  }

  // =========================================================================
  // GESTIONE VOTAZIONE DEL ROGO (Selezione Singola & Prosecuzione Partita)
  // =========================================================================

  renderVotingGrid() {
    const grid = document.getElementById("lupus-voting-grid");
    const confirmBtn = document.getElementById("lupus-confirm-vote-btn");
    const resultBox = document.getElementById("lupus-vote-result-box");
    const prompt = document.getElementById("lupus-voting-prompt");
    if (!grid) return;

    if (this.voteConfirmed) {
      grid.style.display = "none";
      if (prompt) prompt.style.display = "none";
      if (confirmBtn) confirmBtn.style.display = "none";
      if (resultBox) resultBox.style.display = "block";
      return;
    }

    if (prompt) prompt.style.display = "block";
    grid.style.display = "grid";
    if (resultBox) resultBox.style.display = "none";

    if (confirmBtn) {
      confirmBtn.style.display = "block";
      confirmBtn.disabled = !this.selectedVotePlayerId;
      if (this.selectedVotePlayerId) {
        const selPlayer = this.assignments.find(p => p.id === this.selectedVotePlayerId);
        confirmBtn.innerHTML = `🔥 Condanna al Rogo: <strong>${selPlayer ? selPlayer.name : ''}</strong>`;
      } else {
        confirmBtn.innerHTML = "🔥 Seleziona un solo giocatore da condannare";
      }
    }

    grid.innerHTML = "";
    const alivePlayers = this.assignments.filter(p => p.isAlive);

    alivePlayers.forEach(player => {
      const card = document.createElement("div");
      const isSelected = this.selectedVotePlayerId === player.id;
      card.className = `vote-card ${isSelected ? "selected" : ""}`;
      card.innerHTML = `
        <div class="vote-avatar">${player.role.icon}</div>
        <div class="vote-name">${player.name}</div>
      `;

      card.addEventListener("click", () => {
        try { Sound.playClick(); } catch (e) {}
        this.selectedVotePlayerId = player.id;
        this.renderVotingGrid();
      });

      grid.appendChild(card);
    });
  }

  confirmRogoVote() {
    if (this.autoNextNightTimer) {
      clearInterval(this.autoNextNightTimer);
      this.autoNextNightTimer = null;
    }

    if (!this.selectedVotePlayerId) {
      alert("Seleziona prima l'unico abitante da condannare al rogo toccando la sua scheda.");
      return;
    }

    const condemned = this.assignments.find(p => p.id === this.selectedVotePlayerId);
    if (!condemned) return;

    try {
      Sound.playGameOver();
    } catch (e) {
      console.warn("Audio error:", e);
    }

    condemned.isAlive = false;
    this.voteConfirmed = true;

    // Gestione Innamorati (crepacuore al rogo)
    let partnerLover = null;
    if (this.lovers && this.lovers.includes(condemned.id)) {
      const partnerId = this.lovers.find(id => id !== condemned.id);
      const partner = this.assignments.find(p => p.id === partnerId);
      if (partner && partner.isAlive) {
        partner.isAlive = false;
        partnerLover = partner;
        this.lastRoundDeaths = [condemned, partner];
      } else {
        this.lastRoundDeaths = [condemned];
      }
    } else {
      this.lastRoundDeaths = [condemned];
    }

    // Aggiorna registro abitanti
    this.renderMasterRoster();

    // 1. Vittoria immediata se il Giullare viene condannato al rogo dal Villaggio!
    if (condemned.roleKey === "giullare") {
      this.renderGameOverCard(condemned, "giullare");
      return;
    }

    // 2. Verifica se la partita è finita per altre condizioni di vittoria
    const winType = this.checkVictoryCondition();

    if (winType) {
      this.renderGameOverCard(condemned, winType);
      return;
    }

    // Se la partita non è finita, mostra esito e avanza fluidamente
    this.renderRoundProceedCard(condemned, partnerLover);
  }

  renderRoundProceedCard(condemned, partnerLover = null) {
    if (this.autoNextNightTimer) {
      clearInterval(this.autoNextNightTimer);
      this.autoNextNightTimer = null;
    }

    const grid = document.getElementById("lupus-voting-grid");
    const confirmBtn = document.getElementById("lupus-confirm-vote-btn");
    const votingPrompt = document.getElementById("lupus-voting-prompt");
    const navControls = document.getElementById("lupus-step-nav-controls");
    const resultBox = document.getElementById("lupus-vote-result-box");
    const resultText = document.getElementById("lupus-vote-result-text");
    const countdownSec = document.getElementById("lupus-countdown-sec");
    const nextNightBtn = document.getElementById("lupus-btn-next-night");
    const phaseBadge = document.getElementById("lupus-phase-badge");
    const stepCounter = document.getElementById("lupus-step-counter");
    const stepTitle = document.getElementById("lupus-step-title");
    const stepDesc = document.getElementById("lupus-step-desc");

    // Nascondi griglia e prompt selezione
    if (grid) grid.style.display = "none";
    if (confirmBtn) confirmBtn.style.display = "none";
    if (votingPrompt) votingPrompt.style.display = "none";
    if (navControls) navControls.style.display = "none";

    const aliveCount = this.assignments.filter(p => p.isAlive).length;
    const aliveWolves = this.assignments.filter(p => p.isAlive && (["lupo", "lupo_stregone", "cane_nero", "lupo_bianco"].includes(p.roleKey) || (p.roleKey === "infiltrato" && p.isTransformed))).length;
    const sfx = condemned.name.endsWith("a") ? "a" : "o";

    if (phaseBadge) {
      phaseBadge.textContent = "Sentenza Eseguita 🔥";
      phaseBadge.className = "phase-badge badge-night";
    }
    if (stepCounter) {
      stepCounter.textContent = `Fine Round ${this.nightCount}`;
    }
    if (stepTitle) {
      stepTitle.textContent = `🔥 ${condemned.name} è stat${sfx} arso sul rogo!`;
    }
    if (stepDesc) {
      let loverHtml = "";
      if (partnerLover) {
        loverHtml = `
          <div style="margin-top: 10px; color: #f43f5e; font-weight: 700; background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.35); padding: 8px 12px; border-radius: var(--radius-sm);">
            💔 <strong>${partnerLover.name}</strong> (${partnerLover.role.name}) muore all'istante di crepacuore per la perdita dell'innamorato!
          </div>
        `;
      }
      stepDesc.innerHTML = `
        La sentenza del villaggio è compiuta. L'identità di <strong>${condemned.name}</strong> è svelata: era un <strong>${condemned.role.name}</strong> (${condemned.role.factionLabel}).<br>
        ${loverHtml}
        Il villaggio non è ancora salvo! Restano <strong>${aliveCount}</strong> abitanti vivi (${aliveWolves} lup${aliveWolves === 1 ? 'o' : 'i'}).
      `;
    }

    if (resultText) {
      let loverNote = partnerLover ? `<br><span style="color: #f43f5e; font-weight: 700;">💔 Anche ${partnerLover.name} (${partnerLover.role.name}) muore di crepacuore!</span>` : "";
      resultText.innerHTML = `
        🔥 <strong>${condemned.name}</strong> (${condemned.role.name}) è fuori dal gioco.${loverNote}<br>
        <span style="font-size: 0.88rem; color: #94a3b8; font-weight: 500;">
          Tutti gli abitanti chiudono gli occhi. È ora di iniziare il prossimo round notturno.
        </span>
      `;
    }

    const nextNightNum = this.nightCount + 1;
    if (nextNightBtn) {
      nextNightBtn.textContent = `🌙 Inizia la Notte ${nextNightNum} (Round ${nextNightNum}) ➡️`;
    }

    if (resultBox) {
      resultBox.style.display = "block";
    }

    // Timer di avanzamento automatico (4 secondi)
    let secondsLeft = 4;
    if (countdownSec) countdownSec.textContent = secondsLeft;

    this.autoNextNightTimer = setInterval(() => {
      secondsLeft--;
      if (countdownSec) countdownSec.textContent = secondsLeft;
      if (secondsLeft <= 0) {
        clearInterval(this.autoNextNightTimer);
        this.autoNextNightTimer = null;
        this.startNextNight();
      }
    }, 1000);

    const cardEl = document.querySelector(".lupus-phase-card");
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  renderGameOverCard(condemned, winType) {
    if (this.autoNextNightTimer) {
      clearInterval(this.autoNextNightTimer);
      this.autoNextNightTimer = null;
    }

    const timerWidget = document.getElementById("lupus-step-timer-widget");
    const votingWidget = document.getElementById("lupus-step-voting-widget");
    const navControls = document.getElementById("lupus-step-nav-controls");
    const gameoverWidget = document.getElementById("lupus-step-gameover-widget");
    const gameoverContent = document.getElementById("lupus-gameover-content");
    const phaseTitle = document.getElementById("lupus-phase-title");
    const phaseBadge = document.getElementById("lupus-phase-badge");
    const stepTitle = document.getElementById("lupus-step-title");
    const stepDesc = document.getElementById("lupus-step-desc");
    const stepCounter = document.getElementById("lupus-step-counter");

    if (timerWidget) timerWidget.style.display = "none";
    if (votingWidget) votingWidget.style.display = "none";
    if (navControls) navControls.style.display = "none";

    // Nascondi eventuale banner globale di vittoria duplicato sopra il registro, per non avere titoli ripetuti
    const victoryBanner = document.getElementById("lupus-victory-banner");
    if (victoryBanner) victoryBanner.style.display = "none";

    // Nascondi intestazione duplicata dello step nella scheda per lasciare spazio esclusivo alla card finale
    if (stepTitle) stepTitle.style.display = "none";
    if (stepDesc) stepDesc.style.display = "none";
    if (stepCounter) stepCounter.style.display = "none";

    if (!winType) {
      const alive = this.assignments.filter(p => p.isAlive);
      const aliveWolves = alive.filter(p => ["lupo", "lupo_stregone", "cane_nero", "lupo_bianco"].includes(p.roleKey) || (p.roleKey === "infiltrato" && p.isTransformed));
      winType = (aliveWolves.length === 0) ? "villaggio" : "lupi";
    }

    const isVillageWin = (winType === "villaggio");
    const isGiullareWin = (winType === "giullare");
    const isLupoBiancoWin = (winType === "lupo_bianco");
    const isWolvesWin = (winType === "lupi");

    if (phaseTitle) phaseTitle.textContent = `Round ${this.nightCount} - Epilogo 🏆`;
    if (phaseBadge) {
      phaseBadge.textContent = "🏆 Fine Partita";
      phaseBadge.className = "phase-badge " + (isVillageWin ? "badge-day" : (isGiullareWin || isLupoBiancoWin) ? "badge-solitario" : "badge-night");
    }

    if (gameoverWidget && gameoverContent) {
      gameoverWidget.style.display = "block";

      let playersHtml = "";
      this.assignments.forEach(p => {
        const isDead = !p.isAlive;
        const statusClass = isDead ? "dead" : "alive";
        const statusBadge = isDead ? "🔴 Morto" : "🟢 Sopravvissuto";
        const badgeClass = isDead ? "dead-badge" : "alive-badge";
        const factionColor = p.role.color || "#eab308";

        let extraBadge = "";
        if (isGiullareWin && p.roleKey === "giullare") {
          extraBadge = `<span style="font-size: 0.72rem; color: #f59e0b; font-weight: 800; margin-left: 6px;">🃏 VINCITORE SOLITARIO!</span>`;
        } else if (isLupoBiancoWin && p.roleKey === "lupo_bianco") {
          extraBadge = `<span style="font-size: 0.72rem; color: #38bdf8; font-weight: 800; margin-left: 6px;">🐺❄️ VINCITORE SOLITARIO!</span>`;
        } else if (isWolvesWin && p.roleKey === "infiltrato") {
          extraBadge = `<span style="font-size: 0.72rem; color: #ef4444; font-weight: 800; margin-left: 6px;">${p.isTransformed ? '🐺 Lupo Mannaro Trasformato!' : '🐺🌕 Vince con i Lupi!'}</span>`;
        }

        playersHtml += `
          <div class="lupus-gameover-player ${statusClass}">
            <div class="gameover-player-info">
              <span style="font-size: 1.35rem; flex-shrink: 0; line-height: 1;">${p.role.icon}</span>
              <div class="gameover-player-texts">
                <div class="gameover-player-name">${p.name} ${extraBadge}</div>
                <div class="gameover-player-role" style="color: ${factionColor};">${p.role.name} (${p.role.factionLabel})</div>
              </div>
            </div>
            <span class="role-badge ${badgeClass}">${statusBadge}</span>
          </div>
        `;
      });

      let headline = "TRIONFO DEL VILLAGGIO";
      let headlineColor = "#10b981";
      let victoryEmoji = "🎉👨‍🌾✨";
      let boxThemeClass = "village-wins";
      let victoryDesc = "Tutti i Lupi Mannari sono stati eliminati. Il villaggio è finalmente al sicuro!";

      if (isGiullareWin) {
        headline = "TRIONFO DEL GIULLARE!";
        headlineColor = "#f59e0b";
        victoryEmoji = "🃏🎭👑";
        boxThemeClass = "solitario-wins giullare-wins";
        victoryDesc = "Il Giullare è riuscito a farsi bruciare al rogo dal villaggio! Ha seminato il caos e vince la partita da solo!";
      } else if (isLupoBiancoWin) {
        headline = "IL LUPO BIANCO HA VINTO DA SOLO!";
        headlineColor = "#38bdf8";
        victoryEmoji = "🐺❄️👑";
        boxThemeClass = "solitario-wins lupo-bianco-wins";
        victoryDesc = "Il Lupo Bianco è l'ultimo e unico sopravvissuto della partita! Ha sbranato a tradimento tutti i compagni e i contadini!";
      } else if (isWolvesWin) {
        headline = "I LUPI MANNARI HANNO VINTO!";
        headlineColor = "#ef4444";
        victoryEmoji = "🐺🩸👑";
        boxThemeClass = "wolves-win";
        victoryDesc = "I Lupi Mannari eguagliano o superano i cittadini rimasti in vita. Il villaggio è caduto per sempre nelle loro fauci!";
      }

      gameoverContent.innerHTML = `
        <div class="lupus-gameover-box ${boxThemeClass}">
          <div class="gameover-emoji">${victoryEmoji}</div>
          <div class="gameover-headline" style="color: ${headlineColor};">${headline}</div>
          <p class="gameover-desc">${victoryDesc}</p>
          
          <div style="font-size: 0.88rem; font-weight: 800; color: #cbd5e1; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
            Identità e Ruoli di Tutti i Giocatori:
          </div>
          <div class="lupus-gameover-players-list">
            ${playersHtml}
          </div>

          <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button type="button" class="btn btn-primary" id="lupus-endgame-restart-btn" style="flex: 1.2; font-weight: 800;">
              🔄 Nuova Partita
            </button>
            <button type="button" class="btn btn-secondary btn-back-to-hub" style="flex: 1;">
              ⬅️ Hub Giochi
            </button>
          </div>
        </div>
      `;

      const restartBtn = document.getElementById("lupus-endgame-restart-btn");
      if (restartBtn) {
        restartBtn.addEventListener("click", () => {
          try { Sound.playClick(); } catch (e) {}
          this.startGame();
        });
      }

      try {
        if (isVillageWin) {
          Sound.playSuccess();
        } else if (isGiullareWin) {
          Sound.playImpostorReveal();
        } else {
          Sound.playGameOver();
        }
      } catch (e) {
        console.warn("Audio error:", e);
      }

      const cardEl = document.querySelector(".lupus-phase-card");
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  startNextNight() {
    if (this.autoNextNightTimer) {
      clearInterval(this.autoNextNightTimer);
      this.autoNextNightTimer = null;
    }
    try {
      Sound.playClick();
    } catch (e) {}

    this.nightCount++;
    this.selectedVotePlayerId = null;
    this.voteConfirmed = false;
    this.masterStepIndex = 0;
    this.resetDiscussionTimer();

    // Reset azioni notturne transitorie
    this.nightActions = {
      cupidoLovers: [...(this.lovers || [])],
      donnaTarget: null,
      wolfTarget: null,
      stregoneTarget: null,
      lupoBiancoTarget: null,
      guardTarget: null,
      seerTarget: null,
      witchHeal: false,
      witchHealTarget: null,
      witchKill: null,
      infiltratoRoll: null
    };
    this.nightResolved = false;
    this.preDawnAliveSnapshot = null;
    this.dawnReport = null;

    // Reset visivo dei widget del rogo, gameover, alba e azioni
    const resultBox = document.getElementById("lupus-vote-result-box");
    if (resultBox) resultBox.style.display = "none";
    const gameoverWidget = document.getElementById("lupus-step-gameover-widget");
    if (gameoverWidget) gameoverWidget.style.display = "none";
    const votingPrompt = document.getElementById("lupus-voting-prompt");
    if (votingPrompt) votingPrompt.style.display = "block";
    const dawnWidget = document.getElementById("lupus-dawn-summary-widget");
    if (dawnWidget) dawnWidget.style.display = "none";
    const actionWidget = document.getElementById("lupus-step-action-widget");
    if (actionWidget) actionWidget.style.display = "none";

    this.renderMasterPhaseGuide();
    this.renderMasterRoster();

    // Scroll verso la scheda dei passaggi
    const cardEl = document.querySelector(".lupus-phase-card");
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // =========================================================================
  // VERIFICA CONDIZIONE DI VITTORIA
  // =========================================================================

  checkVictoryCondition() {
    const banner = document.getElementById("lupus-victory-banner");

    const alive = this.assignments.filter(p => p.isAlive);
    const wolfThreatRoles = ["lupo", "lupo_stregone", "cane_nero", "lupo_bianco"];
    const aliveWolves = alive.filter(p => wolfThreatRoles.includes(p.roleKey) || (p.roleKey === "infiltrato" && p.isTransformed));
    // Infiltrato non trasformato conta tra i non lupi; da trasformato conta a tutti gli effetti come lupo
    const aliveNonWolves = alive.filter(p => !wolfThreatRoles.includes(p.roleKey) && !(p.roleKey === "infiltrato" && p.isTransformed));

    // 1. Lupo Bianco: ultimo in assoluto (unico superstite di tutta la partita)
    if (alive.length === 1 && alive[0].roleKey === "lupo_bianco") {
      if (banner) {
        banner.style.display = "block";
        banner.className = "lupus-victory-banner solitario-wins";
        banner.innerHTML = `
          <div style="font-size: 2.2rem; margin-bottom: 6px;">🐺❄️👑</div>
          <h3 style="font-size: 1.4rem; color: #38bdf8; font-weight: 900;">IL LUPO BIANCO HA VINTO DA SOLO!</h3>
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 4px;">
            Il Lupo Bianco è l'ultimo e unico sopravvissuto della partita! Ha sterminato sia il branco che il villaggio.
          </p>
        `;
      }
      try { Sound.playSuccess(); } catch (e) {}
      return "lupo_bianco";
    }

    // 2. Tutti i lupi morti -> Vittoria Villaggio!
    if (aliveWolves.length === 0) {
      if (banner) {
        banner.style.display = "block";
        banner.className = "lupus-victory-banner village-wins";
        banner.innerHTML = `
          <div style="font-size: 2.2rem; margin-bottom: 6px;">🎉👨‍🌾</div>
          <h3 style="font-size: 1.4rem; color: #10b981; font-weight: 900;">IL VILLAGGIO HA VINTO!</h3>
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 4px;">
            Tutti i Lupi Mannari sono stati individuati ed eliminati! Il villaggio è finalmente al sicuro.
          </p>
        `;
      }
      try { Sound.playSuccess(); } catch (e) {}
      return "villaggio";
    }

    // 3. I Lupi (Branco) vincono quando eguagliano o superano i non-lupi (Infiltrato trasformato è a tutti gli effetti un lupo del branco)
    const packWolves = alive.filter(p => ["lupo", "lupo_stregone", "cane_nero"].includes(p.roleKey) || (p.roleKey === "infiltrato" && p.isTransformed));
    if (packWolves.length > 0 && aliveWolves.length >= aliveNonWolves.length) {
      if (banner) {
        banner.style.display = "block";
        banner.className = "lupus-victory-banner wolves-win";
        banner.innerHTML = `
          <div style="font-size: 2.2rem; margin-bottom: 6px;">🐺🩸</div>
          <h3 style="font-size: 1.4rem; color: var(--accent-danger); font-weight: 900;">I LUPI HANNO VINTO!</h3>
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 4px;">
            I Lupi Mannari eguagliano o superano i cittadini rimasti. Il villaggio è caduto nelle fauci del branco!
          </p>
        `;
      }
      try { Sound.playGameOver(); } catch (e) {}
      return "lupi";
    }

    if (banner) banner.style.display = "none";
    return false;
  }
}

// Esporta globalmente
if (typeof window !== "undefined") {
  window.LupusGameController = LupusGameController;
  window.LUPUS_ROLES = LUPUS_ROLES;
  window.INFILTRATO_CONFIG = INFILTRATO_CONFIG;
}
