#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const TMP_DIR = path.join(ROOT, ".local-speech", "runtime-tmp");
const DEFAULT_WHISPER_CLI = path.join(ROOT, ".local-speech", "bin", "whisper.cpp", "Release", "whisper-cli.exe");
const DEFAULT_MODEL = path.join(ROOT, "local-models", "whisper", "ggml-base.en.bin");

function parseArgs() {
  const options = {
    json: false,
    selfTest: false,
    sttPort: 8080,
    ttsPort: 8880,
    pronunciationPort: 8090,
    host: "127.0.0.1",
    whisperCli: process.env.WHISPER_CPP_CLI || DEFAULT_WHISPER_CLI,
    model: process.env.WHISPER_CPP_MODEL || DEFAULT_MODEL
  };
  const args = process.argv.slice(2);

  args.forEach((arg, index) => {
    const [key, inlineValue] = arg.split("=", 2);
    const nextValue = inlineValue || args[index + 1];

    if (key === "--json") {
      options.json = true;
    }

    if (key === "--self-test") {
      options.selfTest = true;
    }

    if (key === "--host" && nextValue) {
      options.host = nextValue;
    }

    if (key === "--stt-port" && nextValue) {
      options.sttPort = Number(nextValue);
    }

    if (key === "--tts-port" && nextValue) {
      options.ttsPort = Number(nextValue);
    }

    if (key === "--pronunciation-port" && nextValue) {
      options.pronunciationPort = Number(nextValue);
    }

    if (key === "--whisper-cli" && nextValue) {
      options.whisperCli = path.resolve(nextValue);
    }

    if (key === "--model" && nextValue) {
      options.model = path.resolve(nextValue);
    }
  });

  return options;
}

function ensureRuntime(options) {
  const checks = [
    {
      id: "platform",
      ok: process.platform === "win32",
      detail: "Windows runtime uses Windows SAPI for local TTS."
    },
    {
      id: "whisper-cli",
      ok: fs.existsSync(options.whisperCli),
      detail: options.whisperCli
    },
    {
      id: "model",
      ok: fs.existsSync(options.model),
      detail: options.model
    }
  ];

  const missing = checks.filter((item) => !item.ok);

  if (missing.length > 0) {
    const error = new Error(`Windows speech runtime is not ready: ${missing.map((item) => item.id).join(", ")}`);
    error.checks = checks;
    throw error;
  }

  fs.mkdirSync(TMP_DIR, { recursive: true });
  return checks;
}

function createTempPath(extension) {
  return path.join(TMP_DIR, `${Date.now()}-${Math.random().toString(16).slice(2)}${extension}`);
}

