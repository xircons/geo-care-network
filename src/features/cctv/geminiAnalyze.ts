import type { ReportCategory, Severity } from "../../types";

const SEVERITY_VALUES: Severity[] = ["safe", "warning", "danger"];
const CATEGORY_VALUES: ReportCategory[] = ["environment", "infrastructure", "safety"];
const SEVERITY_SET = new Set<string>(SEVERITY_VALUES);
const CATEGORY_SET = new Set<string>(CATEGORY_VALUES);
const SEVERITY_RANK: Record<Severity, number> = { safe: 0, warning: 1, danger: 2 };

export const MAX_INLINE_BYTES = 15 * 1024 * 1024; // ~15 MB; Gemini inline limit is ~20 MB after base64 overhead.
const MODEL_ID = "gemini-2.5-flash";

// Run N independent passes in parallel and ensemble them. Gemini's video
// pipeline isn't fully deterministic even at temperature 0 (frame sampling,
// tokenization, and internal reasoning all introduce variance), so a single
// pass can flip between "warning" and "safe" across reruns of the same clip.
// Voting across multiple seeds smooths this out.
const PASS_COUNT = 3;
const PASS_SEEDS = [11, 47, 89];

const PROMPT = `วิเคราะห์คลิป dashcam / CCTV นี้ในบทบาทคนเห็นเหตุการณ์ที่กำลังเล่าให้เพื่อนฟัง ตัดสินว่ามีอุบัติเหตุชนกันหรือไม่
ให้ตอบกลับมาเป็น JSON object เดียวเท่านั้น ห้ามมีข้อความหรือ markdown อื่นใดนอกเหนือจาก JSON

**กฎเหล็ก: ต้องดูคลิปตั้งแต่วินาทีที่ 0 ถึงวินาทีสุดท้ายให้ครบทุกวินาที ห้ามดูแค่ช่วงแรกแล้วสรุป ห้ามข้ามเฟรม ห้ามตัดสินใจก่อนดูจบ — เพราะอุบัติเหตุอาจเกิดในวินาทีท้ายๆ หรือร่องรอย/ซากของอุบัติเหตุอาจเพิ่งปรากฏชัดในเฟรมท้ายๆ**

ขั้นตอนการคิด (ทำในหัวก่อนตอบ — อย่าเขียนออกมาใน JSON ห้ามข้ามขั้นใดเลย):
1) **สแกนเฟรมแรก เฟรมกลาง เฟรมสุดท้ายของคลิปก่อน** — มีรถคว่ำ/รถพัง/รถพิงกำแพง/รถจมร่อง/รถเอียงผิดธรรมชาติ/รถจอดในตำแหน่งแปลก (กลางถนน, บนเกาะกลาง, พิงราวกั้น)/เศษกระจกกระจาย/เศษเหล็กบนถนน/แก้วน้ำมัน/ควัน/ไฟไหม้/คนนอนนิ่งบนถนน/คนยืนข้างซากรถ "อยู่แล้ว" มั้ย? **ถ้าเห็นซากของอุบัติเหตุในเฟรมใดเฟรมหนึ่ง = is_crash = true ทันที** ไม่ต้องเห็นจังหวะการชนก็ได้ — เพราะอุบัติเหตุอาจเกิดก่อนคลิปเริ่ม นอกเฟรม หรือในวินาทีที่ frame sampling พลาดไป
2) **เช็คตัวละครในฉากให้ครบทั้งคลิป** — ในแต่ละช่วงเวลา มีรถกี่คัน? คันไหนปกติ คันไหนผิดปกติ (เอียง/หงาย/บุบ/จอดในที่แปลกๆ)? มอเตอร์ไซค์/จักรยานกี่คัน? คนเดินเท้ามั้ย? คนข้ามถนนมั้ย? คนยืนข้างทางมั้ย? มีสิ่งของบนถนน เช่น โทรศัพท์ กระเป๋า ขวด เศษกระจก ที่ตกหรือกลิ้งอยู่มั้ย?
3) **เดินผ่านคลิปทีละช่วง ~1 วินาที ตั้งแต่วินาทีที่ 0 จนถึงวินาทีสุดท้ายของคลิป** บอกตัวเองว่าวินาทีนั้นแต่ละตัวละครทำอะไร — เคลื่อนที่ทิศไหน ด้วยความเร็วประมาณเท่าไร มีอะไรเปลี่ยนแปลงไหม **ถ้าคลิปยาว 12 วินาที ต้องตรวจครบทั้ง 12 วินาที — ห้ามหยุดที่วินาทีที่ 3 หรือ 5 แล้วสรุป**
4) มาร์ค moment ที่ "น่าสงสัย" ไว้ — มีใครเบรกกะทันหันมั้ย? มีคนตัดหน้า/ข้ามถนนกะทันหันมั้ย? มีของตกบนถนนมั้ย? ระยะห่างลดเร็วผิดปกติมั้ย? ไฟเบรกวาบมั้ย? รถจอด/ล้มในตำแหน่งแปลกๆ มั้ย? คันหน้ากระตุกจาก impact มั้ย?
5) ในแต่ละ moment ที่น่าสงสัย — zoom เข้าไปดูเฟรมก่อน/ระหว่าง/หลังการ contact ที่อาจเกิดขึ้น มีการสัมผัสกันจริงๆ มั้ย? แม้แค่นิดเดียวก็นับ
6) **หาสาเหตุของเหตุการณ์** — ถ้ามีการชน "อะไรเป็นต้นเหตุ"? คนตัดหน้า? คนข้ามถนนกะทันหัน? ของตกบนถนน? เบรกแตก? ถนนลื่น? ฝนตก? อย่าเขียนแค่ "รถล้มกลางถนน" — ต้องอธิบายต่อว่า "ทำไม" รถถึงล้ม
7) ถ้ายังลังเล — ดูสัญญาณรอง: มีคนลงจากรถมาดูมั้ย? รถ 2 คันหยุดติดกันแบบผิดปกติมั้ย? มีคนยืนคุยกันริมถนนหลังจากรถหยุดมั้ย? มีรถพยาบาล/ตำรวจ/ไฟกระพริบแว่บมาในคลิปมั้ย?
8) **ตรวจสอบความสอดคล้อง — สำคัญมาก** — ถ้าขั้น 1 เห็น "ซากอุบัติเหตุ" (รถคว่ำ/รถเอียงผิดธรรมชาติ/เศษกระจาย/คนยืนรอบจุดเกิดเหตุ) แต่ขั้น 5 ไม่เห็น "moment การชน" — **อย่าตอบ is_crash = false เด็ดขาด** เพราะหลักฐานทางกายภาพ (รถคว่ำ/เศษ/คนเจ็บ) มีน้ำหนักมากกว่าการเห็นจังหวะชน ตอบ is_crash = true แล้วระบุใน description ว่า "เห็นซากของอุบัติเหตุที่เกิดขึ้นก่อนหน้า" หรือ "การชนเกิดนอกเฟรม"
9) ตัดสินใจขั้นสุดท้าย → ใส่ผลลัพธ์ลง JSON พร้อมเล่าเรื่องตามลำดับเหตุการณ์ "เริ่มจากอะไร → แล้วเกิดอะไรขึ้น → จบลงยังไง"

กฎสำคัญเรื่องภาษา: เขียน "title" และ "description" เป็นภาษาไทยสไตล์วัยรุ่นคุยกัน ภาษาพูดทั่วไป ไม่ต้องสุภาพหรือทางการมาก ความยาวกลางๆ กระชับแต่ได้ใจความเห็นภาพชัดเจน ใช้คำศัพท์แบบคนทั่วไปได้ เช่น สอยตูด, มิดด้าม, แหกโค้ง, ปาดหน้า, ชนยับ, กลิ้งคลุกฝุ่น, เบรกหัวทิ่ม, ครูดยาว

นิยามการชน (is_crash = true) — ครอบคลุมทุกระดับ:
- รถชนรถทุกแบบ ไม่ว่าจะเบาแค่ไหน — สอยตูด, ปาดหน้า, เฉี่ยว, ครูด, สีกัน, กระจกข้างเกี่ยว, ปะแบบเบาๆ
- รถชนคน / มอเตอร์ไซค์ / จักรยาน ทุกระดับความรุนแรง
- รถชนสิ่งกีดขวาง (เสา, ราวกั้น, ป้าย, กำแพง, เศษวัสดุ) ที่เห็นการกระแทกชัด หรือมีร่องรอยชัด เช่น เบรกกะทันหันแล้วเสียรูป, ฝุ่นควันลอยตรงจุดชน
- รถเสียการควบคุมแล้วไปกระแทกอะไรก็ตาม — แม้แค่แวบเดียว
- **เห็น "ซากของอุบัติเหตุ" ในคลิป ก็นับเป็น crash แม้ไม่ได้เห็นจังหวะการชน** — เช่น รถคว่ำหงายล้อ, รถเอียงจมร่อง, รถพิงราวกั้น, รถบุบยับจอดกลางถนน, เศษกระจก/พลาสติก/น้ำมันกระจายบนถนน, คนนอนนิ่งข้างรถ, คนยืนคุยข้างซากรถ, รถพยาบาล/ตำรวจที่จุดเกิดเหตุ — ทั้งหมดนี้คือหลักฐานว่า "เคยเกิดการชนขึ้นแล้ว" (อาจก่อนคลิปเริ่ม หรือนอกเฟรม) → is_crash = true

is_crash = false เฉพาะเมื่อรถ คน สิ่งของทั้งหมดผ่านไปได้โดยไม่มีการสัมผัสกัน "และ" ไม่มีร่องรอย/ซากของอุบัติเหตุปรากฏในเฟรมใดเลยตลอดทั้งคลิป

วิธีดูคลิป:
- ดูตั้งแต่วินาทีแรกจนวินาทีสุดท้าย ห้ามตัดจบกลางทาง
- ดูทีละ frame อย่างละเอียด เพราะการชนเบาๆ อาจกินเวลาแค่เสี้ยววินาที
- ระวังเป็นพิเศษถ้าทัศนวิสัยไม่ดี (ฝนตก, กลางคืน, แสงจ้า, ภาพไม่ชัด) — มักเป็นเงื่อนไขที่เกิดการชนเบาๆ
- มองหาสัญญาณบ่งบอกแม้ moment การชนสั้นมาก: เบรกกะทันหัน, ไฟเบรกวาบ, กันชน/ตัวถังบุบ, เศษวัสดุกระเด็น, รถจอดในตำแหน่งแปลกๆ, คนลงจากรถมาดูความเสียหาย
- ถ้าไม่แน่ใจจริงๆ ว่ามีการสัมผัสกันมั้ย ให้เอียงไปทาง is_crash = true แล้วอธิบายความไม่แน่ใจใน description (false negative อันตรายกว่า false positive)

Field rules — ทุก field จำเป็น ห้ามเพิ่มชื่ออื่น:
- "is_crash": boolean (true หรือ false เท่านั้น ไม่ใช่ string)
- "title": สรุปเหตุการณ์สั้นๆ ภาษาพูด (เช่น "เก๋งขาวสอยตูดกระบะกลางสี่แยก", "มอไซค์เบรกหัวทิ่มแหกโค้ง", "กระบะปาดหน้าชนยับตอนฝนตก")
- "description": เล่าเหตุการณ์แบบคนเห็นเล่าให้เพื่อนฟัง เรียงตามลำดับเวลาให้ครบ "ต้นเหตุ → การชน → ผลลัพธ์" — บอก (1) สาเหตุ/ตัวจุดชนวน (ใครทำอะไรก่อน เช่น คนเดินตัดหน้า, ของตกบนถนน, รถปาดเลน), (2) ใครชนกับใคร/อะไร ชนยังไง, (3) สภาพหลังชนเป็นไง คนเจ็บมั้ย ความยาวพอเหมาะ ไม่สั้นไป ไม่ยาวเกิน (เช่น "คนเดินตัดหน้ารถบรรทุกแบบไม่ทันมอง โทรศัพท์หล่นลงพื้นด้วย จู่ๆ มอไซค์ที่ขับมาด้านหลังก็พุ่งเข้าชนเต็มๆ คนขับมอไซค์กระเด็นไปไกลเลย นอนคว่ำหน้านิ่งอยู่ ดูท่าจะเจ็บหนัก" หรือ "กระบะเบรกกะทันหันเพราะคนข้ามถนน เก๋งขาวที่ตามมาเบรกไม่ทันเลยสอยตูดเข้าเต็มๆ ท้ายกระบะกับหน้าเก๋งบุบไปเยอะ คนขับลงมาดูแล้ว ดูไม่เจ็บอะไรมาก")
- "severity": ค่าใดค่าหนึ่งจาก: ${JSON.stringify(SEVERITY_VALUES)} — เกณฑ์ตัดสิน:
  • "danger" = (1) มีคนเจ็บ/บาดเจ็บที่เห็นได้ชัด หรือคนกระเด็นออกจากรถ, (2) ชนคนเดินเท้า/มอเตอร์ไซค์/จักรยาน, (3) รถพลิกคว่ำ/ตีลังกา, (4) ไฟไหม้-ควันดำ-น้ำมันรั่ว, (5) ชน multi-vehicle pile-up, (6) ชน high-speed เสี่ยงคนในรถบาดเจ็บอย่างมีนัยสำคัญ — ต้องเข้าเงื่อนไขเสี่ยงเจ็บ "และ" เสียหายหนักทั้ง 2 อย่างจึงจะใช้ danger
  • "warning" = ชนกันมีการเสียหายเล็ก-กลาง (เช่น สอยตูด, ปาดหน้าชนกัน, เฉี่ยว) แต่ไม่มีคนเจ็บที่เห็นได้ชัด แม้รถจะบุบยับก็ใช้ warning ถ้าทุกคนยังลุกขึ้นเดินได้ปกติ
  • "safe" = ไม่มีการชนเกิดขึ้นเลย
- "category": ค่าใดค่าหนึ่งจาก: ${JSON.stringify(CATEGORY_VALUES)} — "safety" สำหรับเหตุการณ์รถ/คน, "infrastructure" เฉพาะกรณีหลักคือถนน/ป้าย/ไฟชำรุด, "environment" เฉพาะกรณีหลักคือเศษวัสดุ/น้ำท่วม/สภาพอากาศ`;

