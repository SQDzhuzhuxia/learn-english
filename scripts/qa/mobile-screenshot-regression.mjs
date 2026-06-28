#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DEFAULT_ROUTES = ["/", "/practice", "/progress", "/settings", "/library/import"];

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    url: "http://localhost:3000",
    routes: DEFAULT_ROUTES,
    outDir: `docs/qa/screenshots/${new Date().toISOString().slice(0, 10)}-mobile-auto`
  };

  args.forEach((arg, index) => {
    const [key, inlineValue] = arg.split("=", 2);
    const nextValue = inlineValue || args[index + 1];

    if ((key === "--url" || key === "--base-url") && nextValue) {
      options.url = nextValue.replace(/\/+$/, "");
    }

    if (key === "--routes" && nextValue) {
      options.routes = nextValue.split(",").map((route) => route.trim()).filter(Boolean);
    }

    if (key === "--out" && nextValue) {
      options.outDir = nextValue;
    }
  });

  return options;
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    throw new Error(
      [
        "Playwright is not installed.",
        "Install it only when you need real screenshot regression:",
        "  npm install -D playwright",
        "  npx playwright install chromium"
      ].join("\n")
    );
  }
}

async function launchBrowser(chromium) {
  try {
    return {
      browser: await chromium.launch(),
      engine: "playwright-chromium"
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (!message.includes("Executable doesn't exist")) {
      throw error;
    }

    try {
      return {
        browser: await chromium.launch({ channel: "chrome" }),
        engine: "system-chrome"
      };
    } catch (chromeError) {
      const chromeMessage = chromeError instanceof Error ? chromeError.message : String(chromeError);
      throw new Error(
        [
          "Playwright Chromium is not installed and system Chrome could not be launched.",
          "Install the Playwright browser binary with:",
          "  npx playwright install chromium",
          "",
          "Original Playwright error:",
          message,
          "",
          "System Chrome fallback error:",
          chromeMessage
        ].join("\n")
      );
    }
  }
}

function routeName(route) {
  return route === "/" ? "home" : route.replace(/^\/+/, "").replace(/[^a-z0-9]+/gi, "-");
}

async function inspectOverflow(page) {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;

    return Array.from(document.querySelectorAll("body *"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const tag = element.tagName.toLowerCase();
        const isFormControl = tag === "input" || tag === "textarea" || tag === "select";

        return {
          tag,
          text: (element.textContent || "").trim().slice(0, 80),
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          width: Math.round(rect.width),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          isFormControl
        };
      })
      .filter((item) => {
        const leavesViewport = item.left < -2 || item.right > viewportWidth + 2;
        const contentOverflowsBox = item.clientWidth > 0 && item.scrollWidth > item.clientWidth + 2;

        return leavesViewport || (!item.isFormControl && contentOverflowsBox);
      })
      .slice(0, 10);
  });
}

function writeReport(input) {
  const reportPath = path.join(ROOT, "docs/qa", `mobile-screenshot-regression-${new Date().toISOString().slice(0, 10)}.md`);
  const lines = [
    "# 移动端截图回归记录",
    "",
    `日期：${new Date().toISOString().slice(0, 10)}`,
    "",
    `目标地址：${input.baseUrl}`,
    `浏览器：${input.engine}`,
    `截图目录：${input.outDir}`,
    "",
    "## 结果",
    ""
  ];

  input.results.forEach((result) => {
    lines.push(`- ${result.route}: ${result.ok ? "通过" : "存在问题"}，截图 ${result.files.join("、")}`);

    if (result.overflow.length > 0) {
      lines.push(`  - 横向溢出元素：${result.overflow.length}`);
    }
  });

  lines.push("");

  fs.writeFileSync(reportPath, lines.join("\n"), "utf8");
  return path.relative(ROOT, reportPath);
}

async function main() {
  const options = parseArgs();
  const { chromium } = await loadPlaywright();
  const outDir = path.join(ROOT, options.outDir);
  fs.mkdirSync(outDir, { recursive: true });

  const { browser, engine } = await launchBrowser(chromium);
  const page = await browser.newPage({
    viewport: {
      width: 390,
      height: 844
    },
    deviceScaleFactor: 2,
    isMobile: true
  });
  const results = [];

  for (const route of options.routes) {
    await page.goto(`${options.url}${route}`, { waitUntil: "load" });
    const baseName = routeName(route);
    const topFile = `${baseName}-top.png`;
    const tallFile = `${baseName}-tall.png`;

    await page.screenshot({ path: path.join(outDir, topFile), fullPage: false });
    await page.setViewportSize({ width: 390, height: 1600 });
    await page.screenshot({ path: path.join(outDir, tallFile), fullPage: true });
    const overflow = await inspectOverflow(page);
    await page.setViewportSize({ width: 390, height: 844 });

    results.push({
      route,
      files: [topFile, tallFile],
      overflow,
      ok: overflow.length === 0
    });
  }

  await browser.close();

  const reportPath = writeReport({
    baseUrl: options.url,
    engine,
    outDir: options.outDir,
    results
  });
  const report = {
    ok: results.every((result) => result.ok),
    engine,
    reportPath,
    outDir: options.outDir,
    results
  };

  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
