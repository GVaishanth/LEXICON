"""Builds the LEXICON dictionary: every alphabetic English word in the dwyl/english-words list.

Output (both in data/):
  dictionary.txt          one lowercase word per line, sorted
  dictionary-version.txt  content hash of the word list; the browser re-downloads the list only when it changes

Source: dwyl/english-words (Unlicense), https://github.com/dwyl/english-words
Only the headwords are used. Definitions are fetched at runtime from the Free Dictionary API
(Wiktionary data, CC BY-SA 4.0), never copied into the repository.
Run: python3 scripts/generate_dictionary.py
"""
import hashlib, pathlib, re, urllib.request

SOURCE_URL = "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt"
DATA = pathlib.Path(__file__).resolve().parent.parent / "data"

# Contraction fragments that are not dictionary headwords.
STOPLIST = {
    "don", "ll", "re", "ve", "isn", "doesn", "didn", "won", "wouldn", "couldn", "shouldn",
    "aren", "wasn", "weren", "hasn", "haven", "hadn", "ain", "ma", "ca", "ha", "hm", "hmm",
    "mm", "uh", "um", "ya", "gonna", "wanna", "gotta",
}
# Single letters kept as words.
KEEP_SINGLE = {"a", "i"}

raw = urllib.request.urlopen(SOURCE_URL, timeout=60).read().decode("utf-8")
words = sorted({
    w.strip().lower() for w in raw.splitlines()
    if re.fullmatch(r"[a-z]+", w.strip().lower())
    and (len(w.strip()) >= 2 or w.strip().lower() in KEEP_SINGLE)
    and w.strip().lower() not in STOPLIST
})
version = "dictionary-" + hashlib.sha256("\n".join(words).encode("utf-8")).hexdigest()[:12]

DATA.mkdir(parents=True, exist_ok=True)
(DATA / "dictionary.txt").write_text("\n".join(words) + "\n", encoding="utf-8")
(DATA / "dictionary-version.txt").write_text(version + "\n", encoding="utf-8")
print(f"wrote {len(words)} words ({version}) to {DATA}")
