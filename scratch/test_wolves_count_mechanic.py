def test_wolves_count():
    with open('js/games/lupus_game.js', 'r', encoding='utf-8') as f:
        game_js = f.read()

    with open('js/games/lupus/lupus_setup_ui.js', 'r', encoding='utf-8') as f:
        setup_js = f.read()

    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # Check setup_ui logic
    assert 'normalWolves = wolves - specialWolvesCount' in setup_js, "Missing normalWolves calculation in setup_ui"
    assert 'activeSpecialWolves' in setup_js, "Missing activeSpecialWolves in setup_ui"
    assert 'Numero Totale di Lupi' in html, "Missing updated label in index.html"

    # Check lupus_game.js startGame deck assembly
    assert 'let specialWolvesCount = 0;' in game_js, "Missing specialWolvesCount in lupus_game.js"
    assert 'const normalWolves = Math.max(0, wolves - specialWolvesCount);' in game_js, "Missing normalWolves in lupus_game.js"
    assert 'for (let i = 0; i < normalWolves; i++)' in game_js, "Missing normal wolves loop in lupus_game.js"

    # Simulate roleDeck function from lupus_game.js
    def create_role_deck(total, wolves, enabled):
        roleDeck = []
        specialWolvesCount = 0
        if enabled.get('lupo_stregone'):
            roleDeck.append('lupo_stregone')
            specialWolvesCount += 1
        if enabled.get('cane_nero'):
            roleDeck.append('cane_nero')
            specialWolvesCount += 1
        if enabled.get('infiltrato'):
            roleDeck.append('infiltrato')
            specialWolvesCount += 1
        if enabled.get('lupo_bianco'):
            roleDeck.append('lupo_bianco')
            specialWolvesCount += 1

        normalWolves = max(0, wolves - specialWolvesCount)
        for _ in range(normalWolves):
            roleDeck.append('lupo')

        for r in ['veggente', 'guardia', 'strega', 'cupido', 'donna', 'beccamorto', 'idiota', 'necromante', 'giullare']:
            if enabled.get(r):
                roleDeck.append(r)

        while len(roleDeck) < total:
            roleDeck.append('contadino')

        return roleDeck

    # Test 1: 2 lupi e 1 lupo bianco -> 1 lupo bianco + 1 lupo normale
    deck1 = create_role_deck(6, 2, {'lupo_bianco': True, 'veggente': True})
    wolves1 = [r for r in deck1 if r in ['lupo', 'lupo_stregone', 'cane_nero', 'infiltrato', 'lupo_bianco']]
    norm1 = [r for r in deck1 if r == 'lupo']
    lb1 = [r for r in deck1 if r == 'lupo_bianco']
    assert len(wolves1) == 2, f"Expected 2 total wolves, got {len(wolves1)}"
    assert len(norm1) == 1, f"Expected 1 normal wolf, got {len(norm1)}"
    assert len(lb1) == 1, f"Expected 1 lupo bianco, got {len(lb1)}"
    print("[OK] Test 1: 2 lupi e 1 lupo bianco -> 1 lupo bianco + 1 lupo normale PASSED!")

    # Test 2: 3 lupi e 3 lupi con poteri (lupo_bianco, lupo_stregone, cane_nero) -> 3 con poteri, 0 normali
    deck2 = create_role_deck(8, 3, {'lupo_bianco': True, 'lupo_stregone': True, 'cane_nero': True})
    wolves2 = [r for r in deck2 if r in ['lupo', 'lupo_stregone', 'cane_nero', 'infiltrato', 'lupo_bianco']]
    norm2 = [r for r in deck2 if r == 'lupo']
    assert len(wolves2) == 3, f"Expected 3 total wolves, got {len(wolves2)}"
    assert len(norm2) == 0, f"Expected 0 normal wolves, got {len(norm2)}"
    assert 'lupo_bianco' in deck2 and 'lupo_stregone' in deck2 and 'cane_nero' in deck2
    print("[OK] Test 2: 3 lupi tutti con poteri -> 3 con abilità e 0 normali PASSED!")

    # Test 3: 3 lupi e 1 speciale (lupo_stregone) -> 1 speciale + 2 normali
    deck3 = create_role_deck(8, 3, {'lupo_stregone': True})
    norm3 = [r for r in deck3 if r == 'lupo']
    spec3 = [r for r in deck3 if r == 'lupo_stregone']
    assert len(norm3) == 2, f"Expected 2 normal wolves, got {len(norm3)}"
    assert len(spec3) == 1, f"Expected 1 lupo stregone, got {len(spec3)}"
    print("[OK] Test 3: 3 lupi e 1 speciale -> 1 speciale + 2 normali PASSED!")

    print("\nALL WOLVES COUNT MECHANICS TESTS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    test_wolves_count()
