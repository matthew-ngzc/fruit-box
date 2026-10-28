# Fruit Box agent instructions

## Project context

Before changing game behavior, read `CONTEXT.md` for terminology and `docs/design-session.md` for confirmed rules and unresolved decisions. Read relevant ADRs in `docs/adr/` when changing their subject. Record recommendations separately from accepted decisions.

When resuming on another machine, start with `docs/agents/resume.md`. Relevant skills and their references are versioned in `.agents/skills/`; use `docs/agents/skills.md` to select them. Prefer these repository versions over similarly named global skills. If the agent has no skill-invocation tool, read the named `SKILL.md` and follow it directly. Use the current agent's configured model; model-specific names in upstream examples do not select a model for this project.

## GitHub workflow

- Use GitHub Issues to track nontrivial work and pull requests to deliver reviewable changes. Use the `gh` CLI for GitHub operations. If a read fails with a network/API connection error in the agent shell, retry with network access before changing authentication settings.
- Shape work into small vertical slices with a demonstrable outcome. Each issue states the problem, scope, acceptance criteria, verification, dependencies, and whether a human decision is needed before implementation.
- Read the issue and its dependencies before starting. Resolve open product or architecture decisions through the design interview; keep dependent implementation blocked until its requirements are settled.
- Use a focused branch and PR for a cohesive issue. Link the issue, explain the resulting behavior, and report the checks actually performed. Use `--body-file` for multiline GitHub issue and PR bodies.
- For visual changes, include clear screenshots or concise screen recordings in both the issue and PR, reusing media links where practical. Follow the visual-evidence guidance in `docs/development-workflow.md`; recordings must show smooth, direct actions without long idle gaps.
- Use behavior-first TDD for engine and multiplayer behavior. Cover meaningful boundaries such as competing clears, duplicate delivery, deadlines, pauses, and reconnects. Match verification to the change; documentation-only changes do not require application tests.
- Before submitting a PR, review its diff against the issue, confirmed rules, and these instructions. Resolve findings and run applicable checks. Keep the PR open for human review; merge only when the user requests it.
- After creating a PR, attach it to the current Codex chat. Keep GitHub issue/PR status current as scope or blockers change.

## Public repository

Keep credentials, environment secrets, private infrastructure addresses, and raw dashboard telemetry outside commits, issues, and PRs. Describe deployment requirements without publishing private homelab details.

## Workflow reference

When defining specs, issue breakdowns, or PR process, read `docs/development-workflow.md` for this project's adaptation of Matt Pocock's planning, vertical-slice implementation, testing, and review practices.
