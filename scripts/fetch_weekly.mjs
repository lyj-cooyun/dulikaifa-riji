// V2EX 独立开发周记系列抓取器（vulgur）
// 数据源：
//  1. member topics 页面（已抓取，见 data/topics_list.json）
//  2. API 2.0: topics/:id + topics/:id/replies?p=N（每页 20 条，p=1 起步，<20 条停止）
// 速率：600 req/h，脚本内置节流 + 失败重试。
import fs from 'node:fs';
import path from 'node:path';

const TOKEN = process.env.V2EX_TOKEN || ''; // 运行前: $env:V2EX_TOKEN='<你的token>'
const API = 'https://www.v2ex.com/api/v2';
const DATA_DIR = path.resolve('data');
const H = { Authorization: `Bearer ${TOKEN}` };

const sleep = ms => new Promise(r => setTimeout(r, ms));

let rateRemaining = 600;
let rateReset = 0;

async function apiGet(url, retries = 3) {
  for (let i = 0; i < 5; i++) {
    if (rateRemaining <= 5) {
      const waitMs = Math.max(0, rateReset * 1000 - Date.now()) + 2000;
      console.log(`[rate] remaining=${rateRemaining}, waiting ${(waitMs / 1000).toFixed(0)}s until reset`);
      await sleep(Math.min(waitMs, 60 * 60 * 1000));
    }
    const res = await fetch(url, { headers: H });
    const rem = res.headers.get('x-rate-limit-remaining');
    const lim = res.headers.get('x-rate-limit-limit');
    const rst = res.headers.get('x-rate-limit-reset');
    if (rem !== null) rateRemaining = Number(rem);
    if (rst !== null) rateReset = Number(rst);
    if (res.ok) {
      return (await res.json()).result;
    }
    if (res.status === 404) return { __404: true };
    if (res.status === 403) {
      console.error(`[warn] 403 on ${url}`);
      return { __403: true };
    }
    // 5xx or others: retry
    await sleep(3000 * (i + 1));
  }
  return { __error: true };
}

function extractNumber(title) {
  // 匹配周记编号：#190 / 190 /  168-169 / 63&64 / 137&138
  const m = title.match(/周[记报]\s*#?(\d+)\s*(?:[-&–]\s*(\d+))?/);
  if (!m) return null;
  return { ep: Number(m[1]), ep2: m[2] ? Number(m[2]) : null };
}

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const list = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'topics_list.json'), 'utf8'));
  // 只抓周记系列 + 紧密相关的主题（年终总结、独立开发日记等）
  const RE = /独立开发周[记报]|独立开发者?的? ?\d{4} 年终总结|独立开发日记/;
  const targets = list.filter(t => RE.test(t.title));
  console.log(`targets: ${targets.length} topics`);

  const out = [];
  let done = 0;
  for (const t of targets) {
    const outFile = path.join(DATA_DIR, 'topics', `${t.id}.json`);
    fs.mkdirSync(path.join(DATA_DIR, 'topics'), { recursive: true });
    if (fs.existsSync(outFile)) {
      out.push(JSON.parse(fs.readFileSync(outFile, 'utf8')));
      done++;
      continue;
    }
    // 1) topic detail
    const detail = await apiGet(`${API}/topics/${t.id}`);
    if (detail.__404 || detail.__403 || detail.__error) {
      console.log(`[skip] ${t.id} ${JSON.stringify(detail)}`);
      continue;
    }
    await sleep(250);
    // 2) replies, 20 per page
    const replies = [];
    let page = 1;
    for (;;) {
      const r = await apiGet(`${API}/topics/${t.id}/replies?p=${page}`);
      if (r.__404 || r.__403 || r.__error) break;
      const arr = Array.isArray(r) ? r : [];
      replies.push(...arr);
      if (arr.length < 20) break;
      page++;
      await sleep(250);
    }
    const ep = extractNumber(detail.title || t.title);
    const item = {
      id: t.id,
      title: detail.title || t.title,
      episode: ep,
      node: detail.node?.name || t.node,
      url: detail.url || `https://www.v2ex.com/t/${t.id}`,
      created: detail.created,
      last_touched: detail.last_touched,
      member: detail.member?.username,
      replies_count: detail.replies,
      stars: detail.stars,
      thanks: detail.thanks,
      content: detail.content,
      content_rendered: detail.content_rendered,
      supplements: detail.supplements || [],
      replies: replies.map(x => ({
        id: x.id,
        author: x.member?.username,
        author_avatar: x.member?.avatar_large,
        created: x.created,
        content: x.content,
        content_rendered: x.content_rendered,
      })),
      reply_pages: Math.max(1, page),
      fetched_at: new Date().toISOString(),
    };
    fs.writeFileSync(outFile, JSON.stringify(item, null, 2));
    out.push(item);
    done++;
    console.log(`[${done}/${targets.length}] ${t.id} ep=${ep ? ep.ep : '-'} replies=${replies.length}/${detail.replies}`);
    await sleep(300);
  }
  // 汇总索引
  const index = out.map(({ content, content_rendered, replies, supplements, ...meta }) => ({
    ...meta,
    replies_fetched: replies.length,
    supplements_count: supplements.length,
  }));
  fs.writeFileSync(path.join(DATA_DIR, 'index.json'), JSON.stringify(index, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'crawl_summary.json'), JSON.stringify({
    generated_at: new Date().toISOString(),
    total_topics: out.length,
    total_replies: out.reduce((s, t) => s + t.replies.length, 0),
    episodes: out.filter(t => t.episode).map(t => t.episode.ep),
    rate_remaining: rateRemaining,
  }, null, 2));
  console.log('DONE', out.length, 'topics,', out.reduce((s, t) => s + t.replies.length, 0), 'replies, rate remaining', rateRemaining);
}

main().catch(e => { console.error(e); process.exit(1); });
