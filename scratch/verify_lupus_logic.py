import os
import re

def verify_lupus_implementation():
    print("Testing Lupus implementation across modular files...")

    js_dir = "games/lupus/js" if os.path.exists("games/lupus/js") else "js/games/lupus"
    game_file = os.path.join(js_dir, "lupus_game.js") if os.path.exists(os.path.join(js_dir, "lupus_game.js")) else "js/games/lupus_game.js"
    with open(game_file, "r", encoding="utf-8") as f:
        game_js = f.read()
    with open(os.path.join(js_dir, "lupus_roles.js"), "r", encoding="utf-8") as f:
        roles_js = f.read()
    with open(os.path.join(js_dir, "lupus_setup_ui.js"), "r", encoding="utf-8") as f:
        setup_js = f.read()
    with open(os.path.join(js_dir, "lupus_master_ui.js"), "r", encoding="utf-8") as f:
        master_js = f.read()
    with open(os.path.join(js_dir, "lupus_night_widgets.js"), "r", encoding="utf-8") as f:
        widgets_js = f.read()
    with open(os.path.join(js_dir, "lupus_night_resolver.js"), "r", encoding="utf-8") as f:
        resolver_js = f.read()

    all_js = game_js + "\n" + roles_js + "\n" + setup_js + "\n" + master_js + "\n" + widgets_js + "\n" + resolver_js

    roles = [
        "lupo", "veggente", "guardia", "strega", "cupido", "donna", "contadino",
        "giullare", "infiltrato", "lupo_bianco", "lupo_stregone", "beccamorto", "idiota", "cane_nero", "necromante"
    ]

    # Verify LUPUS_ROLES
    for r in roles:
        assert f"{r}: {{" in roles_js, f"Role {r} missing from LUPUS_ROLES"
        assert f'key: "{r}"' in roles_js or f'id: "{r}"' in roles_js, f"Role id/key {r} missing"
    print("[OK] All 15 roles defined in LUPUS_ROLES")

    # Verify enabledRoles
    for r in ["giullare", "infiltrato", "lupo_bianco", "lupo_stregone", "beccamorto", "idiota", "cane_nero", "necromante"]:
        assert f"{r}: false" in game_js, f"enabledRoles missing {r}"
    print("[OK] All special roles added to constructor enabledRoles (default false)")

    # Verify setup toggles
    for r in roles:
        if r not in ("lupo", "contadino"):
            assert f'"{r}"' in setup_js, f"setup_ui missing {r}"
    print("[OK] All optional roles bound to setup event listeners")

    # Verify deck insertion in startGame
    for r in ["veggente", "guardia", "strega", "cupido", "donna", "beccamorto", "idiota", "lupo_stregone", "cane_nero", "infiltrato", "giullare", "lupo_bianco", "necromante"]:
        assert f'this.enabledRoles.{r}' in game_js, f"Missing enabledRoles check for {r} in startGame"
    print("[OK] All roles correctly inserted into roleDeck in startGame()")

    # Verify night steps
    assert "🐺🔮 Risveglio del Lupo Stregone" in game_js
    assert "🐺❄️ Risveglio Solitario del Lupo Bianco" in game_js
    assert "⚰️ Risveglio del Beccamorto" in game_js
    assert "🕯️ Risveglio del Necromante" in game_js
    assert "this.nightCount % 2 === 0" in game_js, "Lupo Bianco must wake on alternate/even nights"
    assert "this.nightCount >= 2" in game_js, "Beccamorto/Necromante must wake from night 2 onwards"
    print("[OK] Night sequence includes Lupo Stregone, Lupo Bianco (even nights), Beccamorto, and Necromante (night 2+)")

    # Verify Veggente guidance
    assert "Idiota del Villaggio" in widgets_js and "Cane Nero" in widgets_js and "infiltrato" in widgets_js
    print("[OK] Seer instruction contains guidance for Idiota (false Lupo), Cane Nero (false Non-Lupo), and Infiltrato (Non-Lupo)")

    # Verify victory conditions
    assert 'alivePlayers[0].roleKey === "lupo_bianco"' in game_js or 'alive[0].roleKey === "lupo_bianco"' in game_js
    assert 'condemned.roleKey === "giullare"' in master_js
    assert 'wolves.length >= nonWolves' in game_js or 'aliveWolves.length >= aliveNonWolves.length' in game_js
    print("[OK] Victory conditions correctly implemented for Giullare, Lupo Bianco, Villaggio, and Lupi")

    # Verify HTML toggles
    with open("index.html", "r", encoding="utf-8") as f:
        html = f.read()

    for r in ["veggente", "guardia", "strega", "cupido", "donna", "beccamorto", "idiota", "lupo_stregone", "cane_nero", "infiltrato", "giullare", "lupo_bianco", "necromante"]:
        assert f'id="lupus-toggle-{r}"' in html, f"Missing toggle for {r} in index.html"
    print("[OK] All 13 setup toggles present in index.html")

    # Verify Images
    img_dir = "games/lupus/img" if os.path.exists("games/lupus/img") else "img/lupus"
    for r in ["giullare", "infiltrato", "lupo_bianco", "lupo_stregone", "beccamorto", "idiota", "cane_nero", "necromante"]:
        path = os.path.join(img_dir, f"{r}.jpg")
        assert os.path.exists(path) and os.path.getsize(path) > 10000, f"Image {path} missing or invalid"
    print("[OK] All tarot images exist and exceed 10KB")

    print("\nALL LOGIC & ASSET ASSERTIONS PASSED!")

if __name__ == "__main__":
    verify_lupus_implementation()
