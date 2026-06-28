#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();

function parseArgs() {
  const args = new Set(process.argv.slice(2));

  return {
    json: args.has("--json"),
    withRuntime: args.has("--with-runtime"),
    strictStore: args.has("--strict-store")
  };
}

function fileState(relativePath, minBytes = 1) {
  const filePath = path.join(ROOT, relativePath);

  if (!fs.existsSync(filePath)) {
    return {
      path: relativePath,
      exists: false,
      bytes: 0,
      ok: false
    };
  }

  const stat = fs.statSync(filePath);

  return {
    path: relativePath,
    exists: true,
    bytes: stat.size,
    ok: stat.size >= minBytes
  };
}

function readText(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function readEnvFile(relativePath) {
  const env = {};
  const text = readText(relativePath);

  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const equalsIndex = trimmed.indexOf("=");

    if (equalsIndex === -1) {
      return;
    }

    env[trimmed.slice(0, equalsIndex)] = trimmed.slice(equalsIndex + 1);
  });

  return env;
}

function runNode(script, args = [], env = {}) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      ...env
    }
  });

  const stdout = result.stdout.trim();
  let parsed;

  try {
    parsed = stdout ? JSON.parse(stdout) : undefined;
  } catch {
    parsed = undefined;
  }

  return {
    ok: result.status === 0,
    status: result.status,
    stdout,
    stderr: result.stderr.trim(),
    json: parsed
  };
}

function gitStatus() {
  const result = spawnSync("git", ["status", "--short"], {
    cwd: ROOT,
    encoding: "utf8"
  });
  const output = result.stdout.trim();

  return {
    ok: result.status === 0 && output.length === 0,
    clean: output.length === 0,
    output
  };
}

function checkWorkflow() {
  const workflow = readText(".github/workflows/native-release.yml");
  const required = [
    "workflow_dispatch",
    "web_url",
    "package:native:check -- --strict",
    "package:native:materialize",
    "package:native:prepare",
    "ANDROID_KEYSTORE_BASE64",
    "APPLE_CERTIFICATE_BASE64",
    "APP_STORE_CONNECT_API_KEY_BASE64",
    "WINDOWS_CERTIFICATE_BASE64",
    "CSC_LINK"
  ];
  const missing = required.filter((item) => !workflow.includes(item));

  return {
    ok: workflow.length > 0 && missing.length === 0,
    path: ".github/workflows/native-release.yml",
    missing
  };
}

function createNativeSigningReport() {
  const androidEnv = readEnvFile(".native-release/dev-secrets/android-dev-signing.env");
  const windowsEnv = readEnvFile(".native-release/dev-secrets/windows-dev-signing.env");
  const electronWindowsEnv = {
    ...windowsEnv,
    CSC_LINK: windowsEnv.CSC_LINK || windowsEnv.WINDOWS_CERTIFICATE_BASE64,
    CSC_KEY_PASSWORD: windowsEnv.CSC_KEY_PASSWORD || windowsEnv.WINDOWS_CERTIFICATE_PASSWORD
  };
  const checks = {
    androidDev: runNode("scripts/package/verify-native-release-env.mjs", [
      "--strict",
      "--target",
      "capacitor",
      "--profile",
      "android",
      "--json"
    ], androidEnv),
    tauriWindowsDev: runNode("scripts/package/verify-native-release-env.mjs", [
      "--strict",
      "--target",
      "tauri",
      "--profile",
      "windows",
      "--json"
    ], windowsEnv),
    electronWindowsDev: runNode("scripts/package/verify-native-release-env.mjs", [
      "--strict",
      "--target",
      "electron",
      "--profile",
      "windows",
      "--json"
    ], electronWindowsEnv),
    iosStore: runNode("scripts/package/verify-native-release-env.mjs", [
      "--strict",
      "--target",
      "capacitor",
      "--profile",
      "ios",
      "--json"
    ]),
    macosStore: runNode("scripts/package/verify-native-release-env.mjs", [
      "--strict",
      "--target",
      "tauri",
      "--profile",
      "macos",
      "--json"
    ])
  };

  return {
    ok: checks.androidDev.ok && checks.tauriWindowsDev.ok && checks.electronWindowsDev.ok,
    storeReady: checks.iosStore.ok && checks.macosStore.ok,
    checks
  };
}

