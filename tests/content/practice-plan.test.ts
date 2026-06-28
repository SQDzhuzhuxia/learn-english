import { describe, expect, it } from "vitest";
import { getSeedMaterials } from "@/lib/content/material-store";
import { createTodayPracticePlan } from "@/lib/content/practice-plan";

describe("createTodayPracticePlan", () => {
  it("derives shadowing, retelling, and writing tasks from the current material", () => {
    const material = getSeedMaterials()[0];
    const plan = createTodayPracticePlan(material);

    expect(plan.hasMaterial).toBe(true);
    expect(plan.materialId).toBe(material.id);
    expect(plan.materialTitle).toBe(material.title);
    expect(plan.tasks.map((task) => task.id)).toEqual(["shadowing", "retelling", "writing"]);

    const shadowing = plan.tasks.find((task) => task.id === "shadowing");
    expect(shadowing?.href).toBe("/practice#practice-shadowing");
    const materialSentences = material.segments.map((segment) => segment.text);
    expect(materialSentences).toContain(shadowing?.prompt);

    const retelling = plan.tasks.find((task) => task.id === "retelling");
    expect(retelling?.href).toBe("/practice#practice-retelling");
    expect(retelling?.prompt).toContain(material.summary);

    const writing = plan.tasks.find((task) => task.id === "writing");
    expect(writing?.href).toBe("/practice#practice-writing");
    expect(writing?.prompt).toContain(material.keyExpressions[0]);
  });

  it("prefers focus sentences for shadowing from the material", () => {
    const material = getSeedMaterials()[0];
    const plan = createTodayPracticePlan(material);
    const shadowing = plan.tasks.find((task) => task.id === "shadowing");

    const focusSentence = material.segments.find((segment) => segment.familiarity === "重点");

    expect(shadowing?.keywords.length).toBeGreaterThan(0);
    if (focusSentence) {
      expect(shadowing?.prompt).toBe(focusSentence.text);
    }
  });

  it("falls back to safe prompts when no material is available", () => {
    const plan = createTodayPracticePlan(undefined);

    expect(plan.hasMaterial).toBe(false);
    expect(plan.tasks).toHaveLength(3);
    plan.tasks.forEach((task) => {
      expect(task.prompt.length).toBeGreaterThan(0);
      expect(task.href.startsWith("/practice#practice-")).toBe(true);
    });
  });
});
