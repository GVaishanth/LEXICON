const TERMS = [
  'fuck', 'shit', 'bitch', 'bastard', 'cunt', 'dick', 'cock', 'pussy', 'twat', 'wanker', 'bollocks',
  'motherfucker', 'arse', 'arsehole', 'asshole', 'piss', 'slut', 'whore', 'tits', 'boob', 'boobs',
  'crap', 'bullshit', 'jerkoff', 'dildo', 'fag', 'faggot',
  'sex', 'sexual', 'sexy', 'porn', 'porno', 'pornography', 'erotic', 'erotica', 'nude', 'nudity',
  'naked', 'orgasm', 'penis', 'vagina', 'anus', 'anal', 'horny', 'fetish', 'bdsm', 'stripper',
  'striptease', 'escort', 'prostitute', 'prostitution', 'brothel', 'hooker', 'masturbate',
  'masturbation', 'genitals', 'genital', 'testicle', 'nipple', 'erection', 'orgy', 'threesome',
  'molest', 'molestation', 'incest', 'pedophile', 'paedophile', 'rape', 'rapist', 'sodomy',
  'bondage', 'lingerie', 'blowjob', 'handjob', 'cum', 'semen', 'vulva', 'clitoris', 'scrotum',
  'cocaine', 'heroin', 'methamphetamine', 'meth', 'opium', 'fentanyl', 'crackhead', 'overdose',
  'narcotic', 'narcotics', 'hallucinogen', 'lsd',
  'gore', 'gory', 'torture', 'dismember', 'dismemberment', 'decapitate', 'decapitation',
  'mutilate', 'mutilation', 'massacre', 'genocide', 'snuff',
];

const ENDINGS = ['', 's', 'es', 'ed', 'ing', 'er', 'ers'];
const ADULT = new Set(TERMS);

export function isAdultWord(word) {
  const w = String(word || '').trim().toLowerCase();
  if (!w) return false;
  if (ADULT.has(w)) return true;
  for (const ending of ENDINGS) {
    if (ending && w.endsWith(ending)) {
      const base = w.slice(0, -ending.length);
      if (ADULT.has(base)) return true;
    }
  }
  return false;
}

export function containsAdultWord(text) {
  return String(text || '').toLowerCase().split(/[^a-z]+/).some(isAdultWord);
}
