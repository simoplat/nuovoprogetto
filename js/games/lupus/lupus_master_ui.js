/**
 * lupus_master_ui.js - Gestione Interfaccia Dashboard Narratore:
 * Registro Abitanti, Guida Fasi, Timer Discussione, Votazione Rogo e Game Over
 */

class LupusMasterUI {
  constructor(game) {
    this.game = game;
  }

  renderMasterRoster() {
    const game = this.game;
    const grid = document.getElementById("lupus-master-roster");
    if (!grid) return;

    const steps = game.getRoundSteps();
    const curStep = steps[game.masterStepIndex];
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
    game.assignments.forEach(player => {
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
          const isGameOver = game.checkVictoryCondition();
          if (isGameOver) {
            this.renderGameOverCard(player, isGameOver);
          } else {
            const currentSteps = game.getRoundSteps();
            if (currentSteps[game.masterStepIndex] && currentSteps[game.masterStepIndex].type === "voting") {
              this.renderVotingGrid();
            }
          }
        });
      }

      grid.appendChild(chip);
    });

    const aliveCount = game.assignments.filter(p => p.isAlive).length;
    const totalCount = game.assignments.length;
    const countBadge = document.getElementById("lupus-alive-count-badge");
    if (countBadge) countBadge.textContent = `${aliveCount}/${totalCount} Vivi`;
  }

  isStepActionComplete(curStep) {
    if (!curStep) return { complete: true, message: "" };
    if (curStep.type !== "night") return { complete: true, message: "" };

    const game = this.game;
    const subtype = curStep.stepSubtype;

    if (subtype === "intro") {
      return { complete: true, message: "" };
    }

    if (subtype === "cupido") {
      const count = (game.nightActions.cupidoLovers || []).length;
      return {
        complete: count === 2,
        message: count === 2 ? "" : `Seleziona 2 persone per poter premere Avanti (${count}/2 scelti)`
      };
    }

    if (subtype === "donna") {
      const complete = game.nightActions.donnaTarget !== undefined;
      return {
        complete,
        message: complete ? "" : "Seleziona dove si rifugia la Donna (o 'A Casa Sua') per poter premere Avanti"
      };
    }

    if (subtype === "infiltrato_moon") {
      const infiltrato = game.assignments.find(p => p.roleKey === "infiltrato" && p.isAlive);
      const complete = !infiltrato || infiltrato.isTransformed || game.nightActions.infiltratoRoll !== null;
      return {
        complete,
        message: complete ? "" : "Lancia il dado della Luna Piena per poter premere Avanti"
      };
    }

    if (subtype === "lupi") {
      const complete = typeof game.nightActions.wolfTarget === "string" && game.nightActions.wolfTarget.length > 0;
      return {
        complete,
        message: complete ? "" : "I Lupi devono scegliere per forza un abitante da sbranare per poter premere Avanti"
      };
    }

    if (subtype === "lupo_stregone") {
      const complete = game.nightActions.stregoneTarget !== undefined;
      return {
        complete,
        message: complete ? "" : "Seleziona chi silenziare o 'Nessuno' per poter premere Avanti"
      };
    }

    if (subtype === "lupo_bianco") {
      const complete = game.nightActions.lupoBiancoTarget !== undefined;
      return {
        complete,
        message: complete ? "" : "Seleziona chi sbranare o 'Passa' per poter premere Avanti"
      };
    }

    if (subtype === "guardia") {
      const complete = game.nightActions.guardTarget !== undefined;
      return {
        complete,
        message: complete ? "" : "Seleziona chi proteggere (puoi scegliere anche Te stesso o Nessuno) per poter premere Avanti"
      };
    }

    if (subtype === "veggente") {
      const complete = game.nightActions.seerTarget !== undefined;
      return {
        complete,
        message: complete ? "" : "Seleziona chi scrutare (o 'Nessuno') per poter premere Avanti"
      };
    }

    if (subtype === "beccamorto") {
      const complete = !!game.nightActions.beccamortoSeen;
      return {
        complete,
        message: complete ? "" : "Tocca 'Ho mostrato l'identità al Beccamorto' per poter premere Avanti"
      };
    }

    if (subtype === "strega") {
      const lifeReady = game.witchLifeUsed || game.nightActions.witchHealTarget !== undefined;
      const deathReady = game.witchDeathUsed || game.nightActions.witchKill !== undefined;
      const complete = lifeReady && deathReady;
      return {
        complete,
        message: complete ? "" : "Fai una scelta per ciascuna pozione disponibile (o seleziona Non Usare) per poter premere Avanti"
      };
    }

    return { complete: true, message: "" };
  }

  updateNextBtnState() {
    const nextBtn = document.getElementById("lupus-master-next-step");
    if (!nextBtn) return;
    const steps = this.game.getRoundSteps();
    const curStep = steps[this.game.masterStepIndex];
    const status = this.isStepActionComplete(curStep);
    nextBtn.disabled = !status.complete;
    nextBtn.title = status.message;
  }

  renderMasterPhaseGuide() {
    const game = this.game;
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

    const steps = game.getRoundSteps();
    if (game.masterStepIndex >= steps.length) {
      game.masterStepIndex = steps.length - 1;
    }
    if (game.masterStepIndex < 0) {
      game.masterStepIndex = 0;
    }

    const curStep = steps[game.masterStepIndex];
    if (!curStep) return;

    const gameoverWidget = document.getElementById("lupus-step-gameover-widget");
    if (gameoverWidget) gameoverWidget.style.display = "none";

    if (phaseTitle) phaseTitle.textContent = `Round ${game.nightCount} 🐺`;
    if (phaseBadge) {
      phaseBadge.textContent = curStep.phaseBadge;
      phaseBadge.className = `phase-badge ${curStep.badgeClass}`;
    }
    if (stepCounter) stepCounter.textContent = `Passaggio ${game.masterStepIndex + 1} di ${steps.length}`;
    if (stepTitle) {
      stepTitle.textContent = curStep.title;
      stepTitle.style.color = "";
    }
    if (stepDesc) stepDesc.innerHTML = curStep.instruction;

    if (prevBtn) prevBtn.disabled = game.masterStepIndex === 0;

    // Gestione Widget specifici per ciascun passaggio
    if (curStep.type === "night") {
      if (timerWidget) timerWidget.style.display = "none";
      if (votingWidget) votingWidget.style.display = "none";
      if (dawnWidget) dawnWidget.style.display = "none";
      if (actionWidget) {
        actionWidget.style.display = "block";
        game.renderNightActionWidget(curStep.stepSubtype);
      }
      if (navControls) navControls.style.display = "flex";
      if (nextBtn) {
        nextBtn.style.display = "inline-flex";
        nextBtn.textContent = "Avanti ➡️";
        this.updateNextBtnState();
      }
      this.stopDiscussionTimer();
    } else if (curStep.type === "dawn") {
      if (timerWidget) timerWidget.style.display = "none";
      if (votingWidget) votingWidget.style.display = "none";
      if (actionWidget) actionWidget.style.display = "none";
      if (dawnWidget) {
        dawnWidget.style.display = "block";
        if (!game.nightResolved) {
          game.resolveNight();
        }
        game.renderDawnSummaryWidget();
      }
      if (navControls) navControls.style.display = "flex";
      if (nextBtn) {
        nextBtn.style.display = "inline-flex";
        nextBtn.textContent = "Vai al Dibattito ☀️";
        nextBtn.disabled = false;
        nextBtn.title = "";
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

    this.renderMasterRoster();
  }

  resetDiscussionTimer() {
    clearInterval(this.game.discussionTimer);
    this.game.discussionTimer = null;
    this.game.isDiscussionRunning = false;
    this.game.discussionSeconds = this.game.initialDiscussionSeconds;
    this.updateTimerDisplay();
    const timerBtn = document.getElementById("lupus-timer-toggle-btn");
    if (timerBtn) timerBtn.textContent = "▶️ Avvia Timer";
  }

  updateTimerDisplay() {
    const timerDisplay = document.getElementById("lupus-timer-display");
    if (timerDisplay) {
      const mins = Math.floor(this.game.discussionSeconds / 60);
      const secs = this.game.discussionSeconds % 60;
      timerDisplay.textContent = `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }
  }

  startDiscussionTimerAuto() {
    const game = this.game;
    if (game.isDiscussionRunning) return;
    if (game.discussionSeconds <= 0) {
      game.discussionSeconds = game.initialDiscussionSeconds;
    }
    game.isDiscussionRunning = true;
    const timerBtn = document.getElementById("lupus-timer-toggle-btn");
    if (timerBtn) timerBtn.textContent = "⏸️ Pausa Timer";
    this.updateTimerDisplay();

    clearInterval(game.discussionTimer);
    game.discussionTimer = setInterval(() => {
      if (game.discussionSeconds > 0) {
        game.discussionSeconds--;
        this.updateTimerDisplay();

        if (game.discussionSeconds <= 10 && game.discussionSeconds > 0) {
          Sound.playTimerTick(true);
        } else if (game.discussionSeconds % 30 === 0 && game.discussionSeconds > 0) {
          Sound.playTimerTick(false);
        }
      } else {
        clearInterval(game.discussionTimer);
        game.discussionTimer = null;
        game.isDiscussionRunning = false;
        Sound.playTimerEnd();
        const tb = document.getElementById("lupus-timer-toggle-btn");
        if (tb) tb.textContent = "⏱️ Tempo Scaduto!";
        this.updateTimerDisplay();

        setTimeout(() => {
          const steps = game.getRoundSteps();
          const votingIdx = steps.findIndex(s => s.type === "voting");
          if (votingIdx !== -1 && game.masterStepIndex !== votingIdx) {
            game.masterStepIndex = votingIdx;
            this.renderMasterPhaseGuide();
          }
        }, 1200);
      }
    }, 1000);
  }

  stopDiscussionTimer() {
    const game = this.game;
    if (game.isDiscussionRunning) {
      clearInterval(game.discussionTimer);
      game.discussionTimer = null;
      game.isDiscussionRunning = false;
      const timerBtn = document.getElementById("lupus-timer-toggle-btn");
      if (timerBtn) timerBtn.textContent = "▶️ Riprendi Timer";
    }
  }

  toggleDiscussionTimer() {
    Sound.playClick();
    const timerBtn = document.getElementById("lupus-timer-toggle-btn");

    if (this.game.isDiscussionRunning) {
      clearInterval(this.game.discussionTimer);
      this.game.discussionTimer = null;
      this.game.isDiscussionRunning = false;
      if (timerBtn) timerBtn.textContent = "▶️ Riprendi Timer";
    } else {
      this.startDiscussionTimerAuto();
    }
  }

  endDiscussionEarly() {
    Sound.playClick();
    clearInterval(this.game.discussionTimer);
    this.game.isDiscussionRunning = false;
    this.game.discussionSeconds = 0;
    this.updateTimerDisplay();
    Sound.playTimerEnd();

    const steps = this.game.getRoundSteps();
    const votingIdx = steps.findIndex(s => s.type === "voting");
    if (votingIdx !== -1) {
      this.game.masterStepIndex = votingIdx;
      this.renderMasterPhaseGuide();
    }
  }

  renderVotingGrid() {
    const game = this.game;
    const grid = document.getElementById("lupus-voting-grid");
    const confirmBtn = document.getElementById("lupus-confirm-vote-btn");
    const resultBox = document.getElementById("lupus-vote-result-box");
    const prompt = document.getElementById("lupus-voting-prompt");
    if (!grid) return;

    if (game.voteConfirmed) {
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
      confirmBtn.disabled = !game.selectedVotePlayerId;
      if (game.selectedVotePlayerId) {
        const selPlayer = game.assignments.find(p => p.id === game.selectedVotePlayerId);
        confirmBtn.innerHTML = `🔥 Condanna al Rogo: <strong>${selPlayer ? selPlayer.name : ''}</strong>`;
      } else {
        confirmBtn.innerHTML = "🔥 Seleziona un solo giocatore da condannare";
      }
    }

    grid.innerHTML = "";
    const alivePlayers = game.assignments.filter(p => p.isAlive);

    alivePlayers.forEach(player => {
      const card = document.createElement("div");
      const isSelected = game.selectedVotePlayerId === player.id;
      card.className = `vote-card ${isSelected ? "selected" : ""}`;
      card.innerHTML = `
        <div class="vote-avatar">${player.role.icon}</div>
        <div class="vote-name">${player.name}</div>
      `;

      card.addEventListener("click", () => {
        try { Sound.playClick(); } catch (e) {}
        game.selectedVotePlayerId = player.id;
        this.renderVotingGrid();
      });

      grid.appendChild(card);
    });
  }

  confirmRogoVote() {
    const game = this.game;
    if (game.autoNextNightTimer) {
      clearInterval(game.autoNextNightTimer);
      game.autoNextNightTimer = null;
    }

    if (!game.selectedVotePlayerId) {
      alert("Seleziona prima l'unico abitante da condannare al rogo toccando la sua scheda.");
      return;
    }

    const condemned = game.assignments.find(p => p.id === game.selectedVotePlayerId);
    if (!condemned) return;

    try {
      Sound.playGameOver();
    } catch (e) {
      console.warn("Audio error:", e);
    }

    condemned.isAlive = false;
    game.voteConfirmed = true;

    // Gestione Innamorati (crepacuore al rogo)
    let partnerLover = null;
    if (game.lovers && game.lovers.includes(condemned.id)) {
      const partnerId = game.lovers.find(id => id !== condemned.id);
      const partner = game.assignments.find(p => p.id === partnerId);
      if (partner && partner.isAlive) {
        partner.isAlive = false;
        partnerLover = partner;
        game.lastRoundDeaths = [condemned, partner];
      } else {
        game.lastRoundDeaths = [condemned];
      }
    } else {
      game.lastRoundDeaths = [condemned];
    }

    this.renderMasterRoster();

    // 1. Vittoria immediata se il Giullare viene condannato al rogo dal Villaggio!
    if (condemned.roleKey === "giullare") {
      this.renderGameOverCard(condemned, "giullare");
      return;
    }

    // 2. Verifica se la partita è finita per altre condizioni di vittoria
    const winType = game.checkVictoryCondition();
    if (winType) {
      this.renderGameOverCard(condemned, winType);
      return;
    }

    // Se la partita non è finita, mostra esito e avanza fluidamente
    this.renderRoundProceedCard(condemned, partnerLover);
  }

  renderRoundProceedCard(condemned, partnerLover = null) {
    const game = this.game;
    if (game.autoNextNightTimer) {
      clearInterval(game.autoNextNightTimer);
      game.autoNextNightTimer = null;
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

    if (grid) grid.style.display = "none";
    if (confirmBtn) confirmBtn.style.display = "none";
    if (votingPrompt) votingPrompt.style.display = "none";
    if (navControls) navControls.style.display = "none";

    const aliveCount = game.assignments.filter(p => p.isAlive).length;
    const aliveWolves = game.assignments.filter(p => p.isAlive && (["lupo", "lupo_stregone", "cane_nero", "lupo_bianco"].includes(p.roleKey) || (p.roleKey === "infiltrato" && p.isTransformed))).length;
    const sfx = condemned.name.endsWith("a") ? "a" : "o";

    if (phaseBadge) {
      phaseBadge.textContent = "Sentenza Eseguita 🔥";
      phaseBadge.className = "phase-badge badge-night";
    }
    if (stepCounter) {
      stepCounter.textContent = `Fine Round ${game.nightCount}`;
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

    const nextNightNum = game.nightCount + 1;
    if (nextNightBtn) {
      nextNightBtn.textContent = `🌙 Inizia la Notte ${nextNightNum} (Round ${nextNightNum}) ➡️`;
    }

    if (resultBox) {
      resultBox.style.display = "block";
    }

    let secondsLeft = 4;
    if (countdownSec) countdownSec.textContent = secondsLeft;

    game.autoNextNightTimer = setInterval(() => {
      secondsLeft--;
      if (countdownSec) countdownSec.textContent = secondsLeft;
      if (secondsLeft <= 0) {
        clearInterval(game.autoNextNightTimer);
        game.autoNextNightTimer = null;
        game.startNextNight();
      }
    }, 1000);

    const cardEl = document.querySelector(".lupus-phase-card");
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  renderGameOverCard(condemned, winType) {
    const game = this.game;
    if (game.autoNextNightTimer) {
      clearInterval(game.autoNextNightTimer);
      game.autoNextNightTimer = null;
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

    const victoryBanner = document.getElementById("lupus-victory-banner");
    if (victoryBanner) victoryBanner.style.display = "none";

    if (stepTitle) stepTitle.style.display = "none";
    if (stepDesc) stepDesc.style.display = "none";
    if (stepCounter) stepCounter.style.display = "none";

    if (!winType) {
      const alive = game.assignments.filter(p => p.isAlive);
      const aliveWolves = alive.filter(p => ["lupo", "lupo_stregone", "cane_nero", "lupo_bianco"].includes(p.roleKey) || (p.roleKey === "infiltrato" && p.isTransformed));
      winType = (aliveWolves.length === 0) ? "villaggio" : "lupi";
    }

    const isVillageWin = (winType === "villaggio");
    const isGiullareWin = (winType === "giullare");
    const isLupoBiancoWin = (winType === "lupo_bianco");
    const isWolvesWin = (winType === "lupi");

    if (phaseTitle) phaseTitle.textContent = `Round ${game.nightCount} - Epilogo 🏆`;
    if (phaseBadge) {
      phaseBadge.textContent = "🏆 Fine Partita";
      phaseBadge.className = "phase-badge " + (isVillageWin ? "badge-day" : (isGiullareWin || isLupoBiancoWin) ? "badge-solitario" : "badge-night");
    }

    if (gameoverWidget && gameoverContent) {
      gameoverWidget.style.display = "block";

      let playersHtml = "";
      game.assignments.forEach(p => {
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
          game.startGame();
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
}

if (typeof window !== "undefined") {
  window.LupusMasterUI = LupusMasterUI;
}
