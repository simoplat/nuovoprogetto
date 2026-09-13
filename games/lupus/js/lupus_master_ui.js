/**
 * lupus_master_ui.js - Gestione Interfaccia Dashboard Narratore:
 * Registro Abitanti, Guida Fasi, Timer Discussione, Votazione Rogo e Game Over
 */

class LupusMasterUI {
  constructor(game) {
    this.game = game;
  }

  static setSafeInstruction(container, htmlString) {
    container.replaceChildren();
    if (!htmlString) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return document.createTextNode(node.textContent);
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        const allowed = ["em", "strong", "span", "b", "i", "u", "br", "small", "p", "div"];
        if (allowed.includes(tag)) {
          const el = document.createElement(tag);
          if (node.className) el.className = node.className;
          if (node.hasAttribute("style")) el.setAttribute("style", node.getAttribute("style"));
          for (const child of node.childNodes) {
            const walked = walk(child);
            if (walked) el.appendChild(walked);
          }
          return el;
        }
        return document.createTextNode(node.textContent);
      }
      return null;
    };
    for (const child of doc.body.childNodes) {
      const walked = walk(child);
      if (walked) container.appendChild(walked);
    }
  }

  setSafeInstruction(container, htmlString) {
    LupusMasterUI.setSafeInstruction(container, htmlString);
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

    grid.replaceChildren();
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

      const infoDiv = document.createElement("div");
      infoDiv.className = "roster-chip-info";

      const iconSpan = document.createElement("span");
      iconSpan.className = "roster-chip-icon";
      iconSpan.textContent = player.role.icon;

      const detailsDiv = document.createElement("div");

      const nameDiv = document.createElement("div");
      nameDiv.className = "roster-chip-name";
      nameDiv.textContent = player.name;

      if (player.online !== undefined) {
        const connSpan = document.createElement("span");
        connSpan.className = `conn-pill ${player.online ? "online" : "offline"}`;
        connSpan.style.marginLeft = "6px";
        connSpan.style.fontSize = "0.68rem";
        connSpan.title = player.online ? "Giocatore Connesso" : "Giocatore Disconnesso (il gioco continua)";
        connSpan.textContent = player.online ? "🟢 Connesso" : "🔴 Disconnesso";
        nameDiv.append(connSpan);
      }

      if (player.isLover) {
        const heartSpan = document.createElement("span");
        heartSpan.style.fontSize = "0.75rem";
        heartSpan.title = "Innamorato";
        heartSpan.textContent = " ❤️";
        nameDiv.append(heartSpan);
      }

      const roleDiv = document.createElement("div");
      roleDiv.className = "roster-chip-role";
      roleDiv.textContent = player.role.name;

      detailsDiv.append(nameDiv, roleDiv);
      infoDiv.append(iconSpan, detailsDiv);

      const statusBtn = document.createElement("button");
      statusBtn.type = "button";
      statusBtn.className = `btn-roster-status ${isStatusDisabled ? 'readonly-status' : ''}`;
      if (isStatusDisabled) {
        statusBtn.disabled = true;
        statusBtn.setAttribute("aria-disabled", "true");
      }
      statusBtn.title = btnTitle;
      statusBtn.textContent = player.isAlive ? "🟢 Vivo" : "🔴 Morto";

      chip.append(infoDiv, statusBtn);

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
      const beccamortoPlayer = game.assignments.find(p => p.roleKey === "beccamorto" && p.isAlive);
      const isSilenced = beccamortoPlayer && (game.nightActions.stregoneTarget === beccamortoPlayer.id);
      if (isSilenced) return { complete: true, message: "" };

      const deadPlayers = game.assignments.filter(p => !game.isPlayerAliveInRound(p));
      if (deadPlayers.length === 0) return { complete: true, message: "" };

      const complete = !!game.nightActions.beccamortoSeen && !!game.nightActions.beccamortoTarget;
      return {
        complete,
        message: complete ? "" : "Seleziona il defunto da consultare e tocca 'Ho mostrato l\'identità' per poter premere Avanti"
      };
    }

    if (subtype === "strega") {
      const healTargetId = game.nightActions.witchHealTarget;
      const poisonTargetId = game.nightActions.witchKill;
      const hasChosenLife = (typeof healTargetId === "string" && healTargetId.length > 0);
      const hasChosenPoison = (typeof poisonTargetId === "string" && poisonTargetId.length > 0);
      const lifeDone = game.witchLifeUsed || healTargetId !== undefined;
      const deathDone = game.witchDeathUsed || poisonTargetId !== undefined;
      const complete = hasChosenLife || hasChosenPoison || (lifeDone && deathDone);
      return {
        complete,
        message: complete ? "" : "Fai una scelta per la Strega (puoi usare al massimo 1 pozione a notte o nessuna) per poter premere Avanti"
      };
    }

    if (subtype === "necromante") {
      const necromantePlayer = game.assignments.find(p => p.roleKey === "necromante" && p.isAlive);
      const isSilenced = necromantePlayer && (game.nightActions.stregoneTarget === necromantePlayer.id);
      if (isSilenced) return { complete: true, message: "" };

      const deadPlayers = game.assignments.filter(p => !game.isPlayerAliveInRound(p));
      if (deadPlayers.length === 0) return { complete: true, message: "" };

      const complete = game.nightActions.necromanteTarget !== undefined;
      return {
        complete,
        message: complete ? "" : "Seleziona chi resuscitare o 'Passa il turno' per poter premere Avanti"
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
    if (stepDesc) this.setSafeInstruction(stepDesc, curStep.instruction);

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
        nextBtn.classList.remove("btn-dawn-next");
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

      const winType = game.checkVictoryCondition();
      if (winType) {
        game.renderGameOverCard(null, winType);
        return;
      }

      if (navControls) navControls.style.display = "flex";
      if (nextBtn) {
        nextBtn.style.display = "inline-flex";
        nextBtn.textContent = "Vai al Dibattito ☀️";
        nextBtn.disabled = false;
        nextBtn.title = "";
        nextBtn.classList.add("btn-dawn-next");
      }
      this.stopDiscussionTimer();
    } else if (curStep.type === "discussion") {
      if (actionWidget) actionWidget.style.display = "none";
      if (dawnWidget) dawnWidget.style.display = "none";
      if (timerWidget) timerWidget.style.display = "block";
      if (votingWidget) votingWidget.style.display = "none";
      if (navControls) navControls.style.display = "flex";
      if (nextBtn) {
        nextBtn.style.display = "none";
        nextBtn.classList.remove("btn-dawn-next");
      }
      this.startDiscussionTimerAuto();
    } else if (curStep.type === "voting") {
      if (actionWidget) actionWidget.style.display = "none";
      if (dawnWidget) dawnWidget.style.display = "none";
      if (timerWidget) timerWidget.style.display = "none";
      if (votingWidget) votingWidget.style.display = "block";
      this.renderVotingGrid();

      if (navControls) navControls.style.display = "flex";
      if (nextBtn) {
        nextBtn.style.display = "none";
        nextBtn.classList.remove("btn-dawn-next");
      }
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
      confirmBtn.replaceChildren();
      if (game.selectedVotePlayerId === "NO_ROGO") {
        const strong = document.createElement("strong");
        strong.textContent = "Nessun Rogo / Parità";
        confirmBtn.append("⚖️ Conferma: ", strong, " (Nessun Eliminato)");
      } else if (game.selectedVotePlayerId) {
        const selPlayer = game.assignments.find(p => p.id === game.selectedVotePlayerId);
        const strong = document.createElement("strong");
        strong.textContent = selPlayer ? selPlayer.name : "";
        confirmBtn.append("🔥 Condanna al Rogo: ", strong);
      } else {
        confirmBtn.textContent = "🔥 Seleziona un abitante o 'Nessun Rogo / Parità'";
      }
    }

    grid.replaceChildren();

    // Scheda speciale per Parità o Nessun Rogo
    const noRogoCard = document.createElement("div");
    const isNoRogoSelected = (game.selectedVotePlayerId === "NO_ROGO");
    noRogoCard.className = `vote-card vote-card-none ${isNoRogoSelected ? "selected" : ""}`;

    const noRogoAvatar = document.createElement("div");
    noRogoAvatar.className = "vote-avatar";
    noRogoAvatar.textContent = "⚖️";

    const noRogoName = document.createElement("div");
    noRogoName.className = "vote-name";
    noRogoName.textContent = "Nessun Rogo / Parità";

    noRogoCard.append(noRogoAvatar, noRogoName);
    noRogoCard.addEventListener("click", () => {
      try { Sound.playClick(); } catch (e) {}
      game.selectedVotePlayerId = "NO_ROGO";
      this.renderVotingGrid();
    });
    grid.appendChild(noRogoCard);

    const alivePlayers = game.assignments.filter(p => p.isAlive);

    alivePlayers.forEach(player => {
      const card = document.createElement("div");
      const isSelected = game.selectedVotePlayerId === player.id;
      card.className = `vote-card ${isSelected ? "selected" : ""}`;

      const avatar = document.createElement("div");
      avatar.className = "vote-avatar";
      avatar.textContent = player.role.icon;

      const name = document.createElement("div");
      name.className = "vote-name";
      name.textContent = player.name;

      card.append(avatar, name);

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
      alert("Seleziona un abitante da condannare al rogo oppure la scheda 'Nessun Rogo / Parità'.");
      return;
    }

    // Gestione Parità / Nessun Rogo
    if (game.selectedVotePlayerId === "NO_ROGO") {
      try {
        Sound.playClick();
      } catch (e) {}

      game.voteConfirmed = true;
      game.lastRoundDeaths = [];

      // Registra nella cronistoria
      if (game.matchLog && game.matchLog.length > 0) {
        const currentLog = game.matchLog.find(entry => entry.night === game.nightCount);
        if (currentLog) {
          currentLog.rogo = {
            condemned: null,
            partnerLover: null,
            reason: "Nessun abitante arso sul rogo (Parità di voti o clemenza)"
          };
        }
      }

      this.renderMasterRoster();

      // Verifica se comunque si verificano altre condizioni di vittoria
      const winType = game.checkVictoryCondition();
      if (winType) {
        this.renderGameOverCard(null, winType);
        return;
      }

      this.renderRoundProceedCard(null, null);
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

    // Registra sentenza del rogo nella cronistoria del round
    if (game.matchLog && game.matchLog.length > 0) {
      const currentLog = game.matchLog.find(entry => entry.night === game.nightCount);
      if (currentLog) {
        currentLog.rogo = {
          condemned: {
            name: condemned.name,
            roleName: condemned.role.name,
            factionLabel: condemned.role.factionLabel,
            icon: condemned.role.icon
          },
          partnerLover: partnerLover ? {
            name: partnerLover.name,
            roleName: partnerLover.role.name,
            icon: partnerLover.role.icon
          } : null
        };
      }
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

    if (!condemned) {
      if (phaseBadge) {
        phaseBadge.textContent = "Nessun Rogo ⚖️";
        phaseBadge.className = "phase-badge badge-day";
      }
      if (stepCounter) {
        stepCounter.textContent = `Fine Round ${game.nightCount}`;
      }
      if (stepTitle) {
        stepTitle.textContent = `⚖️ Nessun abitante è stato arso sul rogo!`;
      }
      if (stepDesc) {
        stepDesc.replaceChildren();
        const speech = document.createElement("em");
        speech.className = "narrator-speech";
        speech.textContent = "'Il villaggio non ha raggiunto una condanna: parità di voti o clemenza! Nessun abitante viene bruciato oggi.'";

        const strongAlive = document.createElement("strong");
        strongAlive.textContent = String(aliveCount);

        stepDesc.append(
          "Il Narratore annuncia ad alta voce: ", speech, document.createElement("br"),
          "Restano ", strongAlive, ` abitanti vivi (${aliveWolves} lup${aliveWolves === 1 ? 'o' : 'i'}).`
        );
      }
      if (resultText) {
        resultText.replaceChildren();
        const strongNone = document.createElement("strong");
        strongNone.textContent = "Nessun giocatore è stato eliminato al rogo.";

        const subSpan = document.createElement("span");
        subSpan.style.fontSize = "0.88rem";
        subSpan.style.color = "#94a3b8";
        subSpan.style.fontWeight = "500";
        subSpan.textContent = "Tutti gli abitanti chiudono gli occhi. È ora di iniziare il prossimo round notturno.";

        resultText.append("⚖️ ", strongNone, document.createElement("br"), subSpan);
      }
    } else {
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
        stepDesc.replaceChildren();
        const speech = document.createElement("em");
        speech.className = "narrator-speech";
        speech.textContent = `'La sentenza del villaggio è compiuta! ${condemned.name} è stat${sfx} condannat${sfx} al rogo!'`;

        const strongName = document.createElement("strong");
        strongName.textContent = condemned.name;

        const strongRole = document.createElement("strong");
        strongRole.textContent = condemned.role.name;

        const strongAlive = document.createElement("strong");
        strongAlive.textContent = String(aliveCount);

        stepDesc.append(
          "Il Narratore annuncia ad alta voce: ", speech, " L'identità di ",
          strongName, " è svelata: era un ", strongRole, ` (${condemned.role.factionLabel}).`,
          document.createElement("br")
        );

        if (partnerLover) {
          const loverDiv = document.createElement("div");
          loverDiv.style.marginTop = "10px";
          loverDiv.style.color = "#f43f5e";
          loverDiv.style.fontWeight = "700";
          loverDiv.style.background = "rgba(244, 63, 94, 0.15)";
          loverDiv.style.border = "1px solid rgba(244, 63, 94, 0.35)";
          loverDiv.style.padding = "8px 12px";
          loverDiv.style.borderRadius = "var(--radius-sm)";
          const strongLover = document.createElement("strong");
          strongLover.textContent = partnerLover.name;
          loverDiv.append("💔 ", strongLover, ` (${partnerLover.role.name}) muore all'istante di crepacuore per la perdita dell'innamorato!`);
          stepDesc.append(loverDiv);
        }

        stepDesc.append(`Il villaggio non è ancora salvo! Restano `, strongAlive, ` abitanti vivi (${aliveWolves} lup${aliveWolves === 1 ? 'o' : 'i'}).`);
      }

      if (resultText) {
        resultText.replaceChildren();
        const strongCondemned = document.createElement("strong");
        strongCondemned.textContent = condemned.name;
        resultText.append("🔥 ", strongCondemned, ` (${condemned.role.name}) è fuori dal gioco.`);

        if (partnerLover) {
          resultText.append(document.createElement("br"));
          const spanLover = document.createElement("span");
          spanLover.style.color = "#f43f5e";
          spanLover.style.fontWeight = "700";
          spanLover.textContent = `💔 Anche ${partnerLover.name} (${partnerLover.role.name}) muore di crepacuore!`;
          resultText.append(spanLover);
        }

        resultText.append(document.createElement("br"));
        const subSpan = document.createElement("span");
        subSpan.style.fontSize = "0.88rem";
        subSpan.style.color = "#94a3b8";
        subSpan.style.fontWeight = "500";
        subSpan.textContent = "Tutti gli abitanti chiudono gli occhi. È ora di iniziare il prossimo round notturno.";
        resultText.append(subSpan);
      }
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

    const isNessunoWin = (winType === "nessuno");
    const isVillageWin = (winType === "villaggio");
    const isGiullareWin = (winType === "giullare");
    const isLupoBiancoWin = (winType === "lupo_bianco");
    const isWolvesWin = (winType === "lupi");

    if (phaseTitle) phaseTitle.textContent = `Round ${game.nightCount} - Epilogo 🏆`;
    if (phaseBadge) {
      phaseBadge.textContent = isNessunoWin ? "🪦 Fine Partita" : "🏆 Fine Partita";
      phaseBadge.className = "phase-badge " + (isVillageWin ? "badge-day" : (isGiullareWin || isLupoBiancoWin) ? "badge-solitario" : "badge-night");
    }

    if (gameoverWidget && gameoverContent) {
      gameoverWidget.style.display = "block";
      gameoverContent.replaceChildren();

      let headline = "TRIONFO DEL VILLAGGIO";
      let headlineColor = "#10b981";
      let victoryEmoji = "🎉👨‍🌾✨";
      let boxThemeClass = "village-wins";
      let victoryDesc = "Tutti i Lupi Mannari sono stati eliminati. Il villaggio è finalmente al sicuro!";

      if (isNessunoWin) {
        headline = "NESSUN VINCITORE! (ESTINZIONE TOTALE)";
        headlineColor = "#94a3b8";
        victoryEmoji = "🪦💀🌫️";
        boxThemeClass = "wolves-win";
        victoryDesc = "Tutti gli abitanti del villaggio e i lupi sono caduti. Non è rimasto alcun superstite in vita: nessuno vince la partita!";
      } else if (isGiullareWin) {
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

      const box = document.createElement("div");
      box.className = `lupus-gameover-box ${boxThemeClass}`;

      const emojiDiv = document.createElement("div");
      emojiDiv.className = "gameover-emoji";
      emojiDiv.textContent = victoryEmoji;

      const headDiv = document.createElement("div");
      headDiv.className = "gameover-headline";
      headDiv.style.color = headlineColor;
      headDiv.textContent = headline;

      const descP = document.createElement("p");
      descP.className = "gameover-desc";
      descP.textContent = victoryDesc;

      const sectionTitle = document.createElement("div");
      sectionTitle.style.fontSize = "0.88rem";
      sectionTitle.style.fontWeight = "800";
      sectionTitle.style.color = "#cbd5e1";
      sectionTitle.style.marginBottom = "10px";
      sectionTitle.style.textTransform = "uppercase";
      sectionTitle.style.letterSpacing = "0.5px";
      sectionTitle.textContent = "Identità e Ruoli di Tutti i Giocatori:";

      const playersListContainer = document.createElement("div");
      playersListContainer.className = "lupus-gameover-players-list";

      game.assignments.forEach(p => {
        const isDead = !p.isAlive;
        const statusClass = isDead ? "dead" : "alive";
        const statusBadge = isDead ? "🔴 Morto" : "🟢 Sopravvissuto";
        const badgeClass = isDead ? "dead-badge" : "alive-badge";
        const factionColor = p.role.color || "#eab308";

        const row = document.createElement("div");
        row.className = `lupus-gameover-player ${statusClass}`;

        const info = document.createElement("div");
        info.className = "gameover-player-info";

        const iconSpan = document.createElement("span");
        iconSpan.style.fontSize = "1.35rem";
        iconSpan.style.flexShrink = "0";
        iconSpan.style.lineHeight = "1";
        iconSpan.textContent = p.role.icon;

        const texts = document.createElement("div");
        texts.className = "gameover-player-texts";

        const nameDiv = document.createElement("div");
        nameDiv.className = "gameover-player-name";
        nameDiv.textContent = p.name;

        if (isGiullareWin && p.roleKey === "giullare") {
          const badge = document.createElement("span");
          badge.style.fontSize = "0.72rem";
          badge.style.color = "#f59e0b";
          badge.style.fontWeight = "800";
          badge.style.marginLeft = "6px";
          badge.textContent = " 🃏 VINCITORE SOLITARIO!";
          nameDiv.append(badge);
        } else if (isLupoBiancoWin && p.roleKey === "lupo_bianco") {
          const badge = document.createElement("span");
          badge.style.fontSize = "0.72rem";
          badge.style.color = "#38bdf8";
          badge.style.fontWeight = "800";
          badge.style.marginLeft = "6px";
          badge.textContent = " 🐺❄️ VINCITORE SOLITARIO!";
          nameDiv.append(badge);
        } else if (isWolvesWin && p.roleKey === "infiltrato") {
          const badge = document.createElement("span");
          badge.style.fontSize = "0.72rem";
          badge.style.color = "#ef4444";
          badge.style.fontWeight = "800";
          badge.style.marginLeft = "6px";
          badge.textContent = p.isTransformed ? " 🐺 Lupo Mannaro Trasformato!" : " 🐺🌕 Vince con i Lupi!";
          nameDiv.append(badge);
        }

        const roleDiv = document.createElement("div");
        roleDiv.className = "gameover-player-role";
        roleDiv.style.color = factionColor;
        roleDiv.textContent = `${p.role.name} (${p.role.factionLabel})`;

        texts.append(nameDiv, roleDiv);
        info.append(iconSpan, texts);

        const statusBadgeSpan = document.createElement("span");
        statusBadgeSpan.className = `role-badge ${badgeClass}`;
        statusBadgeSpan.textContent = statusBadge;

        row.append(info, statusBadgeSpan);
        playersListContainer.append(row);
      });

      const btnRow = document.createElement("div");
      btnRow.style.display = "flex";
      btnRow.style.gap = "10px";
      btnRow.style.marginTop = "20px";

      const restartBtn = document.createElement("button");
      restartBtn.type = "button";
      restartBtn.className = "btn btn-primary";
      restartBtn.id = "lupus-endgame-restart-btn";
      restartBtn.style.flex = "1.2";
      restartBtn.style.fontWeight = "800";
      restartBtn.textContent = "🔄 Nuova Partita";

      const backHubBtn = document.createElement("button");
      backHubBtn.type = "button";
      backHubBtn.className = "btn btn-secondary btn-back-to-hub";
      backHubBtn.style.flex = "1";
      backHubBtn.textContent = "⬅️ Hub Giochi";

      btnRow.append(restartBtn, backHubBtn);

      const chronicleBtn = document.createElement("button");
      chronicleBtn.type = "button";
      chronicleBtn.className = "btn btn-secondary";
      chronicleBtn.id = "lupus-btn-open-chronicle";
      chronicleBtn.style.width = "100%";
      chronicleBtn.style.marginTop = "12px";
      chronicleBtn.style.fontWeight = "800";
      chronicleBtn.style.background = "rgba(56, 189, 248, 0.14)";
      chronicleBtn.style.border = "1.5px solid #38bdf8";
      chronicleBtn.style.color = "#e0f2fe";
      chronicleBtn.style.padding = "11px";
      chronicleBtn.style.borderRadius = "var(--radius-md)";
      chronicleBtn.style.fontSize = "0.92rem";
      chronicleBtn.style.cursor = "pointer";
      chronicleBtn.style.transition = "all 0.2s ease";
      chronicleBtn.textContent = "📜 Visualizza Registro Completo delle Azioni (Cronistoria Segreta)";

      restartBtn.addEventListener("click", () => {
        try { Sound.playClick(); } catch (e) {}
        if (game.isP2PMode) {
          if (window.LupusP2PGame) {
            window.LupusP2PGame.hostPrepareRematch();
          }
          return;
        }
        game.startGame();
      });

      chronicleBtn.addEventListener("click", () => {
        try { Sound.playClick(); } catch (e) {}
        this.renderChronicleModal();
      });

      box.append(emojiDiv, headDiv, descP, sectionTitle, playersListContainer, btnRow, chronicleBtn);
      gameoverContent.append(box);

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

  renderChronicleModal() {
    const game = this.game;
    let modalEl = document.getElementById("lupus-chronicle-modal");
    if (!modalEl) {
      modalEl = document.createElement("div");
      modalEl.id = "lupus-chronicle-modal";
      modalEl.className = "lupus-chronicle-overlay";
      document.body.appendChild(modalEl);
    }

    modalEl.replaceChildren();

    const dialog = document.createElement("div");
    dialog.className = "lupus-chronicle-dialog";

    const header = document.createElement("div");
    header.className = "lupus-chronicle-header";

    const titlesDiv = document.createElement("div");
    const mainTitle = document.createElement("div");
    mainTitle.className = "chronicle-main-title";
    mainTitle.textContent = "📜 Registro Completo delle Azioni (Cronistoria)";

    const subTitle = document.createElement("div");
    subTitle.className = "chronicle-sub-title";
    subTitle.textContent = "Riepilogo segreto di tutte le notti, scelte dei personaggi, esiti all'Alba e votazioni al Rogo";

    titlesDiv.append(mainTitle, subTitle);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "btn-chronicle-close";
    closeBtn.id = "lupus-chronicle-close-btn";
    closeBtn.setAttribute("aria-label", "Chiudi");
    closeBtn.textContent = "✖️";

    header.append(titlesDiv, closeBtn);

    const body = document.createElement("div");
    body.className = "lupus-chronicle-body";

    const log = game.matchLog || [];
    if (log.length === 0) {
      const emptyMsg = document.createElement("div");
      emptyMsg.style.textAlign = "center";
      emptyMsg.style.padding = "30px";
      emptyMsg.style.color = "#94a3b8";
      emptyMsg.textContent = "Nessuna azione notturna registrata per questa partita.";
      body.append(emptyMsg);
    } else {
      log.forEach(round => {
        const roundCard = document.createElement("div");
        roundCard.className = "lupus-chronicle-round-card";

        const roundHeader = document.createElement("div");
        roundHeader.className = "lupus-chronicle-round-header";
        const roundSpan = document.createElement("span");
        roundSpan.textContent = `🌙 Round ${round.night} (Notte & Giorno)`;
        roundHeader.append(roundSpan);

        // Actions section
        const actionsBox = document.createElement("div");
        actionsBox.className = "lupus-chronicle-section-box";
        const actionsTitle = document.createElement("div");
        actionsTitle.className = "chronicle-section-title";
        actionsTitle.textContent = "🤫 Scelte & Azioni Notturne Segrete:";
        const actionsList = document.createElement("div");
        actionsList.className = "lupus-chronicle-actions-list";

        if (round.actions && round.actions.length > 0) {
          round.actions.forEach(act => {
            const item = document.createElement("div");
            item.className = "lupus-chronicle-action-item";

            const iconSpan = document.createElement("span");
            iconSpan.className = "chronicle-action-icon";
            iconSpan.textContent = act.icon;

            const textDiv = document.createElement("div");
            textDiv.className = "chronicle-action-text";

            const itemTitle = document.createElement("div");
            itemTitle.className = "chronicle-action-title";
            itemTitle.textContent = act.title;

            const itemDetail = document.createElement("div");
            itemDetail.className = "chronicle-action-detail";
            this.setSafeInstruction(itemDetail, act.detail);

            textDiv.append(itemTitle, itemDetail);
            item.append(iconSpan, textDiv);
            actionsList.append(item);
          });
        } else {
          const noAct = document.createElement("div");
          noAct.style.color = "#94a3b8";
          noAct.style.fontSize = "0.85rem";
          noAct.textContent = "Nessuna azione notturna registrata.";
          actionsList.append(noAct);
        }
        actionsBox.append(actionsTitle, actionsList);

        // Dawn section
        const dawnBox = document.createElement("div");
        dawnBox.className = "lupus-chronicle-section-box dawn-box";
        const dawnTitle = document.createElement("div");
        dawnTitle.className = "chronicle-section-title";
        dawnTitle.textContent = "🌅 Risoluzione all'Alba:";
        const dawnList = document.createElement("div");
        dawnList.className = "lupus-chronicle-dawn-list";

        (round.dawnReport || []).forEach(ev => {
          const evItem = document.createElement("div");
          evItem.className = `lupus-chronicle-dawn-item ${ev.type}`;

          const evIcon = document.createElement("span");
          evIcon.style.fontSize = "1.15rem";
          evIcon.style.lineHeight = "1";
          evIcon.textContent = ev.icon;

          const evText = document.createElement("div");
          this.setSafeInstruction(evText, ev.text);

          evItem.append(evIcon, evText);
          dawnList.append(evItem);
        });
        dawnBox.append(dawnTitle, dawnList);

        roundCard.append(roundHeader, actionsBox, dawnBox);

        // Rogo section
        if (round.rogo) {
          const rogoBox = document.createElement("div");
          rogoBox.className = "lupus-chronicle-section-box rogo-box";

          const condemned = round.rogo.condemned;
          const partner = round.rogo.partnerLover;

          if (condemned) {
            const rogoTitle = document.createElement("div");
            rogoTitle.className = "chronicle-section-title";
            rogoTitle.textContent = `🔥 Sentenza del Rogo (Giorno ${round.night}):`;

            const rogoItem = document.createElement("div");
            rogoItem.className = "lupus-chronicle-rogo-item";

            const fireIcon = document.createElement("span");
            fireIcon.style.fontSize = "1.3rem";
            fireIcon.textContent = "🔥";

            const rogoTextDiv = document.createElement("div");
            const sfx = condemned.name.endsWith('a') ? 'a' : 'o';
            const strongName = document.createElement("strong");
            strongName.textContent = condemned.name;

            const roleSubDiv = document.createElement("div");
            roleSubDiv.style.color = "#cbd5e1";
            roleSubDiv.style.fontSize = "0.82rem";
            roleSubDiv.style.marginTop = "2px";
            const strongRole = document.createElement("strong");
            strongRole.textContent = condemned.roleName;
            roleSubDiv.append("Ruolo Svelato: ", strongRole, ` (${condemned.factionLabel})`);

            rogoTextDiv.append(strongName, ` è stat${sfx} condannat${sfx} al rogo dal villaggio!`, roleSubDiv);
            rogoItem.append(fireIcon, rogoTextDiv);
            rogoBox.append(rogoTitle, rogoItem);

            if (partner) {
              const loverItem = document.createElement("div");
              loverItem.className = "lupus-chronicle-rogo-item lover-death";

              const heartIcon = document.createElement("span");
              heartIcon.style.fontSize = "1.3rem";
              heartIcon.textContent = "💔";

              const loverTextDiv = document.createElement("div");
              const strongPartner = document.createElement("strong");
              strongPartner.textContent = partner.name;
              loverTextDiv.append(strongPartner, ` (${partner.roleName}) muore all'istante di crepacuore per la perdita dell'innamorato!`);

              loverItem.append(heartIcon, loverTextDiv);
              rogoBox.append(loverItem);
            }
          } else {
            const rogoTitle = document.createElement("div");
            rogoTitle.className = "chronicle-section-title";
            rogoTitle.textContent = `⚖️ Delibera del Giorno ${round.night}:`;

            const rogoItem = document.createElement("div");
            rogoItem.className = "lupus-chronicle-rogo-item";

            const scaleIcon = document.createElement("span");
            scaleIcon.style.fontSize = "1.3rem";
            scaleIcon.textContent = "⚖️";

            const rogoTextDiv = document.createElement("div");
            const strongNo = document.createElement("strong");
            strongNo.textContent = "Nessun abitante arso sul rogo";
            rogoTextDiv.append(strongNo, " (Parità di voti o clemenza del villaggio).");

            rogoItem.append(scaleIcon, rogoTextDiv);
            rogoBox.append(rogoTitle, rogoItem);
          }
          roundCard.append(rogoBox);
        }

        body.append(roundCard);
      });
    }

    const footer = document.createElement("div");
    footer.className = "lupus-chronicle-footer";

    const bottomCloseBtn = document.createElement("button");
    bottomCloseBtn.type = "button";
    bottomCloseBtn.className = "btn btn-secondary";
    bottomCloseBtn.id = "lupus-chronicle-bottom-close-btn";
    bottomCloseBtn.style.width = "100%";
    bottomCloseBtn.style.fontWeight = "700";
    bottomCloseBtn.textContent = "Chiudi Cronistoria ✖️";
    footer.append(bottomCloseBtn);

    dialog.append(header, body, footer);
    modalEl.append(dialog);

    modalEl.style.display = "flex";

    const closeHandler = () => {
      try { Sound.playClick(); } catch (e) {}
      modalEl.style.display = "none";
    };

    closeBtn.addEventListener("click", closeHandler);
    bottomCloseBtn.addEventListener("click", closeHandler);
    modalEl.onclick = (e) => {
      if (e.target === modalEl) closeHandler();
    };
  }
}

if (typeof window !== "undefined") {
  window.LupusMasterUI = LupusMasterUI;
}
