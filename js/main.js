import {
  cards, done, hitCount,
  setPendingBet, checkHit, resetCards, resetStats,
  incAgreeCount, getAgreeCount,
  getRecentRate, RECENT_N,
  historyRounds, HISTORY_N,
  shoeUnits, noBetStreak, cooldownLeft,
  STOP_LOSS_U, TAKE_PROFIT_U, NO_BET_ALERT_N
} from "./state.js?v=20260117";

import { calcRun, calcMatrix, calcBetSuggestion, getActualWinner } from "./logic.js?v=20260117";
import { renderCards, renderResult, renderStats, resetUIKeepColon, renderHistory } from "./ui.js?v=20260117";
import { initButtons } from "./buttons.js?v=20260117";

/* 牌圖 */
// js/main.js（把原本的 cardImgUrl 整段換成這個）
function cardImgUrl(v){
  const rankMap = {
    A: "A",
    2: "2",
    3: "3",
    4: "4",
    5: "5",
    6: "6",
    7: "7",
    8: "8",
    9: "9",
    10: "0",
    J: "J",
    Q: "Q",
    K: "K"
  };

  // ✅ 用 1~13 判斷奇偶：A=1, J=11, Q=12, K=13
  let num;
  if (String(v) === "A") num = 1;
  else if (String(v) === "J") num = 11;
  else if (String(v) === "Q") num = 12;
  else if (String(v) === "K") num = 13;
  else num = Number(v);

  // ✅ 偶數 -> 紅心 H；奇數 -> 黑桃 S
  const suit = (num % 2 === 0) ? "H" : "S";

  const r = rankMap[v];
  return `https://deckofcardsapi.com/static/img/${r}${suit}.png`;
}

function getPhaseText(betSuggestion) {
  const r = getRecentRate();

  // ===== 第 1 行：盤況 =====
  let line1 = "盤況：—";
  if (r != null) {
    if (r < 0.45) line1 = "盤況：反開房（偏亂）";
    else if (r <= 0.55) line1 = "盤況：方向不明";
    else line1 = "盤況：正開房（穩定）";
  }

  // ===== 第 2 行：狀態（文字不變色，emoji 在後）=====
  let line2 = "狀態：可依建議操作 🟢";

  // 節奏 Gate（最高優先）
  if (cooldownLeft.value > 0) {
    line2 = `狀態：冷卻中（剩 ${cooldownLeft.value} 把） 🔴`;
  } else if (shoeUnits.value <= STOP_LOSS_U) {
    line2 = "狀態：已達止損｜建議換靴 🔴";
  } else if (shoeUnits.value >= TAKE_PROFIT_U) {
    line2 = "狀態：已達止盈｜建議收工 🔴";
  } else if (noBetStreak.value >= NO_BET_ALERT_N) {
    line2 = `狀態：連續不下注 ${noBetStreak.value} 次｜建議換桌 🟠`;
  }

  // 一般 NO_BET（原因）
  if (betSuggestion?.action === "NO_BET") {
    if (betSuggestion.reason === "COOLDOWN") {
      line2 = `狀態：冷卻中（剩 ${cooldownLeft.value} 把） 🔴`;
    } else if (betSuggestion.reason === "STOP_LOSS") {
      line2 = "狀態：已達止損｜建議換靴 🔴";
    } else if (betSuggestion.reason === "TAKE_PROFIT") {
      line2 = "狀態：已達止盈｜建議收工 🔴";
    } else {
      const reasonText = betSuggestion.text || "不下注";
      line2 = `狀態：不下注｜${reasonText.replace("，不下注", "")} 🟠`;
    }
  }

  // ===== 第 3 行：單靴（只讓數字上色）=====
  const u = Number(shoeUnits.value || 0);
  const sign = u > 0 ? "+" : "";
  const valueClass = u > 0 ? "u-plus" : (u < 0 ? "u-minus" : "");

  const line3 = `單靴：<span class="${valueClass}">${sign}${u}u</span>`;

  // 注意：第 3 行要用 innerHTML 顯示
  return {
    text: `${line1}\n${line2}\n`,
    unitHtml: line3
  };
}

