import { Settings } from './settings.js';

/**
 * Default settings
 */
let actorRequirementSetting = "None";                               // required actor premission to see character art
let imageHoverActive = true;                                        // Enable/Disable module
let keybindActive = false;                                          // Enable/Disable keybind requirement while hovering
let keybindKeySet = 'v'                                             // configurable keybind
let imagePositionSetting = "Bottom";                                // location of character art
let imageSizeSetting = 7;                                           // size of character art

/**
 * Tokenizer module compatibility
 */
let tokenizerActive = false;                                        //  Check if Tokenizer Module active for compatibility. (Undefined if module not installed)

/**
 * Supported Foundry VTT file types
 */
const imageFileExtentions = ["jpg", "jpeg", "png", "svg", "webp"];  // image file extentions
const videoFileExtentions = ["mp4", "ogg", "webm", "m4v"];          // video file extentions

let cacheImageNames = new Object();                                 // url file names cache

/**
 * Assign module settings
 */
function registerModuleSettings() {
    actorRequirementSetting = game.settings.get('image-hover', 'permissionOnHover');
    imageHoverActive = game.settings.get('image-hover', 'userEnableModule');
    keybindActive = game.settings.get('image-hover', 'userEnableKeybind');
    keybindKeySet = assignKeybind(game.settings.get('image-hover', 'userKeybindButton'));
    imageSizeSetting = game.settings.get('image-hover', 'userImageSize');
    imagePositionSetting = game.settings.get('image-hover', 'userImagePosition');
    tokenizerActive = game.modules.get("vtta-tokenizer")?.active                // Undefined if module not installed)
};

/**
 * @param {String} key Keybind set by user
 */
function assignKeybind(key) {
    /**
     * keybinds ending with space are trimmed by 0.7.x settings window
     */
    if (key.endsWith("+")) {
        key = key + "  ";
      }
    return window.Azzu.SettingsTypes.KeyBinding.parse(key)
}

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
	    if (image == DEFAULT_TOKEN) {                       // If no character art exists, use token art instead.
		    image = tokenObject.data.img;
        }
        data.url = image
        let fileExt =image.substring(image.lastIndexOf('.') + 1).toLowerCase();           // check file extention

        /**
         * Tokenizer module compatibility
         */
        if (tokenizerActive && (fileExt.includes('?'))) {
            fileExt = fileExt.substring(0, fileExt.lastIndexOf('?'));       // remove '?432453' on the end of files from Tokenizer module
        }

        if (videoFileExtentions.includes(fileExt)) data.isVideo = true      // if the file is not a image, we want to use the video html tag
        return data;
    };

    /**
     * Set handout position, this uses the client screen position and zoom level to scale the image.
     */
    setPosition() {
        if (!this.object) return;
        this.updatePosition();
    };

    /**
     * While hovering over a token and zooming or moving screen position, we want to reposition the image and scale it.
     */
    updatePosition() {
        const center = canvas.scene._viewPosition;                                  // Middle of the screen
        const widthScale = window.innerWidth/(imageSizeSetting*center.scale);       // Scaling to be configured
        let url = this.object.actor.img;                                            // character art

        if (url == DEFAULT_TOKEN) {                                                 // If no character art exists, use token art instead.
		    url = this.object.data.img;
        };

        if (cacheImageNames[url] === undefined) { // This only happens when you change a image on the canvas or drag a token onto canvas.
            this.cacheAvailableToken(url,widthScale,center)
        } else {
            this.applyToCanvas(url, widthScale, center)
        }
    };

    /**
     * Preload the url to find the width/height.
     * @param {String} url Url of the image/video to get dimensions from.
     * @return {Promise} Promise which returns the dimensions of the image/video in 'width' and 'height' properties.
     */
    async loadSourceDimensions(url) {
        return new Promise(resolve => {
            let fileExt = url.substring(url.lastIndexOf('.') + 1).toLowerCase();// file extention of image (.png, .webm, .webp, etc..)
            if (tokenizerActive && (fileExt.includes('?'))) {
                fileExt = fileExt.substring(0, fileExt.lastIndexOf('?'));       // remove '?432453' on the end of files from Tokenizer module
            }
            if (imageFileExtentions.includes(fileExt)) {
                const img = new Image();
                img.addEventListener('load', function () {                      // listen to load event for image
                    resolve({                   
                        width : this.width,                                     // send back result
                        height : this.height
                    });
                });
                img.src = url;

            } else {
                const video = document.createElement('video');                  // create the video element
                video.addEventListener( "loadedmetadata", function () {         // place a listener on it
                    resolve({        
                        width : this.videoWidth,                                // send back result
                        height : this.videoHeight
                    });
                });
                video.src = url;                                                // start download meta-data
            };
        });
    };

    /** 
     * Add image to cache and show on canvas
     * @param {String} url Url of the image/video to get dimensions from.
     * @param {Number} widthScale width of image related to screen size (pixels)
     * @param {Number} center Middle of the screen with scaling (pixels)
     */
    cacheAvailableToken(url, widthScale, center) {
        canvas.hud.imageHover.loadSourceDimensions(url).then(({width, height}) => {
            cacheImageNames[url] = {
                'width': width,
                'height': height
            }
            if (widthScale && center) {
                this.applyToCanvas(url, widthScale, center)
            }
        })
    }


    /**
     * Rescale image to fit screen size, apply css
     * @param {String} url Url of the image/video to get dimensions from.
     * @param {Number} widthScale width of image related to screen size (pixels)
     * @param {Number} center Middle of the screen with scaling (pixels)
     */
    applyToCanvas(url, widthScale, center) {
        const width = cacheImageNames[url].width                                //width of original image
        const height = cacheImageNames[url].height                              //height of original image
        const yAxis = this.changePosition(width, height, widthScale, center);   // move image to correct verticle position.
        const xAxis = center.x - (window.innerWidth/(2*center.scale));          // move image to left of screen
        const position = {                                                      // CSS
            width: widthScale,
            left: xAxis,
            top: yAxis,
        };
        this.element.css(position);                                             // Apply CSS to element
    }

    /**
     * Rescale original image and move to correct location within the canvas
     * @param {Number} width width or original image (pixles)
     * @param {Number} height height of original image (pixels)
     * @param {Number} widthScale width of image related to screen size (pixels)
     * @param {Number} center Middle of the screen with scaling (pixels)
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
     * check requirements then show character art
     * @param {*} token token passed in
     * @param {Boolean} hovered if token is mouseovered
     */
    showArtworkRequirements(token, hovered) {
        /**
         * check token is actor, module is enabled, user has permissions to see character art
         */
        if (!token || !token.actor || (imageHoverActive === false) || (token.actor.permission < actorRequirementSetting && token.actor.data.permission['default'] !== -1)) {
            return;
        }
        
        if (hovered && canvas.activeLayer.name == 'TokenLayer') {       // Show token image if hovered, otherwise don't
            this.bind(token);
        } else {
            this.clear();
        };
    }
};

