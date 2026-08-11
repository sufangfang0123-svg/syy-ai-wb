import { describe, expect, it } from "vitest";
import { isHealthyPayload, resolveRuntimeConfig } from "../../src/config/runtime";

describe("runtime build boundary", () => {
  it("defaults to public_demo and force-closes the real workspace", () => {
    const config = resolveRuntimeConfig({ NEXT_PUBLIC_REAL_WORKSPACE_ENABLED: "true" });
    expect(config.buildProfile).toBe("public_demo");
    expect(config.realWorkspaceConfigured).toBe(false);
  });

  it("only configures the real boundary for an explicitly enabled local build", () => {
    const config = resolveRuntimeConfig({
      NEXT_PUBLIC_BUILD_PROFILE: "local_integrated",
      NEXT_PUBLIC_REAL_WORKSPACE_ENABLED: "true",
      NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:9000/",
    });
    expect(config.realWorkspaceConfigured).toBe(true);
    expect(config.healthUrl).toBe("http://127.0.0.1:9000/api/v1/health");
  });

  it("rejects unrecognized health payloads", () => {
    expect(isHealthyPayload({ status: "ok" })).toBe(true);
    expect(isHealthyPayload({ status: "healthy" })).toBe(true);
    expect(isHealthyPayload({ status: "starting" })).toBe(false);
    expect(isHealthyPayload(null)).toBe(false);
  });
});
