import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { roleplayValidator, transcriptTurnValidator } from "./validators";

export const create = mutation({
  args: {
    leadQualificationId: v.id("leadQualifications"),
    personaBrief: v.string(),
  },
  returns: v.id("roleplaySessions"),
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadQualificationId);
    if (!lead) throw new Error("Lead not found");
    if (lead.status !== "ready") {
      throw new Error("Qualify the lead before roleplay");
    }
    return await ctx.db.insert("roleplaySessions", {
      leadQualificationId: args.leadQualificationId,
      personaBrief: args.personaBrief,
      transcript: [],
      status: "active",
      createdAt: Date.now(),
    });
  },
});

export const get = query({
  args: { sessionId: v.id("roleplaySessions") },
  returns: v.union(roleplayValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const latestForLead = query({
  args: { leadQualificationId: v.id("leadQualifications") },
  returns: v.union(roleplayValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("roleplaySessions")
      .withIndex("by_lead", (q) =>
        q.eq("leadQualificationId", args.leadQualificationId),
      )
      .order("desc")
      .first();
  },
});

export const appendTurns = mutation({
  args: {
    sessionId: v.id("roleplaySessions"),
    turns: v.array(transcriptTurnValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Roleplay session not found");
    if (session.status !== "active") {
      throw new Error("This roleplay has ended");
    }
    await ctx.db.patch(args.sessionId, {
      transcript: [...session.transcript, ...args.turns],
    });
    return null;
  },
});

export const end = mutation({
  args: { sessionId: v.id("roleplaySessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Roleplay session not found");
    await ctx.db.patch(args.sessionId, { status: "ended" });
    return null;
  },
});
