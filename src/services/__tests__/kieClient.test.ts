import { describe, it, expect } from "vitest";
import { interpretKieRecord } from "@/services/kieClient";

// The KIE "jobs" API returns task status via GET /api/v1/jobs/recordInfo.
// Response shape (per https://docs.kie.ai/market/common/get-task-detail):
//   { code, msg, data: { taskId, state, resultJson, failCode, failMsg, ... } }
// state ∈ "waiting" | "queuing" | "generating" | "success" | "fail"
// On success, image URLs live in data.resultJson (a JSON string): {"resultUrls":[...]}

describe("interpretKieRecord", () => {
  it("returns completed with imageUrl when state=success and resultJson is a JSON string", () => {
    const data = {
      code: 200,
      msg: "success",
      data: {
        taskId: "t1",
        state: "success",
        resultJson: JSON.stringify({ resultUrls: ["https://cdn.kie.ai/img.jpg"] }),
        failCode: "",
        failMsg: "",
      },
    };
    expect(interpretKieRecord(data)).toEqual({
      status: "completed",
      imageUrl: "https://cdn.kie.ai/img.jpg",
    });
  });

  it("returns completed when resultJson is already an object", () => {
    const data = {
      code: 200,
      data: {
        state: "success",
        resultJson: { resultUrls: ["https://cdn.kie.ai/obj.png"] },
      },
    };
    expect(interpretKieRecord(data)).toEqual({
      status: "completed",
      imageUrl: "https://cdn.kie.ai/obj.png",
    });
  });

  it("treats state=success with no image URL as failed (content filtered)", () => {
    const data = {
      code: 200,
      data: { state: "success", resultJson: JSON.stringify({ resultUrls: [] }) },
    };
    const outcome = interpretKieRecord(data);
    expect(outcome.status).toBe("failed");
  });

  it("returns failed with failMsg when state=fail (the real bug: KIE uses 'fail' not 'failed')", () => {
    const data = {
      code: 200,
      data: {
        state: "fail",
        resultJson: "",
        failCode: "400",
        failMsg:
          "No images found in AI response. The image was filtered out because it violated Google's Generative AI Prohibited Use policy.",
      },
    };
    const outcome = interpretKieRecord(data);
    expect(outcome.status).toBe("failed");
    if (outcome.status === "failed") {
      expect(outcome.error).toContain("Prohibited Use policy");
    }
  });

  it("returns pending while task is still running", () => {
    for (const state of ["waiting", "queuing", "generating"]) {
      expect(interpretKieRecord({ code: 200, data: { state } })).toEqual({
        status: "pending",
      });
    }
  });

  it("returns pending for malformed / not-yet-available responses", () => {
    expect(interpretKieRecord(null)).toEqual({ status: "pending" });
    expect(interpretKieRecord({})).toEqual({ status: "pending" });
    expect(interpretKieRecord({ code: 404 })).toEqual({ status: "pending" });
    expect(interpretKieRecord({ data: {} })).toEqual({ status: "pending" });
  });
});
