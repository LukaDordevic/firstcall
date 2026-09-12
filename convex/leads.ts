import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { leadPrepValidator, leadValidator } from "./validators";

export const get = query({
  args: { leadId: v.id("leads") },
  returns: v.union(leadValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.leadId);
  },
});

export const list = query({
  args: {
    gtmProfileId: v.id("gtmProfile"),
    leadType: v.optional(v.union(v.literal("customer"), v.literal("partner"))),
  },
  returns: v.array(leadValidator),
  handler: async (ctx, args) => {
    if (args.leadType) {
      return await ctx.db
        .query("leads")
        .withIndex("by_profile_and_type", (q) =>
          q.eq("gtmProfileId", args.gtmProfileId).eq("leadType", args.leadType!),
        )
        .order("desc")
        .take(200);
    }
    return await ctx.db
      .query("leads")
      .withIndex("by_profile", (q) => q.eq("gtmProfileId", args.gtmProfileId))
      .order("desc")
      .take(200);
  },
});

export const insertMany = mutation({
  args: {
    gtmProfileId: v.id("gtmProfile"),
    leadType: v.union(v.literal("customer"), v.literal("partner")),
    industryId: v.optional(v.id("industries")),
    partnerCategoryId: v.optional(v.id("partnerCategories")),
    items: v.array(
      v.object({
        name: v.string(),
        url: v.string(),
        oneLiner: v.string(),
      }),
    ),
  },
  returns: v.array(v.id("leads")),
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.gtmProfileId);
    if (!profile || profile.status !== "ready") {
      throw new Error("GTM profile is not ready");
    }
    const ids: Array<Id<"leads">> = [];
    const now = Date.now();
    for (const item of args.items) {
      const id = await ctx.db.insert("leads", {
        gtmProfileId: args.gtmProfileId,
        leadType: args.leadType,
        industryId: args.industryId,
        partnerCategoryId: args.partnerCategoryId,
        name: item.name,
        url: item.url,
        oneLiner: item.oneLiner,
        status: "new",
        createdAt: now,
      });
      ids.push(id);
    }
    return ids;
  },
});

export const setStatus = mutation({
  args: {
    leadId: v.id("leads"),
    status: v.union(
      v.literal("new"),
      v.literal("researching"),
      v.literal("ready"),
      v.literal("error"),
    ),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) throw new Error("Lead not found");
    await ctx.db.patch(args.leadId, {
      status: args.status,
      errorMessage: args.errorMessage,
    });
    return null;
  },
});

export const savePrep = mutation({
  args: {
    leadId: v.id("leads"),
    signals: v.array(v.string()),
    recommendedApproach: v.string(),
    qualifyingQuestions: v.array(v.string()),
    reasoning: v.string(),
  },
  returns: v.id("leadPrep"),
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) throw new Error("Lead not found");
    const existing = await ctx.db
      .query("leadPrep")
      .withIndex("by_lead", (q) => q.eq("leadId", args.leadId))
      .first();
    const payload = {
      leadId: args.leadId,
      signals: args.signals,
      recommendedApproach: args.recommendedApproach,
      qualifyingQuestions: args.qualifyingQuestions,
      reasoning: args.reasoning,
      createdAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
      await ctx.db.patch(args.leadId, { status: "ready", errorMessage: undefined });
      return existing._id;
    }
    const prepId = await ctx.db.insert("leadPrep", payload);
    await ctx.db.patch(args.leadId, { status: "ready", errorMessage: undefined });
    return prepId;
  },
});

export const getPrep = query({
  args: { leadId: v.id("leads") },
  returns: v.union(leadPrepValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("leadPrep")
      .withIndex("by_lead", (q) => q.eq("leadId", args.leadId))
      .first();
  },
});
