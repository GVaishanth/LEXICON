import requests, re, json, os, pathlib

# URLs
urls = {
    "oxford5000": "https://raw.githubusercontent.com/ittuann/The-Oxford-5000-Word-Lists/main/The%20Oxford%205000.txt",
    "oxford3000": "https://raw.githubusercontent.com/ittuann/The-Oxford-5000-Word-Lists/main/The%20Oxford%203000.txt",
    "wordle_allowed": "https://raw.githubusercontent.com/tabatkins/wordle-list/main/words",
    "sgb_5": "https://raw.githubusercontent.com/charlesreid1/five-letter-words/master/sgb-words.txt",
    "dwyl": "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt",
}

def fetch(url):
    print(f"Fetching {url}")
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    return r.text

data = {}
for k,u in urls.items():
    try:
        data[k] = fetch(u)
    except Exception as e:
        print(f"Failed {k}: {e}")
        data[k]= ""

def clean_words(text):
    words = []
    for line in text.splitlines():
        w = line.strip().lower()
        # remove non alpha
        if not w.isalpha():
            continue
        if len(w) <2 or len(w)>12:
            continue
        words.append(w)
    return words

oxford = clean_words(data["oxford5000"] + "\n" + data["oxford3000"])
wordle_allowed = clean_words(data["wordle_allowed"])
sgb = clean_words(data["sgb_5"])
dwyl = clean_words(data["dwyl"])

print(f"Oxford: {len(oxford)} | wordle_allowed: {len(wordle_allowed)} | sgb: {len(sgb)} | dwyl: {len(dwyl)}")

# Filter by length
def filter_len(words, l):
    return sorted(set([w for w in words if len(w)==l]))

four_oxford = filter_len(oxford, 4)
four_dwyl = filter_len(dwyl, 4)
four_combined = sorted(set(four_oxford + four_dwyl))
# Keep common-ish: limit to maybe 2500 most frequent? We'll take all but ensure at least 1500
four_final = four_combined[:2500]  # dwyl already alphabetical, but okay

five_oxford = filter_len(oxford, 5)
five_sgb = filter_len(sgb,5)
five_answers = sorted(set(five_oxford + five_sgb))
# Ensure at least 3000 answers
# Add some from wordle_allowed that are common
# We'll keep five_answers as ~3000-4000
print(f"Five answers from oxford+sgb: {len(five_answers)}")

five_allowed = sorted(set(wordle_allowed + filter_len(dwyl,5) + five_answers))
print(f"Five allowed: {len(five_allowed)}")

six_oxford = filter_len(oxford, 6)
six_dwyl = filter_len(dwyl, 6)
six_combined = sorted(set(six_oxford + six_dwyl))
print(f"Six combined: {len(six_combined)}")
# Limit to maybe 5000
six_final = six_combined[:5000]

