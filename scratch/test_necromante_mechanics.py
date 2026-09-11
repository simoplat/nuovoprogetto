import re

def test_necromante():
    print("Testing Necromante integration...")

    with open('js/games/lupus/lupus_roles.js', 'r', encoding='utf-8') as f:
        roles_js = f.read()
    assert 'necromante: {' in roles_js, "necromante role missing in lupus_roles.js"
    assert 'Villaggio 🕯️💀' in roles_js, "necromante faction label missing"
    assert '(Guardia, Veggente, Strega, Beccamorto, Necromante)' in roles_js, "stregone description not updated"
    print("[OK] lupus_roles.js verified")

    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()
    assert 'id="lupus-toggle-necromante"' in html, "lupus-toggle-necromante missing in index.html"
    print("[OK] index.html verified")

    with open('js/games/lupus/lupus_setup_ui.js', 'r', encoding='utf-8') as f:
        setup_js = f.read()
    assert '"necromante"' in setup_js, "necromante missing in toggle loop"
    assert 'this.game.enabledRoles.necromante' in setup_js, "necromante missing in validateRolesAndRenderSummary"
    print("[OK] lupus_setup_ui.js verified")

    with open('js/games/lupus_game.js', 'r', encoding='utf-8') as f:
        game_js = f.read()
    assert 'necromante: false' in game_js, "enabledRoles.necromante missing"
    assert 'necromanteTarget: undefined' in game_js, "nightActions.necromanteTarget missing"
    assert 'this.necromanteUsed = false' in game_js, "necromanteUsed state missing"
    assert 'this.preDawnNecromanteSnapshot' in game_js, "preDawnNecromanteSnapshot missing"
    assert 'this.enabledRoles.necromante && necromanteAlive && !this.necromanteUsed && this.nightCount >= 2' in game_js, "round step condition invalid"
    assert '🕯️ Risveglio del Necromante' in game_js, "step title missing"
    assert 'roleDeck.push("necromante")' in game_js, "roleDeck missing necromante"
    print("[OK] lupus_game.js verified")

    with open('js/games/lupus/lupus_master_ui.js', 'r', encoding='utf-8') as f:
        master_js = f.read()
    assert 'subtype === "necromante"' in master_js, "isStepActionComplete missing necromante"
    print("[OK] lupus_master_ui.js verified")

    with open('js/games/lupus/lupus_night_widgets.js', 'r', encoding='utf-8') as f:
        widgets_js = f.read()
    assert 'stepSubtype === "necromante"' in widgets_js, "renderNightActionWidget missing necromante"
    assert 'selected-necromante' in widgets_js, "selected-necromante class missing in widgets"
    assert 'Il Necromante è stato silenziato dal Lupo Stregone' in widgets_js, "silenced alert missing"
    print("[OK] lupus_night_widgets.js verified")

    with open('js/games/lupus/lupus_night_resolver.js', 'r', encoding='utf-8') as f:
        resolver_js = f.read()
    assert 'game.preDawnNecromanteSnapshot = game.necromanteUsed;' in resolver_js, "preDawnNecromanteSnapshot not saved"
    assert 'isNecromanteSilenced' in resolver_js, "isNecromanteSilenced check missing"
    assert 'Miracolo dell\'Oltretomba!' in resolver_js, "resurrection event missing"
    assert 'roleKey: "necromante"' in resolver_js, "chronicle logging missing necromante"
    print("[OK] lupus_night_resolver.js verified")

    with open('css/style.css', 'r', encoding='utf-8') as f:
        css = f.read()
    assert '.lupus-action-card.selected-necromante' in css, "selected-necromante css missing"
    print("[OK] css/style.css verified")

    with open('game_mechanics_matrix_report.md', 'r', encoding='utf-8') as f:
        report = f.read()
    assert '### 15. 🕯️💀 Il Necromante' in report, "Role 15 missing in report"
    assert 'Necromante (Villaggio 🕯️💀)' in report, "Necromante missing in Beccamorto matrix"
    assert '**Il Necromante** | Villaggio | **NON LUPO 👤**' in report, "Necromante missing in Veggente matrix"
    print("[OK] game_mechanics_matrix_report.md verified")

    import os
    assert os.path.exists('img/lupus/necromante.jpg'), "necromante.jpg image missing in img/lupus/"
    assert os.path.getsize('img/lupus/necromante.jpg') > 100000, "necromante.jpg is too small"
    print("[OK] img/lupus/necromante.jpg verified")

    print("\nALL NECROMANTE MECHANICS AND INTEGRATIONS VERIFIED SUCCESSFULLY!")

if __name__ == '__main__':
    test_necromante()
