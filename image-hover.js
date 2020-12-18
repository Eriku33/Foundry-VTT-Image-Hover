Hooks.on("init", function() {

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

    // client setting
    game.settings.register("image-hover", "userEnableModule", {
      name: "Enable/Disable Image Hover",                               // Setting name
      hint: "Uncheck to disable Image Hover (per user).",               // Setting description
      scope: "client",      // client-stored setting
      config: true,         // Show setting in configuration view
      type: Boolean,        // Value type
      default: true,        // The default value for the setting
    });

    // client setting
    game.settings.register("image-hover", "userImagePosition", {
      name: "Position of image",                                                                    // Setting name
      hint: "Set the image position to the top left or bottom left of the screen (per user).",      // Setting description
      scope: "client",          // Client-stored setting
      config: true,             // Show setting in configuration view
      choices: {                // Choices
        "Top": "Top Left",
        "Bottom": "Bottom Left"
      },
      default: "Bottom",        // Default Value
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

    
});

class ImageHoverHUD extends BasePlaceableHUD {

    /**
     * Retrieve and override default options for BasePlaceableHUD
     */

    static get defaultOptions() {
	return mergeObject(super.defaultOptions, {
            id: "image-hover-hud",
            classes: [...super.defaultOptions.classes, 'image-hover-hud'],      // Use default "placeable-hud"
            minimizable: false,
            resizable: false,
	        template: "modules/image-hover/templates/image-hover-template.html"
        });
    };

    /**
     * Get the image we want to show
     */

    getData() {
        const data = super.getData();
        const actor = this.object.actor;
        data.img = actor.img;
	    if (data.img == 'icons/svg/mystery-man.svg') {      // If no character art exists, use token art instead.
		    data.img = actor.data.token.img;
        }
        return data;
    };

    /**
     * Set handout position, this uses the client screen position and zoom level to scale the image.
     */
    
    setPosition() {
        if (!this.object) return;

        /**
         * Here we decide how we want to scale our image into our window size
         */

        var imageHover = this;
        var center = canvas.scene._viewPosition;                                // Middle of the screen
        const imageSize = game.settings.get('image-hover', 'userImageSize');
        var widthScale = window.innerWidth/(imageSize*center.scale);            // Scaling to be configured
        const image = imageHover.object.actor.img;                              // Image

        /**
         * Preload the image to fit our scale and apply it to the element
         * Allow a configuration setting for the position of our image
         */

        this.fitImageDimensions(image, widthScale, function(heightPixels){      // Had to do this in a callback
            var yAxis = imageHover.ChangePosition(heightPixels, center);
            var xAxis = center.x - (window.innerWidth/(2*center.scale));
            const position = {                                                  // CSS
                width: widthScale,
                height: "auto",
                left: xAxis,
                top: yAxis,
                textAlign: "inherit"
            };
            imageHover.element.css(position);                                   // Apply CSS to element
        });
    };

    fitImageDimensions (image, widthScale, callback){
        const img = new Image();
        img.onload = function() {                                               // Get rescaled height of image in pixels
            const widthPixels = this.width/widthScale;
            const heightPixels = this.height/widthPixels;
            callback(heightPixels);
        }       
        img.src = image;                                                        // Load image
    }

    /**
     * Load image and relocate image based on height(Canvas pixels) to fit screen
     */

    ChangePosition(heightPixels, center) {
        const imagePosition = game.settings.get('image-hover', 'userImagePosition')
        if (imagePosition === 'Bottom'){
            var yAxis = center.y - heightPixels + (window.innerHeight/(2*center.scale));
        }
        else {
            var yAxis = center.y - (window.innerHeight/(2*center.scale));
        };
        return yAxis;
    }
};

/**
 * Add Image Hover display to html on load.
 * Note: Fix hack - reconfigure and create a new sibling to the current hud element. 
 */

Hooks.on("renderHeadsUpDisplay", (app, html, data) => {

    html[0].style.zIndex = 60;                                      // Sets image to show above other UI. This is definately a hack!
    html.append(`<template id="image-hover-hud"></template>`);
    canvas.hud.imageHover = new ImageHoverHUD();

});

/**
 * Display image when user hovers mouse over a actor
 * Must be used on the token layer and have relevant actor permissions (configurable settings by the game master)
 */
Hooks.on('hoverToken', (token, hovered) => {
	if (!token || !token.actor)                                                                 // Check if token is a actor
            return;

        const actorRequirementLevel = game.settings.get('image-hover', 'permissionOnHover');    
        const showPreview = game.settings.get('image-hover', 'userEnableModule');             // Get some configurable game settings
        if (token.actor.permission < actorRequirementLevel || showPreview === false)
        	return;

        if (hovered && canvas.activeLayer.name == 'TokenLayer') {       // Show token image if hovered, otherwise don't
		    canvas.hud.imageHover.bind(token);
        } else {
            canvas.hud.imageHover.clear();
        }
});