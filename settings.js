export class Settings {
    static createSettings() {
        // Game master setting
        game.settings.register("image-hover", "permissionOnHover", {
            name: "Required actor permission",                              // Setting name
            hint: "Required permission level of Actor to see handout.",     // Setting description
            scope: "world",         // Global setting
            config: true,           // Show setting in configuration view
            restricted: true,       // Game master only
            choices: {              // Choices
                    "0": "None",
                    "1": "Limited",
                    "2": "Observer",
                    "3": "Owner"
            },
            default: "0",           // Default value
            type: Number            // Value type
        });

        // Game master setting
        game.settings.register("image-hover", "artType", {
            name: "Art on hover",                              // Setting name
            hint: "The type of art shown on hover",     // Setting description
            scope: "world",         // Global setting
            config: true,           // Show setting in configuration view
            restricted: true,       // Game master only
            choices: {              // Choices
                    "character": "Character art",
                    "token": "Token art",
                    "wildcard": "Token art if wildcard"
            },
            default: "character",   // Default value
            type: String            // Value type
        });

        // client setting
        game.settings.register("image-hover", "userEnableModule", {
            name: "Enable/Disable Image Hover",                               // Setting name
            hint: "Uncheck to disable Image Hover (per user).",               // Setting description
            scope: "client",      // client-stored setting
            config: true,         // Show setting in configuration view
            type: Boolean,        // Value type
            default: true,        // The default value for the setting
            onChange: value => { canvas.hud.imageHover.clear()}
        });

      game.keybindings.register("image-hover", "userKeybindButton", {
        name: "Keybind",                                    // Setting name
        hint: "Assign the additional keybind requirement to show a image while hovering a token (per user).",     // Setting description
        editable: [
        ],
        onDown: () => {
          const hoveredToken = canvas.tokens._hover
          if (hoveredToken !== null) {
            canvas.hud.imageHover.showArtworkRequirements(hoveredToken, true);
          }
        },
        restricted: false,
        reservedModifiers: [],
        precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
      });



        // client setting
        game.settings.register("image-hover", "userImagePosition", {
            name: "Position of image",                                                                    // Setting name
            hint: "Set the location of the image on the screen (per user).",      // Setting description
            scope: "client",          // Client-stored setting
            config: true,             // Show setting in configuration view
            choices: {                // Choices
                "Bottom left": "Bottom left",
                "Bottom right": "Bottom right",
                "Top left": "Top left",
                "Top right": "Top right"
            },
            default: "Bottom left",   // Default Value
            type: String              // Value type
        });

        // client setting
        game.settings.register("image-hover", "userImageSize", {
                name: "Image to monitor width",                                    // Setting name
                hint: "Changes the size of the image (per user), smaller value implies larger image (1/value of your screen width).",     // Setting description
                scope: "client",        // Client-stored setting
                config: true,           // Show setting in configuration view
                range: {                // Choices
                        min: 3,
                        max: 20,
                        step: 0.5
                },
                default: 7,             // Default Value
                type: Number            // Value type
        });
    }
}