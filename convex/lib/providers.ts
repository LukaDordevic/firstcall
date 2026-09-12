import { clip } from "./parse";

const FIRECRAWL_BASE = "https://api.firecrawl.dev";
const EXA_BASE = "https://api.exa.ai";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set on the Convex deployment`);
  }
  return value;
}

async function readJson(response: Response, label: string): Promise<unknown> {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${label} failed (${response.status}): ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) : {};
}

type FirecrawlScrapeResponse = {
  success?: boolean;
  data?: {
    markdown?: string;
    metadata?: { title?: string; sourceURL?: string };
  };
  markdown?: string;
};

export async function firecrawlScrape(
  url: string,
): Promise<{ url: string; markdown: string; title?: string }> {
  const key = requireEnv("FIRECRAWL_API_KEY");
  const body = { url, formats: ["markdown"] };

  const tryV2 = await fetch(`${FIRECRAWL_BASE}/v2/scrape`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let payload: FirecrawlScrapeResponse;
  if (tryV2.status === 404 || tryV2.status === 405) {
    const tryV1 = await fetch(`${FIRECRAWL_BASE}/v1/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    payload = (await readJson(tryV1, "Firecrawl scrape")) as FirecrawlScrapeResponse;
  } else {
    payload = (await readJson(tryV2, "Firecrawl scrape")) as FirecrawlScrapeResponse;
  }

  const markdown = payload.data?.markdown ?? payload.markdown ?? "";
  if (!markdown.trim()) {
    throw new Error(`Firecrawl returned empty markdown for ${url}`);
  }
  return {
    url: payload.data?.metadata?.sourceURL ?? url,
    markdown,
    title: payload.data?.metadata?.title,
  };
}

type MapPayload = {
  links?: Array<string | { url?: string; link?: string }>;
  urls?: string[];
  data?: { links?: string[] };
};

function collectMapLinks(payload: MapPayload): string[] {
  const raw = payload.links ?? payload.urls ?? payload.data?.links ?? [];
  return raw
    .map((item) => {
      if (typeof item === "string") return item;
      return item.url ?? item.link ?? "";
    })
    .filter((item) => item.length > 0);
}

export async function firecrawlMap(url: string): Promise<string[]> {
  const key = requireEnv("FIRECRAWL_API_KEY");
  const tryV2 = await fetch(`${FIRECRAWL_BASE}/v2/map`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, limit: 40 }),
  });

  let payload: MapPayload;
  if (tryV2.status === 404 || tryV2.status === 405) {
    const tryGet = await fetch(
      `${FIRECRAWL_BASE}/v1/map?url=${encodeURIComponent(url)}`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    if (tryGet.status === 404 || tryGet.status === 405) {
      const tryPost = await fetch(`${FIRECRAWL_BASE}/v1/map`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, limit: 40 }),
      });
      payload = (await readJson(tryPost, "Firecrawl map")) as MapPayload;
    } else {
      payload = (await readJson(tryGet, "Firecrawl map")) as MapPayload;
    }
  } else {
    payload = (await readJson(tryV2, "Firecrawl map")) as MapPayload;
  }

  return collectMapLinks(payload);
}

const PRIORITY_PATHS = [
  "/product",
  "/products",
  "/solutions",
  "/platform",
  "/pricing",
  "/about",
  "/customers",
  "/case-stud",
  "/customers",
  "/who-we",
];

export function pickSitePages(homeUrl: string, mapped: string[]): string[] {
  const origin = new URL(homeUrl).origin;
  const unique = new Set<string>([homeUrl, origin]);
  const scored = mapped
    .map((raw) => {
      try {
        return new URL(raw, origin).toString();
      } catch {
        return "";
      }
    })
    .filter((item) => item.startsWith(origin))
    .map((item) => {
      const path = new URL(item).pathname.toLowerCase();
      const score = PRIORITY_PATHS.findIndex((hint) => path.includes(hint.replace("/", "")));
      return { item, score: score === -1 ? 99 : score };
    })
    .sort((a, b) => a.score - b.score);

  for (const entry of scored) {
    unique.add(entry.item);
    if (unique.size >= 6) break;
  }
  return [...unique].slice(0, 6);
}

export async function scrapePages(
  urls: string[],
): Promise<Array<{ url: string; text: string }>> {
  const chunks: Array<{ url: string; text: string }> = [];
  for (const url of urls) {
    try {
      const page = await firecrawlScrape(url);
      chunks.push({ url: page.url, text: clip(page.markdown, 4500) });
    } catch (error) {
      console.error("Scrape skipped", url, error);
    }
  }
  if (chunks.length === 0) {
    throw new Error("Could not scrape any pages from that site");
  }
  return chunks;
}

type ExaResult = {
  title?: string;
  url?: string;
  text?: string;
  publishedDate?: string;
};

export async function exaSearch(query: string): Promise<string[]> {
  const key = requireEnv("EXA_API_KEY");
  const response = await fetch(`${EXA_BASE}/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      type: "auto",
      numResults: 6,
      contents: { text: true },
    }),
  });
  const payload = (await readJson(response, "Exa search")) as {
    results?: ExaResult[];
  };
  return (payload.results ?? []).map((result) => {
    const title = result.title ?? "Untitled";
    const url = result.url ?? "";
    const date = result.publishedDate ? ` (${result.publishedDate})` : "";
    const text = clip(result.text ?? "", 500);
    return `${title}${date}${url ? ` — ${url}` : ""}\n${text}`;
  });
}

export async function grokChat(args: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<string> {
  const key = requireEnv("XAI_API_KEY");
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({
    apiKey: key,
    baseURL: "https://api.x.ai/v1",
  });
  const completion = await client.chat.completions.create({
    model: "grok-4.6",
    temperature: args.temperature ?? 0.3,
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
  });
  const text = completion.choices[0]?.message?.content;
  if (!text) {
    throw new Error("x.ai returned an empty completion");
  }
  return text;
}
