"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { extractJson, hostnameAsName } from "./lib/parse";
import { exaSearch, grokChat, scrapePages } from "./lib/providers";

type QualifyShape = {
  leadName: string;
  signals: string[];
  recommendedSolutions: string[];
  qualifyingQuestions: string[];
  reasoning: string;
};

export const qualify = action({
  args: { leadId: v.id("leadQualifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const lead = await ctx.runQuery(api.leads.get, { leadId: args.leadId });
    if (!lead) throw new Error("Lead not found");

    const brain = await ctx.runQuery(api.companyBrain.get, {
      brainId: lead.companyBrainId,
    });
    if (!brain || brain.status !== "ready") {
      throw new Error("Company brain is not ready");
    }

    try {
      const pages = await scrapePages([lead.leadUrl]);
      const leadNameGuess = hostnameAsName(lead.leadUrl);
      const news = await exaSearch(
        `${leadNameGuess} news funding leadership 2026`,
      );

      const solutions = (brain.solutions ?? [])
        .map(
          (solution) =>
            `${solution.name}: ${solution.description} | ICP: ${solution.icp} | Differentiators: ${solution.differentiators.join("; ")}`,
        )
        .join("\n");

      const raw = await grokChat({
        system:
          "You are a B2B sales coach. Cross-reference a prospect against our solutions. Return ONLY JSON.",
        user: `Our company: ${brain.companyName}
Overview: ${brain.overview ?? ""}
Solutions:
${solutions}

Prospect site (${lead.leadUrl}):
${pages.map((page) => page.text).join("\n\n")}

Outside signals from news/search:
${news.join("\n\n") || "None found"}

Return JSON:
{
  "leadName": string,
  "signals": string[] (3-6 concrete news/site signals),
  "recommendedSolutions": string[] (names from OUR solutions that fit),
  "qualifyingQuestions": string[] (at least 5 tailored questions for a discovery call),
  "reasoning": string (why these solutions fit, 1 short paragraph)
}`,
      });

      const parsed = extractJson<QualifyShape>(raw);
      await ctx.runMutation(api.leads.saveReady, {
        leadId: args.leadId,
        leadName: parsed.leadName || lead.leadName,
        signals: parsed.signals ?? news.slice(0, 4),
        recommendedSolutions: parsed.recommendedSolutions ?? [],
        qualifyingQuestions: parsed.qualifyingQuestions ?? [],
        reasoning: parsed.reasoning,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Lead research failed";
      await ctx.runMutation(api.leads.markError, {
        leadId: args.leadId,
        errorMessage: message,
      });
    }
    return null;
  },
});
