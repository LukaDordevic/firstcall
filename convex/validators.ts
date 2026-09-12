import { v } from "convex/values";

export const solutionValidator = v.object({
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
});

export const caseStudyValidator = v.object({
  title: v.string(),
  summary: v.string(),
});

export const sourceChunkValidator = v.object({
  url: v.string(),
  text: v.string(),
});

export const companyBrainValidator = v.object({
  _id: v.id("companyBrain"),
  _creationTime: v.number(),
  companyUrl: v.string(),
  companyName: v.string(),
  status: v.union(
    v.literal("crawling"),
    v.literal("synthesizing"),
    v.literal("ready"),
    v.literal("error"),
  ),
  overview: v.optional(v.string()),
  solutions: v.optional(v.array(solutionValidator)),
  caseStudies: v.optional(v.array(caseStudyValidator)),
  sourceChunks: v.optional(v.array(sourceChunkValidator)),
  errorMessage: v.optional(v.string()),
  createdAt: v.number(),
});

export const leadValidator = v.object({
  _id: v.id("leadQualifications"),
  _creationTime: v.number(),
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
});

export const transcriptTurnValidator = v.object({
  role: v.union(v.literal("rep"), v.literal("persona")),
  text: v.string(),
  at: v.number(),
});

export const roleplayValidator = v.object({
  _id: v.id("roleplaySessions"),
  _creationTime: v.number(),
  leadQualificationId: v.id("leadQualifications"),
  personaBrief: v.optional(v.string()),
  transcript: v.array(transcriptTurnValidator),
  status: v.union(v.literal("active"), v.literal("ended")),
  createdAt: v.number(),
});

export const learnMessageValidator = v.object({
  role: v.union(v.literal("rep"), v.literal("agent")),
  text: v.string(),
  citedSource: v.optional(v.string()),
});

export const learnChatValidator = v.object({
  _id: v.id("learnChats"),
  _creationTime: v.number(),
  companyBrainId: v.id("companyBrain"),
  messages: v.array(learnMessageValidator),
  createdAt: v.number(),
});
