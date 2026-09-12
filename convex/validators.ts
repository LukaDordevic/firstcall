import { v } from "convex/values";

export const offeringValidator = v.object({
  name: v.string(),
  description: v.string(),
  differentiators: v.array(v.string()),
});

export const gtmProfileValidator = v.object({
  _id: v.id("gtmProfile"),
  _creationTime: v.number(),
  companyUrl: v.string(),
  companyName: v.string(),
  status: v.union(
    v.literal("building"),
    v.literal("ready"),
    v.literal("error"),
  ),
  overview: v.optional(v.string()),
  offering: v.optional(v.array(offeringValidator)),
  uploadedDocText: v.optional(v.string()),
  errorMessage: v.optional(v.string()),
  createdAt: v.number(),
});

export const industryValidator = v.object({
  _id: v.id("industries"),
  _creationTime: v.number(),
  gtmProfileId: v.id("gtmProfile"),
  name: v.string(),
  reasoning: v.string(),
  qualifyingQuestions: v.array(v.string()),
  gtmStrategy: v.string(),
  createdAt: v.number(),
});

export const partnerCategoryValidator = v.object({
  _id: v.id("partnerCategories"),
  _creationTime: v.number(),
  gtmProfileId: v.id("gtmProfile"),
  name: v.string(),
  reasoning: v.string(),
  approachStrategy: v.string(),
  proposalAngle: v.string(),
  createdAt: v.number(),
});

export const leadValidator = v.object({
  _id: v.id("leads"),
  _creationTime: v.number(),
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
});

export const leadPrepValidator = v.object({
  _id: v.id("leadPrep"),
  _creationTime: v.number(),
  leadId: v.id("leads"),
  signals: v.array(v.string()),
  recommendedApproach: v.string(),
  qualifyingQuestions: v.array(v.string()),
  reasoning: v.string(),
  createdAt: v.number(),
});

export const transcriptTurnValidator = v.object({
  role: v.union(v.literal("rep"), v.literal("persona")),
  text: v.string(),
  at: v.number(),
});

export const rehearsalValidator = v.object({
  _id: v.id("rehearsals"),
  _creationTime: v.number(),
  leadId: v.id("leads"),
  personaBrief: v.optional(v.string()),
  transcript: v.array(transcriptTurnValidator),
  status: v.union(v.literal("active"), v.literal("ended")),
  createdAt: v.number(),
});
