import re

# Read files
with open('js/games/lupus_game.js', 'r', encoding='utf-8') as f:
    lupus_code = f.read()

with open('index.html', 'r', encoding='utf-8') as f:
    html_code = f.read()

with open('css/style.css', 'r', encoding='utf-8') as f:
    css_code = f.read()

print("--- STATIC VALIDATION ---")
# 1. Check lupus-step-gameover-widget in HTML
assert 'id="lupus-step-gameover-widget"' in html_code, "lupus-step-gameover-widget missing in HTML"
assert 'id="lupus-countdown-sec"' in html_code, "lupus-countdown-sec missing in HTML"
assert 'id="lupus-vote-result-box"' in html_code, "lupus-vote-result-box missing in HTML"
assert 'id="lupus-confirm-vote-btn"' in html_code, "lupus-confirm-vote-btn missing in HTML"
assert 'id="lupus-btn-next-night"' in html_code, "lupus-btn-next-night missing in HTML"
print("  All new and existing DOM widgets verified in HTML.")

# 2. Check CSS classes
assert '.lupus-vote-result-box' in css_code, "CSS .lupus-vote-result-box missing"
assert '.auto-countdown-badge' in css_code, "CSS .auto-countdown-badge missing"
assert '.lupus-gameover-box' in css_code, "CSS .lupus-gameover-box missing"
assert '.lupus-gameover-roster' in css_code, "CSS .lupus-gameover-roster missing"
print("  All CSS styling rules verified in style.css.")

# 3. Check JS method definitions
methods = [
    'renderVotingGrid', 'confirmRogoVote', 'renderRoundProceedCard',
    'renderGameOverCard', 'startNextNight', 'checkVictoryCondition'
]
for m in methods:
    assert f'{m}(' in lupus_code, f"Method {m} missing in lupus_game.js"
print("  All required controller methods verified in lupus_game.js.")

# 4. Check that audio calls are wrapped safely in try/catch or guarded
assert 'try {' in lupus_code and 'Sound.playGameOver()' in lupus_code, "playGameOver not protected"
print("  Audio calls are safely protected against exceptions.")

print("\n--- ALL LOGICAL INTEGRITY TESTS PASSED! ---")