export interface CrashAnalysis {
  is_crash: boolean;
  title: string;
  description: string;
  severity: Severity;
  category: ReportCategory;
}

/**
 * Aggregate verdict returned to the UI. Includes a short diagnostic line so the
 * user can see how confident the ensemble was — e.g. "3 of 3 passes agreed" vs
 * "1 of 3 passes detected a crash → please review carefully".
 */
export interface CrashAnalysisResult extends CrashAnalysis {
  /** How many of the ensemble passes voted is_crash = true. */
  crashVotes: number;
  /** How many passes returned a usable verdict (the rest failed and were dropped). */
  totalPasses: number;
  /** Human-readable one-liner about agreement, suitable for showing inline. */
  agreementNote: string;
}

/** Read a File as a base64 string (no `data:` prefix). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read file as data URL"));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
    reader.readAsDataURL(file);
  });
}

/** Strip markdown fences if Gemini wraps the JSON. */
function tryParseJson(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function validate(parsed: unknown): CrashAnalysis {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("AI response was not a JSON object");
  }
  const p = parsed as Record<string, unknown>;
  if (typeof p.is_crash !== "boolean") {
    throw new Error("AI response missing valid is_crash boolean");
  }
  if (typeof p.title !== "string" || p.title.trim().length === 0) {
    throw new Error("AI response missing valid title");
  }
  if (typeof p.description !== "string") {
    throw new Error("AI response missing valid description");
  }
  if (typeof p.severity !== "string" || !SEVERITY_SET.has(p.severity)) {
    throw new Error(`AI severity must be one of: ${SEVERITY_VALUES.join(", ")}`);
  }
  if (typeof p.category !== "string" || !CATEGORY_SET.has(p.category)) {
    throw new Error(`AI category must be one of: ${CATEGORY_VALUES.join(", ")}`);
  }
  return {
    is_crash: p.is_crash,
    title: p.title.trim(),
    description: p.description.trim(),
    severity: p.severity as Severity,
    category: p.category as ReportCategory
  };
}

