import { useAction, useQuery } from "convex/react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function Learn({ brainId }: { brainId: Id<"companyBrain"> | null }) {
  const brain = useQuery(api.companyBrain.get, brainId ? { brainId } : "skip");
  const chat = useQuery(
    api.learn.forBrain,
    brainId ? { companyBrainId: brainId } : "skip",
  );
  const ask = useAction(api.learnActions.ask);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!brainId || brain?.status !== "ready") {
    return (
      <section className="page">
        <h1>Explore & Learn</h1>
        <p className="lede">Build a company brain first — then ask it anything.</p>
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
      await ask({ companyBrainId: brainId, question });
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not answer");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page learn">
      <p className="kicker">{brain.companyName} · grounded Q&A</p>
      <h1>Ask the company brain</h1>
      <p className="lede">
        Answers come from the pages we crawled. Each reply cites a source URL
        when it can.
      </p>

      <div className="transcript">
        {(chat?.messages ?? []).length === 0 ? (
          <p className="empty">Try: “Who is the ICP?” or “What do we say when they ask about price?”</p>
        ) : (
          chat?.messages.map((message, index) => (
            <article
              key={`${message.role}-${index}`}
              className={`bubble ${message.role}`}
            >
              <p>{message.text}</p>
              {message.citedSource ? (
                <a href={message.citedSource} target="_blank" rel="noreferrer">
                  Source · {message.citedSource}
                </a>
              ) : null}
            </article>
          ))
        )}
      </div>

      <form onSubmit={onSubmit} className="composer">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="What do we sell to mid-market finance teams?"
          required
        />
        <button type="submit" disabled={busy}>
          {busy ? "Thinking…" : "Ask"}
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
