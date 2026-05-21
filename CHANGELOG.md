# Changelog

## 3.2 - 2026-05-19

### Added
- **Disable during combat** (world/GM, off by default) — suppresses the popup while a combat encounter is active.
- **Exclude tokens by tag** (world/GM) — skips popups for tokens tagged via the Tagger module; the field is disabled and warns the user when Tagger is not installed.
- **Popup graphic overlay** (world/GM) — a decorative image (e.g. a frame) layered on the popup, with path sanitization restricting it to image files inside the Foundry data directory.
- **Graphic position/scale** (world/GM) — X, Y, Z and scale settings, each accepting a `%` or `px` value; shown only when a graphic is set.
- **Token image scale** (world/GM) — shrinks the art inside the popup so it can fit within a frame graphic.

### Fixed
- `canvasPan` crash (`Cannot read properties of undefined (reading 'style')`) — repositioning now guards on render state.
- Broken image/video URLs no longer hang forever — load failures are caught, cached, and logged once.
- Rapid-hover race that closed/reopened the wrong token's art — the per-hover timer is now tracked and cleared.
- Unbounded growth of the image dimension cache — it is now reset per scene.
- Token-cache loop aborting early on the first actor-less token.
- Null crash in the chat-portrait detection check.

### Changed
- Foundry v14 compatibility (v13 still supported): replaced the private `canvas.scene._viewPosition` with the live canvas transform, token-config hook uses `app.document` with an `app.token` fallback, manifest verified for v14.
- World/GM settings now read fresh, so changes reach players immediately instead of going stale until a settings dialog is reopened.
- Removed the non-standard global `event`; cursor and drag state are tracked via pointer listeners.
- Default "Image to monitor width" is now 5.5 (was 7) and default "Mouse hover time requirement" is now 100 ms (was 0).
- Internal cleanup: de-duplicated art-URL resolution, fixed naming/typos, removed dead and unused code, added defensive guards.

## 3.1

- Initial baseline for this changelog.
