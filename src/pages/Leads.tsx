import { useAction, useQuery } from "convex/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { writeLeadId } from "../lib/ids";

export function Leads({
  profileId,
  onLeadId,
}: {
  profileId: Id<"gtmProfile"> | null;
  onLeadId: (id: Id<"leads">) => void;
}) {
  const profile = useQuery(api.gtm.get, profileId ? { profileId } : "skip");
  const customers = useQuery(
    api.leads.list,
    profileId ? { gtmProfileId: profileId, leadType: "customer" } : "skip",
  );
  const partners = useQuery(
    api.leads.list,
    profileId ? { gtmProfileId: profileId, leadType: "partner" } : "skip",
  );
  const industries = useQuery(
    api.gtm.listIndustries,
    profileId ? { profileId } : "skip",
  );
  const categories = useQuery(
    api.gtm.listPartnerCategories,
    profileId ? { profileId } : "skip",
  );
  const prepare = useAction(api.leadsActions.prepare);
  const [tab, setTab] = useState<"customer" | "partner">("customer");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!profileId || profile?.status !== "ready") {
    return (
      <section className="page">
        <h1>Leads</h1>
        <p className="lede">Build the GTM brain, then find leads from Strategy.</p>
        <Link to="/" className="text-link">
          Go to Setup
        </Link>
      </section>
    );
  }

  async function onPrepare(leadId: Id<"leads">) {
    setError(null);
    setBusyId(leadId);
    try {
      await prepare({ leadId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prep failed");
    } finally {
      setBusyId(null);
    }
  }

  const groups =
    tab === "customer"
      ? groupBy(
          customers ?? [],
          (lead) =>
            industries?.find((item) => item._id === lead.industryId)?.name ??
            "Ungrouped",
        )
      : groupBy(
          partners ?? [],
          (lead) =>
            categories?.find((item) => item._id === lead.partnerCategoryId)?.name ??
            "Ungrouped",
        );

  return (
    <section className="page">
      <p className="kicker">{profile.companyName}</p>
      <h1>Candidate companies</h1>
      <div className="tabs">
        <button
          type="button"
          className={tab === "customer" ? "active-tab" : "ghost"}
          onClick={() => setTab("customer")}
        >
          Direct customers
        </button>
        <button
          type="button"
          className={tab === "partner" ? "active-tab" : "ghost"}
          onClick={() => setTab("partner")}
        >
          Partners
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}

      {Object.keys(groups).length === 0 ? (
        <p className="empty">
          No {tab === "customer" ? "customer" : "partner"} leads yet. Open Strategy
          and hit Find leads on a card.
        </p>
      ) : (
        Object.entries(groups).map(([group, rows]) => (
          <div key={group}>
            <h2 className="section-title">{group}</h2>
            <div className="lead-list">
              {rows.map((lead) => (
                <article key={lead._id} className="solution-card">
                  <h3>{lead.name}</h3>
                  <p>{lead.oneLiner}</p>
                  <p className="meta">
                    {lead.status}
                    {" · "}
                    <a href={lead.url} target="_blank" rel="noreferrer">
                      {lead.url}
                    </a>
                  </p>
                  {lead.errorMessage ? (
                    <p className="error">{lead.errorMessage}</p>
                  ) : null}
                  <div className="row">
                    <button
                      type="button"
                      disabled={busyId === lead._id || lead.status === "researching"}
                      onClick={() => void onPrepare(lead._id)}
                    >
                      {lead.status === "researching" || busyId === lead._id
                        ? "Preparing…"
                        : "Prepare"}
                    </button>
                    {lead.status === "ready" ? (
                      <Link
                        to={`/lead/${lead._id}`}
                        className="primary-link"
                        onClick={() => {
                          writeLeadId(lead._id);
                          onLeadId(lead._id);
                        }}
                      >
                        Open workspace →
                      </Link>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}

function groupBy(
  leads: Doc<"leads">[],
  keyFn: (lead: Doc<"leads">) => string,
): Record<string, Doc<"leads">[]> {
  const groups: Record<string, Doc<"leads">[]> = {};
  for (const lead of leads) {
    const key = keyFn(lead);
    const bucket = groups[key] ?? [];
    bucket.push(lead);
    groups[key] = bucket;
  }
  return groups;
}
