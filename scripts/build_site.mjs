// build_site.mjs — 生成单文件 HTML 站点：site/index.html + site/data.js
// 数据内嵌为 JS 变量（file:// 下 <script src> 可加载，避免 fetch 的 CORS 限制）
import fs from 'node:fs';
import path from 'node:path';

const DATA = path.resolve('data');
const SITE = path.resolve('site');
const DOCS = path.resolve('docs');
const topicsDir = path.join(DATA, 'topics');

const fmtDate = ts => { if (!ts) return ''; const d = new Date(ts * 1000); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// V2EX 的 content_rendered 带 loading="lazy"，在动态插入 DOM 时会误判视口导致图片永不加载
const cleanHtml = h => String(h || '').replace(/ loading="lazy"/g, '').replace(/loading="lazy"/g, '');

const main = () => {
  fs.mkdirSync(SITE, { recursive: true });
  const files = fs.readdirSync(topicsDir).filter(f => f.endsWith('.json'));
  const topics = files.map(f => JSON.parse(fs.readFileSync(path.join(topicsDir, f), 'utf8')));
  topics.sort((a, b) => (a.created || 0) - (b.created || 0));

  // ---------- data.js：极简数据集（供渲染用） ----------
  const payload = topics.map(t => ({    id: t.id,
    ep: t.episode ? t.episode.ep : null,
    ep2: t.episode ? t.episode.ep2 : null,
    title: t.title,
    node: t.node,
    created: t.created,
    date: fmtDate(t.created),
    stars: t.stars, thanks: t.thanks,
    replies_count: t.replies_count,
    body_html: cleanHtml(t.content_rendered) || `<p>${esc(t.content)}</p>`,
    supplements: (t.supplements || []).map(s => ({ html: cleanHtml(s.content_rendered) || `<p>${esc(s.content)}</p>`, date: fmtDate(s.created) })),
    op_replies: t.replies.filter(r => r.author === 'vulgur').map(r => ({ id: r.id, created: r.created, date: fmtDate(r.created), html: cleanHtml(r.content_rendered) || `<p>${esc(r.content)}</p>` })),
    replies: t.replies.filter(r => r.author !== 'vulgur').map(r => ({ id: r.id, author: r.author, created: r.created, date: fmtDate(r.created), html: cleanHtml(r.content_rendered) || `<p>${esc(r.content)}</p>` })),
  }));

  fs.writeFileSync(path.join(SITE, 'data.js'), 'window.__DATA__ = ' + JSON.stringify(payload) + ';', 'utf8');
  console.log('data.js:', payload.length, 'topics,', payload.reduce((s, t) => s + t.replies.length + t.op_replies.length, 0), 'replies,', (fs.statSync(path.join(SITE, 'data.js')).size / 1024 / 1024).toFixed(2), 'MB');

  // ---------- digest.js：导读文档（存在则嵌入） ----------
  const digestFile = path.join(DOCS, '导读.md');
  const digest = fs.existsSync(digestFile) ? fs.readFileSync(digestFile, 'utf8') : null;
  if (digest) {
    fs.writeFileSync(path.join(SITE, 'digest.js'), 'window.__DIGEST__ = ' + JSON.stringify(digest) + ';', 'utf8');
    console.log('digest.js:', (fs.statSync(path.join(SITE, 'digest.js')).size / 1024).toFixed(1), 'KB');
  }

  // ---------- index.html：阅读器 ----------
    const html = fs.readFileSync(path.resolve('scripts', 'site_template.html'), 'utf8');
  fs.writeFileSync(path.join(SITE, 'index.html'), html, 'utf8');
  console.log('index.html:', (fs.statSync(path.join(SITE, 'index.html')).size / 1024).toFixed(1), 'KB');
};

main();
