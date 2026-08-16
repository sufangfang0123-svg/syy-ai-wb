import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const root = resolve(process.cwd(), "dist");
if (!existsSync(root)) throw new Error("dist/不存在：请先运行build:public");

const files = [];
const walk = (directory) => {
  for (const entry of readdirSync(directory)) {
    const absolute = resolve(directory, entry);
    if (statSync(absolute).isDirectory()) walk(absolute);
    else files.push(absolute);
  }
};
walk(root);

const normalized = (path) => relative(root, path).split(sep).join("/");
const forbidden = [
  /(^|\/)\.env($|\.)/i,
  /(^|\/)(backend\/data|uploads|snapshots|test-results|playwright-report|node_modules)(\/|$)/i,
  /\.(sqlite|sqlite3|db|pem|p12|pfx|key|snapshot)(-|\.|$)/i,
  /(^|\/)(id_rsa|id_ed25519|credentials|secrets?)(\.|$)/i,
];
const violations = files.map(normalized).filter((path) => forbidden.some((rule) => rule.test(path)));
if (violations.length) throw new Error(`公开构建包含禁止文件：\n${violations.join("\n")}`);

const uatRoot = resolve(root, "evidence", "uat-v0.3.1");
const manifestPath = resolve(uatRoot, "manifest.json");
const exportPath = resolve(uatRoot, "system-acceptance-export.json");
if (!existsSync(manifestPath) || !existsSync(exportPath)) throw new Error("公开UAT清单或脱敏导出缺失");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
if (manifest.caseType !== "system_acceptance" || manifest.customerData !== false || manifest.buildProfile !== "local_integrated") {
  throw new Error("公开UAT清单缺少system_acceptance/customerData=false/local_integrated边界");
}
const exportText = readFileSync(exportPath, "utf8");
for (const marker of ["系统验收案例", "固定脱敏系统验收夹具", "非客户成果"]) {
  if (!exportText.includes(marker)) throw new Error(`公开UAT导出缺少边界标记：${marker}`);
}
const frames = files.filter((path) => normalized(path).startsWith("evidence/uat-v0.3.1/frames/") && /\.jpg$/i.test(path));
if (frames.length !== 10) throw new Error(`公开UAT截图应为10帧，实际${frames.length}帧`);

const realHtml = resolve(root, "real", "index.html");
if (!existsSync(realHtml) || !readFileSync(realHtml, "utf8").includes("公开构建未开放真实项目")) {
  throw new Error("public_demo /real/边界页面缺失");
}

console.log(JSON.stringify({ status: "passed", scannedFiles: files.length, uatFrames: frames.length, customerData: false }, null, 2));
