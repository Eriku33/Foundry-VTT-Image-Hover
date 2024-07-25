# Version history

## NEXT

- Add option to never show image for tokens which have a detectionFilter applied to them (this works for the "imprecise" sense in PF2E).

## Version 3.0.3

- Update to be Foundry v11 compatible

## Version 3.0.2

- Minor bug fix

## Version 3.0.1

- Refactor file
- Update module json to new release
- Undefined error handling

## Version 3.0.0

- Foundry v10 compatibility!
- Alt key can now be used as a key binding.
- Dragging/Moving tokens now hides art on screen.

## Version 2.0.6

- Feature for game masters to set a specific artwork to show when hovering over a token.
- This will default to character/token art depending on the module settings.

## Version 2.0.5

- Additonal key binding option for game masters to show all connected users artwork on their screen.
- Option for game masters to set how long this artwork appears on connected users.

## Version 2.0.3 - 2.0.4

- Option to show artwork in centre of screen.
- Moved z-index back to 70 to correctly align with Smalltime module changes.
- Fixed undefined mouse event related to chat portrait module.

## Version 2.0.2

- Default hover delay setting changed back to 0 from 0.7 seconds.
- Character art for large sizes are capped to screen height.
- Fixed directory actor settings not storing properly once moved onto canvas.
- Compatibility with Chat Portrait module.

## Version 2.0.1

- Feature to hide character art to all users for individual tokens.
- Option per user to add a time hovering requirement before showing artwork.
- Add setting to show character art for linked tokens only and token art otherwise.
- Fixed bug where art does not align correctly when positioned on the right side.

## Version 2.0.0

- Update to support Foundry V9!
- Removal of Keybind Lib module and introduce in-built Foundry VTT key bindings.
- Fixed bug with Pathfinder 2e system compatibility.

## Version 1.1.8

- Update compatibility to Foundry 0.8.6.
- Replaced unsupported settings extender with Keybind Lib module.

## Version 1.1.7

- Option to show token art instead of character art when hovering a token.
- Option to show token art for wildcard tokens and character art otherwise.

## Version 1.1.6

- Remove black border from character art.
- Better file path parsing to detect image/video files.

## Version 1.1.3 - 1.1.5

- Alt key can not be used as key binding as key automatically hovers over every token in Foundry. 

## Version 1.1.2

- Option for each user to relocate where the character art appears.

## Version 1.1.1

- update module.json to match correct settings-extender.

## Version 1.1.0

- Cache image when creating a token.
- Remove art on necessary occasions (hover hook triggers behind other UI).

## Version 1.0.9

- Create image cache to improve performance.
- Deleting a token removes any art shown on screen (so it doesn't get stuck there).

## Version 1.0.8

- Add configurable key bind option to show art while hovering over a token.

## Version 1.0.6

- Image Hover now supports animated images (videos).
- Fixed issue where settings do not save over multiple sessions.

## Version 1.0.5

- Updated to support Foundry v0.7.9.
- Supports tokens which use wildcard (randomised) images.

## Version 1.0.4

- Character art is shown above the hotbar UI.
- Zooming or panning your screen will reposition the character art.
- Fixed bug where character art stays on screen while moving a token.

## Version 1.0.2 - 1.0.3

- Fixed bug related to the permission of users to see character art.

## Version 1.0.1

- Remove dnd5e system requirement allowing all other dnd systems to use this module.

## Version 1.0.0

- Release of module to be available to the public.
- Installable on Foundry VTT allowing users to hover over tokens and see character art.

## Version 1.0

- Creation of readme with installation instructions.
- Basic guide on how to use the module.
