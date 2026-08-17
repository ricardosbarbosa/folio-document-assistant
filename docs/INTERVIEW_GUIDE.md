# Interview guide

## Accurate project framing

Use this framing:

> I am a senior full stack engineer moving deliberately into applied AI product development. I built Folio to learn the parts that sit beyond a model call: document ingestion, retrieval quality, streamed interaction design, structured evaluation, and operational failure modes. My contribution is strongest where product judgment, system design, and AI behavior meet.

Avoid describing yourself as an experienced AI engineer. The strength of this project is the evidence of learning and implementation.

## Two minute walkthrough

1. Start with the user problem. Analysts need useful answers, but they also need to verify them.
2. Upload a document or show the seeded source library.
3. Ask an architecture or evaluation question.
4. Point out that sources arrive before the streamed answer.
5. Open a citation and connect it to the exact retrieved passage.
6. Explain the quality ledger and the distinction between deterministic checks and model grading.
7. Close with one tradeoff and one next step.

## Engineering story

The familiar full stack work includes typed APIs, PostgreSQL modeling, streaming protocols, responsive UI, error handling, and browser tests.

The applied AI learning includes chunk design, embedding based retrieval, evidence constrained prompting, source lineage, structured model output, grader limitations, and benchmark design.

That boundary is useful in an interview because it is honest and concrete. You are not claiming research expertise. You are showing that you can turn probabilistic model behavior into an inspectable product system.

## Questions you should expect

### Why not send the whole document to the model?

Retrieval controls context size, cost, and source traceability. It also creates a measurable stage where relevant evidence can be evaluated independently from answer generation.

### Why use a model to grade another model?

Model grading scales semantic review, but it is not ground truth. Folio pairs it with deterministic citation checks and a reviewed benchmark. The interface labels which method produced the grade.

### What would you improve next?

Add hybrid keyword and vector retrieval, reranking, tenant isolation, async ingestion jobs, richer page metadata, user feedback, and a larger reviewed benchmark with unanswerable cases.

### What did you learn?

The hardest problem is not generating plausible prose. It is maintaining evidence lineage across parsing, retrieval, prompting, streaming, display, storage, and evaluation so that the answer remains inspectable.

## Demonstrable evidence

* `db/schema.sql` shows vector dimensions, HNSW indexing, lineage, and evaluation persistence.
* `lib/retrieval.ts` isolates ranking from generation.
* `app/api/chat/route.ts` shows typed streaming and evidence constrained prompting.
* `lib/quality.ts` shows structured output with a deterministic fallback.
* `evals/benchmark.json` and `scripts/run-evals.ts` show a versioned quality gate.
* `tests/e2e/workbench.spec.ts` verifies the user visible trust flow.
