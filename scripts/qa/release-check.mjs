#!/usr/bin/env node

import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function parseArgs() {
  const options = {
    withScreenshots: false,
    baseUrl: "http://127.0.0.1:3000"
  };

  process.argv.slice(2).forEach((arg, index, args) => {
    const [key, inlineValue] = arg.split("=", 2);
    const nextValue = inlineValue || args[index + 1];

    if (key === "--with-screenshots") {
      options.withScreenshots = true;
    }

    if (key === "--base-url" && nextValue) {
      options.baseUrl = nextValue;
    }
  });

  return options;
}

function runStep(step) {
  return new Promise((resolve) => {
    const child = spawn(npmCommand, step.args, {
      stdio: "inherit",
      shell: process.platform === "win32"
    });

    child.on("error", (error) => {
      console.error(error);
      resolve({
        ...step,
        code: 1
      });
    });

    child.on("close", (code) => {
      resolve({
        ...step,
        code: code ?? 1
      });
    });
  });
}

function createSteps(options) {
  const steps = [
    { name: "lint", args: ["run", "lint"] },
    { name: "typecheck", args: ["run", "typecheck"] },
    { name: "test", args: ["run", "test"] },
    { name: "package:check", args: ["run", "package:check"] },
    { name: "package:native:check", args: ["run", "package:native:check", "--", "--json"] },
    { name: "qa:interactions:check", args: ["run", "qa:interactions:check"] },
    { name: "qa:mobile:check", args: ["run", "qa:mobile:check"] },
    { name: "speech:doctor", args: ["run", "speech:doctor"] },
    {
      name: "speech:download dry-run",
      args: ["run", "speech:download", "--", "--dry-run", "--include-optional", "--json"]
    },
    {
      name: "speech:dev-runtime self-test",
      args: ["run", "speech:dev-runtime", "--", "--self-test", "--json"]
    },
    {
      name: "speech:start dry-run",
      args: ["run", "speech:start", "--", "--write", "--json"]
    },
    { name: "npm audit", args: ["audit", "--audit-level=moderate"] },
    { name: "build", args: ["run", "build"] }
  ];

  if (options.withScreenshots) {
    steps.push({
      name: "qa:mobile:screenshots",
      args: ["run", "qa:mobile:screenshots", "--", `--base-url=${options.baseUrl}`]
    });
  }

  return steps;
}

async function main() {
  const options = parseArgs();
  const steps = createSteps(options);
  const results = [];

  console.log(`Learn English release check (${steps.length} steps)`);

  for (const step of steps) {
    console.log(`\n>>> ${step.name}`);
    const result = await runStep(step);
    results.push(result);

    if (result.code !== 0) {
      console.error(`\nRelease check failed at ${step.name} with exit code ${result.code}.`);
      process.exit(result.code);
    }
  }

  console.log("\nRelease check passed:");
  results.forEach((result) => {
    console.log(`- ${result.name}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
