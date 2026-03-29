---
name: aletheia
description: >
  Research-grade Planner-Generator-Evaluator pipeline for complex coding tasks.
  Synthesizes techniques from Google DeepMind's Aletheia agent (CoT-decoupled verification)
  and Anthropic's harness design research (criteria-based evaluation, planning),
  with the author's own blind pre-analysis technique extending Aletheia's decoupling principle.
  Use when building features, reviewing code, making architecture decisions, or when 
  the user says "aletheia", "harness", "evaluate this", or "full pipeline".
  Skip for simple questions, quick fixes, or one-line changes.
---

# Aletheia Harness

You are operating as a multi-agent pipeline inspired by two research papers:
1. **Aletheia** (Feng et al., 2026) — Generator-Verifier-Reviser loop with chain-of-thought-decoupled verification
2. **Anthropic Harness Design** (Rajasekaran, 2026) — Planner-Generator-Evaluator with criteria grading (evolved through V1→V1.5→V2)
3. **This harness's own contribution** — Blind pre-analysis, extending Aletheia's decoupling into full pre-evaluation reasoning

## Core Principle

**Separate generation from evaluation.** Both research teams independently found this is the highest-leverage intervention in agentic workflows. You must never evaluate your own work in the same cognitive pass that produced it.

## Invocation Modes

Parse `$ARGUMENTS` to determine the mode:

- **`/aletheia [task description]`** → Full pipeline: Plan → Build → Evaluate → Revise
- **`/aletheia review [file or path]`** → Evaluate existing code with independent reasoning
- **`/aletheia architect [description]`** → Architecture proposal with adversarial evaluation
- **`/aletheia quick [task]`** → Lightweight: skip planner, build → single evaluation pass

**Compute note:** The full pipeline uses significantly more messages and context than a solo agent (Anthropic measured ~10-20x on API). On a Claude Code subscription, the constraint is **rate limits** (messages per time window), not dollar cost. The pipeline spawns subagents and runs multiple evaluation passes, each consuming messages. Use `quick` for tasks within the model's reliable solo capability. Reserve the full pipeline for complex tasks where subtle bugs from single-pass generation would cost more debugging time than the pipeline costs in messages.

## Environment: Claude Code on Subscription

This harness is designed for **Claude Code** (CLI/desktop/web) running on an Anthropic subscription, not API calls. Key implications:

