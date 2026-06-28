#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, ".native-release", "wrapper");

function parseArgs() {
  const options = {
    target: "all",
    profile: "development",
    webUrl: process.env.NATIVE_WEB_URL || "",
    json: false,
    clean: false
  };
  const args = process.argv.slice(2);

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const equalsIndex = arg.indexOf("=");
    const key = equalsIndex === -1 ? arg : arg.slice(0, equalsIndex);
    const inlineValue = equalsIndex === -1 ? "" : arg.slice(equalsIndex + 1);
    const nextValue = inlineValue || args[index + 1] || "";

    if (key === "--target" && nextValue && !nextValue.startsWith("--")) {
      options.target = nextValue;
      if (!inlineValue) index += 1;
    } else if (key === "--profile" && nextValue && !nextValue.startsWith("--")) {
      options.profile = nextValue;
      if (!inlineValue) index += 1;
    } else if (key === "--web-url" && nextValue && !nextValue.startsWith("--")) {
      options.webUrl = nextValue;
      if (!inlineValue) index += 1;
    } else if (key === "--json") {
      options.json = true;
    } else if (key === "--clean") {
      options.clean = true;
    }
  }

  return options;
}

function assertWebUrl(value) {
  try {
    const url = new URL(value);

    if (!["https:", "http:"].includes(url.protocol)) {
      throw new Error("unsupported protocol");
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    throw new Error("A valid --web-url is required because this Next.js app uses server API routes.");
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(relativePath, data) {
  const filePath = path.join(OUT_DIR, relativePath);
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return filePath;
}

function writeText(relativePath, content) {
  const filePath = path.join(OUT_DIR, relativePath);
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

function relative(filePath) {
  return path.relative(ROOT, filePath);
}

function createRedirectHtml(webUrl) {
  const escaped = webUrl.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll("\"", "&quot;");

  return [
    "<!doctype html>",
    '<html lang="en">',
    "  <head>",
    '    <meta charset="utf-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `    <meta http-equiv="refresh" content="0; url=${escaped}" />`,
    "    <title>Learn English</title>",
    "  </head>",
    "  <body>",
    `    <p>Opening <a href="${escaped}">Learn English</a>.</p>`,
    "    <script>",
    `      window.location.replace(${JSON.stringify(webUrl)});`,
    "    </script>",
    "  </body>",
    "</html>",
    ""
  ].join("\n");
}

function createCapacitor(webUrl) {
  return [
    writeJson("capacitor/capacitor.config.json", {
      appId: "com.learnenglish.app",
      appName: "Learn English",
      webDir: "dist",
      server: {
        url: webUrl,
        cleartext: webUrl.startsWith("http://")
      },
      plugins: {
        SplashScreen: {
          launchShowDuration: 800,
          backgroundColor: "#ffffff"
        }
      }
    }),
    writeText("capacitor/dist/index.html", createRedirectHtml(webUrl))
  ];
}

function createTauri(webUrl) {
  return [
    writeJson("tauri/src-tauri/tauri.conf.json", {
      $schema: "https://schema.tauri.app/config/2",
      productName: "Learn English",
      version: "0.1.0",
      identifier: "com.learnenglish.app",
      build: {
        frontendDist: "../dist",
        devUrl: webUrl,
        beforeDevCommand: "",
        beforeBuildCommand: ""
      },
      app: {
        windows: [
          {
            title: "Learn English",
            width: 1200,
            height: 800,
            minWidth: 390,
            minHeight: 700
          }
        ],
        security: {
          csp: null
        }
      }
    }),
    writeText("tauri/dist/index.html", createRedirectHtml(webUrl))
  ];
}

function createElectron(webUrl) {
  return [
    writeText(
      "electron/main.cjs",
      [
        "/* eslint-disable @typescript-eslint/no-require-imports */",
        "",
        "const { app, BrowserWindow } = require('electron');",
        "const path = require('node:path');",
        "",
        `const DEFAULT_WEB_URL = ${JSON.stringify(webUrl)};`,
        "",
        "function createWindow() {",
        "  const win = new BrowserWindow({",
        "    width: 1200,",
        "    height: 800,",
        "    minWidth: 390,",
        "    minHeight: 700,",
        "    webPreferences: {",
        "      preload: path.join(__dirname, 'preload.cjs'),",
        "      contextIsolation: true,",
        "      nodeIntegration: false",
        "    }",
        "  });",
        "",
        "  win.loadURL(process.env.ELECTRON_START_URL || DEFAULT_WEB_URL);",
        "}",
        "",
        "app.whenReady().then(createWindow);",
        "",
        "app.on('window-all-closed', () => {",
        "  if (process.platform !== 'darwin') app.quit();",
        "});",
        ""
      ].join("\n")
    ),
    writeText(
      "electron/preload.cjs",
      [
        "/* eslint-disable @typescript-eslint/no-require-imports */",
        "",
        "const { contextBridge } = require('electron');",
        "",
        "contextBridge.exposeInMainWorld('learnEnglishShell', {",
        "  platform: process.platform",
        "});",
        ""
      ].join("\n")
    )
  ];
}

function createPlan(targets, profile, webUrl, files) {
  const commands = {
    capacitor: [
      "npm run build",
      "npm run package:native:check -- --strict --target capacitor --profile android|ios",
      "npm run package:native:materialize -- --target capacitor --profile android|ios",
      "Use .native-release/wrapper/capacitor as the Capacitor project input."
    ],
    tauri: [
      "npm run build",
      "npm run package:native:check -- --strict --target tauri --profile macos|windows|tauri-update",
      "npm run package:native:materialize -- --target tauri --profile macos|windows|tauri-update",
      "Use .native-release/wrapper/tauri as the Tauri project input."
    ],
    electron: [
      "npm run build",
      "npm run package:native:check -- --strict --target electron --profile macos|windows",
      "npm run package:native:materialize -- --target electron --profile macos|windows",
      "Use .native-release/wrapper/electron as the Electron shell input."
    ]
  };
  const lines = [
    "# Native Wrapper Release Plan",
    "",
    `Web URL: ${webUrl}`,
    `Profile: ${profile}`,
    "",
    "This app uses Next.js server API routes, so native packages wrap the deployed Web/PWA URL instead of a static `out/` export.",
    "",
    "## Targets",
    ""
  ];

  targets.forEach((target) => {
    lines.push(`### ${target}`);
    lines.push("");
    commands[target].forEach((command) => lines.push(`- ${command}`));
    lines.push("");
  });

  lines.push("## Generated Files");
  lines.push("");
  files.forEach((file) => lines.push(`- ${relative(file)}`));
  lines.push("");

  return writeText("RELEASE_PLAN.md", lines.join("\n"));
}

function createReport() {
  const options = parseArgs();
  const webUrl = assertWebUrl(options.webUrl);
  const allTargets = ["capacitor", "tauri", "electron"];
  const targets = options.target === "all" ? allTargets : [options.target];
  const unknown = targets.filter((target) => !allTargets.includes(target));

  if (unknown.length > 0) {
    throw new Error(`Unsupported native wrapper target: ${unknown.join(", ")}`);
  }

  if (options.clean) {
    fs.rmSync(OUT_DIR, { recursive: true, force: true });
  }

  const files = [];

  targets.forEach((target) => {
    if (target === "capacitor") files.push(...createCapacitor(webUrl));
    if (target === "tauri") files.push(...createTauri(webUrl));
    if (target === "electron") files.push(...createElectron(webUrl));
  });

  files.push(createPlan(targets, options.profile, webUrl, files));

  return {
    ok: true,
    target: options.target,
    profile: options.profile,
    webUrl,
    outDir: relative(OUT_DIR),
    files: files.map((file) => ({
      path: relative(file),
      bytes: fs.statSync(file).size
    }))
  };
}

function printReport(report) {
  console.log("Learn English native wrapper preparation");
  console.log("");
  console.log(`Target: ${report.target}`);
  console.log(`Web URL: ${report.webUrl}`);
  console.log(`Output: ${report.outDir}`);
  report.files.forEach((file) => console.log(`wrote ${file.path} (${file.bytes} bytes)`));
}

try {
  const options = parseArgs();
  const report = createReport();

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report);
  }
} catch (error) {
  const options = parseArgs();

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        },
        null,
        2
      )
    );
  } else {
    console.error(error instanceof Error ? error.message : String(error));
  }

  process.exit(1);
}
