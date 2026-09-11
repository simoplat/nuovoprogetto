/**
 * LupusGameController - Controller Principale per "Lupus in Fabula"
 * 
 * Architettura modulare:
 * - lupus_roles.js: Definizioni ruoli (LUPUS_ROLES) e configurazione probabilistica (INFILTRATO_CONFIG)
 * - lupus_setup_ui.js: Gestione setup, lista partecipanti e rotazione "Passa il Telefono" (LupusSetupUI)
 * - lupus_master_ui.js: Gestione registro abitanti, timer e votazione del rogo (LupusMasterUI)
 * - lupus_night_resolver.js: Calcolo e risoluzione all'Alba di attacchi, protezioni e pozioni (LupusNightResolver)
 * - lupus_night_widgets.js: Rendering dei widget interattivi per le azioni notturne (LupusNightWidgets)
 */

class LupusGameController {
  constructor() {
    this.setupUI = new LupusSetupUI(this);
    this.masterUI = new LupusMasterUI(this);
    this.nightResolver = new LupusNightResolver(this);
    this.nightWidgets = new LupusNightWidgets(this);

    this.players = this.loadSavedPlayers() || [
      "Marco", "Sofia", "Luca", "Giulia", "Matteo", "Elena"
    ];
    this.wolvesCount = 1;

    // Timer Discussione
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
    this.assignments = [];
    this.currentTurnIndex = 0;

    // Gestione Hold-to-Reveal di sicurezza
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

    // Configurazione probabilità Lupo Mannaro / Infiltrato
    this.infiltratoConfig = { ...INFILTRATO_CONFIG };

    // Stato notturno interattivo e pozioni persistenti
    this.lovers = [];
    this.witchLifeUsed = false;
    this.witchDeathUsed = false;
    this.lastRoundDeaths = [];
    this.nightActions = {
      cupidoLovers: [],
      donnaTarget: undefined,
      wolfTarget: undefined,
      stregoneTarget: undefined,
      lupoBiancoTarget: undefined,
      guardTarget: undefined,
      seerTarget: undefined,
      witchHeal: false,
      witchHealTarget: undefined,
      witchKill: undefined,
      infiltratoRoll: null,
      beccamortoSeen: false
    };
    this.nightResolved = false;
    this.preDawnAliveSnapshot = null;
    this.preDawnWitchLifeSnapshot = false;
    this.preDawnWitchDeathSnapshot = false;
    this.dawnReport = null;

    this.bindSetupEvents();
  }

  // =========================================================================
  // SETUP & ROTAZIONE PASSA IL TELEFONO (Delegati a LupusSetupUI)
  // =========================================================================

  bindSetupEvents() { return this.setupUI.bindSetupEvents(); }
  renderSetupView() { return this.setupUI.renderSetupView(); }
  renderPlayersList() { return this.setupUI.renderPlayersList(); }
  addNewPlayer() { return this.setupUI.addNewPlayer(); }
  fillQuickNames() { return this.setupUI.fillQuickNames(); }
  adjustDiscussionTime(delta) { return this.setupUI.adjustDiscussionTime(delta); }
  updateDiscussionTimeLimits() { return this.setupUI.updateDiscussionTimeLimits(); }
  adjustWolvesCount(delta) { return this.setupUI.adjustWolvesCount(delta); }
  ensureValidWolvesCount() { return this.setupUI.ensureValidWolvesCount(); }
  updateWolvesDisplay() { return this.setupUI.updateWolvesDisplay(); }
  validateRolesAndRenderSummary() { return this.setupUI.validateRolesAndRenderSummary(); }
  loadSavedPlayers() { return this.setupUI.loadSavedPlayers(); }
  savePlayers() { return this.setupUI.savePlayers(); }
  renderTurnReveal() { return this.setupUI.renderTurnReveal(); }
  onHoldStart() { return this.setupUI.onHoldStart(); }
  onHoldEnd() { return this.setupUI.onHoldEnd(); }
  revealCardContent() { return this.setupUI.revealCardContent(); }
  nextTurn() { return this.setupUI.nextTurn(); }

  // =========================================================================
  // DASHBOARD NARRATORE, TIMER, VOTO E ROGO (Delegati a LupusMasterUI)
  // =========================================================================

  renderMasterRoster() { return this.masterUI.renderMasterRoster(); }
  renderMasterPhaseGuide() { return this.masterUI.renderMasterPhaseGuide(); }
  resetDiscussionTimer() { return this.masterUI.resetDiscussionTimer(); }
  updateTimerDisplay() { return this.masterUI.updateTimerDisplay(); }
  startDiscussionTimerAuto() { return this.masterUI.startDiscussionTimerAuto(); }
  stopDiscussionTimer() { return this.masterUI.stopDiscussionTimer(); }
  toggleDiscussionTimer() { return this.masterUI.toggleDiscussionTimer(); }
  endDiscussionEarly() { return this.masterUI.endDiscussionEarly(); }
  renderVotingGrid() { return this.masterUI.renderVotingGrid(); }
  confirmRogoVote() { return this.masterUI.confirmRogoVote(); }
  renderRoundProceedCard(condemned, partnerLover = null) { return this.masterUI.renderRoundProceedCard(condemned, partnerLover); }
  renderGameOverCard(condemned, winType) { return this.masterUI.renderGameOverCard(condemned, winType); }