function createTempBase() {
  return path.join(TMP_DIR, `${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

function removeQuietly(filePath) {
  try {
    fs.rmSync(filePath, { force: true });
  } catch {
    // best-effort cleanup only
  }
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordsFromText(text) {
  return normalizeText(text).split(" ").filter(Boolean);
}

function normalizeSpokenEntries(spokenWords) {
  return spokenWords.map((item) => (typeof item === "string" ? { word: item } : item));
}

function wordSimilarity(a, b) {
  if (a === b) {
    return 1;
  }

  const rows = a.length + 1;
  const cols = b.length + 1;
  const distances = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));

  for (let i = 0; i < rows; i += 1) {
    distances[i][0] = i;
  }

  for (let j = 0; j < cols; j += 1) {
    distances[0][j] = j;
  }

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      distances[i][j] = Math.min(
        distances[i - 1][j] + 1,
        distances[i][j - 1] + 1,
        distances[i - 1][j - 1] + cost
      );
    }
  }

  return Math.max(0, 1 - distances[a.length][b.length] / Math.max(a.length, b.length, 1));
}

function alignWords(referenceWords, spokenWords) {
  const spokenEntries = normalizeSpokenEntries(spokenWords);
  const spokenWordValues = spokenEntries.map((item) => item.word);
  const rows = referenceWords.length + 1;
  const cols = spokenWordValues.length + 1;
  const cost = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
  const back = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ""));

  for (let i = 1; i < rows; i += 1) {
    cost[i][0] = i;
    back[i][0] = "delete";
  }

  for (let j = 1; j < cols; j += 1) {
    cost[0][j] = j;
    back[0][j] = "insert";
  }

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const substitutionCost = referenceWords[i - 1] === spokenWordValues[j - 1] ? 0 : 1;
      const choices = [
        { type: "match", value: cost[i - 1][j - 1] + substitutionCost },
        { type: "delete", value: cost[i - 1][j] + 1 },
        { type: "insert", value: cost[i][j - 1] + 1 }
      ].sort((a, b) => a.value - b.value);

      cost[i][j] = choices[0].value;
      back[i][j] = choices[0].type;
    }
  }

  const aligned = [];
  let i = referenceWords.length;
  let j = spokenWordValues.length;

  while (i > 0 || j > 0) {
    const action = back[i][j];

    if (action === "match") {
      const expected = referenceWords[i - 1];
      const actualEntry = spokenEntries[j - 1];
      const actual = actualEntry.word;
      const similarity = wordSimilarity(expected, actual);
      aligned.unshift({
        word: expected,
        actual,
        score: expected === actual ? 98 : Math.round(55 + similarity * 35),
        startMs: actualEntry.startMs,
        endMs: actualEntry.endMs,
        confidence: actualEntry.confidence,
        issue: expected === actual ? undefined : `识别为 ${actual}`
      });
      i -= 1;
      j -= 1;
      continue;
    }

    if (action === "insert") {
      j -= 1;
      continue;
    }

    aligned.unshift({
      word: referenceWords[i - 1],
      actual: "",
      score: 35,
      issue: "未识别到"
    });
    i -= 1;
  }

  return aligned;
}

function createPhonemeFocus(lowWords) {
  const rules = [
    { label: "th", detail: "舌尖轻触上齿，避免读成 s/z。", test: /\b(th|.*th.*)\b/ },
    { label: "v / w", detail: "v 要有上齿轻触下唇，w 要圆唇起音。", test: /[vw]/ },
    { label: "r / l", detail: "r 卷舌不碰上颚，l 舌尖轻触上齿龈。", test: /[rl]/ },
    { label: "final consonant", detail: "补足词尾辅音，避免吞掉 t/d/k/s。", test: /[tdks]$/ }
  ];

  return rules
    .map((rule) => {
      const words = lowWords.filter((word) => rule.test.test(word)).slice(0, 4);

      if (words.length === 0) {
        return null;
      }

      return {
        label: rule.label,
        detail: rule.detail,
        words
      };
    })
    .filter(Boolean)
    .slice(0, 4);
}

function convertToWav(inputPath) {
  const wavPath = createTempPath(".wav");
  const result = spawnSync(
    "ffmpeg",
    ["-y", "-hide_banner", "-loglevel", "error", "-i", inputPath, "-ar", "16000", "-ac", "1", wavPath],
    {
      encoding: "utf8"
    }
  );

  if (result.status !== 0 || !fs.existsSync(wavPath)) {
    removeQuietly(wavPath);
    return inputPath;
  }

  return wavPath;
}

function transcribeFile(inputPath, options, language = "en") {
  const wavPath = convertToWav(inputPath);
  const result = spawnSync(
    options.whisperCli,
    ["-m", options.model, "-f", wavPath, "-nt", "-np", "-l", language || "en"],
    {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120000
    }
  );

  if (wavPath !== inputPath) {
    removeQuietly(wavPath);
  }

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `whisper-cli exited ${result.status}`);
  }

  const text = result.stdout.replace(/\u001b\[[0-9;]*m/g, "").replace(/\s+/g, " ").trim();

  if (!text) {
    throw new Error("whisper-cli returned an empty transcript");
  }

  return text;
}

function readOffset(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value) : undefined;
}

function readConfidence(value) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, Number(value.toFixed(3)))) : undefined;
}

function extractWhisperSegments(data) {
  const transcription = Array.isArray(data?.transcription) ? data.transcription : [];

  return transcription
    .map((segment) => {
      const text = String(segment?.text || "").trim();
      const startMs = readOffset(segment?.offsets?.from);
      const endMs = readOffset(segment?.offsets?.to);

      if (!text || startMs === undefined || endMs === undefined) {
        return null;
      }

      return {
        text,
        startMs,
        endMs
      };
    })
    .filter(Boolean);
}

function extractWhisperTimedWords(data) {
  const transcription = Array.isArray(data?.transcription) ? data.transcription : [];
  const timedWords = [];

  transcription.forEach((segment) => {
    const tokens = Array.isArray(segment?.tokens) ? segment.tokens : [];

    tokens.forEach((token) => {
      const rawText = String(token?.text || "");

      if (!rawText.trim() || rawText.trim().startsWith("[_")) {
        return;
      }

      const tokenWords = wordsFromText(rawText);

      if (tokenWords.length === 0) {
        return;
      }

      const startMs = readOffset(token?.offsets?.from);
      const endMs = readOffset(token?.offsets?.to);
      const confidence = readConfidence(token?.p);
      const hasSpan = startMs !== undefined && endMs !== undefined;
      const span = hasSpan ? Math.max(0, endMs - startMs) : 0;

      tokenWords.forEach((word, index) => {
        const itemStart = hasSpan && tokenWords.length > 1 ? Math.round(startMs + (span / tokenWords.length) * index) : startMs;
        const itemEnd = hasSpan && tokenWords.length > 1 ? Math.round(startMs + (span / tokenWords.length) * (index + 1)) : endMs;

        timedWords.push({
          word,
          startMs: itemStart,
          endMs: itemEnd,
          confidence
        });
      });
    });
  });

  return timedWords;
}

function transcribeFileWithAlignment(inputPath, options, language = "en") {
  const wavPath = convertToWav(inputPath);
  const outputBase = createTempBase();
  const jsonPath = `${outputBase}.json`;

  try {
    const result = spawnSync(
      options.whisperCli,
      ["-m", options.model, "-f", wavPath, "-l", language || "en", "-oj", "-ojf", "-of", outputBase, "-np"],
      {
        cwd: ROOT,
        encoding: "utf8",
        timeout: 120000
      }
    );

    if (result.status !== 0 || !fs.existsSync(jsonPath)) {
      throw new Error(result.stderr || result.stdout || `whisper-cli alignment exited ${result.status}`);
    }

    const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    const segments = extractWhisperSegments(data);
    const text = segments.map((segment) => segment.text).join(" ").replace(/\s+/g, " ").trim();

    if (!text) {
      throw new Error("whisper-cli alignment returned an empty transcript");
    }

    return {
      text,
      words: extractWhisperTimedWords(data),
      segments
    };
  } finally {
    if (wavPath !== inputPath) {
      removeQuietly(wavPath);
    }

    removeQuietly(jsonPath);
  }
}

function shellQuotePowerShell(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function synthesizeWithSapi(text) {
  const textPath = createTempPath(".txt");
  const wavPath = createTempPath(".wav");
  fs.writeFileSync(textPath, text, "utf8");

  const script = [
    "$ErrorActionPreference = 'Stop'",
    "Add-Type -AssemblyName System.Speech",
    `$text = Get-Content -LiteralPath ${shellQuotePowerShell(textPath)} -Raw`,
    "$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer",
    "$synth.Rate = -2",
    `$synth.SetOutputToWaveFile(${shellQuotePowerShell(wavPath)})`,
    "$synth.Speak($text)",
    "$synth.Dispose()"
  ].join("; ");

  const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
    encoding: "utf8",
    timeout: 30000
  });

  removeQuietly(textPath);

  if (result.status !== 0 || !fs.existsSync(wavPath)) {
    removeQuietly(wavPath);
    throw new Error(result.stderr || result.stdout || `PowerShell SAPI exited ${result.status}`);
  }

  const audio = fs.readFileSync(wavPath);
  removeQuietly(wavPath);
  return audio;
}

async function parseFormData(req) {
  const request = new Request(`http://127.0.0.1${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: req,
    duplex: "half"
  });

  return request.formData();
}

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function sendAudio(res, audio) {
  res.writeHead(200, {
    "Content-Type": "audio/wav",
    "Cache-Control": "no-store"
  });
  res.end(audio);
}

