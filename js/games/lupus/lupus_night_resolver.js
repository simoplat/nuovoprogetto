/**
 * lupus_night_resolver.js - Calcolo e risoluzione degli eventi notturni all'Alba
 */

class LupusNightResolver {
  constructor(game) {
    this.game = game;
  }

  resolveNight() {
    const game = this.game;
    if (game.nightResolved) return;

    // Snapshot pre-alba per consentire rollback se il Narratore torna indietro
    game.preDawnAliveSnapshot = game.assignments.map(p => p.isAlive);
    game.preDawnWitchLifeSnapshot = game.witchLifeUsed;
    game.preDawnWitchDeathSnapshot = game.witchDeathUsed;

    const stregoneTargetId = game.nightActions.stregoneTarget;
    const guardiaPlayer = game.assignments.find(p => p.roleKey === "guardia" && p.isAlive);
    const isGuardSilenced = guardiaPlayer && (stregoneTargetId === guardiaPlayer.id);

    const stregaPlayer = game.assignments.find(p => p.roleKey === "strega" && p.isAlive);
    const isStregaSilenced = stregaPlayer && (stregoneTargetId === stregaPlayer.id);

    const wolfVictimId = game.nightActions.wolfTarget;
    const wolfVictim = wolfVictimId ? game.assignments.find(p => p.id === wolfVictimId && p.isAlive) : null;

    const donnaPlayer = game.assignments.find(p => p.roleKey === "donna" && p.isAlive);
    const donnaTargetId = donnaPlayer ? game.nightActions.donnaTarget : null;
    const donnaHost = donnaTargetId ? game.assignments.find(p => p.id === donnaTargetId && p.isAlive) : null;
    const isDonnaVisitingWolf = donnaHost && (
      ["lupo", "lupo_stregone", "cane_nero", "lupo_bianco"].includes(donnaHost.roleKey) ||
      (donnaHost.roleKey === "infiltrato" && donnaHost.isTransformed)
    );
    const wereWolvesTargetingDonna = wolfVictim && donnaPlayer && (wolfVictim.id === donnaPlayer.id);

    // Protezioni e Pozione di Vita
    const isProtectedByGuard = !isGuardSilenced && wolfVictim && (game.nightActions.guardTarget === wolfVictim.id);
    const healTargetId = (!isStregaSilenced && !game.witchLifeUsed) ? game.nightActions.witchHealTarget : null;
    const healTargetPlayer = healTargetId ? game.assignments.find(p => p.id === healTargetId && p.isAlive) : null;
    if (healTargetPlayer) {
      game.witchLifeUsed = true;
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
    const lupoBiancoPlayer = game.assignments.find(p => p.roleKey === "lupo_bianco" && p.isAlive);
    const lupoBiancoTargetId = lupoBiancoPlayer ? game.nightActions.lupoBiancoTarget : null;
    const lupoBiancoVictim = lupoBiancoTargetId ? game.assignments.find(p => p.id === lupoBiancoTargetId && p.isAlive) : null;
    if (lupoBiancoVictim && !deaths.has(lupoBiancoVictim.id)) {
      const isLupoBiancoProtectedByGuard = !isGuardSilenced && (game.nightActions.guardTarget === lupoBiancoVictim.id);
      const isLupoBiancoHealedByWitch = healTargetPlayer && (healTargetPlayer.id === lupoBiancoVictim.id);
      if (isLupoBiancoProtectedByGuard) {
        events.push({
          type: "saved",
          icon: "🛡️",
          text: `Il Lupo Bianco ha tentato di sbranare alle spalle <strong>${lupoBiancoVictim.name}</strong>, ma lo <strong>scudo della Guardia</strong> l'ha salvat${getSfx(lupoBiancoVictim.name)}!`
        });
      } else if (isLupoBiancoHealedByWitch) {
        events.push({
          type: "saved",
          icon: "🧪",
          text: `Il Lupo Bianco ha tentato di sbranare alle spalle <strong>${lupoBiancoVictim.name}</strong>, ma la <strong>Pozione di Vita della Strega</strong> l'ha salvat${getSfx(lupoBiancoVictim.name)}!`
        });
      } else {
        deaths.set(lupoBiancoVictim.id, "Sbranato alle spalle dal Lupo Bianco");
        events.push({
          type: "death",
          icon: "🐺❄️",
          text: `<strong>${lupoBiancoVictim.name}</strong> (${lupoBiancoVictim.role.name}) è stat${getSfx(lupoBiancoVictim.name)} sbranat${getSfx(lupoBiancoVictim.name)} a tradimento dal Lupo Bianco!`
        });
      }
    }

    // Se la Strega ha usato la Pozione di Vita su qualcuno non attaccato dai Lupi né dal Lupo Bianco
    const wasHealTargetAttacked = (wolfVictim && healTargetPlayer && healTargetPlayer.id === wolfVictim.id) || (lupoBiancoVictim && healTargetPlayer && healTargetPlayer.id === lupoBiancoVictim.id);
    if (healTargetPlayer && !wasHealTargetAttacked) {
      events.push({
        type: "saved",
        icon: "🧪",
        text: `La Strega ha somministrato la sua <strong>Pozione di Vita</strong> su <strong>${healTargetPlayer.name}</strong> (${healTargetPlayer.role.name}), che non era in pericolo mortale dai Lupi. La pozione è stata consumata!`
      });
    }

    // 4. Risoluzione Pozione di Morte della Strega
    // Regola: La Strega può usare al massimo 1 pozione per turno (Vita O Morte, mai entrambe nello stesso turno).
    const healUsedThisTurn = !!healTargetPlayer;
    const witchKillId = (!isStregaSilenced && !game.witchDeathUsed && !healUsedThisTurn) ? game.nightActions.witchKill : null;
    const witchVictim = witchKillId ? game.assignments.find(p => p.id === witchKillId && p.isAlive) : null;
    if (witchVictim && !deaths.has(witchVictim.id)) {
      game.witchDeathUsed = true;
      deaths.set(witchVictim.id, "Avvelenato dalla Strega");
      events.push({
        type: "death",
        icon: "☠️",
        text: `<strong>${witchVictim.name}</strong> (${witchVictim.role.name}) è stat${getSfx(witchVictim.name)} avvelenat${getSfx(witchVictim.name)} dalla Strega con la Pozione di Morte!`
      });
    }

    // 5. Risoluzione Innamorati a Catena (Cupido)
    if (game.lovers && game.lovers.length === 2) {
      const [lovId1, lovId2] = game.lovers;
      const lover1 = game.assignments.find(p => p.id === lovId1);
      const lover2 = game.assignments.find(p => p.id === lovId2);

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
      const player = game.assignments.find(p => p.id === playerId);
      if (player) {
        player.isAlive = false;
      }
    });

    game.lastRoundDeaths = Array.from(deaths.keys()).map(id => game.assignments.find(p => p.id === id)).filter(Boolean);
    game.nightResolved = true;
    game.dawnReport = events;

    // Registra cronistoria segreta completa per la partita
    this.recordNightChronicle(events, deaths);

    // Aggiorna registro e verifica vittoria
    game.renderMasterRoster();
    const winType = game.checkVictoryCondition();
    if (winType) {
      game.renderGameOverCard(null, winType);
    }
  }

