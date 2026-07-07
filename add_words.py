import re

# Read tabuDeck.js
with open(r"d:\Antigravity\newyear\src\data\tabuDeck.js", "r", encoding="utf-8") as f:
    js_content = f.read()

# Extract existing words (case-insensitive)
existing_words = set()
for match in re.finditer(r"word:\s*['\"]([^'\"]+)['\"]", js_content):
    existing_words.add(match.group(1).strip().upper())

# Read new words
new_lines = []
with open(r"d:\Antigravity\newyear\new_words.txt", "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line or '|' not in line:
            continue
        parts = line.split('|')
        word_raw = parts[0].strip()
        word_upper = word_raw.upper()
        bans_raw = parts[1].split(',')
        level_raw = parts[2].strip().lower()
        
        # Determine level number
        level_num = 1
        if level_raw == 'orta':
            level_num = 2
        elif level_raw == 'zor':
            level_num = 3
        
        if word_upper not in existing_words:
            existing_words.add(word_upper)
            # Capitalize word (first char upper, rest lower)
            word_cap = word_raw.capitalize() if word_upper != "DNA" else "DNA"
            # Format bans
            bans_fmt = ", ".join(f"'{b.strip().capitalize()}'" for b in bans_raw)
            new_lines.append(f"  {{ word: '{word_cap}', taboo: [{bans_fmt}], level: {level_num} }},")

if new_lines:
    # Insert before the last closing bracket of the array
    # Looking for the last `]` in the file
    last_bracket_idx = js_content.rfind("]")
    if last_bracket_idx != -1:
        new_content = js_content[:last_bracket_idx] + "\n  // ---- YENİ EKLENEN DEV LİSTE ----\n" + "\n".join(new_lines) + "\n" + js_content[last_bracket_idx:]
        with open(r"d:\Antigravity\newyear\src\data\tabuDeck.js", "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Başarıyla {len(new_lines)} yeni kelime tabuDeck.js'e eklendi.")
    else:
        print("Hata: Dizi kapanış ayracı bulunamadı.")
else:
    print("Eklenecek yeni kelime bulunamadı (hepsi zaten var).")
