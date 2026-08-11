import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const artifactDirectory = resolve(root, "test-results", "phase1a0");
mkdirSync(artifactDirectory, { recursive: true });

const commands = [
  ["lint", "npm run lint"],
  ["typecheck", "npm run typecheck"],
  ["unit", "npm run test:unit"],
  ["build_public_demo", "npm run build:public"],
  ["build_local_integrated", "npm run build:local"],
  ["e2e_public_demo", "npm run test:e2e:public"],
  ["e2e_local_integrated", "npm run test:e2e:local"],
];

const hash = (value) => createHash("sha256").update(value).digest("hex");
const results = [];

for (const [name, command] of commands) {
  const startedAt = new Date();
  const result = spawnSync(command, {
    cwd: root,
    encoding: "utf8",
    shell: true,
    env: process.env,
    maxBuffer: 20 * 1024 * 1024,
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  process.stdout.write(stdout);
  process.stderr.write(stderr);
  writeFileSync(resolve(artifactDirectory, `${name}.stdout.log`), stdout, "utf8");
  writeFileSync(resolve(artifactDirectory, `${name}.stderr.log`), stderr, "utf8");
  results.push({
    name,
    command,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
    exitCode: result.status ?? 1,
    stdoutSha256: hash(stdout),
    stderrSha256: hash(stderr),
  });
}

const report = {
  schemaVersion: "phase1a0-verification/v1",
  generatedAt: new Date().toISOString(),
  scope: "Phase 1A-0 only",
  overallStatus: results.every((item) => item.exitCode === 0) ? "passed" : "failed",
  commands: results,
};
const reportPath = resolve(artifactDirectory, "verification-report.json");
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`\nMachine-readable report: ${reportPath}\n`);
process.exitCode = report.overallStatus === "passed" ? 0 : 1;
