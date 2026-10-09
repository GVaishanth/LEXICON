import { FOUR_LETTER, FIVE_LETTER_ANSWERS, FIVE_LETTER_ALLOWED, SIX_LETTER_ANSWERS, MOVIE_DATA, getRandomWord, getMovieMeta } from './words.js';
import { getClueWord } from './clues.js';
import { Game, HangmanGame, AnagramGame, MarathonGame, BattleGame } from './game.js';
import { LORE_ENTRIES, LORE_CATEGORIES, filterLore } from './education.js';
import { localDayKey, groupPersonalDays, rankPersonalDays, getDayStreaks } from './leaderboard.js';

const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const storage={
  get(key){try{return localStorage.getItem(key)}catch{return null}},
  set(key,value){try{localStorage.setItem(key,value)}catch{ /* Private browsing can disable storage. */ }}
};
const readJSON=(key,fallback)=>{try{return JSON.parse(storage.get(key))??fallback}catch{return fallback}};
const savedStats=readJSON('lexicon.v1.stats',{});
const state={
  view:'hero',mode:'hero',theme:storage.get('lexicon.v1.theme')||'paper',
  hard:storage.get('lexicon.v1.hard')==='true',zen:storage.get('lexicon.v1.zen')==='true',
  sound:storage.get('lexicon.v1.sound')==='true',
  stats:{played:Number(savedStats.played)||0,won:Number(savedStats.won)||0,byMode:savedStats.byMode||{}},
  history:Array.isArray(readJSON('lexicon.v1.history',[]))?readJSON('lexicon.v1.history',[]):[],
  matches:Array.isArray(readJSON('lexicon.v1.battles',[]))?readJSON('lexicon.v1.battles',[]):[],
  game:null,hangman:null,anagram:null,marathon:null,battle:null,
  timeMachine:false,puzzleDay:null,lockedDaily:false,unranked:false,zenEver:false,
  finalised:false,inputLocked:false,sessionId:0,resultGame:null,resultWord:null,
  eduCategory:'All',eduQuery:'',eduSelected:LORE_ENTRIES[0],leaderboardOrder:'best',
  definitionSerial:0,battleTicker:null
};
const boardEl=$('#board'), keyboardEl=$('#keyboard'),hintBar=$('#hintBar');
const curtain=$('#battleCurtain');
const prefersReduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============ Motion layer ============
   Recipes from transitions.dev, choreography from the GSAP skills,
   interaction manners from make-interfaces-feel-better.
   Motion never carries meaning alone: every swap keeps a static cue. */
const gsapRef=window.gsap||null;
if(gsapRef&&window.Flip) gsapRef.registerPlugin(window.Flip);
let motionReady=false;

/* p6 · Text states swap: soft blur exchange for dynamic status copy. */
function swapText(el,text){
  if(!el||el.textContent===text) return;
  if(prefersReduced()){el.textContent=text;return}
  clearTimeout(el._swapT);
  el.classList.add('is-exit');
  el._swapT=setTimeout(()=>{
    el.textContent=text;
    el.classList.remove('is-exit');
    el.classList.add('is-enter-start');
    void el.offsetWidth;
    el.classList.remove('is-enter-start');
  },160);
}

/* p16 · Sliding pill: JS measures the active tab; the travel tweens in CSS
   while width tweens in GSAP, so no layout property sits in a CSS transition.
   Snap without animation on first paint and on resize so the pill never desyncs. */
function movePill(container,animate=true){
  if(!container) return;
  const pill=container.querySelector('.t-tabs-pill');
  if(!pill) return;
  const active=container.querySelector('.active');
  if(!active){pill.style.opacity='0';return}
  pill.style.opacity='';
  const x=active.offsetLeft,top=active.offsetTop,width=active.offsetWidth;
  if(!animate||!gsapRef||prefersReduced()){
    if(gsapRef) gsapRef.killTweensOf(pill,'width');
    const previous=pill.style.transition;
    pill.style.transition='none';
    pill.style.transform=`translateX(${x}px)`;
    pill.style.width=`${width}px`;
    pill.style.top=`${top}px`;
    void pill.offsetWidth;
    pill.style.transition=previous;
    return;
  }
  pill.style.transform=`translateX(${x}px)`;
  pill.style.top=`${top}px`;
  gsapRef.to(pill,{width,duration:.25,ease:'power2.out',overwrite:'auto'});
}
function snapAllPills(){
  movePill($('#modeRail'),false);
  movePill($('#eduFilters'),false);
  movePill($('#leaderboardTabsWrap'),false);
}

/* p19 · 3D tilt specimen plates: GSAP retargeting keeps the follow
   interruptible; the return sweep decelerates on release. */
function attachTilt(wrap){
  if(!wrap||!gsapRef||prefersReduced()) return;
  if(!window.matchMedia('(hover:hover)').matches) return;
  const card=wrap.querySelector('.t-tilt-card');
  if(!card) return;
  const proxy={rx:0,ry:0,gx:50,gy:50};
  const write=()=>{
    card.style.setProperty('--tilt-rx',`${proxy.rx.toFixed(3)}deg`);
    card.style.setProperty('--tilt-ry',`${proxy.ry.toFixed(3)}deg`);
    card.style.setProperty('--tilt-gx',`${proxy.gx.toFixed(2)}%`);
    card.style.setProperty('--tilt-gy',`${proxy.gy.toFixed(2)}%`);
  };
  write(); // resting values live on the element from the start
  wrap.addEventListener('pointerenter',()=>wrap.classList.add('is-hover'));
  wrap.addEventListener('pointermove',event=>{
    const rect=card.getBoundingClientRect();
    const px=Math.min(1,Math.max(0,(event.clientX-rect.left)/rect.width));
    const py=Math.min(1,Math.max(0,(event.clientY-rect.top)/rect.height));
    card.classList.add('is-tilting');
    gsapRef.to(proxy,{ry:(px-.5)*7,rx:-(py-.5)*7,gx:px*100,gy:py*100,
      duration:.22,ease:'power2.out',overwrite:'auto',onUpdate:write});
  });
  wrap.addEventListener('pointerleave',()=>{
    wrap.classList.remove('is-hover');
    card.classList.remove('is-tilting');
    gsapRef.to(proxy,{rx:0,ry:0,gx:50,gy:50,duration:.55,ease:'power3.out',overwrite:'auto',onUpdate:write});
  });
}

/* The authored moment: one rehearsal per arrival on the archive home.
   Built with a matchMedia guard so reduced-motion readers get none. */
function playHeroEntrance(){
  if(!gsapRef||prefersReduced()) return;
  const mm=gsapRef.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)',()=>{
    gsapRef.timeline({defaults:{ease:'power3.out'}})
      .from('.hero-left .folio-ledger',{autoAlpha:0,y:10,duration:.45})
      .from('.hero-line',{autoAlpha:0,y:26,filter:'blur(5px)',duration:.6,stagger:.09},'-=0.22')
      .from('.hero-desc',{autoAlpha:0,y:14,duration:.5},'-=0.32')
      .from('.hero-ctas .btn',{autoAlpha:0,y:12,duration:.45,stagger:.07},'-=0.3')
      .from('.hero-meta',{autoAlpha:0,y:10,duration:.45},'-=0.26')
      .from('#heroPreviewTilt',{autoAlpha:0,y:24,duration:.6},'-=0.55')
      .from('.time-machine',{autoAlpha:0,y:18,duration:.5},'-=0.4');
  });
}

/* Buttons labelled with the opening chevron (p24) built from one helper. */
function setArrowLabel(button,text){
  if(!button) return;
  const label=make('span','',text);
  const chevron=make('span','t-learn-chevron');
  chevron.setAttribute('aria-hidden','true');
  chevron.innerHTML='<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path class="t-learn-arm t-learn-arm-top" d="M6 4L10 8"/><path class="t-learn-arm t-learn-arm-bot" d="M10 8L6 12"/></svg>';
  button.replaceChildren(label,chevron);
}

function syncIslandExpandUI(){
  const expanded=$('#dynamicIsland')?.classList.contains('expanded');
  const swap=$('#islandExpandSwap'),button=$('#islandExpandBtn');
  if(swap) swap.dataset.state=expanded?'b':'a';
  if(button) button.setAttribute('aria-expanded',String(!!expanded));
}

