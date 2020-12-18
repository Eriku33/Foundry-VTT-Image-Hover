![](https://img.shields.io/badge/Foundry-v0.7.7-informational)

# Image-Hover

* **Author**: Brussel Sprouts#2108 (Discord)
* **Version**: 1.0.0
* **Foundry VTT Compatibility**: 0.7.7
* **System Compatibility**: dnd5e and maybe others but have not checked.

## Installation
To install, follow these instructions:

1.  Inside Foundry, select the Game Modules tab in the Configuration and Setup menu.
2.  Click the Install Module button and enter the following URL:<br>https://raw.githubusercontent.com/Eriku33/Foundry-VTT-Image-Hover/main/module.json

## Description
A simple module that allows players to hover over actor tokens and see the character art.<br>
User must be on the token layer to see the character art, if no character art exists (default icon), token art is used instead.
![preview](pics/image-hover-pic.PNG?raw=true)

### Settings
#### Required actor permission
Setting for game masters to configure the required actor ownership to see character art.<br>
Default: None - All users can hover over any token and see character art.
#### Enable/Disable Image Hover
Each user can disable the module.<br>
Default: On
#### Position of Image
Each user can have the character art show up at the top left or bottom right of their screen.<br>
Default: Bottom Left
#### Image to monitor width
Each user can configure the size of the image base on the width of their monitor.<br>
Default: 7 - Image will take up <sup>1</sup>&frasl;<sub>7</sub>th of your screen.
