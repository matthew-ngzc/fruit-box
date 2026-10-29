# Language and runtime options

Checked 29 October 2026, Singapore time. The user is comfortable considering TypeScript, learned Java 8, is interested in modern Java, considers Python an option, and has no Rust experience. Historical comparison: the owner subsequently accepted TypeScript/Node/Colyseus on this date; see [ADR 0003](../adr/0003-typescript-colyseus.md).

## Language versus runtime

Node.js is a JavaScript runtime outside the browser, not a programming language or frontend framework. In the originally proposed stack, both browser and server source would be written in TypeScript. Frontend tooling produces JavaScript for the browser. Server TypeScript can be compiled to JavaScript for Node, or run with a suitable TypeScript runner/native supported syntax. Node's native type stripping is not a type checker; run type checking separately. [Node introduction](https://nodejs.org/learn/getting-started/introduction-to-nodejs), [Node TypeScript support](https://nodejs.org/api/typescript.html).

A Java or Python backend can speak the same WebSocket protocol to a TypeScript browser. Node may still be used by frontend build tools, without running a Node backend in production. Java and JavaScript are different languages; neither dictates using the other.

## Comparison for this game

| Backend | Main benefit | Main project cost | Assessment |
| --- | --- | --- | --- |
| TypeScript + Node + Colyseus | Direct reuse of the upstream JavaScript engine; shared browser/server logic and types; room/reconnect infrastructure | Learn JavaScript/TypeScript runtime behavior; validate network messages despite static types | Best default for reaching a playable game quickly |
| Modern Java + Spring Boot/WebSocket | Refresh known Java fundamentals; strong types and useful modeling features; mature backend tooling | Port authoritative engine; maintain browser/server rule parity; implement game-room and reconnect behavior | Good main-project choice if Java learning is an explicit objective |
| Python + FastAPI/WebSocket | Concise server code; natural fit for later solver experiments | Separate browser language and rule implementations; implement room infrastructure | Viable, but offers less direct reuse than TypeScript and less relevance to the stated Java learning goal |
| Rust backend | Ownership and compile-time checking; useful systems-performance learning | New language, ownership/async learning, more difficult review for this user, separate web UI | Defer unless learning Rust itself becomes a primary goal |

These are engineering judgments for a small private-room game, not performance benchmark results. There is no measured requirement justifying a systems-language server. The hot path validates at most 170 cells per selection; server location, queueing, synchronization, browser responsiveness, and room correctness deserve measurement before runtime substitution. Keep potentially expensive board construction or solver work out of the live message-processing path regardless of language.

## Java option

As of the research date, Java 27 is the latest feature release (15 September 2026), while Java 25 is the latest LTS release listed by Oracle. Recommend Java 25 LTS for the game's baseline if Java is selected; Java 27 can be used in separate learning experiments or chosen deliberately if its shorter update cadence is acceptable. [Oracle downloads/version overview](https://www.oracle.com/europe/java/technologies/downloads/), [Java 27 release notes](https://www.oracle.com/java/technologies/javase/27-relnote-issues.html).

