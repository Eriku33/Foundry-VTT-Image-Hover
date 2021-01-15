import { Settings } from './settings.js';

// Store a reference to requirement settings to see character art
let actorRequirementSetting = "None";
// Store a reference to whether artwork will be shown
let showPreviewSetting = true;
// Store a reference to where the character art will appear
let imagePositionSetting = "Bottom";
// Store a reference to the size of artwork shown
let imageSizeSetting = 7;

// Check if Tokenizer Module active for compatibility. (Undefined if module not installed)
let tokenizerActive = false;

//The supported file extensions for image-type files
const imageFileExtentions = ["jpg", "jpeg", "png", "svg", "webp"];

//The supported file extensions for video-type files
const VIDEO_FILE_EXTENSIONS = ["mp4", "ogg", "webm", "m4v"];

function registerModuleSettings() {
    actorRequirementSetting = game.settings.get('image-hover', 'permissionOnHover');
    showPreviewSetting = game.settings.get('image-hover', 'userEnableModule');
    imageSizeSetting = game.settings.get('image-hover', 'userImageSize');
    imagePositionSetting = game.settings.get('image-hover', 'userImagePosition');
    tokenizerActive = game.modules.get("vtta-tokenizer")?.active
};

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
            resizable: true,
	        template: "modules/image-hover/templates/image-hover-template.html" // HTML template
        });
    };

    /**
     * Get image data for html template
     */

    getData() {
        const data = super.getData();
        const tokenObject = this.object;
        let image = tokenObject.actor.img                   // Character art
	    if (image == 'icons/svg/mystery-man.svg') {         // If no character art exists, use token art instead.
		    image = tokenObject.data.img;
        }
        data.url = image
        let fileExt =image.substring(image.lastIndexOf('.') + 1);           // check file extention
        if (tokenizerActive && (fileExt.includes('?'))) {
            fileExt = fileExt.substring(0, fileExt.lastIndexOf('?'));       // remove '?432453' on the end of files from Tokenizer module
        }
        if (imageFileExtentions.includes(fileExt)) data.isImage = true      // if the file is not a image, we want to use the video html tag
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
     * Returns the dimensions of a image/video asynchrounsly.
     * @param {String} url Url of the image/video to get dimensions from.
     * @return {Promise} Promise which returns the dimensions of the image/video in 'width' and 'height' properties.
     */
    loadSourceDimensions(url) {
        return new Promise(resolve => {
            let fileExt = url.substring(url.lastIndexOf('.') + 1);              // file extention of image (.png, .webm, .webp, etc..)
            if (tokenizerActive && (fileExt.includes('?'))) {
                fileExt = fileExt.substring(0, fileExt.lastIndexOf('?'));       // remove '?432453' on the end of files from Tokenizer module
            }
            if (imageFileExtentions.includes(fileExt)) {
                const img = new Image();
                img.addEventListener('load', function () {                          // listen to load event for image
                    resolve({                   
                        width : this.width,                                // send back result
                        height : this.height
                    });
                });
                img.src = url;

            } else {
                const video = document.createElement('video');                    // create the video element
                video.addEventListener( "loadedmetadata", function () {         // place a listener on it
                    resolve({        
                        width : this.videoWidth,                                           // send back result
                        height : this.videoHeight
                    });
                });
                video.src = url;                                                // start download meta-data
            };
        });
    };

    /**
     * 
     * @param {Number} width width or original image (pixles)
     * @param {Number} height height of original image (pixels)
     * @param {Number} widthScale width of image related to screen size (pixels)
     * @param {Number} center Middle of the screen with scaling (pixels)
     * Rescale original image and move to correct location within the canvas
     */

    changePosition(width, height, widthScale, center) {
        const widthPixels = width/widthScale;
        const heightPixels = height/widthPixels;
        if (imagePositionSetting === 'Bottom'){                                     // move image to bottom of screen
            var yAxis = center.y - heightPixels + (window.innerHeight/(2*center.scale));
        }
        else {
            var yAxis = center.y - (window.innerHeight/(2*center.scale));
        };
        return yAxis;
    };

    /**
     * While hovering over a token and zooming or moving screen position, we want to reposition the image and scale it.
     */

    updatePosition() {
        let imageHover = canvas.hud.imageHover;
        let center = canvas.scene._viewPosition;                                  // Middle of the screen
        let widthScale = window.innerWidth/(imageSizeSetting*center.scale);       // Scaling to be configured
        let url = imageHover.object.actor.img;                                    // character art

        if (url == 'icons/svg/mystery-man.svg') {      // If no character art exists, use token art instead.
		    url = imageHover.object.data.img;
        };
        
        /**
         * Preload the image to find the width/height then rescale to find x,y positions
         */

        imageHover.loadSourceDimensions(url).then(({width, height}) => {
            const yAxis = imageHover.changePosition(width, height, widthScale, center);   // move image to correct verticle position.
            const xAxis = center.x - (window.innerWidth/(2*center.scale));                // move image to left of screen
            const position = {                                                  // CSS
                width: widthScale,
                left: xAxis,
                top: yAxis,
            };
            imageHover.element.css(position);                                   // Apply CSS to element
        })
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
    Settings.createSettings()
    registerModuleSettings()
});

Hooks.on("closeSettingsConfig", function() {
    registerModuleSettings()
});