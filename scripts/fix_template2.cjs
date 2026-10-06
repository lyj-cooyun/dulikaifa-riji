// 一次性工具：把 site_template.html 正则里的双反斜杠还原为单反斜杠
const fs = require('fs');
const p = 'scripts/site_template.html';
let t = fs.readFileSync(p, 'utf8');
const B = String.fromCharCode(92); // backslash
// 正则字面量里的 \\s → \s 等：文件中实际是 \ \ s 三字符序列 → 变成 \ s
const before = t;
t = t.replaceAll(B + B + 's', B + 's');
t = t.replaceAll(B + B + 'd', B + 'd');
t = t.replaceAll(B + B + 'W', B + 'W');
t = t.replaceAll(B + B + '[', B + '[');
t = t.replaceAll(B + B + ']', B + ']');
t = t.replaceAll(B + B + '(', B + '(');
t = t.replaceAll(B + B + ')', B + ')');
t = t.replaceAll(B + B + '|', B + '|');
t = t.replaceAll(B + B + '*', B + '*');
t = t.replaceAll(B + B + '+', B + '+');
t = t.replaceAll(B + B + '-', B + '-');
t = t.replaceAll(B + B + '{', B + '{');
t = t.replaceAll(B + B + '}', B + '}');
t = t.replaceAll(B + B + '`', B + '`'); // \` → \`
t = t.replaceAll(B + B + 'n' + "'", B + 'n' + "'"); // '\n' strings
// 检查剩余
const leftovers = [];
t.split('\n').forEach((l, i) => { if (l.includes(B + B)) leftovers.push(i + 1 + ': ' + l.trim().substring(0, 100)); });
fs.writeFileSync(p, t);
const m = t.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
try { new Function(m[1]); console.log('SCRIPT SYNTAX: OK'); }
catch (e) { console.log('SYNTAX ERR:', e.message); }
console.log('leftover double-backslash lines:', leftovers.length ? leftovers : 'none');
