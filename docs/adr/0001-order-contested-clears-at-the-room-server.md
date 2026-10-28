# Order contested clears at the room server

Status: Accepted
Date: 2026-10-29

## Context

Players can submit overlapping selections in private shared-board matches. The owner explicitly chose first valid server arrival in the [design interview](../design-session.md); an arbitration window was the main alternative discussed.

## Decision

The first valid selection received by the authoritative room server wins contested fruit. Client timestamps do not decide priority, and reconnects or retries must not award the same clear twice.

## Consequences

Immediate, deterministic results suit short matches between friends in Singapore, but lower network latency can help win a close conflict. Acceptance establishes the policy; it does not mean the multiplayer server has been implemented. The backend/runtime and hosting choices remain open. This record is tracked in [the ADR register](README.md).

## Supporting media

Store this decision's pictures and recordings in [its media folder](../assets/adr-0001/). No media is attached yet.
