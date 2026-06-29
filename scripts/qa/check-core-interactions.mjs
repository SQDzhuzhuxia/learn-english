#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

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

function runStatefulLearningFlowQa() {
  const vitestEntry = path.join(ROOT, "node_modules", "vitest", "vitest.mjs");
  const result = spawnSync(process.execPath, [vitestEntry, "run", "tests/qa/learning-flow.test.ts", "--reporter=dot"], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "pipe"
  });

  return {
    ok: result.status === 0,
    output: `${result.error?.message ?? ""}\n${result.stdout ?? ""}${result.stderr ?? ""}`.trim()
  };
}

function createReport() {
  const study = readText("components/study/material-study-client.tsx");
  const practice = readText("components/practice/practice-client.tsx");
  const review = readText("components/review/review-client.tsx");
  const settings = readText("components/settings/settings-client.tsx");
  const today = readText("app/page.tsx");
  const progress = readText("components/progress/progress-client.tsx");
  const appShell = readText("components/layout/app-shell.tsx");
  const toast = readText("components/ui/toast.tsx");
  const statefulFlow = runStatefulLearningFlowQa();

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
      "no-static-learning-mocks",
      "Learning data",
      !study.includes("aiExplanation") &&
        !today.includes("@/lib/mock-data") &&
        !progress.includes("@/lib/mock-data"),
      "Study, Today, and Progress must not use static mock learning data for live learning decisions.",
      "components/study/material-study-client.tsx"
    ),
    check(
      "practice-generation-bank",
      "Practice",
      includesAll(practice, [
        "handleGeneratePracticeSet",
        "upsertPracticeQuestionsFromSet",
        "handleSubmitPracticeQuestion",
        "userAnswer",
        "我的答案",
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
      "stateful-learning-flow",
      "End-to-end local flow",
      statefulFlow.ok,
      statefulFlow.ok
        ? "Real local flow passed: import material, study progress, review card, generated question, answer attempt, weakness profile."
        : `Real local flow failed:\n${statefulFlow.output}`,
      "tests/qa/learning-flow.test.ts"
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
