import { useQuery } from "convex/react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { writeLeadId } from "../lib/ids";

export function LeadWorkspace() {
  const { leadId } = useParams();
  const typedId = leadId as Id<"leads"> | undefined;
  const lead = useQuery(api.leads.get, typedId ? { leadId: typedId } : "skip");
  const prep = useQuery(api.leads.getPrep, typedId ? { leadId: typedId } : "skip");

  if (!typedId) {
    return (
      <section className="page">
        <h1>Lead</h1>
        <Link to="/leads" className="text-link">
          Back to leads
        </Link>
      </section>
    );
  }

  if (lead === undefined) {
    return (
      <section className="page">
        <p className="lede">Loading…</p>
      </section>
    );
  }

  if (!lead || !prep) {
    return (
      <section className="page">
        <h1>Prepare this lead first</h1>
        <Link to="/leads" className="text-link">
          Back to leads
        </Link>
      </section>
    );
  }

  return (
    <section className="page qualify">
      <p className="kicker">
        {lead.leadType === "partner" ? "Partner" : "Customer"} · {lead.name}
      </p>
      <h1>Call brief</h1>
      <p className="lede">{prep.reasoning}</p>
      <div className="brief">
        <article>
          <h3>Recommended approach</h3>
          <p>{prep.recommendedApproach}</p>
        </article>
        <article>
          <h3>Qualifying questions</h3>
          <ol>
            {prep.qualifyingQuestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </article>
        <article>
          <h3>Signals</h3>
          <ul className="signals">
            {prep.signals.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <Link
          to={`/lead/${lead._id}/roleplay`}
          className="primary-link"
          onClick={() => writeLeadId(lead._id)}
        >
          Start roleplay →
        </Link>
      </div>
    </section>
  );
}
