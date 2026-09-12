import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { rehearsalValidator, transcriptTurnValidator } from "./validators";

export const create = mutation({
  args: {
    leadId: v.id("leads"),
    personaBrief: v.string(),
  },
  returns: v.id("rehearsals"),
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) throw new Error("Lead not found");
    if (lead.status !== "ready") {
      throw new Error("Prepare the lead before roleplay");
    }
    return await ctx.db.insert("rehearsals", {
      leadId: args.leadId,
      personaBrief: args.personaBrief,
      transcript: [],
      status: "active",
      createdAt: Date.now(),
    });
  },
});

export const get = query({
  args: { sessionId: v.id("rehearsals") },
  returns: v.union(rehearsalValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const latestForLead = query({
  args: { leadId: v.id("leads") },
  returns: v.union(rehearsalValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rehearsals")
      .withIndex("by_lead", (q) => q.eq("leadId", args.leadId))
      .order("desc")
      .first();
  },
});

export const appendTurns = mutation({
  args: {
    sessionId: v.id("rehearsals"),
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
  args: { sessionId: v.id("rehearsals") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Roleplay session not found");
    await ctx.db.patch(args.sessionId, { status: "ended" });
    return null;
  },
});