/**
 * Add Image Hover display to html on load.
 * Note: Fix hack - reconfigure and create a new sibling to the current hud element. 
 */
Hooks.on("renderHeadsUpDisplay", (app, html, data) => {

    html[0].style.zIndex = 70;                                      // Sets image to show above other UI. This is definately a hack!
    html.append(`<template id="image-hover-hud"></template>`);
    canvas.hud.imageHover = new ImageHoverHUD();

    /**
     * renderHeadsUpDisplay is called when changing scene, use this to cache tokens on screen.
     */
    for (const token of canvas.tokens.placeables){
        canvas.hud.imageHover.cacheAvailableToken(token.actor.img, false, false)
        canvas.hud.imageHover.cacheAvailableToken(token.data.img, false, false)
    }
});

/**
 * Display image when user hovers mouse over a actor
 * Must be used on the token layer and have relevant actor permissions (configurable settings by the game master)
 * @param {*} token passed in token
 * @param {Boolean} hovered if token is mouseovered
 */
Hooks.on('hoverToken', (token, hovered) => {
    if (keybindActive === false) {
        canvas.hud.imageHover.showArtworkRequirements(token, hovered)
    }
    if (!hovered) {
        canvas.hud.imageHover.clear();
    }
});


/**
 * Remove character art when dragging token (Hover hook doesn't trigger while token movement animation is on).
 */
Hooks.on("preUpdateToken", (...args) => {
    canvas.hud.imageHover.clear();       
});

/**
 * Remove character art when deleting a token.
 */
Hooks.on("deleteToken", (...args) => {
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

/**
 * add event listener when keybind setting is activated
 */
document.addEventListener('keydown', event => {
	if (keybindActive && window.Azzu.SettingsTypes.KeyBinding.eventIsForBinding(event, keybindKeySet)) {
        const hoveredToken = canvas.tokens._hover
        if (hoveredToken !== null) {
            canvas.hud.imageHover.showArtworkRequirements(hoveredToken, true);
        }
    }
});