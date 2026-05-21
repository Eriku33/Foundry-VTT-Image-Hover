![Foundry VTT](https://img.shields.io/badge/Foundry-Version12-informational)
![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fimage-hover&colorB=4aa94a)
![Total Downloads](https://img.shields.io/github/downloads/eriku33/Foundry-VTT-Image-Hover/module.zip?label=Downloads%20across%20all%20releases)
![The Latest Version Downloads](https://img.shields.io/github/downloads/eriku33/Foundry-VTT-Image-Hover/latest/module.zip?label=Latest%20Version%20downloads)
# Image-Hover (https://foundryvtt.com/packages/image-hover/)

Small fork of the main Image Hover to address issues, add a few features, and update to support Foundry v14.

### Added The following features:
- **Disable during comba settingt** (world/GM, off by default) — suppresses the popup while a combat encounter is active.
- **Exclude tokens by tag** (world/GM) — An exclude filter to skip the image popup based on tags. (requires the tagger FoundryVTT Module)
- **Popup graphic overlay** (per-user) — a decorative image (e.g. a frame) layered on the popup with associated positioning settings.

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
- Internal cleanup: de-duplicated art-URL resolution, fixed naming/typos, removed dead and unused code, added defensive guards.

## Description
A module built on top of the Foundry Virtual Tabletop API that allows users to hover over actor tokens and see the character art.
User must be on the token layer to see the character art, if no character art exists (default icon), token art is used instead.<br>
Image hover also supports animated file types that Foundry allows.  

![image-hover-animation-example](pics/image-hover-v2.0.1-example.gif)

## Settings
![preview](pics/v13-settings.png?raw=true)
### Required actor permission
Setting for game masters to configure the required actor ownership to see character art.<br>
Default: None - All users can hover over any token and see art.
### Art on hover
Choose the type of artwork shown for tokens when hovered.<br>
Default: Character art
##### Character art - Character art when possible.
##### Token art - Token art only.
##### Token art if wildcard - Token art if an actor is a wildcard(random image), otherwise character art.
##### Token art if unlinked - Character art for linked tokens only, otherwise token art.
### Show all users art duration (Game master only)
The time (milliseconds) art is shown to all users when the `show all users art` key bind is pressed when hovering over a token.<br>
The user must be on the same scene and have `Image Hover` enabled.<br>
The required actor permissions and `hide art for specific token` will be ignored.<br>
Default: 6000 (6 seconds).
### Enable/Disable Image Hover
Each user can disable the module.<br>
Default: Enabled
### Position of Image
Each user can relocate the character art to a different corner of the screen (Bottom left/right, Top left/right and Centre)<br>
Default: Bottom Left
### Image to monitor width
Each user can configure the image's size based on their monitor's width.<br>
Default: 7 - Image will take up <sup>1</sup>&frasl;<sub>7</sub>th of your screen.
### Mouse hover time requirement
Each user can add a hover time (milliseconds) requirement before the image appears.<br>
Default: 0.
## Set a keybind to show all users art (Game master only)
Game masters can set a key bind to show all other users artwork.<br>
Users must be on the same scene and have `Image Hover` enabled.<br>
The duration that this art appears can be changed in the game master's module settings.
## Set a keybind requirement while hovering a token
If a keybind is set in Game settings -> Configure controls,<br> that key will be required to be pressed while hovering 
over a token to view the art (Mouse hover time requirement will be set to 0).<br>
If no keybind is set, art will be shown on token hover.

## Token Configuration Settings
![image-hover-settings-example](pics/v13-token-config.png)

### Hide image hover art (Game master only)
If `Hide Image Hover Art` checkbox is checked, the art will not be shown to anyone on hover for that token.<br>
Default: Unchecked
### Specific image on hover (Game master only)
Use the file picker to select a specific image/video to show when users hover over the token.<br>
Defaults to the image set on the `Art on Hover` setting.<br>
Delete the text to remove the image and revert to the default.<br>
Default: Unset (path/image.png)
