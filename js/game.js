// LEXICON Core Engine — Expanded with Hard Mode, Marathon, Anagram
import { FIVE_LETTER_ALLOWED, FOUR_LETTER, SIX_LETTER_ANSWERS, MOVIE_DATA } from './words.js';

export function evaluateGuess(guess, answer){
  const g = guess.toUpperCase().split('');
  const a = answer.toUpperCase().split('');
  const result = Array(g.length).fill('absent');
  const freq = {};
  for(let ch of a) freq[ch] = (freq[ch]||0)+1;
  for(let i=0;i<g.length;i++){
    if(g[i]===a[i]){
      result[i]='correct';
      freq[g[i]]--;
    }
  }
  for(let i=0;i<g.length;i++){
    if(result[i]==='correct') continue;
    if(freq[g[i]]>0){
      result[i]='present';
      freq[g[i]]--;
    }
  }
  return result;
}

export function isValidWord(word, mode){
  const w = word.toUpperCase();
  if(mode==='4' || mode==='marathon-4') return FOUR_LETTER.includes(w) || w.length===4;
  if(mode==='5' || mode==='daily' || mode==='marathon-5' || mode==='battle') return FIVE_LETTER_ALLOWED.includes(w);
  if(mode==='6' || mode==='marathon-6') return SIX_LETTER_ANSWERS.includes(w) || w.length===6;
  if(mode==='movie') return MOVIE_DATA.some(m=>m.clean===w) || (w.length>=2 && /^[A-Z]+$/.test(w));
  if(mode==='anagram') return FIVE_LETTER_ALLOWED.includes(w) || FOUR_LETTER.includes(w) || SIX_LETTER_ANSWERS.includes(w) || w.length>=3;
  return true;
}

// A new guess must honour all revealed green positions and the highest
// number of yellow/green occurrences of each letter in any earlier row.
export function checkHardMode(guess, previousGuesses, evaluations){
  if(previousGuesses.length===0) return {ok:true};
  const requiredPositions = new Map();
  const minCounts = new Map();
  for(let r=0;r<previousGuesses.length;r++){
    const rowCounts = new Map();
    const result = evaluations[r] || [];
    for(let i=0;i<result.length;i++){
      if(result[i]==='correct') requiredPositions.set(i, previousGuesses[r][i]);
      if(result[i]==='present' || result[i]==='correct'){
        const ch = previousGuesses[r][i];
        rowCounts.set(ch, (rowCounts.get(ch)||0)+1);
      }
    }
    for(const [ch,count] of rowCounts){
      minCounts.set(ch, Math.max(minCounts.get(ch)||0, count));
    }
  }
  for(const [i,ch] of requiredPositions){
    if(guess[i]!==ch) return {ok:false, reason:`Hard mode: ${ch} must be in position ${i+1}.`};
  }
  for(const [ch,count] of minCounts){
    if(guess.split(ch).length-1<count){
      return {ok:false, reason:`Hard mode: include ${count} ${ch}${count===1?'':'s'}.`};
    }
  }
  return {ok:true};
}

