#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, ".native-release", "dev-secrets");

function parseArgs() {
  const options = {
    target: "windows",
    json: false,
    clean: false,
    password: process.env.NATIVE_DEV_CERT_PASSWORD || "learn-english-dev"
  };
  const args = process.argv.slice(2);

  args.forEach((arg, index) => {
    const [key, inlineValue] = arg.split("=", 2);
    const nextValue = inlineValue || args[index + 1];

    if (key === "--target" && nextValue) options.target = nextValue;
    if (key === "--password" && nextValue) options.password = nextValue;
    if (key === "--json") options.json = true;
    if (key === "--clean") options.clean = true;
  });

  return options;
}

function hasCommand(command) {
  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", `Get-Command ${command} -ErrorAction SilentlyContinue`], {
    encoding: "utf8"
  });

  return result.status === 0 && Boolean(result.stdout.trim());
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function createWindowsDevCertificate(options) {
  if (process.platform !== "win32") {
    return {
      ok: false,
      target: "windows",
      reason: "Windows development certificate generation requires Windows PowerShell."
    };
  }

  if (options.clean) {
    fs.rmSync(OUT_DIR, { recursive: true, force: true });
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const pfxPath = path.join(OUT_DIR, "windows-dev-code-signing.pfx");
  const envPath = path.join(OUT_DIR, "windows-dev-signing.env");
  const script = [
    "$ErrorActionPreference = 'Stop'",
    `$password = ConvertTo-SecureString ${shellQuote(options.password)} -AsPlainText -Force`,
    "$cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject 'CN=Learn English Dev Code Signing' -CertStoreLocation 'Cert:\\CurrentUser\\My' -KeyExportPolicy Exportable -KeyUsage DigitalSignature -NotAfter (Get-Date).AddYears(1)",
    `Export-PfxCertificate -Cert $cert -FilePath ${shellQuote(pfxPath)} -Password $password | Out-Null`,
    "Remove-Item -LiteralPath \"Cert:\\CurrentUser\\My\\$($cert.Thumbprint)\" -Force"
  ].join("; ");
  const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
    encoding: "utf8"
  });

  if (result.status !== 0) {
    return {
      ok: false,
      target: "windows",
      reason: result.stderr || result.stdout || `PowerShell exited ${result.status}`
    };
  }

  const pfx = fs.readFileSync(pfxPath);
  const base64 = pfx.toString("base64");
  const envContent = [
    "# Development-only signing material. Do not use for store releases.",
    `WINDOWS_CERTIFICATE_BASE64=${base64}`,
    `WINDOWS_CERTIFICATE_PASSWORD=${options.password}`,
    `CSC_LINK=${pfxPath.replaceAll("\\", "/")}`,
    `CSC_KEY_PASSWORD=${options.password}`,
    ""
  ].join("\n");
  fs.writeFileSync(envPath, envContent, "utf8");

  return {
    ok: true,
    target: "windows",
    outDir: path.relative(ROOT, OUT_DIR),
    files: [
      {
        path: path.relative(ROOT, pfxPath),
        bytes: pfx.byteLength
      },
      {
        path: path.relative(ROOT, envPath),
        bytes: Buffer.byteLength(envContent)
      }
    ],
    env: {
      WINDOWS_CERTIFICATE_BASE64: "<generated>",
      WINDOWS_CERTIFICATE_PASSWORD: "<generated>",
      CSC_LINK: path.relative(ROOT, pfxPath),
      CSC_KEY_PASSWORD: "<generated>"
    }
  };
}

function createAndroidReport() {
  const keytoolReady = hasCommand("keytool");

  if (!keytoolReady) {
    return {
      ok: false,
      target: "android",
      reason: "keytool is not available. Install a JDK, then run keytool to create a real Android keystore."
    };
  }

  return {
    ok: false,
    target: "android",
    reason: "Android dev keystore generation is intentionally not run automatically until a JDK path and alias/password policy are chosen."
  };
}

function createAppleReport() {
  return {
    ok: false,
    target: "apple",
    reason: "Apple signing requires an Apple Developer account, a real certificate, provisioning profile, and App Store Connect key."
  };
}

function createReport(options) {
  if (options.target === "windows") {
    return createWindowsDevCertificate(options);
  }

  if (options.target === "android") {
    return createAndroidReport(options);
  }

  if (options.target === "apple" || options.target === "ios" || options.target === "macos") {
    return createAppleReport(options);
  }

  return {
    ok: false,
    target: options.target,
    reason: "Supported targets: windows, android, apple"
  };
}

function printReport(report) {
  console.log("Learn English native development signing material");
  console.log("");

  if (!report.ok) {
    console.log(`FAIL ${report.target}`);
    console.log(report.reason);
    return;
  }

  console.log(`OK ${report.target}`);
  console.log(`Output: ${report.outDir}`);
  report.files.forEach((file) => {
    console.log(`wrote ${file.path} (${file.bytes} bytes)`);
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
