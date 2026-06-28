import { describe, expect, it } from "vitest";
import { getSeedMaterials } from "@/lib/content/material-store";
import {
  createMaterialPracticeBundle,
  createMaterialPracticeDrills,
  createRetellingPracticeFromMaterial,
  createRoleplayScenarioFromMaterial,
  createShadowingPracticeFromMaterial,
  createWritingPromptsFromMaterial
} from "@/lib/content/material-practice";

describe("material-practice", () => {
  const material = getSeedMaterials()[0];
  const sentences = material.segments.map((segment) => segment.text);

  it("derives shadowing practice from the material", () => {
    const shadowing = createShadowingPracticeFromMaterial(material);

    expect(shadowing.material).toBe(material.title);
    expect(sentences).toContain(shadowing.prompt);
    expect(shadowing.steps.length).toBeGreaterThanOrEqual(3);
    expect(shadowing.target.length).toBeGreaterThan(0);
  });

  it("derives retelling practice from the material", () => {
    const retelling = createRetellingPracticeFromMaterial(material);

    expect(retelling.material).toBe(material.title);
    expect(retelling.sourceSummary.length).toBeGreaterThan(0);
    expect(retelling.keyPoints.length).toBeGreaterThan(0);
    retelling.keyPoints.forEach((point) => {
      expect(point.keywords.length).toBeGreaterThan(0);
    });
    expect(retelling.starters.length).toBeGreaterThan(0);
    retelling.starters.forEach((starter) => {
      expect(sentences).toContain(starter);
    });
  });

  it("derives writing prompts referencing material key expressions", () => {
    const prompts = createWritingPromptsFromMaterial(material);

    expect(prompts.length).toBeGreaterThanOrEqual(1);
    expect(prompts.length).toBeLessThanOrEqual(3);
    prompts.forEach((prompt) => {
      expect(prompt.level).toBe(material.level);
      expect(prompt.prompt.length).toBeGreaterThan(0);
    });
    expect(prompts.some((prompt) => prompt.prompt.includes(material.keyExpressions[0]))).toBe(true);
  });

  it("derives a material-bound roleplay scenario", () => {
    const roleplay = createRoleplayScenarioFromMaterial(material);

    expect(roleplay.material).toBe(material.title);
    expect(roleplay.level).toBe(material.level);
    expect(roleplay.turns.length).toBeGreaterThanOrEqual(1);
    roleplay.turns.forEach((turn) => {
      expect(turn.suggestedReplies.length).toBeGreaterThan(0);
      expect(turn.partnerLine.length).toBeGreaterThan(0);
    });
  });

  it("bundles all practice content for one material", () => {
    const bundle = createMaterialPracticeBundle(material);

    expect(bundle.shadowing.material).toBe(material.title);
    expect(bundle.retelling.material).toBe(material.title);
    expect(bundle.writingPrompts.length).toBeGreaterThanOrEqual(1);
    expect(bundle.roleplay.material).toBe(material.title);
    expect(bundle.drills.length).toBeGreaterThanOrEqual(5);
  });

  it("expands one material into multiple micro drills", () => {
    const drills = createMaterialPracticeDrills(material);

    expect(drills.length).toBeGreaterThanOrEqual(5);
    expect(drills.length).toBeLessThanOrEqual(8);
    expect(drills.map((drill) => drill.type)).toContain("shadowing");
    expect(drills.map((drill) => drill.type)).toContain("retelling");
    expect(drills.map((drill) => drill.type)).toContain("writing");
    drills.forEach((drill) => {
      expect(drill.prompt.length).toBeGreaterThan(0);
      expect(drill.estimatedMinutes).toBeGreaterThan(0);
      expect(drill.href.startsWith("/")).toBe(true);
    });
  });

  it("stays safe for a material without key expressions", () => {
    const bareMaterial = {
      ...material,
      keyExpressions: [] as string[]
    };

    const bundle = createMaterialPracticeBundle(bareMaterial);

    expect(bundle.writingPrompts.length).toBeGreaterThanOrEqual(1);
    expect(bundle.retelling.keyPoints.length).toBeGreaterThan(0);
    expect(bundle.roleplay.turns.length).toBeGreaterThanOrEqual(1);
    expect(bundle.drills.length).toBeGreaterThanOrEqual(4);
  });
});
