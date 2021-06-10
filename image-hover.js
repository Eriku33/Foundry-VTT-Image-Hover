import { Settings } from './settings.js';

/**
 * Default settings
 */
let actorRequirementSetting = "None";                               // required actor premission to see character art
let imageHoverActive = true;                                        // Enable/Disable module
let keybindActive = false;                                          // Enable/Disable keybind requirement while hovering
let keybindKeySet = 'KeyV'                                          // configurable keybind
let imagePositionSetting = "Bottom left";                           // location of character art
let imageSizeSetting = 7;                                           // size of character art
let imageHoverArt = "character";                                    // Art type on hover (Character art or Token art)
let DEFAULT_TOKEN = "icons/svg/mystery-man.svg";                    // default token for foundry vtt

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
    keybindKeySet = game.settings.get( 'image-hover', 'userKeybindButton');
    imageSizeSetting = game.settings.get('image-hover', 'userImageSize');
    imagePositionSetting = game.settings.get('image-hover', 'userImagePosition');
    imageHoverArt = game.settings.get('image-hover', 'artType');
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
        const isWildcard = tokenObject.actor.data.token.randomImg;
	    if (image == DEFAULT_TOKEN || imageHoverArt === "token" || (imageHoverArt === "wildcard" && isWildcard)) {                       // If no character art exists, use token art instead.
		    image = tokenObject.data.img;
        }
        data.url = image
        const fileExt = this.fileExtention(image)
        if (videoFileExtentions.includes(fileExt)) data.isVideo = true      // if the file is not a image, we want to use the video html tag
        return data;
    };

    /**
     * Attempts to get the file extention of the string input
     * @param {String} file file path in folder
     */
    fileExtention(file) {
        let fileExt = "png";                                              // Assume art is a image by default
        const endOfFile = file.lastIndexOf('.') + 1;
        if (endOfFile !== undefined) fileExt = file.substring(endOfFile).toLowerCase();
    
        return fileExt
    }

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
        const imageWidthScaled = window.innerWidth/(imageSizeSetting*center.scale); // Scaled width of image to canvas
        let url = this.object.actor.img;                                            // character art
        const isWildcard = this.object.actor.data.token.randomImg;
        if (url == DEFAULT_TOKEN || imageHoverArt === "token" || (imageHoverArt === "wildcard" && isWildcard)) {                                                 // If no character art exists, use token art instead.
		    url = this.object.data.img;
        };

        if (url in cacheImageNames) {
            this.applyToCanvas(url, imageWidthScaled, center)
        } else {                                                                    // This only happens when you change a image on the canvas.
            this.cacheAvailableToken(url, imageWidthScaled,center)
        }
    };

    /**
     * Preload the url to find the width and height.
     * @param {String} url Url of the image/video to get dimensions from.
     * @return {Promise} Promise which returns the dimensions of the image/video in 'width' and 'height' properties.
     */
    loadSourceDimensions(url) {
        return new Promise(resolve => {

            const fileExt = this.fileExtention(url)

            if (videoFileExtentions.includes(fileExt)) {
                const video = document.createElement('video');                  // create the video element
                video.addEventListener( "loadedmetadata", function () {         // place a listener on it
                    resolve({        
                        width : this.videoWidth,                                // send back result
                        height : this.videoHeight
                    });
                });
                video.src = url;                                                // start download meta-data

            } else {
                const img = new Image();
                img.addEventListener('load', function () {                      // listen to load event for image
                    resolve({                   
                        width : this.width,                                     // send back result
                        height : this.height
                    });
                });
                img.src = url;
            };
        });
    };

    /** 
     * Add image to cache and show on canvas
     * @param {String} url Url of the image/video to get dimensions from.
     * @param {Number} imageWidthScaled width of image related to screen size (pixels)
     * @param {Number} center Middle of the screen with scaling (pixels)
     */
    cacheAvailableToken(url, imageWidthScaled, center) {
        canvas.hud.imageHover.loadSourceDimensions(url).then(({width, height}) => {
            cacheImageNames[url] = {
                'width': width,
                'height': height
            }
            if (imageWidthScaled && center) {
                this.applyToCanvas(url, imageWidthScaled, center)
            }
        })
    }

    /**
     * Rescale image to fit screen size, apply css
     * @param {String} url Url of the image/video to get dimensions from.
     * @param {Number} imageWidthScaled width of image related to screen size (pixels)
     * @param {Number} center Middle of the screen with scaling (pixels)
     */
    applyToCanvas(url, imageWidthScaled, center) {
        const imageWidth = cacheImageNames[url].width;                                //width of original image
        const imageHeight = cacheImageNames[url].height;                              //height of original image
        const [xAxis, yAxis] = this.changePosition(imageWidth, imageHeight, imageWidthScaled, center);   // move image to correct verticle position.
        const position = {                                                      // CSS
            width: imageWidthScaled,
            left: xAxis,
            top: yAxis,
        };
        this.element.css(position);                                             // Apply CSS to element
    }

    /**
     * Rescale original image and move to correct location within the canvas.
     * imagePositionSetting options include Bottom right/left and Top right/left
     * @param {Number} imageWidth width of original image (pixles)
     * @param {Number} imageHeight height of original image (pixels)
     * @param {Number} imageWidthScaled width of image related to screen size (pixels)
     * @param {Number} center Middle of the screen with scaling (pixels)
     */
    changePosition(imageWidth, imageHeight, imageWidthScaled, center) {
        const imageWidthRatio = imageWidth/imageWidthScaled;
        const imageHeightScaled = imageHeight/imageWidthRatio;
        const windowWidthScaled = window.innerWidth/(center.scale);
        const windowHeightScaled = window.innerHeight/(center.scale);
        let xAxis = 0;
        let yAxis = 0;

        if (imagePositionSetting.includes('Bottom')){                           // move image to bottom of canvas
            yAxis = center.y + windowHeightScaled/2  - imageHeightScaled;   
        }
        else {
            yAxis = center.y - windowHeightScaled/2;
        };

        if (imagePositionSetting.includes('right')){                            // move image to right of canvas
            const sidebar = document.getElementById('sidebar');
            const sidebarCollapsed = sidebar.classList.contains("collapsed");
            if (imagePositionSetting.includes('Bottom') && sidebarCollapsed) {
                xAxis = center.x + windowWidthScaled/2 - imageWidthScaled;      // take into account if sidebar is collapsed
            } else {
                const sidebarWidthScaled = sidebar.offsetWidth/center.scale;
                xAxis = center.x + windowWidthScaled/2 - imageWidthScaled - sidebarWidthScaled;
            }
        } else {
            xAxis = center.x - windowWidthScaled/2
        }
        return [xAxis, yAxis];
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
     * renderHeadsUpDisplay is called when changing scene, use this to cache token images on the scene.
     */
    canvas.hud.imageHover.cacheAvailableToken(DEFAULT_TOKEN, false, false)
    for (const token of canvas.tokens.placeables){
        if (!token || !token.actor) return;
        if (!(token.actor.img in cacheImageNames)) {
            canvas.hud.imageHover.cacheAvailableToken(token.actor.img, false, false)
        } else if (token.actor.img === DEFAULT_TOKEN) {
            canvas.hud.imageHover.cacheAvailableToken(token.data.img, false, false)
        }
    }
});

