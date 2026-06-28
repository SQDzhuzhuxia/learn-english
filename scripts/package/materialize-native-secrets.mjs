#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, ".native-release");

const PROFILES = {
  "capacitor:android": {
    label: "Capacitor Android",
    required: ["ANDROID_KEYSTORE_BASE64", "ANDROID_KEYSTORE_PASSWORD", "ANDROID_KEY_ALIAS", "ANDROID_KEY_PASSWORD"],
    files: [
      { env: "ANDROID_KEYSTORE_BASE64", path: "android/release.keystore", binary: true },
      {
        path: "android/signing.properties",
        content: (env) =>
          [
            `storeFile=${path.join(OUT_DIR, "android", "release.keystore").replaceAll("\\", "/")}`,
            `storePassword=${env.ANDROID_KEYSTORE_PASSWORD}`,
            `keyAlias=${env.ANDROID_KEY_ALIAS}`,
            `keyPassword=${env.ANDROID_KEY_PASSWORD}`,
            ""
          ].join("\n")
      }
    ]
  },
  "capacitor:ios": {
    label: "Capacitor iOS",
    required: [
      "APPLE_TEAM_ID",
      "APPLE_CERTIFICATE_BASE64",
      "APPLE_CERTIFICATE_PASSWORD",
      "APP_STORE_CONNECT_API_KEY_ID",
      "APP_STORE_CONNECT_API_ISSUER_ID",
      "APP_STORE_CONNECT_API_KEY_BASE64"
    ],
    files: [
      { env: "APPLE_CERTIFICATE_BASE64", path: "apple/signing-certificate.p12", binary: true },
      { env: "APP_STORE_CONNECT_API_KEY_BASE64", path: (env) => `apple/AuthKey_${env.APP_STORE_CONNECT_API_KEY_ID}.p8` },
      {
        path: "apple/app-store-connect.json",
        content: (env) =>
          JSON.stringify(
            {
              teamId: env.APPLE_TEAM_ID,
              apiKeyId: env.APP_STORE_CONNECT_API_KEY_ID,
              apiIssuerId: env.APP_STORE_CONNECT_API_ISSUER_ID,
              apiKeyPath: path.join(OUT_DIR, "apple", `AuthKey_${env.APP_STORE_CONNECT_API_KEY_ID}.p8`)
            },
            null,
            2
          )
      }
    ]
  },
  "tauri:tauri-update": {
    label: "Tauri updater",
    required: ["TAURI_SIGNING_PRIVATE_KEY", "TAURI_SIGNING_PRIVATE_KEY_PASSWORD"],
    files: [
      {
        path: "tauri/update-signing.env",
        content: (env) =>
          [
            `TAURI_SIGNING_PRIVATE_KEY=${env.TAURI_SIGNING_PRIVATE_KEY}`,
            `TAURI_SIGNING_PRIVATE_KEY_PASSWORD=${env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD}`,
            ""
          ].join("\n")
      }
    ]
  },
  "tauri:macos": {
    label: "Tauri macOS",
    required: [
      "APPLE_TEAM_ID",
      "APPLE_CERTIFICATE_BASE64",
      "APPLE_CERTIFICATE_PASSWORD",
      "APPLE_NOTARIZATION_USERNAME",
      "APPLE_NOTARIZATION_PASSWORD"
    ],
    files: [
      { env: "APPLE_CERTIFICATE_BASE64", path: "apple/signing-certificate.p12", binary: true },
      {
        path: "apple/notarization.env",
        content: (env) =>
          [
            `APPLE_TEAM_ID=${env.APPLE_TEAM_ID}`,
            `APPLE_CERTIFICATE_PASSWORD=${env.APPLE_CERTIFICATE_PASSWORD}`,
            `APPLE_NOTARIZATION_USERNAME=${env.APPLE_NOTARIZATION_USERNAME}`,
            `APPLE_NOTARIZATION_PASSWORD=${env.APPLE_NOTARIZATION_PASSWORD}`,
            ""
          ].join("\n")
      }
    ]
  },
  "tauri:windows": {
    label: "Tauri Windows",
    required: ["WINDOWS_CERTIFICATE_BASE64", "WINDOWS_CERTIFICATE_PASSWORD"],
    files: [
      { env: "WINDOWS_CERTIFICATE_BASE64", path: "windows/code-signing.pfx", binary: true },
      {
        path: "windows/signing.env",
        content: (env) => [`WINDOWS_CERTIFICATE_PASSWORD=${env.WINDOWS_CERTIFICATE_PASSWORD}`, ""].join("\n")
      }
    ]
  },
  "electron:macos": {
    label: "Electron macOS",
    required: ["APPLE_TEAM_ID", "CSC_LINK", "CSC_KEY_PASSWORD", "APPLE_NOTARIZATION_USERNAME", "APPLE_NOTARIZATION_PASSWORD"],
    files: [
      {
        path: "electron/electron-builder.env",
        content: (env) =>
          [
            `APPLE_TEAM_ID=${env.APPLE_TEAM_ID}`,
            `CSC_LINK=${env.CSC_LINK}`,
            `CSC_KEY_PASSWORD=${env.CSC_KEY_PASSWORD}`,
            `APPLE_NOTARIZATION_USERNAME=${env.APPLE_NOTARIZATION_USERNAME}`,
            `APPLE_NOTARIZATION_PASSWORD=${env.APPLE_NOTARIZATION_PASSWORD}`,
            ""
          ].join("\n")
      }
    ]
  },
  "electron:windows": {
    label: "Electron Windows",
    required: ["CSC_LINK", "CSC_KEY_PASSWORD"],
    files: [
      {
        path: "electron/electron-builder.env",
        content: (env) => [`CSC_LINK=${env.CSC_LINK}`, `CSC_KEY_PASSWORD=${env.CSC_KEY_PASSWORD}`, ""].join("\n")
      }
    ]
  }
};