// Calendar days, rather than elapsed local milliseconds, keep the daily word
// identical across time zones and across daylight-saving transitions.
function dailyWordFor(date){
  const day=Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000);
  const first=Math.floor(Date.UTC(2022,0,1)/86400000);
  const idx=((day-first)%FIVE_LETTER_ANSWERS.length+FIVE_LETTER_ANSWERS.length)%FIVE_LETTER_ANSWERS.length;
  return FIVE_LETTER_ANSWERS[idx];
}
function parseDay(key){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(key||'')) return null;
  const [year,month,day]=key.split('-').map(Number);
  const value=new Date(year,month-1,day,12);
  return localDayKey(value)===key?value:null;
}
function niceDay(key){
  const date=parseDay(key);
  return date?date.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):key;
}
function getDailyState(){return readJSON('lexicon.v1.daily',null)}
function wasDailyCompletedToday(){
  const entry=getDailyState();
  return !!entry?.completed && (entry.day===localDayKey() || entry.date===new Date().toDateString());
}
function persistStats(){storage.set('lexicon.v1.stats',JSON.stringify(state.stats))}
function pushHistory(entry){
  state.history.push(entry);
  if(state.history.length>3000) state.history=state.history.slice(-3000);
  storage.set('lexicon.v1.history',JSON.stringify(state.history));
  renderPersonalRecord();
  renderTimeMachineCalendar();
  renderHeroPreview();
}
function showToast(message,ms=2400,tone=''){
  const toast=$('#toast');
  toast.textContent=message;
  toast.classList.remove('tone-info','tone-danger');
  if(tone) toast.classList.add(tone);
  toast.classList.add('show');
  clearTimeout(showToast.timeout);
  showToast.timeout=setTimeout(()=>toast.classList.remove('show'),ms);
}
function formatClock(ms){
  const seconds=Math.floor(ms/1000),tenths=Math.floor((ms%1000)/100);
  return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}.${tenths}`;
}

// Personal leaderboard is a ranking of the reader's own calendar days.
// Timed battles live in their own record; Zen and past-date replays do not rank.
function renderPersonalRecord(){
  const {current,best}=getDayStreaks(state.history);
  for(const id of ['statPlayed','statPlayedM','heroStatPlayed']) $('#'+id).textContent=state.stats.played;
  for(const id of ['statWon','statWonM']) $('#'+id).textContent=state.stats.won;
  for(const id of ['statStreak','statStreakM','heroStatStreak']) $('#'+id).textContent=current;
  for(const id of ['statMax','statMaxM']) $('#'+id).textContent=best;
  $('#statWinRate').textContent=state.stats.played?`${Math.round(state.stats.won/state.stats.played*100)}%`:'—';
  const grouped=groupPersonalDays(state.history);
  const byDay=new Map(grouped.map(day=>[day.day,day]));
  const heatmap=$('#heatmap');heatmap.replaceChildren();
  const noon=new Date();noon.setHours(12,0,0,0);
  for(let i=97;i>=0;i--){
    const d=new Date(noon);d.setDate(d.getDate()-i);
    const key=localDayKey(d),item=byDay.get(key);
    const cell=document.createElement('div');
    cell.className=`heatmap-cell l${!item?0:item.solved===0?1:item.solved===1?2:item.solved===2?3:4}`;
    cell.title=`${niceDay(key)} — ${item?`${item.solved} solved of ${item.played}`:'No scored games'}`;
    heatmap.append(cell);
  }
  renderLeaderboard(grouped);
  renderHistory();
  renderMatchRecord();
}
function renderLeaderboard(grouped=groupPersonalDays(state.history)){
  const list=$('#leaderboardList');list.replaceChildren();
  const ordered=rankPersonalDays(grouped,state.leaderboardOrder).slice(0,8);
  $('#leaderboardBest').classList.toggle('active',state.leaderboardOrder==='best');
  $('#leaderboardRecent').classList.toggle('active',state.leaderboardOrder==='recent');
  $('#leaderboardBest').setAttribute('aria-pressed',String(state.leaderboardOrder==='best'));
  $('#leaderboardRecent').setAttribute('aria-pressed',String(state.leaderboardOrder==='recent'));
  movePill($('#leaderboardTabsWrap'),motionReady);
  $('#leaderboardNote').textContent=state.leaderboardOrder==='best'
    ?'Ranked by solves, then win rate, then average attempts in solved word-grid games. Zen and Time Machine entries are unscored.'
    :'Most recent played days first. Only scored solo games appear; this record never leaves your device.';
  if(!ordered.length){
    const item=document.createElement('li');item.className='board-footnote';
    item.textContent='Your days will appear after you finish a scored solo game.';
    list.append(item);return;
  }
  ordered.forEach((day,index)=>{
    const item=document.createElement('li');item.className='leaderboard-row';
    const rank=document.createElement('span');rank.className='leaderboard-rank';rank.textContent=String(index+1).padStart(2,'0');
    const name=document.createElement('div');name.className='leaderboard-day';
    const date=document.createElement('strong');date.textContent=niceDay(day.day);
    const detail=document.createElement('small');detail.textContent=`${day.played} ${day.played===1?'entry':'entries'} · ${Math.round(day.winRate*100)}% solved`;
    name.append(date,detail);
    const score=document.createElement('div');score.className='leaderboard-metric';
    const wins=document.createElement('strong');wins.textContent=`${day.solved} / ${day.played}`;
    const average=document.createElement('small');average.textContent=day.avgAttempts===null?'—':`Avg ${day.avgAttempts.toFixed(1)} tries`;
    score.append(wins,average);item.append(rank,name,score);list.append(item);
  });
}
function renderHistory(){
  const host=$('#historyList');host.replaceChildren();
  const title=document.createElement('h4');title.textContent='Recent solo entries';
  title.style.cssText='font-size:13px;letter-spacing:.04em;margin:0 0 6px';host.append(title);
  const recent=state.history.filter(e=>e && e.ranked!==false && !e.zen && !e.timeMachine && e.mode!=='battle').slice(-8).reverse();
  if(!recent.length){const p=document.createElement('p');p.className='board-footnote';p.textContent='No scored entries yet.';host.append(p);return}
  recent.forEach(entry=>{
    const item=document.createElement('div');item.className='battle-record-item';
    const label=document.createElement('span');label.textContent=`${niceDay(entry.day||localDayKey(entry.date))} · ${String(entry.mode).toUpperCase()}`;
    const outcome=document.createElement('strong');outcome.textContent=entry.won?'Solved':'Unsolved';
    item.append(label,outcome);host.append(item);
  });
}
function renderMatchRecord(){
  const host=$('#battleRecordList');host.replaceChildren();
  if(!state.matches.length){host.textContent='No completed, scored matches yet.';return}
  state.matches.slice(-4).reverse().forEach(match=>{
    const item=document.createElement('div');item.className='battle-record-item';
    const label=document.createElement('span');label.textContent=`${niceDay(match.day)} · ${match.names.join(' / ')}`;
    const outcome=document.createElement('strong');outcome.textContent=match.winner===null?'Draw':`${match.names[match.winner]} won`;
    item.append(label,outcome);host.append(item);
  });
}

// View selection. Education is deliberately not in the play-mode group.
const titles={daily:'Daily Dispatch','4':'Four-Letter Archive','5':'Five-Letter Classic','6':'Six-Letter Archive',movie:'Movie Finds',hangman:'Hangman',marathon:'Marathon',anagram:'Anagram',battle:'Battle'};
const subtitles={daily:'One word a day for every reader','4':'Four letters, six attempts','5':'The classic five-letter challenge','6':'Six letters, six attempts',movie:'A cinematic clue from the archive',hangman:'Find the word from its clue before the final error',marathon:'Three words · four, five, six letters',anagram:'Make a word from the shuffled letters',battle:'Two private boards · one shared word'};
function canLeaveBattle(){
  return !(state.view==='game' && state.mode==='battle' && state.battle?.status==='playing') || window.confirm('Leave this match? Its progress will be lost.');
}
function resetSession(){
  state.sessionId++;state.definitionSerial++;
  state.game=null;state.hangman=null;state.anagram=null;state.marathon=null;state.battle=null;
  state.lockedDaily=false;state.timeMachine=false;state.puzzleDay=null;
  state.unranked=false;state.zenEver=false;state.finalised=false;state.inputLocked=false;
  state.resultGame=null;state.resultWord=null;
  curtain.hidden=true;$('#gameView').inert=false;
  $('#islandWrap').inert=false;$('.footer').inert=false;
  clearInterval(state.battleTicker);state.battleTicker=null;
  closeModals(false);
}
function syncNavigation(){
  const label=state.view==='hero'?'Archive Home':state.view==='education'?'Education':titles[state.mode]||'Archive';
  swapText($('#islandCurrent'),label+(state.timeMachine?' · Time Machine':''));
  $('#islandSub').textContent=state.view==='education'?'The reading room':state.view==='hero'?'Vol. VI · Word & story':subtitles[state.mode]||'';
  $('#islandDot').style.background=state.view==='education'?'#7fbf9a':state.mode==='battle'?'#c98878':state.mode==='movie'?'#c97b85':'#7fbf9a';
  $$('.island-pill').forEach(button=>{
    const active=button.dataset.mode===state.mode && state.view!=='education';
    button.classList.toggle('active',active);
    if(active) button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  });
  movePill($('#modeRail'),motionReady);
  $('#educationNavBtn').classList.toggle('active',state.view==='education');
  $('#educationNavBtn').setAttribute('aria-current',state.view==='education'?'page':'false');
  $('#dynamicIsland').classList.remove('expanded');
  syncIslandExpandUI();
}
function switchView(view){
  state.view=view;
  $('#heroView').classList.toggle('active',view==='hero');
  $('#gameView').classList.toggle('active',view==='game');
  $('#educationView').classList.toggle('active',view==='education');
  syncNavigation();
  window.scrollTo({top:0,behavior:prefersReduced()?'auto':'smooth'});
}
function showHero(force=false){
  if(!force && !canLeaveBattle()) return;
  resetSession();state.mode='hero';switchView('hero');
  renderHeroPreview();refreshTimeMachineRange();renderTimeMachineCalendar();
}
function showGame(mode,options={}){
  if(mode==='hero'){showHero();return}
  if(!titles[mode]) return;
  if(!options.force && !canLeaveBattle()) return;
  resetSession();state.mode=mode;
  state.timeMachine=!!options.timeMachine;
  state.puzzleDay=options.puzzleDay||null;
  state.unranked=state.zen || state.timeMachine;
  state.zenEver=state.zen;
  switchView('game');
  $('#gameView').dataset.mode=mode;
  $('#gameTitle').textContent=titles[mode];
  $('#gameSubtitle').textContent=subtitles[mode];
  initGame(mode);
}
function showEducation(word=null){
  if(!canLeaveBattle()) return;
  resetSession();state.mode='education';switchView('education');
  $('#eduSearch').value='';state.eduQuery='';
  const clear=$('#eduSearchClear');if(clear) clear.hidden=true;
  if(word){
    const found=LORE_ENTRIES.find(item=>item.word===word.toUpperCase());
    if(found){state.eduCategory='All';state.eduQuery='';state.eduSelected=found}
  }
  renderEducation();
}

function renderHeroPreview(){
  // Fixed illustration evaluated against STANE, an allowed word excluded from Daily answers.
  const grid=$('#heroPreviewBoard');grid.replaceChildren();
  const rows=[
    {word:'CRANE',marks:['absent','absent','correct','correct','correct']},
    {word:'SLATE',marks:['correct','absent','correct','present','correct']}
  ];
  rows.forEach(({word,marks})=>{
    const row=document.createElement('div');row.className='preview-row';
    [...word].forEach((letter,index)=>{const tile=document.createElement('span');tile.className=`mini-tile ${marks[index]}`;tile.textContent=letter;row.append(tile)});
    grid.append(row);
  });
  for(let rowIndex=0;rowIndex<3;rowIndex++){
    const row=document.createElement('div');row.className='preview-row';
    for(let col=0;col<5;col++){const tile=document.createElement('span');tile.className='mini-tile';row.append(tile)}
    grid.append(row);
  }
  const daily=getDailyState();
  $('#heroDailyWordHint').textContent=wasDailyCompletedToday()
    ?(daily.won?`Today: solved in ${daily.guesses}`:'Today: entry completed')
    :`${FIVE_LETTER_ANSWERS.length.toLocaleString()} possible answers`;
}
function renderTimeMachineCalendar(){
  const host=$('#tmCalendar');host.replaceChildren();
  const noon=new Date();noon.setHours(12,0,0,0);
  const today=localDayKey(noon);
  const played=new Set(state.history.filter(e=>e?.mode==='daily').map(e=>e.puzzleDay||e.day||localDayKey(e.date)));
  for(let i=27;i>=0;i--){
    const date=new Date(noon);date.setDate(date.getDate()-i);
    const day=localDayKey(date);
    const button=document.createElement('button');button.type='button';button.className='tm-day';
    button.textContent=String(date.getDate());button.title=niceDay(day);
    button.setAttribute('aria-label',`${niceDay(day)}${played.has(day)?', already played':''}${day===today?', today':''}`);
    if(played.has(day)) button.classList.add('has-played');
    if(day===today) button.classList.add('today');
    button.addEventListener('click',()=>day===today?showGame('daily'):showGame('daily',{timeMachine:true,puzzleDay:day}));
    host.append(button);
  }
}
function refreshTimeMachineRange(){
  const input=$('#timeMachineDate'),yesterday=new Date();
  yesterday.setDate(yesterday.getDate()-1);
  input.min='2022-01-01';input.max=localDayKey(yesterday);
  if(!input.value || input.value>input.max) input.value=input.max;
}
function prepareTimeMachine(){
  const input=$('#timeMachineDate');refreshTimeMachineRange();
  $('#timeMachineBtn').addEventListener('click',()=>{
    refreshTimeMachineRange();
    const day=input.value,date=parseDay(day);
    if(!date || day<'2022-01-01' || day>input.max){
      showToast('Choose an earlier date in the archive.');return;
    }
    showGame('daily',{timeMachine:true,puzzleDay:day});
  });
  renderTimeMachineCalendar();
}

function make(tag,className='',text=''){
  const node=document.createElement(tag);
  if(className) node.className=className;
  node.textContent=text;
  return node;
}
/* Education keeps one persistent DOM: entries and filters are built once so
   layout changes can animate with Flip while search stays instant. */
const eduUI={built:false,filters:new Map(),entries:new Map()};
function buildEducationLibrary(){
  if(eduUI.built) return;
  eduUI.built=true;
  const filters=$('#eduFilters');
  const pill=filters.querySelector('.t-tabs-pill');
  filters.replaceChildren();
  if(pill) filters.append(pill);
  for(const name of LORE_CATEGORIES){
    const button=make('button','t-tab'+(name===state.eduCategory?' active':''),name);
    button.type='button';
    button.setAttribute('aria-pressed',String(name===state.eduCategory));
    button.addEventListener('click',()=>{
      if(state.eduCategory===name) return;
      const canFlip=!!gsapRef&&!!window.Flip&&!prefersReduced();
      const snapshot=canFlip?window.Flip.getState([...eduUI.entries.values()].filter(el=>!el.hidden)):null;
      state.eduCategory=name;
      updateEducation(snapshot);
      movePill(filters,motionReady);
    });
    eduUI.filters.set(name,button);
    filters.append(button);
  }
  const grid=$('#eduGrid');
  grid.replaceChildren();
  for(const item of LORE_ENTRIES){
    const button=make('button','edu-entry');button.type='button';
    button.setAttribute('aria-label',`Read the story of ${item.word.toLowerCase()}`);
    button.setAttribute('aria-pressed',String(item===state.eduSelected));
    button.append(make('span','edu-index',''),make('strong','edu-title',item.word),
      make('span','edu-path',item.origin),make('span','edu-teaser',item.story));
    button.addEventListener('click',()=>{
      state.eduSelected=item;
      updateEducation();
      $('#eduFeature').scrollIntoView({behavior:prefersReduced()?'auto':'smooth',block:'start'});
    });
    eduUI.entries.set(item,button);
    grid.append(button);
  }
}
function updateEducation(flipSnapshot=null){
  buildEducationLibrary();
  const results=filterLore(state.eduQuery,state.eduCategory);
  if(results.length && !results.includes(state.eduSelected)) state.eduSelected=results[0];
  $('#eduCount').textContent=`${results.length} of ${LORE_ENTRIES.length} stories`;
  $('#eduEmpty').hidden=!!results.length;
  $('#eduFeature').hidden=!results.length;
  const resultSet=new Set(results);
  results.forEach((item,index)=>{
    const button=eduUI.entries.get(item);
    const label=button.querySelector('.edu-index');
    if(label) label.textContent=`${String(index+1).padStart(2,'0')} / ${item.category}`;
  });
  for(const [item,button] of eduUI.entries){
    button.hidden=!resultSet.has(item);
    button.setAttribute('aria-pressed',String(item===state.eduSelected));
  }
  for(const [name,button] of eduUI.filters){
    const active=name===state.eduCategory;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
  }
  if(flipSnapshot) window.Flip.from(flipSnapshot,{duration:.4,ease:'power2.out'});
  renderSelectedLore();
}
function renderEducation(){updateEducation()}
function renderSelectedLore(){
  const host=$('#eduFeature'),item=state.eduSelected;
  if(!item) return;
  host.replaceChildren();
  const aside=make('div','edu-feature-aside');
  aside.append(make('small','',`SELECTED ENTRY · ${item.category}`),make('h2','',item.word),make('div','edu-feature-origin',item.origin));
  const copy=make('div','edu-feature-copy');
  const source=make('a','edu-source-link','Consult the etymology source ↗');
  source.href=item.source;source.target='_blank';source.rel='noopener noreferrer';
  copy.append(make('p','edu-root',item.root),make('p','edu-story',item.story),
    make('p','edu-detail',item.detail),source);
  host.append(aside,copy);
}

const definitionCache=new Map();
async function fetchDefinition(word){
  if(definitionCache.has(word)) return definitionCache.get(word);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
  try{
    const res=await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`,{signal:controller.signal});
    if(!res.ok) return null;
    const data=await res.json(),entry=data?.[0],meaning=entry?.meanings?.[0],definition=meaning?.definitions?.[0];
    if(!definition) return null;
    const result={word:entry.word,part:meaning.partOfSpeech||'',meaning:definition.definition||'',example:definition.example||'',phonetic:entry.phonetic||''};
    definitionCache.set(word,result);
    return result;
  }catch{return null}finally{clearTimeout(timer)}
}
async function showDefinition(word){
  const serial=++state.definitionSerial;
  const box=$('#definitionBox'),resultBox=$('#resultDefinition');
  box.style.display='none';$('#defDivider').style.display='none';resultBox.style.display='none';
  if(!/^[A-Z]{2,20}$/.test(word)) return;
  const result=await fetchDefinition(word);
  if(!result || serial!==state.definitionSerial || state.view!=='game' || state.resultWord!==word) return;
  $('#defWord').textContent=result.word.toUpperCase();
  const body=$('#defBody');body.replaceChildren();
  const paragraph=make('p','',`${result.part} — ${result.meaning}`);paragraph.style.margin='0';body.append(paragraph);
  if(result.example) body.append(make('p','example',`“${result.example}”`));
  if(result.phonetic) body.append(make('p','muted',result.phonetic));
  box.style.display='block';$('#defDivider').style.display='block';
  resultBox.replaceChildren(make('strong','',`${result.word.toUpperCase()} · ${result.part} — `),document.createTextNode(result.meaning));
  if(result.example) resultBox.append(make('p','muted',`“${result.example}”`));
  resultBox.style.display='block';
}
function buildShareText(){
  const game=state.resultGame;if(!game) return '';
  const rows=game.board.slice(0,game.guesses.length).map(row=>row.map(tile=>({correct:'🟩',present:'🟨',absent:'⬜'})[tile.state]||'⬜').join('')).join('\n');
  return `LEXICON · ${titles[state.mode]} · ${game.status==='won'?game.guesses.length:'X'}/6${state.unranked?' · Zen':''}\n${rows}`;
}
async function shareText(){
  const text=buildShareText();if(!text) return;
  const flashCopied=()=>{
    const icon=$('#shareBtnIconSwap'),label=$('#shareBtnLabel');
    if(icon) icon.dataset.state='b';
    if(label) swapText(label,'Copied');
    clearTimeout(flashCopied.timer);
    flashCopied.timer=setTimeout(()=>{
      if(icon) icon.dataset.state='a';
      if(label) swapText(label,'Copy Text');
    },1900);
  };
  try{
    await navigator.clipboard.writeText(text);showToast('Result copied.');flashCopied();
  }catch{
    const input=document.createElement('textarea');input.value=text;input.style.position='fixed';input.style.left='-9999px';document.body.append(input);input.select();
    const copied=document.execCommand('copy');input.remove();
    showToast(copied?'Result copied.':'Copy is unavailable in this browser.');
    if(copied) flashCopied();
  }
}
function renderShareCanvas(){
  const game=state.resultGame,canvas=$('#shareCanvas');if(!game) return null;
  const ctx=canvas.getContext('2d');if(!ctx) return null;
  const W=1080,H=1080;canvas.width=W;canvas.height=H;
  const ink=state.theme==='ink'?'#f0ece4':'#20332b';
  ctx.fillStyle=state.theme==='ink'?'#151c19':'#f8f7f2';ctx.fillRect(0,0,W,H);
  ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle=ink;
  ctx.font='700 64px Georgia, serif';ctx.fillText('LEXICON',68,116);
  ctx.fillStyle=state.theme==='ink'?'#c6c6c6':'#666e67';ctx.font='600 23px system-ui, sans-serif';
  ctx.fillText(`${titles[state.mode].toUpperCase()}  /  ${niceDay(localDayKey())}${state.unranked?'  /  ZEN':''}`,68,160);
  const gap=12,size=Math.min(92,Math.floor((W-140-(game.wordLength-1)*gap)/game.wordLength));
  const left=(W-(game.wordLength*size+(game.wordLength-1)*gap))/2;
  const rows=game.board.slice(0,game.guesses.length);
  const startY=Math.max(212,(H-(rows.length*(size+gap)-gap))/2-15);
  rows.forEach((row,r)=>row.forEach((tile,c)=>{
    const x=left+c*(size+gap),y=startY+r*(size+gap);
    ctx.fillStyle=({correct:'#2f6f4e',present:'#b89b3c',absent:'#838e8e'})[tile.state]||'#ffffff';
    if(ctx.roundRect){ctx.beginPath();ctx.roundRect(x,y,size,size,12);ctx.fill()}
    else ctx.fillRect(x,y,size,size);
    ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font=`700 ${Math.max(20,Math.floor(size*.42))}px system-ui,sans-serif`;
    ctx.fillText(tile.letter,x+size/2,y+size/2+2);
  }));
  ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle=ink;
  ctx.font='400 20px system-ui,sans-serif';ctx.fillText('A quiet archive for word puzzles.',68,1014);
  return canvas;
}
async function shareImage(){
  const canvas=renderShareCanvas();if(!canvas) return;
  canvas.toBlob(async blob=>{
    if(!blob){showToast('Unable to prepare the image.');return}
    if(typeof File!=='undefined' && navigator.canShare && navigator.share){
      const file=new File([blob],'lexicon-entry.png',{type:'image/png'});
      if(navigator.canShare({files:[file]})){
        try{await navigator.share({files:[file],title:'LEXICON result'});return}
        catch(error){if(error.name==='AbortError') return}
      }
    }
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='lexicon-entry.png';document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);showToast('Image saved.');
  },'image/png');
}

