import type { Id } from "../../convex/_generated/dataModel";

const BRAIN = "firstcall.brainId";
const LEAD = "firstcall.leadId";
const SESSION = "firstcall.sessionId";

export function readBrainId(): Id<"companyBrain"> | null {
  const value = localStorage.getItem(BRAIN);
  return value ? (value as Id<"companyBrain">) : null;
}

export function writeBrainId(id: Id<"companyBrain">): void {
  localStorage.setItem(BRAIN, id);
}

export function readLeadId(): Id<"leadQualifications"> | null {
  const value = localStorage.getItem(LEAD);
  return value ? (value as Id<"leadQualifications">) : null;
}

export function writeLeadId(id: Id<"leadQualifications">): void {
  localStorage.setItem(LEAD, id);
}

export function readSessionId(): Id<"roleplaySessions"> | null {
  const value = localStorage.getItem(SESSION);
  return value ? (value as Id<"roleplaySessions">) : null;
}

export function writeSessionId(id: Id<"roleplaySessions">): void {
  localStorage.setItem(SESSION, id);
}
