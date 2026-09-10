/**
 * lupus_night_widgets.js - Rendering e interazioni per i widget delle azioni notturne
 */

class LupusNightWidgets {
  constructor(game) {
    this.game = game;
  }

  renderNightActionWidget(stepSubtype) {
    const game = this.game;
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
      const alive = game.assignments.filter(p => p.isAlive);
      const currentSelected = game.nightActions.cupidoLovers || [];
      const nextBtn = document.getElementById("lupus-master-next-step");
      if (nextBtn) {
        nextBtn.disabled = currentSelected.length !== 2;
        nextBtn.title = currentSelected.length !== 2 ? "Seleziona 2 persone per poter premere Avanti" : "";
      }
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
        const p1 = game.assignments.find(p => p.id === currentSelected[0]);
        const p2 = game.assignments.find(p => p.id === currentSelected[1]);
        statusText = `💘 Innamorati legati: <strong>${p1?.name}</strong> ❤️ <strong>${p2?.name}</strong> (2/2 selezionati - Puoi premere Avanti)`;
      } else {
        statusText = `<span style="color: #fca5a5;">⚠️ Seleziona 2 persone per poter premere Avanti (${currentSelected.length}/2 scelti)</span>`;
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
          let lovers = [...(game.nightActions.cupidoLovers || [])];
          if (lovers.includes(pid)) {
            lovers = lovers.filter(id => id !== pid);
          } else {
            if (lovers.length >= 2) {
              lovers.shift();
            }
            lovers.push(pid);
          }
          game.nightActions.cupidoLovers = lovers;
          game.lovers = lovers;
          game.assignments.forEach(p => {
            p.isLover = lovers.includes(p.id);
          });
          this.renderNightActionWidget("cupido");
          game.renderMasterRoster();
        });
      });
      return;
    }

    if (stepSubtype === "donna") {
      const donnaPlayer = game.assignments.find(p => p.roleKey === "donna" && p.isAlive);
      const candidates = game.assignments.filter(p => p.isAlive && p.id !== donnaPlayer?.id);
      const selectedId = game.nightActions.donnaTarget;

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
        const host = game.assignments.find(p => p.id === selectedId);
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
          game.nightActions.donnaTarget = (pid === "HOME") ? null : pid;
          this.renderNightActionWidget("donna");
        });
      });
      return;
    }

    if (stepSubtype === "infiltrato_moon") {
      const infiltratoPlayer = game.assignments.find(p => p.roleKey === "infiltrato" && p.isAlive);
      if (!infiltratoPlayer) return;

      const currentNight = game.nightCount || 1;
      const rawChance = game.infiltratoConfig.baseChance + (currentNight - 1) * game.infiltratoConfig.chancePerNight;
      const moonChance = Math.min(game.infiltratoConfig.maxChance, rawChance);
      const pct = Math.round(moonChance * 100);
      const maxPct = Math.round(game.infiltratoConfig.maxChance * 100);

      const rollData = game.nightActions.infiltratoRoll;
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
          game.nightActions.infiltratoRoll = { value: roll, success: success };
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
          game.nightActions.infiltratoRoll = { value: 1, success: true, forced: true };
          try { Sound.playImpostorReveal(); } catch (e) {}
          this.renderNightActionWidget("infiltrato_moon");
        });
      }

      const undoBtn = actionWidget.querySelector("#lupus-btn-undo-transform");
      if (undoBtn) {
        undoBtn.addEventListener("click", () => {
          infiltratoPlayer.isTransformed = false;
          game.nightActions.infiltratoRoll = null;
          try { Sound.playClick(); } catch (e) {}
          this.renderNightActionWidget("infiltrato_moon");
        });
      }
      return;
    }

    if (stepSubtype === "lupi") {
      const candidates = game.assignments.filter(p => p.isAlive);
      const selectedId = game.nightActions.wolfTarget;

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
        const victim = game.assignments.find(p => p.id === selectedId);
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
          game.nightActions.wolfTarget = card.dataset.playerId;
          this.renderNightActionWidget("lupi");
        });
      });
      return;
    }

    if (stepSubtype === "lupo_stregone") {
      const stregonePlayer = game.assignments.find(p => p.roleKey === "lupo_stregone" && p.isAlive);
      const candidates = game.assignments.filter(p => p.isAlive && p.id !== stregonePlayer?.id);
      const selectedId = game.nightActions.stregoneTarget;

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
        const target = game.assignments.find(p => p.id === selectedId);
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
          game.nightActions.stregoneTarget = (pid === "NONE") ? null : pid;
          this.renderNightActionWidget("lupo_stregone");
        });
      });
      return;
    }

    if (stepSubtype === "lupo_bianco") {
      const lupoBiancoPlayer = game.assignments.find(p => p.roleKey === "lupo_bianco" && p.isAlive);
      const packWolves = game.assignments.filter(p => p.isAlive && ["lupo", "lupo_stregone", "cane_nero"].includes(p.roleKey));
      const selectedId = game.nightActions.lupoBiancoTarget;

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
        const victim = game.assignments.find(p => p.id === selectedId);
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
          game.nightActions.lupoBiancoTarget = (pid === "PASS") ? null : pid;
          this.renderNightActionWidget("lupo_bianco");
        });
      });
      return;
    }

    if (stepSubtype === "guardia") {
      const guardiaPlayer = game.assignments.find(p => p.roleKey === "guardia" && p.isAlive);
      const isSilenced = guardiaPlayer && (game.nightActions.stregoneTarget === guardiaPlayer.id);

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

      const candidates = game.assignments.filter(p => p.isAlive);
      const selectedId = game.nightActions.guardTarget;

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
        const target = game.assignments.find(p => p.id === selectedId);
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
          game.nightActions.guardTarget = card.dataset.playerId;
          this.renderNightActionWidget("guardia");
        });
      });
      return;
    }

    if (stepSubtype === "veggente") {
      const veggentePlayer = game.assignments.find(p => p.roleKey === "veggente" && p.isAlive);
      const isSilenced = veggentePlayer && (game.nightActions.stregoneTarget === veggentePlayer.id);

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

      const candidates = game.assignments.filter(p => p.isAlive && p.id !== veggentePlayer?.id);
      const selectedId = game.nightActions.seerTarget;

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
        const target = game.assignments.find(p => p.id === selectedId);
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
          game.nightActions.seerTarget = card.dataset.playerId;
          this.renderNightActionWidget("veggente");
        });
      });
      return;
    }

    if (stepSubtype === "beccamorto") {
      const beccamortoPlayer = game.assignments.find(p => p.roleKey === "beccamorto" && p.isAlive);
      const isSilenced = beccamortoPlayer && (game.nightActions.stregoneTarget === beccamortoPlayer.id);

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

      const deadPlayers = game.lastRoundDeaths || [];
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
      const stregaPlayer = game.assignments.find(p => p.roleKey === "strega" && p.isAlive);
      const isSilenced = stregaPlayer && (game.nightActions.stregoneTarget === stregaPlayer.id);

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

      const wolfVictim = game.nightActions.wolfTarget ? game.assignments.find(p => p.id === game.nightActions.wolfTarget) : null;
      const isLifeAvailable = !game.witchLifeUsed;
      const isDeathAvailable = !game.witchDeathUsed;
      const healTargetId = game.nightActions.witchHealTarget;
      const poisonTargetId = game.nightActions.witchKill;

      // Section 1: Life potion
      let lifeSection = "";
      if (isLifeAvailable) {
        const healCandidates = game.assignments.filter(p => p.isAlive);
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

        const chosenHealPlayer = healTargetId ? game.assignments.find(p => p.id === healTargetId) : null;
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
        const candidates = game.assignments.filter(p => p.isAlive && p.id !== stregaPlayer?.id);
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
          ? `☠️ Bersaglio veleno: <strong>${game.assignments.find(p => p.id === poisonTargetId)?.name}</strong> (Morirà all'Alba!)`
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
          game.nightActions.witchHealTarget = (pid === "NO_HEAL") ? null : pid;
          game.nightActions.witchHeal = (pid !== "NO_HEAL" && pid === (wolfVictim ? wolfVictim.id : null));
          this.renderNightActionWidget("strega");
        });
      });

      // Bind poison cards
      actionWidget.querySelectorAll('.lupus-action-card[data-action="poison"]').forEach(card => {
        card.addEventListener("click", () => {
          try { Sound.playClick(); } catch (e) {}
          const pid = card.dataset.playerId;
          game.nightActions.witchKill = (pid === "NO_POISON") ? null : pid;
          this.renderNightActionWidget("strega");
        });
      });
      return;
    }
  }
}

if (typeof window !== "undefined") {
  window.LupusNightWidgets = LupusNightWidgets;
}