/**
 * Run one Gemini analysis pass. Seed is varied across passes so the ensemble
 * gets diverse perspectives rather than three copies of the same answer.
 */
async function runPass(
  base64: string,
  mimeType: string,
  apiKey: string,
  seed: number
): Promise<CrashAnalysis> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: { mime_type: mimeType, data: base64 },
              // Sample 10 frames/second so even a sub-second moment of contact
              // can't fall between samples.
              video_metadata: { fps: 10 }
            },
            { text: PROMPT }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        // Low temperature keeps each individual pass focused; varying the seed
        // across passes is what produces the diversity we ensemble over.
        temperature: 0,
        seed,
        // Generous "thinking" budget so Gemini can walk through the video
        // frame-by-frame internally before producing its JSON verdict.
        thinkingConfig: { thinkingBudget: 8192 }
      }
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
  }

  const body = await res.json();
  const candidate = body?.candidates?.[0];
  const part = candidate?.content?.parts?.find(
    (p: { text?: string }) => typeof p.text === "string"
  );
  const rawText: string | undefined = part?.text;
  if (!rawText) {
    throw new Error("AI returned no text content");
  }

  const parsed = tryParseJson(rawText);
  return validate(parsed);
}

/**
 * Combine N independent analysis passes into one safety-biased verdict.
 *
 * Rules:
 * - is_crash: OR across passes. If ANY pass detected a crash, the final answer
 *   is "crash". This matches the prompt's instruction to tilt toward is_crash
 *   = true when uncertain — false negatives (missing a real crash) are worse
 *   than false positives for a community safety tracker.
 * - severity: the highest severity among the crash-voting passes (or "safe"
 *   when no pass detected a crash).
 * - title/description: pulled from the most severe crash-voting pass; on ties
 *   we prefer the longest description (more thorough reasoning).
 * - category: majority vote among crash-voting passes, with "safety" as the
 *   tiebreaker since most crash clips are vehicle/pedestrian incidents.
 */
