# FirstCall

Live app: https://firstcall-3dtg.onrender.com  
Repo: https://github.com/LukaDordevic/firstcall

An AI onboarding and call-prep agent for new B2B sales reps.

Paste your employer’s website. FirstCall crawls it into a live **company brain** (Convex), then a rep can:

1. **Explore & Learn** — grounded Q&A about what you sell
2. **Qualify a Lead** — prospect URL → fit, news signals, qualifying questions
3. **Roleplay** — talk to a buyer at that company (browser mic + speech)

## Stack

- **Convex** — persistent brain, lead research, transcripts (all live queries)
- **Firecrawl** — site map + scrape
- **Exa** — news/signals off the prospect’s own site
- **x.ai (Grok 4.6)** — synthesis, Q&A, persona, roleplay
- **Vite + React + Tailwind** — frontend
- **Render** — public static host

## Local

```bash
npm install
npx convex dev
```

In another terminal:

```bash
npm run dev
```

Set Convex env vars (server-side only):

```bash
npx convex env set FIRECRAWL_API_KEY ...
npx convex env set EXA_API_KEY ...
npx convex env set XAI_API_KEY ...
```

Copy the printed `VITE_CONVEX_URL` into `.env.local`.

Roleplay voice uses the browser `SpeechRecognition` / `speechSynthesis` APIs (Chrome). There is always a text fallback.

## Demo flow

1. Home: `https://www.stripe.com` (or your company) — watch status crawl → synthesize → ready
2. Explore: “Who is the ICP for the core product?”
3. Qualify: a real prospect URL
4. Roleplay: start, speak an opener, do 4 turns
