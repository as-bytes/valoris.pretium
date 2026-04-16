# valoris.pretium

Vue 3 + Vite portfolio app with backend `/api/quotes` adapters for:

- Cloudflare Workers (`cloudflare/worker.ts`)
- Firebase Functions (`firebase/functions/src/index.ts`)
- Vercel Edge Functions (`vercel/api/quotes.ts`)

## Local development

```bash
npm run dev
```

This starts:

- Vite on `5173`
- local API bridge on `8788`

Vite proxies `/api/*` to `DEV_API_TARGET` in development. In production, the frontend calls `/api/*` directly on the deployed host.

## Deploy scripts

- `npm run deploy:cloudflare`
- `npm run deploy:firebase`
- `npm run deploy:vercel`

See `.env.github.example` and `.env.<hoster>.example` for required variables.
