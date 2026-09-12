import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { learnChatValidator, learnMessageValidator } from "./validators";

export const getOrCreate = mutation({
  args: { companyBrainId: v.id("companyBrain") },
  returns: v.id("learnChats"),
  handler: async (ctx, args) => {
    const brain = await ctx.db.get(args.companyBrainId);
    if (!brain) throw new Error("Company brain not found");
    const existing = await ctx.db
      .query("learnChats")
      .withIndex("by_brain", (q) => q.eq("companyBrainId", args.companyBrainId))
      .order("desc")
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("learnChats", {
      companyBrainId: args.companyBrainId,
      messages: [],
      createdAt: Date.now(),
    });
  },
});

export const get = query({
  args: { chatId: v.id("learnChats") },
  returns: v.union(learnChatValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.chatId);
  },
});

export const forBrain = query({
  args: { companyBrainId: v.id("companyBrain") },
  returns: v.union(learnChatValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("learnChats")
      .withIndex("by_brain", (q) => q.eq("companyBrainId", args.companyBrainId))
      .order("desc")
      .first();
  },
});

export const appendMessages = mutation({
  args: {
    chatId: v.id("learnChats"),
    messages: v.array(learnMessageValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.chatId);
    if (!chat) throw new Error("Learn chat not found");
    await ctx.db.patch(args.chatId, {
      messages: [...chat.messages, ...args.messages],
    });
    return null;
  },
});
