const GRAPHIC_IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "svg",
  "webp",
  "gif",
  "avif",
];

/**
 * Validate and normalize a popup-graphic path. Guarantees the result stays
 * inside the Foundry data directory: no absolute paths, drive letters,
 * URLs/data URIs, or ".." traversal, and the file must carry a recognized
 * image extension.
 * @param {String} path raw user input
 * @returns {String|null} "" when empty/cleared, the cleaned path when valid,
 *   or null when the input is rejected.
 */
export function sanitizeGraphicPath(path) {
  if (typeof path !== "string") return "";
  const p = path.trim();
  if (p === "") return "";
  if (p.includes("\\")) return null; // backslashes (Windows / UNC paths)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(p)) return null; // protocol (http:/data:) or drive (C:)
  if (p.startsWith("/")) return null; // absolute or protocol-relative path
  if (p.split("/").includes("..")) return null; // path traversal
  const ext = p.includes(".") ? p.split(".").pop().toLowerCase() : "";
  if (!GRAPHIC_IMAGE_EXTENSIONS.includes(ext)) return null; // must be an image
  return p;
}

/**
 * Resolve true if the path loads as an image. Storage-backend agnostic.
 * @param {String} path data-directory-relative image path
 * @returns {Promise<Boolean>}
 */
function imageFileLoads(path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(true));
    img.addEventListener("error", () => resolve(false));
    img.src = path;
  });
}

/**
 * onChange handler for the popup-graphic setting. Rejects invalid or missing
 * files, notifies the user, and clears the stored value so it has no effect.
 * @param {String} value newly stored value
 */
async function onGraphicPathChange(value) {
  // World-scoped setting: only the GM who changed it validates/resets/notifies;
  // other clients receive this via sync and cannot write world settings.
  if (!game.user.isGM) return;
  const clean = sanitizeGraphicPath(value);
  if (clean === null) {
    ui.notifications?.error(
      "Image Hover: invalid graphic path. Choose an image file (jpg, jpeg, png, webp, svg, gif, avif) inside your Foundry data directory — absolute paths and URLs are not allowed."
    );
    await game.settings.set("image-hover", "overlayGraphic", "");
    return;
  }
  if (clean === "") return; // cleared
  const exists = await imageFileLoads(clean);
  if (!exists) {
    ui.notifications?.error(
      `Image Hover: the graphic "${clean}" could not be loaded. Check that the file exists in your Foundry data directory.`
    );
    await game.settings.set("image-hover", "overlayGraphic", "");
    return;
  }
  if (clean !== value) {
    // Persist the normalized (trimmed) path.
    await game.settings.set("image-hover", "overlayGraphic", clean);
  }
}

