#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();

const SECRET_PROFILES = {
  android: {
    label: "Android signing",
    secrets: ["ANDROID_KEYSTORE_BASE64", "ANDROID_KEYSTORE_PASSWORD", "ANDROID_KEY_ALIAS", "ANDROID_KEY_PASSWORD"]
  },
  "android-store": {
    label: "Google Play publishing",
    secrets: ["GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64", "GOOGLE_PLAY_PACKAGE_NAME"]
  },
  ios: {
    label: "iOS signing and App Store Connect",
    secrets: [
      "APPLE_TEAM_ID",
      "APPLE_CERTIFICATE_BASE64",
      "APPLE_CERTIFICATE_PASSWORD",
      "APP_STORE_CONNECT_API_KEY_ID",
      "APP_STORE_CONNECT_API_ISSUER_ID",
      "APP_STORE_CONNECT_API_KEY_BASE64"
    ]
  },
  macos: {
    label: "macOS signing and notarization",
    secrets: [
      "APPLE_TEAM_ID",
      "APPLE_CERTIFICATE_BASE64",
      "APPLE_CERTIFICATE_PASSWORD",
      "APPLE_NOTARIZATION_USERNAME",
      "APPLE_NOTARIZATION_PASSWORD"
    ]
  },
  "tauri-update": {
    label: "Tauri updater signing",
    secrets: ["TAURI_SIGNING_PRIVATE_KEY", "TAURI_SIGNING_PRIVATE_KEY_PASSWORD"]
  },
  windows: {
    label: "Windows code signing",
    secrets: ["WINDOWS_CERTIFICATE_BASE64", "WINDOWS_CERTIFICATE_PASSWORD", "CSC_LINK", "CSC_KEY_PASSWORD"]
  },
  "windows-store": {
    label: "Microsoft Store publishing",
    secrets: [
      "MICROSOFT_STORE_TENANT_ID",
      "MICROSOFT_STORE_CLIENT_ID",
      "MICROSOFT_STORE_CLIENT_SECRET",
      "MICROSOFT_STORE_SELLER_ID",
      "MICROSOFT_STORE_PRODUCT_ID"
    ]
  }
};

function parseArgs() {
  const options = {
    dryRun: false,
    json: false,
    profile: "all",
    repo: "",
    envFile: ""
  };
  const args = process.argv.slice(2);

  args.forEach((arg, index) => {
    const [key, inlineValue] = arg.split("=", 2);
    const nextValue = inlineValue || args[index + 1];

    if (key === "--dry-run") options.dryRun = true;
    if (key === "--json") options.json = true;
    if (key === "--profile" && nextValue) options.profile = nextValue;
    if (key === "--repo" && nextValue) options.repo = nextValue;
    if (key === "--env-file" && nextValue) options.envFile = nextValue;
  });

  return options;
}

function readEnvFile(relativePath) {
  if (!relativePath) return {};

  const filePath = path.resolve(ROOT, relativePath);

  if (!fs.existsSync(filePath)) {
    return {};
  }

  const env = {};
  const text = fs.readFileSync(filePath, "utf8");

  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) return;

    const equalsIndex = trimmed.indexOf("=");

    if (equalsIndex === -1) return;

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  });

  return env;
}

function selectedProfileIds(profileArg) {
  if (profileArg === "all") return Object.keys(SECRET_PROFILES);

  return profileArg
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function selectedSecretNames(profileIds) {
  return [
    ...new Set(
      profileIds.flatMap((profileId) => SECRET_PROFILES[profileId]?.secrets ?? [])
    )
  ];
}

function commandExists(command, args = ["--version"]) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: process.platform === "win32"
  });

  return {
    ok: result.status === 0,
    status: result.status,
    error: result.error?.message ?? "",
    stdout: result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() ?? ""
  };
}

function detectRepo() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;

  const result = spawnSync("git", ["remote", "get-url", "origin"], {
    cwd: ROOT,
    encoding: "utf8"
  });

  const remote = result.stdout.trim();
  const match = remote.match(/github\.com[:/](?<owner>[^/]+)\/(?<repo>[^/]+?)(?:\.git)?$/i);

  if (!match?.groups) return "";

  return `${match.groups.owner}/${match.groups.repo}`;
}

function syncSecret(name, value, repo) {
  const args = ["secret", "set", name];

  if (repo) {
    args.push("--repo", repo);
  }

  const result = spawnSync("gh", args, {
    cwd: ROOT,
    encoding: "utf8",
    input: value,
    shell: process.platform === "win32"
  });

  return {
    name,
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim()
  };
}

function createReport(options) {
  const profileIds = selectedProfileIds(options.profile);
  const unsupported = profileIds.filter((profileId) => !SECRET_PROFILES[profileId]);
  const repo = options.repo || detectRepo();
  const env = {
    ...readEnvFile(options.envFile),
    ...process.env
  };
  const secrets = selectedSecretNames(profileIds);
  const secretStates = secrets.map((name) => ({
    name,
    present: Boolean(env[name])
  }));
  const missing = secretStates.filter((secret) => !secret.present).map((secret) => secret.name);
  const gh = commandExists("gh");

  if (unsupported.length > 0) {
    return {
      ok: false,
      dryRun: options.dryRun,
      profile: options.profile,
      repo,
      unsupported,
      supported: ["all", ...Object.keys(SECRET_PROFILES)],
      profiles: [],
      secrets: [],
      missing,
      gh
    };
  }

  const profiles = profileIds.map((profileId) => ({
    id: profileId,
    label: SECRET_PROFILES[profileId].label,
    secrets: SECRET_PROFILES[profileId].secrets
  }));

  if (options.dryRun || missing.length > 0 || !gh.ok) {
    return {
      ok: missing.length === 0 && (options.dryRun || gh.ok),
      dryRun: options.dryRun,
      profile: options.profile,
      repo,
      profiles,
      secrets: secretStates,
      missing,
      gh,
      synced: []
    };
  }

  const synced = secrets.map((name) => syncSecret(name, env[name], repo));

  return {
    ok: synced.every((item) => item.ok),
    dryRun: false,
    profile: options.profile,
    repo,
    profiles,
    secrets: secretStates,
    missing,
    gh,
    synced
  };
}

function printReport(report) {
  console.log("Learn English GitHub native secret sync");
  console.log("");

  if (report.unsupported?.length) {
    console.log(`FAIL unsupported profile: ${report.unsupported.join(", ")}`);
    console.log(`Supported: ${report.supported.join(", ")}`);
    return;
  }

  console.log(`Mode: ${report.dryRun ? "dry-run" : "sync"}`);
  console.log(`Repo: ${report.repo || "current gh repository"}`);
  console.log(`Profiles: ${report.profiles.map((profile) => profile.id).join(", ")}`);
  console.log(`GitHub CLI: ${report.gh.ok ? "available" : "missing"}`);

  if (report.missing.length > 0) {
    console.log(`Missing: ${report.missing.join(", ")}`);
  }

  const ready = report.missing.length === 0;
  console.log(`Secrets ready: ${ready ? "yes" : "no"}`);

  if (report.dryRun && ready) {
    console.log(`Would sync ${report.secrets.length} GitHub Actions secrets.`);
  }

  report.synced?.forEach((item) => {
    console.log(`${item.ok ? "OK" : "FAIL"} ${item.name}`);
  });
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
