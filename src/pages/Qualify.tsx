import { useAction, useMutation, useQuery } from "convex/react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { StatusStrip } from "../components/StatusStrip";
import { writeLeadId } from "../lib/ids";

const STEPS = [
  { id: "researching", label: "Researching the lead" },
  { id: "ready", label: "Brief ready" },
];

export function Qualify({
  brainId,
  leadId,
  onLeadId,
}: {
  brainId: Id<"companyBrain"> | null;
  leadId: Id<"leadQualifications"> | null;
  onLeadId: (id: Id<"leadQualifications">) => void;
}) {
  const brain = useQuery(api.companyBrain.get, brainId ? { brainId } : "skip");
  const lead = useQuery(api.leads.get, leadId ? { leadId } : "skip");
  const start = useMutation(api.leads.start);
  const qualify = useAction(api.leadsActions.qualify);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!brainId || brain?.status !== "ready") {
    return (
      <section className="page">
        <h1>Qualify a Lead</h1>
        <p className="lede">The company brain has to be ready before we research a prospect.</p>
        <Link to="/" className="text-link">
          Go to Brain
        </Link>
      </section>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!brainId) return;
    setError(null);
    setBusy(true);
    try {
      const id = await start({ companyBrainId: brainId, leadUrl: url });
      writeLeadId(id);
      onLeadId(id);
      await qualify({ leadId: id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not research lead");
    } finally {
      setBusy(false);
    }
  }

  const working = busy || lead?.status === "researching";

  return (
    <section className="page qualify">
      <p className="kicker">Against {brain.companyName}</p>
      <h1>Paste a prospect URL</h1>
      <p className="lede">
        We scrape their site, pull recent news via Exa, then match it to our
        solutions — live, in Convex.
      </p>

      <form onSubmit={onSubmit} className="url-form">
        <label htmlFor="lead-url">Lead company URL</label>
        <div className="row">
          <input
            id="lead-url"
            type="url"
            required
            placeholder="https://www.notion.so"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
          <button type="submit" disabled={working}>
            {working ? "Researching…" : "Qualify"}
          </button>
        </div>
      </form>
      {error ? <p className="error">{error}</p> : null}

      {lead ? (
        <StatusStrip
          steps={STEPS}
          current={lead.status === "error" ? "researching" : lead.status}
          error={lead.errorMessage}
        />
      ) : null}

      {lead?.status === "ready" ? (
        <div className="brief">
          <article>
            <h2>{lead.leadName}</h2>
            <p>{lead.reasoning}</p>
          </article>
          <article>
            <h3>Recommended solutions</h3>
            <ul>
              {(lead.recommendedSolutions ?? []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article>
            <h3>Qualifying questions</h3>
            <ol>
              {(lead.qualifyingQuestions ?? []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </article>
          <article>
            <h3>Signals</h3>
            <ul className="signals">
              {(lead.signals ?? []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <Link to="/roleplay" className="primary-link">
            Roleplay this call →
          </Link>
        </div>
      ) : null}
    </section>
  );
}
