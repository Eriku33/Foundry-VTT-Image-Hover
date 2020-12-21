import { registerSettings } from './settings.js';

/**
 * Copy Placeable HUD template
 */

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
	        template: "modules/image-hover/templates/image-hover-template.html" // HTML template
        });
    };

    /**
     * Get image for html template
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
         * Here we scale our image corrosponding to the window size.
         */
        this.updatePosition();
    };

    /**
     * 
     * @param {String} image Character art we want to show
     * @param {Number} widthScale Width of image in pixels
     * @param {*} callback 
     * Get the size of the image and rescale it to find pixel height, we need this to correct the positioning when the image is at the bottom.
     */

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

    changePosition(heightPixels, center) {
        const imagePositionSetting = game.settings.get('image-hover', 'userImagePosition')
        if (imagePositionSetting === 'Bottom'){
            var yAxis = center.y - heightPixels + (window.innerHeight/(2*center.scale));
        }
        else {
            var yAxis = center.y - (window.innerHeight/(2*center.scale));
        };
        return yAxis;
    }

    /**
     * While hovering over a token and zooming or moving screen position, we want to reposition the image and scale it.
     */

    updatePosition() {
        const imageSizeSetting = game.settings.get('image-hover', 'userImageSize');
        const imageHover = canvas.hud.imageHover;
        const center = canvas.scene._viewPosition;                                  // Middle of the screen
        const widthScale = window.innerWidth/(imageSizeSetting*center.scale);       // Scaling to be configured
        const image = imageHover.object.actor.img;                                  // character art
        
        /**
         * Preload the image to fit our scale and apply it to our template.
         */

        imageHover.fitImageDimensions(image, widthScale, function(heightPixels){      // Had to do this in a callback
            var yAxis = imageHover.changePosition(heightPixels, center);
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
};

/**
 * Add Image Hover display to html on load.
 * Note: Fix hack - reconfigure and create a new sibling to the current hud element. 
 */

Hooks.on("renderHeadsUpDisplay", (app, html, data) => {

    html[0].style.zIndex = 70;                                      // Sets image to show above other UI. This is definately a hack!
    html.append(`<template id="image-hover-hud"></template>`);
    canvas.hud.imageHover = new ImageHoverHUD();

});

/**
 * Display image when user hovers mouse over a actor
 * Must be used on the token layer and have relevant actor permissions (configurable settings by the game master)
 */

Hooks.on('hoverToken', (token, hovered) => {
	if (!token || !token.actor)                                                           // Check if token is a actor
            return;

    const actorRequirementSetting = game.settings.get('image-hover', 'permissionOnHover');    
    const showPreviewSetting = game.settings.get('image-hover', 'userEnableModule');             // Get some configurable game settings
    if (showPreviewSetting === false)
        return;
    if (token.actor.permission < actorRequirementSetting && token.actor.data.permission['default'] !== -1)    // actors made before October 2020 has permissions set to -1 (fixed foundry bug)
        return;
    
    if (hovered && canvas.activeLayer.name == 'TokenLayer') {       // Show token image if hovered, otherwise don't
        canvas.hud.imageHover.bind(token);
    } else {
        canvas.hud.imageHover.clear();
    };
});

/**
 * Remove character art when dragging token (Hover hook doesn't trigger while token movement animation is on).
 */

Hooks.on("preUpdateToken", (...args) => {
    canvas.hud.imageHover.clear();       
});

/**
 * When user scrolls/moves the screen position, we want to relocate the image.
 */

Hooks.on("canvasPan", (...args) => {
    if (typeof canvas.hud.imageHover !== 'undefined' && (canvas.hud.imageHover.object !== null)) {
        canvas.hud.imageHover.updatePosition();
    };
});

/**
 * On Foundry world load, register module settings.
 */

Hooks.on("init", function() {
    registerSettings();
});