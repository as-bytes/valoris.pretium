import { fetchTradegateQuotes, readIsinsFromUrl } from "../backend/shared";

export const config = {
  runtime: "edge",
};

export default async function handler(request: Request): Promise<Response> {
  let isins: string[] = [];

  if (request.method === "GET") {
    const url = new URL(request.url);
    isins = readIsinsFromUrl(url);
  } else if (request.method === "POST") {
    try {
      const body = await request.json();
      if (Array.isArray(body)) {
        isins = body;
      }
    } catch (e) {
      // Ignore
    }
  } else {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const quotes = await fetchTradegateQuotes(isins);
    return new Response(JSON.stringify({ quotes }), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Unable to fetch quotes",
        detail: String(error),
      }),
      {
        status: 502,
        headers: { "content-type": "application/json" },
      },
    );
  }
}
