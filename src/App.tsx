import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Layout } from "./components/Layout";
import { readBrainId, readLeadId, readSessionId } from "./lib/ids";
import { Home } from "./pages/Home";
import { Learn } from "./pages/Learn";
import { Qualify } from "./pages/Qualify";
import { Roleplay } from "./pages/Roleplay";

export default function App() {
  const [brainId, setBrainId] = useState<Id<"companyBrain"> | null>(null);
  const [leadId, setLeadId] = useState<Id<"leadQualifications"> | null>(null);
  const [sessionId, setSessionId] = useState<Id<"roleplaySessions"> | null>(null);

  useEffect(() => {
    setBrainId(readBrainId());
    setLeadId(readLeadId());
    setSessionId(readSessionId());
  }, []);

  const brain = useQuery(api.companyBrain.get, brainId ? { brainId } : "skip");

  return (
    <Layout companyName={brain?.companyName}>
      <Routes>
        <Route
          path="/"
          element={<Home brainId={brainId} onBrainId={setBrainId} />}
        />
        <Route path="/learn" element={<Learn brainId={brainId} />} />
        <Route
          path="/qualify"
          element={
            <Qualify
              brainId={brainId}
              leadId={leadId}
              onLeadId={setLeadId}
            />
          }
        />
        <Route
          path="/roleplay"
          element={
            <Roleplay
              leadId={leadId}
              sessionId={sessionId}
              onSessionId={setSessionId}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
