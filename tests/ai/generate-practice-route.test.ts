import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/ai/generate-practice/route";

function createRequest(payload: unknown) {
  return new Request("http://localhost/api/ai/generate-practice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

describe("/api/ai/generate-practice", () => {
  it("rejects requests without usable material content", async () => {
    const response = await POST(createRequest({ materialTitle: "Empty" }));
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(payload.error).toContain("材料内容");
  });

  it("returns a fallback practice set when AI is not configured", async () => {
    const response = await POST(
      createRequest({
        materialId: "doctor-visit",
        materialTitle: "A Visit to the Doctor",
        materialType: "美国生活",
        level: "A1",
        summary: "A patient calls to make an appointment.",
        keyExpressions: ["make an appointment"],
        targetCount: 4,
        segments: [
          {
            id: "s1",
            order: 1,
            text: "I would like to make an appointment with a doctor."
          }
        ]
      })
    );
    const payload = (await response.json()) as {
      practiceSet?: {
        source: string;
        drills: unknown[];
      };
    };

    expect(response.status).toBe(200);
    expect(payload.practiceSet?.source).toBe("fallback");
    expect(payload.practiceSet?.drills.length).toBe(4);
  });
});
