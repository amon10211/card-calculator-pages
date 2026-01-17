import {
  cards, done, hitCount,
  setPendingBet, checkHit, resetCards, resetStats,
  incAgreeCount, getAgreeCount,
  getRecentRate, RECENT_N,
  historyRounds, HISTORY_N
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

function getPhaseText(){
  const r = getRecentRate();
  if(r == null) return `盤況：—`;

  const pct = (r * 100).toFixed(0);
  if(r < 0.45) return `盤況：⚠️反開房 建議反打`;
  if(r <= 0.55) return `盤況：方向不明，先觀察`;
  return `盤況：🔥正開房 可正常跟`;
}

export function onInputChanged(){
  renderCards(cards, cardImgUrl);
}

export function startNewRound(){
  // 只清牌，不清統計、不清「同一場一致次數」
  resetCards();
  renderCards(cards, cardImgUrl);
  resetUIKeepColon();
 renderStats(hitCount.value, getRecentRate(), getPhaseText());
}

export function settleIfReady(){
  if(cards.length === 6){
    done.value = true;
    settleRound();
  }
}

function settleRound(){
  if(!done.value) return;

  const runResult = calcRun(cards);
  const matrixResult = calcMatrix(cards);

  // 本把是否同向（莊/閒）
  const agreeDir =
    (runResult.final === matrixResult.final && (runResult.final === "莊" || runResult.final === "閒"))
      ? runResult.final
      : null;

  // 同一場累積：同向就 +1；衝突不歸零
  if(agreeDir) incAgreeCount(agreeDir);

  // 取得該方向累積一致次數
  const agreeCountForDir = agreeDir ? getAgreeCount(agreeDir) : 0;

    // ✅ 先抓「近10把命中率」（可能是 null）
  //    下面 renderStats / calcBetSuggestion 都會用到
  const recentRate = getRecentRate();

  // ✅ 把「近10把命中率」傳進畫面顯示
  renderStats(hitCount.value, recentRate, getPhaseText());

  const betSuggestion = calcBetSuggestion(runResult, matrixResult, recentRate);
  renderResult(runResult, matrixResult, betSuggestion);

  // 用本把結果驗證上一把
  const actualWinner = getActualWinner(cards);
  checkHit(actualWinner);

  // 只有真的 BET 才存 pendingBet（加上 ? 避免 betSuggestion 炸掉）
  if(betSuggestion?.action === "BET" && (betSuggestion?.dir === "莊" || betSuggestion?.dir === "閒")){
    setPendingBet(betSuggestion.dir);
  }else{
    setPendingBet(null);
  }

  renderStats(hitCount.value, getRecentRate(), getPhaseText());
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
  renderStats(hitCount.value, getRecentRate(), getPhaseText());
};

window.resetAll = function(){
  resetCards();
  renderCards(cards, cardImgUrl);
  resetUIKeepColon();
  renderStats(hitCount.value, getRecentRate(), getPhaseText());
};

// 只重置統計（同時會重置「同一場一致次數」）
window.resetStatsOnly = function(){
  resetStats();
  renderStats(hitCount.value, getRecentRate(), getPhaseText());
};

// 初始化
initButtons();
renderCards(cards, cardImgUrl);
resetUIKeepColon();
renderStats(hitCount.value, getRecentRate(), getPhaseText());
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
