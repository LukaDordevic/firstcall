import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  gtmProfile: defineTable({
    companyUrl: v.string(),
    companyName: v.string(),
    status: v.union(
      v.literal("building"),
      v.literal("ready"),
      v.literal("error"),
    ),
    overview: v.optional(v.string()),
    offering: v.optional(
      v.array(
        v.object({
          name: v.string(),
          description: v.string(),
          differentiators: v.array(v.string()),
        }),
      ),
    ),
    uploadedDocText: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),

  industries: defineTable({
    gtmProfileId: v.id("gtmProfile"),
    name: v.string(),
    reasoning: v.string(),
    qualifyingQuestions: v.array(v.string()),
    gtmStrategy: v.string(),
    createdAt: v.number(),
  }).index("by_profile", ["gtmProfileId"]),

  partnerCategories: defineTable({
    gtmProfileId: v.id("gtmProfile"),
    name: v.string(),
    reasoning: v.string(),
    approachStrategy: v.string(),
    proposalAngle: v.string(),
    createdAt: v.number(),
  }).index("by_profile", ["gtmProfileId"]),

  leads: defineTable({
    gtmProfileId: v.id("gtmProfile"),
    leadType: v.union(v.literal("customer"), v.literal("partner")),
    industryId: v.optional(v.id("industries")),
    partnerCategoryId: v.optional(v.id("partnerCategories")),
    name: v.string(),
    url: v.string(),
    oneLiner: v.string(),
    status: v.union(
      v.literal("new"),
      v.literal("researching"),
      v.literal("ready"),
      v.literal("error"),
    ),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_profile", ["gtmProfileId"])
    .index("by_profile_and_type", ["gtmProfileId", "leadType"])
    .index("by_industry", ["industryId"])
    .index("by_partner_category", ["partnerCategoryId"]),

  leadPrep: defineTable({
    leadId: v.id("leads"),
    signals: v.array(v.string()),
    recommendedApproach: v.string(),
    qualifyingQuestions: v.array(v.string()),
    reasoning: v.string(),
    createdAt: v.number(),
  }).index("by_lead", ["leadId"]),

  rehearsals: defineTable({
    leadId: v.id("leads"),
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
  }).index("by_lead", ["leadId"]),
});
