![Foundry VTT](https://img.shields.io/badge/Foundry-v9-informational)
![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fimage-hover&colorB=4aa94a)
![The Latest Version Downloads](https://img.shields.io/badge/dynamic/json?label=Latest%20version%20users&query=$[0].assets[?(@.name.includes(%27.zip%27))].download_count&url=https%3A%2F%2Fapi.github.com%2Frepos%2FEriku33%2FFoundry-VTT-Image-Hover%2Freleases)
# Image-Hover (https://foundryvtt.com/packages/image-hover/)

* **Author**: Eriku#2108 (Discord)
* **Version**: 2.0.5
* **Foundry VTT Compatibility**: 9+ (Release 1.1.8 is compatible with previous versions of Foundry VTT)
* **System Compatibility**: dnd5e and most others but have not checked.
## Installation
To install, search for Image Hover in the module list or follow these instructions:

1.  Inside Foundry, select the Game Modules tab in the Configuration and Setup menu.
2.  Click the Install Module button and enter the following URL:<br>https://github.com/Eriku33/Foundry-VTT-Image-Hover/releases/latest/download/module.json.

## Description
A module built on top of the Foundry Virtual Tabletop API that allows users to hover over actor tokens and see the character art.
User must be on the token layer to see the character art, if no character art exists (default icon), token art is used instead.<br>
Image hover also supports animated file types that Foundry allows.  

![image-hover-animation-example](pics/image-hover-v2.0.1-example.gif)

## Settings
![preview](pics/image-hover-v2.0.5-settings.PNG?raw=true)
### Required actor permission
Setting for game masters to configure the required actor ownership to see character art.<br>
Default: None - All users can hover over any token and see art.
### Art on hover
Choose the type of artwork shown for tokens when hovered.<br>
Default: Character art
##### Character art - Character art when possible.
##### Token art - Token art only.
##### Token art if wildcard - Token art if actor is wildcard(random image), otherwise character art.
##### Token art if unlinked - Character art for linked tokens only, otherwise token art.
### Show all users art duration (Game master only)
The time (milliseconds) art is shown to all users when the "show all users art" key bind is pressed when hovering over a token.<br>
User must be on the same scene and have Image Hover enabled.<br>
The required actor permissions and hide art for specific token will be ignored.<br>
Default: 6000 (6 seconds).
### Enable/Disable Image Hover
Each user can disable the module.<br>
Default: Enabled
### Position of Image
Each user can relocate the character art to a different corner of the screen (Bottom left/right , Top left/right and Centre)<br>
Default: Bottom Left
### Image to monitor width
Each user can configure the size of the image based on the width of their monitor.<br>
Default: 7 - Image will take up <sup>1</sup>&frasl;<sub>7</sub>th of your screen.
### Mouse hover time requirement
Each user can add a hover time (milliseconds) requirement before image shows up.<br>
Default: 0.
## Set a keybind to show all users art (Game master only)
Game masters can set a key bind to show all other users artwork.<br>
Users must be on the same scene and have Image Hover enabled.<br>
The duration that this art appears can be changed in the game masters module settings.
## Set a keybind requirement while hovering a token
If a keybind is set in Game settings -> Configure controls,<br> that key will be required to be pressed while hovering 
over a token to see the art (Mouse hover time requirement will be set to 0).<br>
If no keybind is set, art will be shown on token hover.

## Hide art for specific token (Game master only)
If Hide Image Hover Art checkbox is ticked, art will not be shown to anyone on hover.<br>
![image-hover-settings-example](pics/image-hover-token-setting.gif)