export class Settings {
  static createSettings() {
    // Game master setting
    game.settings.register("image-hover", "permissionOnHover", {
      name: "Required actor permission", // Setting name
      hint: "Required permission level of Actor to see handout.", // Setting description
      scope: "world", // Global setting
      config: true, // Show setting in configuration view
      restricted: true, // Game master only
      choices: {
        // Choices
        0: "None",
        1: "Limited",
        2: "Observer",
        3: "Owner",
      },
      default: "0", // Default value
      type: Number, // Value type
    });

    // Game master setting
    game.settings.register("image-hover", "disableDuringCombat", {
      name: "Disable during combat",
      hint: "When enabled, the image hover popup will not show while a combat encounter is active.",
      scope: "world",
      config: true,
      restricted: true,
      type: Boolean,
      default: false,
    });

    // Game master setting — requires the Tagger module
    game.settings.register("image-hover", "excludeTags", {
      name: "Exclude tokens with these tags",
      hint: "Comma-separated Tagger tags. Tokens carrying any of these tags will be skipped by the image hover popup. Requires the Tagger module (https://github.com/fantasycalendar/FoundryVTT-Tagger) — without it this setting has no effect.",
      scope: "world",
      config: true,
      restricted: true,
      type: String,
      default: "",
      onChange: () => {
        if (!game.user.isGM) return;
        if (!game.modules.get("tagger")?.active) {
          ui.notifications?.warn(
            "Image Hover: 'Exclude tokens with these tags' requires the Tagger module. The value has been saved but will have no effect until Tagger is installed and enabled."
          );
        }
      },
    });

    // Game master setting
    game.settings.register("image-hover", "artType", {
      name: "Art on hover", // Setting name
      hint: "The type of art shown on hover", // Setting description
      scope: "world", // Global setting
      config: true, // Show setting in configuration view
      restricted: true, // Game master only
      choices: {
        // Choices
        character: "Character art",
        token: "Token art",
        wildcard: "Token art if wildcard",
        linked: "Token art if unlinked",
      },
      default: "character", // Default value
      type: String, // Value type
    });

    // Game master setting
    game.keybindings.register("image-hover", "showAllKey", {
      name: "Assign a keybind to show all users art.", // Setting name
      restricted: true,
      editable: [],
      onDown: () => {
        const hoveredToken = canvas.tokens.hover;
        if (hoveredToken !== null) {
          canvas.hud.imageHover.showToAll(hoveredToken); // apply to self
          game.socket.emit("module.image-hover", hoveredToken.id); // emit to all other users
        }
      },
    });

    // Game master setting
    game.settings.register("image-hover", "showArtTimer", {
      name: "Show all users art duration", // Setting name
      hint: 'Time (milliseconds) that art appears to users on the same scene when the "show all" keybind is pressed.', // Setting description
      restricted: true, // Game master only
      scope: "world", // Global setting
      config: true, // Show setting in configuration view
      range: {
        // Choices
        min: 1000,
        max: 15000,
        step: 200,
      },
      default: 6000, // Default Value
      type: Number, // Value type
    });

    // client setting
    game.settings.register("image-hover", "userEnableModule", {
      name: "Enable/Disable Image Hover", // Setting name
      hint: "Uncheck to disable Image Hover (per user).", // Setting description
      scope: "client", // client-stored setting
      config: true, // Show setting in configuration view
      type: Boolean, // Value type
      default: true, // The default value for the setting
      onChange: (value) => {
        canvas.hud.imageHover.close();
      },
    });

    // client setting
    game.keybindings.register("image-hover", "userKeybindButton", {
      name: "Assign a keybind requirement to show art while hovering over a token.", // Setting name
      editable: [],
      onDown: () => {
        const hoveredToken = canvas.tokens.hover;
        if (hoveredToken !== null) {
          canvas.hud.imageHover.showArtworkRequirements(hoveredToken, true, 0);
        }
      },
    });

    // client setting
    game.settings.register("image-hover", "userImagePosition", {
      name: "Position of image", // Setting name
      hint: "Set the location of the image on the screen (per user).", // Setting description
      scope: "client", // Client-stored setting
      config: true, // Show setting in configuration view
      choices: {
        // Choices
        "Bottom left": "Bottom left",
        "Bottom right": "Bottom right",
        "Top left": "Top left",
        "Top right": "Top right",
        Centre: "Centre",
      },
      default: "Bottom left", // Default Value
      type: String, // Value type
    });

    // client setting
    game.settings.register("image-hover", "userImageSize", {
      name: "Image to monitor width", // Setting name
      hint: "Changes the size of the image (per user), smaller value implies larger image (1/value of your screen width).", // Setting description
      scope: "client", // Client-stored setting
      config: true, // Show setting in configuration view
      range: {
        // Choices
        min: 3,
        max: 20,
        step: 0.5,
      },
      default: 5.5, // Default Value
      type: Number, // Value type
    });

    // Game master setting — optional decorative graphic layered on the popup
    game.settings.register("image-hover", "overlayGraphic", {
      name: "Popup graphic",
      hint: "Optional image layered on the hover popup, such as a frame or banner. Must be an image file inside your Foundry data directory. The position and scale fields below appear once a graphic is set.",
      scope: "world",
      config: true,
      restricted: true,
      type: String,
      filePicker: "image",
      default: "",
      onChange: onGraphicPathChange,
    });

    // Game master setting — graphic size relative to the popup
    game.settings.register("image-hover", "overlayGraphicScale", {
      name: "Graphic scale",
      hint: "Graphic width. Use a percentage (e.g. 100%) to scale together with 'Image to monitor width', or a pixel value (e.g. 250px) for a fixed size. A bare number is treated as a percentage. Height follows the graphic's own aspect ratio.",
      scope: "world",
      config: true,
      restricted: true,
      type: String,
      default: "100%",
    });

    // Game master setting — graphic horizontal offset
    game.settings.register("image-hover", "overlayGraphicX", {
      name: "Graphic X position",
      hint: "Horizontal offset of the graphic from the popup's left edge. Use a percentage (of popup width) or a pixel value (e.g. 20px). A bare number is treated as a percentage.",
      scope: "world",
      config: true,
      restricted: true,
      type: String,
      default: "0%",
    });

    // Game master setting — graphic vertical offset
    game.settings.register("image-hover", "overlayGraphicY", {
      name: "Graphic Y position",
      hint: "Vertical offset of the graphic from the popup's top edge. Use a percentage (of popup height) or a pixel value (e.g. 20px). A bare number is treated as a percentage.",
      scope: "world",
      config: true,
      restricted: true,
      type: String,
      default: "0%",
    });

    // Game master setting — graphic stacking order
    game.settings.register("image-hover", "overlayGraphicZ", {
      name: "Graphic Z position",
      hint: "Stacking order of the graphic. Positive values place it in front of the art, negative values behind it.",
      scope: "world",
      config: true,
      restricted: true,
      type: Number,
      default: 1,
    });

    // Game master setting — scale of the token art inside the popup
    game.settings.register("image-hover", "tokenImageScale", {
      name: "Token image scale (%)",
      hint: "Scales the token/character art inside the popup. Lower it slightly (e.g. 90%) so the art shrinks to fit within a popup graphic frame. Only applies while a popup graphic is set.",
      scope: "world",
      config: true,
      restricted: true,
      type: Number,
      default: 100,
    });

    // client setting
    game.settings.register("image-hover", "userHoverDelay", {
      name: "Mouse hover time requirement", // Setting name
      hint: "Required hover time to show art work (milliseconds).", // Setting description
      scope: "client", // Client-stored setting
      config: true, // Show setting in configuration view
      range: {
        // Choices
        min: 0,
        max: 5000,
        step: 100,
      },
      default: 100, // Default Value
      type: Number, // Value type
    });
  }
}