async function saveUploadedFile(formData, fieldName = "file") {
  const file = formData.get(fieldName) || formData.get("audio") || formData.get("file");

  if (!(file instanceof File)) {
    throw new Error(`Missing multipart file field: ${fieldName}`);
  }

  const extension = path.extname(file.name || "") || ".audio";
  const filePath = createTempPath(extension);
  fs.writeFileSync(filePath, Buffer.from(await file.arrayBuffer()));
  return filePath;
}

function createSttHandler(options) {
  return async (req, res) => {
    if (req.method !== "POST" || !req.url.startsWith("/inference")) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    let inputPath;

    try {
      const formData = await parseFormData(req);
      inputPath = await saveUploadedFile(formData, "file");
      const text = transcribeFile(inputPath, options, String(formData.get("language") || "en"));
      sendJson(res, 200, {
        text,
        provider: "whisper.cpp",
        model: path.relative(ROOT, options.model)
      });
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
    } finally {
      if (inputPath) {
        removeQuietly(inputPath);
      }
    }
  };
}

function createTtsHandler() {
  return async (req, res) => {
    if (req.method !== "POST" || !req.url.startsWith("/v1/audio/speech")) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    try {
      const body = await readJsonBody(req);
      const text = String(body.input || body.text || "").trim();

      if (!text) {
        sendJson(res, 400, { error: "Missing input text" });
        return;
      }

      sendAudio(res, synthesizeWithSapi(text));
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  };
}

function scorePronunciation(referenceText, transcript, timedWords = [], segments = []) {
  const referenceWords = wordsFromText(referenceText);
  const spokenWords = timedWords.length > 0 ? timedWords : wordsFromText(transcript);
  const aligned = alignWords(referenceWords, spokenWords);
  const wordScores = aligned.map((item) => ({
    word: item.word,
    score: item.score,
    ...(item.issue ? { issue: item.issue } : {}),
    ...(item.startMs !== undefined ? { start_ms: item.startMs } : {}),
    ...(item.endMs !== undefined ? { end_ms: item.endMs } : {}),
    ...(item.confidence !== undefined ? { confidence: item.confidence } : {})
  }));
  const average = wordScores.length
    ? Math.round(wordScores.reduce((sum, item) => sum + item.score, 0) / wordScores.length)
    : 0;
  const recognized = aligned.filter((item) => item.actual).length;
  const exact = aligned.filter((item) => item.actual === item.word).length;
  const alignmentScore = referenceWords.length ? Math.round((recognized / referenceWords.length) * 100) : 0;
  const fluencyScore = referenceWords.length
    ? Math.max(0, Math.min(100, Math.round(100 - Math.abs(referenceWords.length - spokenWords.length) * 8)))
    : 0;
  const lowWords = aligned.filter((item) => item.score < 80).map((item) => item.word);
  const feedbackZh =
    average >= 88
      ? "本地 whisper.cpp 识别结果和目标句高度一致，继续练自然停顿和语调。"
      : "本地 whisper.cpp 识别到部分词不稳定，优先补足低分词和词尾辅音。";

  return {
    score: Math.round((average + alignmentScore + fluencyScore) / 3),
    pronunciation_score: average,
    fluency_score: fluencyScore,
    alignment_score: Math.round((alignmentScore + (referenceWords.length ? (exact / referenceWords.length) * 100 : 0)) / 2),
    alignment_source: timedWords.length > 0 ? "whisper.cpp-token-timestamps" : "transcript-text-alignment",
    feedback_zh: feedbackZh,
    transcript,
    segments: segments.slice(0, 6),
    words: wordScores.slice(0, 12),
    phoneme_focus: createPhonemeFocus(lowWords)
  };
}

function createPronunciationHandler(options) {
  return async (req, res) => {
    if (req.method !== "POST" || !req.url.startsWith("/score-pronunciation")) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    let inputPath;

    try {
      const formData = await parseFormData(req);
      const referenceText = String(formData.get("reference_text") || formData.get("referenceText") || "").trim();
      const providedTranscript = String(formData.get("transcript") || "").trim();

      if (!referenceText) {
        sendJson(res, 400, { error: "Missing reference_text" });
        return;
      }

      inputPath = await saveUploadedFile(formData, "file");
      let alignment;

      try {
        alignment = transcribeFileWithAlignment(inputPath, options, "en");
      } catch (alignmentError) {
        if (!providedTranscript) {
          throw alignmentError;
        }

        alignment = {
          text: providedTranscript,
          words: [],
          segments: []
        };
      }

      sendJson(res, 200, scorePronunciation(referenceText, alignment.text, alignment.words, alignment.segments));
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
    } finally {
      if (inputPath) {
        removeQuietly(inputPath);
      }
    }
  };
}

function listen(server, port, host) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve(server.address());
    });
  });
}

