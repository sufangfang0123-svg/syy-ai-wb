export type BuildProfile = "public_demo" | "local_integrated";

export interface RuntimeEnvironment {
  NEXT_PUBLIC_BUILD_PROFILE?: string;
  NEXT_PUBLIC_REAL_WORKSPACE_ENABLED?: string;
  NEXT_PUBLIC_API_BASE_URL?: string;
}

export interface RuntimeConfig {
  buildProfile: BuildProfile;
  isPublicDemo: boolean;
  isLocalIntegrated: boolean;
  realWorkspaceConfigured: boolean;
  apiBaseUrl: string;
  healthUrl: string;
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export function resolveRuntimeConfig(environment: RuntimeEnvironment): RuntimeConfig {
  const buildProfile: BuildProfile = environment.NEXT_PUBLIC_BUILD_PROFILE === "local_integrated"
    ? "local_integrated"
    : "public_demo";
  const apiBaseUrl = trimTrailingSlash(environment.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://127.0.0.1:8000");
  const realWorkspaceConfigured = buildProfile === "local_integrated"
    && environment.NEXT_PUBLIC_REAL_WORKSPACE_ENABLED === "true";

  return {
    buildProfile,
    isPublicDemo: buildProfile === "public_demo",
    isLocalIntegrated: buildProfile === "local_integrated",
    realWorkspaceConfigured,
    apiBaseUrl,
    healthUrl: `${apiBaseUrl}/api/v1/health`,
  };
}

export function isHealthyPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const status = "status" in payload ? String(payload.status).toLowerCase() : "";
  return status === "ok" || status === "healthy";
}

export const runtimeConfig = resolveRuntimeConfig({
  NEXT_PUBLIC_BUILD_PROFILE: process.env.NEXT_PUBLIC_BUILD_PROFILE,
  NEXT_PUBLIC_REAL_WORKSPACE_ENABLED: process.env.NEXT_PUBLIC_REAL_WORKSPACE_ENABLED,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
});