  recordNightChronicle(events, deaths) {
    const game = this.game;
    if (!game.matchLog) game.matchLog = [];

    // Rimuovi eventuale log preesistente per questa notte (es. rollback e ri-risoluzione)
    game.matchLog = game.matchLog.filter(e => e.night !== game.nightCount);

    const nightNum = game.nightCount;
    const actions = [];
    const stregoneTargetId = game.nightActions.stregoneTarget;
    const stregonePlayer = game.assignments.find(p => p.roleKey === "lupo_stregone" && game.isPlayerAliveInRound(p));

    // 1. Cupido (Notte 1)
    if (game.enabledRoles.cupido && nightNum === 1 && game.lovers && game.lovers.length === 2) {
      const p1 = game.assignments.find(p => p.id === game.lovers[0]);
      const p2 = game.assignments.find(p => p.id === game.lovers[1]);
      actions.push({
        roleKey: "cupido",
        icon: "💘",
        title: "Cupido",
        detail: `Ha unito nel destino <strong>${p1?.name}</strong> (${p1?.role.name}) e <strong>${p2?.name}</strong> (${p2?.role.name})`
      });
    }

    // 2. La Donna
    const donnaPlayer = game.assignments.find(p => p.roleKey === "donna" && game.isPlayerAliveInRound(p));
    if (game.enabledRoles.donna && donnaPlayer) {
      const targetId = game.nightActions.donnaTarget;
      let detail = "";
      if (targetId === null) {
        detail = `È rimasta a dormire <strong>A Casa Sua</strong> 🏠`;
      } else if (targetId) {
        const host = game.assignments.find(p => p.id === targetId);
        const isHostWolf = host && (["lupo", "lupo_stregone", "cane_nero", "lupo_bianco"].includes(host.roleKey) || (host.roleKey === "infiltrato" && host.isTransformed));
        detail = `Si è rifugiata da <strong>${host?.name}</strong> (${host?.role.name}) ${isHostWolf ? '⚠️ (Tana di un Lupo!)' : '✅ (Innocente)'}`;
      } else {
        detail = `Nessuna scelta effettuata`;
      }
      actions.push({
        roleKey: "donna",
        icon: "💃",
        title: "La Donna (Meretrice)",
        detail
      });
    }

    // 3. Lupo Mannaro (Infiltrato)
    const infiltratoPlayer = game.assignments.find(p => p.roleKey === "infiltrato" && game.isPlayerAliveInRound(p));
    if (game.enabledRoles.infiltrato && infiltratoPlayer) {
      let detail = "";
      const roll = game.nightActions.infiltratoRoll;
      if (roll) {
        detail = `Dado Luna Piena: <strong>${roll.value}%</strong> &rarr; ${roll.success ? '🌕 <strong>TRASFORMAZIONE IN LUPO AVVENUTA!</strong>' : '🌑 Non trasformato (rimasto latente)'}`;
      } else if (infiltratoPlayer.isTransformed) {
        detail = `🌕 Già trasformato in precedenza (sveglio con i lupi)`;
      } else {
        detail = `🌑 Rimasto umano latente`;
      }
      actions.push({
        roleKey: "infiltrato",
        icon: "🐺🌕",
        title: `Lupo Mannaro (${infiltratoPlayer.name})`,
        detail
      });
    }

    // 4. Branco dei Lupi
    const wolfVictimId = game.nightActions.wolfTarget;
    if (wolfVictimId) {
      const victim = game.assignments.find(p => p.id === wolfVictimId);
      actions.push({
        roleKey: "lupo",
        icon: "🐺",
        title: "Branco dei Lupi",
        detail: `Hanno scelto di sbranare <strong>${victim?.name}</strong> (${victim?.role.name})`
      });
    }

    // 5. Lupo Stregone
    if (game.enabledRoles.lupo_stregone && stregonePlayer) {
      let detail = "";
      if (stregoneTargetId === null) {
        detail = `Non ha silenziato nessuno`;
      } else if (stregoneTargetId) {
        const target = game.assignments.find(p => p.id === stregoneTargetId);
        const hasPower = ["guardia", "veggente", "strega", "beccamorto"].includes(target?.roleKey);
        detail = `Ha silenziato <strong>${target?.name}</strong> (${target?.role.name}) ${hasPower ? '⛔ (Potere notturno annullato!)' : '(Nessun potere bloccabile)'}`;
      }
      actions.push({
        roleKey: "lupo_stregone",
        icon: "🐺🔮",
        title: "Lupo Stregone",
        detail
      });
    }

    // 6. Lupo Bianco
    const lupoBiancoPlayer = game.assignments.find(p => p.roleKey === "lupo_bianco" && game.isPlayerAliveInRound(p));
    if (game.enabledRoles.lupo_bianco && lupoBiancoPlayer && (nightNum % 2 === 0)) {
      const tId = game.nightActions.lupoBiancoTarget;
      let detail = "";
      if (tId === null) {
        detail = `Ha deciso di passare (nessun compagno aggredito stanotte)`;
      } else if (tId) {
        const victim = game.assignments.find(p => p.id === tId);
        detail = `Ha sbranato alle spalle il compagno <strong>${victim?.name}</strong> (${victim?.role.name})`;
      }
      actions.push({
        roleKey: "lupo_bianco",
        icon: "🐺❄️",
        title: "Lupo Bianco (Risveglio Solitario)",
        detail
      });
    }

    // 7. La Guardia
    const guardiaPlayer = game.assignments.find(p => p.roleKey === "guardia" && game.isPlayerAliveInRound(p));
    if (game.enabledRoles.guardia && guardiaPlayer) {
      const isSilenced = stregonePlayer && (stregoneTargetId === guardiaPlayer.id);
      let detail = "";
      if (isSilenced) {
        detail = `⛔ <strong>Silenziata dal Lupo Stregone!</strong> (Scudo bloccato)`;
      } else if (game.nightActions.guardTarget === null) {
        detail = `Nessuna protezione assegnata`;
      } else if (game.nightActions.guardTarget) {
        const target = game.assignments.find(p => p.id === game.nightActions.guardTarget);
        const isSelf = (target?.id === guardiaPlayer.id);
        detail = `Ha protetto con lo scudo <strong>${target?.name}</strong> (${target?.role.name}) ${isSelf ? '🛡️ (Se stessa)' : ''}`;
      }
      actions.push({
        roleKey: "guardia",
        icon: "🛡️",
        title: "La Guardia",
        detail
      });
    }

    // 8. Il Veggente
    const veggentePlayer = game.assignments.find(p => p.roleKey === "veggente" && game.isPlayerAliveInRound(p));
    if (game.enabledRoles.veggente && veggentePlayer) {
      const isSilenced = stregonePlayer && (stregoneTargetId === veggentePlayer.id);
      let detail = "";
      if (isSilenced) {
        detail = `⛔ <strong>Silenziato dal Lupo Stregone!</strong> (Vista oscurata)`;
      } else if (game.nightActions.seerTarget === null) {
        detail = `Non ha scrutato nessuno`;
      } else if (game.nightActions.seerTarget) {
        const target = game.assignments.find(p => p.id === game.nightActions.seerTarget);
        const isWolf = target && (["lupo", "lupo_stregone", "lupo_bianco", "idiota"].includes(target.roleKey) || (target.roleKey === "infiltrato" && target.isTransformed));
        let subnote = "";
        if (target?.roleKey === "idiota") subnote = " <em>(Falso Positivo)</em>";
        else if (target?.roleKey === "cane_nero") subnote = " <em>(Falso Negativo)</em>";
        else if (target?.roleKey === "infiltrato" && !target.isTransformed) subnote = " <em>(Latente)</em>";
        detail = `Ha scrutato <strong>${target?.name}</strong> (${target?.role.name}) &rarr; Responso: <strong>${isWolf ? 'LUPO 🐺' : 'NON LUPO 👤'}</strong>${subnote}`;
      }
      actions.push({
        roleKey: "veggente",
        icon: "🔮",
        title: "Il Veggente",
        detail
      });
    }

    // 9. Il Beccamorto
    const beccamortoPlayer = game.assignments.find(p => p.roleKey === "beccamorto" && game.isPlayerAliveInRound(p));
    if (game.enabledRoles.beccamorto && beccamortoPlayer && nightNum >= 2) {
      const isSilenced = stregonePlayer && (stregoneTargetId === beccamortoPlayer.id);
      let detail = "";
      if (isSilenced) {
        detail = `⛔ <strong>Silenziato dal Lupo Stregone!</strong> (I morti tacciono)`;
      } else if (game.nightActions.beccamortoTarget) {
        const target = game.assignments.find(p => p.id === game.nightActions.beccamortoTarget);
        const isLatentInfiltrato = target && (target.roleKey === "infiltrato" && !target.isTransformed);
        const shownRole = isLatentInfiltrato ? "Contadino (Villaggio 👨‍🌾)" : `${target?.role.name} (${target?.role.factionLabel})`;
        detail = `Ha consultato lo spirito di <strong>${target?.name}</strong> &rarr; Rivelato come: <strong>${shownRole}</strong> ${isLatentInfiltrato ? '<em>(Copertura da Contadino)</em>' : ''}`;
      } else {
        detail = `Nessun defunto consultato`;
      }
      actions.push({
        roleKey: "beccamorto",
        icon: "⚰️",
        title: "Il Beccamorto",
        detail
      });
    }

    // 10. La Strega
    const stregaPlayer = game.assignments.find(p => p.roleKey === "strega" && game.isPlayerAliveInRound(p));
    if (game.enabledRoles.strega && stregaPlayer) {
      const isSilenced = stregonePlayer && (stregoneTargetId === stregaPlayer.id);
      let detail = "";
      if (isSilenced) {
        detail = `⛔ <strong>Silenziata dal Lupo Stregone!</strong> (Pozioni bloccate)`;
      } else {
        const parts = [];
        if (game.nightActions.witchHealTarget) {
          const hTarget = game.assignments.find(p => p.id === game.nightActions.witchHealTarget);
          parts.push(`🧪 Pozione di Vita su <strong>${hTarget?.name}</strong> (${hTarget?.role.name})`);
        } else {
          parts.push(`🧪 Pozione di Vita: non usata`);
        }
        if (game.nightActions.witchKill) {
          const kTarget = game.assignments.find(p => p.id === game.nightActions.witchKill);
          parts.push(`☠️ Pozione di Morte su <strong>${kTarget?.name}</strong> (${kTarget?.role.name})`);
        } else {
          parts.push(`☠️ Pozione di Morte: non usata`);
        }
        detail = parts.join(" &bull; ");
      }
      actions.push({
        roleKey: "strega",
        icon: "🧙‍♀️",
        title: "La Strega",
        detail
      });
    }

    game.matchLog.push({
      night: nightNum,
      actions: actions,
      dawnReport: events.map(e => ({ type: e.type, icon: e.icon, text: e.text })),
      rogo: null
    });
  }

