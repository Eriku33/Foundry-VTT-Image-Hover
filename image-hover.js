import { Settings, sanitizeGraphicPath } from "./settings.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Cached client settings. World-scoped GM settings are read fresh at point of
 * use (see resolveArtUrl / showArtworkRequirements / showToAll) so changes
 * propagate to every connected client immediately.
 */
let imageHoverActive = true; // Enable/Disable module
let imagePositionSetting = "Bottom left"; // location of character art
let imageSizeSetting = 7; // size of character art
let imageHoverDelay = 0; // Hover time requirement (milliseconds)
let showSpecificArt = false; // track when to show/hide art when GM uses keybind to show art.
let chatPortraitActive = false; // chat portrait incompatibility check

const DEFAULT_TOKEN = "icons/svg/mystery-man.svg"; // default token for foundry vtt

/**
 * Supported Foundry VTT video file types
 */
const videoFileExtensions = ["mp4", "ogg", "webm", "m4v"];

let cacheImageNames = {}; // url -> {width,height} cache, or null for failed loads
let timer; // Timer for the GM "show to all" auto-hide
let hoverTimer; // Timer for the per-hover delayed show
let lastPointerEvent = null; // most recent pointer event (cursor pos / buttons)
let taggerErrorLogged = false; // ensures the Tagger failure warning logs only once

/**
 * Assign module settings
 */
function registerModuleSettings() {
  imageHoverActive = game.settings.get("image-hover", "userEnableModule");
  imageSizeSetting = game.settings.get("image-hover", "userImageSize");
  imagePositionSetting = game.settings.get("image-hover", "userImagePosition");
  imageHoverDelay = game.settings.get("image-hover", "userHoverDelay");
  chatPortraitActive = game.modules.get("chat-portrait")?.active; // Undefined if module not installed
}

/**
 * Read the live canvas pan/zoom in a way that survives v14.
 * v14 deprecates `canvas.scene._viewPosition`; the PIXI stage transform is the
 * supported live source on both v13 and v14.
 */
function getCanvasView() {
  const stage = canvas?.stage;
  if (stage?.pivot && stage?.scale) {
    return { x: stage.pivot.x, y: stage.pivot.y, scale: stage.scale.x };
  }
  return canvas?.scene?._viewPosition ?? { x: 0, y: 0, scale: 1 };
}

/**
 * Parse the comma-separated excludeTags setting fresh each time so that GM
 * changes propagate to every connected client without requiring them to
 * reopen their own settings dialog.
 */
