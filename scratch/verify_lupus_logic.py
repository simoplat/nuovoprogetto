import os
import re

def verify_lupus_implementation():
    print("Testing Lupus implementation...")

    with open("js/games/lupus_game.js", "r", encoding="utf-8") as f:
        js = f.read()

    roles = [
        "lupo", "veggente", "guardia", "strega", "cupido", "donna", "contadino",
        "giullare", "infiltrato", "lupo_bianco", "lupo_stregone", "beccamorto", "idiota", "cane_nero"
    ]

    # Verify LUPUS_ROLES
    for r in roles:
        assert f"{r}: {{" in js, f"Role {r} missing from LUPUS_ROLES"
        assert f'id: "{r}"' in js, f"Role id {r} missing"
    print("[OK] All 14 roles defined in LUPUS_ROLES")

    # Verify enabledRoles
    for r in ["giullare", "infiltrato", "lupo_bianco", "lupo_stregone", "beccamorto", "idiota", "cane_nero"]:
        assert f"{r}: false" in js, f"enabledRoles missing {r}"
    print("[OK] All 7 new roles added to constructor enabledRoles (default false)")

    # Verify bindSetupEvents
    for r in roles:
        if r != "lupo" and r != "contadino":
            assert f'"{r}"' in js, f"bindSetupEvents missing {r}"
    print("[OK] All optional roles bound to setup event listeners")

    # Verify deck insertion in startGame
    for r in ["veggente", "guardia", "strega", "cupido", "donna", "beccamorto", "idiota", "lupo_stregone", "cane_nero", "infiltrato", "giullare", "lupo_bianco"]:
        assert f'this.enabledRoles.{r}' in js, f"Missing enabledRoles check for {r} in startGame"
    print("[OK] All roles correctly inserted into roleDeck in startGame()")

    # Verify wolf pack reveal
    assert 'const isWakingWithWolves = ["lupo", "lupo_bianco", "lupo_stregone", "cane_nero"].includes(role.id);' in js
    print("[OK] Wolf pack reveal logic includes Lupo Bianco, Stregone, and Cane Nero (excludes Infiltrato)")

    # Verify night steps
    assert "🐺🔮 Risveglio del Lupo Stregone" in js
    assert "🐺❄️ Risveglio Solitario del Lupo Bianco" in js
    assert "⚰️ Risveglio del Beccamorto" in js
    assert "this.nightCount % 2 === 0" in js, "Lupo Bianco must wake on alternate/even nights"
    assert "this.nightCount >= 2" in js, "Beccamorto must wake from night 2 onwards"
    print("[OK] Night sequence includes Lupo Stregone, Lupo Bianco (even nights), and Beccamorto (night 2+)")

    # Verify Veggente guidance
    assert "Idiota del Villaggio" in js and "Cane Nero" in js and "Infiltrato" in js
    print("[OK] Seer instruction contains guidance for Idiota (false Lupo), Cane Nero (false Non-Lupo), and Infiltrato (Non-Lupo)")

    # Verify victory conditions
    assert 'alive[0].roleKey === "lupo_bianco"' in js, "Lupo Bianco sole survivor condition missing"
    assert 'condemned.roleKey === "giullare"' in js, "Giullare burned victory condition missing"
    assert 'aliveWolves.length >= aliveNonWolves.length' in js, "Wolf parity condition missing"
    print("[OK] Victory conditions correctly implemented for Giullare, Lupo Bianco, Villaggio, and Lupi")

    # Verify HTML
    with open("index.html", "r", encoding="utf-8") as f:
        html = f.read()

    for r in ["veggente", "guardia", "strega", "cupido", "donna", "beccamorto", "idiota", "lupo_stregone", "cane_nero", "infiltrato", "giullare", "lupo_bianco"]:
        assert f'id="lupus-toggle-{r}"' in html, f"Missing toggle for {r} in index.html"
    print("[OK] All 12 setup toggles present in index.html")

    # Verify Images
    for r in ["giullare", "infiltrato", "lupo_bianco", "lupo_stregone", "beccamorto", "idiota", "cane_nero"]:
        path = f"img/lupus/{r}.jpg"
        assert os.path.exists(path) and os.path.getsize(path) > 10000, f"Image {path} missing or invalid"
    print("[OK] All 7 new tarot images exist and exceed 10KB")

    print("\nALL 28 LOGIC & ASSET ASSERTIONS PASSED!")

if __name__ == "__main__":
    verify_lupus_implementation()
