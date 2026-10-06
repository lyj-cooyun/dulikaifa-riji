// 一次性工具：把 build_site.mjs 里的 HTML 模板抽到独立文件
const fs = require('fs');
const s = fs.readFileSync('scripts/build_site.mjs', 'utf8');
const marker = 'const html = `';
const start = s.indexOf(marker);
const end = s.indexOf('`;', start + marker.length);
if (start === -1 || end === -1) { console.error('markers not found'); process.exit(1); }
const inner = s.substring(start + marker.length, end);
fs.writeFileSync('scripts/site_template.html', inner);
// 替换原文件里的模板为读文件
const replacement = `  const html = fs.readFileSync(path.resolve('scripts', 'site_template.html'), 'utf8');`;
const s2 = s.substring(0, start) + replacement + s.substring(end + 2);
fs.writeFileSync('scripts/build_site.mjs', s2);
console.log('extracted', inner.length, 'chars; build_site.mjs now reads template file');
