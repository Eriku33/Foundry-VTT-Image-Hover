![Foundry VTT](https://img.shields.io/badge/Foundry-Version12-informational)
![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fimage-hover&colorB=4aa94a)
![Total Downloads](https://img.shields.io/github/downloads/eriku33/Foundry-VTT-Image-Hover/module.zip?label=Downloads%20across%20all%20releases)
![The Latest Version Downloads](https://img.shields.io/github/downloads/eriku33/Foundry-VTT-Image-Hover/latest/module.zip?label=Latest%20Version%20downloads)
# Image-Hover (https://foundryvtt.com/packages/image-hover/)

* **Author**: eriku88 (Discord)
* **Version**: 3.1
* **Foundry VTT Compatibility**:
  - Foundry v13 - latest release.
  - Foundry v12 - 3.0.5.
  - Foundry v11 - 3.0.3.
  - Foundry v10 - 3.0.2.
  - Foundry v9 - 2.0.6.
  - Before Foundry v9 - 1.1.8.
* **System Compatibility**: All systems.
## Installation
To install, search for `Image Hover` in the module list.

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
