"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { api } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import { hostnameAsName, hostnameOf } from "./lib/parse";
import {
  exaSearch,
  exaSearchDetailed,
  grokJson,
} from "./lib/providers";

type CompanyItem = { name: string; url: string; oneLiner: string };

function ownHosts(companyUrl: string): string[] {
  const host = hostnameOf(companyUrl);
  const extras = [
    "wikipedia.org",
    "youtube.com",
    "reddit.com",
    "linkedin.com",
    "crunchbase.com",
  ];
  return host ? [host, `www.${host}`, ...extras] : extras;
}

function notOwnSite(
  item: { name: string; url: string },
  companyUrl: string,
  companyName: string,
): boolean {
  const host = hostnameOf(item.url);
  const own = hostnameOf(companyUrl);
  if (!host) return false;
  if (own && (host === own || host.endsWith(`.${own}`))) return false;
  const brand = companyName.toLowerCase().replace(/\s+/g, "");
  if (brand && host.replace(/[^a-z0-9]/g, "").includes(brand) && brand.length > 4) {
    return false;
  }
  return true;
}

async function findCompanies(args: {
  query: string;
  excludeDomains: string[];
  companyUrl: string;
  companyName: string;
  label: string;
}): Promise<CompanyItem[]> {
  let raw = await exaSearchDetailed(
    args.query,
    20,
    args.excludeDomains,
    "company",
  );
  if (raw.length < 8) {
    const extra = await exaSearchDetailed(args.query, 20, args.excludeDomains);
    const seen = new Set(raw.map((item) => item.url));
    raw = [...raw, ...extra.filter((item) => !seen.has(item.url))];
  }
  const filtered = raw.filter((item) =>
    notOwnSite(item, args.companyUrl, args.companyName),
  );

  try {
    const picked = await grokJson<{ items: CompanyItem[] }>({
      system:
        "You extract real third-party companies from search results. Return ONLY JSON.",
      user: `We sell for ${args.companyName} (${args.companyUrl}).
Need 12-16 REAL companies for: ${args.label}
Reject anything that is ${args.companyName}, their own product pages, news about them, or directories.

Search results:
${filtered
  .map((item) => `${item.title} | ${item.url}\n${item.text}`)
  .join("\n\n")}

Return { "items": [{ "name": string, "url": string, "oneLiner": string }] }
Use the company's own homepage URL when possible, not an article.`,
    });
    const items = (picked.items ?? []).filter((item) =>
      notOwnSite(item, args.companyUrl, args.companyName),
    );
    if (items.length >= 8) return items.slice(0, 16);
  } catch (error) {
    console.error("Company extract failed, using filtered Exa hits", error);
  }

  return filtered.slice(0, 16).map((item) => ({
    name: item.title.split(" | ")[0] || hostnameAsName(item.url),
    url: item.url,
    oneLiner: item.text.slice(0, 180),
  }));
}


export const generateForIndustryInternal = internalAction({
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

    const items = await findCompanies({
      query: `${industry.name} companies groups chains operators official company website`,
      excludeDomains: ownHosts(profile.companyUrl),
      companyUrl: profile.companyUrl,
      companyName: profile.companyName,
      label: `direct customers in ${industry.name}`,
    });

    if (items.length === 0) return 0;
    const ids = await ctx.runMutation(api.leads.insertMany, {
      gtmProfileId: profile._id,
      leadType: "customer",
      industryId: args.industryId,
      items,
    });
    await Promise.all(
      ids.map((leadId, index) =>
        ctx.scheduler.runAfter(index * 150, internal.leadsActions.prepareInternal, {
          leadId,
        }),
      ),
    );
    return ids.length;
  },
});

export const generateForPartnerInternal = internalAction({
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

    const items = await findCompanies({
      query: `${category.name} firms agencies platforms vendors official company website`,
      excludeDomains: ownHosts(profile.companyUrl),
      companyUrl: profile.companyUrl,
      companyName: profile.companyName,
      label: `partners in ${category.name}`,
    });

    if (items.length === 0) return 0;
    const ids = await ctx.runMutation(api.leads.insertMany, {
      gtmProfileId: profile._id,
      leadType: "partner",
      partnerCategoryId: args.partnerCategoryId,
      items,
    });
    await Promise.all(
      ids.map((leadId, index) =>
        ctx.scheduler.runAfter(index * 150, internal.leadsActions.prepareInternal, {
          leadId,
        }),
      ),
    );
    return ids.length;
  },
});

type PrepShape = {
  signals: string[];
  recommendedApproach: string;
  qualifyingQuestions: string[];
  reasoning: string;
};

export const prepareInternal = internalAction({
  args: { leadId: v.id("leads") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const lead = await ctx.runQuery(api.leads.get, { leadId: args.leadId });
    if (!lead) throw new Error("Lead not found");
    if (lead.status === "ready") return null;
    const profile = await ctx.runQuery(api.gtm.get, {
      profileId: lead.gtmProfileId,
    });
    if (!profile) throw new Error("GTM profile not found");

    await ctx.runMutation(api.leads.setStatus, {
      leadId: args.leadId,
      status: "researching",
    });

    try {
      const news = await exaSearch(
        `${lead.name} ${hostnameOf(lead.url)} news funding leadership 2026`,
      );

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
Known context: ${lead.oneLiner}
${context}

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

export const generateForIndustry = action({
  args: { industryId: v.id("industries") },
  returns: v.number(),
  handler: async (ctx, args): Promise<number> => {
    return await ctx.runAction(internal.leadsActions.generateForIndustryInternal, args);
  },
});

export const generateForPartnerCategory = action({
  args: { partnerCategoryId: v.id("partnerCategories") },
  returns: v.number(),
  handler: async (ctx, args): Promise<number> => {
    return await ctx.runAction(internal.leadsActions.generateForPartnerInternal, args);
  },
});

export const prepare = action({
  args: { leadId: v.id("leads") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runAction(internal.leadsActions.prepareInternal, args);
    return null;
  },
});