# Movie data - expanded to 120 titles
movie_titles_raw = [
("DUNE",2021,"Sci-Fi","Desert planet, spice, and prophecy"),
("AVATAR",2009,"Sci-Fi","Pandora and the Na'vi"),
("FROZEN",2013,"Animation","Let it go in Arendelle"),
("TITANIC",1997,"Romance","An unsinkable love story"),
("INCEPTION",2010,"Sci-Fi","Dream within a dream"),
("MATRIX",1999,"Sci-Fi","Follow the white rabbit"),
("JOKER",2019,"Drama","Gotham's troubled clown"),
("PSYCHO",1960,"Horror","Bates Motel shower"),
("CASABLANCA",1942,"Romance","Here's looking at you, kid"),
("GODFATHER",1972,"Crime","An offer you can't refuse"),
("ALIENS",1986,"Sci-Fi","In space no one can hear you scream"),
("ROCKY",1976,"Sport","Yo, Adrian! Philly fighter"),
("JAWS",1975,"Thriller","Don't go in the water"),
("FARGO",1996,"Crime","Woodchipper in Minnesota"),
("MOANA",2016,"Animation","Wayfinder beyond the reef"),
("COCO",2017,"Animation","Land of the Dead guitar"),
("UP",2009,"Animation","House lifted by balloons"),
("GLADIATOR",2000,"Epic","Are you not entertained?"),
("BRAVEHEART",1995,"Epic","Freedom! Scottish warrior"),
("AMELIE",2001,"Romance","Montmartre waitress's whimsy"),
("VERTIGO",1958,"Thriller","Hitchcock's dizzy heights"),
("ALIEN",1979,"Horror","Chestburster on Nostromo"),
("SHREK",2001,"Animation","Ogre's swamp and onions"),
("GHOST",1990,"Romance","Pottery wheel and spirits"),
("SICARIO",2015,"Thriller","Border cartel enforcement"),
("MEMENTO",2000,"Thriller","Tattooed memory in reverse"),
("FOCUS",2015,"Crime","Con artists and misdirection"),
("WALLE",2008,"Animation","Lonely robot compacts trash"),
("RATATOUILLE",2007,"Animation","Paris rat chef"),
("CARS",2006,"Animation","Lightning McQueen racing"),
("TENET",2020,"Sci-Fi","Time inversion espionage"),
("INTERSTELLAR",2014,"Sci-Fi","Love transcends space-time"),
("PARASITE",2019,"Thriller","Class divide in Seoul"),
("WHIPLASH",2014,"Drama","Drumming obsession"),
("GRAVITY",2013,"Sci-Fi","Stranded in orbit"),
("MULAN",2020,"Action","Warrior disguised as man"),
("ALADDIN",1992,"Animation","Genie in a lamp"),
("LIONKING",1994,"Animation","Circle of life in savanna"),
("HAMLET",1996,"Drama","To be or not to be"),
("CASINO",1995,"Crime","Vegas mob empire"),
("HEAT",1995,"Crime","Cops vs robbers in LA"),
("SCARFACE",1983,"Crime","Say hello to my little friend"),
("GOODFELLAS",1990,"Crime","Wise guys in New York"),
("PULPFICTION",1994,"Crime","Non-linear LA underworld"),
("FIGHTCLUB",1999,"Drama","First rule is no talk"),
("SEVEN",1995,"Thriller","Seven deadly sins"),
("SAW",2004,"Horror","Want to play a game?"),
("IT",2017,"Horror","Pennywise in Derry"),
("GETOUT",2017,"Horror","Sunken place thriller"),
("US",2019,"Horror","Tethered doubles"),
("HER",2013,"Romance","Man loves OS"),
("LA LA LAND",2016,"Musical","Jazz and dreams in LA"),
("WHIPLASH",2014,"Drama","Not my tempo"),
("DUNKIRK",2017,"War","Evacuation at sea"),
("1917",2017,"War","One-shot trench run"),
("JUNO",2007,"Comedy","Teen pregnancy wit"),
("SUPERBAD",2007,"Comedy","High school party quest"),
("BRIDESMAIDS",2011,"Comedy","Wedding chaos"),
("HANGOVER",2009,"Comedy","Vegas bachelor disaster"),
("TED",2012,"Comedy","Talking teddy bear"),
("DEADPOOL",2016,"Action","Merc with a mouth"),
("LOGAN",2017,"Action","Wolverine's last ride"),
("AVENGERS",2012,"Action","Earth's mightiest heroes"),
("THOR",2011,"Action","God of thunder"),
("HULK",2003,"Action","Gamma rage monster"),
("BATMAN",2022,"Action","Vengeance in Gotham"),
("SUPERMAN",1978,"Action","Man of steel"),
("WONDERWOMAN",2017,"Action","Amazonian warrior"),
("AQUAMAN",2018,"Action","King of Atlantis"),
("SHAZAM",2019,"Action","Kid becomes hero"),
("BLACKPANTHER",2018,"Action","Wakanda forever"),
("DOCTORSTRANGE",2016,"Action","Sorcerer supreme"),
("GUARDIANS",2014,"Action","Mixtape in space"),
("IRONMAN",2008,"Action","Billionaire in armor"),
("CAPTAINMARVEL",2019,"Action","Higher further faster"),
("ANTMAN",2015,"Action","Small hero big heart"),
("VENOM",2018,"Action","Symbiote anti-hero"),
("JUMANJI",1995,"Adventure","Board game jungle"),
("JURASSIC",1993,"Adventure","Dinosaurs revived"),
("KINGKONG",2005,"Adventure","Giant ape love"),
("GODZILLA",2014,"Action","King of monsters"),
("MUMMY",1999,"Adventure","Cursed Egyptian tomb"),
("INDIANA",1981,"Adventure","Whip and fedora"),
("STARWARS",1977,"Sci-Fi","Galaxy far away"),
("TREK",2009,"Sci-Fi","Boldly go reboot"),
("BLADERUNNER",1982,"Sci-Fi","Replicants and rain"),
("ARRIVAL",2016,"Sci-Fi","Linguist meets aliens"),
("EXMACHINA",2014,"Sci-Fi","Turing test with AI"),
("MOON",2009,"Sci-Fi","Clone on lunar base"),
("DISTRICT9",2009,"Sci-Fi","Prawns in Johannesburg"),
("ELYSIUM",2013,"Sci-Fi","Orbital rich habitat"),
("OBLIVION",2013,"Sci-Fi","Post-apocalyptic drone tech"),
("EDGE",2014,"Sci-Fi","Live die repeat"),
("LOOPER",2012,"Sci-Fi","Hitman kills future self"),
("SOURCECODE",2011,"Sci-Fi","Eight minutes to save"),
("INCEPTION",2010,"Sci-Fi","Dream heist"),
("SHUTTERISLAND",2010,"Thriller","Asylum mystery"),
("PRESTIGE",2006,"Drama","Magicians rivalry"),
("MEMENTO",2000,"Thriller","Reverse memory"),
("INSOMNIA",2002,"Thriller","Alaskan sleepless detective"),
("FARGO",1996,"Crime","Minnesota nice crime"),
("NOFEAR",1991,"Thriller","Cape Fear remake"),
("CASINO",1995,"Crime","Vegas rise fall"),
("GOODWILL",1997,"Drama","Genius janitor"),
("A BEAUTIFUL MIND",2001,"Drama","Mathematician's delusion"),
("SOCIALNETWORK",2010,"Drama","Facebook origin"),
("STEVEJOBS",2015,"Drama","Apple visionary"),
("BOHEMIANRHAPSODY",2018,"Musical","Queen biopic"),
("ROCKETMAN",2019,"Musical","Elton John story"),
("TITANIC",1997,"Romance","Iceberg romance"),
("NOTEBOOK",2004,"Romance","Rain kiss"),
("PRIDE",2005,"Romance","Austen classic"),
("GREASE",1978,"Musical","Summer lovin'"),
("MAMMA MIA",2008,"Musical","ABBA in Greece"),
("FROZEN",2013,"Animation","Snow queen"),
("TANGLED",2010,"Animation","Rapunzel lanterns"),
("BRAVE",2012,"Animation","Scottish archer princess"),
("COCO",2017,"Animation","Music beyond death"),
("SOUL",2020,"Animation","Jazz and afterlife"),
("LUCA",2021,"Animation","Sea monster summer"),
("ENCANTO",2021,"Animation","Family magic house"),
("ZOTROPOLIS",2016,"Animation","Bunny cop city"),
]

