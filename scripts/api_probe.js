// Probe v2ex API through proxy. Usage: node api_probe.js
const TOKEN = process.env.V2EX_TOKEN || ''; // 运行前: $env:V2EX_TOKEN='<你的token>'
const PROXY = process.env.HTTPS_PROXY || 'http://127.0.0.1:7890';
const urls = [
  'https://www.v2ex.com/api/v2/token',
  'https://edge.v2ex.com/api/v2/token',
  'https://edge.v2ex.com/api/v2/topics/latest?p=1',
  'https://edge.v2ex.com/api/v2/topics/1',
];

async function main() {
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
      const text = await res.text();
      const ct = res.headers.get('content-type') || '';
      console.log('==', url, '=> STATUS', res.status, ct.split(';')[0]);
      if (ct.includes('json')) console.log('   ', text.substring(0, 300).replace(/\n/g, ' '));
      console.log('   RATE', res.headers.get('x-ratelimit-remaining'), '/', res.headers.get('x-ratelimit-limit'));
    } catch (e) {
      console.log('==', url, '=> FETCH_ERR', e.cause ? (e.cause.code || e.cause.message) : e.message);
    }
  }
}
main();
