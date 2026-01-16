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
  if (betSuggestion?.action === "BET" && (betSuggestion?.dir === "莊" || betSuggestion?.dir === "閒")) {
    mainText = `建議下注：${betSuggestion.dir}`;
  } else if (betSuggestion?.action === "WAIT" && (betSuggestion?.dir === "莊" || betSuggestion?.dir === "閒")) {
    mainText = `觀察中：${betSuggestion.dir}`;
  } else if (betSuggestion?.action === "NO_BET") {
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

export function renderStats(hitCount, recentRate, phaseText) {
  // 命中次數
  safeSetText("hitCount", String(hitCount));
  safeSetText("hitCountMenu", String(hitCount));

  // 命中率（改成：近 10 把）
  const rateText =
    (typeof recentRate === "number")
      ? `命中率(近10把)：${(recentRate * 100).toFixed(1)}%`
      : "命中率(近10把)：—";

  safeSetText("hitRate", rateText);
  safeSetText("hitRateMenu", rateText);

  // 盤況
  safeSetText("phase", phaseText || "盤況：—");
  safeSetText("phaseMenu", phaseText || "盤況：—");
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
