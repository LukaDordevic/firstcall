"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { hostnameAsName } from "./lib/parse";
import {
  exaSearch,
  exaSearchDetailed,
  firecrawlScrape,
  grokJson,
} from "./lib/providers";

function offeringLine(overview?: string): string {
  return (overview ?? "this B2B product").slice(0, 180);
}

export const generateForIndustry = action({
  args: { industryId: v.id("industries") },
  returns: v.number(),
  handler: async (ctx, args): Promise<number> => {
    const industry = await ctx.runQuery(api.gtm.getIndustry, {
      industryId: args.industryId,
    });
    if (!industry) throw new Error("Industry not found");
    const profile = await ctx.runQuery(api.gtm.get, {
      profileId: industry.gtmProfileId,
    });
    if (!profile || profile.status !== "ready") {
      throw new Error("Build a GTM brain first");
    }

    const results = await exaSearchDetailed(
      `${industry.name} companies that could buy ${offeringLine(profile.overview)}`,
      8,
    );
    const items = results.slice(0, 5).map((result) => ({
      name: result.title || hostnameAsName(result.url),
      url: result.url,
      oneLiner: result.text.slice(0, 180) || industry.name,
    }));
    const ids = await ctx.runMutation(api.leads.insertMany, {
      gtmProfileId: profile._id,
      leadType: "customer",
      industryId: args.industryId,
      items,
    });
    return ids.length;
  },
});

export const generateForPartnerCategory = action({
  args: { partnerCategoryId: v.id("partnerCategories") },
  returns: v.number(),
  handler: async (ctx, args): Promise<number> => {
    const category = await ctx.runQuery(api.gtm.getPartnerCategory, {
      partnerCategoryId: args.partnerCategoryId,
    });
    if (!category) throw new Error("Partner category not found");
    const profile = await ctx.runQuery(api.gtm.get, {
      profileId: category.gtmProfileId,
    });
    if (!profile || profile.status !== "ready") {
      throw new Error("Build a GTM brain first");
    }

    const results = await exaSearchDetailed(
      `companies well positioned to partner with ${offeringLine(profile.overview)} in ${category.name}`,
      8,
    );
    const items = results.slice(0, 5).map((result) => ({
      name: result.title || hostnameAsName(result.url),
      url: result.url,
      oneLiner: result.text.slice(0, 180) || category.name,
    }));
    const ids = await ctx.runMutation(api.leads.insertMany, {
      gtmProfileId: profile._id,
      leadType: "partner",
      partnerCategoryId: args.partnerCategoryId,
      items,
    });
    return ids.length;
  },
});

type PrepShape = {
  signals: string[];
  recommendedApproach: string;
  qualifyingQuestions: string[];
  reasoning: string;
};

export const prepare = action({
  args: { leadId: v.id("leads") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const lead = await ctx.runQuery(api.leads.get, { leadId: args.leadId });
    if (!lead) throw new Error("Lead not found");
    const profile = await ctx.runQuery(api.gtm.get, {
      profileId: lead.gtmProfileId,
    });
    if (!profile) throw new Error("GTM profile not found");

    await ctx.runMutation(api.leads.setStatus, {
      leadId: args.leadId,
      status: "researching",
    });

    try {
      let siteText = "";
      try {
        const page = await firecrawlScrape(lead.url);
        siteText = page.markdown.slice(0, 5000);
      } catch (error) {
        console.error("Lead scrape failed", error);
      }
      const news = await exaSearch(`${lead.name} news funding leadership 2026`);

      let context = "";
      if (lead.leadType === "customer" && lead.industryId) {
        const industry = await ctx.runQuery(api.gtm.getIndustry, {
          industryId: lead.industryId,
        });
        if (industry) {
          context = `Industry: ${industry.name}\nWhy: ${industry.reasoning}\nGTM: ${industry.gtmStrategy}`;
        }
      }
      if (lead.leadType === "partner" && lead.partnerCategoryId) {
        const category = await ctx.runQuery(api.gtm.getPartnerCategory, {
          partnerCategoryId: lead.partnerCategoryId,
        });
        if (category) {
          context = `Partner category: ${category.name}\nWhy: ${category.reasoning}\nApproach: ${category.approachStrategy}\nAngle: ${category.proposalAngle}`;
        }
      }

      const parsed = await grokJson<PrepShape>({
        system:
          "You prepare a first B2B conversation. Return ONLY JSON. Be specific to this company.",
        user: `Our company: ${profile.companyName}
Overview: ${profile.overview ?? ""}
Offering: ${JSON.stringify(profile.offering ?? [])}

This lead (${lead.leadType}): ${lead.name} — ${lead.url}
One-liner: ${lead.oneLiner}
${context}

Their site:
${siteText || "Scrape failed; use the one-liner and news only."}

News/signals:
${news.join("\n\n") || "None"}

Return:
{
  "signals": string[] (3-6 concrete),
  "recommendedApproach": string (how to open and what to ask for),
  "qualifyingQuestions": string[] (at least 5, tailored),
  "reasoning": string
}`,
      });

      await ctx.runMutation(api.leads.savePrep, {
        leadId: args.leadId,
        signals: parsed.signals ?? [],
        recommendedApproach: parsed.recommendedApproach,
        qualifyingQuestions: parsed.qualifyingQuestions ?? [],
        reasoning: parsed.reasoning,
      });
    } catch (error) {
      await ctx.runMutation(api.leads.setStatus, {
        leadId: args.leadId,
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Lead prep failed",
      });
    }
    return null;
  },
});
