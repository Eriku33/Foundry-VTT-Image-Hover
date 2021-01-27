![Foundry VTT](https://img.shields.io/badge/Foundry-v0.7.7-informational)
![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fimage-hover&colorB=4aa94a)
![Latest_Release_Downloads](https://img.shields.io/badge/dynamic/json?label=Downloads@latest&query=$[0].assets[?(@.name.includes(%27.zip%27))].download_count&url=https%3A%2F%2Fapi.github.com%2Frepos%2FEriku33%2FFoundry-VTT-Image-Hover%2Freleases)
# Image-Hover (https://foundryvtt.com/packages/image-hover/)

* **Author**: Eriku#2108 (Discord)
* **Version**: 1.1.0
* **Foundry VTT Compatibility**: 0.7.7+
* **System Compatibility**: dnd5e and most others but have not checked.

## Installation
To install, search for Image Hover in the module list or follow these instructions:

1.  Inside Foundry, select the Game Modules tab in the Configuration and Setup menu.
2.  Click the Install Module button and enter the following URL:<br>https://github.com/Eriku33/Foundry-VTT-Image-Hover/releases/latest/download/module.json.

## Description
A simple module that allows users to hover over actor tokens and see the character art.<br>
User must be on the token layer to see the character art, if no character art exists (default icon), token art is used instead.
![image-hover-animation-example](pics/image-hover-animation-example.gif)

## Settings
![preview](pics/image-hover-settings.png?raw=true)
### Required actor permission
Setting for game masters to configure the required actor ownership to see character art.<br>
Default: None - All users can hover over any token and see character art.
### Enable/Disable Image Hover
Each user can disable the module.<br>
Default: On
### Enable/Disable Keybind requirement
Each user can add a additional keybind requirement while hovering over a token.<br>
Default: off
### Keybind
Each user can set this keybind<br>
Default: v
### Position of Image
Each user can have the character art show up at the top left or bottom right of their screen.<br>
Default: Bottom Left
### Image to monitor width
Each user can configure the size of the image based on the width of their monitor.<br>
Default: 7 - Image will take up <sup>1</sup>&frasl;<sub>7</sub>th of your screen.