function currentGame(){
  return state.battle?.currentGame || state.marathon?.currentGame || state.game;
}
function renderBadges(){
  const host=$('#gameBadges');host.replaceChildren();
  const add=(text,kind='')=>host.append(make('span',`badge ${kind}`,text));
  if(state.timeMachine) add(`Archive · ${niceDay(state.puzzleDay)}`);
  if(state.mode==='battle') add('Private boards','battle');
  const game=currentGame();
  if(game?.hardMode || (state.mode==='battle' && state.hard && !state.battle)) add('Hard Mode','hard');
  if(state.zen) add('Zen · unscored','zen');
  else if(state.unranked && !state.timeMachine) add('Unscored entry');
  if(state.mode==='marathon') add('Marathon','marathon');
  if(state.mode==='anagram') add('Anagram','anagram');
}
function initGame(mode){
  state.game=null;state.hangman=null;state.anagram=null;state.marathon=null;
  $('#battleSetup').hidden=mode!=='battle';$('#battlePanel').hidden=true;
  boardEl.hidden=mode==='battle';keyboardEl.hidden=mode==='battle';
  $('#gameActions').hidden=mode==='battle';
  boardEl.className='board';boardEl.replaceChildren();keyboardEl.replaceChildren();hintBar.replaceChildren();
  $('#definitionBox').style.display='none';$('#defDivider').style.display='none';
  if(mode==='battle'){renderBadges();return}
  if(mode==='hangman'){
    const {word,clue}=getClueWord();
    state.hangman=new HangmanGame(word,clue);
    renderBadges();renderHangman();renderKeyboard();return;
  }
  if(mode==='anagram'){
    const answer=getRandomWord('5');state.anagram=new AnagramGame(answer);
    state.game=new Game('anagram',answer,{hardMode:state.hard});
    renderAnagramHint();
  }else if(mode==='marathon'){
    const stages=['4','5','6'].map(size=>({mode:`marathon-${size}`,answer:getRandomWord(size)}));
    state.marathon=new MarathonGame(stages,{hardMode:state.hard});
    renderMarathonProgress();
  }else{
    let answer;
    if(mode==='daily'){
      answer=state.timeMachine?dailyWordFor(parseDay(state.puzzleDay)):dailyWordFor(new Date());
      state.lockedDaily=!state.timeMachine && !state.zen && wasDailyCompletedToday();
    }else if(mode==='movie'){
      const movie=MOVIE_DATA[Math.floor(Math.random()*MOVIE_DATA.length)];answer=movie.clean;
      const hint=make('div','movie-hint');
      hint.append(make('span','tag',String(movie.year)),make('span','tag',movie.genre),make('span','clue',movie.clue));
      hintBar.append(hint);
    }else answer=getRandomWord(mode);
    state.game=new Game(mode,answer,{hardMode:state.hard});
  }
  renderBadges();renderBoard();renderKeyboard();
  if(state.lockedDaily){
    const previous=getDailyState();
    hintBar.textContent=`Today's entry is complete${previous?.won?` · solved in ${previous.guesses} attempts`:''}. Return tomorrow or visit an earlier day in the Time Machine.`;
    $('#gameActions').hidden=true;
  }
}
function renderMarathonProgress(){
  const host=make('div','marathon-progress');host.id='marathonProg';
  ['4 letters','5 letters','6 letters'].forEach((label,index)=>{
    const step=make('span',`marathon-step ${index<state.marathon.currentStage?'done':index===state.marathon.currentStage?'active':''}`,label);
    host.append(step);
  });
  hintBar.replaceChildren(host);
}
function renderAnagramHint(){
  const outer=make('div','movie-hint');outer.append(make('span','tag','Anagram'));
  const letters=make('div','anagram-letters');
  [...state.anagram.shuffled].forEach(letter=>letters.append(make('span','mini-tile',letter)));
  outer.append(letters,make('span','clue',`${state.anagram.guesses.length} / 6 attempts`));
  hintBar.replaceChildren(outer);
}
function renderBoard(){
  const game=currentGame();if(!game) return;
  boardEl.hidden=false;boardEl.replaceChildren();boardEl.className=`board ${game.wordLength>8?'long-word':''} ${state.lockedDaily?'disabled':''}`;
  boardEl.style.setProperty('--cols',game.wordLength);
  boardEl.style.setProperty('--rows',game.maxRows);
  for(let rowIndex=0;rowIndex<game.maxRows;rowIndex++){
    const row=make('div','row');row.dataset.row=String(rowIndex);
    for(const cell of game.board[rowIndex]){
      const tile=make('div',`tile ${cell.state}`,cell.letter);
      row.append(tile);
    }
    boardEl.append(row);
  }
  if(state.marathon) renderMarathonProgress();
}
function renderHangman(){
  const hangman=state.hangman;if(!hangman) return;
  boardEl.hidden=false;boardEl.className='board hangman-board';boardEl.replaceChildren();
  const wrap=make('div','hangman-wrap'),gallows=make('div','gallows');
  const svgNS='http://www.w3.org/2000/svg',svg=document.createElementNS(svgNS,'svg');
  svg.setAttribute('viewBox','0 0 200 240');svg.classList.add('gallows-svg');
  const segment=(name,attributes,index=null)=>{
    const element=document.createElementNS(svgNS,name);
    for(const [key,value] of Object.entries(attributes)) element.setAttribute(key,value);
    if(index!==null) element.classList.add('hm-part',...(hangman.wrong>=index?['show']:[]));
    svg.append(element);
  };
  segment('line',{x1:20,y1:230,x2:100,y2:230});
  segment('line',{x1:60,y1:230,x2:60,y2:20});
  segment('line',{x1:60,y1:20,x2:140,y2:20});
  segment('line',{x1:140,y1:20,x2:140,y2:50});
  segment('circle',{cx:140,cy:70,r:20},1);
  [[140,90,140,150],[140,110,115,125],[140,110,165,125],[140,150,120,190],[140,150,160,190]].forEach((points,i)=>{
    segment('line',Object.fromEntries(['x1','y1','x2','y2'].map((key,j)=>[key,points[j]])),i+2);
  });
  gallows.append(svg,make('div','wrong-count',`${hangman.wrong} / ${hangman.maxWrong} errors`));
  const letters=make('div','hangman-word');
  hangman.getRevealed().forEach(letter=>letters.append(make('span',`hm-letter ${letter==='_'?'':'revealed'}`,letter)));
  if(hangman.clue){
    const clueCard=make('div','hangman-clue');
    clueCard.append(make('span','hangman-clue-label','Clue'),make('p','hangman-clue-text',hangman.clue));
    wrap.append(gallows,clueCard,letters);
  } else {
    wrap.append(gallows,letters);
  }
  boardEl.append(wrap);
}
const KEY_ROWS=['QWERTYUIOP'.split(''),'ASDFGHJKL'.split(''),['Enter',...'ZXCVBNM','⌫']];
function bestKeyState(letter,game){
  const weight={absent:1,present:2,correct:3};let best='';
  for(let r=0;r<game.guesses.length;r++) for(const tile of game.board[r]){
    if(tile.letter===letter && (weight[tile.state]||0)>(weight[best]||0)) best=tile.state;
  }
  return best;
}
function renderKeyboard(){
  keyboardEl.hidden=false;keyboardEl.replaceChildren();
  const game=currentGame(),hangman=state.hangman;
  const disabled=state.inputLocked || state.lockedDaily || state.finalised ||
    (state.battle && state.battle.phase!=='turn') ||
    (hangman && hangman.status!=='playing') ||
    (game && game.status!=='playing');
  KEY_ROWS.forEach(keys=>{
    const row=make('div','kb-row');
    keys.forEach(letter=>{
      const button=make('button',`key ${letter==='Enter'||letter==='⌫'?'wide':''}`,letter);
      button.type='button';button.dataset.key=letter;
      button.setAttribute('aria-label',letter==='⌫'?'Delete letter':letter==='Enter'?'Submit guess':letter);
      if(game && /^[A-Z]$/.test(letter)){
        const stateName=bestKeyState(letter,game);if(stateName) button.classList.add(stateName);
      }
      if(hangman && hangman.guessed.has(letter)) button.classList.add(hangman.answer.includes(letter)?'correct':'absent');
      button.disabled=!!disabled || (hangman && (letter==='Enter'||letter==='⌫'||hangman.guessed.has(letter)));
      button.addEventListener('click',()=>handleKey(letter));
      row.append(button);
    });
    keyboardEl.append(row);
  });
}
function shakeRow(){
  const game=currentGame();if(!game) return;
  const row=boardEl.querySelector(`[data-row="${game.currentRow}"]`);
  if(row){row.classList.add('shake');setTimeout(()=>row.classList.remove('shake'),430)}
}
function playSound(){
  if(!state.sound || state.zen) return;
  try{
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio) return;
    playSound.context??=new Audio();
    const context=playSound.context,osc=context.createOscillator(),gain=context.createGain();
    osc.type='sine';osc.frequency.value=460;gain.gain.setValueAtTime(.007,context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001,context.currentTime+.045);
    osc.connect(gain).connect(context.destination);osc.start();osc.stop(context.currentTime+.045);
  }catch{ /* Audio is optional. */ }
}
function reportInvalid(result){
  shakeRow();
  if(result.reason==='profane'){
    showToast('That word is not permitted here.',3400,'tone-danger');
    return;
  }
  const words={incomplete:'Complete the row first.',invalid:'This word is not in the archive.',letters:'Use exactly the shuffled letters.',hard:result.message||'Use the revealed hints.'};
  const notice=words[result.reason]||'This entry cannot be submitted.';
  showToast(notice,result.reason==='invalid'?3400:2400,result.reason==='invalid'?'tone-info':'');
}
function flashSubmittedRow(rowIndex,then){
  const id=state.sessionId;
  state.inputLocked=true;renderKeyboard();
  if(prefersReduced()){
    state.inputLocked=false;then();return;
  }
  const row=boardEl.querySelector(`[data-row="${rowIndex}"]`);
  if(row) [...row.children].forEach((tile,index)=>{tile.classList.add('flip');tile.style.animationDelay=`${index*60}ms`});
  setTimeout(()=>{
    if(state.sessionId!==id) return;
    state.inputLocked=false;renderBoard();renderKeyboard();then();
  },Math.min(900,520+(currentGame()?.wordLength||5)*60));
}
function handleKey(key){
  if(state.view!=='game'||state.lockedDaily||state.finalised||state.inputLocked) return;
  if(state.battle){handleBattleKey(key);return}
  if(state.hangman){
    if(!/^[A-Z]$/.test(key)||state.hangman.status!=='playing'||state.hangman.guessed.has(key)) return;
    state.hangman.guess(key);playSound();renderHangman();renderKeyboard();
    if(state.hangman.status!=='playing') finishHangman();
    return;
  }
  const game=currentGame();if(!game||game.status!=='playing') return;
  if(key==='⌫'){state.marathon?state.marathon.erase():game.erase();renderBoard();return}
  if(key!=='Enter'){
    if(/^[A-Z]$/.test(key)){state.marathon?state.marathon.typeLetter(key):game.typeLetter(key);playSound();renderBoard()}
    return;
  }
  const response=state.marathon?state.marathon.submit():game.submit();
  if(!response.ok){reportInvalid(response);return}
  playSound();
  if(state.anagram) state.anagram.guess(game.guesses.at(-1));
  if(state.marathon && response.nextStage){
    renderBoard();renderKeyboard();renderBadges();
    showToast(`Stage ${state.marathon.currentStage+1} · ${state.marathon.currentGame.wordLength} letters.`);
    return;
  }
  if(state.anagram) renderAnagramHint();
  renderBoard();renderKeyboard();
  flashSubmittedRow(game.guesses.length-1,()=>{
    if(state.marathon && state.marathon.status!=='playing') finishMarathon();
    else if(state.anagram && state.anagram.status!=='playing') finishAnagram();
    else if(!state.marathon && !state.anagram && game.status!=='playing') finishWordGame();
  });
}
function recordSolo(won,answer,guesses){
  const timestamp=new Date(),day=localDayKey(timestamp);
  if(state.timeMachine){
    if(!state.zenEver){
      pushHistory({date:timestamp.toISOString(),day,puzzleDay:state.puzzleDay,mode:'daily',answer,won,guesses,timeMachine:true,ranked:false});
    }
    return;
  }
  if(state.unranked || state.zen) return;
  state.stats.played++;
  if(won) state.stats.won++;
  state.stats.byMode[state.mode]=(state.stats.byMode[state.mode]||0)+1;
  persistStats();
  if(state.mode==='daily') storage.set('lexicon.v1.daily',JSON.stringify({day,date:timestamp.toDateString(),completed:true,won,answer,guesses}));
  pushHistory({date:timestamp.toISOString(),day,puzzleDay:state.mode==='daily'?day:undefined,mode:state.mode,answer,won,guesses,ranked:true});
}
function showResult(title,body,won,word){
  state.resultWord=word;
  $('#resultTitle').textContent=title;
  $('#resultBody').innerHTML=body;
  $('#resultModal').dataset.status=won?'won':'lost';
  $('#battleResultSummary').hidden=true;
  $('#resultClosing').textContent=state.unranked||state.zen?'This was a quiet, unscored entry. Your record is unchanged.':'The archive appreciates precision.';
  $('#resultDefinition').style.display='none';
  $('#shareBtn').hidden=!state.resultGame;$('#shareImageBtn').hidden=!state.resultGame;
  $('#resultEducationBtn').hidden=false;
  $('#newGameBtn').textContent=state.mode==='daily' && !state.timeMachine && !state.unranked?'Back to archive':'New entry';
  openModal('resultModal');
  if(won) showDefinition(word);
}
function finishWordGame(){
  if(state.finalised) return;
  state.finalised=true;
  const game=state.game,won=game.status==='won';
  state.resultGame=game;
  recordSolo(won,game.answer,game.guesses.length);
  const meta=state.mode==='movie'?getMovieMeta(game.answer):null;
  const supplement=meta?`<br><span class="muted">${meta.title} · ${meta.year} · ${meta.genre}</span>`:'';
  showResult(won?'Well solved.':'The answer remains.',
    won?`You found <strong>${game.answer}</strong> in ${game.guesses.length} ${game.guesses.length===1?'attempt':'attempts'}.${supplement}`:
      `The answer was <strong>${game.answer}</strong>.${supplement}`,won,game.answer);
  renderKeyboard();
}
function finishMarathon(){
  if(state.finalised) return;
  state.finalised=true;
  const game=state.marathon.currentGame,won=state.marathon.status==='won';
  const total=state.marathon.totalGuesses+(won?0:game.guesses.length);
  state.resultGame=game;recordSolo(won,game.answer,total);
  showResult(won?'Marathon complete.':'The marathon ends here.',
    won?`Three stages solved in <strong>${total} total guesses</strong>. The final word was <strong>${game.answer}</strong>.`:
      `The word was <strong>${game.answer}</strong>. You completed ${state.marathon.currentStage} of three stages.`,won,game.answer);
  renderKeyboard();
}
function finishAnagram(){
  if(state.finalised) return;
  state.finalised=true;
  const game=state.game,won=state.anagram.status==='won';
  state.resultGame=game;recordSolo(won,game.answer,game.guesses.length);
  showResult(won?'Unscrambled.':'The letters settle.',
    won?`You found <strong>${game.answer}</strong> in ${game.guesses.length} attempts.`:`The word was <strong>${game.answer}</strong>.`,won,game.answer);
  renderKeyboard();
}
function finishHangman(){
  if(state.finalised) return;
  state.finalised=true;
  const h=state.hangman,won=h.status==='won';
  state.resultGame=null;recordSolo(won,h.answer,h.wrong);
  showResult(won?'Word preserved.':'The gallows claimed it.',
    won?`You preserved <strong>${h.answer}</strong>.`:`The word was <strong>${h.answer}</strong>.`,won,h.answer);
  renderKeyboard();
}

