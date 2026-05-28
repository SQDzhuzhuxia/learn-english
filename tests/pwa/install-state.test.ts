import { describe, expect, it } from "vitest";
import { getPwaDisplayState } from "@/lib/pwa/install-state";

describe("getPwaDisplayState", () => {
  it("shows offline status first", () => {
    expect(
      getPwaDisplayState({
        online: false,
        installed: false,
        canInstall: true
      })
    ).toBe("offline");
  });

  it("shows install action when the browser exposes an install prompt", () => {
    expect(
      getPwaDisplayState({
        online: true,
        installed: false,
        canInstall: true
      })
    ).toBe("installable");
  });

  it("shows installed status for standalone display", () => {
    expect(
      getPwaDisplayState({
        online: true,
        installed: true,
        canInstall: false
      })
    ).toBe("installed");
  });

  it("hides status when nothing needs attention", () => {
    expect(
      getPwaDisplayState({
        online: true,
        installed: false,
        canInstall: false
      })
    ).toBe("hidden");
  });
});
