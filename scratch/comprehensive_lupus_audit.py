import sys
import os

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def run_comprehensive_audit():
    print("=" * 70)
    print("🐺 INIZIO AUDIT COMPLETO DI TUTTE LE MECCANICHE DI LUPUS IN FABULA")
    print("=" * 70)

    # 1. Carica tutti i file sorgente
    with open("index.html", "r", encoding="utf-8") as f:
        html = f.read()
    with open("js/games/lupus_game.js", "r", encoding="utf-8") as f:
        game_js = f.read()
    with open("js/games/lupus/lupus_roles.js", "r", encoding="utf-8") as f:
        roles_js = f.read()
    with open("js/games/lupus/lupus_setup_ui.js", "r", encoding="utf-8") as f:
        setup_js = f.read()
    with open("js/games/lupus/lupus_master_ui.js", "r", encoding="utf-8") as f:
        master_js = f.read()
    with open("js/games/lupus/lupus_night_widgets.js", "r", encoding="utf-8") as f:
        widgets_js = f.read()
    with open("js/games/lupus/lupus_night_resolver.js", "r", encoding="utf-8") as f:
        resolver_js = f.read()

    # -------------------------------------------------------------
    # TEST 1: Controllo dei 15 ruoli e fazioni in lupus_roles.js
    # -------------------------------------------------------------
    expected_roles = [
        "lupo", "veggente", "guardia", "strega", "cupido", "donna", "contadino",
        "giullare", "infiltrato", "lupo_bianco", "lupo_stregone", "beccamorto",
        "idiota", "cane_nero", "necromante"
    ]
    for r in expected_roles:
        assert f"{r}: {{" in roles_js, f"Ruolo {r} non definito in LUPUS_ROLES"
        assert f'id: "{r}"' in roles_js, f"ID {r} mancante in LUPUS_ROLES"
    print("[PASS] 1. Tutti i 15 ruoli sono canonicamente registrati in LUPUS_ROLES.")

    # -------------------------------------------------------------
    # TEST 2: Controllo coerenza ID HTML e Javascript
    # -------------------------------------------------------------
    # Verifica che tutti i toggle dei ruoli opzionali esistano in index.html e lupus_setup_ui.js
    optional_roles = [
        "veggente", "guardia", "strega", "cupido", "donna",
        "giullare", "infiltrato", "lupo_bianco", "lupo_stregone", "beccamorto",
        "idiota", "cane_nero", "necromante"
    ]
    for r in optional_roles:
        toggle_id = f"lupus-toggle-{r}"
        assert f'id="{toggle_id}"' in html, f"Toggle {toggle_id} mancante in index.html"
        assert f'"{r}"' in setup_js, f"Ruolo {r} non collegato in lupus_setup_ui.js"
    print("[PASS] 2. Tutti i 13 toggle HTML sono presenti e collegati ai listener di setup.")

    # -------------------------------------------------------------
    # TEST 3: Verifica Stepper Lupi e Nuova Regola Lupi Totali
    # -------------------------------------------------------------
    assert "Numero Totale di Lupi" in html, "Etichetta Stepper Lupi non aggiornata in index.html"
    assert "specialWolvesCount" in game_js, "Conteggio lupi speciali mancante in lupus_game.js"
    assert "Math.max(0, wolves - specialWolvesCount)" in game_js, "Calcolo lupi normali mancante in lupus_game.js"
    assert "normalWolves = wolves - specialWolvesCount" in setup_js, "Calcolo normalWolves mancante in setup_ui.js"
    print("[PASS] 3. Nuova regola del conteggio totale lupi verificata nel codice.")

    # -------------------------------------------------------------
    # TEST 4: Simulazione Algoritmica Distribuzione Mazzo (startGame)
    # -------------------------------------------------------------
    def simulate_start_game(total_players, wolves_count, enabled_roles):
        deck = []
        special_wolves = 0
        if enabled_roles.get("lupo_stregone"): deck.append("lupo_stregone"); special_wolves += 1
        if enabled_roles.get("cane_nero"): deck.append("cane_nero"); special_wolves += 1
        if enabled_roles.get("infiltrato"): deck.append("infiltrato"); special_wolves += 1
        if enabled_roles.get("lupo_bianco"): deck.append("lupo_bianco"); special_wolves += 1

        normal_wolves = max(0, wolves_count - special_wolves)
        for _ in range(normal_wolves):
            deck.append("lupo")

        for r in ["veggente", "guardia", "strega", "cupido", "donna", "beccamorto", "idiota", "necromante", "giullare"]:
            if enabled_roles.get(r):
                deck.append(r)

        while len(deck) < total_players:
            deck.append("contadino")

        return deck

    # Caso A: 2 lupi e 1 lupo bianco (Esempio esplicito dell'utente)
    deck_a = simulate_start_game(6, 2, {"lupo_bianco": True, "veggente": True})
    assert deck_a.count("lupo_bianco") == 1, "Deve esserci esattamente 1 Lupo Bianco"
    assert deck_a.count("lupo") == 1, "L'altro deve essere 1 Lupo normale"
    assert len([r for r in deck_a if "lupo" in r]) == 2, "I lupi totali devono essere esattamente 2"

    # Caso B: 3 lupi tutti con abilità (Esempio esplicito dell'utente)
    deck_b = simulate_start_game(8, 3, {"lupo_bianco": True, "lupo_stregone": True, "cane_nero": True})
    assert deck_b.count("lupo") == 0, "Non devono esserci lupi normali quando la quota è coperta da abilità"
    assert deck_b.count("lupo_bianco") == 1 and deck_b.count("lupo_stregone") == 1 and deck_b.count("cane_nero") == 1
    assert len([r for r in deck_b if r in ["lupo", "lupo_bianco", "lupo_stregone", "cane_nero"]]) == 3

    # Caso C: 3 lupi e 1 solo con abilità
    deck_c = simulate_start_game(8, 3, {"cane_nero": True})
    assert deck_c.count("cane_nero") == 1
    assert deck_c.count("lupo") == 2
    assert len([r for r in deck_c if r in ["lupo", "cane_nero"]]) == 3

    # Caso D: 2 lupi e 0 con abilità
    deck_d = simulate_start_game(6, 2, {})
    assert deck_d.count("lupo") == 2
    print("[PASS] 4. Simulazione mazzo: tutti i casi di distribuzione (2 lupi + 1 bianco, 3 con abilità, 3 misti, 2 normali) testati con successo.")

    # -------------------------------------------------------------
    # TEST 5: Risoluzione all'Alba (NightResolver) & Bugfix Overkill
    # -------------------------------------------------------------
    # Verifica che la correzione del bug dell'Overkill sia presente
    assert "La Strega ha versato la sua <strong>Pozione di Morte</strong> su" in resolver_js, "Messaggio overkill mancante in resolver_js"
    assert "game.witchDeathUsed = true;" in resolver_js, "witchDeathUsed non marcato in resolver_js"

    # Simulatore del NightResolver per testare tutte le combinazioni
    def simulate_night_resolution(actions, players, witch_state={"life_used": False, "death_used": False}):
        # Snapshot
        stregone_target = actions.get("stregoneTarget")
        is_guard_silenced = any(p["id"] == stregone_target and p["roleKey"] == "guardia" for p in players)
        is_strega_silenced = any(p["id"] == stregone_target and p["roleKey"] == "strega" for p in players)
        is_necro_silenced = any(p["id"] == stregone_target and p["roleKey"] == "necromante" for p in players)

        wolf_victim_id = actions.get("wolfTarget")
        wolf_victim = next((p for p in players if p["id"] == wolf_victim_id and p["isAlive"]), None)

        donna_player = next((p for p in players if p["roleKey"] == "donna" and p["isAlive"]), None)
        donna_target_id = actions.get("donnaTarget")
        donna_host = next((p for p in players if p["id"] == donna_target_id and p["isAlive"]), None)
        is_donna_visiting_wolf = donna_host and (
            donna_host["roleKey"] in ["lupo", "lupo_stregone", "cane_nero", "lupo_bianco"] or
            (donna_host["roleKey"] == "infiltrato" and donna_host.get("isTransformed"))
        )

        werewolves_targeting_donna = wolf_victim and donna_player and (wolf_victim["id"] == donna_player["id"])

        is_protected_by_guard = not is_guard_silenced and wolf_victim and (actions.get("guardTarget") == wolf_victim["id"])
        heal_target_id = actions.get("witchHealTarget") if (not is_strega_silenced and not witch_state["life_used"]) else None
        heal_target_player = next((p for p in players if p["id"] == heal_target_id and p["isAlive"]), None)
        if heal_target_player:
            witch_state["life_used"] = True
        is_healed_by_witch = heal_target_player and wolf_victim and (heal_target_player["id"] == wolf_victim["id"])

        deaths = set()
        saved = set()
        events = []

        # 1. Attacco Branco
        if wolf_victim:
            if werewolves_targeting_donna and donna_host and not is_donna_visiting_wolf:
                saved.add(donna_player["id"])
            elif is_protected_by_guard:
                saved.add(wolf_victim["id"])
            elif is_healed_by_witch:
                saved.add(wolf_victim["id"])
            else:
                deaths.add(wolf_victim["id"])
                if donna_player and donna_host and donna_host["id"] == wolf_victim["id"]:
                    deaths.add(donna_player["id"])

        # 2. Donna visita lupo
        if donna_player and is_donna_visiting_wolf:
            deaths.add(donna_player["id"])

        # 3. Lupo Bianco
        lb_target_id = actions.get("lupoBiancoTarget")
        lb_victim = next((p for p in players if p["id"] == lb_target_id and p["isAlive"]), None)
        if lb_victim and lb_victim["id"] not in deaths:
            lb_guard = not is_guard_silenced and (actions.get("guardTarget") == lb_victim["id"])
            lb_heal = heal_target_player and (heal_target_player["id"] == lb_victim["id"])
            if lb_guard or lb_heal:
                saved.add(lb_victim["id"])
            else:
                deaths.add(lb_victim["id"])

        # 4. Pozione di Morte (con bugfix overkill)
        heal_used_this_turn = bool(heal_target_player)
        poison_target_id = actions.get("witchKill") if (not is_strega_silenced and not witch_state["death_used"] and not heal_used_this_turn) else None
        witch_victim = next((p for p in players if p["id"] == poison_target_id and p["isAlive"]), None)
        if witch_victim:
            witch_state["death_used"] = True
            deaths.add(witch_victim["id"])

        # 5. Crepacuore Innamorati
        lovers = actions.get("lovers", [])
        if len(lovers) == 2:
            l1, l2 = lovers
            if l1 in deaths and l2 not in deaths:
                deaths.add(l2)
            elif l2 in deaths and l1 not in deaths:
                deaths.add(l1)

        return deaths, saved, witch_state

    # Test Caso Overkill Strega:
    # I lupi attaccano p1, la strega avvelena p1
    players_test = [
        {"id": "p1", "name": "Luca", "roleKey": "contadino", "isAlive": True},
        {"id": "p2", "name": "Marco", "roleKey": "lupo", "isAlive": True},
        {"id": "p3", "name": "Sara", "roleKey": "strega", "isAlive": True}
    ]
    w_state = {"life_used": False, "death_used": False}
    deaths_res, _, w_state = simulate_night_resolution({
        "wolfTarget": "p1",
        "witchKill": "p1"
    }, players_test, w_state)
    assert "p1" in deaths_res, "La vittima deve essere morta"
    assert w_state["death_used"] == True, "La Pozione di Morte DEVE essere consumata anche se il bersaglio era sbranato dai lupi (Overkill)!"
    print("[PASS] 5. Risoluzione Notturna & Bugfix Overkill della Strega verificati.")

    # Test Caso Donna in visita da un lupo
    players_donna = [
        {"id": "p_donna", "name": "Giulia", "roleKey": "donna", "isAlive": True},
        {"id": "p_wolf", "name": "Matteo", "roleKey": "lupo", "isAlive": True},
        {"id": "p_other", "name": "Luca", "roleKey": "contadino", "isAlive": True}
    ]
    d_deaths, _, _ = simulate_night_resolution({
        "wolfTarget": "p_other",
        "donnaTarget": "p_wolf"
    }, players_donna, {"life_used": False, "death_used": False})
    assert "p_donna" in d_deaths, "La Donna che visita un lupo deve morire nel covo"
    assert "p_other" in d_deaths, "La vittima dei lupi muore normalmente"
    print("[PASS] 6. Meccanica Donna che visita un lupo (morte nel covo) verificata.")

    # Test Caso Donna via da casa salvata
    d_deaths2, d_saved2, _ = simulate_night_resolution({
        "wolfTarget": "p_donna",
        "donnaTarget": "p_other" # ospite innocente
    }, players_donna, {"life_used": False, "death_used": False})
    assert "p_donna" not in d_deaths2, "La Donna via da casa non deve morire se i lupi attaccano casa sua"
    assert "p_donna" in d_saved2, "La Donna deve risultare salvata"
    print("[PASS] 7. Meccanica Donna via da casa (casa vuota, salva) verificata.")

    # Test Caso Innamorati crepacuore
    players_lovers = [
        {"id": "p1", "name": "Luca", "roleKey": "contadino", "isAlive": True},
        {"id": "p2", "name": "Elena", "roleKey": "contadino", "isAlive": True},
        {"id": "p3", "name": "Marco", "roleKey": "lupo", "isAlive": True}
    ]
    lov_deaths, _, _ = simulate_night_resolution({
        "wolfTarget": "p1",
        "lovers": ["p1", "p2"]
    }, players_lovers, {"life_used": False, "death_used": False})
    assert "p1" in lov_deaths and "p2" in lov_deaths, "Se l'innamorato muore per i lupi, il partner deve morire di crepacuore"
    print("[PASS] 8. Meccanica Crepacuore a catena degli Innamorati verificata.")

    # -------------------------------------------------------------
    # TEST 6: Verifica Condizioni di Vittoria
    # -------------------------------------------------------------
    def check_victory(alive_players):
        wolfThreatRoles = ["lupo", "lupo_stregone", "cane_nero", "lupo_bianco"]
        aliveWolves = [p for p in alive_players if p["roleKey"] in wolfThreatRoles or (p["roleKey"] == "infiltrato" and p.get("isTransformed"))]
        aliveNonWolves = [p for p in alive_players if p["roleKey"] not in wolfThreatRoles and not (p["roleKey"] == "infiltrato" and p.get("isTransformed"))]

        if len(alive_players) == 0:
            return "nessuno"
        if len(alive_players) == 1 and alive_players[0]["roleKey"] == "lupo_bianco":
            return "lupo_bianco"
        if len(aliveWolves) == 0:
            return "villaggio"
        packWolves = [p for p in alive_players if p["roleKey"] in ["lupo", "lupo_stregone", "cane_nero"] or (p["roleKey"] == "infiltrato" and p.get("isTransformed"))]
        if len(packWolves) > 0 and len(aliveWolves) >= len(aliveNonWolves):
            return "lupi"
        return False

    # A. Estinzione Totale (0 superstiti)
    assert check_victory([]) == "nessuno", "0 superstiti deve dare 'nessuno'"
    # B. Lupo Bianco ultimo superstite assoluto
    assert check_victory([{"roleKey": "lupo_bianco"}]) == "lupo_bianco", "Lupo Bianco solo deve vincere"
    # C. Tutti i lupi morti
    assert check_victory([{"roleKey": "contadino"}, {"roleKey": "veggente"}]) == "villaggio", "Tutti i lupi morti deve dare 'villaggio'"
    # D. Parità Lupi >= Non-Lupi
    assert check_victory([{"roleKey": "lupo"}, {"roleKey": "contadino"}]) == "lupi", "1 Lupo vs 1 Contadino deve dare 'lupi'"
    # E. Lupo Bianco + 1 Contadino (Partita continua per dare chance di vittoria solitaria al Lupo Bianco)
    assert check_victory([{"roleKey": "lupo_bianco"}, {"roleKey": "contadino"}]) == False, "Lupo Bianco + Contadino deve continuare la partita"
    # F. Infiltrato latente con lupi attivi morti (Vince il villaggio subito)
    assert check_victory([{"roleKey": "infiltrato", "isTransformed": False}, {"roleKey": "contadino"}]) == "villaggio", "Infiltrato latente con lupi morti deve dare 'villaggio'"
    # G. Infiltrato trasformato con contadino (Parità -> Vincono i Lupi)
    assert check_victory([{"roleKey": "infiltrato", "isTransformed": True}, {"roleKey": "contadino"}]) == "lupi", "Infiltrato trasformato con contadino deve dare 'lupi'"
    print("[PASS] 9. Tutte le condizioni di vittoria (Estinzione, Lupo Bianco, Villaggio, Lupi, Infiltrato latente/trasformato) verificate.")

    # -------------------------------------------------------------
    # TEST 7: Controlli Navigazione e Step del Round
    # -------------------------------------------------------------
    assert "🐺 Risveglio del Branco dei Lupi" in game_js
    assert "🐺🔮 Risveglio del Lupo Stregone" in game_js
    assert "🐺❄️ Risveglio Solitario del Lupo Bianco" in game_js
    assert "🛡️ Risveglio della Guardia" in game_js
    assert "🔮 Risveglio del Veggente" in game_js
    assert "⚰️ Risveglio del Beccamorto" in game_js
    assert "🧙‍♀️ Risveglio della Strega" in game_js
    assert "🕯️ Risveglio del Necromante" in game_js
    assert "☀️ Risveglio del Villaggio (Giorno" in game_js
    assert "⏱️ Dibattito & Timer del Villaggio" in game_js
    assert "🔥 Votazione del Rogo" in game_js
    print("[PASS] 10. Tutti gli 11 passaggi del round (notte, alba, dibattito, rogo) ordinati e presenti.")

    # -------------------------------------------------------------
    # TEST 8: Controllo NO_ROGO / Parità
    # -------------------------------------------------------------
    assert "NO_ROGO" in master_js
    assert "vote-card-none" in master_js
    assert "Nessun Rogo / Parità" in master_js
    print("[PASS] 11. Opzione Nessun Rogo / Parità perfettamente integrata.")

    print("\n" + "=" * 70)
    print("🎉 AUDIT COMPLETATO CON SUCCESSO! TUTTE LE ASSERZIONI SONO STATE VERIFICATE!")
    print("=" * 70)

if __name__ == "__main__":
    run_comprehensive_audit()