Modern features useful beyond Java 8 include records for commands/results, sealed types and pattern matching for exhaustive command handling, switch expressions, and text blocks. Virtual threads are worth learning for concurrent I/O, but Oracle explicitly says they improve throughput rather than making individual operations faster. They do not decide ordering or make room mutations safe automatically. [Language updates](https://docs.oracle.com/en/java/javase/27/language/index.html), [virtual threads](https://docs.oracle.com/en/java/javase/25/core/virtual-threads.html).

Proposed Java shape:

- TypeScript/React browser UI.
- Java 25 server with Spring Boot and raw WebSocket commands.
- Pure Java game engine, kept outside Spring/session objects.
- A serialized command queue/critical section per room for clears, pauses, deadline transitions, and reconnect state changes.
- JSON messages such as `SelectRectangle`, `ClearAccepted`, `SelectionRejected`, and `Snapshot`.
- Shared board fixtures and command/replay examples to verify TypeScript preview behavior against the Java authority.

Spring supports raw WebSocket handlers; STOMP and an external message broker are not required to exchange these commands. Spring's API does require care around concurrent sends; a room command queue does not automatically make every networking callback safe. [Spring WebSocket API](https://docs.spring.io/spring-framework/reference/web/websocket/server.html).

Keep board generation authoritative on the Java server and send explicit cell values. That avoids requiring bit-for-bit agreement between independently implemented seeded generators. If offline board generation later becomes a requirement, add versioned cross-language generator fixtures then. The browser still needs selection preview and local solo rules; any duplicated logic should be bounded and checked against shared cases.

Colyseus is the originally proposed Node room framework; choosing a Java backend means replacing that room layer rather than adding Java behind a Node/Colyseus gateway. Do not introduce two backend services simply to use both languages. The resulting architecture can still be one service serving HTTP/WebSocket plus static frontend assets, or separately hosted frontend assets and one backend.

## Python option

FastAPI supports WebSockets and disconnect handling. Its tutorial's in-memory connection manager is a teaching example, not durable room routing across multiple processes. A private-room service can start with one process, explicit room ownership, per-room serialization, and application-defined reconnect snapshots. [FastAPI WebSocket documentation](https://fastapi.tiangolo.com/advanced/websockets/).

Python remains a useful later tool for offline solver exploration even if the game uses another language. Benchmark solver implementations using fixed serialized boards and validate their output move logs against the authoritative rules.

## Rust and agent-assisted development

Rust's compiler checks ownership rules and prevents classes of invalid memory access in safe Rust. This provides concrete feedback that can help both humans and coding agents. It does not prove game rules, timing policy, room authorization, reconnect semantics, or fairness. [Official Rust book](https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html).

The statement that Rust is generally the best language for agent-assisted development is not established by those language properties. This comparison found no project-specific evidence that would outweigh the user's lack of Rust experience. Reviewability matters: compile errors are useful feedback, while compiling code can still contain incorrect scoring or race behavior.

If Rust is of later interest, a bounded offline solver consuming board JSON and emitting replayable moves is a good experiment. It can be benchmarked against Python or TypeScript implementations without changing the game's backend.

## Recommendation and next decision

For delivery speed, choose TypeScript throughout with Node/Colyseus. If refreshing Java is a real goal of this hobby project, TypeScript frontend plus Java 25 backend is a defensible alternative and the recommendation leans that way for learning value. Choose the project priority before accepting a backend ADR. Do not introduce Python or Rust into the first release merely to cover more technologies.

Guest access and future Google accounts do not force a language choice. Give the game its own player identity and later associate a verified external login with it. [Google's identity verification guide](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

## Latency implications and non-preference criteria

Language and runtime affect processing speed, scheduling, allocation, and resource use; they do not remove network propagation time. For this game's small move-validation workload at modest load, expect implementation and deployment choices to dominate language differences. This is an engineering expectation, not a measurement of a built application.

Visible confirmation includes phone input handling, uplink network travel, server queueing and validation, waiting to publish the result, downlink travel, and browser rendering. As a hypothetical example, improving server processing from 1 ms to 0.1 ms saves only 0.9 ms. A framework publishing state every 50 ms can introduce a much larger wait before clients see a clear. Colyseus documents a default 50 ms state patch interval; immediate acknowledgements and state events must be coordinated so clients do not observe inconsistent ordering. [Colyseus room configuration](https://docs.colyseus.io/room).

Important runtime considerations:

- TypeScript type annotations do not make equivalent compiled JavaScript run more slowly. Node's event loop must remain responsive: synchronous board generation or solver search can delay unrelated rooms sharing that loop. Use precomputation or explicit worker execution where needed. An `async` function does not automatically move CPU work to a worker. [Node event-loop guidance](https://nodejs.org/learn/asynchronous-work/dont-block-the-event-loop).
- Java can process different rooms concurrently, but shared state still needs defined ordering. Virtual threads improve I/O concurrency/throughput rather than the speed of a single clear. Garbage collection and scheduling can affect delay spikes; do not infer actual pause times from a collector's configured pause target. [Virtual threads](https://docs.oracle.com/en/java/javase/25/core/virtual-threads.html), [G1 behavior](https://docs.oracle.com/en/java/javase/25/gctuning/garbage-first-g1-garbage-collector1.html).
- Python's async event loop also stalls while CPU-bound code runs on it. Its official documentation recommends offloading blocking work; CPU-heavy solver/generator tasks should not share the live room loop. [Python asyncio development guide](https://docs.python.org/3/library/asyncio-dev.html).
- Rust provides direct control over memory and avoids a tracing garbage collector, but OS scheduling, locks, slow tasks, allocation, and networks still introduce delays. No language by itself guarantees instant or perfectly fair shared-board play.

Other selection criteria: engine reuse and browser/server rule parity; room/reconnect library availability; ability to understand/debug/maintain the code; JSON/protocol validation; tooling and meaningful tests; hosting region and persistent-WebSocket support; memory/CPU cost; expected concurrent rooms; and whether CPU-heavy solvers are part of the live service. Keep the service warm during active matches and avoid database/API calls in clear arbitration unless the chosen durability requirements demand them.

Measure round-trip time, server queue/processing delay, release-to-confirmation delay, and p95/p99 spikes under representative phone networks and concurrent-room load. Under the agreed first-arrival policy, differences in each player's network path can change close-conflict outcomes regardless of backend language. The comparison itself is research; the later owner decision is recorded in ADR 0003.
