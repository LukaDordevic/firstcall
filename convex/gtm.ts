import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { hostnameAsName, normalizeUrl } from "./lib/parse";
import {
  gtmProfileValidator,
  industryValidator,
  offeringValidator,
  partnerCategoryValidator,
} from "./validators";

export const start = mutation({
  args: { companyUrl: v.string() },
  returns: v.id("gtmProfile"),
  handler: async (ctx, args) => {
    const companyUrl = normalizeUrl(args.companyUrl);
    return await ctx.db.insert("gtmProfile", {
      companyUrl,
      companyName: hostnameAsName(companyUrl),
      status: "building",
      createdAt: Date.now(),
    });
  },
});

export const get = query({
  args: { profileId: v.id("gtmProfile") },
  returns: v.union(gtmProfileValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.profileId);
  },
});

export const latest = query({
  args: {},
  returns: v.union(gtmProfileValidator, v.null()),
  handler: async (ctx) => {
    return await ctx.db
      .query("gtmProfile")
      .withIndex("by_createdAt")
      .order("desc")
      .first();
  },
});

export const saveReady = mutation({
  args: {
    profileId: v.id("gtmProfile"),
    companyName: v.string(),
    overview: v.string(),
    offering: v.array(offeringValidator),
    industries: v.array(
      v.object({
        name: v.string(),
        reasoning: v.string(),
        qualifyingQuestions: v.array(v.string()),
        gtmStrategy: v.string(),
      }),
    ),
    partnerCategories: v.array(
      v.object({
        name: v.string(),
        reasoning: v.string(),
        approachStrategy: v.string(),
        proposalAngle: v.string(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("GTM profile not found");
    await ctx.db.patch(args.profileId, {
      status: "ready",
      companyName: args.companyName,
      overview: args.overview,
      offering: args.offering,
      errorMessage: undefined,
    });
    const now = Date.now();
    for (const industry of args.industries) {
      await ctx.db.insert("industries", {
        gtmProfileId: args.profileId,
        ...industry,
        createdAt: now,
      });
    }
    for (const category of args.partnerCategories) {
      await ctx.db.insert("partnerCategories", {
        gtmProfileId: args.profileId,
        ...category,
        createdAt: now,
      });
    }
    return null;
  },
});

export const markError = mutation({
  args: { profileId: v.id("gtmProfile"), errorMessage: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("GTM profile not found");
    await ctx.db.patch(args.profileId, {
      status: "error",
      errorMessage: args.errorMessage,
    });
    return null;
  },
});

export const listIndustries = query({
  args: { profileId: v.id("gtmProfile") },
  returns: v.array(industryValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("industries")
      .withIndex("by_profile", (q) => q.eq("gtmProfileId", args.profileId))
      .take(20);
  },
});

export const getIndustry = query({
  args: { industryId: v.id("industries") },
  returns: v.union(industryValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.industryId);
  },
});

export const getPartnerCategory = query({
  args: { partnerCategoryId: v.id("partnerCategories") },
  returns: v.union(partnerCategoryValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.partnerCategoryId);
  },
});

export const listPartnerCategories = query({
  args: { profileId: v.id("gtmProfile") },
  returns: v.array(partnerCategoryValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("partnerCategories")
      .withIndex("by_profile", (q) => q.eq("gtmProfileId", args.profileId))
      .take(20);
  },
});
