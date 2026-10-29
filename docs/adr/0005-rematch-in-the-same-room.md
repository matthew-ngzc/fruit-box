# Keep rematches in the same room with participant consent

Status: **Accepted**  
Date: 2026-10-30 (Asia/Singapore)

## Context

The owner requested Play again in solo and versus, then explicitly confirmed that versus preserves its players/room and waits for both players, while solo restarts immediately. Requiring a new invite after every round adds friction; allowing either guest to reset for both would discard the other's result without consent. [Issue 21](https://github.com/matthew-ngzc/fruit-box/issues/21) owns delivery through [PR 22](https://github.com/matthew-ngzc/fruit-box/pull/22).

## Decision

Play again is available after finish. Solo immediately starts another round. Versus keeps results visible until both connected participants choose it, then starts together in the same private room. Each new round has a fresh certified board, zero scores, 120 active seconds and two pauses per player. A player cannot restart an active or paused round.

Commands identify their round so delayed prior-round clears, pauses or replay requests cannot affect a new round. The server owns generation and readiness. Existing guest identities/nicknames and room codes persist across rematches. Finished rooms remain available while participants stay connected and are disposed when empty. This extends the result-screen lifetime, not the until-finish reconnect policy in [ADR 0004](0004-confirm-clears-and-rejoin.md): a departed guest cannot newly rejoin a finished round.

## Consequences

One player may wait on the result screen for their friend; the UI must show readiness and a departed opponent. New game remains available to leave and invite someone else. In-memory rooms still disappear on server restart. The [gameplay state diagram](../versus-gameplay.md#authority-and-recovery) owns the maintained lifecycle; [solo play](../solo-play.md) owns the one-player flow. No persistence, replacement opponent or automatic restart is implied.
