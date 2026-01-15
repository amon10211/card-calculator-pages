import { cards, done } from "./state.js?v=20260117";
import { onInputChanged, settleIfReady, startNewRound } from "./main.js?v=20260117";

const CARD_BTNS = ["A",2,3,4,5,6,7,8,9,10,"J","Q","K"];

export function initButtons(){
  const box = document.getElementById("btns");
  box.innerHTML = "";

  CARD_BTNS.forEach(v=>{
    const b = document.createElement("button");
    b.textContent = String(v);

    b.addEventListener("click", ()=>{
      // ✅ 如果上一把已結算（6張已滿 / done=true），就先自動開新一把
      if(done.value || cards.length >= 6){
        startNewRound();
      }

      cards.push(String(v));
      if(cards.length === 6) done.value = true;

      onInputChanged();
      settleIfReady();
    });

    box.appendChild(b);
  });

  const noDrawBtn = document.getElementById("noDrawBtn");
  if(noDrawBtn) noDrawBtn.addEventListener("click", ()=> window.noDraw());

  const undoBtn = document.getElementById("undoBtn");
  if(undoBtn) undoBtn.addEventListener("click", ()=> window.undo());

  const resetBtn = document.getElementById("resetBtn");
  if(resetBtn) resetBtn.addEventListener("click", ()=> window.resetAll());

  const rs = document.getElementById("resetStatsBtn");
  if(rs) rs.addEventListener("click", ()=> window.resetStatsOnly());

  // ☰ 選單（手機主用）
  const menuBtn = document.getElementById("menuBtn");
  if(menuBtn) menuBtn.addEventListener("click", ()=> window.toggleMenu(true));

  const menuCloseBtn = document.getElementById("menuCloseBtn");
  if(menuCloseBtn) menuCloseBtn.addEventListener("click", ()=> window.toggleMenu(false));

  const resetStatsBtnMenu = document.getElementById("resetStatsBtnMenu");
  if(resetStatsBtnMenu) resetStatsBtnMenu.addEventListener("click", ()=> window.resetStatsOnly());

  const goHomeBtnMenu = document.getElementById("goHomeBtnMenu");
  if(goHomeBtnMenu) goHomeBtnMenu.addEventListener("click", ()=> window.goHome());
}
