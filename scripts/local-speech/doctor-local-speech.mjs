#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "scripts/local-speech/models-manifest.json");

function hasFile(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function check(id, ok, detail) {
  return { id, ok, detail };
}

function createReport() {
  const manifestExists = fs.existsSync(MANIFEST_PATH);
  const manifest = manifestExists ? JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) : undefined;
  const readiness = spawnSync("node", ["scripts/local-speech/check-local-speech.mjs", "--json"], {
    cwd: ROOT,
    encoding: "utf8"
  });
  let readinessPayload = {};

  try {
    readinessPayload = readiness.stdout ? JSON.parse(readiness.stdout) : {};
  } catch {
    readinessPayload = {};
  }

  const checks = [
    check("manifest", manifestExists, "scripts/local-speech/models-manifest.json must exist."),
    check(
      "manifest-services",
      Array.isArray(manifest?.services) && manifest.services.length >= 3,
      "Manifest should describe STT, TTS, and pronunciation services."
    ),
    check(
      "bootstrap-script",
      hasFile("scripts/local-speech/bootstrap-local-speech.mjs"),
      "Bootstrap script should be available."
    ),
    check(
      "download-script",
      hasFile("scripts/local-speech/download-models.mjs"),
      "Model download script should be available."
    ),
    check(
      "dev-runtime-script",
      hasFile("scripts/local-speech/dev-runtime-server.mjs"),
      "Development runtime contract server should be available."
    ),
    check(
      "windows-runtime-script",
      hasFile("scripts/local-speech/windows-runtime-server.mjs"),
      "Windows runtime should expose real local STT, TTS, and pronunciation endpoints when local binaries are installed."
    ),
    check(
      "start-script",
      hasFile("scripts/local-speech/start-local-speech.mjs"),
      "Local speech startup script should be available."
    ),
    check(
      "runtime-hints",
      Array.isArray(manifest?.services) && manifest.services.every((service) => service.runtime),
      "Every service should include runtime startup hints."
    ),
    check(
      "readiness-script",
      readiness.status === 0 && typeof readinessPayload === "object",
      "speech:check JSON output should be readable."
    ),
    check(
      "practice-readiness-field",
      Object.prototype.hasOwnProperty.call(readinessPayload, "practiceReady"),
      "Readiness output should expose practiceReady."
    )
  ];

  return {
    ok: checks.every((item) => item.ok),
    checks,
    readiness: readinessPayload
  };
}

function printReport(report) {
  console.log("Learn English local speech doctor");
  console.log("");
  report.checks.forEach((item) => {
    console.log(`${item.ok ? "OK" : "FAIL"} ${item.id}`);
    console.log(`  ${item.detail}`);
  });
  console.log("");
  console.log(`Ready: ${report.ok ? "yes" : "no"}`);
}

const args = new Set(process.argv.slice(2));
const report = createReport();

if (args.has("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printReport(report);
}

if (!report.ok) {
  process.exitCode = 1;
}
