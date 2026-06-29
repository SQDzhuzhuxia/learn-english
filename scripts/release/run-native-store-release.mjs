#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();

function parseArgs() {
  const options = {
    dryRun: false,
    json: false,
    target: "",
    profile: "",
    artifact: "",
    webUrl: "",
    track: process.env.GOOGLE_PLAY_TRACK || "internal",
    commit: false
  };
  const args = process.argv.slice(2);

  args.forEach((arg, index) => {
    const [key, inlineValue] = arg.split("=", 2);
    const nextValue = inlineValue || args[index + 1];

    if (key === "--dry-run") options.dryRun = true;
    if (key === "--json") options.json = true;
    if (key === "--target" && nextValue) options.target = nextValue;
    if (key === "--profile" && nextValue) options.profile = nextValue;
    if (key === "--artifact" && nextValue) options.artifact = nextValue;
    if (key === "--web-url" && nextValue) options.webUrl = nextValue;
    if (key === "--track" && nextValue) options.track = nextValue;
    if (key === "--commit") options.commit = true;
  });

  return options;
}

function resolvePath(relativeOrAbsolutePath) {
  if (!relativeOrAbsolutePath) return "";

  return path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(ROOT, relativeOrAbsolutePath);
}

function fileState(filePath) {
  const absolutePath = resolvePath(filePath);

  if (!absolutePath || !fs.existsSync(absolutePath)) {
    return {
      path: filePath,
      exists: false,
      bytes: 0
    };
  }

  const stat = fs.statSync(absolutePath);

  return {
    path: filePath,
    exists: true,
    bytes: stat.size
  };
}

function envState(name) {
  return {
    name,
    present: Boolean(process.env[name])
  };
}

function commandCandidates(command) {
  const candidates = [command];

  if (command === "fastlane") {
    candidates.unshift(process.env.FASTLANE_CLI_PATH);
    if (process.platform === "win32") candidates.push("C:\\Ruby33-x64\\bin\\fastlane.bat");
  }

  if (command === "msstore") {
    candidates.unshift(process.env.MSSTORE_CLI_PATH);
  }

  return candidates.filter(Boolean);
}

function commandState(command) {
  const attempts = [];

  for (const candidate of commandCandidates(command)) {
    const result = spawnSync(candidate, ["--version"], {
      cwd: ROOT,
      encoding: "utf8",
      shell: process.platform === "win32"
    });
    const state = {
      command: candidate,
      present: result.status === 0,
      status: result.status,
      version: result.stdout?.trim().split(/\r?\n/)[0] ?? "",
      error: result.stderr?.trim() || result.error?.message || ""
    };

    attempts.push(state);

    if (state.present) {
      return {
        ...state,
        attempts
      };
    }
  }

  return {
    ...attempts.at(-1),
    attempts
  };
}

function quote(value) {
  return String(value).includes(" ") ? `"${value}"` : String(value);
}

function runCommand(step) {
  const result = spawnSync(step.command, step.args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: "inherit"
  });

  return {
    ...step,
    ok: result.status === 0,
    status: result.status
  };
}

function copyAppleApiKeyForAltool() {
  const keyId = process.env.APP_STORE_CONNECT_API_KEY_ID;
  const source = resolvePath(`.native-release/apple/AuthKey_${keyId}.p8`);
  const targetDir = path.join(os.homedir(), ".appstoreconnect", "private_keys");
  const target = path.join(targetDir, `AuthKey_${keyId}.p8`);

  fs.mkdirSync(targetDir, { recursive: true });
  fs.copyFileSync(source, target);

  return target;
}

function createAndroidStorePlan(options) {
  const artifact = options.artifact || process.env.ANDROID_AAB_PATH || "";
  const fastlane = commandState("fastlane");

  return {
    key: "capacitor:android-store",
    label: "Google Play AAB upload",
    target: "capacitor",
    profile: "android-store",
    environment: ["GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64", "GOOGLE_PLAY_PACKAGE_NAME"].map(envState),
    files: [fileState(".native-release/android/google-play-service-account.json")],
    artifacts: [{ name: "ANDROID_AAB_PATH", path: artifact, ...fileState(artifact) }],
    tools: [fastlane],
    steps: [
      {
        label: "Upload Android App Bundle to Google Play",
        command: fastlane.command,
        args: [
          "supply",
          "--aab",
          resolvePath(artifact),
          "--json_key",
          resolvePath(".native-release/android/google-play-service-account.json"),
          "--package_name",
          process.env.GOOGLE_PLAY_PACKAGE_NAME || "",
          "--track",
          options.track,
          "--skip_upload_metadata",
          "--skip_upload_images",
          "--skip_upload_screenshots"
        ],
        preview: `fastlane supply --aab ${quote(artifact || "$ANDROID_AAB_PATH")} --track ${options.track}`
      }
    ]
  };
}

