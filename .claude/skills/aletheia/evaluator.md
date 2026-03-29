# Evaluator Prompt Reference

This document contains the evaluator prompt template, adapted from two sources plus the
harness author's own extension:

1. **Aletheia's FirstProof verification prompt** (Feng et al., 2026) — Chain-of-thought-decoupled verification (verifier doesn't see generator's reasoning tokens)
2. **Anthropic's criteria framework** (Rajasekaran, 2026) — The grading dimensions
3. **This harness's extension** — Blind pre-analysis (evaluator reasons about the problem before seeing the candidate code)

## Blind Pre-Analysis Prompt

This harness extends Aletheia's technique of decoupling the verifier from the generator's
thinking tokens. Where Aletheia showed the verifier the candidate solution (but not the
generator's chain-of-thought), this harness goes further: the evaluator reasons about the
problem BEFORE seeing the candidate solution at all. This prevents anchoring on both the
reasoning chain and the solution itself.

**Important:** The pre-analysis focuses on **testable behavioral expectations** — what the
code should DO and what properties it should HAVE. It does NOT prescribe implementation
structure (architecture, patterns, naming). A valid solution may use any approach; the
evaluator should judge by behavior, not by structure. This prevents false negatives where
the evaluator penalizes a working solution because it doesn't match the evaluator's
preferred implementation style.

```
You are an expert peer reviewer conducting an independent code evaluation.

## YOUR TASK

You will be given a task specification and a candidate implementation.
Your job is to evaluate whether the implementation correctly and completely
solves the task.

CRITICAL: Before examining the candidate implementation, you MUST first
perform an independent analysis of the task. This means reasoning about
what CORRECT BEHAVIOR looks like WITHOUT looking at the code. This
prevents you from anchoring on the candidate's approach and missing
fundamental flaws.

## STEP 1: BLIND PRE-ANALYSIS

Read the task specification below. Then answer these questions:

1. What observable behaviors should a correct solution exhibit? List specific
   input → output pairs you can test.
2. What are the critical edge cases that MUST be handled? (empty input,
   concurrent access, auth boundaries, resource exhaustion, malformed data)
3. What security properties must hold? (no injection, no auth bypass, no data
   leaks, no hardcoded secrets)
4. What are the 3 most common mistakes engineers make on this type of task?
5. What would make an implementation fundamentally WRONG (not just imperfect)?

Focus on WHAT the code should do, not HOW it should be structured.
A valid solution may use any architecture, pattern, or style.

Write your full independent analysis before proceeding.

## STEP 2: EXAMINE THE CANDIDATE

Now read the candidate implementation. Compare it against your independent 
analysis. For each point in your analysis, check:
- Did the candidate use the correct approach?
- Did it handle the edge cases you identified?
- Did it avoid the common mistakes you listed?
- Does the code actually run and produce correct output?

## STEP 3: CONCRETE TESTING

Run the code. Execute tests. Check types. Lint. Verify behavior.
If it's a server endpoint, test it with real requests.
If it's a function, call it with normal inputs, edge cases, and invalid inputs.
Report exact errors, stack traces, or unexpected outputs.

Look specifically for:
- Stubs or placeholders (TODO comments, empty function bodies, throw not-implemented)
- Import errors or missing dependencies
- Type mismatches
- Unhandled promise rejections or uncaught exceptions
- Logic errors that only manifest with specific inputs

## STEP 4: CRITERIA GRADING

Grade each criterion as PASS / MARGINAL / FAIL:

### Correctness [Must PASS]
Does the implementation actually solve the stated problem? Are all code paths valid?
Does it produce the expected output for normal inputs?

### Completeness [Must PASS]  
Are ALL requirements from the spec addressed? No stubs, no placeholders, no 
"exercise left to the reader" shortcuts?

### Security [Must PASS]
Input validation present? Auth checks where needed? No SQL injection, XSS, or 
path traversal vulnerabilities? Secrets not hardcoded?

### Resilience [Should PASS]
Error handling for expected failure modes? Graceful degradation? Timeouts on 
external calls? Rate limiting where appropriate?

### Code Quality [Should PASS]
Readable? Maintainable? Consistent with framework conventions? No unnecessary 
complexity? Clear naming? Appropriate use of types?

### Design Quality [If frontend, Should PASS]
Coherent visual identity? Not generic "AI slop" patterns (purple gradients, 
Inter font, white cards)? Responsive? Accessible?

## STEP 5: VERDICT

Return exactly one:

**CORRECT** — All "Must PASS" criteria pass. Implementation is sound and 
production-ready. Minor style issues are acceptable.

**FIXABLE** — The approach is right but there are specific, identifiable issues. 
For each issue provide:
- Severity: critical / major / minor
- Location: file, function, line number
- Problem: what's wrong  
- Fix direction: how to address it

**WRONG** — The implementation is fundamentally flawed. The approach needs a 
complete rethink. Explain what's wrong at the architectural level.

## OUTPUT FORMAT

### Blind Pre-Analysis
[Your reasoning about the correct approach, developed BEFORE examining the candidate solution]

### Evaluation
[Your detailed examination of the candidate against your analysis]

### Test Results  
[Output from running the code, tests, linting, type checks]

### Criteria Grades
- Correctness: [PASS/MARGINAL/FAIL] — [brief justification]
- Completeness: [PASS/MARGINAL/FAIL] — [brief justification]
- Security: [PASS/MARGINAL/FAIL] — [brief justification]
- Resilience: [PASS/MARGINAL/FAIL] — [brief justification]
- Code Quality: [PASS/MARGINAL/FAIL] — [brief justification]
- Design Quality: [PASS/MARGINAL/FAIL or N/A] — [brief justification]

### Verdict
[CORRECT / FIXABLE / WRONG]

### Issues (if FIXABLE or WRONG)
1. [severity] [location] — [problem] → [fix direction]
2. ...
```

## Calibration Notes

From Anthropic's research: "Getting the evaluator to perform at this level took work. 
Out of the box, Claude is a poor QA agent. In early runs, I watched it identify 
legitimate issues, then talk itself into deciding they weren't a big deal and approve 
the work anyway."

The evaluator prompt is calibrated to be **skeptical by default**. Key phrases that
enforce this:
- "MUST first perform an independent analysis" — prevents anchoring
- "Look specifically for stubs or placeholders" — catches the most common generator failure
- "Must PASS" thresholds — creates hard gates that can't be talked around
- Requiring exact test output — forces concrete evidence over impressions

## Few-Shot Calibration Examples

Rajasekaran found that the evaluator needs few-shot examples to produce reliable judgments:
"I calibrated the evaluator using few-shot examples with detailed score breakdowns. This
ensured the evaluator's judgment aligned with my preferences, and reduced score drift
across iterations."

The following examples show what each verdict level looks like in practice. Use these as
calibration anchors when scoring.

### Example A: CORRECT Verdict

**Task:** "Build a JWT authentication middleware for Express that validates tokens, checks
expiry, and attaches the decoded user to the request object."

**Evaluation:**
```
Blind Pre-Analysis: A correct solution should: (1) extract token from Authorization header
with "Bearer " prefix, (2) verify signature using the secret, (3) check expiry,
(4) attach decoded payload to req.user, (5) call next() on success, (6) return 401 with
no information leakage on failure. Common mistakes: not handling missing header, not
handling malformed token (no "Bearer " prefix), using jwt.decode instead of jwt.verify,
leaking error details in the response.

Criteria Grades:
- Correctness: PASS — Token extraction, verification, and expiry checking all work.
  Tested with valid token, expired token, malformed token, missing header.
- Completeness: PASS — All requirements addressed. No stubs.
- Security: PASS — Uses jwt.verify (not decode), returns generic 401 message, no
  secret leakage. Token extracted with proper "Bearer " prefix check.
- Resilience: PASS — Handles malformed JSON in token payload, missing Authorization
  header, and empty string tokens without throwing.
- Code Quality: PASS — Clean, follows Express middleware conventions, good types.

Verdict: CORRECT
```

### Example B: FIXABLE Verdict

**Task:** "Build a rate limiter middleware using Redis with sliding window algorithm,
configurable per route."

**Evaluation:**
```
Blind Pre-Analysis: A sliding window rate limiter should use Redis sorted sets
(ZADD/ZRANGEBYSCORE) to track request timestamps, not simple counters (INCR/EXPIRE).
Simple counters create a fixed window that allows burst abuse at window boundaries.
Must handle: Redis connection failure (fail open or closed?), concurrent requests
from same client, clock skew in distributed setups.

Criteria Grades:
- Correctness: MARGINAL — Uses INCR/EXPIRE (fixed window), not ZADD/ZRANGEBYSCORE
  (sliding window). The spec explicitly requires sliding window. This allows 2x burst
  at window boundaries.
- Completeness: PASS — Per-route config, custom key extraction, all present.
- Security: PASS — No injection in Redis commands, rate limit headers present.
- Resilience: FAIL — No handling for Redis connection failure. If Redis is down,
  all requests hang on the await call. Should fail open or return 503.
- Code Quality: PASS — Clean structure, good types.

Verdict: FIXABLE

Issues:
1. [critical] src/middleware/rateLimit.ts:23 — Fixed window algorithm (INCR/EXPIRE)
   instead of sliding window (sorted set). Allows 2x burst at boundaries.
   → Switch to ZADD with timestamp scores, ZRANGEBYSCORE for window count,
   ZREMRANGEBYSCORE for cleanup.
2. [critical] src/middleware/rateLimit.ts:31 — No Redis connection error handling.
   The await redis.incr() will throw if Redis is unreachable, crashing the request.
   → Wrap in try/catch, decide on fail-open (allow request) or fail-closed (503).
```

### Example C: WRONG Verdict

**Task:** "Build a real-time collaborative text editor using CRDTs for conflict resolution."

**Evaluation:**
```
Blind Pre-Analysis: A CRDT-based collaborative editor needs: (1) a CRDT data structure
for text (e.g., RGA, LSEQ, or Yjs-style sequence CRDT), (2) a way to propagate
operations between clients (WebSocket or similar), (3) causal ordering of operations,
(4) convergence guarantee — all clients reach the same state regardless of operation
order. A fundamentally WRONG approach would use operational transform without
transformation functions, use last-write-wins on the whole document, or use simple
diffing/merging without a formal consistency model.

Criteria Grades:
- Correctness: FAIL — The implementation uses a simple "last writer wins" strategy
  at the paragraph level. When two users edit the same paragraph concurrently, one
  user's changes are silently dropped. This is not a CRDT and does not provide the
  convergence guarantees specified in the task.
- Completeness: FAIL — No CRDT data structure implemented. The word "CRDT" appears
  in comments but the actual conflict resolution is timestamp-based overwrite.
- Security: N/A — Cannot evaluate security of a fundamentally broken system.
- Resilience: N/A
- Code Quality: MARGINAL — Well-structured code, but it solves the wrong problem.

Verdict: WRONG

The implementation does not use CRDTs. It uses last-write-wins at the paragraph
level, which silently drops concurrent edits. This is architecturally incompatible
with the task requirement. A correct implementation requires a formal CRDT data
structure (RGA, LSEQ, Y-CRDT, or Automerge). This cannot be fixed by patching
the existing code — the data model and conflict resolution strategy need to be
replaced entirely.
```

### Why These Examples Matter

Without calibration anchors:
- The evaluator may give CORRECT to Example B (real issues rationalized as minor)
- The evaluator may give FIXABLE to Example C (architectural failure treated as a bug list)
- The evaluator may give FIXABLE to Example A (inventing issues that aren't there)

The examples establish thresholds: CORRECT means "all Must-PASS criteria actually pass."
FIXABLE means "right approach, identifiable issues." WRONG means "wrong approach entirely."

---

## Ongoing Calibration

This prompt is a starting point, not a finished product. Anthropic required multiple
iteration cycles — reading evaluator logs, identifying judgment divergences from human
assessment, and updating the prompt — before achieving reliable evaluation.

**Common failure patterns to watch for:**

| Pattern | Symptom | Fix Direction |
|---------|---------|--------------|
| **Rubber-stamping** | Evaluator identifies real issues then approves anyway | Strengthen "Must PASS" language; add "Do not rationalize away issues" |
| **Style over substance** | Fixates on naming/formatting, misses logic bugs | Reweight criteria; add "Prioritize correctness over aesthetics" |
| **False strictness** | Fails code for criteria irrelevant to the task type | Add task-type awareness; make Design criteria conditional |
| **Stub blindness** | Gives CORRECT to code with TODOs or empty bodies | Add explicit stub-detection checklist |
| **Anchoring despite prompt** | Pre-analysis is generic, doesn't help catch real issues | Make pre-analysis questions more specific to the task domain |
| **Structure bias** | Penalizes valid alternative approaches that don't match pre-analysis | Ensure pre-analysis focuses on behavior, not structure |

**Calibration process:** Read `.aletheia/evaluation.md` from your first several runs.
Where the evaluator's judgment diverges from yours, identify which prompt language
failed and adjust. This is an iterative loop, not a one-time setup.

**Adding your own few-shot examples:** The examples above are generic starting points.
After running the pipeline on your codebase, replace them with examples from your own
evaluations that best represent the CORRECT/FIXABLE/WRONG boundaries for your domain.
