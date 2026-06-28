#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function readText(relativePath) {
  const filePath = path.join(ROOT, relativePath);

  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function hasFile(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function check(id, label, ok, detail) {
  return {
    id,
    label,
    ok,
    detail
  };
}

function createReport() {
  const packageJson = JSON.parse(readText("package.json") || "{}");
  const manifest = readText("app/manifest.ts");
  const serviceWorker = readText("public/sw.js");
  const envExample = readText(".env.example");
  const deploymentGuide = readText("docs/deployment-guide.md");
  const ciWorkflow = readText(".github/workflows/ci.yml");
  const nativeReleaseWorkflow = readText(".github/workflows/native-release.yml");

  const checks = [
    check(
      "pwa-manifest",
      "PWA manifest",
      manifest.includes('display: "standalone"') && manifest.includes('start_url: "/"'),
      "app/manifest.ts should define standalone display and root start_url."
    ),
    check(
      "service-worker",
      "Service worker",
      hasFile("public/sw.js") && serviceWorker.includes("networkFirst") && serviceWorker.includes("cacheFirst"),
      "public/sw.js should provide basic navigate and asset caching strategies."
    ),
    check(
      "pwa-icon",
      "PWA icon",
      hasFile("public/pwa-icon.svg") && manifest.includes("/pwa-icon.svg"),
      "public/pwa-icon.svg should be referenced by the manifest."
    ),
    check(
      "production-scripts",
      "Production scripts",
      packageJson.scripts?.build === "next build" && packageJson.scripts?.start === "next start",
      "package.json should expose Next.js build and start scripts."
    ),
    check(
      "server-env-template",
      "Server env template",
      ["AI_PROVIDER", "SPEECH_PROVIDER", "TTS_PROVIDER", "PRONUNCIATION_PROVIDER"].every((key) =>
        envExample.includes(key)
      ),
      ".env.example should cover AI, STT, TTS, and pronunciation server-side settings."
    ),
    check(
      "sync-env-template",
      "Sync env template",
      ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"].every((key) =>
        envExample.includes(key)
      ),
      ".env.example should cover Supabase sync settings."
    ),
    check(
      "deployment-guide",
      "Deployment guide",
      deploymentGuide.includes("Vercel") && deploymentGuide.includes("Environment Variables"),
      "docs/deployment-guide.md should explain hosting and environment variables."
    ),
    check(
      "native-package-templates",
      "Native package templates",
      [
        "scripts/package/templates/capacitor.config.example.json",
        "scripts/package/templates/tauri.conf.example.json",
        "scripts/package/templates/electron-main.example.cjs",
        "scripts/package/templates/electron-preload.example.cjs"
      ].every(hasFile),
      "Capacitor, Tauri, and Electron scaffold templates should exist."
    ),
    check(
      "native-package-scaffold",
      "Native package scaffold",
      packageJson.scripts?.["package:scaffold"] === "node scripts/package/scaffold-native-package.mjs" &&
        hasFile("scripts/package/scaffold-native-package.mjs"),
      "package:scaffold should generate native shell starter files outside source control."
    ),
    check(
      "native-release-env-check",
      "Native release env check",
      packageJson.scripts?.["package:native:check"] === "node scripts/package/verify-native-release-env.mjs" &&
        hasFile("scripts/package/verify-native-release-env.mjs"),
      "package:native:check should verify native signing and release environment contracts."
    ),
    check(
      "native-secret-materializer",
      "Native secret materializer",
      packageJson.scripts?.["package:native:materialize"] ===
        "node scripts/package/materialize-native-secrets.mjs" &&
        hasFile("scripts/package/materialize-native-secrets.mjs"),
      "package:native:materialize should write signing secrets to ignored CI-local files for native build tools."
    ),
    check(
      "native-dev-secret-helper",
      "Native development secret helper",
      packageJson.scripts?.["package:native:dev-secrets"] ===
        "node scripts/package/create-dev-native-secrets.mjs" &&
        hasFile("scripts/package/create-dev-native-secrets.mjs"),
      "package:native:dev-secrets should generate local development signing material where the platform allows it."
    ),
    check(
      "native-release-env-template",
      "Native release env template",
      [
        "ANDROID_KEYSTORE_BASE64",
        "APPLE_CERTIFICATE_BASE64",
        "TAURI_SIGNING_PRIVATE_KEY",
        "WINDOWS_CERTIFICATE_BASE64",
        "CSC_LINK"
      ].every((key) => envExample.includes(key)),
      ".env.example should document native mobile and desktop signing variables."
    ),
    check(
      "release-check-script",
      "Release check script",
      packageJson.scripts?.["release:check"] === "node scripts/qa/release-check.mjs" &&
        hasFile("scripts/qa/release-check.mjs"),
      "release:check should run the local pre-release quality gate."
    ),
    check(
      "native-release-workflow",
      "Native release workflow",
      hasFile(".github/workflows/native-release.yml") &&
        nativeReleaseWorkflow.includes("workflow_dispatch") &&
        nativeReleaseWorkflow.includes("package:native:check -- --strict") &&
        nativeReleaseWorkflow.includes("package:native:materialize") &&
        nativeReleaseWorkflow.includes("ANDROID_KEYSTORE_BASE64") &&
        nativeReleaseWorkflow.includes("APPLE_CERTIFICATE_BASE64") &&
        nativeReleaseWorkflow.includes("WINDOWS_CERTIFICATE_BASE64"),
      "Native release workflow should expose strict signed-release profiles backed by GitHub Secrets."
    ),
    check(
      "expanded-ci-gates",
      "Expanded CI gates",
      [
        "npm run package:check",
        "npm run qa:interactions:check",
        "npm run qa:mobile:check",
        "npm run package:native:check",
        "npm run speech:doctor",
        "npm run speech:dev-runtime",
        "npm run speech:windows-runtime",
        "npm run qa:mobile:screenshots"
      ].every((command) => ciWorkflow.includes(command)),
      "CI should run package, interaction, mobile, speech, and screenshot gates."
    )
  ];

  return {
    ready: checks.every((item) => item.ok),
    checks
  };
}

function printReport(report) {
  console.log("Learn English package readiness");
  console.log("");

  report.checks.forEach((item) => {
    console.log(`${item.ok ? "OK" : "FAIL"} ${item.label}`);
    console.log(`  ${item.detail}`);
  });

  console.log("");
  console.log(`Ready: ${report.ready ? "yes" : "no"}`);
}

const args = new Set(process.argv.slice(2));
const report = createReport();

if (args.has("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printReport(report);
}

if (!report.ready) {
  process.exitCode = 1;
}