export class Game {
  constructor(mode='daily', answer, options={}){
    this.mode = mode;
    this.answer = answer.toUpperCase();
    this.wordLength = this.answer.length;
    this.maxRows = 6;
    this.board = Array.from({length:this.maxRows},()=>Array.from({length:this.wordLength},()=>({letter:'', state:'empty'})));
    this.currentRow = 0;
    this.currentCol = 0;
    this.guesses = [];
    this.status='playing';
    this.evaluations=[];
    this.hardMode = !!options.hardMode;
  }
  typeLetter(letter){
    if(this.status!=='playing') return;
    if(this.currentCol>=this.wordLength) return;
    this.board[this.currentRow][this.currentCol].letter = letter.toUpperCase();
    this.board[this.currentRow][this.currentCol].state='filled';
    this.currentCol++;
  }
  erase(){
    if(this.status!=='playing') return;
    if(this.currentCol===0) return;
    this.currentCol--;
    this.board[this.currentRow][this.currentCol].letter='';
    this.board[this.currentRow][this.currentCol].state='empty';
  }
  submit(){
    if(this.status!=='playing') return {ok:false, reason:'finished'};
    if(this.currentCol!==this.wordLength) return {ok:false, reason:'incomplete'};
    const guess = this.board[this.currentRow].map(t=>t.letter).join('');
    if(!isValidWord(guess, this.mode)) return {ok:false, reason:'invalid'};
    if(this.mode==='anagram' && [...guess].sort().join('')!==[...this.answer].sort().join('')){
      return {ok:false, reason:'letters'};
    }
    if(this.hardMode){
      const hardCheck = checkHardMode(guess, this.guesses, this.evaluations);
      if(!hardCheck.ok) return {ok:false, reason:'hard', message:hardCheck.reason};
    }
    const evalRes = evaluateGuess(guess, this.answer);
    this.evaluations[this.currentRow]=evalRes;
    for(let i=0;i<this.wordLength;i++){
      this.board[this.currentRow][i].state = evalRes[i];
    }
    this.guesses.push(guess);
    if(guess===this.answer){
      this.status='won';
      return {ok:true, won:true};
    }
    this.currentRow++;
    this.currentCol=0;
    if(this.currentRow>=this.maxRows){
      this.status='lost';
      return {ok:true, won:false, lost:true};
    }
    return {ok:true};
  }
}

export class HangmanGame {
  constructor(answer){
    this.answer = answer.toUpperCase().replace(/[^A-Z]/g,'');
    this.guessed = new Set();
    this.wrong = 0;
    this.maxWrong = 6;
    this.status='playing';
  }
  guess(letter){
    letter = letter.toUpperCase();
    if(this.status!=='playing') return;
    if(this.guessed.has(letter)) return;
    this.guessed.add(letter);
    if(!this.answer.includes(letter)){
      this.wrong++;
      if(this.wrong>=this.maxWrong) this.status='lost';
    } else {
      if(this.answer.split('').every(ch=>this.guessed.has(ch))) this.status='won';
    }
  }
  getRevealed(){
    return this.answer.split('').map(ch=> this.guessed.has(ch) ? ch : '_');
  }
}

export class AnagramGame {
  constructor(answer){
    this.answer = answer.toUpperCase();
    this.shuffled = this.shuffle(this.answer);
    // Ensure shuffled != answer
    let attempts=0;
    while(this.shuffled===this.answer && attempts<10){
      this.shuffled=this.shuffle(this.answer);
      attempts++;
    }
    this.guesses=[];
    this.status='playing';
    this.hintsUsed=0;
  }
  shuffle(word){
    const arr = word.split('');
    for(let i=arr.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]]=[arr[j],arr[i]];
    }
    return arr.join('');
  }
  guess(word){
    const w = word.toUpperCase();
    this.guesses.push(w);
    if(w===this.answer){
      this.status='won';
      return true;
    }
    if(this.guesses.length>=6){
      this.status='lost';
    }
    return false;
  }
  hint(){
    this.hintsUsed++;
    // reveal one letter position
    return this.answer;
  }
}

export class MarathonGame {
  constructor(words, options={}){ // words = [{mode, answer}]
    this.stages = words;
    this.currentStage = 0;
    this.hardMode=!!options.hardMode;
    this.currentGame = new Game(words[0].mode, words[0].answer, {hardMode:this.hardMode});
    this.status='playing';
    this.totalGuesses=0;
  }
  get current(){ return this.currentGame; }
  submit(){
    const res = this.currentGame.submit();
    if(!res.ok) return res;
    if(res.won){
      this.totalGuesses+=this.currentGame.guesses.length;
      this.currentStage++;
      if(this.currentStage>=this.stages.length){
        this.status='won';
        return {ok:true, won:true, marathonComplete:true};
      } else {
        const next = this.stages[this.currentStage];
        this.currentGame = new Game(next.mode, next.answer, {hardMode:this.hardMode});
        return {ok:true, won:true, nextStage:true, stage:this.currentStage};
      }
    }
    if(res.lost){
      this.status='lost';
      return {ok:true, lost:true};
    }
    return res;
  }
  typeLetter(l){ this.currentGame.typeLetter(l); }
  erase(){ this.currentGame.erase(); }
}