const BATTLE_WORDS=`APPLE BRAVE BREAD CHAIR CHESS CLOUD CRANE CREAM DANCE DREAM EAGLE EARTH FAITH FLAME FRUIT GHOST GLASS GLOVE GRACE GRAIN GRAPE GREEN HEART HONEY HORSE HOUSE JUICE KNIFE LEMON LIGHT MAGIC MANGO MUSIC NOBLE OCEAN OLIVE PAINT PAPER PEARL PIANO PILOT PLANT RIVER ROBOT ROUND SHAPE SHORE SMILE SPACE SPARK STONE STORM STORY TABLE TIGER TRAIN WATER WHEAT WORLD YOUTH ZEBRA`.split(' ').filter(word=>FIVE_LETTER_ANSWERS.includes(word));
function startBattle(){
  const names=[$('#battleName1').value.trim().slice(0,18)||'Reader One',$('#battleName2').value.trim().slice(0,18)||'Reader Two'];
  if(names[0].toLocaleLowerCase()===names[1].toLocaleLowerCase()){
    showToast('Choose two different names.');return;
  }
  const answer=BATTLE_WORDS[Math.floor(Math.random()*BATTLE_WORDS.length)];
  state.battle=new BattleGame(answer,{names,hardMode:state.hard,zen:state.zen});
  state.unranked=state.zen;state.zenEver=state.zen;state.finalised=false;
  $('#battleSetup').hidden=true;$('#battlePanel').hidden=false;
  $('#gameActions').hidden=true;
  renderBadges();renderBattlePanel();
  showBattleCurtain();
  clearInterval(state.battleTicker);
  state.battleTicker=setInterval(updateBattleClocks,100);
}
function coverBattleScreen(){
  curtain.hidden=false;$('#gameView').inert=true;
  $('#islandWrap').inert=true;$('.footer').inert=true;
}
function showBattleCurtain(){
  const match=state.battle;if(!match) return;
  coverBattleScreen();
  $('#battleCurtainTitle').textContent=`${match.names[match.activeIndex]}, your turn.`;
  $('#battleCurtainCopy').textContent='The previous board and keyboard are concealed. Take the device, then reveal only your own clues.';
  setArrowLabel($('#battleReadyBtn'),`Ready, ${match.names[match.activeIndex]}`);
  if(gsapRef&&!prefersReduced()){
    gsapRef.fromTo('.battle-curtain-card',
      {autoAlpha:0,y:18,scale:.97},
      {autoAlpha:1,y:0,scale:1,duration:.45,ease:'power3.out',clearProps:'transform,opacity,visibility'});
  }
  $('#battleReadyBtn').focus();
}
function startBattleTurn(){
  const match=state.battle;if(!match?.startTurn()) return;
  curtain.hidden=true;$('#gameView').inert=false;
  $('#islandWrap').inert=false;$('.footer').inert=false;
  boardEl.setAttribute('aria-label',`Private board for ${match.names[match.activeIndex]}`);
  keyboardEl.setAttribute('aria-label',`Private keyboard for ${match.names[match.activeIndex]}`);
  renderBoard();renderKeyboard();renderBattlePanel();
  syncBattleClock();
}
function renderBattlePanel(){
  const match=state.battle;if(!match) return;
  const host=$('#battleScoreboard');host.replaceChildren();
  match.games.forEach((game,index)=>{
    const cell=make('div',`battle-reader ${index===match.activeIndex && match.phase!=='finished'?'active':''}`);
    const label=make('span','battle-reader-label',index===0?'Reader one':'Reader two');
    const name=make('strong','',match.names[index]);
    const status=game.status==='won'?'Solved':game.status==='lost'?'Unsolved':`${game.guesses.length} / 6 attempts`;
    const score=make('span','battle-reader-meta',status);
    cell.append(label,name,score);
    if(!match.untimed){const clock=make('span','battle-reader-meta battle-clock');clock.id=`battleClock${index}`;cell.append(clock)}
    else cell.append(make('span','battle-reader-meta','Untimed'));
    host.append(cell);
  });
  $('#battlePassBtn').hidden=match.phase!=='review';
  $('#battleEndBtn').hidden=match.phase==='finished';
  const note=$('#battleTurnNote');
  swapText(note,match.phase==='review'
    ?`Review your own clues, then conceal the board for ${match.names[match.nextIndex]}.`
    :match.phase==='turn'?`${match.names[match.activeIndex]} · round ${match.round} of 6. Submit one guess.`
      :match.phase==='finished'?'Both readers have finished. The answer is now available.':'');
  updateBattleClocks();
}
function updateBattleClocks(){
  if(!state.battle || state.battle.untimed) return;
  for(let index=0;index<2;index++){
    const clock=$(`#battleClock${index}`);if(clock) clock.textContent=formatClock(state.battle.elapsed(index));
  }
}
function syncBattleClock(){
  const match=state.battle;if(!match) return;
  if(document.hidden || !curtain.hidden || $$('.modal.open').length || match.phase!=='turn') match.pauseClock();
  else match.resumeClock();
  updateBattleClocks();
}
function handleBattleKey(key){
  const match=state.battle;if(!match || match.phase!=='turn') return;
  if(key==='⌫'){match.erase();renderBoard();return}
  if(key!=='Enter'){
    if(/^[A-Z]$/.test(key)){match.typeLetter(key);playSound();renderBoard()}
    return;
  }
  const response=match.submit();
  if(!response.ok){reportInvalid(response);return}
  playSound();renderBoard();renderKeyboard();renderBattlePanel();
  if(response.finished) finishBattle(response.result);
  else showToast('Review your clues, then conceal and pass the device.',3200);
}
function passBattle(){
  const match=state.battle;if(!match || match.phase!=='review') return;
  // Cover first: never briefly expose the incoming reader's board.
  coverBattleScreen();
  if(!match.advance()) return;
  renderBattlePanel();
  showBattleCurtain();
}
function finishBattle(result){
  if(state.finalised) return;
  state.finalised=true;
  clearInterval(state.battleTicker);state.battleTicker=null;
  if(!state.unranked && !state.zen){
    state.matches.push({day:localDayKey(),date:new Date().toISOString(),names:result.names,winner:result.winner,guesses:result.guesses,elapsedMs:result.elapsedMs,untimed:result.untimed});
    if(state.matches.length>80) state.matches=state.matches.slice(-80);
    storage.set('lexicon.v1.battles',JSON.stringify(state.matches));
    renderPersonalRecord();
  }
  state.resultGame=null;state.resultWord=result.answer;
  let title='An even match.';
  if(result.winner!==null) title=`${result.names[result.winner]} wins.`;
  if(result.reason==='unsolved') title='A draw. Neither reader solved it.';
  $('#resultTitle').textContent=title;
  $('#resultBody').textContent=result.reason==='time'
    ?`Both readers solved ${result.answer} in the same number of turns. Active time decided the match.`
    :`The shared answer was ${result.answer}.`;
  $('#resultModal').dataset.status=result.winner!==null?'won':'draw';
  const summary=$('#battleResultSummary');summary.replaceChildren();summary.hidden=false;
  result.names.forEach((name,index)=>{
    const cell=make('div',`battle-reader ${result.winner===index?'winner':''}`);
    cell.append(make('span','battle-reader-label',index===0?'Reader one':'Reader two'),
      make('strong','',name),
      make('span','battle-reader-meta',result.solved[index]?`Solved in ${result.guesses[index]} ${result.guesses[index]===1?'guess':'guesses'}`:`Not solved · ${result.guesses[index]} guesses`),
      make('span','battle-reader-meta',result.untimed?'Untimed':`Active time ${formatClock(result.elapsedMs[index])}`));
    summary.append(cell);
  });
  $('#resultClosing').textContent=state.unranked||state.zen
    ?'This was an unscored Zen match. Nothing was added to your record.'
    :'The match was saved on this device. Solo day rankings are unchanged.';
  $('#resultDefinition').style.display='none';
  $('#shareBtn').hidden=true;$('#shareImageBtn').hidden=true;
  $('#resultEducationBtn').hidden=false;$('#newGameBtn').textContent='New match';
  openModal('resultModal');
  if(result.solved.includes(true)) showDefinition(result.answer);
  renderKeyboard();renderBattlePanel();
}