  renderDawnSummaryWidget() {
    const game = this.game;
    const dawnWidget = document.getElementById("lupus-dawn-summary-widget");
    if (!dawnWidget) return;
    dawnWidget.style.display = "block";

    if (!game.dawnReport || game.dawnReport.length === 0) {
      dawnWidget.innerHTML = `
        <div class="lupus-dawn-card">
          <div class="lupus-dawn-title">🌅 Risoluzione Notte ${game.nightCount}</div>
          <div class="lupus-dawn-event peaceful">☀️ Calcolo esiti della notte in corso...</div>
        </div>
      `;
      return;
    }

    const eventsHtml = game.dawnReport.map(ev => `
      <div class="lupus-dawn-event ${ev.type}">
        <span style="font-size: 1.25rem; line-height: 1;">${ev.icon}</span>
        <div>${ev.text}</div>
      </div>
    `).join("");

    const deadCount = game.lastRoundDeaths ? game.lastRoundDeaths.length : 0;

    dawnWidget.innerHTML = `
      <div class="lupus-dawn-card">
        <div class="lupus-dawn-title">
          <span>🌅 Esito Ufficiale della Notte ${game.nightCount}</span>
          <span style="font-size: 0.8rem; margin-left: auto; color: ${deadCount > 0 ? '#fca5a5' : '#6ee7b7'}; font-weight: 700;">
            ${deadCount === 0 ? 'Nessun Caduto' : `${deadCount} Cadut${deadCount === 1 ? 'o' : 'i'}`}
          </span>
        </div>
        ${eventsHtml}
        <div style="font-size: 0.82rem; color: #94a3b8; margin-top: 10px; text-align: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 8px;">
          📢 <span class="narrator-speech">Il Narratore legge ad alta voce l'esito qui sopra al villaggio.</span> Il Registro Abitanti è stato aggiornato in automatico.
        </div>
      </div>
    `;
  }
}

if (typeof window !== "undefined") {
  window.LupusNightResolver = LupusNightResolver;
}
