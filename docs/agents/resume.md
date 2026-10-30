# Resume this project on another machine

The repository is the durable context. A desktop chat, a global skill installation, and the original Windows filesystem are not prerequisites for continuing work.

## Prerequisites

- Git and GitHub CLI (`gh`). Authenticate the CLI on the new machine using your own account; credentials are not stored in Git.
- An agent able to read/edit files and run the selected project's tools. Codex can discover `.agents/skills/`; other agents can read those files directly through the catalog.
- Python 3 for the repository's agent-setup/documentation check. This is a maintenance tool, not a backend-language choice.
- Optional Docker Desktop/Compose v2 for the [visible local game server](../local-docker.md); this does not select production hosting.
- Patched Node 22.23.4+, 24.22.1+ or 26.12.1+ within those release lines and npm for the accepted TypeScript/Colyseus stack; run `npm ci`. See [room setup](../versus-rooms.md) and [temporary-host security checks](../temporary-hosting.md).

## Resume sequence

1. Clone `https://github.com/matthew-ngzc/fruit-box.git`, enter the checkout, and read `AGENTS.md`.
2. Run `git status` and `gh pr list`. Inspect the selected PR's base and parent/child links before checking out its branch with `gh pr checkout <number>`; read the [stacked delivery procedure](../development-workflow.md#stacked-pr-delivery) before continuing or restacking dependent work. If the planning bootstrap is still open, its documents and skills may only exist on its branch or descendants. After merge, a normal clone of main includes the setup.
3. Read `CONTEXT.md`, `docs/design-session.md`, and relevant ADRs. These distinguish accepted rules from proposed technology choices.
4. Read `docs/agents/issue-tracker.md`. Use `gh issue list` and `gh issue view <number> --comments` to select the work and recover the latest discussion. The issue/PR record supplies context that may not be present in an old chat.
5. Select relevant skills from `docs/agents/skills.md`. Use repository-relative paths; no global installation or Windows path is needed. Record missing tool capabilities explicitly and use documented fallbacks where available.
6. Run `python3 scripts/check_agent_setup.py` (or `python scripts/check_agent_setup.py` on Windows). Follow the issue's requirements and applicable checks, and deliver changes through a focused PR.

## Current state

A TypeScript/Node/Colyseus browser game supports [solo play](../solo-play.md) and [private two-player shared-board competition](../versus-gameplay.md). The owner selected free-drawn rectangles with strict center inclusion and no zoom; see [mobile interaction](../mobile-interaction.md). Revised physical-phone acceptance and the initial deployment route remain pending. The solver, other competition modes, and Google login are later work. Read the design interview for the full confirmed rule set.

## What does not travel in Git

GitHub authentication, SSH keys, environment secrets, private infrastructure access, and browser sessions must be configured on the machine using them. A browser dashboard may require signing in again; desktop browser automation and Codex-app-specific tools may not exist on a headless server. Keep deployment credentials and raw private telemetry outside public issues and commits. The repository should contain the instructions and sanitized decisions needed to work without those private sessions.
