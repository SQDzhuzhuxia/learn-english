# Mobile Visual Regression Record

日期：2026-05-31

## Scope

- Viewport: `390x844`
- Tool: local headless Chrome
- Target: `http://localhost:3000`
- Purpose: record first-screen mobile layout for core PWA routes.

## Screenshots

| Route | Screenshot | Result |
|---|---|---|
| `/` | [home.png](screenshots/2026-05-31-mobile/home.png) | Pass |
| `/library` | [library.png](screenshots/2026-05-31-mobile/library.png) | Pass after button contrast fix |
| `/study` | [study.png](screenshots/2026-05-31-mobile/study.png) | Pass |
| `/review` | [review.png](screenshots/2026-05-31-mobile/review.png) | Pass |
| `/practice` | [practice.png](screenshots/2026-05-31-mobile/practice.png) | Pass |
| `/progress` | [progress.png](screenshots/2026-05-31-mobile/progress.png) | Pass |
| `/settings` | [settings.png](screenshots/2026-05-31-mobile/settings.png) | Pass |

## Findings

- The `/library` primary import button appeared as a black rectangle without visible text in the first screenshot pass.
- Fixed by making the default button foreground explicitly white through the shared Button variant.
- Regenerated all screenshots after the fix.

## Notes

- This record captures first-viewport mobile screenshots only.
- Deeper scroll states, modal states, and form editing states still need future visual coverage.