async function startServers(options) {
  ensureRuntime(options);

  const sttServer = http.createServer(createSttHandler(options));
  const ttsServer = http.createServer(createTtsHandler());
  const pronunciationServer = http.createServer(createPronunciationHandler(options));

  const [stt, tts, pronunciation] = await Promise.all([
    listen(sttServer, options.sttPort, options.host),
    listen(ttsServer, options.ttsPort, options.host),
    listen(pronunciationServer, options.pronunciationPort, options.host)
  ]);

  return {
    sttServer,
    ttsServer,
    pronunciationServer,
    endpoints: {
      stt: `http://${options.host}:${stt.port}/inference`,
      tts: `http://${options.host}:${tts.port}/v1/audio/speech`,
      pronunciation: `http://${options.host}:${pronunciation.port}/score-pronunciation`
    }
  };
}

function closeServer(server) {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

function createFileFromBuffer(buffer, name) {
  return new File([buffer], name, { type: "audio/wav" });
}

async function selfTest(options) {
  options.sttPort = 0;
  options.ttsPort = 0;
  options.pronunciationPort = 0;

  const runtime = await startServers(options);

  try {
    const ttsResponse = await fetch(runtime.endpoints.tts, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "windows-sapi",
        input: "hello world",
        voice: "default",
        response_format: "wav"
      })
    });
    const audio = await ttsResponse.arrayBuffer();
    const sttForm = new FormData();
    sttForm.set("file", createFileFromBuffer(audio, "hello.wav"));
    sttForm.set("language", "en");
    const sttResponse = await fetch(runtime.endpoints.stt, {
      method: "POST",
      body: sttForm
    });
    const sttPayload = await sttResponse.json();
    const pronunciationForm = new FormData();
    pronunciationForm.set("file", createFileFromBuffer(audio, "hello.wav"));
    pronunciationForm.set("reference_text", "hello world");
    const pronunciationResponse = await fetch(runtime.endpoints.pronunciation, {
      method: "POST",
      body: pronunciationForm
    });
    const pronunciationPayload = await pronunciationResponse.json();

    return {
      ok:
        ttsResponse.ok &&
        audio.byteLength > 0 &&
        sttResponse.ok &&
        Boolean(sttPayload.text) &&
        pronunciationResponse.ok &&
        typeof pronunciationPayload.score === "number",
      endpoints: runtime.endpoints,
      checks: {
        tts: ttsResponse.ok && audio.byteLength > 0,
        stt: sttResponse.ok && Boolean(sttPayload.text),
        pronunciation: pronunciationResponse.ok && typeof pronunciationPayload.score === "number"
      },
      transcript: sttPayload.text || "",
      pronunciation: pronunciationPayload
    };
  } finally {
    await Promise.all([
      closeServer(runtime.sttServer),
      closeServer(runtime.ttsServer),
      closeServer(runtime.pronunciationServer)
    ]);
  }
}

