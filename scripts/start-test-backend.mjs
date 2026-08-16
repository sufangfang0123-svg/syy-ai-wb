import { existsSync, mkdirSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const isWindows = process.platform === "win32";
const venvPython = join(root, "backend", ".venv", isWindows ? "Scripts/python.exe" : "bin/python");
const python = existsSync(venvPython) ? venvPython : (isWindows ? "python" : "python3");
const realAiUat = process.env.NDG_REAL_AI_UAT === "1";
const dataDir = join(root, "test-results", realAiUat ? "real-ai-uat-data" : "e2e-data");
if (!realAiUat || process.env.NDG_REAL_AI_UAT_REUSE_DATA !== "1") rmSync(dataDir, { recursive: true, force: true });
mkdirSync(dataDir, { recursive: true });

const child = spawn(python, ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"], {
  cwd: join(root, "backend"),
  env: realAiUat ? {
    ...process.env,
    NDG_DATA_DIR: dataDir,
    NDG_ENVIRONMENT: "uat",
    NDG_AI_FIXTURE_PROVIDER: "",
    NDG_AI_MAX_RUNS_PER_PROJECT: "1",
    NDG_AI_MAX_CANDIDATES: "3",
    NDG_AI_MAX_INPUT_CHARS: "5000",
    NDG_AI_MAX_OUTPUT_TOKENS: "2000",
    NDG_AI_TIMEOUT_SECONDS: "35",
  } : {
    ...process.env,
    NDG_DATA_DIR: dataDir,
    NDG_ENVIRONMENT: "test",
    NDG_AI_FIXTURE_PROVIDER: "1",
    OPENAI_API_KEY: "",
    OPENAI_MODEL: "",
  },
  stdio: "inherit",
});

const stop = () => {
  if (!child.killed) child.kill("SIGTERM");
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code) => process.exit(code ?? 0));
