import { existsSync, mkdirSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const isWindows = process.platform === "win32";
const venvPython = join(root, "backend", ".venv", isWindows ? "Scripts/python.exe" : "bin/python");
const python = existsSync(venvPython) ? venvPython : (isWindows ? "python" : "python3");
const dataDir = join(root, "test-results", "e2e-data");
rmSync(dataDir, { recursive: true, force: true });
mkdirSync(dataDir, { recursive: true });

const child = spawn(python, ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"], {
  cwd: join(root, "backend"),
  env: { ...process.env, NDG_DATA_DIR: dataDir },
  stdio: "inherit",
});

const stop = () => {
  if (!child.killed) child.kill("SIGTERM");
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code) => process.exit(code ?? 0));
