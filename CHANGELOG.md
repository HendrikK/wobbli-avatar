# Changelog

## 1.0.2

- A controller passed as `controller` now runs on the avatars' ticker: still working, fidgets, dozing, waking and pausing while hidden work for shared controllers, once per controller.
- `<wobbli-avatar>`: `traits`, `events`, `stillWorking` and `holidays` set as properties take JSON strings as well as objects (React 19 sets them as properties), and read back.
- `destroy()` removes the avatar's live region, so a second mount on the same host (React StrictMode) leaves one.
- README: shared controllers, waking from a doze, `speed` and transitions, effects that draw outside the box, and `look().key`.
- No change to how any avatar looks (generator 1).

## 1.0.1

- First release published from GitHub Actions with npm trusted publishing and provenance.
- Documented the release process in CONTRIBUTING.md.
- No change to how any avatar looks or behaves (generator 1).

## 1.0.0

- First release: generator 1 (Blobatar 2.7.0 geometry and fixed style tables), 39 states with five ways to act each, an optional mouth and hands, 74 opt-in holiday costumes in 14 regions.
- `<Wobbli>` for React (server rendering included), `<wobbli-avatar>` web component, `wobbli/dom` for other frameworks, `wobbli/holidays`, `wobbli/formats`, and a shadcn registry item.
