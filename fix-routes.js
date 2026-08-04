const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'dist');

function fixHtmlFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // basePath 已经让 /_next/ -> /syy-ai-wb/_next/，这是正确的
  // 但路由链接 /radar /insights 等需要改成 .html
  content = content.replace(/href="\/syy-ai-wb\/radar"/g, 'href="/syy-ai-wb/radar.html"');
  content = content.replace(/href="\/syy-ai-wb\/insights"/g, 'href="/syy-ai-wb/insights.html"');
  content = content.replace(/href="\/syy-ai-wb\/monitor\/tasks"/g, 'href="/syy-ai-wb/monitor/tasks.html"');
  content = content.replace(/href="\/syy-ai-wb"/g, 'href="/syy-ai-wb/index.html"');

  // Fix new page routes (4 added modules)
  content = content.replace(/href="\/syy-ai-wb\/opportunities"/g, 'href="/syy-ai-wb/opportunities.html"');
  content = content.replace(/href="\/syy-ai-wb\/evolution"/g, 'href="/syy-ai-wb/evolution.html"');
  content = content.replace(/href="\/syy-ai-wb\/launch"/g, 'href="/syy-ai-wb/launch.html"');
  content = content.replace(/href="\/syy-ai-wb\/content"/g, 'href="/syy-ai-wb/content.html"');

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Fixed routes in: ' + path.relative(outDir, filePath));
}

// Fix all HTML files in root
const rootHtmls = fs.readdirSync(outDir).filter(f => f.endsWith('.html'));
for (const html of rootHtmls) {
  fixHtmlFile(path.join(outDir, html));
}

// Fix monitor/tasks.html
const tasksHtml = path.join(outDir, 'monitor', 'tasks.html');
if (fs.existsSync(tasksHtml)) {
  fixHtmlFile(tasksHtml);
}

console.log('Done fixing routes');
