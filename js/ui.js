export function renderCards(cards, cardImgUrl) {
  for (let i = 1; i <= 6; i++) {
    const slot = document.getElementById("s" + i);
    if (!slot) continue;

    slot.innerHTML = "";
    const v = cards[i - 1];

    if (v != null) {
      const img = document.createElement("img");
      img.src = cardImgUrl(String(v));
      slot.appendChild(img);
    }
  }
}

function safeSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

function safeSetClass(id, addClass, removeClasses = []) {
  const el = document.getElementById(id);
  if (!el) return;
  removeClasses.forEach((c) => el.classList.remove(c));
  if (addClass) el.classList.add(addClass);
}

function firstLine(s) {
  if (!s) return "—";
  return String(s).split("\n")[0] || "—";
}

function secondLine(s) {
  if (!s) return "";
  const arr = String(s).split("\n");
  return arr[1] || "";
}

function thirdLine(s) {
  if (!s) return "";
  const arr = String(s).split("\n");
  return arr[2] || "";
}

export function renderResult(runResult, matrixResult, betSuggestion) {
  // 兼容：舊元素仍可能存在
  const runInfoEl = document.getElementById("runInfo");
  const matrixInfoEl = document.getElementById("matrixInfo");
  if (runInfoEl) runInfoEl.innerText = "";
  if (matrixInfoEl) matrixInfoEl.innerText = "";

  const runFinal = runResult?.final || "—";
  const matrixFinal = matrixResult?.final || "—";

  // ===== 第一層：結論卡 =====
  const betMainEl = document.getElementById("betMain");
  const betSubEl = document.getElementById("betSub");
  const betAdviceEl = document.getElementById("betAdvice");
  const betLightEl = document.getElementById("betLight");

  let mainText = "建議：—";

  const action = betSuggestion && betSuggestion.action;
  const dir = betSuggestion && betSuggestion.dir;

  if (action === "BET" && (dir === "莊" || dir === "閒")) {
    const u = Number((betSuggestion && betSuggestion.unit) || 1);
    mainText = `建議下注：${dir} ${u}u`;
  }

  if (action === "WAIT" && (dir === "莊" || dir === "閒")) {
    mainText = `觀察中：${dir}`;
  }

  if (action === "NO_BET") {
    mainText = "建議：不下注";
  }

  if (betMainEl) {
    betMainEl.innerText = mainText;
    betMainEl.classList.remove("text-banker", "text-player");
    if (betSuggestion?.dir === "莊") betMainEl.classList.add("text-banker");
    if (betSuggestion?.dir === "閒") betMainEl.classList.add("text-player");
  }

  const meta = betSuggestion?.meta || "—";
  const sub = [firstLine(meta), secondLine(meta)].filter(Boolean).join("｜");
  if (betSubEl) betSubEl.innerText = sub || "—";
  // ✅ 第三行功能整個拿掉：永遠不顯示
  if (betAdviceEl) betAdviceEl.innerText = "";

  if (betLightEl) {
    betLightEl.className = "bet-light";
    if (betSuggestion?.light) betLightEl.classList.add(betSuggestion.light);
  }

  // ===== 第二層：分析收合 =====
  safeSetText("analysisBrief", `跑牌：${runFinal}｜矩陣：${matrixFinal}`);

  // ✅ 右側結果只顯示「莊 / 閒」，不顯示括號資訊
  safeSetText("runLine", runFinal);
  safeSetText("matrixLine", matrixFinal);

  safeSetClass("matrixLine",
    matrixFinal === "莊" ? "text-banker" : matrixFinal === "閒" ? "text-player" : "",
    ["text-banker", "text-player"]
  );

  let agreeText = firstLine(meta);
  if (!agreeText || agreeText === "—") {
    const agree = runFinal === matrixFinal && (runFinal === "莊" || runFinal === "閒");
    agreeText = agree ? `一致：${runFinal}` : "一致：否（衝突/無方向）";
  }
  safeSetText("agreeLine", agreeText);

  // ===== 舊結果行兼容（不顯示，但保留不破壞） =====
  safeSetText("runFinal", `結果：${runFinal}`);
  safeSetText("matrixFinal", `結果：${matrixFinal}`);
  safeSetClass("runFinal",
    runFinal === "莊" ? "text-banker" : runFinal === "閒" ? "text-player" : "",
    ["text-banker", "text-player"]
  );
  safeSetClass("matrixFinal",
    matrixFinal === "莊" ? "text-banker" : matrixFinal === "閒" ? "text-player" : "",
    ["text-banker", "text-player"]
  );
}

