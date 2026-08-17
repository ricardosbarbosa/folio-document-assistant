# Engineering decisions

## Product principle: make trust inspectable

The product does not ask users to trust fluent text. It presents retrieved passages before generation finishes, requires source labels in factual paragraphs, and shows a separate quality ledger. The interface exposes what the system knows, what evidence it used, and how the answer was graded.

This is a product decision as much as a model decision. A more capable model would not remove the need for traceability.

## PostgreSQL and pgvector instead of a separate vector database

The portfolio scope benefits from keeping documents, chunks, embeddings, answers, and evaluations in one transactional system. PostgreSQL already provides reliable constraints, lineage queries, and operational familiarity. pgvector adds cosine distance and HNSW indexing without another service boundary.

The tradeoff is that a dedicated vector system may offer more advanced hybrid ranking or very large scale operations. The boundary is isolated in `lib/retrieval.ts` and `lib/repository.ts`, so the retrieval implementation can change without rewriting the product flow.

Neon hosts the production database. Application traffic uses its pooled endpoint while migrations use the direct endpoint. This avoids exhausting connections under serverless concurrency without routing session sensitive schema work through transaction pooling.

## Custom retrieval instead of hosted file search

Building the retrieval path makes chunking, embedding dimensions, ranking, and source lineage visible during an interview. It also allows the evaluation suite to measure retrieval separately from answer generation.

The tradeoff is more ownership. File parsing, index tuning, migrations, and failure recovery are application responsibilities. For a team optimizing for delivery speed instead of learning visibility, hosted file search would deserve serious consideration.

## Responses API streaming plus a separate structured grader

The answer path optimizes for perceived responsiveness and streams text as it is generated. The grader optimizes for a reliable machine readable contract and uses strict structured output. Keeping these concerns separate lets the answer appear immediately while evaluation completes afterward.

This means one additional model call per inspected answer. In production I would sample grading based on traffic, risk, and cost while retaining deterministic citation checks for every response.

## Newline delimited JSON as the browser protocol

Typed events carry sources, answer deltas, quality, completion, and errors through one response. Sources arrive before the first answer token, so the interface can establish evidence context early.

Server sent events were another option. Newline delimited JSON keeps the route a standard streamed response and is simple to parse with the Fetch API. A future multi turn product could adopt a durable event transport without changing event semantics.

## Explicit degraded mode

The application reports its capabilities through `/api/health`. Without PostgreSQL it uses a labeled seeded corpus, and upload attempts explain what is missing. This keeps the portfolio demonstrable while avoiding a fake success state.

The seeded mode is also the deterministic fixture for Playwright and evaluation checks. Live integration is verified separately.

## Evaluation strategy

The first benchmark covers three core intents: architecture, quality method, and product audience. Each case records an expected source document and required answer terms. The gate measures retrieval recall, citation presence, term coverage, and overall quality.

This is a starting benchmark, not proof of general quality. The next meaningful step is to add reviewed examples from real document sets, especially partial and unanswerable questions, then track results by prompt and model version.

## Production boundaries

Before public deployment I would add identity, tenant level document isolation, managed rate limiting, malware scanning, object storage for originals, deletion workflows, observability, retention controls, and a larger reviewed benchmark. These are named boundaries rather than hidden omissions.
