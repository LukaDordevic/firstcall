import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { hostnameAsName, normalizeUrl } from "./lib/parse";
import { leadValidator } from "./validators";

export const start = mutation({
  args: {
    companyBrainId: v.id("companyBrain"),
    leadUrl: v.string(),
  },
  returns: v.id("leadQualifications"),
  handler: async (ctx, args) => {
    const brain = await ctx.db.get(args.companyBrainId);
    if (!brain) throw new Error("Company brain not found");
    if (brain.status !== "ready") {
      throw new Error("Company brain is not ready yet");
    }
    const leadUrl = normalizeUrl(args.leadUrl);
    return await ctx.db.insert("leadQualifications", {
      companyBrainId: args.companyBrainId,
      leadUrl,
      leadName: hostnameAsName(leadUrl),
      status: "researching",
      createdAt: Date.now(),
    });
  },
});

export const get = query({
  args: { leadId: v.id("leadQualifications") },
  returns: v.union(leadValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.leadId);
  },
});

export const list = query({
  args: { companyBrainId: v.id("companyBrain") },
  returns: v.array(leadValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("leadQualifications")
      .withIndex("by_brain_and_created", (q) =>
        q.eq("companyBrainId", args.companyBrainId),
      )
      .order("desc")
      .take(20);
  },
});

export const saveReady = mutation({
  args: {
    leadId: v.id("leadQualifications"),
    leadName: v.string(),
    signals: v.array(v.string()),
    recommendedSolutions: v.array(v.string()),
    qualifyingQuestions: v.array(v.string()),
    reasoning: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) throw new Error("Lead not found");
    await ctx.db.patch(args.leadId, {
      status: "ready",
      leadName: args.leadName,
      signals: args.signals,
      recommendedSolutions: args.recommendedSolutions,
      qualifyingQuestions: args.qualifyingQuestions,
      reasoning: args.reasoning,
      errorMessage: undefined,
    });
    return null;
  },
});

export const markError = mutation({
  args: { leadId: v.id("leadQualifications"), errorMessage: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) throw new Error("Lead not found");
    await ctx.db.patch(args.leadId, {
      status: "error",
      errorMessage: args.errorMessage,
    });
    return null;
  },
});