function createIosPlan(options) {
  const artifact = options.artifact || process.env.IOS_IPA_PATH || "";

  return {
    key: "capacitor:ios",
    label: "iOS IPA upload to App Store Connect",
    target: "capacitor",
    profile: "ios",
    environment: [
      "APP_STORE_CONNECT_API_KEY_ID",
      "APP_STORE_CONNECT_API_ISSUER_ID",
      "APP_STORE_CONNECT_API_KEY_BASE64"
    ].map(envState),
    files: [
      fileState(".native-release/apple/app-store-connect.json"),
      fileState(`.native-release/apple/AuthKey_${process.env.APP_STORE_CONNECT_API_KEY_ID || "<key-id>"}.p8`)
    ],
    artifacts: [{ name: "IOS_IPA_PATH", path: artifact, ...fileState(artifact) }],
    tools: [commandState("xcrun")],
    beforeRun: copyAppleApiKeyForAltool,
    steps: [
      {
        label: "Upload iOS IPA to App Store Connect",
        command: "xcrun",
        args: [
          "altool",
          "--upload-app",
          "--type",
          "ios",
          "--file",
          resolvePath(artifact),
          "--apiKey",
          process.env.APP_STORE_CONNECT_API_KEY_ID || "",
          "--apiIssuer",
          process.env.APP_STORE_CONNECT_API_ISSUER_ID || ""
        ],
        preview: `xcrun altool --upload-app --type ios --file ${quote(artifact || "$IOS_IPA_PATH")}`
      }
    ]
  };
}

function createMacosPlan(options) {
  const artifact = options.artifact || process.env.MACOS_NOTARIZATION_ARTIFACT_PATH || "";

  return {
    key: `${options.target}:macos`,
    label: "macOS notarization",
    target: options.target,
    profile: "macos",
    environment: [
      "APPLE_TEAM_ID",
      "APPLE_NOTARIZATION_USERNAME",
      "APPLE_NOTARIZATION_PASSWORD"
    ].map(envState),
    files: [fileState(".native-release/apple/notarization.env")],
    artifacts: [{ name: "MACOS_NOTARIZATION_ARTIFACT_PATH", path: artifact, ...fileState(artifact) }],
    tools: [commandState("xcrun")],
    steps: [
      {
        label: "Submit macOS artifact to Apple notarization",
        command: "xcrun",
        args: [
          "notarytool",
          "submit",
          resolvePath(artifact),
          "--apple-id",
          process.env.APPLE_NOTARIZATION_USERNAME || "",
          "--password",
          process.env.APPLE_NOTARIZATION_PASSWORD || "",
          "--team-id",
          process.env.APPLE_TEAM_ID || "",
          "--wait"
        ],
        preview: `xcrun notarytool submit ${quote(artifact || "$MACOS_NOTARIZATION_ARTIFACT_PATH")} --wait`
      }
    ]
  };
}

function createWindowsStorePlan(options) {
  const artifact = options.artifact || process.env.WINDOWS_STORE_PACKAGE_PATH || "";
  const msstore = commandState("msstore");
  const pathOrUrl = process.env.MICROSOFT_STORE_PROJECT_PATH || options.webUrl || ".native-release/wrapper/electron";
  const publishArgs = ["publish", pathOrUrl, "-id", process.env.MICROSOFT_STORE_PRODUCT_ID || ""];

  if (artifact) {
    publishArgs.push("-i", resolvePath(artifact));
  }

  if (!options.commit) {
    publishArgs.push("-nc");
  }

  return {
    key: `${options.target}:windows-store`,
    label: "Microsoft Store publish",
    target: options.target,
    profile: "windows-store",
    environment: [
      "MICROSOFT_STORE_TENANT_ID",
      "MICROSOFT_STORE_CLIENT_ID",
      "MICROSOFT_STORE_CLIENT_SECRET",
      "MICROSOFT_STORE_SELLER_ID",
      "MICROSOFT_STORE_PRODUCT_ID"
    ].map(envState),
    files: [fileState(`.native-release/${options.target === "electron" ? "electron" : "windows"}/microsoft-store.env`)],
    artifacts: [{ name: "WINDOWS_STORE_PACKAGE_PATH", path: artifact, required: false, ...fileState(artifact) }],
    tools: [msstore],
    steps: [
      {
        label: "Configure Microsoft Store Developer CLI",
        command: msstore.command,
        args: [
          "reconfigure",
          "--tenantId",
          process.env.MICROSOFT_STORE_TENANT_ID || "",
          "--sellerId",
          process.env.MICROSOFT_STORE_SELLER_ID || "",
          "--clientId",
          process.env.MICROSOFT_STORE_CLIENT_ID || "",
          "--clientSecret",
          process.env.MICROSOFT_STORE_CLIENT_SECRET || ""
        ],
        preview: "msstore reconfigure --tenantId *** --sellerId *** --clientId *** --clientSecret ***"
      },
      {
        label: options.commit ? "Publish Microsoft Store submission" : "Create Microsoft Store draft submission",
        command: msstore.command,
        args: publishArgs,
        preview: `msstore ${publishArgs.map(quote).join(" ")}`
      }
    ]
  };
}

