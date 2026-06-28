#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENV_FILES = [".env", ".env.local"];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        return env;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        return env;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^["']|["']$/g, "");

      if (key) {
        env[key] = value;
      }

      return env;
    }, {});
}

function loadProjectEnv() {
  return ENV_FILES.reduce(
    (env, fileName) => ({
      ...env,
      ...parseEnvFile(path.join(ROOT, fileName))
    }),
    { ...process.env }
  );
}

function readEnv(env, key) {
  const value = env[key]?.trim();
  return value || undefined;
}

function statusLabel(status) {
  if (status === "local") {
    return "LOCAL_READY";
  }

  if (status === "cloud") {
    return "CLOUD_ONLY";
  }

  return "NOT_CONFIGURED";
}

function checkStt(env) {
  const provider = readEnv(env, "SPEECH_PROVIDER") ?? "fallback";
  const baseUrl = readEnv(env, "SPEECH_BASE_URL");
  const model = readEnv(env, "SPEECH_MODEL");
  const endpointPath = readEnv(env, "SPEECH_ENDPOINT_PATH") ?? "/inference";
  const localMultipartProviders = new Set(["local-whisper", "whisper-cpp"]);

  if (localMultipartProviders.has(provider)) {
    return {
      name: "Speech-to-text",
      status: baseUrl ? "local" : "fallback",
      provider,
      detail: baseUrl
        ? `Local multipart endpoint: ${baseUrl}${endpointPath}`
        : "Missing SPEECH_BASE_URL for local Whisper/whisper.cpp.",
      missing: baseUrl ? [] : ["SPEECH_BASE_URL"]
    };
  }

  if (provider === "local") {
    const missing = [
      ["SPEECH_BASE_URL", baseUrl],
      ["SPEECH_MODEL", model]
    ]
      .filter(([, value]) => !value)
      .map(([key]) => key);

    return {
      name: "Speech-to-text",
      status: missing.length === 0 ? "local" : "fallback",
      provider,
      detail:
        missing.length === 0
          ? `Local OpenAI-compatible STT endpoint: ${baseUrl}`
          : `Missing ${missing.join(", ")} for local STT.`,
      missing
    };
  }

  if (provider === "openai" || provider === "openai-compatible") {
    return {
      name: "Speech-to-text",
      status: "cloud",
      provider,
      detail: "Cloud STT is configured or can be configured, but this is not offline.",
      missing: []
    };
  }

  return {
    name: "Speech-to-text",
    status: "fallback",
    provider,
    detail: "STT is not configured. The app will use browser transcription when available.",
    missing: ["SPEECH_PROVIDER", "SPEECH_BASE_URL"]
  };
}

function checkTts(env) {
  const provider = readEnv(env, "TTS_PROVIDER") ?? "fallback";
  const baseUrl = readEnv(env, "TTS_BASE_URL");
  const model = readEnv(env, "TTS_MODEL");
  const endpointPath = readEnv(env, "TTS_ENDPOINT_PATH") ?? "/audio/speech";

  if (provider === "local") {
    const missing = [
      ["TTS_BASE_URL", baseUrl],
      ["TTS_MODEL", model]
    ]
      .filter(([, value]) => !value)
      .map(([key]) => key);

    return {
      name: "Text-to-speech",
      status: missing.length === 0 ? "local" : "fallback",
      provider,
      detail:
        missing.length === 0
          ? `Local OpenAI-compatible TTS endpoint: ${baseUrl}${endpointPath}`
          : `Missing ${missing.join(", ")} for local TTS.`,
      missing
    };
  }

  if (provider === "openai" || provider === "openai-compatible") {
    return {
      name: "Text-to-speech",
      status: "cloud",
      provider,
      detail: "Cloud TTS is configured or can be configured, but this is not offline.",
      missing: []
    };
  }

  return {
    name: "Text-to-speech",
    status: "fallback",
    provider,
    detail: "TTS is not configured. The app will use browser speech synthesis.",
    missing: ["TTS_PROVIDER", "TTS_BASE_URL", "TTS_MODEL"]
  };
}

function checkPronunciation(env) {
  const provider = readEnv(env, "PRONUNCIATION_PROVIDER") ?? "fallback";
  const baseUrl = readEnv(env, "PRONUNCIATION_BASE_URL");
  const endpointPath = readEnv(env, "PRONUNCIATION_ENDPOINT_PATH") ?? "/score-pronunciation";

  if (provider === "local") {
    return {
      name: "Pronunciation scoring",
      status: baseUrl ? "local" : "fallback",
      provider,
      detail: baseUrl
        ? `Local multipart pronunciation endpoint: ${baseUrl}${endpointPath}`
        : "Missing PRONUNCIATION_BASE_URL for local pronunciation scoring.",
      missing: baseUrl ? [] : ["PRONUNCIATION_BASE_URL"]
    };
  }

  return {
    name: "Pronunciation scoring",
    status: "fallback",
    provider,
    detail: "Pronunciation scoring is not configured. The app will keep text-level shadowing feedback.",
    missing: ["PRONUNCIATION_PROVIDER", "PRONUNCIATION_BASE_URL"]
  };
}

function createReport(env) {
  const stt = checkStt(env);
  const tts = checkTts(env);
  const pronunciation = checkPronunciation(env);

  return {
    offlineReady: stt.status === "local" && tts.status === "local",
    practiceReady: stt.status === "local" && tts.status === "local" && pronunciation.status === "local",
    stt,
    tts,
    pronunciation,
    nextSteps: [
      ...(stt.status === "local"
        ? []
        : ["Configure SPEECH_PROVIDER=local-whisper or whisper-cpp and set SPEECH_BASE_URL."]),
      ...(tts.status === "local" ? [] : ["Configure TTS_PROVIDER=local with TTS_BASE_URL and TTS_MODEL."]),
      ...(pronunciation.status === "local"
        ? []
        : ["Configure PRONUNCIATION_PROVIDER=local with PRONUNCIATION_BASE_URL for audio-level scoring."])
    ]
  };
}

function printReport(report) {
  console.log("Learn English local speech check");
  console.log("");

  [report.stt, report.tts, report.pronunciation].forEach((item) => {
    console.log(`${item.name}: ${statusLabel(item.status)} (${item.provider})`);
    console.log(`  ${item.detail}`);

    if (item.missing.length > 0) {
      console.log(`  Missing: ${item.missing.join(", ")}`);
    }
  });

  console.log("");
  console.log(`Offline ready: ${report.offlineReady ? "yes" : "no"}`);
  console.log(`Full practice ready: ${report.practiceReady ? "yes" : "no"}`);

  if (report.nextSteps.length > 0) {
    console.log("Next steps:");
    report.nextSteps.forEach((step) => console.log(`  - ${step}`));
  }
}

const args = new Set(process.argv.slice(2));
const report = createReport(loadProjectEnv());

if (args.has("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printReport(report);
}

if (args.has("--strict") && !report.offlineReady) {
  process.exitCode = 1;
}

if (args.has("--strict-practice") && !report.practiceReady) {
  process.exitCode = 1;
}