  // =========================================================================
  // RISOLUZIONE NOTTE & WIDGET AZIONI (Delegati a Resolver & Widgets)
  // =========================================================================

  resolveNight() { return this.nightResolver.resolveNight(); }
  renderDawnSummaryWidget() { return this.nightResolver.renderDawnSummaryWidget(); }
  renderNightActionWidget(stepSubtype) { return this.nightWidgets.renderNightActionWidget(stepSubtype); }

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

    const rolesRef = (typeof window !== "undefined" && window.LUPUS_ROLES) ? window.LUPUS_ROLES : LUPUS_ROLES;

    // 5. Assegna a ciascun giocatore
    this.assignments = this.players.map((name, i) => {
      const roleKey = roleDeck[i];
      return {
        id: `p_${i}`,
        name: name,
        roleKey: roleKey,
        role: rolesRef[roleKey],
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
    this.lovers = [];
    this.witchLifeUsed = false;
    this.witchDeathUsed = false;
    this.lastRoundDeaths = [];
    this.nightActions = {
      cupidoLovers: [],
      donnaTarget: undefined,
      wolfTarget: undefined,
      stregoneTarget: undefined,
      lupoBiancoTarget: undefined,
      guardTarget: undefined,
      seerTarget: undefined,
      witchHeal: false,
      witchHealTarget: undefined,
      witchKill: undefined,
      infiltratoRoll: null,
      beccamortoSeen: false
    };
    this.nightResolved = false;
    this.preDawnAliveSnapshot = null;
    this.dawnReport = null;

    window.App.switchView("view-lupus-pass");
    this.renderTurnReveal();
  }

  isPlayerAliveInRound(p) {
    if (!p) return false;
    if (this.roundStartAliveSnapshot && this.roundStartAliveSnapshot.has(p.id)) {
      return this.roundStartAliveSnapshot.get(p.id);
    }
    return p.isAlive;
  }

  initMasterDashboard() {
    this.nightCount = 1;
    this.masterStepIndex = 0;
    this.selectedVotePlayerId = null;
    this.voteConfirmed = false;
    this.roundStartAliveSnapshot = new Map(this.assignments.map(p => [p.id, p.isAlive]));
    this.roundStartTransformedSnapshot = new Map(this.assignments.map(p => [p.id, !!p.isTransformed]));
    this.resetDiscussionTimer();

    this.renderMasterRoster();
    this.renderMasterPhaseGuide();
    this.checkVictoryCondition();
  }

  /**
   * Genera l'elenco sequenziale completo di tutti i passaggi del round
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
    const donnaAlive = this.assignments.some(p => p.roleKey === "donna" && this.isPlayerAliveInRound(p));
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

    // 3b. La Luna Piena del Lupo Mannaro (se abilitato, vivo e non ancora trasformato all'inizio del round)
    const infiltratoPlayer = this.assignments.find(p => p.roleKey === "infiltrato" && this.isPlayerAliveInRound(p));
    const wasTransformedAtRoundStart = infiltratoPlayer && (this.roundStartTransformedSnapshot ? this.roundStartTransformedSnapshot.get(infiltratoPlayer.id) : infiltratoPlayer.isTransformed);
    if (this.enabledRoles.infiltrato && infiltratoPlayer && !wasTransformedAtRoundStart) {
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
    const wolvesAlive = this.assignments.some(p => (wolfRoles.includes(p.roleKey) || (p.roleKey === "infiltrato" && p.isTransformed)) && this.isPlayerAliveInRound(p));
    if (wolvesAlive) {
      const infiltratoTransformed = this.assignments.find(p => p.roleKey === "infiltrato" && this.isPlayerAliveInRound(p) && p.isTransformed);
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
    const stregoneAlive = this.assignments.some(p => p.roleKey === "lupo_stregone" && this.isPlayerAliveInRound(p));
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
    const lupoBiancoAlive = this.assignments.some(p => p.roleKey === "lupo_bianco" && this.isPlayerAliveInRound(p));
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
    const guardiaAlive = this.assignments.some(p => p.roleKey === "guardia" && this.isPlayerAliveInRound(p));
    if (this.enabledRoles.guardia && guardiaAlive) {
      steps.push({
        type: "night",
        stepSubtype: "guardia",
        phaseBadge: `Notte ${this.nightCount} 🌙`,
        badgeClass: "badge-night",
        title: "🛡️ Risveglio della Guardia",
        instruction: "Il Narratore dice: <em>'La Guardia apra gli occhi e indichi chi proteggere con il suo scudo.'</em> La Guardia indica un abitante (può proteggere anche se stessa). Lo scudo salverà il prescelto da qualsiasi attacco dei Lupi (compreso il Lupo Bianco)!"
      });
    }

    // 6. Il Veggente (se abilitato e vivo)
    const veggenteAlive = this.assignments.some(p => p.roleKey === "veggente" && this.isPlayerAliveInRound(p));
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
    const beccamortoAlive = this.assignments.some(p => p.roleKey === "beccamorto" && this.isPlayerAliveInRound(p));
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
    const stregaAlive = this.assignments.some(p => p.roleKey === "strega" && this.isPlayerAliveInRound(p));
    if (this.enabledRoles.strega && stregaAlive) {
      steps.push({
        type: "night",
        stepSubtype: "strega",
        phaseBadge: `Notte ${this.nightCount} 🌙`,
        badgeClass: "badge-night",
        title: "🧙‍♀️ Risveglio della Strega",
        instruction: "Il Narratore dice: <em>'La Strega apra gli occhi.'</em> Il Narratore le mostra la vittima dei lupi. La Strega decide se usare la pozione di vita oppure la pozione di morte (al massimo 1 sola pozione a notte)."
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

  isStepActionComplete(curStep) {
    return this.masterUI.isStepActionComplete(curStep);
  }

  masterNextStep() {
    Sound.playClick();
    const steps = this.getRoundSteps();
    const curStep = steps[this.masterStepIndex];
    if (curStep && curStep.type === "night") {
      const check = this.masterUI.isStepActionComplete(curStep);
      if (!check.complete) {
        return;
      }
    }
    // Transizione esplicita e sicura da Alba a Dibattito
    if (curStep && curStep.type === "dawn") {
      const discIdx = steps.findIndex(s => s.type === "discussion");
      if (discIdx !== -1) {
        this.masterStepIndex = discIdx;
        this.renderMasterPhaseGuide();
        return;
      }
    }
    if (this.masterStepIndex < steps.length - 1) {
      this.masterStepIndex++;
      this.renderMasterPhaseGuide();
    }
  }

  masterPrevStep() {
    Sound.playClick();
    const steps = this.getRoundSteps();
    const curStep = steps[this.masterStepIndex];
    if (curStep && curStep.type === "discussion") {
      const dawnIdx = steps.findIndex(s => s.type === "dawn");
      if (dawnIdx !== -1) {
        this.masterStepIndex = dawnIdx;
        this.renderMasterPhaseGuide();
        return;
      }
    }
    if (this.masterStepIndex > 0) {
      if (curStep && curStep.type === "dawn" && this.nightResolved && this.preDawnAliveSnapshot) {
        this.assignments.forEach((p, idx) => {
          p.isAlive = this.preDawnAliveSnapshot[idx];
        });
        this.witchLifeUsed = this.preDawnWitchLifeSnapshot;
        this.witchDeathUsed = this.preDawnWitchDeathSnapshot;
        this.nightResolved = false;
        this.dawnReport = null;
        this.roundStartAliveSnapshot = new Map(this.assignments.map(p => [p.id, p.isAlive]));
        this.roundStartTransformedSnapshot = new Map(this.assignments.map(p => [p.id, !!p.isTransformed]));
      }
      this.masterStepIndex--;
      this.renderMasterPhaseGuide();
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
    this.roundStartAliveSnapshot = new Map(this.assignments.map(p => [p.id, p.isAlive]));
    this.roundStartTransformedSnapshot = new Map(this.assignments.map(p => [p.id, !!p.isTransformed]));
    this.resetDiscussionTimer();

    // Reset azioni notturne transitorie
    this.nightActions = {
      cupidoLovers: [...(this.lovers || [])],
      donnaTarget: undefined,
      wolfTarget: undefined,
      stregoneTarget: undefined,
      lupoBiancoTarget: undefined,
      guardTarget: undefined,
      seerTarget: undefined,
      witchHeal: false,
      witchHealTarget: undefined,
      witchKill: undefined,
      infiltratoRoll: null,
      beccamortoSeen: false
    };
    this.nightResolved = false;
    this.preDawnAliveSnapshot = null;
    this.dawnReport = null;

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

    const cardEl = document.querySelector(".lupus-phase-card");
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  checkVictoryCondition() {
    const banner = document.getElementById("lupus-victory-banner");

    const alive = this.assignments.filter(p => p.isAlive);
    const wolfThreatRoles = ["lupo", "lupo_stregone", "cane_nero", "lupo_bianco"];
    const aliveWolves = alive.filter(p => wolfThreatRoles.includes(p.roleKey) || (p.roleKey === "infiltrato" && p.isTransformed));
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

    // 3. I Lupi vincono quando eguagliano o superano i non-lupi
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
}
