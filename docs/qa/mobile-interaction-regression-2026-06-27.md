# Mobile Interaction Regression

Date: 2026-06-27

## Scope

This regression pass protects the mobile flows most likely to break during practice-page
and generated-content work:

- `/practice`: stable anchors from Today and generated drills.
- `/practice`: AI result inbox clear confirmation.
- `/practice`: generated practice set and question-bank controls.
- `/library/import`: validation feedback and mobile-sized textarea.
- `/settings`: JSON import constraint and destructive confirmation.
- `/progress`: long-term output weakness profile.

## Static Check

Run:

```bash
npm run qa:interactions:check
npm run qa:mobile:check
npm run qa:mobile:check -- --json
```

`qa:interactions:check` protects the study, practice, review, and settings action
contracts. `qa:mobile:check` checks source-level anchors, confirmation states, form
constraints, existing mobile baseline screenshots, and the presence of the real
screenshot runner.

## Real Browser Screenshot Check

Run a local app server first, then run:

```bash
npm run qa:mobile:screenshots -- --base-url=http://127.0.0.1:3000
```

Optional route override:

```bash
npm run qa:mobile:screenshots -- --base-url=http://127.0.0.1:3000 --routes=/,/practice,/progress,/settings,/library/import
```

The script uses a mobile viewport, writes screenshots under
`docs/qa/screenshots/<date>-mobile-auto`, and writes a Markdown report under `docs/qa/`.
It first tries Playwright Chromium and falls back to system Chrome when the Playwright
browser binary is not installed.

If system Chrome is unavailable in CI, install the Playwright browser binary:

```bash
npx playwright install chromium
```

## Acceptance Criteria

- No horizontal overflow on checked routes.
- Practice anchors remain stable:
  - `practice-shadowing`
  - `practice-retelling`
  - `practice-roleplay`
  - `practice-writing`
- Generated practice and question-bank sections remain usable on a narrow viewport.
- Import/settings destructive or invalid flows keep visible feedback.
