import type { Id } from "../../convex/_generated/dataModel";

const PROFILE = "beachhead.profileId";
const LEAD = "beachhead.leadId";
const SESSION = "beachhead.sessionId";

export function readProfileId(): Id<"gtmProfile"> | null {
  const value = localStorage.getItem(PROFILE);
  return value ? (value as Id<"gtmProfile">) : null;
}

export function writeProfileId(id: Id<"gtmProfile">): void {
  localStorage.setItem(PROFILE, id);
}

export function readLeadId(): Id<"leads"> | null {
  const value = localStorage.getItem(LEAD);
  return value ? (value as Id<"leads">) : null;
}

export function writeLeadId(id: Id<"leads">): void {
  localStorage.setItem(LEAD, id);
}

export function readSessionId(): Id<"rehearsals"> | null {
  const value = localStorage.getItem(SESSION);
  return value ? (value as Id<"rehearsals">) : null;
}

export function writeSessionId(id: Id<"rehearsals">): void {
  localStorage.setItem(SESSION, id);
}
