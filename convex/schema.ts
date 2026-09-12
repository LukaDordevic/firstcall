import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  companyBrain: defineTable({
    companyUrl: v.string(),
    companyName: v.string(),
    status: v.union(
      v.literal("crawling"),
      v.literal("synthesizing"),
      v.literal("ready"),
      v.literal("error"),
    ),
    overview: v.optional(v.string()),
    solutions: v.optional(
      v.array(
        v.object({
          name: v.string(),
          description: v.string(),
          icp: v.string(),
          pricingModel: v.optional(v.string()),
          differentiators: v.array(v.string()),
          commonObjections: v.array(
            v.object({
              objection: v.string(),
              response: v.string(),
            }),
          ),
        }),
      ),
    ),
    caseStudies: v.optional(
      v.array(
        v.object({
          title: v.string(),
          summary: v.string(),
        }),
      ),
    ),
    sourceChunks: v.optional(
      v.array(
        v.object({
          url: v.string(),
          text: v.string(),
        }),
      ),
    ),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),

  leadQualifications: defineTable({
    companyBrainId: v.id("companyBrain"),
    leadUrl: v.string(),
    leadName: v.string(),
    status: v.union(
      v.literal("researching"),
      v.literal("ready"),
      v.literal("error"),
    ),
    signals: v.optional(v.array(v.string())),
    recommendedSolutions: v.optional(v.array(v.string())),
    qualifyingQuestions: v.optional(v.array(v.string())),
    reasoning: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_brain", ["companyBrainId"])
    .index("by_brain_and_created", ["companyBrainId", "createdAt"]),

  roleplaySessions: defineTable({
    leadQualificationId: v.id("leadQualifications"),
    personaBrief: v.optional(v.string()),
    transcript: v.array(
      v.object({
        role: v.union(v.literal("rep"), v.literal("persona")),
        text: v.string(),
        at: v.number(),
      }),
    ),
    status: v.union(v.literal("active"), v.literal("ended")),
    createdAt: v.number(),
  }).index("by_lead", ["leadQualificationId"]),

  learnChats: defineTable({
    companyBrainId: v.id("companyBrain"),
    messages: v.array(
      v.object({
        role: v.union(v.literal("rep"), v.literal("agent")),
        text: v.string(),
        citedSource: v.optional(v.string()),
      }),
    ),
    createdAt: v.number(),
  }).index("by_brain", ["companyBrainId"]),
});