function createUnsupportedPlan(options) {
  return {
    key: `${options.target}:${options.profile}`,
    label: "No store submission for selected profile",
    target: options.target,
    profile: options.profile,
    environment: [],
    files: [],
    artifacts: [],
    tools: [],
    steps: [],
    unsupported: true,
    reason: "This profile only validates signing/materialization. Select android-store, ios, macos, or windows-store for store submission."
  };
}

function createPlan(options) {
  const key = `${options.target}:${options.profile}`;

  if (key === "capacitor:android-store") return createAndroidStorePlan(options);
  if (key === "capacitor:ios") return createIosPlan(options);
  if ((options.target === "tauri" || options.target === "electron") && options.profile === "macos") {
    return createMacosPlan(options);
  }
  if ((options.target === "tauri" || options.target === "electron") && options.profile === "windows-store") {
    return createWindowsStorePlan(options);
  }

  return createUnsupportedPlan(options);
}

function validatePlan(plan) {
  const missingEnvironment = plan.environment.filter((item) => !item.present).map((item) => item.name);
  const missingFiles = plan.files.filter((item) => !item.exists).map((item) => item.path);
  const missingArtifacts = plan.artifacts
    .filter((item) => item.required !== false)
    .filter((item) => !item.path || !item.exists)
    .map((item) => item.name);
  const missingTools = plan.tools.filter((item) => !item.present).map((item) => item.command);

  return {
    ready: !plan.unsupported && missingEnvironment.length === 0 && missingFiles.length === 0 && missingArtifacts.length === 0 && missingTools.length === 0,
    missingEnvironment,
    missingFiles,
    missingArtifacts,
    missingTools
  };
}

function createReport(options) {
  const plan = createPlan(options);
  const validation = validatePlan(plan);
  const runResults = [];

  if (!options.dryRun && validation.ready) {
    if (plan.beforeRun) {
      plan.beforeRun();
    }

    for (const step of plan.steps) {
      const result = runCommand(step);
      runResults.push(result);

      if (!result.ok) break;
    }
  }

  return {
    ok: options.dryRun ? !plan.unsupported : validation.ready && runResults.every((item) => item.ok),
    dryRun: options.dryRun,
    target: options.target,
    profile: options.profile,
    plan,
    validation,
    runResults
  };
}

function printReport(report) {
  console.log("Learn English native store release");
  console.log("");
  console.log(`Mode: ${report.dryRun ? "dry-run" : "submit"}`);
  console.log(`Target: ${report.target}`);
  console.log(`Profile: ${report.profile}`);
  console.log(`Plan: ${report.plan.label}`);

  if (report.plan.unsupported) {
    console.log(`SKIP ${report.plan.reason}`);
    return;
  }

  report.plan.steps.forEach((step) => {
    console.log(`- ${step.label}: ${step.preview}`);
  });

  if (!report.validation.ready) {
    if (report.validation.missingEnvironment.length) console.log(`Missing env: ${report.validation.missingEnvironment.join(", ")}`);
    if (report.validation.missingFiles.length) console.log(`Missing files: ${report.validation.missingFiles.join(", ")}`);
    if (report.validation.missingArtifacts.length) console.log(`Missing artifacts: ${report.validation.missingArtifacts.join(", ")}`);
    if (report.validation.missingTools.length) console.log(`Missing tools: ${report.validation.missingTools.join(", ")}`);
  }

  console.log(`Ready: ${report.validation.ready ? "yes" : "no"}`);
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
