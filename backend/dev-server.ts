import { createServer } from 'node:http';
import { fetchTradegateQuotes, jsonResponse, readIsinsFromUrl } from './shared';

const port = Number(process.env.DEV_API_PORT ?? 8788);

createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400).end('Missing URL');
    return;
  }

  const url = new URL(req.url, `http://127.0.0.1:${port}`);

  if (req.method === 'GET' && url.pathname === '/api/quotes') {
    try {
      const isins = readIsinsFromUrl(url);
      const payload = await fetchTradegateQuotes(isins);
      const body = jsonResponse({ quotes: payload });
      res.writeHead(body.status, Object.fromEntries(body.headers.entries()));
      res.end(await body.text());
      return;
    } catch (error) {
      const body = jsonResponse({ error: 'Unable to fetch quotes', detail: String(error) }, 502);
      res.writeHead(body.status, Object.fromEntries(body.headers.entries()));
      res.end(await body.text());
      return;
    }
  }

  res.writeHead(404).end('Not found');
}).listen(port, () => {
  console.log(`[dev-api] listening on http://127.0.0.1:${port}`);
});