function aggregate(passes: CrashAnalysis[]): CrashAnalysisResult {
  if (passes.length === 0) {
    throw new Error("No analysis passes succeeded");
  }

  const crashPasses = passes.filter((p) => p.is_crash);
  const finalIsCrash = crashPasses.length > 0;
  const crashVotes = crashPasses.length;
  const totalPasses = passes.length;

  // Pick the canonical pass we'll quote title/description/severity/category from.
  // When at least one pass detected a crash, we look only at crash-voting passes
  // (so we never report "danger" alongside a no-crash narrative).
  const pool = finalIsCrash ? crashPasses : passes;
  const canonical = pool.reduce((best, p) => {
    const bestRank = SEVERITY_RANK[best.severity];
    const pRank = SEVERITY_RANK[p.severity];
    if (pRank > bestRank) return p;
    if (pRank === bestRank && p.description.length > best.description.length) return p;
    return best;
  });

  // Majority category vote inside the chosen pool.
  const categoryTally: Record<string, number> = {};
  for (const p of pool) {
    categoryTally[p.category] = (categoryTally[p.category] ?? 0) + 1;
  }
  const sortedCats = Object.entries(categoryTally).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    // Tiebreak toward "safety" when a crash was detected, otherwise keep the
    // canonical pass's category.
    if (a[0] === "safety") return -1;
    if (b[0] === "safety") return 1;
    return 0;
  });
  const winningCategory = (sortedCats[0]?.[0] as ReportCategory) ?? canonical.category;

  let agreementNote: string;
  if (finalIsCrash && crashVotes === totalPasses) {
    agreementNote = `All ${totalPasses} AI passes agreed: crash detected.`;
  } else if (finalIsCrash) {
    agreementNote = `${crashVotes} of ${totalPasses} AI passes detected a crash — please review the clip carefully.`;
  } else {
    agreementNote = `All ${totalPasses} AI passes agreed: no crash detected.`;
  }

  return {
    is_crash: finalIsCrash,
    title: canonical.title,
    description: canonical.description,
    severity: canonical.severity,
    category: winningCategory,
    crashVotes,
    totalPasses,
    agreementNote
  };
}

