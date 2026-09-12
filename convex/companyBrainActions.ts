"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { extractJson } from "./lib/parse";
import {
  firecrawlMap,
  grokChat,
  pickSitePages,
  scrapePages,
} from "./lib/providers";

type BrainShape = {
  companyName: string;
  overview: string;
  solutions: Array<{
    name: string;
    description: string;
    icp: string;
    pricingModel?: string;
    differentiators: string[];
    commonObjections: Array<{ objection: string; response: string }>;
  }>;
  caseStudies: Array<{ title: string; summary: string }>;
};

export const ingest = action({
  args: { brainId: v.id("companyBrain") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const brain = await ctx.runQuery(api.companyBrain.get, {
      brainId: args.brainId,
    });
    if (!brain) throw new Error("Company brain not found");

    try {
      let mapped: string[] = [];
      try {
        mapped = await firecrawlMap(brain.companyUrl);
      } catch (error) {
        console.error("Firecrawl map failed, using homepage only", error);
      }
      const pages = pickSitePages(brain.companyUrl, mapped);
      const sourceChunks = await scrapePages(pages);

      await ctx.runMutation(api.companyBrain.markSynthesizing, {
        brainId: args.brainId,
      });

      const corpus = sourceChunks
        .map((chunk) => `SOURCE: ${chunk.url}\n${chunk.text}`)
        .join("\n\n---\n\n");

      const raw = await grokChat({
        system:
          "You extract a sales-onboarding company brain from website markdown. Return ONLY JSON.",
        user: `Website: ${brain.companyUrl}

Turn the scraped pages into this JSON shape:
{
  "companyName": string,
  "overview": string (4-7 sentences: what they sell, to whom, how they differentiate),
  "solutions": [
    {
      "name": string,
      "description": string,
      "icp": string,
      "pricingModel": string or omit,
      "differentiators": string[],
      "commonObjections": [{ "objection": string, "response": string }]
    }
  ],
  "caseStudies": [{ "title": string, "summary": string }]
}

Rules:
- 1-4 solutions. Invent nothing that is not supported by the sources.
- If pricing is not stated, omit pricingModel.
- Objections should be realistic for this ICP, with responses grounded in the source.
- caseStudies can be empty if none exist.

SCRAPED PAGES:
${corpus}`,
      });

      const parsed = extractJson<BrainShape>(raw);
      await ctx.runMutation(api.companyBrain.saveReady, {
        brainId: args.brainId,
        companyName: parsed.companyName || brain.companyName,
        overview: parsed.overview,
        solutions: parsed.solutions ?? [],
        caseStudies: parsed.caseStudies ?? [],
        sourceChunks,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Company research failed";
      await ctx.runMutation(api.companyBrain.markError, {
        brainId: args.brainId,
        errorMessage: message,
      });
    }
    return null;
  },
});
