# Documentation and diagram maintenance

Start from [the documentation index](README.md) and name the contract being changed. Update its owning page rather than adding a parallel explanation elsewhere.

| Subject | Owner |
| --- | --- |
| Solo mode and its shared match/interface | [Solo play](solo-play.md) |
| User-facing wording and status labels | [Interface wording](interface-copy.md) |
| Mobile selection, landscape and fullscreen | [Mobile interaction](mobile-interaction.md) |
| Local Docker lifecycle and visibility | [Local Docker](local-docker.md) |
| Playable match rules and recovery | [Versus gameplay](versus-gameplay.md) |
| Upstream reuse and license notices | [Licensing](licensing.md) |
| Private-room implementation, runtime setup and public state | [Versus rooms](versus-rooms.md) |
| Domain vocabulary | [CONTEXT.md](../CONTEXT.md) |
| Confirmed product rules and open decisions | [Design interview](design-session.md) |
| Accepted consequential decision and rationale | [ADR register](adr/README.md) and its focused record |
| ADR pictures, exported diagrams, and recordings | [Media convention](assets/README.md) and the matching `assets/adr-NNNN/` folder |
| Agent delivery process and evidence requirements | [Development workflow](development-workflow.md) |
| CI jobs, delivery policy and deployment readiness | [CI/CD](ci-cd.md), the actual workflow, and relevant ADRs |
| Agent entrypoints and machine prerequisites | [Resume guide](agents/resume.md), [tracker configuration](agents/issue-tracker.md), [skill catalog](agents/skills.md) |
| Research evidence and proposed technology | The relevant report under `research/`, reached through [the index](README.md) |

When application implementation begins, create focused owner pages for actual gameplay, architecture, persistence, or deployment contracts as needed and add them to this map/index. Research proposals must remain distinguishable from accepted decisions and running behavior.

Keep a diagram beside the prose that owns it. Update both when their contract changes; a diagram existing only in an old PR comment is historical review evidence, not the maintained explanation. Choose flowcharts for branching processes or components, sequence diagrams for message ordering and failure handling, state diagrams for lifecycle transitions, and data-model diagrams for persistent relationships. Prefer several focused diagrams to a crowded system map. Add a diagram when it materially helps explain a changed flow or boundary; simple edits can explain why none is useful.

Before handoff, check the owning prose and diagrams against the actual source/configuration or accepted decision, resolve local links, verify changed Mermaid rendering, remove stale claims, and update [the index](README.md) when navigation or ownership changes. Label proposed or future behavior clearly. Screenshots and recordings follow the [visual evidence contract](development-workflow.md#visual-evidence).