function parseArgs() {
  const options = {
    target: "",
    profile: "",
    json: false,
    dryRun: false,
    clean: false
  };
  const args = process.argv.slice(2);

  args.forEach((arg, index) => {
    const [key, inlineValue] = arg.split("=", 2);
    const nextValue = inlineValue || args[index + 1];

    if (key === "--target" && nextValue) options.target = nextValue;
    if (key === "--profile" && nextValue) options.profile = nextValue;
    if (key === "--json") options.json = true;
    if (key === "--dry-run") options.dryRun = true;
    if (key === "--clean") options.clean = true;
  });

  return options;
}

function decodeBase64(value) {
  return Buffer.from(value, "base64");
}

function resolveOutputPath(file, env) {
  const relativePath = typeof file.path === "function" ? file.path(env) : file.path;
  return path.join(OUT_DIR, relativePath);
}

function missingVars(profile) {
  return profile.required.filter((name) => !process.env[name]);
}

function writeFile(file, env, dryRun) {
  const filePath = resolveOutputPath(file, env);
  const content = file.env ? (file.binary ? decodeBase64(env[file.env]) : env[file.env]) : file.content(env);

  if (!dryRun) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }

  return {
    path: path.relative(ROOT, filePath),
    bytes: Buffer.isBuffer(content) ? content.byteLength : Buffer.byteLength(String(content)),
    written: !dryRun
  };
}

function createReport(options) {
  const key = `${options.target}:${options.profile}`;
  const profile = PROFILES[key];

  if (!profile) {
    return {
      ok: false,
      target: options.target,
      profile: options.profile,
      error: `Unsupported native release profile: ${key}`,
      supported: Object.keys(PROFILES)
    };
  }

  const missing = missingVars(profile);

  if (missing.length > 0) {
    return {
      ok: false,
      target: options.target,
      profile: options.profile,
      label: profile.label,
      missing,
      files: []
    };
  }

  if (options.clean && !options.dryRun) {
    fs.rmSync(OUT_DIR, { recursive: true, force: true });
  }

  const files = profile.files.map((file) => writeFile(file, process.env, options.dryRun));

  return {
    ok: true,
    target: options.target,
    profile: options.profile,
    label: profile.label,
    outDir: path.relative(ROOT, OUT_DIR),
    dryRun: options.dryRun,
    files
  };
}

function printReport(report) {
  console.log("Learn English native secret materialization");
  console.log("");

  if (!report.ok) {
    console.log(`FAIL ${report.target || "-"}:${report.profile || "-"}`);
    if (report.missing?.length) console.log(`Missing: ${report.missing.join(", ")}`);
    if (report.error) console.log(report.error);
    return;
  }

  console.log(`OK ${report.label}`);
  console.log(`Output: ${report.outDir}`);
  report.files.forEach((file) => {
    console.log(`${file.written ? "wrote" : "would-write"} ${file.path} (${file.bytes} bytes)`);
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
