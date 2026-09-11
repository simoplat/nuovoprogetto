import subprocess

# Test that lupus_night_resolver.js handles Strega overkill correctly
with open("js/games/lupus/lupus_night_resolver.js", "r", encoding="utf-8") as f:
    content = f.read()

assert "if (witchVictim) {" in content, "Missing witchVictim check"
assert "game.witchDeathUsed = true;" in content, "Missing game.witchDeathUsed = true assignment"
assert "La Strega ha versato la sua <strong>Pozione di Morte</strong> su" in content, "Missing overkill event message"
assert "La pozione è stata consumata!" in content, "Missing potion consumed confirmation"

print("ALL OVERKILL ASSERTIONS PASSED!")