let lastModalTrigger=null;
function trapFocus(container,event){
  const selectors='button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled])';
  const choices=[...container.querySelectorAll(selectors)].filter(el=>el.getClientRects().length && !el.closest('[hidden]'));
  if(!choices.length) return;
  const first=choices[0],last=choices.at(-1),active=document.activeElement;
  if(!container.contains(active)){
    event.preventDefault();first.focus();
  }else if(event.shiftKey && active===first){
    event.preventDefault();last.focus();
  }else if(!event.shiftKey && active===last){
    event.preventDefault();first.focus();
  }
}
function openModal(id){
  lastModalTrigger=document.activeElement;
  $$('.modal').forEach(modal=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true')});
  const modal=$('#'+id);modal.classList.add('open');modal.setAttribute('aria-hidden','false');
  syncBattleClock();
  modal.querySelector('[data-close]')?.focus();
}
function closeModals(restoreFocus=true){
  const hadOpen=$$('.modal.open').length>0;
  $$('.modal').forEach(modal=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true')});
  if(hadOpen) syncBattleClock();
  if(restoreFocus && lastModalTrigger?.isConnected && !lastModalTrigger.closest('.modal')) lastModalTrigger.focus();
}
function setTheme(theme){
  if(!['paper','ink','oxbridge','forest','slate'].includes(theme)) theme='paper';
  state.theme=theme;document.documentElement.dataset.theme=theme;
  storage.set('lexicon.v1.theme',theme);
  $$('[data-theme-btn]').forEach(button=>button.classList.toggle('active',button.dataset.themeBtn===theme));
  const iconSwap=$('#themeIconSwap');
  if(iconSwap) iconSwap.dataset.state=theme==='ink'?'b':'a';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',
    theme==='ink'?'#121312':theme==='oxbridge'?'#f1f2f4':theme==='forest'?'#f4f6f2':theme==='slate'?'#f8f8f9':'#f7f6f3');
}
function setZen(on){
  if(state.zen===on) return;
  state.zen=on;document.documentElement.dataset.zen=on?'on':'off';
  storage.set('lexicon.v1.zen',String(on));
  if(on && $('#statsModal').classList.contains('open')) closeModals();
  if(state.view==='game'){
    if(on){
      state.unranked=true;state.zenEver=true;
      state.battle?.setUntimed();
      if(state.mode==='daily' && state.lockedDaily){
        closeModals(false);showGame('daily',{force:true});
        showToast('Zen practice is ready. The daily record is unchanged.');return;
      }
    }
    renderBadges();renderKeyboard();
    if(state.battle) renderBattlePanel();
    syncBattleClock();
  }
  showToast(on?'Zen is on. This entry is unscored.':state.view==='game'&&state.unranked?'Zen is off. This entry remains unscored.':'Zen is off.');
}
function useHint(){
  if(state.finalised || state.lockedDaily || state.mode==='battle') return;
  if(state.hangman){
    const next=[...state.hangman.answer].find(letter=>!state.hangman.guessed.has(letter));
    if(!next) return;
    state.hangman.guess(next);renderHangman();renderKeyboard();
    showToast(`Revealed letter: ${next}`);
    if(state.hangman.status==='won') finishHangman();
    return;
  }
  if(state.anagram){showToast(`The word begins with ${state.anagram.answer[0]}.`);return}
  const game=currentGame();if(!game||game.status!=='playing') return;
  if(!game.guesses.length){showToast('Make a guess before requesting a hint.');return}
  const position=[...game.answer].findIndex((_,i)=>
    !game.board.slice(0,game.guesses.length).some(row=>row[i].state==='correct'));
  if(position<0){showToast('Every position has already been revealed.');return}
  showToast(`Position ${position+1} is ${game.answer[position]}.`);
}
function giveUp(){
  if(state.finalised || state.lockedDaily || state.mode==='battle') return;
  if(!window.confirm('Reveal the answer and end this entry?')) return;
  if(state.hangman){state.hangman.status='lost';finishHangman();return}
  if(state.anagram){state.anagram.status='lost';state.game.status='lost';finishAnagram();return}
  const game=currentGame();if(!game||game.status!=='playing') return;
  game.status='lost';
  if(state.marathon){state.marathon.status='lost';finishMarathon()}
  else finishWordGame();
}
function bindIsland(){
  const island=$('#dynamicIsland');
  const closeIsland=()=>{
    if(island.classList.contains('expanded')){
      island.classList.remove('expanded');syncIslandExpandUI();
    }
  };
  const toggleExpand=event=>{
    if(event) event.stopPropagation();
    island.classList.toggle('expanded');
    syncIslandExpandUI();
  };
  $('#islandExpandBtn').addEventListener('click',toggleExpand);
  $('.island-top').addEventListener('click',event=>{if(!event.target.closest('button')) toggleExpand()});
  // The navigation opens as a click-driven dropdown only; hover never opens or
  // closes it, so pointer users on laptops can reach every wrapped pill.
  document.addEventListener('click',event=>{
    if(!island.contains(event.target)) closeIsland();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&island.classList.contains('expanded')){
      closeIsland();
      $('#islandExpandBtn').focus();
    }
  });
  $('#modeRail').addEventListener('click',event=>{
    const button=event.target.closest('[data-mode]');
    if(!button) return;
    button.dataset.mode==='hero'?showHero():showGame(button.dataset.mode);
  });
  $('#educationNavBtn').addEventListener('click',()=>showEducation());
  $('#homeBtn').addEventListener('click',()=>showHero());
}
function bindControls(){
  bindIsland();prepareTimeMachine();
  $$('.archive-card,[data-cta="daily"]').forEach(card=>{
    card.addEventListener('click',()=>showGame(card.dataset.mode));
    if(card.classList.contains('archive-card')) card.addEventListener('mousemove',event=>{
      const rect=card.getBoundingClientRect();card.style.setProperty('--x',`${event.clientX-rect.left}px`);card.style.setProperty('--y',`${event.clientY-rect.top}px`);
    });
  });
  $('#exploreBtn').addEventListener('click',()=>$('.archive-grid-section').scrollIntoView({behavior:prefersReduced()?'auto':'smooth'}));
  $('#educationCta').addEventListener('click',()=>showEducation());
  $('#educationPromoBtn').addEventListener('click',()=>showEducation());
  $('#eduBackBtn').addEventListener('click',()=>showHero());
  $('#eduSearch').addEventListener('input',event=>{
    state.eduQuery=event.target.value;
    const clear=$('#eduSearchClear');if(clear) clear.hidden=!event.target.value;
    updateEducation();
  });
  const eduClear=$('#eduSearchClear');
  if(eduClear) eduClear.addEventListener('click',()=>{
    state.eduQuery='';$('#eduSearch').value='';eduClear.hidden=true;
    updateEducation();$('#eduSearch').focus();
  });
  $('#eduSurpriseBtn').addEventListener('click',()=>{
    state.eduCategory='All';state.eduQuery='';$('#eduSearch').value='';
    const clear=$('#eduSearchClear');if(clear) clear.hidden=true;
    let next=LORE_ENTRIES[Math.floor(Math.random()*LORE_ENTRIES.length)];
    if(next===state.eduSelected) next=LORE_ENTRIES[(LORE_ENTRIES.indexOf(next)+1)%LORE_ENTRIES.length];
    state.eduSelected=next;updateEducation();
    movePill($('#eduFilters'),motionReady);
    $('#eduFeature').scrollIntoView({behavior:prefersReduced()?'auto':'smooth',block:'start'});
  });
  $('#mobileBackBtn').addEventListener('click',()=>showHero());
  $('#settingsBtn').addEventListener('click',()=>openModal('settingsModal'));
  $('#helpBtn').addEventListener('click',()=>openModal('helpModal'));
  $('#statsBtn').addEventListener('click',()=>{renderPersonalRecord();openModal('statsModal')});
  $('#themeQuickBtn').addEventListener('click',()=>setTheme(state.theme==='ink'?'paper':'ink'));
  $$('[data-close]').forEach(button=>button.addEventListener('click',()=>closeModals()));
  $$('.modal').forEach(modal=>modal.addEventListener('click',event=>{if(event.target===modal) closeModals()}));
  $$('[data-theme-btn]').forEach(button=>button.addEventListener('click',()=>setTheme(button.dataset.themeBtn)));
  $('#hardModeToggle').checked=state.hard;
  $('#hardModeToggle').addEventListener('change',event=>{
    state.hard=event.target.checked;storage.set('lexicon.v1.hard',String(state.hard));
    showToast(`Hard Mode ${state.hard?'on':'off'} for new entries and matches.`);
    if(state.mode==='battle' && !state.battle) renderBadges();
  });
  $('#zenModeToggle').checked=state.zen;
  $('#zenModeToggle').addEventListener('change',event=>setZen(event.target.checked));
  $('#soundToggle').checked=state.sound;
  $('#soundToggle').addEventListener('change',event=>{
    state.sound=event.target.checked;storage.set('lexicon.v1.sound',String(state.sound));
    showToast(state.sound?'Subtle key feedback is on.':'Key feedback is off.');
  });
  $('#leaderboardBest').addEventListener('click',()=>{state.leaderboardOrder='best';renderLeaderboard()});
  $('#leaderboardRecent').addEventListener('click',()=>{state.leaderboardOrder='recent';renderLeaderboard()});
  $('#battleStartBtn').addEventListener('click',startBattle);
  $('#battleReadyBtn').addEventListener('click',startBattleTurn);
  $('#battlePassBtn').addEventListener('click',passBattle);
  $('#battleEndBtn').addEventListener('click',()=>{if(canLeaveBattle()) showGame('battle',{force:true})});
  $('#battleLeaveBtn').addEventListener('click',()=>{if(canLeaveBattle()) showHero(true)});
  $('#resultEducationBtn').addEventListener('click',()=>showEducation(state.resultWord));
  $('#newGameBtn').addEventListener('click',()=>{
    const mode=state.mode,options={force:true,timeMachine:state.timeMachine,puzzleDay:state.puzzleDay};
    if(mode==='daily' && !state.timeMachine && !state.unranked && !state.zen) showHero(true);
    else if(titles[mode]) showGame(mode,options);
    else showHero(true);
  });
  $('#shareBtn').addEventListener('click',shareText);
  $('#shareImageBtn').addEventListener('click',shareImage);
  $('#hintBtn').addEventListener('click',useHint);
  $('#giveUpBtn').addEventListener('click',giveUp);
  document.addEventListener('visibilitychange',syncBattleClock);
  window.addEventListener('keydown',event=>{
    if(event.key==='Tab' && (!curtain.hidden || $$('.modal.open').length)){
      trapFocus(!curtain.hidden?curtain:$('.modal.open'),event);return;
    }
    if(event.key==='Escape'){
      if(!curtain.hidden){if(canLeaveBattle()) showHero(true);return}
      if($$('.modal.open').length){closeModals();return}
      if(state.view==='game') showHero();
      else if(state.view==='education') showHero();
      return;
    }
    if(event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    if($$('.modal.open').length || !curtain.hidden) return;
    if(event.target.closest('button,a') && (event.key==='Enter'||event.key===' ')) return;
    if(state.view==='hero' && event.key==='Enter'){showGame('daily');return}
    if(state.view!=='game') return;
    if(event.key==='Enter') handleKey('Enter');
    else if(event.key==='Backspace'){event.preventDefault();handleKey('⌫')}
    else if(/^[a-zA-Z]$/.test(event.key)) handleKey(event.key.toUpperCase());
  });
}

bindControls();
setTheme(state.theme);
document.documentElement.dataset.zen=state.zen?'on':'off';
renderHeroPreview();renderPersonalRecord();renderEducation();
switchView('hero');

/* One-time motion setup: indicators snap first (no load animation),
   then the authored hero rehearsal begins. */
snapAllPills();
motionReady=true;
attachTilt($('#heroPreviewTilt'));
attachTilt($('#promoSpecimenTilt'));
playHeroEntrance();
if(document.fonts?.ready) document.fonts.ready.then(()=>{if(motionReady) snapAllPills()});
let pillResizeT=null;
window.addEventListener('resize',()=>{
  clearTimeout(pillResizeT);
  pillResizeT=setTimeout(snapAllPills,160);
});
