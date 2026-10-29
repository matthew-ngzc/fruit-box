# Fruit Box research and design

Research date: 29 October 2026 (Singapore time). The first TypeScript/Colyseus room transport slice is implemented; a playable match and browser UI remain future work.

1. [Repository and deployment](research/repository.md): inspected commit, game engine, generator, UI, running instructions, docs, tests, license, and limits of the public repo's relationship to the live site.
2. [Origins and board generation](research/origins-and-generation.md): original 2007 release, 2019 HTML5 update, newer 2026 project dates, and exact generator comparison.
3. [Architecture and game modes](research/architecture-and-modes.md): proposed browser/room-server architecture, P2P trade-offs, collision processing, timers, pause, reconnect, and future modes.
4. [Solvers and computational complexity](research/solvers-and-complexity.md): likely remembered video and contest, source-checked algorithms, guarantees, and limits.
5. [Design interview](design-session.md): confirmed preferences, design tree, and unresolved questions.
6. [Conflict ordering ADR](adr/0001-order-contested-clears-at-the-room-server.md): accepted first-valid-server-arrival decision.
7. [Language and runtime options](research/technology-options.md): TypeScript/Node, modern Java, Python, Rust, and the learning-versus-delivery trade-off.
8. [Development workflow](development-workflow.md): GitHub issues and PRs, vertical slices, behavior tests, review, and handoff expectations.
9. [Resume on another machine](agents/resume.md): prerequisites, issue/PR context, and repository-contained skills.
10. [ADR register](adr/README.md): decision status, rationale, ownership, and supersession.
11. [Documentation maintenance](doc-maintenance.md): owning pages, canonical diagrams, and navigation.
12. [ADR media](assets/README.md): pictures and recordings in per-ADR folders beside `adr/`.
13. [CI/CD](ci-cd.md): real current checks, accepted automatic-delivery policy, and remaining deployment prerequisites.

14. [Private versus rooms](versus-rooms.md): setup, public state, real-client demo and implementation limits.
15. [TypeScript/Colyseus ADR](adr/0003-typescript-colyseus.md): accepted stack and rules/room ownership.

## Visual routes

- [Delivery and evidence loop](development-workflow.md#detailed-review-contract).
- [Stacked PR dependencies and restacking](development-workflow.md#stacked-pr-delivery).
- [ADR lifecycle](adr/README.md#when-and-how-to-record-a-decision).
- [Proposed system components](research/architecture-and-modes.md#proposed-components); historical proposal; see ADR 0003 for the accepted stack.
- [CI gates and future deployment boundary](ci-cd.md#implemented-ci).

[CONTEXT.md](../CONTEXT.md) contains the game's domain glossary. Source links in the reports point to the inspected upstream commit; the first implementation vendors the pinned MIT engine with [provenance](../vendor/fruit-box-game/README.md).
