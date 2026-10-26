# Avatar data

Everything the avatar draws on top of its body, as files you can review in a pull request. `scripts/build-data.mjs` turns them into the modules in `src/generated/` (run by `test`, `build` and `typecheck`). The files were extracted once from the original design prototype and are edited by hand since.

## Files

| File | What it holds |
| --- | --- |
| `base.css` | Rules every avatar needs: the skeleton, the mouth and hands animations, the ground shadow, reduced motion |
| `runtime.css` | Rules written for the package: sizing, the dark theme, pausing, the live region |
| `events.json` | The event table, error notes, and the controller's timings (back to idle, still working, fidgets, dozing) |
| `states/<state>.json` | One state: name, when it plays, its family, its mouth and hands, its pose, its five ways of acting and their parts |
| `states/<state>.css` | That state's animations |
| `holidays/<region>.json` | One region: its holidays (label, kind, five costumes), its dates, the shared holidays it keeps, moon tables, costume parts |
| `holidays/<region>.css` | That region's costume animations |
| `holidays/common.css` | Costume rules used by several regions (loaded with the first holiday) |

## States

A state's parts are SVG templates. Each names the zone it draws in (`pre`, `cosb`, `back`, `mid`, `glyph`, `front`, `top`, `fx`), its paint order in that zone (`i`), and the trigger classes that show it (`v-<variant>` or `st-<state>`). Holes like `{{a.mid}}` are filled from the look's geometry (`src/geo.ts`), so a part fits every body.

Mouth expressions and hand gestures are named here and drawn in `src/face.ts`: a variant's `mouth` or `hands` overrides the state's; `mouth: "own"` means the way of acting opens its own mouth.

The five chat states (idle, busy, happy, sad, curious) ship in the main bundle. The other families load the first time one of their states shows.

## Holidays

Dates are rules, so they work for any year:

| Rule | Means |
| --- | --- |
| `"MM-DD"` | A fixed date |
| `{ "easter": n }` | n days after Easter Sunday |
| `{ "nth": [month, weekday, k] }` | The k-th weekday of the month (weekday 0 is Sunday) |
| `{ "last": [month, weekday] }` | The last weekday of the month |
| `{ "onOrAfter": ["MM-DD", weekday] }` | The first weekday on or after a date |
| `{ "table": key }` | The region's moon table for that year |
| `{ "rule": name }` | The few that need code (`src/holidays/calendar.ts`) |

`from` and `to` set the first and last day, as days from the main day. Moon tables list `[main, first, last]` per year (or several of those when a festival falls twice in a year). A test fails when any table ends less than two years from today; `moonSources` and `moonNotes` say where each table comes from.

`kind` is one of `civic`, `cultural`, `religious` or `seasonal`, so an app can turn off a whole kind. Kinds are provisional and every holiday has `"reviewed": false` until someone who celebrates it has checked its five costumes (docs/DESIGN.md, Cultural review). Set `reviewed` to true, and fix or drop a costume, as part of that review.

## CSS conventions

Every selector is scoped under `.aa-av` and every keyframe name starts with `aa-`, so nothing leaks into the page. Outlines use `var(--aa-ink, #3A3833)`; the shadow uses `--aa-shadow-color` and `--aa-shadow-strength`.
