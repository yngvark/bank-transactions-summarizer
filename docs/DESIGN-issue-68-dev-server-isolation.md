# Issue #68: Dev-server isolation from Claude Code

## Problem

Claude Code occasionally exits with `Exit code 144` when stopping the Vite dev server. The trigger pattern is:

```bash
lsof -ti:5173 | xargs -r kill 2>/dev/null
```

Exit 144 = 128 + 16. Signal 16 is `SIGSTKFLT` on Linux / `SIGURG` on macOS — the agent's process tree was signaled by a kill it issued itself.

## Root cause

Two issues compound:

1. **Port-based kill is fragile.** `lsof -ti:PORT | xargs kill` assumes `lsof -t` outputs only matching PIDs. On environments where `lsof` is **busybox** (a single 800KB multi-call binary), `-ti:PORT` flags are silently ignored and lsof dumps every process's open files. `xargs kill` then receives a stream of unrelated tokens (PIDs, file descriptors, paths) and signals random processes — including Claude Code's own bash process.
2. **Same process group.** Even with real `lsof`, the dev server started as `(cd ... && pnpm dev) &` inherits the agent shell's process group. Process-group-targeted signals propagate up.

Item 1 is the dominant cause in the Claude Code execution sandbox; item 2 matters on real Linux/macOS.

## Fix

Two complementary changes:

### Makefile

- New `make run-bg` target starts the dev server with `setsid`, putting it in its own session/process group. PID is recorded at `/tmp/bts-dev.pid`, stdout/stderr at `/tmp/bts-dev.log`. Returns immediately.
- `make stop` now prefers the PID file: `kill -- -PID` to signal the whole detached process group, then `rm` the PID file. If the PID file is absent it falls back to `fuser -k -TERM PORT/tcp PORT/tcp6` (covers Vite's IPv6 loopback default). The dangerous `lsof -ti:PORT | xargs kill` fallback is removed.
- `make run` (foreground, interactive) is unchanged — humans Ctrl-C as before.

### CLAUDE.md

A short "Running the dev server (agents only)" section pointing agents at `make run-bg` / `make stop` and explicitly warning against `lsof -ti:PORT | xargs kill`.

## Why not just track PIDs without setsid?

PID tracking alone fixes the wrong-PID problem but not the process-group propagation problem. `setsid` is the seatbelt: even if a future contributor reintroduces a port-based kill, the dev server can't reach Claude Code's process group.

## Why fuser, not lsof, in the fallback?

`fuser PORT/tcp` is supported uniformly across busybox and util-linux fuser, and is harder to misuse: it kills only processes bound to the named port, never random PIDs from a malformed pipe. macOS lacks `fuser` by default — but macOS users land in the fallback only if they bypassed `make run-bg`, which is rare. The else branch prints a clear "use `make run-bg`" message rather than guessing.

## Verification

Tested in the agent sandbox (busybox lsof environment, where the bug originally reproduced):

1. `make run-bg PORT=15173 ...` — server starts, PID file present, port serves HTTP 200.
2. `/proc/$PID/status` shows `PPid: 1` (init), confirming detachment from the agent shell.
3. `make stop` kills via PID file, port stops listening, Claude Code is unaffected.
4. Started untracked dev server (no PID file), `make stop` falls back to `fuser` on `tcp6`, port stops listening.
5. Re-running `make run-bg` while a tracked PID is alive errors out with a clear message.
