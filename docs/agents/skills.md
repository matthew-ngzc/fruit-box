# Repository skill catalog

Skills live in `.agents/skills/<name>/SKILL.md`, with their supporting references, scripts, and invocation metadata. Paths below are relative to the repository root. Read only the skill relevant to the task and any references it requires.

| Skill | Use |
| --- | --- |
| `grill-with-docs` | User-requested design interview with glossary and decisions |
| `grilling` | Ask the current frontier of design questions in rounds |
| `domain-modeling` | Sharpen glossary terms and record consequential decisions |
| `codebase-design` | Choose module interfaces and test boundaries |
| `to-spec` | Synthesize agreed context into an issue specification |
| `to-tickets` | Break agreed work into independently verifiable slices |
| `implement` | Carry an agreed issue through implementation, verification, and PR delivery |
| `tdd` | Behavior tests at agreed public boundaries |
| `code-review` | Review against repository standards and the issue/spec |
| `diagnosing-bugs` | Reproduce, narrow, diagnose, and verify bugs |
| `research` | Gather cited evidence and save findings |
| `prototype` | Resolve an interaction or state-model question with a disposable prototype |
| `resolving-merge-conflicts` | Resolve an existing merge/rebase conflict |
| `writing-for-agents` | Maintain agent instructions and skill documentation |
| `retro` | Improve the environment based on observed session problems |

## Portability

The named skill files are the reusable procedures; `docs/agents/issue-tracker.md` configures their tracker. A tool named "Skill" or "Task" is not required: read sibling skills explicitly and map delegation to the agent's available tools. If independent subagents are unavailable, run a clearly labeled single-agent review rather than claiming independent checks. A headless agent must report unavailable UI verification and retain that limitation in its handoff.

Codex invocation metadata is kept in each skill's `agents/openai.yaml`. Explicit-only skills preserve that policy there; descriptive examples inherited from other agent ecosystems do not install global tools or grant permissions.

These are selected, vendored snapshots of the locally installed Matt Pocock-style skills, adapted for this repository on 29 October 2026. They are not automatically synchronized with upstream. Updates should be reviewed through a PR, preserving project adaptations and the upstream license. The license is in `.agents/skills/UPSTREAM-LICENSE.txt`; see `.agents/skills/NOTICE.md` for provenance and adaptations. Unrelated global plugins and artifact-specific skills are not dependencies of this game's development workflow.
