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

function check(id, area, ok, detail, route) {
  return {
    id,
    area,
    ok,
    route,
    detail
  };
}

function createReport() {
  const practiceClient = readText("components/practice/practice-client.tsx");
  const importForm = readText("components/library/import-material-form.tsx");
  const settingsClient = readText("components/settings/settings-client.tsx");
  const qaDeepDoc = readText("docs/qa/mobile-deep-visual-regression-2026-06-01.md");

  const checks = [
    check(
      "practice-anchors",
      "Practice navigation",
      ["practice-shadowing", "practice-retelling", "practice-roleplay", "practice-writing"].every((id) =>
        practiceClient.includes(`id="${id}"`)
      ),
      "Practice page should keep stable anchors for mobile deep links from Today and generated drills.",
      "/practice"
    ),
    check(
      "practice-ai-inbox-confirm-clear",
      "Practice confirmation",
      practiceClient.includes("confirmClearAiResults") && practiceClient.includes("再次点击确认清空 AI 结果收件箱"),
      "AI result inbox clearing should require a second tap on mobile.",
      "/practice"
    ),
    check(
      "import-form-validation",
      "Import form",
      importForm.includes("setError") && importForm.includes("textarea") && importForm.includes("min-h"),
      "Material import form should keep visible validation and a mobile-sized textarea.",
      "/library/import"
    ),
    check(
      "settings-destructive-confirm",
      "Settings confirmation",
      settingsClient.includes("confirmClearAiResults") && settingsClient.includes("再次点击"),
      "Settings cleanup actions that destroy queued AI results should require confirmation.",
      "/settings"
    ),
    check(
      "settings-file-input",
      "Settings import",
      settingsClient.includes('type="file"') && settingsClient.includes("accept=\"application/json,.json\""),
      "Settings data import should keep a constrained JSON file input.",
      "/settings"
    ),
    check(
      "mobile-deep-qa-doc",
      "Mobile QA docs",
      qaDeepDoc.includes("/practice") && qaDeepDoc.includes("/settings") && qaDeepDoc.includes("390x1600"),
      "Deep mobile regression notes should cover practice, settings, and tall viewport screenshots.",
      "docs/qa/mobile-deep-visual-regression-2026-06-01.md"
    ),
    check(
      "mobile-screenshot-set",
      "Mobile screenshots",
      [
        "docs/qa/screenshots/2026-06-01-mobile-deep/practice-tall.png",
        "docs/qa/screenshots/2026-06-01-mobile-deep/settings-tall.png",
        "docs/qa/screenshots/2026-06-01-mobile-deep/import-form.png"
      ].every(hasFile),
      "Key mobile screenshots for practice, settings, and import form should exist.",
      "docs/qa/screenshots/2026-06-01-mobile-deep"
    ),
    check(
      "mobile-screenshot-script",
      "Mobile screenshot automation",
      hasFile("scripts/qa/mobile-screenshot-regression.mjs"),
      "A real browser screenshot regression script should be available for Playwright-enabled environments.",
      "scripts/qa/mobile-screenshot-regression.mjs"
    )
  ];

  return {
    ready: checks.every((item) => item.ok),
    checkedAt: new Date().toISOString(),
    checks
  };
}

function printReport(report) {
  console.log("Learn English mobile interaction regression");
  console.log("");

  report.checks.forEach((item) => {
    console.log(`${item.ok ? "OK" : "FAIL"} ${item.area} (${item.route})`);
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
