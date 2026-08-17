"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowIcon, CheckIcon, FileIcon, MarkIcon, SearchIcon, SparkIcon, UploadIcon } from "@/components/icons";
import type { DocumentRecord, QualityInspection, Source, StreamEvent } from "@/lib/types";

type Health = {
  mode: "demo" | "portfolio" | "production";
  capabilities: { generation: boolean; persistence: boolean; uploads: boolean; seededCorpus: boolean };
};

const suggestions = [
  "How does the retrieval architecture work?",
  "How is response quality evaluated?",
  "Who is this product designed for?",
];

const uploadsUnavailableMessage =
  "Uploads are disabled in this public workspace. Run the project locally to test document ingestion.";

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  return `${(value / 1024).toFixed(1)} KB`;
}

function score(value: number) {
  return Math.round(value * 100);
}

function AnswerText({ text, sources, onSelect }: { text: string; sources: Source[]; onSelect: (index: number) => void }) {
  const parts = text.split(/(\[S\d+\])/g);
  return (
    <div className="answer-copy">
      {parts.map((part, index) => {
        const match = part.match(/^\[S(\d+)\]$/);
        if (!match) return <span key={`${part}-${index}`}>{part}</span>;
        const sourceIndex = Number(match[1]) - 1;
        return (
          <button
            key={`${part}-${index}`}
            className="citation"
            onClick={() => onSelect(sourceIndex)}
            aria-label={`Open source ${match[1]} ${sources[sourceIndex]?.documentName ?? ""}`}
          >
            {match[1]}
          </button>
        );
      })}
    </div>
  );
}

