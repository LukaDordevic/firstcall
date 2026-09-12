import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { writeSessionId } from "../lib/ids";
import { getSpeechRecognition, speak, stopSpeaking } from "../lib/speech";

export function Roleplay({
  sessionId,
  onSessionId,
}: {
  sessionId: Id<"rehearsals"> | null;
  onSessionId: (id: Id<"rehearsals">) => void;
}) {
  const { leadId } = useParams();
  const typedLeadId = leadId as Id<"leads"> | undefined;
  const lead = useQuery(
    api.leads.get,
    typedLeadId ? { leadId: typedLeadId } : "skip",
  );
  const latest = useQuery(
    api.roleplay.latestForLead,
    typedLeadId ? { leadId: typedLeadId } : "skip",
  );
  const activeId = sessionId ?? latest?._id ?? null;
  const session = useQuery(
    api.roleplay.get,
    activeId ? { sessionId: activeId } : "skip",
  );
  const start = useAction(api.roleplayActions.start);
  const sendTurn = useAction(api.roleplayActions.sendTurn);
  const endSession = useMutation(api.roleplay.end);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVoiceSupported(Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [session?.transcript.length]);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  if (!typedLeadId || lead?.status !== "ready") {
    return (
      <section className="page">
        <h1>Roleplay</h1>
        <p className="lede">Prepare a lead first.</p>
        <Link to="/" className="text-link">
          Back to intelligence
        </Link>
      </section>
    );
  }

  async function begin() {
    if (!typedLeadId) return;
    setError(null);
    setBusy(true);
    try {
      const id = await start({ leadId: typedLeadId });
      writeSessionId(id);
      onSessionId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start roleplay");
    } finally {
      setBusy(false);
    }
  }

  async function send(text: string) {
    if (!activeId || !text.trim()) return;
    setError(null);
    setBusy(true);
    setDraft("");
    try {
      const reply = await sendTurn({ sessionId: activeId, text });
      speak(reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Turn failed");
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = getSpeechRecognition();
    if (!recognition) {
      setError("This browser has no SpeechRecognition. Use Chrome, or type below.");
      return;
    }
    recognitionRef.current = recognition;
    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const transcript = last?.[0]?.transcript ?? "";
      setDraft(transcript);
      if (last?.isFinal) {
        void send(transcript);
      }
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error !== "aborted") {
        setError(`Mic error: ${event.error}`);
      }
    };
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await send(draft);
  }

  const counterpart =
    lead.leadType === "partner" ? `Partner at ${lead.name}` : `Buyer at ${lead.name}`;

  return (
    <section className="page roleplay">
      <p className="kicker">{counterpart}</p>
      <h1>Rehearse the conversation</h1>
      <Link to="/" className="text-link">
        Back to intelligence
      </Link>

      {!session ? (
        <div className="start-panel">
          <p className="lede">
            We&apos;ll cast a counterpart from the lead brief. Mic uses the
            browser — type if speech isn&apos;t available.
          </p>
          <button type="button" onClick={() => void begin()} disabled={busy}>
            {busy ? "Casting…" : "Start roleplay"}
          </button>
          {error ? <p className="error">{error}</p> : null}
        </div>
      ) : (
        <>
          <aside className="persona">
            <h2>Persona brief</h2>
            <p>{session.personaBrief}</p>
          </aside>
          <div className="transcript" ref={scroller}>
            {session.transcript.length === 0 ? (
              <p className="empty">Hit the mic or type your opener.</p>
            ) : (
              session.transcript.map((turn, index) => (
                <article key={`${turn.at}-${index}`} className={`bubble ${turn.role}`}>
                  <span>{turn.role === "rep" ? "You" : lead.name}</span>
                  <p>{turn.text}</p>
                </article>
              ))
            )}
          </div>
          <form onSubmit={onSubmit} className="composer voice">
            <button
              type="button"
              className={listening ? "mic live" : "mic"}
              onClick={toggleMic}
              disabled={!voiceSupported || busy || session.status === "ended"}
            >
              {listening ? "Listening" : "Mic"}
            </button>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={
                voiceSupported
                  ? "Speak or type your line"
                  : "Type your line — this browser has no speech recognition"
              }
              disabled={busy || session.status === "ended"}
            />
            <button type="submit" disabled={busy || session.status === "ended"}>
              {busy ? "…" : "Send"}
            </button>
            {session.status === "active" ? (
              <button
                type="button"
                className="ghost"
                onClick={() => void endSession({ sessionId: session._id })}
              >
                End
              </button>
            ) : (
              <p className="ended">Roleplay ended</p>
            )}
          </form>
          {error ? <p className="error">{error}</p> : null}
        </>
      )}
    </section>
  );
}