function getExcludedTags() {
  const raw = game.settings.get("image-hover", "excludeTags") ?? "";
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Check whether a placeable (token or tile) carries any of the configured exclusion tags.
 * Returns false when Tagger is not installed or no tags are configured.
 */
function hasExcludedTag(placeable) {
  if (!placeable || !game.modules.get("tagger")?.active) return false;
  const tags = getExcludedTags();
  if (tags.length === 0) return false;
  const Tagger = globalThis.Tagger;
  if (!Tagger?.hasTags) return false;
  try {
    return Tagger.hasTags(placeable, tags, { matchAny: true });
  } catch (e) {
    if (!taggerErrorLogged) {
      taggerErrorLogged = true;
      console.warn(
        "Image Hover: Tagger.hasTags threw — tag exclusion skipped for this object.",
        e
      );
    }
    return false;
  }
}

/**
 * Resolve which art URL to show for a token. Honors the per-token specific-art
 * flag, then the configured art-type (read fresh so GM changes reach every
 * client). Falls back to the token texture when no dedicated art applies.
 * @param {Token} token canvas token placeable
 * @return {String} image/video url
 */
function resolveArtUrl(token) {
  const doc = token.document;
  const specificArt = doc.getFlag("image-hover", "specificArt");
  if (specificArt && specificArt != "path/image.png") return specificArt;

  const artType = game.settings.get("image-hover", "artType");
  const actorImg = token.actor.img;
  const isWildcard = token.actor.prototypeToken.randomImg;
  const isLinkedActor = doc.actorLink;
  if (
    actorImg == DEFAULT_TOKEN ||
    artType === "token" ||
    (artType === "wildcard" && isWildcard) ||
    (artType == "linked" && !isLinkedActor)
  ) {
    return doc.texture.src; // Token art
  }
  return actorImg; // Character art
}

/**
 * Resolve a graphic position/size setting to pixels. Accepts a "%" suffix or a
 * bare number (percentage of `basis`), or a "px" suffix (absolute pixels).
 * @param {String|Number} raw stored setting value
 * @param {Number} basis popup dimension a percentage is relative to
 * @returns {Number} value in pixels
 */
function resolveGraphicMetric(raw, basis) {
  const s = String(raw ?? "").trim();
  if (s === "") return 0;
  const num = parseFloat(s);
  if (!Number.isFinite(num)) return 0;
  if (s.toLowerCase().endsWith("px")) return num; // absolute pixels
  return (num / 100) * basis; // "%" suffix or bare number
}

/**
 * Add socket to trigger all users to show art.
 */
function registerShowArtSocket() {
  game.socket.on("module.image-hover", (tokenID) => {
    const token = canvas.tokens.get(tokenID);
    canvas.hud.imageHover.showToAll(token);
  });
}

/**
 * Track the most recent pointer event so hover logic can read cursor position
 * and button state without relying on the non-standard global `event`.
 */
for (const type of ["pointermove", "pointerdown", "pointerup"]) {
  window.addEventListener(
    type,
    (e) => {
      lastPointerEvent = e;
    },
    { capture: true, passive: true }
  );
}

/**
 * Copy Placeable HUD template
 */
class ImageHoverHUD extends HandlebarsApplicationMixin(
  foundry.applications.hud.BasePlaceableHUD
) {
  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: ["image-hover-hud"],
    window: {
      resizable: true,
    },
  };

  static PARTS = {
    body: {
      template: "modules/image-hover/templates/image-hover-template.html",
    },
  };

  /**
   * Get image data for html template
   */
  async _prepareContext() {
    const data = await super._prepareContext();
    const image = resolveArtUrl(this.object);
    data.url = image;
    const fileExt = this.fileExtension(image);
    if (videoFileExtensions.includes(fileExt)) data.isVideo = true; // use the video html tag for non-image files

    /**
     * Optional decorative graphic layered on the popup. Sanitized again here as
     * defense-in-depth in case the stored value bypassed the settings onChange.
     * The size/position are applied in pixels by applyGraphicLayout so they
     * stay relative to the popup; only the path and z-index are needed here.
     */
    const graphic = sanitizeGraphicPath(
      game.settings.get("image-hover", "overlayGraphic")
    );
    if (graphic) {
      data.overlayGraphic = graphic;
      data.overlayGraphicZ = game.settings.get(
        "image-hover",
        "overlayGraphicZ"
      );
      // Token-art scale (as a fraction) so the art can be shrunk to sit inside
      // a popup graphic frame. Only applied while a graphic is present.
      const tokenScale = Number(
        game.settings.get("image-hover", "tokenImageScale")
      );
      data.tokenImageScale = Number.isFinite(tokenScale)
        ? tokenScale / 100
        : 1;
    }
    return data;
  }

  /**
   * Attempts to get the file extension of the string input.
   * Returns "png" when the path has no extension.
   * @param {String} file file path in folder
   */
  fileExtension(file) {
    const endOfFile = file.lastIndexOf(".") + 1;
    if (endOfFile > 0) return file.substring(endOfFile).toLowerCase();
    return "png"; // Assume art is an image by default
  }

  /**
   * After render, drop the overlay graphic if its file fails to load so a
   * broken-image icon is never shown on the popup.
   */
  _onRender(context, options) {
    super._onRender(context, options);
    const graphic = this.element?.querySelector(
      "img.image-hover-overlay-graphic"
    );
    if (!graphic) return;
    if (graphic.complete && graphic.naturalWidth === 0) {
      graphic.remove();
      return;
    }
    graphic.addEventListener("error", () => graphic.remove(), { once: true });
  }

  /**
   * Set handout position, this uses the client screen position and zoom level to scale the image.
   */
  setPosition() {
    if (!this.object) return;
    this.updatePosition();
  }

  /**
   * While hovering over a token and zooming or moving screen position, we want to reposition the image and scale it.
   */
  updatePosition() {
    if (!this.rendered || !this.element || !this.object?.actor) return;
    const url = resolveArtUrl(this.object);

    // No real art to show — only the default token texture.
    if (url == DEFAULT_TOKEN) {
      this.close();
      return;
    }
    if (url in cacheImageNames) {
      this.applyToCanvas(url);
    } else {
      // This only happens when you change a image on the canvas.
      this.cacheAvailableToken(url, true);
    }
  }

  /**
   * Preload the url to find the width and height.
   * @param {String} url Url of the image/video to get dimensions from.
   * @return {Promise} Promise which returns the dimensions of the image/video in 'width' and 'height' properties.
   */
  loadSourceDimensions(url) {
    return new Promise((resolve, reject) => {
      const fileExt = this.fileExtension(url);

      if (videoFileExtensions.includes(fileExt)) {
        const video = document.createElement("video"); // create the video element
        video.addEventListener("loadedmetadata", function () {
          // place a listener on it
          resolve({
            width: this.videoWidth, // send back result
            height: this.videoHeight,
          });
        });
        video.addEventListener("error", () =>
          reject(new Error(`Image Hover: failed to load video "${url}"`))
        );
        video.src = url; // start download meta-data
      } else {
        const img = new Image();
        img.addEventListener("load", function () {
          // listen to load event for image
          resolve({
            width: this.width, // send back result
            height: this.height,
          });
        });
        img.addEventListener("error", () =>
          reject(new Error(`Image Hover: failed to load image "${url}"`))
        );
        img.src = url;
      }
    });
  }

  /**
   * Add image to cache and show on canvas
   * @param {String} url Url of the image/video to get dimensions from.
   * @param {Boolean} applyToScreen Apply image to screen or just cache image.
   */
  cacheAvailableToken(url, applyToScreen) {
    this.loadSourceDimensions(url)
      .then(({ width, height }) => {
        cacheImageNames[url] = { width, height };
        if (applyToScreen) {
          this.applyToCanvas(url);
        }
      })
      .catch((err) => {
        // Cache the failure so a broken url is not retried on every hover.
        cacheImageNames[url] = null;
        console.warn(err.message);
      });
  }

  /**
   * Rescale image to fit screen size, apply css
   * @param {String} url Url of the image/video to get dimensions from.
   */
  applyToCanvas(url) {
    const dimensions = cacheImageNames[url];
    // Bail if the load failed (null) or the HUD has since been closed.
    if (!dimensions || !this.element) return;
    const [xAxis, yAxis, imageWidthScaled] = this.changePosition(
      dimensions.width,
      dimensions.height
    ); // move image to correct verticle position.

    // Apply CSS to element
    this.element.style.width = `${imageWidthScaled}px`;
    this.element.style.left = `${xAxis}px`;
    this.element.style.top = `${yAxis}px`;

    // Size the overlay graphic from the popup dimensions so percentage values
    // keep the same relative size at any zoom level / image-width setting.
    const popupHeight =
      imageWidthScaled * (dimensions.height / dimensions.width);
    this.applyGraphicLayout(imageWidthScaled, popupHeight);
  }

  /**
   * Size and position the optional overlay graphic in pixels, derived from the
   * popup dimensions. Percentage settings stay relative to the popup; "px"
   * settings are absolute. Height is left to the graphic's own aspect ratio.
   * @param {Number} popupWidth rendered popup width in pixels
   * @param {Number} popupHeight rendered popup height in pixels
   */
  applyGraphicLayout(popupWidth, popupHeight) {
    const graphic = this.element?.querySelector(
      "img.image-hover-overlay-graphic"
    );
    if (!graphic) return;
    const width = resolveGraphicMetric(
      game.settings.get("image-hover", "overlayGraphicScale"),
      popupWidth
    );
    const left = resolveGraphicMetric(
      game.settings.get("image-hover", "overlayGraphicX"),
      popupWidth
    );
    const top = resolveGraphicMetric(
      game.settings.get("image-hover", "overlayGraphicY"),
      popupHeight
    );
    graphic.style.width = `${width}px`;
    graphic.style.left = `${left}px`;
    graphic.style.top = `${top}px`;
    graphic.style.visibility = "visible";
  }

  /**
   * Rescale original image and move to correct location within the canvas.
   * imagePositionSetting options include Bottom right/left, Top right/left and Centre
   * @param {Number} imageWidth width of original image (pixels)
   * @param {Number} imageHeight height of original image (pixels)
   */
  changePosition(imageWidth, imageHeight) {
    const centre = getCanvasView(); // Middle of the screen (v13/v14 safe)
    let imageWidthScaled =
      window.innerWidth / (imageSizeSetting * centre.scale); // Scaled width of image to canvas
    let imageHeightScaled = imageWidthScaled * (imageHeight / imageWidth); // Scaled height from width
    const windowWidthScaled = window.innerWidth / centre.scale;
    const windowHeightScaled = window.innerHeight / centre.scale;
    let xAxis = 0;
    let yAxis = 0;

    if (imageHeightScaled > windowHeightScaled) {
      // Height of image bigger than window height
      imageWidthScaled =
        (windowHeightScaled / imageHeightScaled) * imageWidthScaled;
      imageHeightScaled = windowHeightScaled;
    }

    if (imagePositionSetting.includes("Bottom")) {
      // move image to bottom of canvas
      yAxis = centre.y + windowHeightScaled / 2 - imageHeightScaled;
    } else {
      yAxis = centre.y - windowHeightScaled / 2;
    }

    const sidebar = document.getElementById("sidebar");
    const sidebarCollapsed = sidebar.classList.contains("collapsed"); // take into account if sidebar is collapsed

    if (imagePositionSetting == "Centre") {
      if (sidebarCollapsed) {
        return [
          centre.x - imageWidthScaled / 2,
          centre.y - imageHeightScaled / 2,
          imageWidthScaled,
        ];
      } else {
        return [
          centre.x -
            imageWidthScaled / 2 -
            sidebar.offsetWidth / centre.scale / 3,
          centre.y - imageHeightScaled / 2,
          imageWidthScaled,
        ];
      }
    }

    if (imagePositionSetting.includes("right")) {
      // move image to right of canvas
      if (imagePositionSetting.includes("Bottom") && sidebarCollapsed) {
        xAxis = centre.x + windowWidthScaled / 2 - imageWidthScaled;
      } else {
        const sidebarWidthScaled =
          sidebar.offsetWidth / centre.scale +
          parseFloat(
            window
              .getComputedStyle(sidebar, null)
              .getPropertyValue("margin-right")
          ) /
            centre.scale;
        xAxis =
          centre.x +
          windowWidthScaled / 2 -
          imageWidthScaled -
          sidebarWidthScaled;
      }
    } else {
      xAxis = centre.x - windowWidthScaled / 2;
    }
    return [xAxis, yAxis, imageWidthScaled];
  }

  /**
   * check requirements then show character art
   * @param {*} token token passed in
   * @param {Boolean} hovered if token is mouseovered
   * @param {Number} delay hover time requirement (milliseconds) to show art.
   */
  showArtworkRequirements(token, hovered, delay) {
    /**
     * check token is actor, module is enabled, user has permissions to see
     * character art. Permission threshold is read fresh so a GM change reaches
     * every client without them reopening settings.
     */
    const actorRequirement = game.settings.get(
      "image-hover",
      "permissionOnHover"
    );
    if (
      !token ||
      !token.actor ||
      imageHoverActive === false ||
      (token.actor.permission < actorRequirement &&
        token.actor.ownership["default"] !== -1)
    ) {
      return;
    }

    /**
     * check flag to hide art for everyone
     */
    if (token.document.getFlag("image-hover", "hideArt")) return;

    /**
     * Suppress popup during combat if the GM has opted in. Read fresh so the
     * value propagates to players (who never trigger closeSettingsConfig
     * locally for GM-only world settings).
     */
    if (
      game.settings.get("image-hover", "disableDuringCombat") &&
      game.combat?.started
    ) {
      return;
    }

    /**
     * Suppress popup for tokens tagged via the Tagger module.
     */
    if (hasExcludedTag(token)) return;

    /**
     * option to never show image of a token subject to filtering (e.g. imprecise vision on PF2E)
     */
    if (token.detectionFilter && !game.user.isGM) return;

    /**
     * Do not show art when hovering over a chat portrait (chat-portrait module
     * does not fire the hover-out hook reliably).
     */
    if (chatPortraitActive && lastPointerEvent) {
      const { clientX: x, clientY: y } = lastPointerEvent;
      if (x && y) {
        const classes = document.elementFromPoint(x, y)?.classList;
        if (
          classes?.contains("message-portrait") ||
          classes?.contains("chat-message") ||
          (classes?.value && classes.value.includes("chat-portrait"))
        ) {
          return;
        }
      }
    }

    /**
     * Hide art when dragging a token (mouse button held).
     */
    if (lastPointerEvent && lastPointerEvent.buttons > 0) return;

    /**
     * Do not show new art or hide current art if GM has triggerd the "showToAll" option for "showArtTimer" seconds.
     */
    if (showSpecificArt) return;

    // Clear any pending delayed show so rapid hover changes do not race.
    clearTimeout(hoverTimer);
    if (
      hovered &&
      canvas.activeLayer instanceof foundry.canvas.layers.TokenLayer
    ) {
      // Show token image if hovered, otherwise don't
      hoverTimer = setTimeout(() => {
        if (
          token == canvas.tokens.hover &&
          token.actor.img == canvas.tokens.hover.actor.img
        ) {
          canvas.hud.imageHover.bind(token);
        } else {
          canvas.hud.imageHover.close();
        }
      }, delay);
    } else {
      this.close();
    }
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
      showSpecificArt = true; // condition to keep art on screen
      canvas.hud.imageHover.bind(token);
      clearTimeout(timer); //reset timer if key is pressed again
      const duration = game.settings.get("image-hover", "showArtTimer");
      timer = setTimeout(function () {
        showSpecificArt = false;
        canvas.hud.imageHover.close();
      }, duration); //after set amount of time, clear image
    }
  }
}

