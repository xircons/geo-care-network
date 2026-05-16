/**
 * AI Sandbox — Gemini crash-dataset tester
 *
 * Reads every .mp4 / .mov file in ./dataset_videos, uploads each to the
 * Google AI File API, waits for ACTIVE state, asks gemini-1.5-flash whether
 * a vehicle collision occurred, and writes the parsed JSON result for every
 * video into results.json. Each result includes `schemaValid` and optional
 * `validationErrors` when the model output does not match the contract.
 *
 * Usage:
 *   1. echo GEMINI_API_KEY=your_key_here > .env
 *   2. drop your videos into ./dataset_videos
 *   3. node run_test.js
 */

require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager, FileState } = require("@google/generative-ai/server");

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("[ai-sandbox] Missing GEMINI_API_KEY in .env — exiting.");
  process.exit(1);
}

/** Aligned with main app `src/types` Severity and ReportCategory */
const SEVERITY_VALUES = ["safe", "warning", "danger"];
const CATEGORY_VALUES = ["environment", "infrastructure", "safety"];
const CRASH_RESPONSE_KEYS = ["is_crash", "title", "description", "severity", "category"];
const SEVERITY_SET = new Set(SEVERITY_VALUES);
const CATEGORY_SET = new Set(CATEGORY_VALUES);

