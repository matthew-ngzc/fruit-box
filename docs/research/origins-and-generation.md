# Fruit Box origins and board generation

Checked 2026-10-29. Dates below are UTC unless stated otherwise. This note distinguishes the original game, the newer website, and publication of the newer website's open-source edition. It compares the JavaScript those projects publish; it does not assume matching rules imply matching generators.

## Which came first?

| Event | Earliest dated primary evidence found | What it establishes |
| --- | --- | --- |
| GameSaien's original フルーツボックス / Fruit Box | GameSaien's [own update history](https://www.gamesaien.com/game/fruit_box_a/guide/) marks **2007-10-15** as 「ゲーム設置」 (“game placed/published”). | The original game predates the other two projects by almost 19 years. The history dates its Flash-to-HTML5 migration to **2019-07-05**, so 2019 is a technology update, not the game's origin. |
| `fruitboxgame.com` domain | The [.com registry RDAP record](https://rdap.verisign.com/com/v1/domain/FRUITBOXGAME.COM) records domain registration at **2026-07-27 03:04:41**. | A lower bound for possible use of this domain; registration does **not** establish when the game site went live. |
| `weizixiao/fruit-box-game` repository | [GitHub repository metadata](https://api.github.com/repos/weizixiao/fruit-box-game) records creation at **2026-08-12 01:13:26**. Its [first commit](https://github.com/weizixiao/fruit-box-game/commit/0131fe7151c6d0834caef63c09e895ffa0567b65) is dated **2026-08-12 01:15:09**. | Creation and first commit of the public repository, not the first deployment of `fruitboxgame.com`. |
| Public promotion of `fruitboxgame.com` | The author's [V2EX announcement](https://www.v2ex.com/t/1233716), whose [platform API](https://www.v2ex.com/api/topics/show.json?id=1233716) timestamps creation at **2026-08-12 01:27:30**, links both the site and repository. The [Internet Archive CDX index](https://web.archive.org/cdx/search/cdx?url=fruitboxgame.com%2F&output=json&filter=statuscode%3A200) has a 200-response homepage capture at **2026-08-22 15:57:04**. | The project publicly advertised the site on August 12, and an archive independently observed it serving a homepage by August 22. Neither proves its first-live moment. |

GameSaien is first by the dated evidence. The [newer site's own About page](https://fruitboxgame.com/about) identifies GameSaien as the original and describes `fruitboxgame.com` as an independent implementation with its own generator. The domain was registered before the GitHub repository was created, but **the site launch versus repository creation order remains unverified**: a domain registration is not a deployment record, and the August 12 announcement came after the repository creation timestamp.

## Original GameSaien generator (published HTML5 version)

The [English page](https://en.gamesaien.com/game/fruit_box/) and [Japanese page](https://www.gamesaien.com/game/fruit_box_a/) both load a file named `fruit_box_a_006_o.js`. The two [English](https://en.gamesaien.com/game/fruit_box/fruit_box_a_006_o.js) and [Japanese](https://www.gamesaien.com/game/fruit_box_a/fruit_box_a_006_o.js) files returned identical SHA-256 `27139D043AEF8890BCB75932920280519062D1C3EFAAEEF770F2509DA81E347A` when inspected. The file is minified and obfuscated; the following is a static reading of its `Cl_mm` board-initialization path, without executing it:

1. Set `nuMbX = 0x11` (17) and `nuMbY = 0xa` (10), for 170 positions.
2. In row-major order, draw `Math.floor(Math.random() * 9) + 1` for each cell.
3. For the **last** cell, overwrite that draw with `10 - (sum of the previous 169 values % 10)`.
4. If this makes the last cell `10`, restart the entire draw; otherwise accept the board. The code's `flHas10` flag tracks this rejection condition, not whether the board contains a playable sum-10 rectangle.

Consequently, every accepted value is 1–9 and the **total of all 170 values is divisible by 10**. The setup code has no seed, daily board, rectangle search, or recorded full-clear sequence. Its only acceptance condition is that the adjusted last cell fits in 1–9. Thus the delivered generator does **not certify** that the board can be fully cleared. This says what the code guarantees; it does not assert that a particular GameSaien board is impossible to clear.

Under an ideal uniform `Math.random()` model, the accepted outputs are uniformly distributed over 1–9 grids whose total is divisible by 10: each accepted grid corresponds to exactly one draw of its first 169 values. This conditions the grid globally rather than choosing independent values for all 170 positions. The rejection rate is approximately 10%, and symmetry gives expected total **850** (mean cell value 5). These are mathematical consequences of the code, not extra code paths or an empirical measurement of a browser's pseudorandom generator.

## Newer website / repository generator

The [repository README at inspected commit `de7b1f5`](https://github.com/weizixiao/fruit-box-game/blob/de7b1f59bff021d76f5138af17bed37220f7783e/README.md) says its framework-free edition keeps the online game's board generator, and its [algorithm document](https://github.com/weizixiao/fruit-box-game/blob/de7b1f59bff021d76f5138af17bed37220f7783e/docs/ALGORITHM.md) explains the constructive method. The [engine source at that commit](https://github.com/weizixiao/fruit-box-game/blob/de7b1f59bff021d76f5138af17bed37220f7783e/engine.js) is the direct evidence:

- `createSolvableBoard` chooses **72–82** groups for a standard 170-cell board. Group sizes 2–10 use weights **34, 25, 17, 10, 6, 4, 2, 1, 1**; a dynamic-programming completion table conditions choices so their sizes consume exactly 170 cells.
- `createSumTenGroup` chooses distinct cut points from 1–9 to partition 10 into positive values. The group values therefore sum to 10.
- `placeGroups` finds rectangle candidates among as-yet unassigned cells using a two-dimensional prefix sum, selects a matching candidate with weights favoring holes later in placement, assigns shuffled group values, and records a rectangle/cell-id solution step. Failed attempts restart, up to 40 attempts; exhaustion throws.
- A successful return includes a full-clear sequence. `createBoard` returns only the visible board. A player can still break the recorded sequence by choosing other valid rectangles; the [site's About page](https://fruitboxgame.com/about) explicitly makes that distinction.
- The engine supports an unseeded classic board or a seeded daily board. The daily seed is derived from the date after shifting by 05:00 UTC, and its seeded random function is a 32-bit linear congruential generator. This is a feature of the newer implementation, not evidence that GameSaien uses a daily seed.

Every successful standard board has total **720–820** (10 times 72–82 groups), so its mean cell value is about **4.24–4.82**. That total range is a concrete distribution difference from GameSaien's broadly varying totals around 850. Both games share the 17 × 10 board, 1–9 values, rectangular sum-10 clearing, 120-second round, and one point per cleared apple, but these shared rules do not make their starting boards statistically or computationally equivalent.

## Limits of this evidence

- The GameSaien result describes its currently delivered HTML5 script, not the private or historical 2007 Flash source. Its own update log supports the 2007 game date and 2019 migration, but does not prove the Flash generator used the same method.
- The repository metadata dates GitHub publication. The site announcement and archive capture bound public availability, but I found no first-deployment record for `fruitboxgame.com`.
- The repository README asserts parity with the live site's generator. This comparison did not independently inspect the live site's server bundle or server-side validation; it uses the published repository engine and the site's own statement about its independent generator.
