#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const TARGETS = [
  {
    id: "capacitor",
    label: "Capacitor mobile",
    scaffoldFiles: ["scripts/package/templates/capacitor.config.example.json"],
    buildPlan: ["npm run build", "npx cap sync", "npx cap open android or ios"],
    envGroups: [
      {
        id: "android",
        label: "Android signing",
        vars: ["ANDROID_KEYSTORE_BASE64", "ANDROID_KEYSTORE_PASSWORD", "ANDROID_KEY_ALIAS", "ANDROID_KEY_PASSWORD"]
      },
      {
        id: "ios",
        label: "iOS signing and App Store Connect",
        vars: [
          "APPLE_TEAM_ID",
          "APPLE_CERTIFICATE_BASE64",
          "APPLE_CERTIFICATE_PASSWORD",
          "APP_STORE_CONNECT_API_KEY_ID",
          "APP_STORE_CONNECT_API_ISSUER_ID",
          "APP_STORE_CONNECT_API_KEY_BASE64"
        ]
      }
    ]
  },
  {
    id: "tauri",
    label: "Tauri desktop",
    scaffoldFiles: ["scripts/package/templates/tauri.conf.example.json"],
    buildPlan: ["npm run build", "npx tauri build"],
    envGroups: [
      {
        id: "tauri-update",
        label: "Tauri updater signing",
        vars: ["TAURI_SIGNING_PRIVATE_KEY", "TAURI_SIGNING_PRIVATE_KEY_PASSWORD"]
      },
      {
        id: "macos",
        label: "macOS signing and notarization",
        vars: [
          "APPLE_TEAM_ID",
          "APPLE_CERTIFICATE_BASE64",
          "APPLE_CERTIFICATE_PASSWORD",
          "APPLE_NOTARIZATION_USERNAME",
          "APPLE_NOTARIZATION_PASSWORD"
        ]
      },
      {
        id: "windows",
        label: "Windows code signing",
        vars: ["WINDOWS_CERTIFICATE_BASE64", "WINDOWS_CERTIFICATE_PASSWORD"]
      }
    ]
  },
  {
    id: "electron",
    label: "Electron desktop",
    scaffoldFiles: [
      "scripts/package/templates/electron-main.example.cjs",
      "scripts/package/templates/electron-preload.example.cjs"
    ],
    buildPlan: ["npm run build", "electron-builder"],
    envGroups: [
      {
        id: "macos",
        label: "macOS signing and notarization",
        vars: [
          "APPLE_TEAM_ID",
          "CSC_LINK",
          "CSC_KEY_PASSWORD",
          "APPLE_NOTARIZATION_USERNAME",
          "APPLE_NOTARIZATION_PASSWORD"
        ]
      },
      {
        id: "windows",
        label: "Windows code signing",
        vars: ["CSC_LINK", "CSC_KEY_PASSWORD"]
      }
    ]
  }
];

function parseArgs() {
  const options = {
    json: false,
    strict: false,
    target: "all",
    profile: "all"
  };
  const args = process.argv.slice(2);

  args.forEach((arg, index) => {
    const [key, inlineValue] = arg.split("=", 2);
    const nextValue = inlineValue || args[index + 1];

    if (key === "--json") {
      options.json = true;
    }

    if (key === "--strict") {
      options.strict = true;
    }

    if (key === "--target" && nextValue) {
      options.target = nextValue;
    }

    if (key === "--profile" && nextValue) {
      options.profile = nextValue;
    }
  });

  return options;
}

function hasFile(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function envState(name) {
  return {
    name,
    present: Boolean(process.env[name])
  };
}

function matchesSelection(itemId, selectedId) {
  return selectedId === "all" || itemId === selectedId;
}

function createTargetReport(target, options) {
  const scaffold = target.scaffoldFiles.map((file) => ({
    file,
    exists: hasFile(file)
  }));
  const groups = target.envGroups
    .filter((group) => matchesSelection(group.id, options.profile))
    .map((group) => {
      const vars = group.vars.map(envState);
      const missing = vars.filter((item) => !item.present).map((item) => item.name);

      return {
        id: group.id,
        label: group.label,
        vars,
        missing,
        ready: missing.length === 0
      };
    });
  const contractReady = scaffold.every((item) => item.exists) && groups.length > 0;
  const readyForSignedRelease = contractReady && groups.every((group) => group.ready);

  return {
    id: target.id,
    label: target.label,
    scaffold,
    buildPlan: target.buildPlan,
    envGroups: groups,
    contractReady,
    readyForSignedRelease
  };
}

function createReport() {
  const options = parseArgs();
  const selectedTargets = TARGETS.filter((target) => matchesSelection(target.id, options.target));
  const targets = selectedTargets.map((target) => createTargetReport(target, options));
  const contractReady = targets.length > 0 && targets.every((target) => target.contractReady);
  const signedReleaseReady = targets.length > 0 && targets.every((target) => target.readyForSignedRelease);

  return {
    ok: options.strict ? signedReleaseReady : contractReady,
    strict: options.strict,
    target: options.target,
    profile: options.profile,
    contractReady,
    signedReleaseReady,
    targets
  };
}

function printReport(report) {
  console.log("Learn English native release readiness");
  console.log("");
  console.log(`Mode: ${report.strict ? "strict signed release" : "contract check"}`);
  console.log(`Target: ${report.target}`);
  console.log(`Profile: ${report.profile}`);
  console.log("");

  if (report.targets.length === 0) {
    console.log("No matching native target.");
    return;
  }

  report.targets.forEach((target) => {
    console.log(`${target.contractReady ? "OK" : "FAIL"} ${target.label}`);
    console.log(`  Scaffold: ${target.scaffold.filter((item) => item.exists).length}/${target.scaffold.length}`);
    console.log(`  Build plan: ${target.buildPlan.join(" -> ")}`);

    target.envGroups.forEach((group) => {
      const state = group.ready ? "ready" : `missing ${group.missing.length}`;
      console.log(`  ${group.label}: ${state}`);
      if (!group.ready) {
        console.log(`    ${group.missing.join(", ")}`);
      }
    });
  });

  console.log("");
  console.log(`Contract ready: ${report.contractReady ? "yes" : "no"}`);
  console.log(`Signed release ready: ${report.signedReleaseReady ? "yes" : "no"}`);
}

const report = createReport();

if (report.strict && !report.signedReleaseReady) {
  process.exitCode = 1;
}

if (!report.strict && !report.contractReady) {
  process.exitCode = 1;
}

if (report.targets.length === 0) {
  process.exitCode = 1;
}

if (report.strict && report.profile === "all") {
  console.error("Strict mode without --profile requires every signing profile for the selected target.");
}

if (parseArgs().json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printReport(report);
}
