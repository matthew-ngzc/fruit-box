# Agent verification: Lauren Tan, Kem Tossoun, and a Fruit Box trial

Research date: 29 October 2026 (Asia/Singapore). Status: research and recommendations, not accepted architecture or workflow changes. Tracks [issue 9](https://github.com/matthew-ngzc/fruit-box/issues/9).

## Recommendation

Try the verification method on one small slice before adopting a whole agent system. Fruit Box already has much of the planning discipline: confirmed rules, issues, vertical slices, behavior-first TDD, repository-local skills, and PR evidence. The main future addition is a repeatable way for an agent to run the application and demonstrate its behavior. More agents become useful only after that feedback is trustworthy.

Treat accepted, working behavior per hour of human attention as the objective. A PR count is a poor substitute: changes differ in size, importance, review effort, and consequences. No evidence reviewed here establishes that Fruit Box should target thousands of PRs or that either presenter's results will transfer here.

## Evidence and limits

The strongest inspected evidence for Lauren's method is her public pstack source at immutable revision `b1695c2019b650ca5d4a66a6a6d805233c806d6d` in `cursor/plugins`. A background research agent read the relevant README, playbooks, principles, and guides through GitHub CLI. Sources are linked below at that revision.

The much-shared 2,000 PR claim is self-reported. We located [Lauren's original talk post](https://x.com/poteto/status/2102050467505430555) and [guide post](https://x.com/poteto/article/2094457600259842065), but direct fetching was blocked. Secondary coverage varies between 2,000 and 2,500; it was used to locate originals, not establish a precise count. We did not audit private PRs, defect rates, token expenditure, reviewer labor, or production outcomes. Do not interpret the headline as 2,000 independently verified features.

The supplied [Instagram reel](https://www.instagram.com/reel/DfAIPrAtteM/) was accessible in the browser, although the search fetcher failed. Its creator is **Kem Tossoun, @kem_glitch, Glitch Cat Club**. We inspected its caption and selected moving video frames, including its verification checklist and image-diff demonstration; we did not obtain a complete audio transcript. Additional video descriptions, related post captions, the creator's website/company posts, and a public example repository support the bounded survey below. This is not a claim to have watched every video or inspected members-only material.

## What Lauren's system actually does

[pstack's README](https://github.com/cursor/plugins/blob/b1695c2019b650ca5d4a66a6a6d805233c806d6d/pstack/README.md) presents a toolkit of practices she uses, emphasizes quality and less code, and recommends trusting one agent before parallelizing. It documents Cursor and Claude Code support; a native Codex installation path was not established by these sources. The portable asset is the procedure, not a particular slash command or model name.

The [feature playbook](https://github.com/cursor/plugins/blob/b1695c2019b650ca5d4a66a6a6d805233c806d6d/pstack/skills/poteto-mode/playbooks/feature.md) routes work through investigation, design where needed, bounded implementation, real verification, and focused delivery. It identifies dependencies and shared mutable state before splitting work. The [bug playbook](https://github.com/cursor/plugins/blob/b1695c2019b650ca5d4a66a6a6d805233c806d6d/pstack/skills/poteto-mode/playbooks/bug-fix.md) begins with reproduction on the real surface, uses runtime evidence to narrow the cause, and reruns the original reproduction after fixing the mechanism. An inconclusive result is not a pass.

In practical terms:

1. Define a desired result and an observable finish condition.
2. Understand the existing contract and relevant code.
3. Give one implementation owner a bounded task and isolated working state.
4. Run the behavior, inspect its effects, and retain evidence.
5. Review the actual patch and verify it independently where useful.
6. Deliver a focused PR, then turn recurring failures into better checks or tools.

This outline is our synthesis of those procedures, not a claim that every private PR follows identical steps.

### The reusable verification procedure

The [verification-skill generator](https://github.com/cursor/plugins/blob/b1695c2019b650ca5d4a66a6a6d805233c806d6d/pstack/skills/create-verification-skill/SKILL.md) is the most useful concrete starting point. It produces repository-specific instructions with six parts:

| Part | What it must establish | Proposed Fruit Box use |
| --- | --- | --- |
| Launch | Exact commands, setup/seed steps, usable readiness, isolated state | Start client/server with a reproducible board and separate scratch state |
| Doctor | Correct process, build, port, authentication and prerequisites | Confirm the expected revision and healthy room server before driving clients |
| Drive | Actual supported controls or stable selectors | Two browser sessions submit commands through real public interfaces |
| Evidence | User actions, resulting state, and relevant side effects | Both boards, scores, server result and an interaction recording |
| Cleanup | Stop only owned processes and remove scratch state | Release the trial's ports/rooms while preserving evidence |
| Helpers | Small executable tools and documented invocations | Reuse a seed/room driver instead of inventing a new script per task |

The generator also starts a map of 3-5 user-facing features, each describing its sub-features, how a user reaches it, how the harness drives it, and gotchas. It requires executing the new procedure end to end at least once, including confirming that evidence survives cleanup. A never-run verification document remains a draft.

The [verification guide](https://github.com/cursor/plugins/blob/b1695c2019b650ca5d4a66a6a6d805233c806d6d/pstack/docs/guide/06-verify-and-ship.md) matches proof to the surface: execute a CLI, drive a UI, read back persisted data, compare performance profiles. For Fruit Box, compilation alone cannot establish a fair room protocol, and a room test cannot establish usable touch selection. Formal models are an optional later tool for ordering/retry properties; any bounded model must disclose assumptions and be checked against a deliberately broken variant. It does not prove the whole application.

### How trust becomes autonomy

The [overnight guide](https://github.com/cursor/plugins/blob/b1695c2019b650ca5d4a66a6a6d805233c806d6d/pstack/docs/guide/07-overnight.md) advises doing/watching the task first, giving the agent the same tools and signals an engineer uses, examining failures, and making every stage able to halt. A duration is not a completion criterion. A skill alone does not provide a scheduler or persistent process.

[Build the Lever](https://github.com/cursor/plugins/blob/b1695c2019b650ca5d4a66a6a6d805233c806d6d/pstack/skills/principle-build-the-lever/SKILL.md) favors learning a repeatable task on one unit and then building the smallest rerunnable tool. [Encode Lessons in Structure](https://github.com/cursor/plugins/blob/b1695c2019b650ca5d4a66a6a6d805233c806d6d/pstack/skills/principle-encode-lessons-in-structure/SKILL.md) moves recurring corrections into scripts, lint, metadata, or runtime constraints when possible. Judgment that cannot be encoded still needs explanation and examples.

The [full autopilot playbook](https://github.com/cursor/plugins/blob/b1695c2019b650ca5d4a66a6a6d805233c806d6d/pstack/skills/poteto-mode/playbooks/autopilot-full.md) uses separate verification and ties assurance to the patch and CI revision. A changed patch needs relevant checks again; weakening a gate is not evidence. The [stack playbook](https://github.com/cursor/plugins/blob/b1695c2019b650ca5d4a66a6a6d805233c806d6d/pstack/skills/poteto-mode/playbooks/autopilot-stack.md), which stops at verified PRs for human review/merge, is the closer fit here. Fruit Box's existing prohibition on unrequested merges remains in force.

## What Kem teaches, and what to borrow

The supplied reel frames verification as the path to trusted autonomy. Its visible checklist covers tools to act, tools to see, pixel comparison, different states, and real users, packaged in a reusable skill. An image-diff example is visible. Those observations support adding feedback channels; they do not establish specific accuracy claims or that any SKILL.md automatically executes in every agent. Invocation and enforcement depend on the actual runner. [Reel](https://www.instagram.com/reel/DfAIPrAtteM/).

The broader learning path below distinguishes inspected descriptions/source from project recommendations. Reading a caption is weaker evidence than reproducing the method.

| Topic and primary source | Supported lesson | Fruit Box application / our recommendation |
| --- | --- | --- |
| [APIV: How a 20-Year Engineer Actually Builds With AI](https://www.youtube.com/watch?v=Hia3tp7lrVQ), also described on the [company page](https://www.linkedin.com/company/glitchcatclub) | Align, Plan, Implement, Verify; settle intent before coding | Keep the design interview; turn accepted rules into acceptance examples before asking an agent to implement |
| [Verification reel](https://www.instagram.com/reel/DfAIPrAtteM/) | Make execution and observation available to the agent | Supply a browser driver, known seed, state inspection and a concise evidence recipe |
| [Adversarial AI Coding](https://www.youtube.com/watch?v=e2nc5wvSG4s) | Bounded criticism: a separate reviewer tests a concrete claim and needs evidence | Ask whether one fruit can be credited twice, rather than demanding a fixed number of bugs |
| Same adversarial session | Keep the critic read-only; one focused round; verify repairs with a targeted reproduction instead of restarting an unlimited hunt | A fresh reviewer reports the input sequence and observable failure; the implementer fixes it; regression checks establish the repair |
| [Knowledge graph demo](https://www.youtube.com/watch?v=svvlT-nX6N8) and [starter source](https://github.com/Glitch-Cat-Club/graph-memory-starter) | Explicit relationships and deterministic retrieval can support cross-document answers | Current indexed prose and search are sufficient; consider graph memory only after measuring retrieval failures |
| [Public live-build collection](https://glitchcatclub.com/#streams) | The site offers public builds, a sync/async debugging session, and a provider-agnostic pivot | Study observable debugging and adapters; this does not require adding an LLM feature or personal-assistant harness to the game |

The adversarial video's inspected description supports these constraints: one claim per pass, a fresh reviewer, read-only inspection, evidence/reproduction, and bounded completion. Evaluate whether a real user can reach the alleged failure. That is a useful relevance filter, but not permission to ignore malicious network inputs or rare retries in a public-facing game. The presenter's broader explanations of model behavior are practitioner claims, not controlled proof. No fixed quota of findings is appropriate. [Adversarial session](https://www.youtube.com/watch?v=e2nc5wvSG4s).

The graph starter's own guidance starts with retrieval over existing notes and introduces graphs for questions requiring fact chains. Its reported evaluation is one question across three tiers and two conditions, not general evidence of equal model accuracy. Its hooks are agent-specific; portability to Codex requires separate work. A graph is unnecessary infrastructure for Fruit Box's current small document set. [Starter repository](https://github.com/Glitch-Cat-Club/graph-memory-starter).

Recommended viewing order: APIV for planning discipline; the supplied verification reel for the feedback channels; adversarial review for how to challenge a result without endless critique; then the graph demo only if context retrieval becomes a real obstacle. The public stream catalog is a way to observe troubleshooting over time, not a required course purchase. [Creator website](https://glitchcatclub.com/).

### Additional public-post survey

Eight related Instagram captions were inspected, covering 20-28 October 2026. Captions establish topics; comments by viewers were not treated as the creator's instructions.

| Post | Inspected topic | Responsible takeaway |
| --- | --- | --- |
| [28 October follow-up](https://www.instagram.com/kem_glitch/reel/DfCsHxbtV3J/) | Requested follow-up described as delivered and verified | Worth viewing after the supplied reel; implementation details were not established by its caption |
| [26 October artifact guide](https://www.instagram.com/kem_glitch/reel/De9dryetLPw/) | Directs viewers to a broadcast-channel artifact | The linked artifact was not inspected; it is not a dependency of this proposal |
| [25 October rest](https://www.instagram.com/kem_glitch/reel/De7En8qt0Xi/) | Personal tiredness/rest | No engineering mechanism inferred |
| [24 October routing](https://www.instagram.com/kem_glitch/reel/De4PXaltWfP/) | Model, effort, task, checking and routing questions | Benchmark cost and checks before changing model settings; no exact routing policy verified |
| [23 October visual experiment](https://www.instagram.com/kem_glitch/reel/De1rPs7NXC4/) | Visual transcription and code-art experiment | A possible learning exercise, outside the game's current release scope |
| [22 October search](https://www.instagram.com/kem_glitch/reel/DezGALzNCuf/) | Native search cost optimization | Measure retrieval overhead first; caption does not establish an indexing algorithm |
| [21 October simplicity](https://www.instagram.com/kem_glitch/reel/DeweBoJtQfp/) | General simplicity advice | Supports a small trial; no detailed technical prescription established |
| [20 October software factory](https://www.instagram.com/kem_glitch/reel/DeuDOdTNhuu/) | Reaction to a software-factory video | Do not substitute viewers' technical comments for the creator's explanation |

The APIV session's creator-written chapters provide a focused learning route: [outcome first, 17:10](https://www.youtube.com/watch?v=Hia3tp7lrVQ&t=1030s), [shared language, 18:22](https://www.youtube.com/watch?v=Hia3tp7lrVQ&t=1102s), [pattern pass, 19:50](https://www.youtube.com/watch?v=Hia3tp7lrVQ&t=1190s), [design boards, 22:06](https://www.youtube.com/watch?v=Hia3tp7lrVQ&t=1326s), [enumeration, 25:28](https://www.youtube.com/watch?v=Hia3tp7lrVQ&t=1528s), [data model, 27:53](https://www.youtube.com/watch?v=Hia3tp7lrVQ&t=1673s), and [requirement ledger, 29:02](https://www.youtube.com/watch?v=Hia3tp7lrVQ&t=1742s). Apply these through the existing glossary, prototype, ADRs, and issues. Our proposed addition is a compact acceptance-to-evidence table, not a duplicate requirements system.
## A verification loop for Fruit Box

These are proposed examples derived from confirmed rules in [the design interview](../design-session.md), [glossary](../../CONTEXT.md), and [ADR 0001](../adr/0001-order-contested-clears-at-the-room-server.md), not implemented behavior.

| Contract | Useful exercise | Independent expected result |
| --- | --- | --- |
| Rectangle selection and scoring | On a fixed board select adjacent fruit valued 2, 3 and 5 | Clear three fruit, gain three points, leave unrelated cells unchanged |
| Invalid clear | Submit a rectangle totaling 9 | No fruit or score changes |
| Competing clears | On a 2x2 fixture `[[4,6],[6,4]]`, A submits the top row and B the left column; explicitly control receipt order | A-first clears top row, credits A two, rejects B's now-changed selection; reverse order credits B two and rejects A |
| Duplicate delivery | Resend an identical accepted command with the same identity | No additional clear or score; exact response protocol remains to be designed |
| Pause | Request a pause during a drag, then send another pause request | Both boards hidden, drag canceled, only the first applicable chance spent; pause at most 30 seconds |
| Clock and recovery | Disconnect and rejoin; separately test a board with no remaining legal move | Disconnect does not stop active time; no-move state alone does not end the match |
| Match end | Empty the board, or reach 120 active seconds; finish with equal scores | End on empty/time; equal scores draw |
| Generator | Replay its certified clear path on the generated board | Every step is valid and the board ends empty; this verifies the certificate, not difficulty or randomness quality |

A hand-worked fixture is an oracle independent of the implementation. Run the conflict test in both server receipt orders; do not infer an ordering guarantee from uncontrolled wall-clock races. Test deadline boundaries with a controlled clock. Use actual phone trials for finger occlusion, accidental scrolling, and app backgrounding: desktop automation does not settle those questions.

A useful feature map would start with solo selection, private room join, competing clears, pause/resume, and reconnect/end. Keep executable scenarios beside the relevant contract once those features exist. The current research should not create a second permanent game specification.

The proposed loop is: agreed example -> failing behavior test -> minimal implementation -> passing check -> run the real journey -> inspect evidence -> focused independent review -> human review. If a necessary observation is unavailable, report it as pending rather than replacing it with an assertion that the code looks right.

## Fit with the current repository

Already present: [delivery workflow](../development-workflow.md), [portable skills](../agents/skills.md), [decision tracking](../adr/README.md), a reference/context checker, and seven regression cases for that checker. The separately reviewed [CI PR 8](https://github.com/matthew-ngzc/fruit-box/pull/8) improves the CI gate and records deployment policy. This research branch is based on foundation PR 5, not that parallel CI branch; consult GitHub for merge status. Those checks validate documentation/tooling, not game functionality.

Missing because no application exists yet: a selected runtime, launchable game, deterministic seed/room harness, public command boundaries, game tests, browser journeys, and actual mobile evidence. Production engine/server work is blocked on [issue 2](https://github.com/matthew-ngzc/fruit-box/issues/2). The disposable interaction prototype in [issue 3](https://github.com/matthew-ngzc/fruit-box/issues/3) can proceed independently of backend choice. Hosting is [issue 4](https://github.com/matthew-ngzc/fruit-box/issues/4).

Our TDD skill requires agreement on public test seams before tests are written. Candidates are a pure rules interface, an authoritative room-command boundary, and browser journeys; these are proposals for that agreement. We have not silently selected interfaces or a backend. No new agent skill, global configuration, model, deployment, merge permission, or scheduler is introduced by this report.

## Proposed trial: three slices with an exit decision

1. **Mobile interaction prototype, existing issue 3.** Agree a bounded demo and expected results. Give one agent the task, a reproducible fixture, launch/readiness instructions, and browser controls. Verify reverse drags, edges, valid/invalid sums, and record the actual interaction. The owner tests iPhone and Android. The prototype answers a usability question; it is not the production UI or a backend selection.
2. **One accepted gameplay slice, after issue 2.** Agree the public seam, implement a valid/invalid clear with behavior-first TDD, and run it through the real client. Start the feature map with this actual journey. Demonstrate that the checker fails for an intentionally broken score or clear behavior; then restore and rerun. Keep the mutation local to disposable trial state.
3. **One contested-clear slice.** Exercise two real sessions against the authoritative server with controlled command order, duplicate delivery, and independent expected results. Have a fresh reviewer challenge the double-credit claim. Keep human merge review.

At each slice record human active minutes (scoping, correction, review), wall-clock time to an accepted outcome, rework, escaped defects, verification duration, and actual model cost/usage if the runner exposes it. Check repeatability from a clean checkout. Record unavailable cost data rather than estimating it from PR counts.

Use a comparable ordinary supervised slice as a baseline where possible. Three different slices are an operational trial, not a controlled productivity experiment. Before starting, agree what improvement would justify continuing; do not invent a universal percentage after seeing the results. Continue when the checks reliably reject known bad behavior, setup is reproducible, review evidence is useful, and the owner sees worthwhile net savings. Stop or repair the harness when failures are invisible, review burden grows, or agents manufacture scope to remain busy.

Only then consider two independent implementation tasks concurrently, with isolated ports/state/worktrees and explicit ownership. Do not parallelize agents editing the same room state or shared files without coordination. Keep one implementation owner per PR and never use parallel voting to settle a product preference.

## Is it good?

**Yes, as an incremental engineering practice.** It moves feedback closer to the agent and makes human review more informed. The strongest components are observable acceptance examples, reproducible environments, tests that can fail meaningfully, and retained runtime evidence.

**The whole system is not yet justified for this project.** Verification tools take effort to build; browsers can be flaky; screenshots can miss behavioral faults; the same mistaken assumption can contaminate both code and tests. Separate reviewers reduce shared-context bias but do not guarantee independence of reasoning. Parallelism adds integration and compute cost. A graph, persistent swarm, or formal model should solve an observed problem rather than become a prerequisite to writing the first game slice.

Our recommended adoption is narrow: borrow pstack's runnable verification contract and Kem's bounded criticism, preserve the existing design/TDD/PR process, and judge three useful outcomes. Keep the headline PR count as motivation, not a success metric.
