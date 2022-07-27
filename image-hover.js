import { Settings } from './settings.js';

/**
 * Default settings
 */
let actorRequirementSetting = "None";                               // required actor premission to see character art
let imageHoverActive = true;                                        // Enable/Disable module
let imagePositionSetting = "Bottom left";                           // location of character art
let imageSizeSetting = 7;                                           // size of character art
let imageHoverArt = "character";                                    // Art type on hover (Character art or Token art)
let imageHoverDelay = 0;                                            // Hover time requirement (miliseconds)
let DEFAULT_TOKEN = "icons/svg/mystery-man.svg";                    // default token for foundry vtt
let showSpecificArt = false;                                        // track when to show/hide art when GM uses keybind to show art.
let showArtTimer = 6000;                                            // Time (miliseconds) spent showing art when GM decides to "showSpecificArt" to everyone.

let chatPortraitActive = false                                      // chat portrait incompatability check


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
    imageSizeSetting = game.settings.get('image-hover', 'userImageSize');
    imagePositionSetting = game.settings.get('image-hover', 'userImagePosition');
    imageHoverArt = game.settings.get('image-hover', 'artType');
    imageHoverDelay = game.settings.get('image-hover', 'userHoverDelay')
    showArtTimer =game.settings.get("image-hover", 'showArtTimer')
    chatPortraitActive = game.modules.get("chat-portrait")?.active      // Undefined if module not installed)

};

