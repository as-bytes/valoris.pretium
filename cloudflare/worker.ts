import { fetchTradegateQuotes, jsonResponse, readIsinsFromUrl } from '../backend/shared';

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method !== 'GET' || url.pathname !== '/api/quotes') {
      return jsonResponse({ error: 'Not found' }, 404);
    }

    try {
      const quotes = await fetchTradegateQuotes(readIsinsFromUrl(url));
      return jsonResponse({ quotes });
    } catch (error) {
      return jsonResponse({ error: 'Unable to fetch quotes', detail: String(error) }, 502);
    }
  }
};
