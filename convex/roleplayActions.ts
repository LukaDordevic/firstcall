"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { grokChat } from "./lib/providers";

export const start = action({
  args: { leadQualificationId: v.id("leadQualifications") },
  returns: v.id("roleplaySessions"),
  handler: async (ctx, args) => {
    const lead = await ctx.runQuery(api.leads.get, {
      leadId: args.leadQualificationId,
    });
    if (!lead || lead.status !== "ready") {
      throw new Error("Qualify the lead before starting roleplay");
    }
    const brain = await ctx.runQuery(api.companyBrain.get, {
      brainId: lead.companyBrainId,
    });
    if (!brain) throw new Error("Company brain not found");

    const personaBrief = await grokChat({
      system:
        "You write short buyer personas for sales roleplay. Plain prose, no JSON.",
      user: `Write a 6-10 sentence persona brief for a realistic buyer at ${lead.leadName} (${lead.leadUrl}).
Include: likely role and seniority, priorities this quarter, likely objections, tone of voice, and what would make them take a next meeting.
Our company: ${brain.companyName}
Our recommended solutions: ${(lead.recommendedSolutions ?? []).join(", ")}
Reasoning: ${lead.reasoning ?? ""}
Signals: ${(lead.signals ?? []).join(" | ")}`,
      temperature: 0.5,
    });

    return await ctx.runMutation(api.roleplay.create, {
      leadQualificationId: args.leadQualificationId,
      personaBrief,
    });
  },
});

export const sendTurn = action({
  args: {
    sessionId: v.id("roleplaySessions"),
    text: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const text = args.text.trim();
    if (!text) throw new Error("Say something before sending");

    const session = await ctx.runQuery(api.roleplay.get, {
      sessionId: args.sessionId,
    });
    if (!session) throw new Error("Roleplay session not found");
    if (session.status !== "active") {
      throw new Error("This roleplay has ended");
    }

    const lead = await ctx.runQuery(api.leads.get, {
      leadId: session.leadQualificationId,
    });
    if (!lead) throw new Error("Lead not found");

    const now = Date.now();
    await ctx.runMutation(api.roleplay.appendTurns, {
      sessionId: args.sessionId,
      turns: [{ role: "rep", text, at: now }],
    });

    const history = [...session.transcript, { role: "rep" as const, text }]
      .map((turn) => `${turn.role === "rep" ? "REP" : "BUYER"}: ${turn.text}`)
      .join("\n");

    const reply = await grokChat({
      system: `You are the buyer in a live sales roleplay. Stay in character.
Persona:
${session.personaBrief ?? "Skeptical but polite economic buyer."}

Company: ${lead.leadName}
Rules:
- Reply in 2-4 spoken sentences. No lists, no markdown.
- Be specific to this company. Push back. Ask a hard question when earned.
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
