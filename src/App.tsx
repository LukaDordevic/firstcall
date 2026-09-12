import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Layout } from "./components/Layout";
import { CommandCenter } from "./pages/CommandCenter";
import { Roleplay } from "./pages/Roleplay";

export default function App() {
  const [profileId, setProfileId] = useState<Id<"gtmProfile"> | null>(null);
  const [sessionId, setSessionId] = useState<Id<"rehearsals"> | null>(null);

  const profile = useQuery(api.gtm.get, profileId ? { profileId } : "skip");

  return (
    <Layout companyName={profile?.companyName}>
      <Routes>
        <Route
          path="/"
          element={
            <CommandCenter profileId={profileId} onProfileId={setProfileId} />
          }
        />
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
