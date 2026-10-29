# Free rectangle selection on phones and computers

The owner chose free-drawn rectangles with strict center-based inclusion and removed all alternate selection methods and zoom on 29 October 2026. This replaces the earlier cell-snapped/two-corner/magnifier preview. [Issue 19](https://github.com/matthew-ngzc/fruit-box/issues/19) owns this change; [issue 3](https://github.com/matthew-ngzc/fruit-box/issues/3) retains revised-device review.

## One selection interaction

Press on the board and drag a free rectangle in either direction, then release. The box follows the pointer's pixel coordinates without snapping to fruit boundaries. A fruit is included only if its rendered center is strictly inside all four rectangle edges. Covering part of a fruit without its center excludes it; covering its center includes it without needing the whole fruit. Starting on a fruit does not automatically include it. Fruit on an exact rectangle edge is excluded.

The client measures actual rendered centers, including grid gaps, and passes those numeric coordinates to [the pure rectangle rule](../src/rules.ts). It highlights included active fruit and computes their sum. The badge sits above the moving endpoint, with local edge adjustments when necessary, instead of moving to a distant corner. No magnifier, touch zoom, corner-tap selection, keyboard activation or cell-snapping mode remains. Escape still cancels a gesture; keyboard operation of ordinary controls remains normal.

Release submits a sum-ten selection through the same server-authoritative command path. The selected fruit form a contiguous grid rectangle; empty outer rows/columns can be trimmed when producing integer cell bounds without changing intended active fruit. The exact intended IDs are still checked by [the authoritative match](../src/match.ts), so competing clears and duplicate delivery keep their existing rules. Pending feedback retains the drawn rectangle until confirmation/rejection; only committed state removes fruit and updates scores.

A tap/no-area gesture cancels rather than establishing a first corner. Only the primary captured pointer controls the drag. Pointer cancellation/capture loss, Escape, resize/rotation, pause, disconnect and play-state exit cancel it. Release after cancellation cannot submit stale geometry. The source contains no DOM-based zoom or second selection form.

## Landscape and fullscreen

Landscape keeps the full 17-column, 10-row board beside compact time/score/controls, with dynamic viewport height, safe-area padding and a short-viewport adjustment. Portrait keeps a rotate hint. Solo and versus use the same board and selection rendering; solo shows one score and no invite controls.

The owner reported fullscreen working on Android Brave. Ready/Start and the explicit Fullscreen button retain the gesture-based request and best-effort landscape lock from the earlier preview. Failure/unavailable APIs do not block play; manual landscape remains usable. The latest owner report reconfirms Android Brave game-start fullscreen, but says an earlier iPhone trial failed (browser/version unknown). The prior free-box/solo change did not introduce an iPhone fullscreen workaround. Current [WebKit tracking](https://bugs.webkit.org/show_bug.cgi?id=206854) still documents the iPhone page-fullscreen limitation; video fullscreen cannot display this interactive game. Capability detection disables an unsupported Fullscreen action and keeps visible rotate/landscape guidance, including in landscape. This is a fallback, not an iPhone native-fullscreen fix. A successful Android Brave report is not iPhone/Safari or all-version browser acceptance. Fullscreen, input cancellation and fallback behavior are documented in [gameplay](versus-gameplay.md) and the primary [Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen) / [orientation API](https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock) references.

## Reference and feedback

The pinned [reference engine](https://github.com/weizixiao/fruit-box-game/blob/de7b1f59bff021d76f5138af17bed37220f7783e/engine.js#L218) tests strict center inclusion, and [its app](https://github.com/weizixiao/fruit-box-game/blob/de7b1f59bff021d76f5138af17bed37220f7783e/app.js#L101) draws a free box, sum and selected-cell highlights. This change follows that interaction rather than the earlier cell-snapped experiment. The inspected GitHub snapshot has no fullscreen/orientation-lock implementation; the owner's observation of automatic rotation on the live site is separate evidence. No new upstream assets or app code are copied; the existing MIT engine notice remains included.

The owner found the distant endpoint magnifier disorienting because it required looking across the screen. That feedback is the reason zoom is removed, not a claim that every player prefers the same design. Earlier screenshots under mobile-selection/ are historical evidence of the superseded preview; current evidence belongs under free-selection-solo/ and the issue/PR.

## Verification

Pure rule tests use known center coordinates to verify all four strict edges, a small rectangle containing a center and a zero-area box. Browser input checks validate continuous geometry, no forced start-cell inclusion, reverse drags, partial-fruit center inclusion, no two-tap/keyboard selection or zoom, actual clear/scoring, touch cancellation, solo display and versus synchronization. Actual revised phone review remains pending until the owner tries this version. No gesture recording is claimed where capture is unavailable.

## Pause and room sharing

Pause hides the board with a full-viewport cover. The red Resume action is centered and at least 56px high in portrait and landscape. Versus shows waiting feedback until both choose it; solo resumes immediately. Finished rounds offer a central Play again action; the [gameplay contract](versus-gameplay.md) owns consent and reset rules.

Room sharing has distinct code and invite-link copy buttons. The [Clipboard API requires a secure context](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText); a phone accessing a local Wi-Fi HTTP address may not expose it. The client attempts legacy copy from selected text if needed, and leaves a selectable field plus manual instructions if automatic copying is denied/unavailable. No success is claimed after a failed copy. Physical-browser clipboard and revised iPhone interaction still need device acceptance; Chrome verification distinguishes actual HTTP/clipboard readback from simulated denial/API absence.