# Deduplicate by clean title
seen=set()
movie_final=[]
for title,year,genre,clue in movie_titles_raw:
    clean = re.sub(r'[^A-Z]', '', title.upper())
    if not clean or len(clean)<2 or len(clean)>15:
        continue
    if clean in seen:
        continue
    seen.add(clean)
    movie_final.append((title, year, genre, clue, clean))

print(f"Movies: {len(movie_final)}")

# Write JS file
out_path = pathlib.Path("../js/words.js")
# Actually script is in scripts/, so ../js
# We'll write to /home/user/js/words.js via relative
# For safety, write to both
targets = [pathlib.Path(__file__).parent.parent / "js" / "words.js", pathlib.Path("/home/user/js/words.js")]

js_content = f"""// LEXICON - Expanded Archive from Oxford 5000 + Wordle lists + dwyl
// Generated {len(four_final)} 4-letter, {len(five_answers)} 5-letter answers, {len(five_allowed)} allowed, {len(six_final)} 6-letter, {len(movie_final)} movies
// Sources: Oxford 3000/5000, tabatkins wordle-list, sgb-words, dwyl english-words

export const FOUR_LETTER = {json.dumps([w.upper() for w in four_final])};

export const FIVE_LETTER_ANSWERS = {json.dumps([w.upper() for w in five_answers])};

export const FIVE_LETTER_ALLOWED = {json.dumps([w.upper() for w in five_allowed])};

export const SIX_LETTER_ANSWERS = {json.dumps([w.upper() for w in six_final])};

export const MOVIE_DATA = {json.dumps([{"title": t[0], "year": t[1], "genre": t[2], "clue": t[3], "clean": t[4]} for t in movie_final], indent=2)};

export function getDailyWord(){{
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.floor((today - Date.UTC(2022,0,1))/86400000);
  const idx = ((diff % FIVE_LETTER_ANSWERS.length) + FIVE_LETTER_ANSWERS.length) % FIVE_LETTER_ANSWERS.length;
  return FIVE_LETTER_ANSWERS[idx];
}}

export function getRandomWord(mode){{
  const pick = arr => arr[Math.floor(Math.random()*arr.length)];
  if(mode==='4') return pick(FOUR_LETTER);
  if(mode==='5') return pick(FIVE_LETTER_ANSWERS);
  if(mode==='6') return pick(SIX_LETTER_ANSWERS);
  if(mode==='movie'){{
    const m = pick(MOVIE_DATA);
    return m.clean;
  }}
  return pick(FIVE_LETTER_ANSWERS);
}}

export function getMovieMeta(word){{
  return MOVIE_DATA.find(m=>m.clean===word);
}}
"""

for target in targets:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(js_content, encoding='utf-8')
    print(f"Wrote {target} - {len(js_content)} bytes")

print("Done")