const PROMPT = `วิเคราะห์คลิป dashcam / CCTV นี้ในบทบาทคนเห็นเหตุการณ์ที่กำลังเล่าให้เพื่อนฟัง ตัดสินว่ามีอุบัติเหตุชนกันหรือไม่
ให้ตอบกลับมาเป็น JSON object เดียวเท่านั้น ห้ามมีข้อความหรือ markdown อื่นใดนอกเหนือจาก JSON

ขั้นตอนการคิด (ทำในหัวก่อนตอบ — อย่าเขียนออกมาใน JSON):
1) **เช็คตัวละครในฉากให้ครบก่อน** — มีรถกี่คัน? มอเตอร์ไซค์/จักรยานกี่คัน? มีคนเดินเท้ามั้ย? คนข้ามถนนมั้ย? คนยืนข้างทางมั้ย? มีสิ่งของบนถนน เช่น โทรศัพท์ กระเป๋า ขวด ที่ตกหรือกลิ้งอยู่มั้ย? อย่ามองข้ามตัวละครเล็กๆ
2) เดินผ่านคลิปทีละช่วง ~1 วินาที ตั้งแต่ต้นจนจบ บอกตัวเองว่าวินาทีนั้นแต่ละตัวละครทำอะไร — เคลื่อนที่ทิศไหน ด้วยความเร็วประมาณเท่าไร มีอะไรเปลี่ยนแปลงไหม
3) มาร์ค moment ที่ "น่าสงสัย" ไว้ — มีใครเบรกกะทันหันมั้ย? มีคนตัดหน้า/ข้ามถนนกะทันหันมั้ย? มีของตกบนถนนมั้ย? ระยะห่างลดเร็วผิดปกติมั้ย? ไฟเบรกวาบมั้ย? รถจอด/ล้มในตำแหน่งแปลกๆ มั้ย? คันหน้ากระตุกจาก impact มั้ย?
4) ในแต่ละ moment ที่น่าสงสัย — zoom เข้าไปดูเฟรมก่อน/ระหว่าง/หลังการ contact ที่อาจเกิดขึ้น มีการสัมผัสกันจริงๆ มั้ย? แม้แค่นิดเดียวก็นับ
5) **หาสาเหตุของเหตุการณ์** — ถ้ามีการชน "อะไรเป็นต้นเหตุ"? คนตัดหน้า? คนข้ามถนนกะทันหัน? ของตกบนถนน? เบรกแตก? ถนนลื่น? ฝนตก? อย่าเขียนแค่ "รถล้มกลางถนน" — ต้องอธิบายต่อว่า "ทำไม" รถถึงล้ม
6) ถ้ายังลังเล — ดูสัญญาณรอง: มีคนลงจากรถมาดูมั้ย? รถ 2 คันหยุดติดกันแบบผิดปกติมั้ย? มีคนยืนคุยกันริมถนนหลังจากรถหยุดมั้ย?
7) ตัดสินใจขั้นสุดท้าย → ใส่ผลลัพธ์ลง JSON พร้อมเล่าเรื่องตามลำดับเหตุการณ์ "เริ่มจากอะไร → แล้วเกิดอะไรขึ้น → จบลงยังไง"

กฎสำคัญเรื่องภาษา: เขียน "title" และ "description" เป็นภาษาไทยสไตล์วัยรุ่นคุยกัน ภาษาพูดทั่วไป ไม่ต้องสุภาพหรือทางการมาก ความยาวกลางๆ กระชับแต่ได้ใจความเห็นภาพชัดเจน ใช้คำศัพท์แบบคนทั่วไปได้ เช่น สอยตูด, มิดด้าม, แหกโค้ง, ปาดหน้า, ชนยับ, กลิ้งคลุกฝุ่น, เบรกหัวทิ่ม, ครูดยาว

นิยามการชน (is_crash = true) — ครอบคลุมทุกระดับ:
- รถชนรถทุกแบบ ไม่ว่าจะเบาแค่ไหน — สอยตูด, ปาดหน้า, เฉี่ยว, ครูด, สีกัน, กระจกข้างเกี่ยว, ปะแบบเบาๆ
- รถชนคน / มอเตอร์ไซค์ / จักรยาน ทุกระดับความรุนแรง
- รถชนสิ่งกีดขวาง (เสา, ราวกั้น, ป้าย, กำแพง, เศษวัสดุ) ที่เห็นการกระแทกชัด หรือมีร่องรอยชัด เช่น เบรกกะทันหันแล้วเสียรูป, ฝุ่นควันลอยตรงจุดชน
- รถเสียการควบคุมแล้วไปกระแทกอะไรก็ตาม — แม้แค่แวบเดียว
- **เห็น "ซากของอุบัติเหตุ" ในคลิป ก็นับเป็น crash แม้ไม่ได้เห็นจังหวะการชน** — เช่น รถคว่ำหงายล้อ, รถเอียงจมร่อง, รถพิงราวกั้น, รถบุบยับจอดกลางถนน, เศษกระจก/พลาสติก/น้ำมันกระจายบนถนน, คนนอนนิ่งข้างรถ, คนยืนคุยข้างซากรถ, รถพยาบาล/ตำรวจที่จุดเกิดเหตุ — ทั้งหมดนี้คือหลักฐานว่า "เคยเกิดการชนขึ้นแล้ว" (อาจก่อนคลิปเริ่ม หรือนอกเฟรม) → is_crash = true

is_crash = false เฉพาะเมื่อรถ คน สิ่งของทั้งหมดผ่านไปได้โดยไม่มีการสัมผัสกัน "และ" ไม่มีร่องรอย/ซากของอุบัติเหตุปรากฏในเฟรมใดเลย

วิธีดูคลิป:
- ดูทีละ frame อย่างละเอียด เพราะการชนเบาๆ อาจกินเวลาแค่เสี้ยววินาที
- ระวังเป็นพิเศษถ้าทัศนวิสัยไม่ดี (ฝนตก, กลางคืน, แสงจ้า, ภาพไม่ชัด) — มักเป็นเงื่อนไขที่เกิดการชนเบาๆ
- มองหาสัญญาณบ่งบอกแม้ moment การชนสั้นมาก: เบรกกะทันหัน, ไฟเบรกวาบ, กันชน/ตัวถังบุบ, เศษวัสดุกระเด็น, รถจอดในตำแหน่งแปลกๆ, คนลงจากรถมาดูความเสียหาย
- ถ้าไม่แน่ใจจริงๆ ว่ามีการสัมผัสกันมั้ย ให้เอียงไปทาง is_crash = true แล้วอธิบายความไม่แน่ใจใน description

Field rules — ทุก field จำเป็น ห้ามเพิ่มชื่ออื่น:
- "is_crash": boolean (true หรือ false เท่านั้น ไม่ใช่ string)
- "title": สรุปเหตุการณ์สั้นๆ ภาษาพูด (เช่น "เก๋งขาวสอยตูดกระบะกลางสี่แยก", "มอไซค์เบรกหัวทิ่มแหกโค้ง", "กระบะปาดหน้าชนยับตอนฝนตก")
- "description": เล่าเหตุการณ์แบบคนเห็นเล่าให้เพื่อนฟัง เรียงตามลำดับเวลาให้ครบ "ต้นเหตุ → การชน → ผลลัพธ์" — บอก (1) สาเหตุ/ตัวจุดชนวน (ใครทำอะไรก่อน เช่น คนเดินตัดหน้า, ของตกบนถนน, รถปาดเลน), (2) ใครชนกับใคร/อะไร ชนยังไง, (3) สภาพหลังชนเป็นไง คนเจ็บมั้ย ความยาวพอเหมาะ ไม่สั้นไป ไม่ยาวเกิน (เช่น "คนเดินตัดหน้ารถบรรทุกแบบไม่ทันมอง โทรศัพท์หล่นลงพื้นด้วย จู่ๆ มอไซค์ที่ขับมาด้านหลังก็พุ่งเข้าชนเต็มๆ คนขับมอไซค์กระเด็นไปไกลเลย นอนคว่ำหน้านิ่งอยู่ ดูท่าจะเจ็บหนัก" หรือ "กระบะเบรกกะทันหันเพราะคนข้ามถนน เก๋งขาวที่ตามมาเบรกไม่ทันเลยสอยตูดเข้าเต็มๆ ท้ายกระบะกับหน้าเก๋งบุบไปเยอะ คนขับลงมาดูแล้ว ดูไม่เจ็บอะไรมาก")
- "severity": ค่าใดค่าหนึ่งจาก: ${JSON.stringify(SEVERITY_VALUES)} — เกณฑ์ตัดสิน:
  • "danger" = (1) มีคนเจ็บ/บาดเจ็บที่เห็นได้ชัด หรือคนกระเด็นออกจากรถ, (2) ชนคนเดินเท้า/มอเตอร์ไซค์/จักรยาน, (3) รถพลิกคว่ำ/ตีลังกา, (4) ไฟไหม้-ควันดำ-น้ำมันรั่ว, (5) ชน multi-vehicle pile-up, (6) ชน high-speed เสี่ยงคนในรถบาดเจ็บอย่างมีนัยสำคัญ — ต้องเข้าเงื่อนไขเสี่ยงเจ็บ "และ" เสียหายหนักทั้ง 2 อย่างจึงจะใช้ danger
  • "warning" = ชนกันมีการเสียหายเล็ก-กลาง (เช่น สอยตูด, ปาดหน้าชนกัน, เฉี่ยว) แต่ไม่มีคนเจ็บที่เห็นได้ชัด แม้รถจะบุบยับก็ใช้ warning ถ้าทุกคนยังลุกขึ้นเดินได้ปกติ
  • "safe" = ไม่มีการชนเกิดขึ้นเลย
- "category": ค่าใดค่าหนึ่งจาก: ${JSON.stringify(CATEGORY_VALUES)} — "safety" สำหรับเหตุการณ์รถ/คน, "infrastructure" เฉพาะกรณีหลักคือถนน/ป้าย/ไฟชำรุด, "environment" เฉพาะกรณีหลักคือเศษวัสดุ/น้ำท่วม/สภาพอากาศ`;

