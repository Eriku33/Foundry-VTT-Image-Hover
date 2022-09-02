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
            name: "Art on hover",                                           // Setting name
            hint: "The type of art shown on hover",                         // Setting description
            scope: "world",         // Global setting
            config: true,           // Show setting in configuration view
            restricted: true,       // Game master only   
            choices: {              // Choices
                    "character": "Character art",
                    "token": "Token art",
                    "wildcard": "Token art if wildcard",
                    "linked": "Token art if unlinked"
            },
            default: "character",   // Default value
            type: String            // Value type
        });

        // Game master setting
        game.keybindings.register("image-hover", "showAllKey", {
            name: "Assign a keybind to show all users art.",                // Setting name
            hint: "Dont use Alt key, it won't work.",                       // Setting description
            restricted: true,
            editable:[],
            onDown: () => {
                const hoveredToken = canvas.tokens.hover;
                if (hoveredToken !== null && !game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.ALT)) {
                    canvas.hud.imageHover.showToAll(hoveredToken);                          // apply to self
                    game.socket.emit("module.image-hover", hoveredToken.id);                // emit to all other users
                }
            },
            reservedModifiers: ["ALT"]
        });

        // Game master setting
        game.settings.register("image-hover", "showArtTimer", {
            name: "Show all users art duration",                            // Setting name
            hint: "Time (milliseconds) that art appears to users on the same scene when the \"show all\" keybind is pressed.",     // Setting description
            restricted: true,       // Game master only   
            scope: "world",         // Global setting
            config: true,           // Show setting in configuration view
            range: {                // Choices
                    min: 1000,
                    max: 15000,
                    step: 200
            },
            default: 6000,          // Default Value
            type: Number            // Value type
        });

        // client setting
        game.settings.register("image-hover", "userEnableModule", {
            name: "Enable/Disable Image Hover",                              // Setting name
            hint: "Uncheck to disable Image Hover (per user).",              // Setting description
            scope: "client",      // client-stored setting
            config: true,         // Show setting in configuration view
            type: Boolean,        // Value type
            default: true,        // The default value for the setting
            onChange: value => { canvas.hud.imageHover.clear();}
        });

        // client setting
        game.keybindings.register("image-hover", "userKeybindButton", {
            name: "Assign a keybind requirement to show art while hovering over a token.",                               // Setting name
            hint: "Dont use Alt key, it won't work.",                       // Setting description
            editable:[],
            onDown: () => {
                const hoveredToken = canvas.tokens.hover;
                if (hoveredToken !== null) {
                    canvas.hud.imageHover.showArtworkRequirements(hoveredToken, true, 0);
                }
            },
            reservedModifiers: ["ALT"]
        });
        
        // client setting
        game.settings.register("image-hover", "userImagePosition", {
            name: "Position of image",                                            // Setting name
            hint: "Set the location of the image on the screen (per user).",      // Setting description
            scope: "client",          // Client-stored setting
            config: true,             // Show setting in configuration view
            choices: {                // Choices
                "Bottom left": "Bottom left",
                "Bottom right": "Bottom right",
                "Top left": "Top left",
                "Top right": "Top right",
                "Centre": "Centre"
            },
            default: "Bottom left",   // Default Value
            type: String              // Value type
        });

        // client setting
        game.settings.register("image-hover", "userImageSize", {
            name: "Image to monitor width",                                       // Setting name
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

        // client setting
        game.settings.register("image-hover", "userHoverDelay", {
            name: "Mouse hover time requirement",                               // Setting name
            hint: "Required hover time to show art work (milliseconds).",        // Setting description
            scope: "client",        // Client-stored setting
            config: true,           // Show setting in configuration view
            range: {                // Choices
                    min: 0,
                    max: 5000,
                    step: 100
            },
            default: 0,           // Default Value
            type: Number            // Value type
        });
    }
}