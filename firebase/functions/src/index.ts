import { onRequest } from 'firebase-functions/v2/https';
import { fetchTradegateQuotes } from '../../../backend/shared';

export const api = onRequest(async (req, res) => {
  if (req.method !== 'GET' || req.path !== '/quotes') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  try {
    const isins = String(req.query.isins ?? '')
      .split(',')
      .map((isin) => isin.trim())
      .filter(Boolean);

    const quotes = await fetchTradegateQuotes(isins);
    res.set('cache-control', 'no-store');
    res.json({ quotes });
  } catch (error) {
    res.status(502).json({ error: 'Unable to fetch quotes', detail: String(error) });
  }
});
