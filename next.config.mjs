import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function nextConfig(phase) {
  return {
    reactStrictMode: true,
    output: "export",
    // Keep the local dev cache separate from the static export directory.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next" : "dist",
    trailingSlash: true,
    basePath,
    assetPrefix: basePath || undefined,
    images: { unoptimized: true },
  };
}
