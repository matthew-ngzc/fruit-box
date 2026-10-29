# Interface wording

The owner requested short, factual wording on 30 October 2026. Use familiar controls, name the current state and give the next action only when needed. Remove slogans, praise, conversational filler and technical implementation details from normal play. [Issue 23](https://github.com/matthew-ngzc/fruit-box/issues/23) owns this change.

The inspected [fruitboxgame.com](https://fruitboxgame.com/) interface uses direct labels such as Score, Time left and Pause. It is a clarity reference; this app keeps its own wording, multiplayer behavior and controls.

| Screen | Current wording |
| --- | --- |
| Landing | Fruit Box; drag a box around apples totaling 10; release to clear |
| Modes | Solo / Versus |
| Starting | Start in solo; Ready in versus |
| Waiting | Waiting for player, or Waiting for [nickname] |
| Paused | Paused by [nickname]; countdown; Resume |
| Solo result | Game over; Score: [number] |
| Versus result | [nickname] wins or Draw; player scores |
| Replay | Play again; wait for the other player by name |
| Copy denied | Copy the selected code/link manually |

Pause ownership is server state, not a guess from the most recent message. The accepted pause records its player's ID; repeated/rejected pauses cannot replace it. Resume/expiry clears it, a new round starts without it, and reconnect during pause retains it. Each client resolves the nickname from shared players and writes it as text. Duplicate nicknames still represent distinct participants. The [gameplay contract](versus-gameplay.md#authority-and-recovery) owns pause rules; [mobile interaction](mobile-interaction.md#pause-and-room-sharing) owns prominence and layout.

Use count labels such as Pauses left: 1 rather than incorrect plurals. Keep useful connection, copying and fullscreen fallback instructions. Successful move acknowledgements do not need an extra status message when board/score/cover already show the result. Error messages still explain rejected actions. These edits do not add new interactions or change timing, scoring, readiness or recovery rules.

Current screenshot evidence is linked from the issue and delivery PR. Earlier screenshot folders show previous wording and remain historical evidence; automated phone viewports do not establish physical-device acceptance.