export function Workbench() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [question, setQuestion] = useState("");
  const [activeQuestion, setActiveQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [quality, setQuality] = useState<QualityInspection | null>(null);
  const [selectedSource, setSelectedSource] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function loadWorkspace() {
    const [healthResponse, documentsResponse] = await Promise.all([fetch("/api/health"), fetch("/api/documents")]);
    if (healthResponse.ok) setHealth(await healthResponse.json());
    if (documentsResponse.ok) {
      const data = await documentsResponse.json();
      setDocuments(data.documents);
    }
  }

  useEffect(() => {
    Promise.all([fetch("/api/health"), fetch("/api/documents")])
      .then(async ([healthResponse, documentsResponse]) => {
        if (healthResponse.ok) setHealth(await healthResponse.json());
        if (documentsResponse.ok) {
          const data = await documentsResponse.json();
          setDocuments(data.documents);
        }
      })
      .catch(() => setNotice("The workspace status could not be loaded."));
  }, []);

  async function ask(nextQuestion?: string) {
    const value = (nextQuestion ?? question).trim();
    if (value.length < 3 || isStreaming) return;
    setQuestion(value);
    setActiveQuestion(value);
    setAnswer("");
    setSources([]);
    setQuality(null);
    setSelectedSource(0);
    setNotice(null);
    setIsStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: value }),
      });
      if (!response.ok || !response.body) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.error ?? "The answer request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value: chunk, done } = await reader.read();
        buffer += decoder.decode(chunk ?? new Uint8Array(), { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;
          if (event.type === "sources") setSources(event.sources);
          if (event.type === "delta") setAnswer((current) => current + event.text);
          if (event.type === "quality") setQuality(event.quality);
          if (event.type === "error") throw new Error(event.message);
        }
        if (done) break;
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The answer could not be generated.");
    } finally {
      setIsStreaming(false);
    }
  }

  async function upload(file: File) {
    if (!health?.capabilities.uploads) {
      setNotice(uploadsUnavailableMessage);
      return;
    }
    setIsUploading(true);
    setNotice(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch("/api/documents/upload", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await loadWorkspace();
      setNotice(`${file.name} is indexed and ready to question.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The document could not be uploaded.");
    } finally {
      setIsUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const activeSource = sources[selectedSource];
  const modeLabel = health?.mode === "production" ? "Live workspace" : health?.mode === "demo" ? "Test workspace" : "Portfolio workspace";

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Folio home">
          <span className="brand-mark"><MarkIcon /></span>
          <span>Folio</span>
        </a>
        <div className="topbar-center">
          <span className="topbar-title">Evidence desk</span>
          <span className="status-pill"><i />{modeLabel}</span>
        </div>
        <a className="about-link" href="#engineering">Engineering notes <ArrowIcon /></a>
      </header>

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span><button onClick={() => setNotice(null)} aria-label="Dismiss notification">Close</button>
        </div>
      )}

      <section className="workspace" id="top">
        <aside className="library-panel" aria-label="Document library">
          <div className="panel-heading">
            <div><p className="eyebrow">Collection</p><h2>Source library</h2></div>
            <span className="count">{documents.length}</span>
          </div>

          <button
            className="upload-card"
            onClick={() => {
              if (!health?.capabilities.uploads) {
                setNotice(uploadsUnavailableMessage);
                return;
              }
              fileInput.current?.click();
            }}
            disabled={isUploading}
          >
            <span className="upload-icon"><UploadIcon /></span>
            <span><strong>{isUploading ? "Indexing document" : "Add a document"}</strong><small>PDF, DOCX, MD, or TXT · 10 MB</small></span>
          </button>
          <input
            ref={fileInput}
            className="visually-hidden"
            type="file"
            accept=".pdf,.docx,.md,.txt"
            onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])}
          />

          <div className="library-list">
            {documents.map((document, index) => (
              <article className="document-row" key={document.id} style={{ animationDelay: `${index * 60}ms` }}>
                <span className="file-type"><FileIcon /></span>
                <div>
                  <h3 title={document.name}>{document.name}</h3>
                  <p>{document.chunkCount} passages · {formatBytes(document.size)}</p>
                </div>
                <span className="ready-dot" title={document.status} />
              </article>
            ))}
          </div>

          <div className="pipeline-note">
            <p className="eyebrow">Index pipeline</p>
            <ol>
              <li><span>01</span> Extract and normalize</li>
              <li><span>02</span> Chunk with overlap</li>
              <li><span>03</span> Embed and index</li>
            </ol>
          </div>
        </aside>

        <section className="conversation-panel" aria-label="Ask your documents">
          <div className="conversation-intro">
            <span className="ornament">✦</span>
            <p className="eyebrow">Ask across the evidence</p>
            <h1>Answers you can<br /><em>trace back.</em></h1>
            <p className="intro-copy">Question the collection. Folio retrieves the strongest passages, streams a cited answer, then grades its own evidence use.</p>
          </div>

          {!activeQuestion && (
            <div className="suggestions" aria-label="Suggested questions">
              {suggestions.map((suggestion) => (
                <button key={suggestion} onClick={() => ask(suggestion)}>{suggestion}<ArrowIcon /></button>
              ))}
            </div>
          )}

          {activeQuestion && (
            <div className="answer-thread" aria-live="polite">
              <div className="question-block"><span>You asked</span><p>{activeQuestion}</p></div>
              <article className="answer-block">
                <div className="answer-label"><SparkIcon /><span>Folio answer</span>{isStreaming && <i className="streaming-dot" />}</div>
                {answer ? <AnswerText text={answer} sources={sources} onSelect={setSelectedSource} /> : <div className="answer-skeleton"><i /><i /><i /></div>}
              </article>
              {sources.length > 0 && (
                <div className="inline-sources">
                  <span>{sources.length} sources retrieved</span>
                  {sources.slice(0, 3).map((source, index) => (
                    <button key={source.id} onClick={() => setSelectedSource(index)}>S{index + 1} · {source.documentName}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          <form className="question-box" onSubmit={(event) => { event.preventDefault(); ask(); }}>
            <SearchIcon />
            <label className="visually-hidden" htmlFor="question">Ask a question about your documents</label>
            <textarea
              id="question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); ask(); }
              }}
              placeholder="Ask a question about your documents…"
              rows={1}
              maxLength={1000}
            />
            <button className="ask-button" type="submit" disabled={question.trim().length < 3 || isStreaming} aria-label="Ask question">
              <ArrowIcon />
            </button>
            <small><kbd>↵</kbd> to ask · <kbd>shift ↵</kbd> for a new line</small>
          </form>
        </section>

        <aside className="inspector-panel" aria-label="Response inspector">
          <div className="panel-heading inspector-heading">
            <div><p className="eyebrow">Response</p><h2>Quality ledger</h2></div>
            {quality && <span className={`verdict ${quality.verdict}`}><CheckIcon />{quality.verdict}</span>}
          </div>

          {!quality ? (
            <div className="empty-inspector">
              <div className="ledger-mark"><span /><span /><span /></div>
              <h3>Awaiting an answer</h3>
              <p>Quality signals and retrieved evidence will appear here after you ask the collection.</p>
            </div>
          ) : (
            <div className="quality-content">
              <div className="overall-score">
                <div className="score-ring" style={{ "--score": `${score(quality.overall) * 3.6}deg` } as React.CSSProperties}>
                  <strong>{score(quality.overall)}</strong><span>/ 100</span>
                </div>
                <div><p className="eyebrow">Overall confidence</p><h3>{quality.verdict === "strong" ? "Well supported" : quality.verdict === "review" ? "Review suggested" : "Needs attention"}</h3><small>{quality.method === "model" ? "Structured model grade" : "Deterministic local grade"}</small></div>
              </div>

              <div className="metric-list">
                {[
                  ["Groundedness", quality.groundedness],
                  ["Citation coverage", quality.citationCoverage],
                  ["Answer relevance", quality.answerRelevance],
                ].map(([label, value]) => (
                  <div className="metric" key={label as string}>
                    <div><span>{label}</span><strong>{score(value as number)}%</strong></div>
                    <i><b style={{ width: `${score(value as number)}%` }} /></i>
                  </div>
                ))}
              </div>

              <div className="review-notes"><p className="eyebrow">Reviewer notes</p>{quality.notes.map((note) => <p key={note}><CheckIcon />{note}</p>)}</div>
            </div>
          )}

          <div className="evidence-section">
            <div className="section-title"><p className="eyebrow">Retrieved evidence</p>{sources.length > 0 && <span>{sources.length} passages</span>}</div>
            {sources.length === 0 ? <p className="evidence-empty">Sources will be ranked here before the answer starts.</p> : (
              <>
                <div className="source-tabs" role="tablist">
                  {sources.map((source, index) => (
                    <button key={source.id} role="tab" aria-selected={selectedSource === index} onClick={() => setSelectedSource(index)}>S{index + 1}</button>
                  ))}
                </div>
                {activeSource && (
                  <article className="source-card">
                    <div><FileIcon /><span>{activeSource.documentName}</span><strong>{score(activeSource.score)}% match</strong></div>
                    <blockquote>“{activeSource.content}”</blockquote>
                    <small>Passage {activeSource.chunkIndex + 1}{activeSource.page ? ` · page ${activeSource.page}` : ""}</small>
                  </article>
                )}
              </>
            )}
          </div>
        </aside>
      </section>

      <section className="engineering-strip" id="engineering">
        <p className="eyebrow">Built as an applied AI transition project</p>
        <p>This project applies senior full stack product judgment to retrieval, model integration, evaluation, and trustworthy interaction design. It demonstrates learning through concrete engineering decisions, not a claim of long term AI specialization.</p>
        <div><span>Next.js</span><span>OpenAI Responses</span><span>PostgreSQL + pgvector</span><span>Structured evaluation</span><span>Playwright</span></div>
      </section>
    </main>
  );
}
