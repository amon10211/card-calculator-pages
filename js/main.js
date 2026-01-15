import {
  cards, done, betCount, hitCount,
  setPendingBet, checkHit, resetCards, resetStats,
  incAgreeCount, getAgreeCount,
  getRecentRate, RECENT_N
} from "./state.js?v=20260115";

import { calcRun, calcMatrix, calcBetSuggestion, getActualWinner } from "./logic.js?v=20260115";
import { renderCards, renderResult, renderStats, resetUIKeepColon } from "./ui.js?v=20260115";
import { initButtons } from "./buttons.js?v=20260115";

/* ===== 門檻設定（支援 1 / 2 / 3 / 4）===== */
const THRESHOLD_KEY = "roadmind_threshold_v1";
let THRESHOLD = 2;

function loadThreshold(){
  try{
    const v = Number(localStorage.getItem(THRESHOLD_KEY));
    if([1,2,3,4].includes(v)) THRESHOLD = v;
  }catch(e){}
}

function bindThresholdSelect(){
  const sel = document.getElementById("thresholdSelect");
  if(!sel) return;

  sel.value = String(THRESHOLD);

  sel.addEventListener("change", ()=>{
    const v = Number(sel.value);
    if([1,2,3,4].includes(v)){
      THRESHOLD = v;
      try{ localStorage.setItem(THRESHOLD_KEY, String(v)); }catch(e){}
      renderStats(betCount.value, hitCount.value, getPhaseText());
    }
  });
}

function bindThresholdSelectMenu(){
  const sel = document.getElementById("thresholdSelectMenu");
  if(!sel) return;

  sel.value = String(THRESHOLD);

  sel.addEventListener("change", ()=>{
    const v = Number(sel.value);
    if([1,2,3,4].includes(v)){
      THRESHOLD = v;
      try{ localStorage.setItem(THRESHOLD_KEY, String(v)); }catch(e){}
      renderStats(betCount.value, hitCount.value, getPhaseText());
    }
  });
}

loadThreshold();

/* 牌圖 */
function cardImgUrl(v){
  const map = {
    A:"AS", 2:"2S", 3:"3S", 4:"4S", 5:"5S", 6:"6S", 7:"7S",
    8:"8S", 9:"9S", 10:"0S", J:"JS", Q:"QS", K:"KS"
  };
  return `https://deckofcardsapi.com/static/img/${map[v]}.png`;
}

function getPhaseText(){
  const r = getRecentRate();
  if(r == null) return `盤況：—（近${RECENT_N}把不足）`;

  const pct = (r * 100).toFixed(0);
  if(r < 0.45) return `盤況：⚠️震盪（近${RECENT_N}把 ${pct}%）建議降注/停`;
  if(r <= 0.55) return `盤況：中性（近${RECENT_N}把 ${pct}%）正常控注`;
  return `盤況：🔥順盤（近${RECENT_N}把 ${pct}%）可正常跟`;
}

export function onInputChanged(){
  renderCards(cards, cardImgUrl);
}

export function startNewRound(){
  // 只清牌，不清統計、不清「同一場一致次數」
  resetCards();
  renderCards(cards, cardImgUrl);
  resetUIKeepColon();
  renderStats(betCount.value, hitCount.value, getPhaseText());
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

  // ✅ 門檻改用可切換 THRESHOLD
  const betSuggestion = calcBetSuggestion(runResult, matrixResult, agreeCountForDir, THRESHOLD);
  renderResult(runResult, matrixResult, betSuggestion);

  // 用本把結果驗證上一把
  const actualWinner = getActualWinner(cards);
  checkHit(actualWinner);

  // 只有真的 BET 才存 pendingBet
  if(betSuggestion.action === "BET" && (betSuggestion.dir === "莊" || betSuggestion.dir === "閒")){
    setPendingBet(betSuggestion.dir);
  }else{
    setPendingBet(null);
  }

  renderStats(betCount.value, hitCount.value, getPhaseText());
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
  renderStats(betCount.value, hitCount.value, getPhaseText());
};

window.resetAll = function(){
  resetCards();
  renderCards(cards, cardImgUrl);
  resetUIKeepColon();
  renderStats(betCount.value, hitCount.value, getPhaseText());
};

// 只重置統計（同時會重置「同一場一致次數」）
window.resetStatsOnly = function(){
  resetStats();
  renderStats(betCount.value, hitCount.value, getPhaseText());
};

// 初始化
initButtons();
renderCards(cards, cardImgUrl);
resetUIKeepColon();
renderStats(betCount.value, hitCount.value, getPhaseText());

// ✅ 綁定門檻（桌機 + ☰ 選單）
bindThresholdSelect();
bindThresholdSelectMenu();

// 返回首頁
window.goHome = function(){
  window.toggleMenu?.(false);
  document.body.classList.add("is-home");
};

// ☰ 選單控制
window.toggleMenu = function(show){
  const overlay = document.getElementById("menuOverlay");
  if(!overlay) return;

  if(show){
    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");
  }else{
    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden", "true");
  }
};

// 點遮罩關閉
const menuOverlay = document.getElementById("menuOverlay");
if(menuOverlay){
  menuOverlay.addEventListener("click", (e)=>{
    if(e.target === menuOverlay) window.toggleMenu(false);
  });
}

// ESC 關閉選單（不影響首頁 ESC 進入）
window.addEventListener("keydown", (e)=>{
  if(e.key === "Escape") window.toggleMenu?.(false);
});