function registerShowArtSocket() {
    game.socket.on("module.image-hover", (tokenID) => {
        const token = canvas.tokens.get(tokenID);
        canvas.hud.imageHover.showToAll(token);
    });
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
            classes: [...super.defaultOptions.classes, 'image-hover-hud'],
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
        let image = tokenObject.actor.img                                   // Character art
        const isWildcard = tokenObject.actor.data.token.randomImg;
        const isLinkedActor = tokenObject.data.actorLink;
        /**
         * Don't use character art if it doesn't exist or settings are applied.
         */
	    if (image == DEFAULT_TOKEN || imageHoverArt === "token" || (imageHoverArt === "wildcard" && isWildcard) || (imageHoverArt == "linked" && !isLinkedActor)) {
		    image = tokenObject.data.img;                                   // Token art
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
        let url = this.object.actor.img;                                            // Character art
        const isWildcard = this.object.actor.data.token.randomImg;
        const isLinkedActor = this.object.data.actorLink;
        if (url == DEFAULT_TOKEN || imageHoverArt === "token" || (imageHoverArt === "wildcard" && isWildcard) || (imageHoverArt == "linked" && !isLinkedActor)) {                                                 // If no character art exists, use token art instead.
		    url = this.object.data.img;                                             // Token art
        };

        if (url in cacheImageNames) {
            this.applyToCanvas(url)
        } else {                                                                    // This only happens when you change a image on the canvas.
            this.cacheAvailableToken(url, true)
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
     * @param {Boolean} applyToScreen Apply image to screen or just cache image.
     */
    cacheAvailableToken(url, applyToScreen) {
        canvas.hud.imageHover.loadSourceDimensions(url).then(({width, height}) => {
            cacheImageNames[url] = {
                'width': width,
                'height': height
            }
            if (applyToScreen) {
                this.applyToCanvas(url)
            }
        })
    }

    /**
     * Rescale image to fit screen size, apply css
     * @param {String} url Url of the image/video to get dimensions from.
     */
    applyToCanvas(url) {
        const imageWidth = cacheImageNames[url].width;                                //width of original image
        const imageHeight = cacheImageNames[url].height;                              //height of original image
        const [xAxis, yAxis, imageWidthScaled] = this.changePosition(imageWidth, imageHeight);   // move image to correct verticle position.
        const position = {                                                      // CSS
            width: imageWidthScaled,
            left: xAxis,
            top: yAxis,
        };
        this.element.css(position);                                             // Apply CSS to element
    }

    /**
     * Rescale original image and move to correct location within the canvas.
     * imagePositionSetting options include Bottom right/left, Top right/left and Centre
     * @param {Number} imageWidth width of original image (pixels)
     * @param {Number} imageHeight height of original image (pixels)
     */
    changePosition(imageWidth, imageHeight) {
        const centre = canvas.scene._viewPosition;                                  // Middle of the screen
        let imageWidthScaled = window.innerWidth/(imageSizeSetting*centre.scale);   // Scaled width of image to canvas
        let imageHeightScaled = imageWidthScaled * (imageHeight/imageWidth);        // Scaled height from width
        const windowWidthScaled = window.innerWidth/(centre.scale);
        const windowHeightScaled = window.innerHeight/(centre.scale);
        let xAxis = 0;
        let yAxis = 0;

        if (imageHeightScaled > windowHeightScaled){                            // Height of image bigger than window height
            imageWidthScaled = (windowHeightScaled/imageHeightScaled) * imageWidthScaled;
            imageHeightScaled = windowHeightScaled;
        };

        if (imagePositionSetting.includes('Bottom')){                           // move image to bottom of canvas
            yAxis = centre.y + windowHeightScaled/2  - imageHeightScaled;   
        }
        else {
            yAxis = centre.y - windowHeightScaled/2;
        };

        const sidebar = document.getElementById('sidebar');
        const sidebarCollapsed = sidebar.classList.contains("collapsed");       // take into account if sidebar is collapsed

        if(imagePositionSetting == "Centre"){
            if (sidebarCollapsed){
                return [centre.x-imageWidthScaled/2, centre.y-imageHeightScaled/2, imageWidthScaled]
            } else {
                return [centre.x-imageWidthScaled/2 - (sidebar.offsetWidth/centre.scale)/3, centre.y-imageHeightScaled/2, imageWidthScaled]
            }
        }


        if (imagePositionSetting.includes('right')){                            // move image to right of canvas
            if (imagePositionSetting.includes('Bottom') && sidebarCollapsed) {
                xAxis = centre.x + windowWidthScaled/2 - imageWidthScaled;
            } else {
                const sidebarWidthScaled = sidebar.offsetWidth/centre.scale + parseFloat(window.getComputedStyle(sidebar, null).getPropertyValue('margin-right'))/centre.scale;
                xAxis = centre.x + windowWidthScaled/2 - imageWidthScaled - sidebarWidthScaled;
            }
        } else {
            xAxis = centre.x - windowWidthScaled/2
        }
        return [xAxis, yAxis, imageWidthScaled];
    };

    /**
     * check requirements then show character art
     * @param {*} token token passed in
     * @param {Boolean} hovered if token is mouseovered
     * @param {Number} delay hover time requirement (miliseconds) to show art.
     */
    showArtworkRequirements(token, hovered, delay) {

        /**
         * check token is actor, module is enabled, user has permissions to see character art
         */
        if (!token || !token.actor || (imageHoverActive === false) || (token.actor.permission < actorRequirementSetting && token.actor.data.permission['default'] !== -1)) {
            return;
        }

        /**
         * check flag to hide art for everyone
         */
        if (token.document.getFlag('image-hover', 'hideArt')){
            return;
        }

        /**
         * Do not show art for chat portrait module (hover hook doesn't trigger out properly).
         */
        if (chatPortraitActive && !game.keybindings.bindings.get("image-hover.userKeybindButton")[0]?.key && !game.keybindings.bindings.get("image-hover.showAllKey")[0]?.key){
            if (event){

                var x = event.clientX
                var y = event.clientY
                var elementMouseIsOver = document.elementFromPoint(x, y);                       // element where mouse is
                if (elementMouseIsOver.classList.contains("message-portrait") ||elementMouseIsOver.classList.contains("chat-message") ){
                    return;
                }
            }
        } 

        /**
         * Do not show new art or hide current art if Gm has triggerd the "showToAll" option for n seconds.
         */
        if (showSpecificArt) {
            return;
        }

        if (hovered && (canvas.activeLayer.name == 'TokenLayer' || canvas.activeLayer.name == 'TokenLayerPF2e')) {       // Show token image if hovered, otherwise don't
            setTimeout(function() {
                if (token == canvas.tokens._hover && token.actor.img == canvas.tokens._hover.actor.img) {
                    canvas.hud.imageHover.bind(token);
                } else {
                    canvas.hud.imageHover.clear()
                }
            }, delay);
        } else {
            this.clear();
        };
    }

    /**
     * Triggers the art token to be shown for (set in game settings by GM) seconds.
     * Only used when GM uses the "show to all" (set in keybind settings).
     * token is shown to everyone (bypasses all settings apart from if "user disable image hover" setting)
     * GM and users must be on same scene.
     * @param {*} token token passed in
     */
    showToAll(token) {
        if (token && imageHoverActive) {
            showSpecificArt = true;
            canvas.hud.imageHover.bind(token);
            setTimeout(function() {
                showSpecificArt = false;
                canvas.hud.imageHover.clear();
            }, showArtTimer);
        }
    }
};

/**
 * Add Image Hover display to html on load.
 */
Hooks.on("renderHeadsUpDisplay", (app, html, data) => {

    html[0].style.zIndex = 70;
    html.append(`<template id="image-hover-hud"></template>`);
    canvas.hud.imageHover = new ImageHoverHUD();

    /**
     * renderHeadsUpDisplay is called when changing scene, use this to cache token images on the scene.
     */
    canvas.hud.imageHover.cacheAvailableToken(DEFAULT_TOKEN, false)
    for (const token of canvas.tokens.placeables){
        if (!token || !token.actor) return;
        if (!(token.actor.img in cacheImageNames)) {
            canvas.hud.imageHover.cacheAvailableToken(token.actor.img, false)
        } else if (token.actor.img === DEFAULT_TOKEN) {
            canvas.hud.imageHover.cacheAvailableToken(token.data.img, false)
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
        canvas.hud.imageHover.cacheAvailableToken(imageToCache, false)
    }
});

/**
 * Display image when user hovers mouse over a actor
 * Must be used on the token layer and have relevant actor permissions (configurable settings by the game master)
 * @param {*} token passed in token
 * @param {Boolean} hovered if token is mouseovered
 */
Hooks.on('hoverToken', (token, hovered) => {

    if (showSpecificArt) {
        return;
    }
    if (!hovered || (game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.ALT))) {	// alt key in Foundry auto hovers all tokens in Foundry
        canvas.hud.imageHover.clear();
        return;
    }
    
    /**
     * Check no keybind requirement set.
     */
    if (!game.keybindings.bindings.get("image-hover.userKeybindButton")[0]?.key) {
        canvas.hud.imageHover.showArtworkRequirements(token, hovered, imageHoverDelay)
    }
});

/**
 * Add checkbox option in token configuration to hide image art to all.
 * Only Game masters can change this setting.
 */
const renderHoverSetting = async (app, html, data) => {
    /**
     * Create image hover flag and apply to checkbox in the new created token configuration.
     * Update flag as token is updated.
     */
    if (data.isGM) {
        let hideImageStatus = app.token.getFlag('image-hover', 'hideArt') ? "checked": "";
        const nav = html.find(`div[data-tab="appearance"]`);
        data.hideHoverStatus = hideImageStatus;
        const contents = await renderTemplate('modules/image-hover/templates/image-hover-token-config.html', data); 
        nav.append(contents);
        app.setPosition({ height: 'auto' });
    };

};
Hooks.on("renderTokenConfig", renderHoverSetting);

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
    Settings.createSettings();
    registerModuleSettings();
    registerShowArtSocket();
});

Hooks.on("closeSettingsConfig", function() {
    registerModuleSettings();
});
