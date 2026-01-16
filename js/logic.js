const order = ["P","P","B","B","P","B"]; // 閒閒莊莊閒莊
const values = { A:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8, 9:9, 10:0, J:0, Q:0, K:0 };
const PUBLIC_SET = new Set(["10","J","Q","K"]);

function sumPoint(arr){
  return arr.reduce((a,c)=> a + values[String(c)], 0) % 10;
}

function splitPB(cards){
  const player = [];
  const banker = [];
  cards.forEach((c,i)=>{
    if(c == null) return;
    (order[i] === "P" ? player : banker).push(String(c));
  });
  return { player, banker };
}

// 翻邊規則
function calcFlip(cards, p, b){
  let flipped = false;

  // 第5/6張有補牌（不是 null）就翻邊
  if(cards.slice(4).some(c => c !== null && c !== undefined)) flipped = true;

  // 前4張有沒有公牌
  const first4 = cards.slice(0,4).filter(c => c != null).map(String);
  const hasPublic = first4.some(c => PUBLIC_SET.has(c));

  // 沒公牌且 閒點 > 莊點 => 翻邊
  if(!hasPublic && p > b) flipped = true;

  return flipped;
}

export function calcRun(cards){
  const { player, banker } = splitPB(cards);
  const p = sumPoint(player);
  const b = sumPoint(banker);
  const run = p + b;
  const predict = (run <= 9) ? "閒" : "莊";

  const flipped = calcFlip(cards, p, b);
  const final = flipped ? (predict === "閒" ? "莊" : "閒") : predict;

  return {
    p, b, run, predict, flipped,
    info: `閒:${p}　莊:${b}　跑牌值:${run}\n預測:${predict}　｜　翻邊:${flipped ? "是" : "否"}`,
    final
  };
}

// Walker/矩陣：排除公牌計點 + 公牌奇偶決定正負極
function walkerValue(arr){
  return arr.reduce((a,c)=>{
    const s = String(c);
    if(PUBLIC_SET.has(s)) return a;
    return a + values[s];
  }, 0);
}

function countPublic(cards){
  return cards.reduce((n,c)=>{
    if(c == null) return n;
    return n + (PUBLIC_SET.has(String(c)) ? 1 : 0);
  }, 0);
}

export function calcMatrix(cards){
  const { player, banker } = splitPB(cards);

  const publicCount = countPublic(cards);
  const pW = walkerValue(player);
  const bW = walkerValue(banker);

  const diff = pW - bW; // 閒 - 莊
  const polarity = (publicCount % 2 === 1) ? -1 : 1; // 奇數負極，偶數正極
  const polarityText = (polarity === 1) ? "正極(+)" : "負極(-)";

  // ✅ 新規則：當差值=0時，只看正負極判斷莊閒
  if(diff === 0){
    const final = (polarity === 1) ? "閒" : "莊";
    return {
      pW, bW, diff, publicCount, polarity,
      signed: 0,
      info: `矩陣：閒:${pW}　莊:${bW}　差值:${diff}\n公牌:${publicCount}　${polarityText} → 結果:${final}`,
      final
    };
  }

  const signed = diff * polarity;

  let final = "0（不出方向）";
  if(signed > 0) final = "閒";
  else if(signed < 0) final = "莊";

  return {
    pW, bW, diff, publicCount, polarity,
    signed,
    info: `矩陣：閒:${pW}　莊:${bW}　差值:${diff}\n公牌:${publicCount}　${polarityText} → 結果:${signed}`,
    final
  };
}

function starText(level){
  if(level <= 0) return "—";
  return "★".repeat(level) + "☆".repeat(Math.max(0, 3 - level));
}

/**
 * 🧠 不同門檻套不同控注建議（同星等，門檻越低越嚴格控注）
 */
function adviceByThreshold(confidence, threshold){
  const t = Number(threshold || 2);

  if(t === 1){
    if(confidence >= 3) return "可試追，但務必縮注/設停損";
    if(confidence === 2) return "小注試跟（不加注）";
    return "保守觀察（等更明顯再出手）";
  }

  if(t === 2){
    if(confidence >= 3) return "可追（照策略控注）";
    if(confidence === 2) return "小注試跟";
    return "保守觀察";
  }

  if(t === 3){
    if(confidence >= 3) return "偏保守：可跟（建議不加注/慢跟）";
    if(confidence === 2) return "偏保守：小小注試跟";
    return "偏保守：觀察為主";
  }

  if(confidence >= 3) return "極保守：可跟（僅固定小注）";
  if(confidence === 2) return "極保守：試跟一把就回觀察";
  return "極保守：先不出手";
}

/**
 * ✅ 下注建議（含：門檻 + 信心等級 + 三行 meta）
 * ✅ 🔒 門檻=1 時自動降信心 1 星
 * ✅ 🧠 不同門檻套不同控注建議
 */
export function calcBetSuggestion(runResult, matrixResult, agreeCountForDir, threshold){
  const runFinal = runResult?.final;
  const matrixFinal = matrixResult?.final;

  const agreeDir =
    (runFinal === matrixFinal && (runFinal === "莊" || runFinal === "閒"))
      ? runFinal
      : null;

  let confidence = 0;

  if(agreeDir){
    confidence = 1;

    // 矩陣力度（signed 絕對值）>=2 加分
    const strength = Math.abs(Number(matrixResult?.signed || 0));
    if(strength >= 2) confidence += 1;

    // 跑牌值沒翻邊加分
    if(runResult?.flipped === false) confidence += 1;
  }else{
    confidence = 0;
  }

  // 🔒 門檻=1：自動降信心 1 星（最低 0）
  if(agreeDir && Number(threshold) === 1){
    confidence = Math.max(0, confidence - 1);
  }

  const advice = agreeDir ? adviceByThreshold(confidence, threshold) : "衝突/無方向：不下注";

  if(!agreeDir){
    return {
      action: "NO_BET",
      dir: null,
      text: "衝突，不下注",
      meta: `信心：${starText(confidence)}\n${advice}`,
      light: "bet-orange",
      confidence
    };
  }

  if(agreeCountForDir >= threshold){
    return {
      action: "BET",
      dir: agreeDir,
      text: agreeDir,
      meta: `一致：${agreeDir} ${agreeCountForDir}/${threshold}\n信心：${starText(confidence)}\n${advice}`,
      light: (agreeDir === "莊") ? "bet-red" : "bet-blue",
      confidence
    };
  }

  return {
    action: "WAIT",
    dir: agreeDir,
    text: `觀察中 ${agreeDir}`,
    meta: `一致：${agreeDir} ${agreeCountForDir}/${threshold}\n信心：${starText(confidence)}\n${advice}`,
    light: "bet-orange",
    confidence
  };
}

// 本把「實際結果」：用閒莊點比較（同點=和）
export function getActualWinner(cards){
  const { player, banker } = splitPB(cards);
  const p = sumPoint(player);
  const b = sumPoint(banker);
  if(p === b) return "和";
  return (p > b) ? "閒" : "莊";
}