/**
 * Send the video to Gemini for crash analysis using inline base64 data, running
 * an ensemble of {@link PASS_COUNT} passes in parallel for stability. Returns a
 * single aggregated verdict plus diagnostic info on how many passes agreed.
 *
 * Throws on missing API key, oversized file, or when every pass fails. If at
 * least one pass succeeds, the aggregator uses what it has.
 */
export async function analyzeVideoWithGemini(file: File): Promise<CrashAnalysisResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "VITE_GEMINI_API_KEY is not set. Add it to your .env (see .env.example)."
    );
  }
  if (file.size > MAX_INLINE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `Video is ${mb} MB. Maximum supported size is ${MAX_INLINE_BYTES / (1024 * 1024)} MB.`
    );
  }

  // Encode once, reuse across all passes — much cheaper than re-reading the file.
  const base64 = await fileToBase64(file);
  const mimeType = file.type || "video/mp4";

  const seeds = PASS_SEEDS.slice(0, PASS_COUNT);
  const settled = await Promise.allSettled(
    seeds.map((seed) => runPass(base64, mimeType, apiKey, seed))
  );

  const successes = settled
    .filter((r): r is PromiseFulfilledResult<CrashAnalysis> => r.status === "fulfilled")
    .map((r) => r.value);

  if (successes.length === 0) {
    // Surface the first underlying error rather than a generic "all failed".
    const firstRejection = settled.find(
      (r): r is PromiseRejectedResult => r.status === "rejected"
    );
    if (firstRejection) {
      throw firstRejection.reason instanceof Error
        ? firstRejection.reason
        : new Error(String(firstRejection.reason));
    }
    throw new Error("All AI analysis passes failed");
  }

  return aggregate(successes);
}