/**
 * Add Image Hover display to html on load.
 */
Hooks.on("renderHeadsUpDisplayContainer", (app, html, data) => {
  html.style.zIndex = 70;
  const template = document.createElement("template");
  template.id = "image-hover-hud";
  html.appendChild(template);
  canvas.hud.imageHover = new ImageHoverHUD();

  /**
   * renderHeadsUpDisplayContainer is called when changing scene. Reset the
   * dimension cache so it stays bounded to the current scene, then re-cache
   * the tokens that are present.
   */
  cacheImageNames = {};
  canvas.hud.imageHover.cacheAvailableToken(DEFAULT_TOKEN, false);
  for (const token of canvas.tokens.placeables) {
    if (!token || !token.actor) continue;
    if (!(token.actor.img in cacheImageNames)) {
      canvas.hud.imageHover.cacheAvailableToken(token.actor.img, false);
    } else if (token.actor.img === DEFAULT_TOKEN) {
      canvas.hud.imageHover.cacheAvailableToken(
        token.document.texture.src,
        false
      );
    }
  }
});

/**
 * Cache token image upon creating a actor.
 */
Hooks.on("createToken", (token, options, userId) => {
  const actor = game.actors.get(token.actorId);
  if (!actor) return;

  let imageToCache = actor.img;
  if (imageToCache === DEFAULT_TOKEN) {
    imageToCache = token.texture.src;
  }
  if (imageToCache && !(imageToCache in cacheImageNames)) {
    canvas.hud.imageHover.cacheAvailableToken(imageToCache, false);
  }
});

