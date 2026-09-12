import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { hostnameAsName, normalizeUrl } from "./lib/parse";
import {
  caseStudyValidator,
  companyBrainValidator,
  solutionValidator,
  sourceChunkValidator,
} from "./validators";

export const start = mutation({
  args: { companyUrl: v.string() },
  returns: v.id("companyBrain"),
  handler: async (ctx, args) => {
    const companyUrl = normalizeUrl(args.companyUrl);
    return await ctx.db.insert("companyBrain", {
      companyUrl,
      companyName: hostnameAsName(companyUrl),
      status: "crawling",
      createdAt: Date.now(),
    });
  },
});

export const get = query({
  args: { brainId: v.id("companyBrain") },
  returns: v.union(companyBrainValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.brainId);
  },
});

export const latest = query({
  args: {},
  returns: v.union(companyBrainValidator, v.null()),
  handler: async (ctx) => {
    return await ctx.db
      .query("companyBrain")
      .withIndex("by_createdAt")
      .order("desc")
      .first();
  },
});

export const markSynthesizing = mutation({
  args: { brainId: v.id("companyBrain") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const brain = await ctx.db.get(args.brainId);
    if (!brain) throw new Error("Company brain not found");
    await ctx.db.patch(args.brainId, { status: "synthesizing" });
    return null;
  },
});

export const saveReady = mutation({
  args: {
    brainId: v.id("companyBrain"),
    companyName: v.string(),
    overview: v.string(),
    solutions: v.array(solutionValidator),
    caseStudies: v.array(caseStudyValidator),
    sourceChunks: v.array(sourceChunkValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const brain = await ctx.db.get(args.brainId);
    if (!brain) throw new Error("Company brain not found");
    await ctx.db.patch(args.brainId, {
      status: "ready",
      companyName: args.companyName,
      overview: args.overview,
      solutions: args.solutions,
      caseStudies: args.caseStudies,
      sourceChunks: args.sourceChunks,
      errorMessage: undefined,
    });
    return null;
  },
});

export const markError = mutation({
  args: { brainId: v.id("companyBrain"), errorMessage: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const brain = await ctx.db.get(args.brainId);
    if (!brain) throw new Error("Company brain not found");
    await ctx.db.patch(args.brainId, {
      status: "error",
      errorMessage: args.errorMessage,
    });
    return null;
  },
});
