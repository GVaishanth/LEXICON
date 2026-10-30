const WORD_GRID_MODES = new Set(['daily','4','5','6','movie','anagram']);

export function localDayKey(value=new Date()){
  const date=value instanceof Date?value:new Date(value);
  if(Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

export function groupPersonalDays(history){
  const days=new Map();
  for(const entry of history){
    if(!entry || entry.ranked===false || entry.zen || entry.timeMachine || entry.mode==='battle') continue;
    const day=/^\d{4}-\d{2}-\d{2}$/.test(entry.day||'') ? entry.day : localDayKey(entry.date);
    if(!day) continue;
    if(!days.has(day)) days.set(day,{day,played:0,solved:0,attempts:0,attemptEntries:0,bestAttempts:null});
    const d=days.get(day);
    d.played++;
    if(entry.won){
      d.solved++;
      if(WORD_GRID_MODES.has(entry.mode) && Number.isInteger(entry.guesses) && entry.guesses>=1 && entry.guesses<=6){
        d.attempts+=entry.guesses;
        d.attemptEntries++;
        d.bestAttempts=d.bestAttempts===null?entry.guesses:Math.min(d.bestAttempts,entry.guesses);
      }
    }
  }
  return [...days.values()].map(d=>({
    ...d,
    winRate:d.played?d.solved/d.played:0,
    avgAttempts:d.attemptEntries?d.attempts/d.attemptEntries:null
  }));
}

export function rankPersonalDays(days, order='best'){
  return [...days].sort((a,b)=>{
    if(order==='recent') return b.day.localeCompare(a.day);
    return b.solved-a.solved || b.winRate-a.winRate ||
      (a.avgAttempts??Infinity)-(b.avgAttempts??Infinity) || b.day.localeCompare(a.day);
  });
}

function dayNumber(key){
  const [y,m,d]=key.split('-').map(Number);
  return Math.floor(Date.UTC(y,m-1,d)/86400000);
}

export function getDayStreaks(history, today=new Date()){
  const days=groupPersonalDays(history);
  const winning=[...new Set(days.filter(d=>d.solved>0).map(d=>dayNumber(d.day)))].sort((a,b)=>a-b);
  if(!winning.length) return {current:0,best:0};
  let best=1, chain=1;
  for(let i=1;i<winning.length;i++){
    chain=winning[i]===winning[i-1]+1?chain+1:1;
    best=Math.max(best,chain);
  }
  const todayKey=localDayKey(today);
  if(!todayKey) return {current:0,best};
  const todayNum=dayNumber(todayKey);
  const last=winning[winning.length-1];
  if(last!==todayNum && last!==todayNum-1) return {current:0,best};
  if(last===todayNum-1 && days.some(d=>d.day===todayKey && d.solved===0)) return {current:0,best};
  let current=1;
  for(let i=winning.length-1;i>0 && winning[i]===winning[i-1]+1;i--) current++;
  return {current,best};
}
