# Mobile selection and landscape preview

The owner reported successful two-player play on an Android phone using Brave on 29 October 2026, but found finger occlusion and portrait target size difficult. This is evidence of that reported session, not acceptance of the revised interaction or verification on every phone/browser. [Issue 17](https://github.com/matthew-ngzc/fruit-box/issues/17) implements the improvements; [issue 3](https://github.com/matthew-ngzc/fruit-box/issues/3) keeps revised device acceptance open.

## Combine the box with apple feedback

Drag directly across apples, or tap/click two opposite corners; keyboard users can activate corner cells. Highlight the included active apples and draw an enclosing box at their cell edges. Display the running sum in a badge placed at the candidate corner farthest from the active pointer, plus a stable summary outside the board. A total of ten changes the badge/box appearance; pending confirmation retains the outline with a dashed border. Only authoritative state removes fruit and changes scores.

This is a hybrid with cell snapping, not a pixel-for-pixel copy of the reference's free rectangle. Existing users get a visible enclosing box and sum; a beginner can start directly on an apple. Both methods still need usability trials rather than claims that one is universally more intuitive. Increasing fruit size alone cannot make the endpoint visible through a finger.

Touch zoom is on by default and can be turned off. While dragging with a touch pointer, a separate nine-cell magnifier shows the endpoint and its neighbors; the center cell is outlined and selected fruit are tinted. It moves to the opposite viewport corner to avoid the active finger. It is transient and can cover other information, so its usefulness remains part of device review. Pointer coordinates are not shifted; the box, highlights, server rectangle and magnifier all use the same cells. Mouse/keyboard play does not show the touch magnifier.

Only the active primary pointer controls a drag. Escape, pointer cancellation/capture loss, resize/rotation, pause, disconnect and leaving play cancel selection and hide overlays. Releasing after cancellation cannot submit the old rectangle. Resizing cancels rather than reinterpreting a gesture under a changed layout. Touch action is disabled only on the board, preserving normal surrounding page behavior.

## Landscape and fullscreen

In a short landscape viewport the header/footer give way to a board plus compact sidebar containing time, scores and controls. The board remains 17 columns by 10 rows; the phone is not asked to play a CSS-rotated portrait canvas. Dynamic viewport height and safe-area insets constrain the board. Portrait remains playable and displays a rotate hint. A short-viewport adjustment supports a 320px-high layout with more compact controls; actual readability/touch acceptance remains to be checked.

Ready attempts fullscreen on coarse-pointer/small-viewport devices from the user's tap; a separate Fullscreen button permits retry or exit. After fullscreen succeeds, attempt screen.orientation.lock('landscape') only when the method is present on a mobile-sized/coarse-pointer device. API errors never block readiness or play. If fullscreen/locking is unavailable or denied, give brief manual-rotation feedback. Fullscreen and resize events cancel the current selection. No automatic fullscreen request is sent from a later server event because it lacks the required user activation.

This is best-effort capability handling, not a promise that all browsers can be forced into landscape fullscreen. Browser version, permissions, embedding and platform policy affect availability. In particular iPhone WebKit has a known fullscreen limitation. Core selection and CSS landscape continue without either API. Physical Android Brave retry and iPhone/Safari acceptance remain pending.

## What the reference actually shows

The pinned [upstream app.js](https://github.com/weizixiao/fruit-box-game/blob/de7b1f59bff021d76f5138af17bed37220f7783e/app.js#L101) creates a selection rectangle, a sum label, and selected-cell highlights. Its pointer handlers update a free rectangle; the inspected app/styles source has no fullscreen or orientation-lock implementation. The owner observed automatic landscape/fullscreen on the live fruitboxgame.com site; that observation must not be attributed to the GitHub snapshot, whose implementation can differ. No additional upstream code/assets were copied for this change; the existing MIT engine notice remains in place.

Primary browser references: [Fullscreen user activation and rejection behavior](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen), [orientation-lock requirements](https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock), [WebKit iPhone fullscreen tracking](https://bugs.webkit.org/show_bug.cgi?id=206854).

## Verification

Browser checks exercise a running Docker preview through real room creation and pointer/touch input. They cover forward/reverse box selection, sums/highlights and committed clears, touch endpoint preview, secondary-pointer rejection, cancellation, resize and pause cleanup, landscape bounds and fullscreen-unavailable/denied fallback. Existing unit/integration/container tests retain server-rule coverage. Test results, screenshots, recordings and unavailable engine/device checks are recorded in issue 17 and its PR, not assumed from this design description.
