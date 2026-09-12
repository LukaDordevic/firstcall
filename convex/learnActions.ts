"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { extractJson } from "./lib/parse";
import { grokChat } from "./lib/providers";

type AnswerShape = {
  answer: string;
  citedSource?: string;
};

export const ask = action({
  args: {
    companyBrainId: v.id("companyBrain"),
    question: v.string(),
  },
  returns: v.object({
    chatId: v.id("learnChats"),
    answer: v.string(),
    citedSource: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const question = args.question.trim();
    if (!question) throw new Error("Ask a question first");

    const brain = await ctx.runQuery(api.companyBrain.get, {
      brainId: args.companyBrainId,
    });
    if (!brain || brain.status !== "ready") {
      throw new Error("Company brain is not ready");
    }

    const chatId = await ctx.runMutation(api.learn.getOrCreate, {
      companyBrainId: args.companyBrainId,
    });

    await ctx.runMutation(api.learn.appendMessages, {
      chatId,
      messages: [{ role: "rep", text: question }],
    });

    const sources = (brain.sourceChunks ?? [])
      .map((chunk) => `${chunk.url}`)
      .join("\n");

    const raw = await grokChat({
      system:
        "You are an onboarding coach for a new B2B sales rep. Answer ONLY from the company brain. Return JSON.",
      user: `Company: ${brain.companyName}
Overview: ${brain.overview ?? ""}
Solutions: ${JSON.stringify(brain.solutions ?? [])}
Case studies: ${JSON.stringify(brain.caseStudies ?? [])}
Known source URLs:
${sources}

Question: ${question}

Return JSON: { "answer": string, "citedSource": string (one of the source URLs if used, otherwise omit) }
If the brain does not contain the answer, say so clearly and do not invent pricing or customers.`,
    });

    const parsed = extractJson<AnswerShape>(raw);
    await ctx.runMutation(api.learn.appendMessages, {
      chatId,
      messages: [
        {
          role: "agent",
          text: parsed.answer,
          citedSource: parsed.citedSource,
        },
      ],
    });

    return {
      chatId,
      answer: parsed.answer,
      citedSource: parsed.citedSource,
    };
  },
});
