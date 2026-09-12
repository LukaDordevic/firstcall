"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import {
  firecrawlMap,
  grokJson,
  pickSitePages,
  scrapePages,
} from "./lib/providers";

type BrainShape = {
  companyName: string;
  overview: string;
  offering: Array<{
    name: string;
    description: string;
    differentiators: string[];
  }>;
  industries: Array<{
    name: string;
    reasoning: string;
    qualifyingQuestions: string[];
    gtmStrategy: string;
  }>;
  partnerCategories: Array<{
    name: string;
    reasoning: string;
    approachStrategy: string;
    proposalAngle: string;
  }>;
};

export const build = action({
  args: { profileId: v.id("gtmProfile") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await ctx.runQuery(api.gtm.get, {
      profileId: args.profileId,
    });
    if (!profile) throw new Error("GTM profile not found");

    try {
      let mapped: string[] = [];
      try {
        mapped = await firecrawlMap(profile.companyUrl);
      } catch (error) {
        console.error("Firecrawl map failed", error);
      }
      const pages = pickSitePages(profile.companyUrl, mapped);
      const chunks = await scrapePages(pages);
      const corpus = chunks
        .map((chunk) => `SOURCE: ${chunk.url}\n${chunk.text}`)
        .join("\n\n---\n\n");

      const parsed = await grokJson<BrainShape>({
        system:
          "You are a B2B GTM strategist. Return ONLY JSON. No consumer/B2C advice.",
        user: `Startup website: ${profile.companyUrl}

From the scraped pages, return:
{
  "companyName": string,
  "overview": string (4-6 sentences: what they sell, to whom, why it is B2B),
  "offering": [{ "name": string, "description": string, "differentiators": string[] }],
  "industries": [
    {
      "name": string,
      "reasoning": string,
      "qualifyingQuestions": string[] (4-6),
      "gtmStrategy": string
    }
  ],
  "partnerCategories": [
    {
      "name": string,
      "reasoning": string,
      "approachStrategy": string,
      "proposalAngle": string
    }
  ]
}

Rules:
- 3-5 target industries a brand-new startup could actually sell into first.
- 3-4 partner categories (agencies, platforms, SIs, complementary vendors).
- Invent nothing the sources cannot support; if thin, say so in reasoning.
- B2B only.

SCRAPED PAGES:
${corpus}`,
      });

      await ctx.runMutation(api.gtm.saveReady, {
        profileId: args.profileId,
        companyName: parsed.companyName || profile.companyName,
        overview: parsed.overview,
        offering: parsed.offering ?? [],
        industries: (parsed.industries ?? []).slice(0, 5),
        partnerCategories: (parsed.partnerCategories ?? []).slice(0, 4),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "GTM research failed";
      await ctx.runMutation(api.gtm.markError, {
        profileId: args.profileId,
        errorMessage: message,
      });
    }
    return null;
  },
});