function createReport(options) {
  const model = fileState("local-models/whisper/ggml-base.en.bin", 100_000_000);
  const whisperCli = fileState(".local-speech/bin/whisper.cpp/Release/whisper-cli.exe", 1);
  const whisperServer = fileState(".local-speech/bin/whisper.cpp/Release/whisper-server.exe", 1);
  const speechReadiness = runNode("scripts/local-speech/check-local-speech.mjs", ["--strict-practice", "--json"]);
  const runtimeSelfTest = options.withRuntime
    ? runNode("scripts/local-speech/windows-runtime-server.mjs", ["--self-test", "--json"])
    : {
        ok: true,
        skipped: true,
        reason: "Pass --with-runtime to run the live Windows speech runtime self-test."
      };
  const materialized = [
    fileState(".native-release/android/release.keystore", 1),
    fileState(".native-release/android/signing.properties", 1),
    fileState(".native-release/windows/code-signing.pfx", 1),
    fileState(".native-release/windows/signing.env", 1),
    fileState(".native-release/electron/electron-builder.env", 1)
  ];
  const devSecrets = [
    fileState(".native-release/dev-secrets/android-dev-release.p12", 1),
    fileState(".native-release/dev-secrets/android-dev-signing.env", 1),
    fileState(".native-release/dev-secrets/windows-dev-code-signing.pfx", 1),
    fileState(".native-release/dev-secrets/windows-dev-signing.env", 1)
  ];
  const nativeSigning = createNativeSigningReport();
  const workflow = checkWorkflow();
  const git = gitStatus();
  const localReady =
    model.ok &&
    whisperCli.ok &&
    whisperServer.ok &&
    speechReadiness.ok &&
    runtimeSelfTest.ok &&
    materialized.every((item) => item.ok) &&
    devSecrets.every((item) => item.ok) &&
    nativeSigning.ok &&
    workflow.ok;

  return {
    ok: options.strictStore ? localReady && nativeSigning.storeReady && git.clean : localReady && git.clean,
    localReady,
    storeReady: nativeSigning.storeReady,
    git,
    speech: {
      model,
      whisperCli,
      whisperServer,
      readiness: speechReadiness.json ?? speechReadiness,
      runtimeSelfTest: runtimeSelfTest.json ?? runtimeSelfTest
    },
    native: {
      devSecrets,
      materialized,
      workflow,
      signing: nativeSigning
    }
  };
}

function printCheck(label, ok, detail = "") {
  console.log(`${ok ? "OK" : "FAIL"} ${label}${detail ? ` - ${detail}` : ""}`);
}

function printReport(report) {
  console.log("Learn English external release audit");
  console.log("");
  printCheck("Git worktree", report.git.clean, report.git.clean ? "clean" : "has uncommitted changes");
  printCheck("Whisper model", report.speech.model.ok, `${report.speech.model.bytes} bytes`);
  printCheck("whisper.cpp CLI", report.speech.whisperCli.ok, report.speech.whisperCli.path);
  printCheck("whisper.cpp server", report.speech.whisperServer.ok, report.speech.whisperServer.path);
  printCheck("Speech strict-practice readiness", Boolean(report.speech.readiness.practiceReady));
  printCheck(
    "Windows runtime self-test",
    report.speech.runtimeSelfTest.skipped ? true : report.speech.runtimeSelfTest.ok,
    report.speech.runtimeSelfTest.skipped ? "skipped" : report.speech.runtimeSelfTest.pronunciation?.alignment_source
  );
  printCheck("Android development signing", report.native.signing.checks.androidDev.ok);
  printCheck("Tauri Windows development signing", report.native.signing.checks.tauriWindowsDev.ok);
  printCheck("Electron Windows development signing", report.native.signing.checks.electronWindowsDev.ok);
  printCheck("Native workflow", report.native.workflow.ok, report.native.workflow.path);
  printCheck("iOS store signing", report.native.signing.checks.iosStore.ok, "requires real Apple credentials");
  printCheck("macOS notarization", report.native.signing.checks.macosStore.ok, "requires real Apple credentials");
  console.log("");
  console.log(`Local ready: ${report.localReady ? "yes" : "no"}`);
  console.log(`Store ready: ${report.storeReady ? "yes" : "no"}`);
}

const options = parseArgs();
const report = createReport(options);

if (options.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printReport(report);
}

if (!report.ok) {
  process.exitCode = 1;
}
