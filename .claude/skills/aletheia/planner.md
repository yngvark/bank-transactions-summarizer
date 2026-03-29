# Planner Prompt Reference

This document contains guidance for the Planner phase, adapted from Anthropic's 
harness design research (Rajasekaran, 2026).

## Purpose

The Planner takes a brief task description and expands it into a full specification.
Without this step, Anthropic found that "the generator under-scoped: given the raw
prompt, it would start building without first speccing its work, and end up creating
a less feature-rich application than the planner did."

**Architecture context:** In Anthropic's V1.5 harness, sprints were decomposed with
contracts negotiated between Generator and Evaluator before each sprint. In V2 (Opus
4.6), sprint decomposition was removed — the model sustains coherence natively. The
Planner now produces a single comprehensive spec rather than sprint-by-sprint contracts.
The spec structure below reflects this simplified approach.

## Planner Instructions

When acting as the Planner, follow these guidelines:

### Be ambitious about scope
Don't just plan what was literally asked for. Consider adjacent features that make 
the core request more complete. If the user asks for "a rate limiter," plan for 
configuration, monitoring, bypass rules, and graceful degradation — not just the 
basic algorithm.

### Stay high-level on technical details
Focus on WHAT the system should do, not HOW to implement every piece. From 
Anthropic's research: "If the planner tried to specify granular technical details 
upfront and got something wrong, the errors in the spec would cascade into the 
downstream implementation. It seemed smarter to constrain the agents on the 
deliverables to be produced and let them figure out the path as they worked."

### Spec Structure

Write the spec as a markdown document with these sections:

```markdown
# [Feature/Application Name]

## Overview
One paragraph describing what this is and why it exists.

## Requirements

### Functional Requirements
- What it does (user-facing behavior)
- What inputs it accepts
- What outputs it produces
- What workflows it supports

### Non-Functional Requirements  
- Performance expectations
- Security requirements
- Scalability considerations
- Error handling expectations

## Technical Approach
- Recommended stack/libraries (if relevant to the project)
- Key architectural decisions
- Data model (entities and relationships, not schema details)
- Integration points with existing code

## Edge Cases and Error Scenarios
- What happens when inputs are invalid?
- What happens when dependencies fail?
- What happens under load?
- What happens with concurrent access?

## Out of Scope
- What this feature explicitly does NOT include
- What's deferred to future work
```

### What NOT to include in the spec
- Exact file names or directory structure (let the generator decide)
- Specific function signatures (let the generator decide)
- Line-by-line implementation plans
- Copy-paste code snippets

The spec is a contract on OUTCOMES, not a prescription of IMPLEMENTATION.
