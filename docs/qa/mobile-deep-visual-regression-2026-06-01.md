# Mobile Deep Visual Regression Record

日期：2026-06-01

## Scope

- Viewports: `390x844` and `390x1600`
- Tool: local headless Chrome
- Target: `http://localhost:3000`
- Purpose: extend mobile visual coverage from first-screen checks to deeper, longer learning states.

## Screenshots

| Route / State | Screenshot | Result |
|---|---|---|
| `/practice` top | [practice-top.png](screenshots/2026-06-01-mobile-deep/practice-top.png) | Pass after mobile overflow guard |
| `/practice` tall | [practice-tall.png](screenshots/2026-06-01-mobile-deep/practice-tall.png) | Pass |
| `/library/import` form | [import-form.png](screenshots/2026-06-01-mobile-deep/import-form.png) | Pass |
| `/notebook` list | [notebook-top.png](screenshots/2026-06-01-mobile-deep/notebook-top.png) | Pass |
| `/review` tall | [review-tall.png](screenshots/2026-06-01-mobile-deep/review-tall.png) | Pass |
| `/study` tall | [study-tall.png](screenshots/2026-06-01-mobile-deep/study-tall.png) | Pass |
| `/progress` tall | [progress-tall.png](screenshots/2026-06-01-mobile-deep/progress-tall.png) | Pass |
| `/settings` tall | [settings-tall.png](screenshots/2026-06-01-mobile-deep/settings-tall.png) | Pass |

## Findings

- The `/practice` shadowing card needed stronger mobile overflow protection for long English prompts and primary action buttons.
- Fixed by adding `min-w-0`, `break-words`, and mobile full-width button behavior in the practice card.
- A CDP layout check on `/practice` reported no horizontal overflow after the fix.

## Notes

- Chrome printed macOS `CVDisplayLinkCreateWithCGDisplay` warnings during headless screenshot generation. Screenshots were still written successfully with expected dimensions.
- This record covers deeper static layout states. Interactive modal/form-filled visual states can be added later when those flows become more complex.
