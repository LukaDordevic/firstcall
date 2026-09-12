import { useAction, useMutation, useQuery } from "convex/react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { StatusStrip } from "../components/StatusStrip";
import { writeLeadId } from "../lib/ids";

const STEPS = [
  { id: "building", label: "Reading the company" },
  { id: "ready", label: "Filling leads live" },
];

export function CommandCenter({
  profileId,
  onProfileId,
}: {
  profileId: Id<"gtmProfile"> | null;
  onProfileId: (id: Id<"gtmProfile">) => void;
}) {
  const profile = useQuery(api.gtm.get, profileId ? { profileId } : "skip");
  const industries = useQuery(
    api.gtm.listIndustries,
    profileId ? { profileId } : "skip",
  );
  const partners = useQuery(
    api.gtm.listPartnerCategories,
    profileId ? { profileId } : "skip",
  );
  const leads = useQuery(
    api.leads.list,
    profileId ? { gtmProfileId: profileId } : "skip",
  );
  const start = useMutation(api.gtm.start);
  const uploadUrl = useMutation(api.gtm.generateUploadUrl);
  const build = useAction(api.gtmActions.build);
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileHint, setFileHint] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "customer" | "partner">(
    "all",
  );
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<Id<"leads"> | null>(null);

  const selected = leads?.find((lead) => lead._id === selectedId) ?? null;
  const prep = useQuery(
    api.leads.getPrep,
    selectedId ? { leadId: selectedId } : "skip",
  );

  const counts = useMemo(() => {
    const byIndustry = new Map<string, number>();
    const byPartner = new Map<string, number>();
    for (const lead of leads ?? []) {
      if (lead.industryId) {
        byIndustry.set(lead.industryId, (byIndustry.get(lead.industryId) ?? 0) + 1);
      }
      if (lead.partnerCategoryId) {
        byPartner.set(
          lead.partnerCategoryId,
          (byPartner.get(lead.partnerCategoryId) ?? 0) + 1,
        );
      }
    }
    return { byIndustry, byPartner };
  }, [leads]);

  const filtered = useMemo(() => {
    return (leads ?? []).filter((lead) => {
      if (typeFilter !== "all" && lead.leadType !== typeFilter) return false;
      if (groupFilter === "all") return true;
      if (lead.industryId === groupFilter) return true;
      if (lead.partnerCategoryId === groupFilter) return true;
      return false;
    });
  }, [leads, typeFilter, groupFilter]);

  function groupLabel(lead: Doc<"leads">): string {
    if (lead.industryId) {
      return industries?.find((item) => item._id === lead.industryId)?.name ?? "Customer";
    }
    if (lead.partnerCategoryId) {
      return (
        partners?.find((item) => item._id === lead.partnerCategoryId)?.name ??
        "Partner"
      );
    }
    return lead.leadType;
  }

  function acceptFile(next: File | undefined) {
    if (!next) return;
    const kind = next.name.toLowerCase();
    if (!kind.endsWith(".pdf") && !kind.endsWith(".docx")) {
      setFileHint("Use a PDF or DOCX. Export a PPTX to PDF first.");
      return;
    }
    setFileHint(null);
    setFile(next);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    acceptFile(event.dataTransfer.files[0]);
  }

  function scrollToBoard() {
    window.requestAnimationFrame(() => {
      boardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    setSelectedId(null);
    setTypeFilter("all");
    setGroupFilter("all");
    try {
      let docStorageId: Id<"_storage"> | undefined;
      if (file) {
        const kind = file.name.toLowerCase();
        if (!kind.endsWith(".pdf") && !kind.endsWith(".docx")) {
          throw new Error("Upload a PDF or DOCX. Export a PPTX to PDF first.");
        }
        const postUrl = await uploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!result.ok) {
          throw new Error("Could not upload the file");
        }
        const json = (await result.json()) as { storageId?: Id<"_storage"> };
        docStorageId = json.storageId;
      }
      const id = await start({ companyUrl: url, docStorageId });
      onProfileId(id);
      setBusy(false);
      scrollToBoard();
      void build({ profileId: id }).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not start research");
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start research");
      setBusy(false);
    }
  }

  const working = busy || profile?.status === "building";
  const showBoard = Boolean(profile && profile.status !== "error");
  const readyCount = (leads ?? []).filter((lead) => lead.status === "ready").length;

  useEffect(() => {
    if (showBoard) {
      scrollToBoard();
    }
  }, [showBoard]);

  return (
    <section className={showBoard ? "page command started" : "page command landing"}>
      <div className="hero">
        <p className="kicker">1stDeal</p>
        <h1>Find the first deal.</h1>
        <p className="lede motto">A GTM Intelligence for early Startups</p>
        <form onSubmit={onSubmit} className="intake">
          <label htmlFor="company-url">Startup URL</label>
          <div className="row">
            <input
              id="company-url"
              type="url"
              required
              placeholder="paste your startup url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
            <button type="submit" disabled={working}>
              {working ? "Building…" : "Start"}
            </button>
          </div>
          <div
            className={
              dragOver ? "dropzone over" : file ? "dropzone" : "dropzone clickable"
            }
            onClick={() => {
              if (!file) fileInputRef.current?.click();
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragOver(false);
            }}
            onDrop={onDrop}
          >
            <input
              ref={fileInputRef}
              id="deck-file"
              className="sr-only"
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => acceptFile(event.target.files?.[0])}
            />
            {file ? (
              <div className="dropzone-file">
                <div>
                  <p className="dropzone-kicker">Attached deck</p>
                  <p className="dropzone-name">{file.name}</p>
                </div>
                <button
                  type="button"
                  className="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    setFile(null);
                    setFileHint(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <p className="dropzone-kicker">Optional deck or plan</p>
                <p className="dropzone-copy">
                  Drop a PDF or DOCX here, or attach one.
                </p>
                <button
                  type="button"
                  className="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Attach a deck
                </button>
              </>
            )}
          </div>
          {fileHint ? <p className="error">{fileHint}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </form>
      </div>

      <div ref={boardRef} className="board">
        {profile ? (
          <StatusStrip
            steps={STEPS}
            current={profile.status === "error" ? "building" : profile.status}
            error={profile.errorMessage}
          />
        ) : null}

        {showBoard ? (
          <>
            <section className="segment">
              <p className="segment-label">Company</p>
              {profile?.overview ? (
                <article className="solution-card">
                  <h3>{profile.companyName}</h3>
                  <p>{profile.overview}</p>
                </article>
              ) : (
                <article className="solution-card">
                  <p className="pulse">Reading the company…</p>
                </article>
              )}
            </section>

            <section className="segment">
              <p className="segment-label">Markets</p>
              <div className="market-grid">
                <div>
                  <h2 className="section-title">Direct customers</h2>
                  {(industries ?? []).length === 0 ? (
                    <p className="empty">Industries appear as soon as the brain is ready.</p>
                  ) : (
                    (industries ?? []).map((industry) => (
                      <button
                        key={industry._id}
                        type="button"
                        className={
                          groupFilter === industry._id
                            ? "filter-card active"
                            : "filter-card"
                        }
                        onClick={() => {
                          setTypeFilter("customer");
                          setGroupFilter(industry._id);
                        }}
                      >
                        <strong>{industry.name}</strong>
                        <em>{counts.byIndustry.get(industry._id) ?? 0} leads</em>
                        <span>{industry.reasoning}</span>
                      </button>
                    ))
                  )}
                </div>
                <div>
                  <h2 className="section-title">Partners</h2>
                  {(partners ?? []).length === 0 ? (
                    <p className="empty">Partner categories stream in next.</p>
                  ) : (
                    (partners ?? []).map((category) => (
                      <button
                        key={category._id}
                        type="button"
                        className={
                          groupFilter === category._id
                            ? "filter-card active"
                            : "filter-card"
                        }
                        onClick={() => {
                          setTypeFilter("partner");
                          setGroupFilter(category._id);
                        }}
                      >
                        <strong>{category.name}</strong>
                        <em>{counts.byPartner.get(category._id) ?? 0} leads</em>
                        <span>{category.reasoning}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className={selected ? "segment pipeline with-drawer" : "segment pipeline"}>
              <p className="segment-label">Leads</p>
              <div className="command-grid">
                <div className="command-right">
                  <div className="tabs">
                    <button
                      type="button"
                      className={
                        typeFilter === "all" && groupFilter === "all"
                          ? "active-tab"
                          : "ghost"
                      }
                      onClick={() => {
                        setTypeFilter("all");
                        setGroupFilter("all");
                      }}
                    >
                      All ({leads?.length ?? 0})
                    </button>
                    <button
                      type="button"
                      className={
                        typeFilter === "customer" && groupFilter === "all"
                          ? "active-tab"
                          : "ghost"
                      }
                      onClick={() => {
                        setTypeFilter("customer");
                        setGroupFilter("all");
                      }}
                    >
                      Direct
                    </button>
                    <button
                      type="button"
                      className={
                        typeFilter === "partner" && groupFilter === "all"
                          ? "active-tab"
                          : "ghost"
                      }
                      onClick={() => {
                        setTypeFilter("partner");
                        setGroupFilter("all");
                      }}
                    >
                      Partners
                    </button>
                  </div>
                  <p className="meta">
                    {readyCount} of {leads?.length ?? 0} approaches written
                  </p>
                  <div className="lead-list">
                    {filtered.length === 0 ? (
                      <p className="empty">
                        {profile?.status === "ready"
                          ? "Searching the live web for companies — they appear here as each industry agent finishes."
                          : "Leads will stream in once the brain is ready."}
                      </p>
                    ) : (
                      filtered.map((lead) => (
                        <button
                          key={lead._id}
                          type="button"
                          className={
                            selectedId === lead._id ? "lead-row active" : "lead-row"
                          }
                          onClick={() => {
                            setSelectedId(lead._id);
                            writeLeadId(lead._id);
                          }}
                        >
                          <strong>{lead.name}</strong>
                          <span>{lead.oneLiner}</span>
                          <em>
                            {groupLabel(lead)} · {lead.status}
                          </em>
                        </button>
                      ))
                    )}
                  </div>
                </div>
                {selected ? (
                  <LeadDrawer
                    lead={selected}
                    prep={prep}
                    group={groupLabel(selected)}
                    onClose={() => setSelectedId(null)}
                  />
                ) : null}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </section>
  );
}

function LeadDrawer({
  lead,
  prep,
  group,
  onClose,
}: {
  lead: Doc<"leads">;
  prep: Doc<"leadPrep"> | null | undefined;
  group: string;
  onClose: () => void;
}) {
  return (
    <aside className="drawer">
      <div className="drawer-head">
        <p className="kicker">
          {lead.leadType === "partner" ? "Partner" : "Customer"} · {group}
        </p>
        <button type="button" className="ghost" onClick={onClose}>
          Close
        </button>
      </div>
      <h2>{lead.name}</h2>
      <a href={lead.url} target="_blank" rel="noreferrer" className="text-link">
        {lead.url}
      </a>
      {!prep && lead.status !== "error" ? (
        <p className="pulse">Writing qualifying questions in the background…</p>
      ) : null}
      {lead.errorMessage ? <p className="error">{lead.errorMessage}</p> : null}
      {prep ? (
        <>
          <h3>Approach</h3>
          <p>{prep.recommendedApproach}</p>
          <h3>Qualifying questions</h3>
          <ol>
            {prep.qualifyingQuestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <h3>Signals</h3>
          <ul className="signals">
            {prep.signals.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <Link to={`/lead/${lead._id}/roleplay`} className="primary-link">
            Roleplay this conversation →
          </Link>
        </>
      ) : null}
    </aside>
  );
}