export function renderStats(hitCount, recentRate, phaseData) {
  const phaseEl = document.getElementById("phase");
  if (!phaseEl) return;

  // 兼容舊版：如果傳進來是純字串，就照舊顯示
  if (typeof phaseData === "string") {
    phaseEl.innerText = phaseData;
    return;
  }

  // 新版：前兩行純文字（保留換行）
  phaseEl.innerText = phaseData?.text || "";

  // 第三行：單靴（只讓數字上色）
  if (phaseData?.unitHtml) {
    const div = document.createElement("div");
    div.innerHTML = phaseData.unitHtml;
    phaseEl.appendChild(div);
  }
}

export function resetUIKeepColon() {
  // 第一層
  safeSetText("betMain", "建議：—");
  safeSetText("betSub", "—");
  safeSetText("betAdvice", "—");

  const betLightEl = document.getElementById("betLight");
  if (betLightEl) betLightEl.className = "bet-light";

  const betMainEl = document.getElementById("betMain");
  if (betMainEl) betMainEl.classList.remove("text-banker", "text-player");

  // 第二層
  safeSetText("analysisBrief", "跑牌：—｜矩陣：—");
  safeSetText("runLine", "—");
  safeSetText("matrixLine", "—");
  safeSetText("agreeLine", "—");
  safeSetClass("runLine", "", ["text-banker", "text-player"]);
  safeSetClass("matrixLine", "", ["text-banker", "text-player"]);

  // 舊元素兼容
  safeSetText("runFinal", "結果：—");
  safeSetText("matrixFinal", "結果：—");
  safeSetClass("runFinal", "", ["text-banker", "text-player"]);
  safeSetClass("matrixFinal", "", ["text-banker", "text-player"]);

  const runInfoEl = document.getElementById("runInfo");
  const matrixInfoEl = document.getElementById("matrixInfo");
  if (runInfoEl) runInfoEl.innerText = "";
  if (matrixInfoEl) matrixInfoEl.innerText = "";

  const details = document.getElementById("analysisDetails");
  if (details && details.open) details.open = false;
}

export function renderHistory(historyRounds, maxN){
  const pairs = [
    {
      listId: "historyListDesktop",
      countId: "historyCountDesktop"
    },
    {
      listId: "historyListMobile",
      countId: "historyCountMobile"
    }
  ];

  pairs.forEach(({ listId, countId })=>{
    const listEl = document.getElementById(listId);
    const countEl = document.getElementById(countId);

    if(countEl) countEl.innerText = `(${historyRounds.length}/${maxN})`;
    if(!listEl) return;

    // 清空
    listEl.innerHTML = "";

    // 新的在上面（你也可以改成舊的在上）
    const arr = [...historyRounds].slice().reverse();

    arr.forEach(item=>{
      const wrap = document.createElement("div");
      const cls = item.hit ? "history-hit" : "history-miss";
      wrap.className = `history-item ${cls}`;

      const left = document.createElement("div");
      left.className = "history-left";

      const round = document.createElement("div");
      round.className = "history-round";
      round.innerText = `第 ${item.round} 局`;

      const line1 = document.createElement("div");
      line1.className = "history-line";
      const u = (item.unit != null) ? `${item.unit}u` : "";
      line1.innerText = `建議：下注 ${item.suggestion} ${u}`.trim();

      const line2 = document.createElement("div");
      line2.className = "history-line";
      const d = (typeof item.delta === "number") ? item.delta : null;
      const pnl = (d == null) ? "" : `｜盈虧：${d > 0 ? "+" : ""}${d}u`;
      line2.innerText = `結果：開 ${item.actual}${pnl}`;

      left.appendChild(round);
      left.appendChild(line1);
      left.appendChild(line2);

      const badge = document.createElement("div");
      badge.className = "history-badge";

      const dot = document.createElement("span");
      dot.className = "history-dot";

      const text = document.createElement("span");
      text.innerText = item.hit ? "準" : "不準";

      badge.appendChild(dot);
      badge.appendChild(text);

      wrap.appendChild(left);
      wrap.appendChild(badge);

      listEl.appendChild(wrap);
    });
  });
}
