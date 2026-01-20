export const cards = [];
export const done = { value: false };

/* 統計（累積） */
export const hitCount = { value: 0 };

/* 盤況（近 N 把命中紀錄；只記「有下注且本把不是和」） */
export const RECENT_N = 20;
export const recentHits = []; // boolean[]

/* pendingBet：上一把「真的有下注」的建議，用下一把實際結果來對 */
let pendingBet = null; // "莊" | "閒" | null
let pendingUnit = 0; // 上一把「真的有下注」的單位 u

/* =========================
   歷史牌局（只記「有下注且非和」）
   最多 20 局
========================= */
export const HISTORY_N = 20;
export const historyRounds = []; // { round, suggestion, actual, hit }[]

/* ✅ 改成「同一場累積一致次數」（不用連續） */
export const agreeCounts = { "莊": 0, "閒": 0 };
/* =========================
   單靴節奏 / 資金控管（u）
========================= */
export const shoeUnits = { value: 0 };     // 單靴淨盈虧（單位 u）
export const noBetStreak = { value: 0 };   // 連續 NO_BET 次數
export const cooldownLeft = { value: 0 };  // 冷卻剩餘把數（>0 強制不下注）
export const lossStreak = { value: 0 };    // 連續虧損把數

// ✅ 你指定的預設值
export const STOP_LOSS_U = -10;            // 止損 -10u
export const TAKE_PROFIT_U = 10;           // 止盈 +10u
export const NO_BET_ALERT_N = 8;           // NO_BET 連續 8 次 → 提示換桌
export const COOLDOWN_AFTER_LOSS = 3;      // 連虧 3 把 → 冷卻
export const COOLDOWN_ROUNDS = 2;          // 冷卻 2 把
export const BANKER_PAY = 1;            // 不抽水

export function setPendingBet(v, unit = 0){
  pendingBet = v;                 // "莊" | "閒" | null
  pendingUnit = Number(unit || 0);
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

export function checkHit(actualWinner) {
  // 上一把沒真的下注：不算（也不寫歷史）
  if (pendingBet !== "莊" && pendingBet !== "閒") return null;

  // ✅ 開和：命中率不算，但歷史要記（hit = null）
  if (actualWinner === "和") {
    historyRounds.push({
      round: historyRounds.length + 1,
      suggestion: pendingBet,
      unit: pendingUnit,
      actual: actualWinner,
      hit: null,
      delta: 0
    });
    if (historyRounds.length > HISTORY_N) historyRounds.shift();
    return null;
  }

  // 只有 莊/閒 才算命中
  const hit = (actualWinner === pendingBet);
  if (hit) hitCount.value += 1;

  recentHits.push(hit);
  if (recentHits.length > RECENT_N) recentHits.shift();

  // ===== 單靴盈虧（u）=====
  // 閒贏 +unit；莊贏 +unit*BANKER_PAY（抽水）；輸 -unit
  let delta = 0;
  if (hit) {
    delta = (pendingBet === "莊") ? (pendingUnit * BANKER_PAY) : pendingUnit;
  } else {
    delta = -pendingUnit;
  }
  shoeUnits.value = Number((shoeUnits.value + delta).toFixed(2));

  // 連虧觸發冷卻
  if (delta < 0) {
    lossStreak.value += 1;
    if (lossStreak.value >= COOLDOWN_AFTER_LOSS) {
      cooldownLeft.value = COOLDOWN_ROUNDS;
      lossStreak.value = 0;
    }
  } else {
    lossStreak.value = 0;
  }

  // 寫入歷史（含 unit / 盈虧）
  historyRounds.push({
    round: historyRounds.length + 1,
    suggestion: pendingBet,
    unit: pendingUnit,
    actual: actualWinner,
    hit,
    delta
  });
  if (historyRounds.length > HISTORY_N) historyRounds.shift();

  return hit;
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

  // ✅ 歷史（只記有下注的）也清掉
  historyRounds.length = 0;
  shoeUnits.value = 0;
  noBetStreak.value = 0;
  cooldownLeft.value = 0;
  lossStreak.value = 0;
  pendingUnit = 0;
}
