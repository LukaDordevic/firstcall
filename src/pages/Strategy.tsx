import { useAction, useQuery } from "convex/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function Strategy({ profileId }: { profileId: Id<"gtmProfile"> | null }) {
  const profile = useQuery(api.gtm.get, profileId ? { profileId } : "skip");
  const industries = useQuery(
    api.gtm.listIndustries,
    profileId ? { profileId } : "skip",
  );
  const partners = useQuery(
    api.gtm.listPartnerCategories,
    profileId ? { profileId } : "skip",
  );
  const findCustomers = useAction(api.leadsActions.generateForIndustry);
  const findPartners = useAction(api.leadsActions.generateForPartnerCategory);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!profileId || profile?.status !== "ready") {
    return (
      <section className="page">
        <h1>Strategy</h1>
        <p className="lede">Build the GTM brain first.</p>
        <Link to="/" className="text-link">
          Go to Setup
        </Link>
      </section>
    );
  }

  async function onFindIndustry(industryId: Id<"industries">) {
    setError(null);
    setBusyId(industryId);
    try {
      await findCustomers({ industryId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not find leads");
    } finally {
      setBusyId(null);
    }
  }

  async function onFindPartner(partnerCategoryId: Id<"partnerCategories">) {
    setError(null);
    setBusyId(partnerCategoryId);
    try {
      await findPartners({ partnerCategoryId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not find partners");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="page">
      <p className="kicker">{profile.companyName} · central intelligence</p>
      <h1>Where to land first</h1>
      <p className="lede">
        Industries to sell into, and partner categories to open with. Hit Find
        leads on a card — Convex will stream the companies in as they land.
      </p>
      {error ? <p className="error">{error}</p> : null}

      <h2 className="section-title">Industries</h2>
      <div className="solution-grid">
        {(industries ?? []).map((industry) => (
          <article key={industry._id} className="solution-card">
            <h3>{industry.name}</h3>
            <p>{industry.reasoning}</p>
            <p className="meta">GTM · {industry.gtmStrategy}</p>
            <ul>
              {industry.qualifyingQuestions.slice(0, 3).map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
            <button
              type="button"
              disabled={busyId === industry._id}
              onClick={() => void onFindIndustry(industry._id)}
            >
              {busyId === industry._id ? "Searching…" : "Find leads"}
            </button>
          </article>
        ))}
      </div>

      <h2 className="section-title">Partner categories</h2>
      <div className="solution-grid">
        {(partners ?? []).map((category) => (
          <article key={category._id} className="solution-card">
            <h3>{category.name}</h3>
            <p>{category.reasoning}</p>
            <p className="meta">Approach · {category.approachStrategy}</p>
            <p>{category.proposalAngle}</p>
            <button
              type="button"
              disabled={busyId === category._id}
              onClick={() => void onFindPartner(category._id)}
            >
              {busyId === category._id ? "Searching…" : "Find leads"}
            </button>
          </article>
        ))}
      </div>

      <Link to="/leads" className="primary-link">
        Open the lead list →
      </Link>
    </section>
  );
}
