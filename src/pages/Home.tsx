import { useAction, useMutation, useQuery } from "convex/react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { StatusStrip } from "../components/StatusStrip";
import { writeBrainId } from "../lib/ids";

const STEPS = [
  { id: "crawling", label: "Crawling the site" },
  { id: "synthesizing", label: "Building the brain" },
  { id: "ready", label: "Ready" },
];

export function Home({
  brainId,
  onBrainId,
}: {
  brainId: Id<"companyBrain"> | null;
  onBrainId: (id: Id<"companyBrain">) => void;
}) {
  const brain = useQuery(api.companyBrain.get, brainId ? { brainId } : "skip");
  const start = useMutation(api.companyBrain.start);
  const ingest = useAction(api.companyBrainActions.ingest);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const id = await start({ companyUrl: url });
      writeBrainId(id);
      onBrainId(id);
      await ingest({ brainId: id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start research");
    } finally {
      setBusy(false);
    }
  }

  const working =
    busy || brain?.status === "crawling" || brain?.status === "synthesizing";

  return (
    <section className="page home">
      <p className="kicker">Onboarding for the first call</p>
      <h1>Paste the company URL. Watch the brain fill in live.</h1>
      <p className="lede">
        FirstCall crawls your employer&apos;s site, then keeps a persistent company
        brain so a new rep can learn the pitch, qualify a lead, and rehearse the
        call out loud.
      </p>

      <form onSubmit={onSubmit} className="url-form">
        <label htmlFor="company-url">Your company&apos;s URL</label>
        <div className="row">
          <input
            id="company-url"
            type="url"
            required
            placeholder="https://www.stripe.com"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
          <button type="submit" disabled={working}>
            {working ? "Reading…" : "Build brain"}
          </button>
        </div>
      </form>

      {error ? <p className="error">{error}</p> : null}

      {brain ? (
        <StatusStrip
          steps={STEPS}
          current={brain.status === "error" ? "crawling" : brain.status}
          error={brain.errorMessage}
        />
      ) : null}

      {brain && brain.status !== "ready" && brain.status !== "error" ? (
        <div className="live-card">
          <p className="pulse">Convex is streaming status updates — no refresh.</p>
          <p>
            Researching <strong>{brain.companyName}</strong> at {brain.companyUrl}
          </p>
        </div>
      ) : null}

      {brain?.status === "ready" ? <ReadyBrain brain={brain} /> : null}
    </section>
  );
}

function ReadyBrain({ brain }: { brain: Doc<"companyBrain"> }) {
  return (
    <>
      <article className="brain-summary">
        <h2>{brain.companyName}</h2>
        <p>{brain.overview}</p>
        <div className="solution-grid">
          {(brain.solutions ?? []).map((solution) => (
            <div key={solution.name} className="solution-card">
              <h3>{solution.name}</h3>
              <p>{solution.description}</p>
              <p className="meta">ICP · {solution.icp}</p>
            </div>
          ))}
        </div>
      </article>

      <div className="mode-grid">
        <Link to="/learn" className="mode-card">
          <span>01</span>
          <h3>Explore & Learn</h3>
          <p>Ask anything about what we sell. Answers stay grounded in the site.</p>
        </Link>
        <Link to="/qualify" className="mode-card">
          <span>02</span>
          <h3>Qualify a Lead</h3>
          <p>Paste a prospect URL. Get fit, signals, and questions for the call.</p>
        </Link>
        <Link to="/roleplay" className="mode-card">
          <span>03</span>
          <h3>Roleplay</h3>
          <p>Talk to a buyer at that company. Voice in, voice out, live transcript.</p>
        </Link>
      </div>
    </>
  );
}
