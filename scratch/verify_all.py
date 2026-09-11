import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

import os
lupus_path = 'games/lupus/js/lupus_game.js' if os.path.exists('games/lupus/js/lupus_game.js') else 'js/games/lupus_game.js'
with open(lupus_path, 'r', encoding='utf-8') as f:
    js = f.read()

get_el_ids = re.findall(r'document\.getElementById\([\'"]([^\'"]+)[\'"]\)', js)
# Filter out dynamically generated template IDs like lupus-toggle-${roleKey}
static_ids = [i for i in set(get_el_ids) if '$' not in i]
missing = [i for i in static_ids if f'id="{i}"' not in html and f'id="{i}"' not in js]

print('Referenced static IDs count:', len(static_ids))
print('Missing in HTML:', missing)
assert len(missing) == 0, 'Missing IDs found!'
print('ALL IDs EXIST AND ARE VALID!')
