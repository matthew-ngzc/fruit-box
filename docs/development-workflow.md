# Development workflow

GitHub Issues is the work tracker. GitHub PRs are the unit of delivery. The `gh` CLI is the interface for both. This project adapts Matt Pocock's published idea-to-ship flow: design discussion, spec, tickets, implementation, review, and retrospective. [Primary workflow reference](https://www.aihero.dev/), [vertical-slice and TDD guidance](https://www.aihero.dev/skills-post).

## Shape before implementation

`CONTEXT.md` defines domain terms; `docs/design-session.md` distinguishes confirmed rules from open decisions; `docs/adr/` records consequential choices. Research notes are evidence, not automatically accepted architecture. The initial backend, networking framework, and deployment route remain undecided.

Synthesize agreed behavior into the parent specification issue. Extract small implementation issues that deliver observable behavior across the necessary layers. For example, prefer "two guests join a room and see the same board" over separate tickets for database schema, backend endpoints, and frontend components. Exploratory prototypes and decision tickets are appropriate when an implementation choice is unresolved.

## Issue contract

Every substantive issue includes:

- Problem and desired outcome.
- Scope and explicit exclusions where needed.
- Checkable acceptance criteria.
- Verification method and relevant edge cases.
- Blocking dependencies, using native GitHub relationships when available or explicit issue links otherwise.
- Handoff mode: autonomous after requirements settle, or human decision/review required first.

Keep issues current when the design changes. Avoid turning every small edit into administrative overhead; one cohesive issue can cover several closely related files.

## Implement and verify

Work on a focused branch. Use public interfaces for behavior tests, one failing behavior followed by its implementation and refactoring. Multiplayer tests should exercise actual command ordering and recovery rather than mirror internal functions. Verify phone interaction on real devices when the behavior depends on touch, viewport, or app backgrounding.

Use the repository's actual scripts and tooling as the source of truth for commands once an application exists. At bootstrap, this repository contains research and design only; there is no application build or test suite to claim as passing.

## Deliver through a PR

The PR describes the problem and final behavior for someone who has not read the chat. Reference its issue and acceptance criteria, summarize meaningful verification, and disclose outstanding limitations. Keep scope small enough to review. Use closing keywords only for issues fully resolved by merging the PR; research that informs a decision may reference the decision issue without closing it.

Review against the originating issue and repository instructions, fix actionable findings, and run applicable checks before presenting the PR. Human review and merging are separate steps; do not enable auto-merge or merge without a user instruction.

Use `gh` structured options and body files; attach created PRs to the Codex chat. GitHub remains the authoritative record of ticket and PR status. Local documents hold durable rules, decisions, and evidence rather than a duplicated status board.

## Initial work map

The bootstrap PR publishes the existing research, glossary, decisions, and this workflow. Open human-decision tickets cover backend/framework choice and the intended initial hosting route. A mobile interaction prototype can resolve selection usability before the main implementation. Create implementation slices after their prerequisites are settled; preserve the user's later solver and additional-mode ideas as future scope.
