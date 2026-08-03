const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'dist');

function fixHtmlFile(filePath, depth) {
  let content = fs.readFileSync(filePath, 'utf-8');

  const relativePrefix = depth === 0 ? './' : depth === 1 ? '../' : '../../';

  // Fix absolute _next paths to relative
  content = content.replace(/href="\/_next\//g, 'href="' + relativePrefix + '_next/');
  content = content.replace(/src="\/_next\//g, 'src="' + relativePrefix + '_next/');

  // Fix absolute routes to .html files
  content = content.replace(/href="\/radar"/g, 'href="' + relativePrefix + 'radar.html"');
  content = content.replace(/href="\/insights"/g, 'href="' + relativePrefix + 'insights.html"');
  content = content.replace(/href="\/monitor\/tasks"/g, 'href="' + relativePrefix + 'monitor/tasks.html"');
  content = content.replace(/href="\/"/g, 'href="' + relativePrefix + 'index.html"');

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Fixed routes in: ' + path.relative(outDir, filePath));
}

// Fix all HTML files
const rootHtmls = fs.readdirSync(outDir).filter(f => f.endsWith('.html'));
for (const html of rootHtmls) {
  fixHtmlFile(path.join(outDir, html), 0);
}

// Fix monitor/tasks.html
const tasksHtml = path.join(outDir, 'monitor', 'tasks.html');
if (fs.existsSync(tasksHtml)) {
  let content = fs.readFileSync(tasksHtml, 'utf-8');
  content = content.replace(/href="\/_next\//g, 'href="../_next/');
  content = content.replace(/src="\/_next\//g, 'src="../_next/');
  content = content.replace(/href="\/radar"/g, 'href="../radar.html"');
  content = content.replace(/href="\/insights"/g, 'href="../insights.html"');
  content = content.replace(/href="\/monitor\/tasks"/g, 'href="./tasks.html"');
  content = content.replace(/href="\/"/g, 'href="../index.html"');
  fs.writeFileSync(tasksHtml, content, 'utf-8');
  console.log('Fixed routes in: monitor/tasks.html');
}

console.log('Done fixing routes');
