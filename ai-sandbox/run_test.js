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

const PROMPT = `Analyze this dashcam/CCTV footage. Determine if there is a vehicle collision.

You MUST output exactly one JSON object and nothing else: no markdown, no code fences, no text before or after the object, and no properties other than these five keys: "is_crash", "title", "description", "severity", "category".

Field rules (output must be valid JSON):
- "is_crash": boolean (true or false only).
- "title": a short non-empty string summarizing the scene.
- "description": a string describing what you observe.
- "severity": exactly one of these strings: ${JSON.stringify(SEVERITY_VALUES)}
- "category": exactly one of these strings: ${JSON.stringify(CATEGORY_VALUES)}

Example shape (content must match the actual video; this is only structural):
{"is_crash":true,"title":"Rear-end collision at intersection","description":"Two vehicles make contact; smoke or debris may be visible.","severity":"danger","category":"safety"}`;

const VIDEO_DIR = path.join(__dirname, "dataset_videos");
const RESULTS_FILE = path.join(__dirname, "results.json");
const MODEL_ID = "gemini-1.5-flash";
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
  console.log(`\n[ai-sandbox] Uploading ${displayName}`);
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
