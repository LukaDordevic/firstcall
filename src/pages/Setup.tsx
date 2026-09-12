import { useAction, useMutation, useQuery } from "convex/react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { StatusStrip } from "../components/StatusStrip";
import { writeProfileId } from "../lib/ids";

const STEPS = [
  { id: "building", label: "Reading the company" },
  { id: "ready", label: "GTM brain ready" },
];

export function Setup({
  profileId,
  onProfileId,
}: {
  profileId: Id<"gtmProfile"> | null;
  onProfileId: (id: Id<"gtmProfile">) => void;
}) {
  const profile = useQuery(api.gtm.get, profileId ? { profileId } : "skip");
  const start = useMutation(api.gtm.start);
  const build = useAction(api.gtmActions.build);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const id = await start({ companyUrl: url });
      writeProfileId(id);
      onProfileId(id);
      await build({ profileId: id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start GTM research");
    } finally {
      setBusy(false);
    }
  }

  const working = busy || profile?.status === "building";

  return (
    <section className="page home">
      <p className="kicker">GTM intelligence for a company with no pipeline yet</p>
      <h1>Paste the startup URL. Watch the beachhead form live.</h1>
      <p className="lede">
        Beachhead crawls the site, then keeps a persistent GTM brain: who to sell
        to, who to partner with, and how to open the first conversations.
      </p>

      <form onSubmit={onSubmit} className="url-form">
        <label htmlFor="company-url">Startup URL</label>
        <div className="row">
          <input
            id="company-url"
            type="url"
            required
            placeholder="https://www.linear.app"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
          <button type="submit" disabled={working}>
            {working ? "Building…" : "Build GTM brain"}
          </button>
        </div>
      </form>
      {error ? <p className="error">{error}</p> : null}

      {profile ? (
        <StatusStrip
          steps={STEPS}
          current={profile.status === "error" ? "building" : profile.status}
          error={profile.errorMessage}
        />
      ) : null}

      {profile && profile.status === "building" ? (
        <div className="live-card">
          <p className="pulse">Convex is streaming this — no refresh.</p>
          <p>
            Researching <strong>{profile.companyName}</strong>
          </p>
        </div>
      ) : null}

      {profile?.status === "ready" ? (
        <>
          <article className="brain-summary">
            <h2>{profile.companyName}</h2>
            <p>{profile.overview}</p>
            <div className="solution-grid">
              {(profile.offering ?? []).map((item) => (
                <div key={item.name} className="solution-card">
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>
          </article>
          <div className="mode-grid">
            <Link to="/strategy" className="mode-card">
              <span>01</span>
              <h3>Strategy</h3>
              <p>Industries and partner categories with reasoning and a GTM motion.</p>
            </Link>
            <Link to="/leads" className="mode-card">
              <span>02</span>
              <h3>Leads</h3>
              <p>Find real companies, prepare one, then rehearse the call.</p>
            </Link>
          </div>
        </>
      ) : null}
    </section>
  );
}
