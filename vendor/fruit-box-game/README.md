# Pinned Fruit Box engine

Source: [weizixiao/fruit-box-game engine.js at de7b1f59bff021d76f5138af17bed37220f7783e](https://github.com/weizixiao/fruit-box-game/blob/de7b1f59bff021d76f5138af17bed37220f7783e/engine.js).

The upstream MIT license is preserved in [LICENSE](LICENSE). This engine generates a certified full-clear path using the repository-style generator accepted in the design interview. It is not GameSaien's generator.

Mechanical adaptation only: remove the outer `(function () { ... })();` wrapper and replace `window.FruitBoxEngine =` with `export const FruitBoxEngine =`. Normalize line endings/UTF-8 encoding. Algorithm bodies are unchanged. `engine.d.ts` describes only the public subset exposed through src/rules.ts; upstream utilities remain unused. Future updates must retain license/provenance and replay certificates through behavior tests.