/**
 * Display image when user hovers mouse over a actor
 * Must be used on the token layer and have relevant actor permissions (configurable settings by the game master)
 * @param {*} token passed in token
 * @param {Boolean} hovered if token is mouseovered
 */
Hooks.on("hoverToken", (token, hovered) => {
  if (showSpecificArt || canvas.hud.imageHover === undefined) return;
  if (!hovered) {
    clearTimeout(hoverTimer); // cancel any pending delayed show
    canvas.hud.imageHover.close();
    return;
  }

  /**
   * Check no keybind requirement set.
   */
  if (!game.keybindings.bindings.get("image-hover.userKeybindButton")[0]?.key) {
    canvas.hud.imageHover.showArtworkRequirements(
      token,
      hovered,
      imageHoverDelay
    );
  }
});

/**
 * Add extra settings for game masters in the token configuration.
 * A checkbox option to hide image art to all.
 * A file picker to show a specific file for that token on hover.
 */
const renderHoverSetting = async (app, html, data) => {
  /**
   * Create flags and apply to token configuration html.
   * Ensure flag is updated on "update" and correct value is shown when changed.
   */
  if (data.isGM) {
    // v14 standardizes on `app.document`; v13's TokenApplication still exposes `app.token`.
    const token = app.document ?? app.token;

    const hideImageStatus = token.getFlag("image-hover", "hideArt")
      ? "checked"
      : "";
    const specificImageStatus =
      token.getFlag("image-hover", "specificArt") || "path/image.png";

    data.hideHoverStatus = hideImageStatus;
    data.specificArtStatus = specificImageStatus;

    // Convert html to native DOM element if it's a jQuery object
    const rootEl = html instanceof jQuery ? html[0] : html;

    // Find the tab content container
    const nav = rootEl.querySelector('div[data-tab="appearance"]');
    const contents = await foundry.applications.handlebars.renderTemplate(
      "modules/image-hover/templates/image-hover-token-config.html",
      data
    );

    // contents is assumed to be HTML string, so parse it
    const wrapper = document.createElement("div");
    wrapper.innerHTML = contents;
    while (wrapper.firstChild) {
      nav.appendChild(wrapper.firstChild);
    }

    app.setPosition({ height: "auto" });

    // Attach click handler for the image picker button
    const pickerButton = rootEl.querySelector(
      "button.image-hover-picker-button"
    );
    if (pickerButton) {
      pickerButton.addEventListener("click", async () => {
        new foundry.applications.apps.FilePicker.implementation({
          type: "imagevideo",
          callback: async (path) => {
            const input = rootEl.querySelector("input.specific-image-hover");
            if (input) input.value = path;
          },
        }).render();
      });
    }
  }
};
Hooks.on("renderTokenApplication", renderHoverSetting);

