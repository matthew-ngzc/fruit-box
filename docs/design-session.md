# Fruit Box design interview

Updated: 29 October 2026 (Asia/Singapore).

## Confirmed scope

- Preserve solo play.
- First multiplayer mode: shared-board competition, where a clear removes fruit for both players and credits the player who made it.
- Initial audience: private friend rooms.
- First platform: a mobile-friendly browser app, accessible by link on iPhone and Android.
- Players are expected to be in Singapore, sometimes together on the same Wi-Fi.
- Use the repo-style generator with a certified full-clear path for each initial board.
- First valid selection to reach the authoritative server wins overlapping fruit; show committed clears rather than the opponent's live drag.
- A match lasts 120 seconds of active play, or ends when the board is empty. Do not end early merely because no valid moves remain. Equal scores end in a draw.
- Disconnects do not stop the clock; allow rejoins.
- Either player can pause immediately, spending one of their two pause chances per game. Pauses last at most 30 seconds, with early resumption when both are ready.
- Pauses hide the board from both players and cancel active drags. Ignore further pause requests while already paused without spending a chance.
- Join through guest nicknames and private links/codes first; allow future accounts, including Google login.
- TypeScript is acceptable, but the backend language is not settled. The user knows Java 8 and is interested in modern Java; Python is also an option, and Rust is unfamiliar but of interest for agent-assisted development.
- The offline research solver is deferred until after the main game.
- Separate-board races, asynchronous challenges, and shared-board cooperation remain ideas for later exploration.

## Decision tree

1. First release: shared-board competition + solo (confirmed).
   - Board style: certified full-clear initial boards (confirmed).
   - Match duration: full 120 seconds or empty board; no no-moves ending (confirmed).
   - Conflicting clears: first valid server arrival (confirmed).
   - Selection feedback: pending highlight vs optimistic removal (open).
   - Opponent selection visibility: committed clears only (confirmed).
   - Equal scores draw (confirmed); rematch flow (open).
2. Audience: private friends (confirmed).
   - Guest nicknames and private links/codes first; future accounts including Google login (confirmed).
   - Stable internal player identity and later guest-to-account linking (proposed).
   - Disconnect clock continues; allow rejoin (confirmed); rejoin window duration (open).
   - Unilateral pause, two chances per player, maximum 30 seconds (confirmed).
   - Hide board and cancel drags during pause; ignore additional pause requests without charge (confirmed).
   - Trust model: casual validation vs stronger ranked enforcement (recommend casual validation).
3. Platform: browser first (confirmed).
   - Touch selection, board orientation and phone usability (open; test on actual phones).
   - Optional home-screen installation (proposed).
4. Geography: Singapore, sometimes same room/Wi-Fi (confirmed).
   - Singapore server proposed; validate actual round-trip times on the two phones.
5. Solver purpose: offline research, after the game (confirmed).
   - No existing-site automation in the planned scope.
6. Technology and learning goals: TypeScript acceptable; backend language open.
   - All TypeScript/Node/Colyseus is the simplest route for shared code and room infrastructure.
   - TypeScript browser + Java backend is a viable route for refreshing Java skills.
   - Ask whether delivery speed or deliberate modern-Java learning should determine this choice.

## Proposed direction, not accepted decisions

Use TypeScript with a pure rules package shared by a mobile web client, an authoritative room server, and an offline solver. Use reliable WebSocket messages for submitted selections and committed clears. Prefer one authoritative owner per room; persist board definitions and completed matches separately from the live message path.

For overlapping selections, recommend first valid arrival at the room owner, with one atomic clear and score update. Explain the network advantage honestly. Do not accept a client timestamp as proof that their selection happened first. Accept an older board revision when the fruit inside the submitted selection is unchanged; reject a selection whose intended fruit has changed.

The repository currently contains research and design documents, not an implemented application. The conflict-ordering decision is captured in ADR 0001. Runtime, hosting provider, and library choices remain recommendations. The language comparison is in [technology-options.md](research/technology-options.md).
