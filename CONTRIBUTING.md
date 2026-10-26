# Contributing to Wobbli

Thanks for helping. Issues and pull requests are welcome: a bug, a costume that looks off, a state that could act better, a framework that needs a wrapper.

## Setup

```sh
pnpm install
pnpm test          # unit suites: generator, behaviour, formats, calendar, render, DOM
pnpm typecheck
pnpm build         # dist/, then: pnpm size
```

Node 18 or later; the repo uses pnpm 10. The studio and the screenshot tests live with the website at [wobbli.dev](https://wobbli.dev).

## How it fits together

- `src/look.ts` is generator 1: a name to a look. `src/render.ts` draws a frame, `src/controller.ts` is the event-to-state machine, `src/dom/` wires them to a page, `src/element.ts` and `src/react.tsx` are the entry points.
- `data/` holds every state and holiday region as JSON and CSS, one file each, so a change is easy to review. See [data/README.md](data/README.md).
- [docs/DESIGN.md](docs/DESIGN.md) is the behaviour the package keeps: the name contract, the defaults, the event rules, the holiday policy.

## Rules that keep apps stable

- **The same name gives the same avatar for all of version 1.** `test/fixtures/generator-1.json` and `src/vendor/` (Blobatar 2.7.0) are frozen; CI fails a pull request that changes them. A change that would alter any avatar is generator 2, in version 2.
- **The event rules are tested on a fake clock.** If you change behaviour, change `test/behaviour.test.ts` with it and say why in the pull request.
- **Bundle sizes are recorded** in `sizes.json`. Growing an entry by more than 10% fails CI; if it is worth it, update the record with `pnpm size --record` in the same pull request.

## Holidays and the cultural review

Holiday costumes are opt-in and every holiday's `kind` is provisional (`"reviewed": false`). If you celebrate one of them, a review is one of the most useful contributions: check its five costumes, fix or remove anything that misrepresents it, set its kind, and set `reviewed` to true. Moon-based dates live in the region files with their sources; a test fails when a table ends less than two years ahead.

## Credits

Faces and shapes come from [Blobatar](https://github.com/Alain00/blobatar) by Alain (MIT). Keep its notice in THIRD_PARTY_NOTICES.md and in the bundles.
