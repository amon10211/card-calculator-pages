// js/logic.js
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
 * ✅ 下注建議（含：門檻 + 信心等級 + 三行 meta）
 * ✅ 🧠 信心加入「命中率(近10把)」加權：順盤加 1、震盪扣 1
 *
 * @param recentRate 近 N 把命中率（0~1），沒有資料可傳 null
 */
export function calcBetSuggestion(runResult, matrixResult, recentRate){
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

  // ✅ 命中率(近10把) 加權：順盤 +1、震盪 -1、中性 0
  if(agreeDir && typeof recentRate === "number"){
    if(recentRate > 0.55) confidence += 1;
    else if(recentRate < 0.45) confidence -= 1;
  }

  // 限制在 0~3
  confidence = Math.max(0, Math.min(3, confidence));

  // 沒一致方向：不下注
  if(!agreeDir){
    return {
      action: "NO_BET",
      dir: null,
      text: "衝突，不下注",
      meta: `信心：${starText(confidence)}\n衝突/無方向：不下注`,
      light: "bet-orange",
      confidence
    };
  }

  // ✅ 有一致方向：直接給下注建議
  // （你已把「門檻」功能整個拿掉，所以這裡不看一致次數，直接 BET）
  const light = (agreeDir === "莊") ? "bet-red" : "bet-blue";
  return {
    action: "BET",
    dir: agreeDir,
    text: `下注：${agreeDir}`,
    meta: `信心：${starText(confidence)}\n一致方向：${agreeDir}`,
    light,
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