export function onInputChanged(){
  renderCards(cards, cardImgUrl);
}

export function startNewRound() {
  // 只清牌，不清統計、不清「同一場一致次數」
  resetCards();
  renderCards(cards, cardImgUrl);
  resetUIKeepColon();
  renderStats(hitCount.value, getRecentRate(), getPhaseText(null));
}

export function settleIfReady(){
  if(cards.length === 6){
    done.value = true;
    settleRound();
  }
}

function settleRound() {
  if (!done.value) return;

  const runResult = calcRun(cards);
  const matrixResult = calcMatrix(cards);

  // 本把是否同向（莊/閒）
  const agreeDir =
    (runResult.final === matrixResult.final && (runResult.final === "莊" || runResult.final === "閒"))
      ? runResult.final
      : null;

  // 同一場累積：同向就 +1；衝突不歸零
  if (agreeDir) incAgreeCount(agreeDir);

  // 近 N 把命中率（可能是 null）
  const recentRate = getRecentRate();

  // 本把先結算上一把（用本把結果驗證上一把）
  const actualWinner = getActualWinner(cards);
  checkHit(actualWinner);

  // 冷卻倒數：每結算一把就 -1
  if (cooldownLeft.value > 0) cooldownLeft.value -= 1;

  // 計算新建議（會吃到 shoeUnits / cooldown 狀態）
  const betSuggestion = calcBetSuggestion(runResult, matrixResult, recentRate, {
    shoeUnits: shoeUnits.value,
    cooldownLeft: cooldownLeft.value
  });

  renderResult(runResult, matrixResult, betSuggestion);

  // 連續 NO_BET 計數
  if (betSuggestion?.action === "NO_BET") noBetStreak.value += 1;
  else noBetStreak.value = 0;

  // 只有真的 BET 才存 pendingBet
  if (betSuggestion?.action === "BET" && (betSuggestion?.dir === "莊" || betSuggestion?.dir === "閒")) {
    setPendingBet(betSuggestion.dir, betSuggestion.unit || 0);
  } else {
    setPendingBet(null, 0);
  }

  // 更新統計/盤況/歷史顯示
  renderStats(hitCount.value, recentRate, getPhaseText(betSuggestion));
  renderHistory(historyRounds, HISTORY_N);
}

window.noDraw = function(){
  if(cards.length === 4){
    cards.push(null);
    done.value = false;
    onInputChanged();
    return;
  }
  if(cards.length === 5){
    cards.push(null);
    done.value = true;
    onInputChanged();
    settleRound();
    return;
  }
  if(cards.length === 6){
    done.value = true;
    settleRound();
  }
};

window.undo = function(){
  cards.pop();
  done.value = false;
  renderCards(cards, cardImgUrl);

  resetUIKeepColon();
  renderStats(hitCount.value, getRecentRate(), getPhaseText(null));
};

window.resetAll = function(){
  resetCards();
  renderCards(cards, cardImgUrl);
  resetUIKeepColon();
  renderStats(hitCount.value, getRecentRate(), getPhaseText(null));
};

// 只重置統計（同時會重置「同一場一致次數」）
window.resetStatsOnly = function(){
  resetStats();
  renderStats(hitCount.value, getRecentRate(), getPhaseText(null));
};

// 初始化
initButtons();
renderCards(cards, cardImgUrl);
resetUIKeepColon();
renderStats(hitCount.value, getRecentRate(), getPhaseText(null));
renderHistory(historyRounds, HISTORY_N);

function bindHistoryClear(){
  const ids = ["historyClearDesktop", "historyClearMobile"];
  ids.forEach(id=>{
    const b = document.getElementById(id);
    if(!b) return;
    b.addEventListener("click", ()=>{
      window.resetStatsOnly();           // 會清命中率 + 歷史
      renderHistory(historyRounds, HISTORY_N);
    });
  });
}
bindHistoryClear();