/**
 * Settings dialog tweaks:
 *  - Disable the "Exclude tokens with these tags" field when the Tagger
 *    module is not installed/enabled, and notify the user if they click it.
 *  - Show the graphic position/scale fields only while a graphic is configured.
 */
Hooks.on("renderSettingsConfig", (app, html, data) => {
  const root = html instanceof jQuery ? html[0] : html;
  if (!root?.querySelector) return;

  // Disable the exclude-tags field when the Tagger module is absent.
  if (!game.modules.get("tagger")?.active) {
    const tagInput = root.querySelector('[name="image-hover.excludeTags"]');
    if (tagInput) {
      tagInput.disabled = true;
      tagInput.placeholder = "Requires the Tagger module";
      const wrapper = tagInput.closest(".form-group") ?? tagInput.parentElement;
      let notified = false;
      wrapper?.addEventListener("click", () => {
        if (notified) return; // notify once per opened settings dialog
        notified = true;
        ui.notifications?.warn(
          "Image Hover: this setting requires the Tagger module (https://github.com/fantasycalendar/FoundryVTT-Tagger). Install and enable it to use tag-based exclusions."
        );
      });
    }
  }

  // Show the graphic position/scale fields only while a graphic is configured.
  // A filePicker setting renders as a <file-picker> element, not <input>, so
  // the selector must not be tag-qualified.
  const graphicInput = root.querySelector(
    '[name="image-hover.overlayGraphic"]'
  );
  if (graphicInput) {
    const dependentRows = [
      "image-hover.overlayGraphicScale",
      "image-hover.overlayGraphicX",
      "image-hover.overlayGraphicY",
      "image-hover.overlayGraphicZ",
      "image-hover.tokenImageScale",
    ]
      .map((name) => root.querySelector(`[name="${name}"]`))
      .map((field) => field?.closest(".form-group"))
      .filter((row) => row);
    const syncGraphicRows = () => {
      const show = String(graphicInput.value ?? "").trim().length > 0;
      for (const row of dependentRows) {
        row.style.display = show ? "" : "none";
      }
    };
    syncGraphicRows();
    graphicInput.addEventListener("input", syncGraphicRows);
    graphicInput.addEventListener("change", syncGraphicRows);
  }
});