const VIDEO_DIR = path.join(__dirname, "dataset_videos");
const RESULTS_FILE = path.join(__dirname, "results.json");
const MODEL_ID = "gemini-2.5-flash";
const VIDEO_EXTS = new Set([".mp4", ".mov"]);
const POLL_INTERVAL_MS = 5000;

const fileManager = new GoogleAIFileManager(API_KEY);
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_ID });

function listVideos() {
  if (!fs.existsSync(VIDEO_DIR)) {
    fs.mkdirSync(VIDEO_DIR, { recursive: true });
    return [];
  }
  return fs
    .readdirSync(VIDEO_DIR)
    .filter((name) => VIDEO_EXTS.has(path.extname(name).toLowerCase()))
    .map((name) => path.join(VIDEO_DIR, name));
}

function mimeFor(filePath) {
  return path.extname(filePath).toLowerCase() === ".mov" ? "video/quicktime" : "video/mp4";
}

/**
 * Reads GPS coordinates embedded in the file via exiftool.
 * Returns { latitude, longitude } where each value is a float or null
 * (null if the tag is missing or exiftool is unavailable / errors out).
 */
function extractGPS(filePath) {
  try {
    const stdout = execSync(`exiftool -n -GPSLatitude -GPSLongitude "${filePath}"`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const latMatch = stdout.match(/GPS Latitude\s*:\s*(-?\d+(?:\.\d+)?)/i);
    const lngMatch = stdout.match(/GPS Longitude\s*:\s*(-?\d+(?:\.\d+)?)/i);
    return {
      latitude: latMatch ? parseFloat(latMatch[1]) : null,
      longitude: lngMatch ? parseFloat(lngMatch[1]) : null
    };
  } catch (err) {
    console.warn(`[ai-sandbox] extractGPS failed for ${path.basename(filePath)}: ${err.message}`);
    return { latitude: null, longitude: null };
  }
}

async function waitForActive(fileName) {
  // Poll the File API until processing completes (or fails).
  while (true) {
    const meta = await fileManager.getFile(fileName);
    if (meta.state === FileState.ACTIVE) return meta;
    if (meta.state === FileState.FAILED) {
      throw new Error(`File ${fileName} failed processing`);
    }
    process.stdout.write(".");
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/**
 * Validates parsed object against the crash-analysis contract (matches PROMPT / app enums).
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateCrashAnalysis(parsed) {
  const errors = [];
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { valid: false, errors: ["root must be a single JSON object"] };
  }
  if (parsed._parseError != null) {
    return { valid: false, errors: [`json_parse: ${parsed._parseError}`] };
  }

  const keys = Object.keys(parsed);
  for (const k of keys) {
    if (!CRASH_RESPONSE_KEYS.includes(k)) {
      errors.push(`unexpected key "${k}" (allowed: ${CRASH_RESPONSE_KEYS.join(", ")})`);
    }
  }
  for (const k of CRASH_RESPONSE_KEYS) {
    if (!(k in parsed)) {
      errors.push(`missing key "${k}"`);
    }
  }
  if (errors.length) {
    return { valid: false, errors };
  }

  if (typeof parsed.is_crash !== "boolean") {
    errors.push('is_crash must be a JSON boolean (true or false, not a string)');
  }
  if (typeof parsed.title !== "string" || parsed.title.trim().length === 0) {
    errors.push("title must be a non-empty string");
  }
  if (typeof parsed.description !== "string") {
    errors.push("description must be a string");
  }
  if (!SEVERITY_SET.has(parsed.severity)) {
    errors.push(`severity must be exactly one of: ${SEVERITY_VALUES.join(", ")}`);
  }
  if (!CATEGORY_SET.has(parsed.category)) {
    errors.push(`category must be exactly one of: ${CATEGORY_VALUES.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}

function tryParseJson(raw) {
  // Gemini sometimes wraps JSON in ```json fences; strip and try again.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Fall back: find the first {...} block in the string.
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (innerErr) {
        return { _raw: raw, _parseError: innerErr.message };
      }
    }
    return { _raw: raw, _parseError: err.message };
  }
}

async function analyzeOne(localPath) {
  const displayName = path.basename(localPath);

  // Pull GPS out of the local file before uploading — the File API strips
  // metadata, so we have to read it from disk while we still have the original.
  const location = extractGPS(localPath);
  if (location.latitude != null && location.longitude != null) {
    console.log(`\n[ai-sandbox] ${displayName} GPS: ${location.latitude}, ${location.longitude}`);
  } else {
    console.log(`\n[ai-sandbox] ${displayName} GPS: none embedded`);
  }

  console.log(`[ai-sandbox] Uploading ${displayName}`);
  const upload = await fileManager.uploadFile(localPath, {
    mimeType: mimeFor(localPath),
    displayName
  });
  process.stdout.write(`[ai-sandbox] Waiting for ACTIVE state`);
  const active = await waitForActive(upload.file.name);
  console.log(`\n[ai-sandbox] File is ACTIVE — prompting ${MODEL_ID}`);

  const response = await model.generateContent([
    { fileData: { mimeType: active.mimeType, fileUri: active.uri } },
    { text: PROMPT }
  ]);

  const text = response.response.text();
  const parsed = tryParseJson(text);
  const validation = validateCrashAnalysis(parsed);

  return {
    file: displayName,
    uri: active.uri,
    model: MODEL_ID,
    location,
    rawResponse: text,
    parsed,
    schemaValid: validation.valid,
    ...(validation.valid ? {} : { validationErrors: validation.errors })
  };
}

async function main() {
  const videos = listVideos();
  if (videos.length === 0) {
    console.log("[ai-sandbox] No .mp4 / .mov files found in ./dataset_videos — nothing to do.");
    fs.writeFileSync(RESULTS_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), results: [] }, null, 2));
    return;
  }

  console.log(`[ai-sandbox] Found ${videos.length} video file(s). Starting analysis.`);

  const results = [];
  for (const video of videos) {
    try {
      const entry = await analyzeOne(video);
      results.push(entry);
    } catch (err) {
      console.error(`[ai-sandbox] Failed on ${path.basename(video)}:`, err.message);
      results.push({
        file: path.basename(video),
        error: err.message
      });
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    model: MODEL_ID,
    count: results.length,
    results
  };

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(payload, null, 2));
  console.log(`\n[ai-sandbox] Wrote ${results.length} result(s) -> ${path.relative(process.cwd(), RESULTS_FILE)}`);
}

main().catch((err) => {
  console.error("[ai-sandbox] Fatal:", err);
  process.exit(1);
});
