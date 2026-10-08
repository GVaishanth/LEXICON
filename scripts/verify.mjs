import assert from 'node:assert/strict';
import { Game, BattleGame, checkHardMode, evaluateGuess } from '../js/game.js';
import { FIVE_LETTER_ANSWERS, FOUR_LETTER, FIVE_LETTER_ALLOWED, SIX_LETTER_ANSWERS } from '../js/words.js';
import { LORE_ENTRIES, LORE_CATEGORIES, filterLore } from '../js/education.js';
import { groupPersonalDays, rankPersonalDays, getDayStreaks } from '../js/leaderboard.js';

assert.equal(FOUR_LETTER.length,2500);
assert.equal(FIVE_LETTER_ANSWERS.length,5759);
assert.equal(FIVE_LETTER_ALLOWED.length,20220);
assert.equal(SIX_LETTER_ANSWERS.length,5000);
assert.ok(FIVE_LETTER_ALLOWED.includes('STANE') && !FIVE_LETTER_ANSWERS.includes('STANE'));
assert.deepEqual(evaluateGuess('CRANE','STANE'),['absent','absent','correct','correct','correct']);
assert.deepEqual(evaluateGuess('SLATE','STANE'),['correct','absent','correct','present','correct']);
assert.equal(checkHardMode('SHAPE',['EELLS'],[['present','present','absent','absent','absent']]).ok,false);
assert.equal(checkHardMode('SHEEP',['EELLS'],[['present','present','absent','absent','absent']]).ok,true);
const anagram=new Game('anagram','APPLE');
for(const letter of 'SHEEP') anagram.typeLetter(letter);
assert.equal(anagram.submit().reason,'letters');
assert.equal(anagram.guesses.length,0);

const handoff=(match)=>{assert.equal(match.phase,'review');assert.equal(match.advance(),true);assert.equal(match.phase,'handoff');assert.equal(match.startTurn(),true)};
const submit=(match,word)=>{for(const letter of word) match.typeLetter(letter);return match.submit()};
let time=0;
let battle=new BattleGame('APPLE',{names:['Amelia','Basil'],now:()=>time});
assert.equal(battle.phase,'handoff');
assert.equal(battle.startTurn(),true);
time+=2000;
assert.equal(submit(battle,'CRANE').review,true);
handoff(battle);
time+=1000;
assert.equal(submit(battle,'CRANE').review,true);
handoff(battle);
time+=3000;
assert.equal(submit(battle,'APPLE').review,true); // reader two still gets an equal turn
handoff(battle);
time+=6000;
const final=submit(battle,'APPLE');
assert.equal(final.finished,true);
assert.equal(final.result.winner,0);
assert.equal(final.result.reason,'time');
assert.deepEqual(final.result.guesses,[2,2]);
assert.deepEqual(final.result.elapsedMs,[5000,7000]);
assert.equal(battle.advance(),false);

battle=new BattleGame('APPLE',{zen:true});battle.startTurn();
assert.equal(submit(battle,'APPLE').review,true);
handoff(battle);
assert.equal(submit(battle,'APPLE').result.winner,null);
assert.equal(battle.result.reason,'draw');
assert.deepEqual(battle.result.elapsedMs,[0,0]);

battle=new BattleGame('APPLE');battle.startTurn();
assert.equal(submit(battle,'CRANE').review,true);handoff(battle);
assert.equal(submit(battle,'APPLE').result.winner,1);

battle=new BattleGame('APPLE');battle.startTurn();
for(let turn=0;turn<12;turn++){
  const outcome=submit(battle,'CRANE');
  if(turn!==11) handoff(battle);
  else{assert.equal(outcome.finished,true);assert.equal(outcome.result.reason,'unsolved');}
}
assert.deepEqual(battle.result.guesses,[6,6]);

const sample=[
  {day:'2026-09-20',date:'2026-09-20T06:00:00.000Z',won:true,guesses:3,mode:'5',ranked:true},
  {day:'2026-09-20',date:'2026-09-20T08:00:00.000Z',won:false,guesses:6,mode:'daily',ranked:true},
  {day:'2026-09-21',date:'2026-09-21T08:00:00.000Z',won:true,guesses:2,mode:'5',ranked:true},
  {day:'2026-09-21',won:true,mode:'battle',ranked:true},
  {day:'2026-09-21',won:true,mode:'daily',ranked:false,timeMachine:true},
  {day:'2026-09-22',won:true,mode:'5',zen:true}
];
const days=groupPersonalDays(sample);
assert.equal(days.length,2);
assert.deepEqual(days.find(d=>d.day==='2026-09-20')?.played,2);
assert.equal(rankPersonalDays(days,'recent')[0].day,'2026-09-21');
assert.equal(rankPersonalDays(days,'best')[0].day,'2026-09-21');
assert.deepEqual(getDayStreaks(sample,new Date('2026-09-22T12:00:00')), {current:2,best:2});

assert.equal(LORE_ENTRIES.length,36);
assert.equal(new Set(LORE_ENTRIES.map(entry=>entry.word)).size,LORE_ENTRIES.length);
assert.ok(LORE_ENTRIES.every(entry=>LORE_CATEGORIES.includes(entry.category) && entry.story.length>40 && entry.source.startsWith('https://en.wiktionary.org/wiki/')));
assert.ok(filterLore('Hindi').length>1);
assert.equal(filterLore('CLUE','Ideas & arts').length,1);
console.log('Archive, engine, Battle, personal days and Education verified.');
