import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Layout } from "./components/Layout";
import { readLeadId, readProfileId, readSessionId } from "./lib/ids";
import { LeadWorkspace } from "./pages/LeadWorkspace";
import { Leads } from "./pages/Leads";
import { Roleplay } from "./pages/Roleplay";
import { Setup } from "./pages/Setup";
import { Strategy } from "./pages/Strategy";

export default function App() {
  const [profileId, setProfileId] = useState<Id<"gtmProfile"> | null>(null);
  const [, setLeadId] = useState<Id<"leads"> | null>(null);
  const [sessionId, setSessionId] = useState<Id<"rehearsals"> | null>(null);

  useEffect(() => {
    setProfileId(readProfileId());
    setLeadId(readLeadId());
    setSessionId(readSessionId());
  }, []);

  const profile = useQuery(api.gtm.get, profileId ? { profileId } : "skip");

  return (
    <Layout companyName={profile?.companyName}>
      <Routes>
        <Route
          path="/"
          element={<Setup profileId={profileId} onProfileId={setProfileId} />}
        />
        <Route path="/strategy" element={<Strategy profileId={profileId} />} />
        <Route
          path="/leads"
          element={<Leads profileId={profileId} onLeadId={setLeadId} />}
        />
        <Route path="/lead/:leadId" element={<LeadWorkspace />} />
        <Route
          path="/lead/:leadId/roleplay"
          element={
            <Roleplay sessionId={sessionId} onSessionId={setSessionId} />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
