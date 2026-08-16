import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";

const root = resolve(process.cwd(), "dist");
if (!existsSync(root)) throw new Error("dist/不存在：请先运行build:public");

const files = [];
const walk = (directory) => {
  for (const entry of readdirSync(directory)) {
    const absolute = resolve(directory, entry);
    const stat = lstatSync(absolute);
    if (stat.isSymbolicLink()) throw new Error(`公开构建不得包含符号链接：${absolute}`);
    if (stat.isDirectory()) walk(absolute);
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

const textExtensions = /\.(html|js|css|json|txt|xml|svg|map)$/i;
const sensitiveContentRules = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bAuthorization\s*:\s*Bearer\s+[A-Za-z0-9._-]+/i,
  /\b[A-Za-z]:\\Users\\[^\\\r\n]+/,
];
for (const file of files.filter((item) => textExtensions.test(item))) {
  const value = readFileSync(file, "utf8");
  if (sensitiveContentRules.some((rule) => rule.test(value))) throw new Error(`公开构建文本疑似包含凭据或本机路径：${normalized(file)}`);
}

const canonicalSha256 = (file) => {
  let value = readFileSync(file);
  if (/\.json$/i.test(file)) value = Buffer.from(value.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
  return createHash("sha256").update(value).digest("hex");
};

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
const sumsPath = resolve(uatRoot, "SHA256SUMS.txt");
if (!existsSync(sumsPath)) throw new Error("公开UAT缺少SHA256SUMS.txt");
const sums = new Map(readFileSync(sumsPath, "utf8").trim().split(/\r?\n/).map((line) => {
  const match = line.match(/^([a-f0-9]{64})\s{2}(.+)$/i);
  if (!match || match[2].includes("..") || match[2].startsWith("/") || match[2].includes("\\")) throw new Error(`公开UAT哈希清单行无效：${line}`);
  return [match[2], match[1].toLowerCase()];
}));
for (const [name, expected] of sums) {
  const target = resolve(uatRoot, name);
  if (dirname(target).length < uatRoot.length || !target.startsWith(uatRoot) || !existsSync(target)) throw new Error(`公开UAT哈希目标缺失或越界：${name}`);
  const actual = canonicalSha256(target);
  if (actual !== expected) throw new Error(`公开UAT哈希不一致：${name}`);
}
if (sums.size !== 12) throw new Error(`公开UAT哈希清单应包含12项，实际${sums.size}项`);
if (manifest.export.sha256 !== canonicalSha256(exportPath)) throw new Error("公开UAT manifest导出SHA不一致");
for (const frame of manifest.frames) {
  const target = resolve(uatRoot, frame.file);
  if (!existsSync(target) || frame.sha256 !== canonicalSha256(target)) throw new Error(`公开UAT manifest帧SHA不一致：${frame.file}`);
}

const realHtml = resolve(root, "real", "index.html");
if (!existsSync(realHtml) || !readFileSync(realHtml, "utf8").includes("公开构建未开放真实项目")) {
  throw new Error("public_demo /real/边界页面缺失");
}

console.log(JSON.stringify({ status: "passed", scannedFiles: files.length, uatFrames: frames.length, customerData: false }, null, 2));
