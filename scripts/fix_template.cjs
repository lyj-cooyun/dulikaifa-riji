// 一次性工具：修复 site_template.html 的转义（模板字符串残留）
const fs = require('fs');
const p = 'scripts/site_template.html';
let t = fs.readFileSync(p, 'utf8');
// '\\n' (backslash backslash n in file) → '\n' regex/string literal
t = t.replaceAll('\\\\n', '\\n');
// '\\`' → '`'
t = t.replaceAll('\\`', '`');
// '\\\\' → '\\' (regex double backslash)
t = t.replaceAll('\\\\\\\\', '\\\\');
fs.writeFileSync(p, t);
// 语法校验
const m = t.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!m) { console.error('script block not found'); process.exit(1); }
try { new Function(m[1]); console.log('SCRIPT SYNTAX: OK'); }
catch (e) { console.log('SYNTAX ERR:', e.message); }
