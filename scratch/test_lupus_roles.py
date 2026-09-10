import json
import os
import re
from PIL import Image

def test_all():
    print("=== TEST 1: Verifying image files ===")
    img_dir = "img/lupus"
    expected_images = [
        "contadino.jpg", "lupo.jpg", "veggente.jpg", "guardia.jpg", "strega.jpg", "cupido.jpg", "donna.jpg",
        "giullare.jpg", "infiltrato.jpg", "lupo_bianco.jpg", "lupo_stregone.jpg", "beccamorto.jpg", "idiota.jpg", "cane_nero.jpg"
    ]
    for img_name in expected_images:
        path = os.path.join(img_dir, img_name)
        assert os.path.exists(path), f"Missing image: {path}"
        with Image.open(path) as im:
            w, h = im.size
            assert w > 0 and h > 0, f"Invalid image size {w}x{h} for {img_name}"
            print(f"  [OK] {img_name}: {w}x{h}, format: {im.format}")

    print("\n=== TEST 2: Verifying index.html toggle elements ===")
    with open("index.html", "r", encoding="utf-8") as f:
        html = f.read()

    expected_toggles = [
        "lupus-toggle-veggente", "lupus-toggle-guardia", "lupus-toggle-strega",
        "lupus-toggle-cupido", "lupus-toggle-donna", "lupus-toggle-giullare",
        "lupus-toggle-infiltrato", "lupus-toggle-lupo_bianco", "lupus-toggle-lupo_stregone",
        "lupus-toggle-beccamorto", "lupus-toggle-idiota", "lupus-toggle-cane_nero"
    ]
    for toggle in expected_toggles:
        assert f'id="{toggle}"' in html, f"Missing toggle ID in index.html: {toggle}"
        print(f"  [OK] Found toggle #{toggle}")

    print("\n=== TEST 3: Verifying lupus_game.js role definitions ===")
    with open("js/games/lupus_game.js", "r", encoding="utf-8") as f:
        js = f.read()

    roles = ["lupo", "veggente", "guardia", "strega", "cupido", "donna", "contadino",
             "giullare", "infiltrato", "lupo_bianco", "lupo_stregone", "beccamorto", "idiota", "cane_nero"]
    for r in roles:
        assert f'{r}: {{' in js or f'"{r}": {{' in js or f"id: \"{r}\"" in js, f"Missing role in lupus_game.js: {r}"
        print(f"  [OK] Role '{r}' defined")

    print("\n=== TEST 4: Verifying CSS classes ===")
    with open("css/style.css", "r", encoding="utf-8") as f:
        css = f.read()

    expected_css = [
        "lupus-toggle-category-title",
        "faction-solitario",
        "theme-solitario",
        "badge-solitario",
        "solitario-wins",
        "lupo-bianco-wins"
    ]
    for c in expected_css:
        assert c in css, f"Missing CSS class: {c}"
        print(f"  [OK] CSS class '{c}' found")

    print("\nALL VERIFICATIONS PASSED!")

if __name__ == "__main__":
    test_all()