/**
 * Clear art unless GM is showing users art.
 */
function clearArt() {
  if (!showSpecificArt && canvas.hud.imageHover) {
    canvas.hud.imageHover.close();
  }
}

/**
 * Remove character art when deleting/dragging token (Hover hook doesn't trigger while token movement animation is on).
 */
Hooks.on("preUpdateToken", (...args) => clearArt());
Hooks.on("deleteToken", (...args) => clearArt());

/**
 * Occasions to remove character art from screen due to weird hover hook interaction.
 */
Hooks.on("closeActorSheet", (...args) => clearArt());
Hooks.on("closeSettingsConfig", (...args) => clearArt());
Hooks.on("closeApplication", (...args) => clearArt());

/**
 * When user scrolls/moves the screen position, we want to relocate the image.
 */
Hooks.on("canvasPan", (...args) => {
  if (typeof canvas.hud.imageHover !== "undefined") {
    if (
      typeof canvas.hud.imageHover.object === "undefined" ||
      canvas.hud.imageHover.object === null
    ) {
      return;
    }
    canvas.hud.imageHover.updatePosition();
  }
});

/**
 * On Foundry world load, register module settings.
 */
Hooks.on("init", function () {
  Settings.createSettings();
  registerModuleSettings();
  registerShowArtSocket();
});

Hooks.on("closeSettingsConfig", function () {
  registerModuleSettings();
});