async function main() {
  const options = parseArgs();

  if (options.selfTest) {
    const report = await selfTest(options);
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.ok ? 0 : 1;
    return;
  }

  const runtime = await startServers(options);
  const report = {
    ok: true,
    endpoints: runtime.endpoints,
    env: {
      SPEECH_PROVIDER: "local-whisper",
      SPEECH_BASE_URL: `http://${options.host}:${options.sttPort}`,
      SPEECH_ENDPOINT_PATH: "/inference",
      SPEECH_FILE_FIELD: "file",
      SPEECH_RESPONSE_TEXT_PATH: "text",
      TTS_PROVIDER: "local",
      TTS_BASE_URL: `http://${options.host}:${options.ttsPort}/v1`,
      TTS_MODEL: "windows-sapi",
      TTS_ENDPOINT_PATH: "/audio/speech",
      TTS_FORMAT: "wav",
      PRONUNCIATION_PROVIDER: "local",
      PRONUNCIATION_BASE_URL: `http://${options.host}:${options.pronunciationPort}`,
      PRONUNCIATION_ENDPOINT_PATH: "/score-pronunciation",
      PRONUNCIATION_FILE_FIELD: "file",
      PRONUNCIATION_REFERENCE_TEXT_FIELD: "reference_text",
      PRONUNCIATION_TRANSCRIPT_FIELD: "transcript"
    }
  };

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log("Learn English Windows speech runtime");
    console.log("");
    console.log(`STT: ${runtime.endpoints.stt}`);
    console.log(`TTS: ${runtime.endpoints.tts}`);
    console.log(`Pronunciation: ${runtime.endpoints.pronunciation}`);
    console.log("");
    console.log("Use Ctrl+C to stop.");
  }
}

main().catch((error) => {
  if (error?.checks) {
    console.error(JSON.stringify({ ok: false, checks: error.checks }, null, 2));
  } else {
    console.error(error instanceof Error ? error.message : String(error));
  }
  process.exit(1);
});
