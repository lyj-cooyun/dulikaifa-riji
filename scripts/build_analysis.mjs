// 生成「观点分析」文档：从数据中提取数据化线索（不做主观解读，只做结构化提炼）
// 1. 商业结果时间线：从正文中提取含数字的关键句（收入/下载/排名/订阅等）
// 2. 网友观点：高频回复者、高赞回复、各主题讨论焦点
import fs from 'node:fs';
import path from 'node:path';

const DATA = path.resolve('data');
const DOCS = path.resolve('docs');
const topicsDir = path.join(DATA, 'topics');

const fmtDate = ts => { if (!ts) return ''; const d = new Date(ts * 1000); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; };

// 提取正文中带数字的商业关键句
const MONEY_RE = /(收入|营收|赚|美元|美金|刀|人民币|元|月入|年收入|下载|下载量|订阅|会员|付费|买断|订阅制|广告费|分成|排名|Top ?\d|日活|月活|用户|收入翻|流水)/;

function extractMoneyLines(text) {
  if (!text) return [];
  const lines = text.split(/\n+/).map(s => s.trim()).filter(Boolean);
  return lines.filter(l => /\d/.test(l) && MONEY_RE.test(l) && l.length < 200);
}

const main = () => {
  const files = fs.readdirSync(topicsDir).filter(f => f.endsWith('.json'));
  const topics = files.map(f => JSON.parse(fs.readFileSync(path.join(topicsDir, f), 'utf8')));
  topics.sort((a, b) => (a.created || 0) - (b.created || 0));
  const weekly = topics.filter(t => t.episode);

  const L = [];
  L.push('# vulgur 独立开发周记 · 数据视角分析');
  L.push('');
  L.push(`> 基于已抓取的 ${topics.length} 个主题 / ${topics.reduce((s,t)=>s+t.replies.length,0)} 条回复，提取客观线索。`);
  L.push(`> 生成时间：${new Date().toISOString()}`);
  L.push('');

  // ---------- 商业结果时间线 ----------
  L.push('## 一、商业结果时间线（正文中含数字的关键句）');
  L.push('');
  L.push('> 每期挑出正文里带数字的商业相关句子，按时间排列。原始语境请看《周记全集.md》对应章节。');
  L.push('');
  let hits = 0;
  for (const t of weekly) {
    const lines = extractMoneyLines(t.content);
    const supp = (t.supplements || []).flatMap(s => extractMoneyLines(s.content));
    const all = [...lines, ...supp.map(s => '（附言）' + s)];
    if (!all.length) continue;
    hits++;
    const ep = t.episode ? `#${t.episode.ep}${t.episode.ep2 ? `-${t.episode.ep2}` : ''}` : '—';
    L.push(`### ${ep} ${fmtDate(t.created)} ${t.title.replace(/^独立开发周[记报]\s*[#]?\d*[-&]?\d*[：:]?\s*/, '')}`);
    L.push('');
    for (const line of all.slice(0, 8)) {
      L.push(`- ${line}`);
    }
    L.push('');
  }
  L.push(`> 共 ${hits} 期包含可提取的商业数字线索。`);
  L.push('');

  // ---------- 网友观点 ----------
  L.push('## 二、网友观点分析');
  L.push('');
  const totalReplies = topics.reduce((s, t) => s + t.replies.length, 0);
  L.push(`共分析 ${totalReplies} 条回复。`);
  L.push('');

  // 高频回复者
  const authorCount = {};
  const authorChars = {};
  for (const t of topics) for (const r of t.replies) {
    authorCount[r.author] = (authorCount[r.author] || 0) + 1;
    authorChars[r.author] = (authorChars[r.author] || 0) + (r.content || '').length;
  }
  L.push('### 2.1 高频参与者（互动最多的网友）');
  L.push('');
  L.push('| 网友 | 回复次数 | 累计字数 |');
  L.push('|---|---|---|');
  for (const [u, c] of Object.entries(authorCount).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    L.push(`| ${u} | ${c} | ${authorChars[u]} |`);
  }
  L.push('');

  // 讨论最热的主题
  L.push('### 2.2 讨论最热烈的主题（回复数 Top 15）');
  L.push('');
  L.push('| 期号 | 日期 | 标题 | 回复 | 收藏 | 感谢 |');
  L.push('|---|---|---|---|---|---|');
  for (const t of [...topics].sort((a, b) => b.replies.length - a.replies.length).slice(0, 15)) {
    L.push(`| ${t.episode ? '#' + t.episode.ep : '—'} | ${fmtDate(t.created)} | ${t.title.replace(/\|/g, '\\|')} | ${t.replies.length} | ${t.stars} | ${t.thanks} |`);
  }
  L.push('');

  // 里程碑主题
  L.push('### 2.3 网友互动随时间变化');
  L.push('');
  const byYear = {};
  for (const t of weekly) {
    const y = new Date(t.created * 1000).getFullYear();
    byYear[y] = byYear[y] || { topics: 0, replies: 0 };
    byYear[y].topics++;
    byYear[y].replies += t.replies.length;
  }
  L.push('| 年份 | 周记篇数 | 收到回复 | 平均每篇回复 |');
  L.push('|---|---|---|---|');
  for (const y of Object.keys(byYear).sort()) {
    L.push(`| ${y} | ${byYear[y].topics} | ${byYear[y].replies} | ${(byYear[y].replies / byYear[y].topics).toFixed(1)} |`);
  }
  L.push('');

  // 代表性长回复（网友观点样本）
  L.push('### 2.4 网友代表性长回复（观点样本，按字数 Top 40）');
  L.push('');
  L.push('> 过滤掉 OP 本人回复，保留最具信息量的长评。');
  L.push('');
  const longReplies = [];
  for (const t of topics) for (const r of t.replies) {
    if (r.author === 'vulgur') continue;
    if ((r.content || '').length >= 100) longReplies.push({ t, r });
  }
  longReplies.sort((a, b) => b.r.content.length - a.r.content.length);
  for (const { t, r } of longReplies.slice(0, 40)) {
    const ep = t.episode ? `#${t.episode.ep}` : '相关';
    L.push(`**@${r.author}** 回复 [${ep} ${t.title.replace(/^独立开发周[记报]\s*[#]?\d*[-&]?\d*[：:]?\s*/, '')}](https://www.v2ex.com/t/${t.id})（${fmtDate(r.created)}）：`);
    L.push('');
    L.push('> ' + (r.content || '').replace(/\n+/g, '\n> ').substring(0, 600));
    L.push('');
  }
  L.push('');

  // OP 在自己帖下的回复（对网友观点的回应）
  L.push('### 2.5 vulgur 本人在周记下的回复（对网友的回应）');
  L.push('');
  const opReplies = [];
  for (const t of topics) for (const r of t.replies) {
    if (r.author !== 'vulgur') continue;
    opReplies.push({ t, r });
  }
  L.push(`共 ${opReplies.length} 条（全部收录）：`);
  L.push('');
  opReplies.sort((a, b) => (a.t.created||0) - (b.t.created||0));
  for (const { t, r } of opReplies) {
    const ep = t.episode ? `#${t.episode.ep}` : '相关';
    L.push(`**vulgur** 回复 [${ep} ${t.title.replace(/^独立开发周[记报]\s*[#]?\d*[-&]?\d*[：:]?\s*/, '')}](https://www.v2ex.com/t/${t.id})（${fmtDate(r.created)}）：`);
    L.push('');
    L.push('> ' + (r.content || '').replace(/\n+/g, '\n> ').substring(0, 600));
    L.push('');
  }

  fs.writeFileSync(path.join(DOCS, '数据视角分析.md'), L.join('\n'), 'utf8');
  console.log('analysis done', { topics: topics.length, moneyEpisodes: hits, longReplies: longReplies.length, opReplies: opReplies.length });
};
main();
