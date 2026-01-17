export const cards = [];
export const done = { value: false };

/* 統計（累積） */
export const hitCount = { value: 0 };

/* 盤況（近 N 把命中紀錄；只記「有下注且本把不是和」） */
export const RECENT_N = 20;
export const recentHits = []; // boolean[]

/* pendingBet：上一把「真的有下注」的建議，用下一把實際結果來對 */
let pendingBet = null; // "莊" | "閒" | null

/* ✅ 改成「同一場累積一致次數」（不用連續） */
export const agreeCounts = { "莊": 0, "閒": 0 };

export function setPendingBet(v){
  pendingBet = v; // "莊" | "閒" | null
}

export function incAgreeCount(dir){
  if(dir !== "莊" && dir !== "閒") return;
  agreeCounts[dir] = (agreeCounts[dir] || 0) + 1;
}

export function getAgreeCount(dir){
  if(dir !== "莊" && dir !== "閒") return 0;
  return agreeCounts[dir] || 0;
}

export function resetAgreeCounts(){
  agreeCounts["莊"] = 0;
  agreeCounts["閒"] = 0;
}

export function checkHit(actualWinner){
  // 本把是和：不算
  if(actualWinner === "和") return;

  // 上一把沒真的下注：不算
  if(pendingBet !== "莊" && pendingBet !== "閒") return;

  const hit = (actualWinner === pendingBet);
  if(hit) hitCount.value += 1;

  // 近 N 把
  recentHits.push(hit);
  if(recentHits.length > RECENT_N) recentHits.shift();
}

export function getRecentRate(){
  if(recentHits.length === 0) return null;
  const hit = recentHits.reduce((a,b)=> a + (b ? 1 : 0), 0);
  return hit / recentHits.length;
}

export function resetCards(){
  cards.length = 0;
  done.value = false;
}

export function resetStats(){
  hitCount.value = 0;
  pendingBet = null;
  recentHits.length = 0;

  // ✅ 重置「同一場一致次數」
  resetAgreeCounts();
}
