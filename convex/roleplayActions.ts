"use node";

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { grokChat } from "./lib/providers";

export const start = action({
  args: { leadId: v.id("leads") },
  returns: v.id("rehearsals"),
  handler: async (ctx, args): Promise<Id<"rehearsals">> => {
    const lead = await ctx.runQuery(api.leads.get, { leadId: args.leadId });
    if (!lead || lead.status !== "ready") {
      throw new Error("Prepare the lead before starting roleplay");
    }
    const prep = await ctx.runQuery(api.leads.getPrep, { leadId: args.leadId });
    const profile = await ctx.runQuery(api.gtm.get, {
      profileId: lead.gtmProfileId,
    });

    const counterpart =
      lead.leadType === "partner"
        ? "a partnership decision-maker evaluating whether to work with us"
        : "a buyer at that company evaluating whether to take a meeting";

    const personaBrief = await grokChat({
      system:
        "You write short conversation personas for GTM roleplay. Plain prose, no JSON.",
      user: `Write a 6-10 sentence persona brief for ${counterpart} at ${lead.name} (${lead.url}).
Include role, priorities, likely objections, tone, and what a next step would take.
Our company: ${profile?.companyName ?? "the startup"}
Our offering: ${profile?.overview ?? ""}
Prep reasoning: ${prep?.reasoning ?? ""}
Recommended approach: ${prep?.recommendedApproach ?? ""}
Signals: ${(prep?.signals ?? []).join(" | ")}`,
      temperature: 0.5,
    });

    return await ctx.runMutation(api.roleplay.create, {
      leadId: args.leadId,
      personaBrief,
    });
  },
});

export const sendTurn = action({
  args: {
    sessionId: v.id("rehearsals"),
    text: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    const text = args.text.trim();
    if (!text) throw new Error("Say something before sending");

    const session = await ctx.runQuery(api.roleplay.get, {
      sessionId: args.sessionId,
    });
    if (!session) throw new Error("Roleplay session not found");
    if (session.status !== "active") {
      throw new Error("This roleplay has ended");
    }

    const lead = await ctx.runQuery(api.leads.get, { leadId: session.leadId });
    if (!lead) throw new Error("Lead not found");

    await ctx.runMutation(api.roleplay.appendTurns, {
      sessionId: args.sessionId,
      turns: [{ role: "rep", text, at: Date.now() }],
    });

    const history = [...session.transcript, { role: "rep" as const, text }]
      .map((turn) => `${turn.role === "rep" ? "REP" : "COUNTERPART"}: ${turn.text}`)
      .join("\n");

    const reply = await grokChat({
      system: `You are the counterpart in a live GTM roleplay. Stay in character.
Persona:
${session.personaBrief ?? "Skeptical but polite."}

Company: ${lead.name}
Type: ${lead.leadType}
Rules:
- Reply in 2-4 spoken sentences. No lists, no markdown.
- Be specific. Push back. Ask a hard question when earned.
- Never break character or mention that you are an AI.`,
      user: history,
      temperature: 0.6,
    });

    await ctx.runMutation(api.roleplay.appendTurns, {
      sessionId: args.sessionId,
      turns: [{ role: "persona", text: reply.trim(), at: Date.now() }],
    });

    return reply.trim();
  },
});
