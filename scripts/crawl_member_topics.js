// Crawl all topic pages of a V2EX member: https://www.v2ex.com/member/:username/topics?p=N
// Run inside browser via browser_eval (has login/proxy state) OR via node with proxy env.
const USERNAME = 'vulgur';
const PROXY_URL = process.env.HTTPS_PROXY || 'http://127.0.0.1:7890';
const TOKEN = process.env.V2EX_TOKEN || ''; // 运行前: $env:V2EX_TOKEN='<你的token>'

function parseTopicsHTML(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const box = doc.querySelector('#Main .box');
  if (!box) return { items: [], pages: 1, error: 'no box' };
  const cells = [...box.querySelectorAll('.cell')].filter(c => c.querySelector('.item_title'));
  const items = cells.map(c => {
    const a = c.querySelector('.item_title a');
    const info = c.querySelector('.topic_info');
    const strong = info?.querySelector('strong');
    const replyCountText = [...(info?.querySelectorAll('a') || [])].filter(x => /^\d+$/.test(x.textContent.trim())).pop()?.textContent?.trim();
    const t = (info?.textContent || '').replace(/\s+/g, ' ');
    const dateMatch = t.match(/•\s*(.+?)\s*(?:•|最后回复)/);
    return {
      id: Number((a.getAttribute('href').match(/\/t\/(\d+)/) || [])[1]),
      title: a.textContent.trim(),
      node: c.querySelector('.node')?.textContent?.trim() || null,
      author: strong?.querySelector('a')?.textContent?.trim() || null,
      replies: Number(replyCountText || 0),
      date: dateMatch ? dateMatch[1] : null,
    };
  });
  const pager = [...box.querySelectorAll('.cell a')].map(a => a.textContent.trim()).filter(t => /^\d+$/.test(t));
  const pages = pager.length ? Math.max(...pager.map(Number)) : 1;
  return { items, pages };
}

async function fetchPage(p) {
  const url = `https://www.v2ex.com/member/${USERNAME}/topics?p=${p}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

(async () => {
  const all = [];
  let pages = 1;
  // page 1 first to discover page count
  const html1 = await fetchPage(1);
  const r1 = parseTopicsHTML(html1);
  pages = r1.pages;
  all.push(...r1.items);
  for (let p = 2; p <= pages; p++) {
    const html = await fetchPage(p);
    const r = parseTopicsHTML(html);
    all.push(...r.items);
    await new Promise(r => setTimeout(r, 800));
  }
  return { pages, total: all.length, sample: all.slice(0, 3), tail: all.slice(-3) };
})();
