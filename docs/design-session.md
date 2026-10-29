# Fruit Box design interview

Updated: 29 October 2026 (Asia/Singapore).

## Confirmed scope

- Preserve solo play; add a one-player visual preview using the current 120-second match rules and controls. See [solo play](solo-play.md).
- First multiplayer mode: shared-board competition, where a clear removes fruit for both players and credits the player who made it.
- Initial audience: private friend rooms.
- First platform: a mobile-friendly browser app, accessible by link on iPhone and Android.
- Players are expected to be in Singapore, sometimes together on the same Wi-Fi.
- Use the repo-style generator with a certified full-clear path for each initial board.
- First valid selection to reach the authoritative server wins overlapping fruit; show committed clears rather than the opponent's live drag.
- A match lasts 120 seconds of active play, or ends when the board is empty. Do not end early merely because no valid moves remain. Equal scores end in a draw.
- Disconnects do not stop the clock; allow rejoins until the match finishes, retaining identity and score.
- Either player can pause immediately, spending one of their two pause chances per game. Pauses last at most 30 seconds, with early resumption when both are ready.
- Pauses hide the board from both players and cancel active drags. Ignore further pause requests while already paused without spending a chance.
- Join through guest nicknames and private links/codes first; allow future accounts, including Google login.
- Use TypeScript throughout, Node for the backend runtime, and Colyseus for rooms and synchronization. The owner accepted this choice on 29 October 2026; [ADR 0003](adr/0003-typescript-colyseus.md) records boundaries and trade-offs.
- The offline research solver is deferred until after the main game.
- Separate-board races, asynchronous challenges, and shared-board cooperation remain ideas for later exploration.
- CI/CD is required. The owner chose automatic deployment after reviewed changes merge to main and CI passes, while deferring the hosting decision. ADR 0002 records this policy; application delivery remains unimplemented until the stack, host and build are ready.

## Decision tree

1. First release: shared-board competition + solo (confirmed).
   - Board style: certified full-clear initial boards (confirmed).
   - Match duration: full 120 seconds or empty board; no no-moves ending (confirmed).
   - Conflicting clears: first valid server arrival (confirmed).
   - Selection feedback: pending highlight until server confirmation; no optimistic fruit removal (accepted 29 October 2026).
   - Opponent selection visibility: committed clears only (confirmed).
   - Equal scores draw (confirmed); rematch flow (open).
2. Audience: private friends (confirmed).
   - Guest nicknames and private links/codes first; future accounts including Google login (confirmed).
   - Stable internal player identity and later guest-to-account linking (proposed).
   - Disconnect clock continues; allow rejoin (confirmed); rejoin until the match finishes (accepted 29 October 2026).
   - Unilateral pause, two chances per player, maximum 30 seconds (confirmed).
   - Hide board and cancel drags during pause; ignore additional pause requests without charge (confirmed).
   - Trust model: casual validation vs stronger ranked enforcement (recommend casual validation).
3. Platform: browser first (confirmed).
   - Owner reported two-player play and fullscreen working on Android Brave. After trying the hybrid, explicitly chose free-drawn boxes with strict center inclusion, no alternate selection forms and no zoom. The revised [mobile interaction](mobile-interaction.md) and [solo preview](solo-play.md) await device review.
   - Optional home-screen installation (proposed).
4. Geography: Singapore, sometimes same room/Wi-Fi (confirmed).
   - Singapore server proposed; validate actual round-trip times on the two phones.
5. Solver purpose: offline research, after the game (confirmed).
   - No existing-site automation in the planned scope.
6. Technology: TypeScript/Node/Colyseus accepted (ADR 0003).
   - All TypeScript/Node/Colyseus is the simplest route for shared code and room infrastructure.
   - TypeScript browser + Java backend is a viable route for refreshing Java skills.
   - The owner selected TypeScript/Colyseus after considering the Java learning alternative.

## Proposed direction, not accepted decisions

Use TypeScript with a pure rules package shared by a mobile web client, an authoritative room server, and an offline solver. Use reliable WebSocket messages for submitted selections and committed clears. Prefer one authoritative owner per room; persist board definitions and completed matches separately from the live message path.

For overlapping selections, recommend first valid arrival at the room owner, with one atomic clear and score update. Explain the network advantage honestly. Do not accept a client timestamp as proof that their selection happened first. Accept an older board revision when the fruit inside the submitted selection is unchanged; reject a selection whose intended fruit has changed.

The first room/board transport slice is described in [versus rooms](versus-rooms.md); the playable browser match is described in [versus gameplay](versus-gameplay.md), with actual-phone acceptance still pending. The conflict-ordering decision is captured in ADR 0001. TypeScript/Node/Colyseus is accepted in ADR 0003; hosting remains open. The language comparison is in [technology-options.md](research/technology-options.md).