- **The evaluator runs as a teammate**, not a regular subagent. Teammates are independent Claude Code sessions spawned via the Agent Teams system (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`). Unlike subagents, teammates load the same project context as a regular session — including MCP servers, CLAUDE.md, and skills.
- **Teammates CAN access MCP tools** like `claude-in-chrome` for live browser testing. However, there is a **known Windows bug** (anthropics/claude-code#30499) where team members cannot access chrome MCP tools. On Windows, the main agent collects browser evidence and the teammate evaluates it from files. On macOS/Linux, the teammate can use chrome directly.
- **Regular subagents** (spawned via the `Agent` tool without teams) have access to Bash, Read, Write, Edit, Glob, Grep — but NOT MCP tools. Use these for focused subtasks within a phase, not for the evaluator.
- **Context compaction** is handled automatically by Claude Code. Manual context resets are rarely needed.
- **Teammate communication** uses the mailbox system (SendMessage) and shared files in `.aletheia/`. The evaluator teammate writes its verdict to `.aletheia/evaluation.md` and sends a summary back via mailbox.
- **File paths** for the evaluator prompt and few-shot examples: the skill files live at `~/.claude/skills/aletheia/` (global install) or `.claude/skills/aletheia/` (project install). Read `evaluator.md` and inline its content into the teammate's task prompt.

---

## PHASE 1: PLANNER

**When:** Full pipeline mode. Skip for `review`, `architect`, and `quick` modes.

**Source:** Anthropic's harness research found that without a planner, the generator under-scopes and produces less feature-rich applications.

**Instructions:**
1. Take the user's brief description (often 1-4 sentences)
2. Expand it into a comprehensive specification covering:
   - Functional requirements (what it does)
   - Technical approach (stack, key libraries, data model)
   - User-facing behavior (what the user sees and does)
   - Edge cases and error scenarios
   - Security considerations
3. **Be ambitious about scope** but stay focused on product context and high-level design
4. **Do NOT specify granular implementation details.** From Anthropic's research: "If the planner tried to specify granular technical details upfront and got something wrong, the errors in the spec would cascade into the downstream implementation."
5. Write the spec to a file: `.aletheia/spec.md`
6. Present the spec to the user for approval before proceeding

---

## PHASE 2: GENERATOR

**Instructions:**
1. If a spec exists (from Planner), build against it feature by feature
2. If in `quick` mode, build directly from the task description
3. If in `review` mode, see **Review Mode** below
4. If in `architect` mode, see **Architect Mode** below

### Review Mode (`/aletheia review [path]`)

Skip the Planner. The "generator" phase is replaced by reading and understanding the existing code:
1. Read the target files thoroughly. Understand the intent, not just the syntax.
2. Identify what the code is TRYING to do — this becomes the implicit spec for evaluation.
3. Proceed directly to Phase 3 (Evaluator). The evaluator's blind pre-analysis receives the inferred spec, not the code itself.
4. If the evaluator returns FIXABLE, produce targeted fixes. If WRONG, explain the architectural problems and propose an alternative approach.

### Architect Mode (`/aletheia architect [description]`)

The Planner runs normally. The "generator" produces a detailed architecture proposal instead of code:
1. System component diagram with responsibilities and interfaces
2. Data model (entities, relationships, access patterns)
3. Key technical decisions with tradeoffs documented
4. Integration points and failure modes
5. Proceed to Phase 3 (Evaluator), which evaluates the architecture for soundness, completeness, and feasibility rather than running code.

### Standard and Quick Modes

**During generation:**
- Think step by step before writing code
- Handle edge cases and errors explicitly
- Follow established patterns in the existing codebase
- Do NOT stub or placeholder anything — complete implementations only
- After completing, do a quick self-check, but understand that the Evaluator will provide the real assessment

**Quality targets (from the evaluation criteria — knowing these improves first-pass quality):**
- **Correctness:** All code paths must produce correct output for normal and edge-case inputs
- **Completeness:** Every requirement in the spec must be addressed. No TODOs, no placeholders, no "exercise left to the reader"
- **Security:** Validate inputs, prevent injection, protect auth boundaries, don't hardcode secrets
- **Resilience:** Handle expected failure modes — timeouts, missing data, malformed input, dependency failures
- **Code Quality:** Readable, maintainable, consistent with framework conventions

---

## PHASE 3: EVALUATOR

**This is the critical phase. Follow the steps precisely in order.**

**Source:** This combines Aletheia's independent reasoning technique with Anthropic's criteria-based grading and live testing.

### Architecture: Main Agent (Team Lead) + Evaluator Teammate

The evaluator is a **teammate** — an independent Claude Code session with its own context window. It has never seen the generator's reasoning, achieving true CoT decoupling as Aletheia intended.

**Why teammates, not subagents:** Teammates load the full project context including MCP servers. This means the evaluator can (on macOS/Linux) use claude-in-chrome directly for live browser testing. Subagents cannot access MCP tools at all.

**Windows limitation:** Due to a known bug (anthropics/claude-code#30499), teammates on Windows cannot access claude-in-chrome. On Windows, the main agent collects browser evidence before spawning the evaluator. On macOS/Linux, the evaluator teammate handles browser testing directly (skip Step 2a).

### Step 2a: Browser Evidence Collection (main agent — Windows only, frontend tasks only)

**Skip this step entirely if:**
- The task is not frontend/UI work, OR
- You are on macOS/Linux (the evaluator teammate will use chrome directly)

On Windows, for tasks that produce a UI or web interface, the main agent collects raw browser evidence before spawning the evaluator. The main agent acts as a **test runner**, not an evaluator — it captures evidence without making quality judgments.

1. Start the dev server (Bash)
2. Use claude-in-chrome to:
   - Call `tabs_context_mcp` to check existing browser state
   - Create a new tab and navigate to the running app
   - Take screenshots of key pages/states, save to `.aletheia/screenshots/`
   - Read console messages for errors/warnings
   - Read network requests for failed API calls
   - Test core interactions: fill forms, click buttons, navigate between pages
   - Record the results of each interaction factually
3. Write a factual test report to `.aletheia/browser-evidence.md`:
   - Screenshots taken and what they show (not whether it's "good")
   - Console errors/warnings (verbatim)
   - Network failures (verbatim)
   - Interaction results: "clicked Submit → page navigated to /dashboard" (not "Submit works well")
   - Any elements that failed to render or respond

**Important:** This report must be **observational, not evaluative**. The main agent generated this code and is biased toward it. Record what happened, not whether it's correct. The teammate will judge.

### Spawning the Evaluator Teammate

**Spawn the evaluator as a named teammate using the Agent tool with `team_name`:**

```
Agent tool parameters:
  name: "aletheia-evaluator"
  team_name: "aletheia"
  prompt: [evaluator task — see below]
```

The teammate's task prompt should include:
- The task spec or task description
- The file paths of generated code to read
- The full evaluator prompt and few-shot examples (read from `evaluator.md` and inlined — the teammate may not find skill files automatically)
- If Windows + frontend: the path to `.aletheia/browser-evidence.md` and `.aletheia/screenshots/`
- If macOS/Linux + frontend: instructions to start the dev server and use claude-in-chrome for live browser testing
- Explicit instruction: "You are an independent evaluator. You have NOT seen the generator's reasoning. Write your evaluation to `.aletheia/evaluation.md`."
- It does NOT receive the generator's conversation history

**Teammate tools available:** Bash, Read, Write, Edit, Glob, Grep, AND MCP tools (claude-in-chrome on macOS/Linux). On Windows, MCP tools are unavailable to teammates due to the known bug.

**After the teammate completes:** Read `.aletheia/evaluation.md` for the verdict and proceed to Phase 4 (revision) or stop (WRONG/CORRECT).

The teammate performs the following steps:

### Step 1: Blind Pre-Analysis (this harness's extension of Aletheia's decoupling principle)

**Before reading any generated code**, the evaluator independently reasons about the task. The pre-analysis focuses on **testable behavioral expectations** — what the code should DO and what properties it should HAVE — not on implementation structure (which could penalize valid alternative approaches).

The blind pre-analysis prompt:

```
You are an independent code evaluator. You have NOT seen the implementation.

Given this task specification:
[INSERT SPEC OR TASK DESCRIPTION]

Before you look at any code, independently reason about:
1. What observable behaviors should a correct solution exhibit?
2. What inputs should produce what outputs? List specific test cases.
3. What are the critical edge cases that MUST be handled? (empty input, concurrent access, auth boundaries, resource exhaustion)
4. What security properties must hold? (no injection, no auth bypass, no data leaks)
5. What are common mistakes engineers make on this type of task?
6. What would make an implementation fundamentally WRONG (not just imperfect)?

Focus on WHAT the code should do, not HOW it should be structured.
A valid solution may use any architecture, pattern, or style — judge by behavior, not by structure.

Write your independent analysis. Be specific and testable.
```

### Step 2b: Concrete Testing (evaluator teammate)

After independent analysis, the evaluator reads and tests the actual implementation:

1. **Read the code** from the file paths provided
2. **Run non-browser tests** using Bash: execute test suites, type checks, linting. If it's a server, start it and test endpoints with curl. If it's a CLI tool, run it with test inputs.
3. **Browser testing (two paths):**
   - **macOS/Linux (teammate has chrome):** Start the dev server, use claude-in-chrome to navigate the app, take screenshots, read console/network errors, interact with the UI. Test against the behavioral expectations from Step 1.
   - **Windows (teammate lacks chrome):** Read `.aletheia/browser-evidence.md` and screenshots collected by the main agent. Compare what the browser showed against the behavioral expectations from Step 1. Look for: visual rendering issues, console errors, failed network requests, broken interactions.
4. **Check every requirement** against the spec or task description
5. **Probe edge cases** identified in the independent analysis with actual test inputs via Bash
6. **Look for stubs.** Anthropic found that generators frequently stub features without completing them. Any `TODO`, `// placeholder`, `throw new Error('not implemented')`, or empty function body is a FAIL.

### Step 3: Criteria Grading (from Anthropic's Harness Research)

Grade the implementation against these criteria. Each gets a score of PASS / MARGINAL / FAIL:

| Criterion | Threshold | What to Check |
|-----------|-----------|--------------|
| **Correctness** | Must PASS | Does it solve the stated problem? All code paths valid? |
| **Completeness** | Must PASS | All requirements addressed? No stubs or placeholders? |
| **Security** | Must PASS | Input validation, auth, data protection, injection prevention |
| **Resilience** | Should PASS | Error handling, edge cases, graceful degradation |
| **Code Quality** | Should PASS | Readable, maintainable, follows framework conventions |
| **Design** | If frontend | Coherent visual identity, not generic AI patterns. Judge from screenshots if available. |

### Step 4: Verdict (from DeepMind's Aletheia)

Based on the evaluation, return exactly one verdict:

- **CORRECT** — All "Must PASS" criteria pass. Minor issues acceptable. Ship it.
- **FIXABLE** — Right approach, but specific identifiable issues. List each issue with:
  - Severity: `critical` / `major` / `minor`
  - Location: specific file, function, or line
  - Problem: what's wrong
  - Direction: how to fix it
- **WRONG** — Fundamentally flawed approach. Needs complete rethink. Explain what's wrong at the architectural level.

The teammate writes the full evaluation to `.aletheia/evaluation.md`.

---

## PHASE 4: REVISION (if verdict is FIXABLE)

**Source:** Aletheia's revision loop. The revision is targeted, not a restart.

1. Read the evaluator's feedback carefully
2. Address **every** issue, in order of severity (critical → major → minor)
3. Do not introduce new problems while fixing existing ones
4. Preserve what was correct in the original implementation
5. After revision, return to **PHASE 3: EVALUATOR** for re-evaluation

**Maximum iterations:** 3. If still not CORRECT after 3 revision cycles, trigger **abstention** (see below).

**Attribution note:** Published Aletheia artifacts demonstrate at most one revision pass. The 3-iteration maximum is this harness's own design parameter. Adjust based on task complexity and compute budget.

---

## WRONG VERDICT: STOP, DON'T REVISE

**Source:** Aletheia's WRONG verdict is terminal. From the paper: a WRONG solution is "fundamentally flawed, relies on invalid logic, or cannot be salvaged without complete rewrite." The system details the fatal flaws and stops. It does not attempt revision.

**Why this matters:** Attempting to revise a fundamentally wrong approach wastes compute and often produces something worse than starting over. If the architecture is wrong, patching individual functions won't help.

**When the evaluator returns WRONG:**
1. Present the evaluator's architectural critique to the user
2. Explain what was fundamentally flawed and why revision won't help
3. Ask the user how to proceed: restart with a different approach, narrow the scope, or abandon
4. Do NOT silently retry or attempt to patch the implementation

---

## ABSTENTION

**Source:** A key Aletheia feature. The system outputs "No solution found" when it can't solve a problem. This is what gave Aletheia >82% conditional accuracy — it knows when it doesn't know.

**Abstention triggers:**
- WRONG verdict from the evaluator (architectural failure)
- FIXABLE verdict persists after 3 revision cycles (convergence failure)
- Generator cannot produce a working implementation for the spec (capability limit)

**When abstaining:**
1. Write a summary to `.aletheia/evaluation.md` explaining what was attempted and why it failed
2. Tell the user honestly: "This pipeline could not produce a correct solution for this task."
3. Provide the evaluator's analysis of what went wrong — this is still valuable even without a working solution
4. Suggest alternatives: simplify the task, break it into smaller pieces, or try a different approach

**Delivering broken code with confidence is worse than delivering no code with an explanation.** The value of abstention is that when the pipeline DOES deliver code, you can trust it more.

---

## LOGGING

Create an `.aletheia/` directory in the project root. Log each phase:

```
.aletheia/
├── spec.md              # Planner output (if used)
├── evaluation.json      # Latest evaluator output (structured)
├── evaluation.md        # Latest evaluator output (human-readable)
└── log.md               # Timestamped pipeline trace
```

**Why both JSON and markdown for evaluation?** Anthropic's "Effective harnesses" research found that models are less likely to inappropriately modify JSON files. The structured `evaluation.json` contains the criteria grades, verdict, and issue list in a machine-readable format. The markdown version is the full narrative for human reading. If only one is practical, prefer the markdown — the structured format is a robustness improvement, not a requirement.

The log should record:
- Which phases ran and in what order
- Verdict at each evaluation
- Issues found and whether they were resolved
- Total iterations

This follows both teams' emphasis on transparency. From Aletheia: all prompts and outputs were published. From Anthropic: evaluator logs were read to tune harness performance over time.

---

## CONTEXT MANAGEMENT

Anthropic identified "context anxiety" — premature wrap-up behavior as the context window fills. Their V1 harness used context resets between phases. However, **their V2 harness (Opus 4.6) dropped context resets entirely**: "Opus 4.5 largely removed that behavior on its own, so I was able to drop context resets from this harness entirely."

**Default behavior:** Trust the model's native coherence and automatic compaction. Do not proactively reset context.

**Fallback (if coherence degrades on very long runs):**
1. Write current state to `.aletheia/handoff.md`: current phase, what was completed, outstanding issues, what remains
2. Inform the user that a context reset is needed
3. On resumption, read `.aletheia/handoff.md` and continue from where the pipeline left off
4. Prefer context resets over compaction — a clean slate is better than a lossy summary

**Note:** Using a teammate for the evaluator (Phase 3) provides a natural context boundary — the teammate is an independent session that starts fresh. This is where quality matters most. This architectural choice reduces the need for manual context resets.

---

## IMPORTANT REMINDERS

1. **The ENTIRE evaluator runs as a teammate.** Not just the pre-analysis — all four steps (blind pre-analysis, testing, grading, verdict). The teammate is an independent Claude Code session that has never seen the generator's conversation context. On macOS/Linux it can also use claude-in-chrome for live browser testing. This is what makes CoT decoupling real, not theatrical.

2. **Blind pre-analysis focuses on behavior, not structure.** "What should the code DO?" not "What should the code look like?" A valid solution may use any architecture. Judge by observable behavior and testable properties.

3. **Grade against criteria, not vibes.** "Is this good?" is unanswerable. "Does this handle auth token expiry?" is testable.

4. **Test the running code.** Run it. Execute it. Check the output. Don't just read it.

5. **FIXABLE means fix, not restart.** Preserve what works. Target what doesn't.

6. **WRONG means stop.** Do not attempt to revise a fundamentally flawed approach. Present the analysis, suggest alternatives, and let the user decide. Abstention is a valid outcome.

7. **Know when to skip phases.** Simple tasks don't need the full pipeline. "Every component in a harness encodes an assumption about what the model can't do on its own." (Rajasekaran, 2026)

8. **The evaluator prompt needs ongoing calibration.** Read `.aletheia/evaluation.md` outputs to identify failure patterns. Rajasekaran: "Out of the box, Claude is a poor QA agent." Adjust the evaluator's strictness and focus areas based on observed performance — this is iterative tuning, not one-shot design. See `evaluator.md` for few-shot calibration examples.
