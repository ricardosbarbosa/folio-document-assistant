"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="error-page">
      <p className="eyebrow">Workspace interrupted</p>
      <h1>The research desk needs a reset.</h1>
      <p>Your documents are safe. Refresh this view and continue where you left off.</p>
      <button className="primary-button" onClick={reset}>Try again</button>
    </main>
  );
}
