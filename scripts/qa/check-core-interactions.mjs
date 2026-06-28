#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function check(id, area, ok, detail, file) {
  return {
    id,
    area,
    ok,
    detail,
    file
  };
}

function includesAll(text, patterns) {
  return patterns.every((pattern) => text.includes(pattern));
}

function createReport() {
  const study = readText("components/study/material-study-client.tsx");
  const practice = readText("components/practice/practice-client.tsx");
  const review = readText("components/review/review-client.tsx");
  const settings = readText("components/settings/settings-client.tsx");
  const appShell = readText("components/layout/app-shell.tsx");
  const toast = readText("components/ui/toast.tsx");

  const checks = [
    check(
      "global-toast-feedback",
      "Global",
      includesAll(appShell, ["ToastProvider"]) &&
        includesAll(toast, ["useToastMessage", "ToastProvider", "aria-live"]) &&
        [study, practice, review, settings].every((source) => source.includes("useToastMessage")),
      "Global toast feedback should stay mounted and connected to core page messages.",
      "components/ui/toast.tsx"
    ),
    check(
      "study-material-audio",
      "Study",
      includesAll(study, [
        "handlePlayCurrentMaterialAudioCue",
        "materialAudioRef",
        "getAudioCueForOrder",
        "material.audio",
        "saveSegmentAsReviewCard",
        "handleGenerateAiExplanation"
      ]),
      "Study page should keep material-audio cue playback, sentence saving, and AI explanation actions wired.",
      "components/study/material-study-client.tsx"
    ),
    check(
      "practice-generation-bank",
      "Practice",
      includesAll(practice, [
        "handleGeneratePracticeSet",
        "upsertPracticeQuestionsFromSet",
        "reviewPracticeQuestion",
        "practice-shadowing",
        "practice-retelling",
        "practice-roleplay",
        "practice-writing"
      ]),
      "Practice page should keep AI generation, question-bank save/review, and stable deep-link anchors.",
      "components/practice/practice-client.tsx"
    ),
    check(
      "review-rating-flow",
      "Review",
      includesAll(review, [
        "handleRate",
        "reviewCard(cardId, rating)",
        "reviewRatings.map",
        "handleSuspendCard",
        "handleResetCard",
        "handleSpeakCard"
      ]),
      "Review page should keep rating, suspend, reset, and speak interactions wired.",
      "components/review/review-client.tsx"
    ),
    check(
      "settings-tts-preview",
      "Settings",
      includesAll(settings, [
        "handleTestTtsPreview",
        "localTtsEnvTemplate",
        "speakEnglishText",
        "试听 TTS"
      ]),
      "Settings page should keep TTS env guidance and preview playback wired.",
      "components/settings/settings-client.tsx"
    )
  ];

  return {
    ready: checks.every((item) => item.ok),
    checkedAt: new Date().toISOString(),
    checks
  };
}

function printReport(report) {
  console.log("Learn English core interaction contracts");
  console.log("");

  report.checks.forEach((item) => {
    console.log(`${item.ok ? "OK" : "FAIL"} ${item.area} (${item.file})`);
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
