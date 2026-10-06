// 把 data/topics/*.json + index.json 生成为人类可读的 Markdown 数据集
// 输出：
//   docs/周记全集.md      —— 全部正文+附言+回复（合并版，按期号排序）
//   docs/目录.md          —— 索引（期号、日期、标题、回复数、链接）
//   docs/观点分析.md      —— 从数据中提取的商业结果/网友观点线索（数据统计层）
import fs from 'node:fs';
import path from 'node:path';

const DATA = path.resolve('data');
const DOCS = path.resolve('docs');
const topicsDir = path.join(DATA, 'topics');

function fmtDate(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function stripHtml(html) {
  return (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function replyFloor(t, replyId) {
  const i = t.replies.findIndex(r => r.id === replyId);
  return i >= 0 ? i + 1 : null;
}

const main = () => {
  fs.mkdirSync(DOCS, { recursive: true });
  const files = fs.readdirSync(topicsDir).filter(f => f.endsWith('.json'));
  const topics = files.map(f => JSON.parse(fs.readFileSync(path.join(topicsDir, f), 'utf8')));

  // 排序：按 created 时间正序
  topics.sort((a, b) => (a.created || 0) - (b.created || 0));

  const weekly = topics.filter(t => t.episode);
  const yearly = topics.filter(t => !t.episode && /年终总结/.test(t.title));
  const others = topics.filter(t => !t.episode && !/年终总结/.test(t.title));

  // ---------- 目录 ----------
  const tocLines = [
    '# vulgur 独立开发周记全集 · 目录',
    '',
    `抓取时间：${new Date().toISOString()}`,
    `主题总数：${topics.length}（周记 ${weekly.length} 篇 / 年终总结 ${yearly.length} 篇 / 相关主题 ${others.length} 篇）`,
    `回复总数：${topics.reduce((s, t) => s + t.replies.length, 0)}`,
    '',
    '## 周记系列（按时间正序）',
    '',
    '| 期号 | 日期 | 标题 | 回复 | 链接 |',
    '|---|---|---|---|---|',
    ...weekly.map(t => `| #${t.episode.ep}${t.episode.ep2 ? `-${t.episode.ep2}` : ''} | ${fmtDate(t.created)} | ${t.title.replace(/\|/g, '\\|')} | ${t.replies.length} | [v2ex](https://www.v2ex.com/t/${t.id}) |`),
    '',
    '## 年终总结',
    '',
    ...yearly.map(t => `- ${fmtDate(t.created)} [${t.title}](https://www.v2ex.com/t/${t.id})（${t.replies.length} 回复）`),
    '',
    '## 相关主题',
    '',
    ...others.map(t => `- ${fmtDate(t.created)} [${t.title}](https://www.v2ex.com/t/${t.id})（${t.replies.length} 回复）`),
  ];
  fs.writeFileSync(path.join(DOCS, '目录.md'), tocLines.join('\n'), 'utf8');

  // ---------- 全集 ----------
  const parts = [
    '# vulgur 独立开发周记全集',
    '',
    `> 数据抓取自 V2EX API 2.0，共 ${topics.length} 个主题、${topics.reduce((s, t) => s + t.replies.length, 0)} 条回复。`,
    `> 生成时间：${new Date().toISOString()}`,
    '',
    '---',
    '',
  ];
  const emitTopic = t => {
    const lines = [];
    lines.push(`## ${t.title}`);
    lines.push('');
    lines.push(`- 链接：https://www.v2ex.com/t/${t.id}`);
    lines.push(`- 发布：${fmtDate(t.created)}　节点：${t.node}　回复：${t.replies.length}　收藏(⭐)：${t.stars}　感谢：${t.thanks}`);
    if (t.episode) lines.push(`- 期号：#${t.episode.ep}${t.episode.ep2 ? `-#${t.episode.ep2}` : ''}`);
    lines.push('');
    lines.push('### 正文');
    lines.push('');
    lines.push(t.content?.trim() || stripHtml(t.content_rendered) || '（正文为空）');
    lines.push('');
    if (t.supplements?.length) {
      lines.push('### 附言（OP 补充）');
      lines.push('');
      for (const s of t.supplements) {
        lines.push(`> ${stripHtml(s.content).replace(/\n/g, '\n> ')}`);
        lines.push('');
      }
    }
    if (t.replies.length) {
      lines.push(`### 回复（${t.replies.length} 条）`);
      lines.push('');
      t.replies.forEach((r, i) => {
        const quoted = r.content?.includes('回复了') || false;
        lines.push(`**${i + 1}. @${r.author}**（${fmtDate(r.created)}）：`);
        lines.push('');
        lines.push(r.content?.trim() || stripHtml(r.content_rendered));
        lines.push('');
      });
    } else {
      lines.push('（无回复）');
      lines.push('');
    }
    lines.push('---');
    lines.push('');
    return lines.join('\n');
  };
  for (const t of weekly) parts.push(emitTopic(t));
  parts.push('\n# 年终总结\n');
  for (const t of yearly) parts.push(emitTopic(t));
  parts.push('\n# 相关主题\n');
  for (const t of others) parts.push(emitTopic(t));
  fs.writeFileSync(path.join(DOCS, '周记全集.md'), parts.join('\n'), 'utf8');

  // ---------- 汇总 ----------
  const summary = {
    generated_at: new Date().toISOString(),
    total_topics: topics.length,
    weekly_count: weekly.length,
    yearly_count: yearly.length,
    other_count: others.length,
    total_replies: topics.reduce((s, t) => s + t.replies.length, 0),
    date_range: [fmtDate(topics[0]?.created), fmtDate(topics[topics.length - 1]?.created)],
    episodes: weekly.map(t => t.episode.ep),
    top_replied: [...topics].sort((a, b) => b.replies.length - a.replies.length).slice(0, 10)
      .map(t => ({ id: t.id, title: t.title, replies: t.replies.length, stars: t.stars, thanks: t.thanks })),
    top_starred: [...topics].sort((a, b) => (b.stars || 0) - (a.stars || 0)).slice(0, 10)
      .map(t => ({ id: t.id, title: t.title, stars: t.stars, replies: t.replies.length })),
    reply_authors: (() => {
      const m = {};
      for (const t of topics) for (const r of t.replies) m[r.author] = (m[r.author] || 0) + 1;
      return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([u, c]) => ({ user: u, replies: c }));
    })(),
  };
  fs.writeFileSync(path.join(DATA, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log('MD generated:', { topics: topics.length, weekly: weekly.length, replies: summary.total_replies });
};

main();