/**
 * Cache token image upon creating a actor.
 */
Hooks.on("createToken", (scene, data) => {
    const tokenId = game.actors.get(data.actorId);
    if (!tokenId) return;

    let imageToCache = tokenId.img;
    if (imageToCache === DEFAULT_TOKEN) {
        imageToCache = data.img;
    };
    if (imageToCache && !(imageToCache in cacheImageNames)) {
        canvas.hud.imageHover.cacheAvailableToken(imageToCache, false, false)
    }
});

/**
 * Display image when user hovers mouse over a actor
 * Must be used on the token layer and have relevant actor permissions (configurable settings by the game master)
 * @param {*} token passed in token
 * @param {Boolean} hovered if token is mouseovered
 */
Hooks.on('hoverToken', (token, hovered) => {
    if (!hovered || (event && event.altKey)) {	// alt key in Foundry auto hovers all tokens in Foundry
        canvas.hud.imageHover.clear();
        return;
    }
    
    if (keybindActive === false) {
        canvas.hud.imageHover.showArtworkRequirements(token, hovered)
    }
});

/**
 * Remove character art when deleting/dragging token (Hover hook doesn't trigger while token movement animation is on).
 */
Hooks.on("preUpdateToken", (...args) => canvas.hud.imageHover.clear());
Hooks.on("deleteToken", (...args) => canvas.hud.imageHover.clear());

/**
 * Occasions to remove character art from screen due to weird hover hook interaction.
 */
Hooks.on("closeActorSheet", (...args) => canvas.hud.imageHover.clear());
Hooks.on("closeSettingsConfig", (...args) => canvas.hud.imageHover.clear());
Hooks.on("closeApplication", (...args) => canvas.hud.imageHover.clear());

/**
 * When user scrolls/moves the screen position, we want to relocate the image.
 */
Hooks.on("canvasPan", (...args) => {
    if (typeof canvas.hud.imageHover !== 'undefined') {
        if (typeof canvas.hud.imageHover.object === 'undefined' || canvas.hud.imageHover.object === null ) {
            return;
        }
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
	if (keybindActive && KeybindLib.isBoundTo(event, 'image-hover', 'userKeybindButton')) {
        const hoveredToken = canvas.tokens._hover
        if (hoveredToken !== null) {
            canvas.hud.imageHover.showArtworkRequirements(hoveredToken, true);
        }
    }
});