// Pass-and-play: two separate boards, one shared word. A valid guess is
// reviewed before the device is handed over; clocks count only active turns.
export class BattleGame {
  constructor(answer, options={}){
    this.answer = answer.toUpperCase();
    this.names = (options.names || ['Reader One','Reader Two']).slice(0,2);
    this.games = [0,1].map(()=>new Game('battle', this.answer, {hardMode:!!options.hardMode}));
    this.now = options.now || (()=>performance.now());
    this.elapsedMs=[0,0];
    this.startedAt=null;
    this.untimed=!!options.zen;
    this.activeIndex=0;
    this.nextIndex=null;
    this.phase='handoff'; // handoff -> turn -> review -> handoff / finished
    this.status='playing';
    this.result=null;
  }
  get currentGame(){ return this.games[this.activeIndex]; }
  get round(){ return this.currentGame.guesses.length+1; }
  elapsed(index){
    return this.elapsedMs[index] + (this.startedAt!==null && index===this.activeIndex ? Math.max(0,this.now()-this.startedAt) : 0);
  }
  startTurn(){
    if(this.phase!=='handoff' || this.status!=='playing') return false;
    this.phase='turn';
    this.resumeClock();
    return true;
  }
  pauseClock(){
    if(this.startedAt===null) return;
    this.elapsedMs[this.activeIndex] += Math.max(0,this.now()-this.startedAt);
    this.startedAt=null;
  }
  resumeClock(){
    if(!this.untimed && this.phase==='turn' && this.startedAt===null){
      this.startedAt=this.now();
    }
  }
  setUntimed(){ this.pauseClock(); this.untimed=true; }
  typeLetter(letter){ if(this.phase==='turn') this.currentGame.typeLetter(letter); }
  erase(){ if(this.phase==='turn') this.currentGame.erase(); }
  submit(){
    if(this.phase!=='turn') return {ok:false,reason:'handoff'};
    const response=this.currentGame.submit();
    if(!response.ok) return response;
    this.pauseClock();
    // The second reader has had the same number of turns as the first.
    if(this.activeIndex===1 && (this.games.some(g=>g.status==='won') || this.games.every(g=>g.status==='lost'))){
      return this.finish();
    }
    this.nextIndex=1-this.activeIndex;
    this.phase='review';
    return {ok:true,review:true};
  }
  advance(){
    if(this.phase!=='review') return false;
    this.activeIndex=this.nextIndex;
    this.nextIndex=null;
    this.phase='handoff';
    return true;
  }
  finish(){
    this.status='finished';
    this.phase='finished';
    const [first,second]=this.games;
    let winner=null, reason='unsolved';
    if(first.status==='won' && second.status==='won'){
      if(!this.untimed){
        const gap=this.elapsedMs[0]-this.elapsedMs[1];
        if(Math.abs(gap)>=1000){ winner=gap<0?0:1; reason='time'; }
        else reason='draw';
      }else reason='draw';
    }else if(first.status==='won' || second.status==='won'){
      winner=first.status==='won'?0:1;
      reason='solved';
    }
    this.result={
      winner, reason, answer:this.answer, names:[...this.names],
      guesses:this.games.map(g=>g.guesses.length),
      solved:this.games.map(g=>g.status==='won'),
      elapsedMs:[...this.elapsedMs], untimed:this.untimed
    };
    return {ok:true,finished:true,result:this.result};
  }
}
