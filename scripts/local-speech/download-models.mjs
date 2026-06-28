#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "scripts/local-speech/models-manifest.json");

function readManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes("--dry-run"),
    json: args.includes("--json"),
    includeOptional: args.includes("--include-optional"),
    service: undefined
  };
  const serviceIndex = args.indexOf("--service");

  if (serviceIndex >= 0 && args[serviceIndex + 1]) {
    options.service = args[serviceIndex + 1];
  }

  return options;
}

function collectModelFiles(manifest, options) {
  return manifest.services
    .filter((service) => !options.service || service.id === options.service)
    .flatMap((service) =>
      service.modelFiles
        .filter((file) => file.required || options.includeOptional)
        .map((file) => ({
          serviceId: service.id,
          serviceLabel: service.label,
          ...file,
          targetPath: path.join(ROOT, manifest.modelsDir, file.relativePath)
        }))
    );
}

async function downloadFile(file) {
  fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });

  try {
    const response = await fetch(file.source);

    if (!response.ok || !response.body) {
      throw new Error(`Failed to download ${file.source}: HTTP ${response.status}`);
    }

    await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(file.targetPath));
    return;
  } catch (error) {
    if (process.platform !== "win32") {
      throw error;
    }

    const ps = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        [
          "$ErrorActionPreference = 'Stop'",
          `$uri = '${file.source.replaceAll("'", "''")}'`,
          `$out = '${file.targetPath.replaceAll("'", "''")}'`,
          "Invoke-WebRequest -UseBasicParsing -Uri $uri -OutFile $out -MaximumRedirection 5"
        ].join("; ")
      ],
      {
        encoding: "utf8"
      }
    );

    if (ps.status !== 0) {
      throw new Error(
        [
          `Failed to download ${file.source}.`,
          `Node fetch error: ${error instanceof Error ? error.message : String(error)}`,
          `PowerShell error: ${ps.stderr || ps.stdout || `exit ${ps.status}`}`
        ].join("\n")
      );
    }
  }
}

async function createReport() {
  const manifest = readManifest();
  const options = parseArgs();
  const files = collectModelFiles(manifest, options);
  const results = [];

  for (const file of files) {
    const exists = fs.existsSync(file.targetPath);

    if (exists || options.dryRun) {
      results.push({
        serviceId: file.serviceId,
        name: file.name,
        path: path.relative(ROOT, file.targetPath),
        source: file.source,
        action: exists ? "exists" : "would-download"
      });
      continue;
    }

    await downloadFile(file);
    results.push({
      serviceId: file.serviceId,
      name: file.name,
      path: path.relative(ROOT, file.targetPath),
      source: file.source,
      action: "downloaded"
    });
  }

  return {
    ok: true,
    dryRun: options.dryRun,
    includeOptional: options.includeOptional,
    service: options.service ?? "all",
    modelCount: results.length,
    results
  };
}

function printReport(report) {
  console.log("Learn English local model download");
  console.log("");
  console.log(`Mode: ${report.dryRun ? "dry run" : "download"}`);
  console.log(`Service: ${report.service}`);
  console.log(`Models: ${report.modelCount}`);
  console.log("");

  if (report.results.length === 0) {
    console.log("No model files selected. Use --include-optional to include optional models.");
    return;
  }

  report.results.forEach((item) => {
    console.log(`${item.action} ${item.path}`);
    console.log(`  ${item.source}`);
  });
}

const options = parseArgs();

createReport()
  .then((report) => {
    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printReport(report);
    }
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
