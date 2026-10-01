(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.GBAStudioPlayer = api;
    if (root.document) {
      api.init(root.document, root);
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const EMULATOR_DATA_URL = "https://cdn.emulatorjs.org/4.2.3/data/";
  const DEMOS = Object.freeze([
    Object.freeze({
      title: "The Sunstone Relay",
      description:
        "Complete a two-scene quest using isometric movement, collisions, triggers, interaction, depth ordering, variables, and scene transitions.",
      instructions:
        "Talk to Keeper Nia, walk onto the west and east signal markers, claim the green lake core with X, then return to Nia. Press Enter on the ending to replay.",
      tag: "Isometric",
      url: "roms/isometric-adventure.gba",
    }),
    Object.freeze({
      title: "Poachermon: Case 001",
      description:
        "Collect evidence, report two poachers, rescue a trapped creature, and close a complete scripted case.",
      instructions:
        "Finish Rowan's briefing, tag the west and east snares, confront Ash and Moss, free the pink creature, then return to Rowan.",
      tag: "Adventure",
      url: "roms/poachermon.gba",
    }),
  ]);

  let activeObjectUrl = null;

  function isGbaFileName(name) {
    return typeof name === "string" && /\.gba$/i.test(name.trim());
  }

  function hasValidGbaHeader(bytes) {
    return Boolean(bytes && bytes.length >= 192 && bytes[0xb2] === 0x96);
  }

  function romNameFromUrl(url) {
    const path = String(url || "").split(/[?#]/, 1)[0];
    const filename = path.split("/").pop() || "GBA Studio game";
    try {
      return decodeURIComponent(filename).replace(/\.gba$/i, "");
    } catch (_error) {
      return filename.replace(/\.gba$/i, "");
    }
  }

  function romUrlFromSearch(search) {
    const value = new URLSearchParams(search || "").get("rom");
    return value && value.trim() ? value.trim() : null;
  }

  function demoFromUrl(url) {
    const cleanUrl = String(url || "").split(/[?#]/, 1)[0];
    return DEMOS.find(function (demo) {
      return demo.url === cleanUrl;
    });
  }

  function configureEmulator(target, url) {
    target.EJS_player = "#game";
    target.EJS_core = "gba";
    target.EJS_controlScheme = "gba";
    target.EJS_gameUrl = url;
    target.EJS_pathtodata = EMULATOR_DATA_URL;
    target.EJS_color = "#8b5cf6";
    target.EJS_startOnLoaded = false;
    target.EJS_startButtonName = "Play GBA Studio Game";
    target.EJS_AdUrl = "";
    target.EJS_AdTimer = -1;
  }

  function emulatorUrl(url, name) {
    const params = new URLSearchParams();
    params.set("rom", url);
    params.set("name", name || romNameFromUrl(url));
    params.set("player", "2");
    return `emulator.html?${params.toString()}`;
  }

  function init(doc, target) {
    const dropZone = doc.getElementById("drop-zone");
    const romInput = doc.getElementById("rom-input");
    const loaderUi = doc.getElementById("loader-ui");
    const emulatorWrap = doc.getElementById("emulator-wrap");
    const game = doc.getElementById("game");
    const romName = doc.getElementById("rom-name");
    const routeTitle = doc.getElementById("route-title");
    const routeInstructions = doc.getElementById("route-instructions");
    const status = doc.getElementById("player-status");
    const emulatorStatus = doc.getElementById("emulator-status");
    const demoGrid = doc.getElementById("demo-grid");
    const closeButton = doc.getElementById("close-btn");
    let activeFrame = null;

    if (!dropZone || !romInput || !loaderUi || !emulatorWrap || !game) {
      return false;
    }

    function setStatus(message, isError) {
      if (!status) return;
      status.textContent = message || "";
      status.classList.toggle("error", Boolean(isError));
    }

    function launch(url, name, demo) {
      setStatus("", false);
      loaderUi.hidden = true;
      emulatorWrap.classList.add("visible");
      game.replaceChildren();
      if (emulatorStatus) {
        emulatorStatus.textContent =
          "Loading the mGBA browser core. When it is ready, select Play GBA Studio Game inside the player.";
        emulatorStatus.classList.remove("error");
      }
      if (romName) romName.textContent = name || romNameFromUrl(url);
      if (routeTitle) {
        routeTitle.textContent = demo ? `${demo.title} route:` : "Loaded ROM:";
      }
      if (routeInstructions) {
        routeInstructions.textContent = demo
          ? demo.instructions
          : "Use the arrow keys to move, X for GBA A, S for GBA B, and Enter for START. Objectives depend on the loaded ROM.";
      }

      const frame = doc.createElement("iframe");
      frame.className = "emulator-frame";
      frame.title = `${name || romNameFromUrl(url)} GBA emulator`;
      frame.allow = "autoplay; fullscreen; gamepad";
      frame.setAttribute("allowfullscreen", "");
      frame.src = emulatorUrl(url, name);
      activeFrame = frame;
      game.appendChild(frame);
    }

    function close() {
      emulatorWrap.classList.remove("visible");
      loaderUi.hidden = false;
      game.replaceChildren();
      activeFrame = null;
      if (activeObjectUrl && target.URL && target.URL.revokeObjectURL) {
        target.URL.revokeObjectURL(activeObjectUrl);
      }
      activeObjectUrl = null;
      romInput.value = "";
    }

    if (target.addEventListener) {
      target.addEventListener("message", function (event) {
        if (
          !activeFrame ||
          event.source !== activeFrame.contentWindow ||
          !event.data ||
          event.data.source !== "gba-studio-emulator"
        ) {
          return;
        }
        if (emulatorStatus && event.data.type === "ready") {
          emulatorStatus.textContent =
            "Emulator ready. Select Play GBA Studio Game to start, then click the game whenever keyboard focus is needed.";
        } else if (emulatorStatus && event.data.type === "started") {
          emulatorStatus.textContent =
            "Game running. Arrow keys move, X interacts, S is B, and Enter is START.";
        } else if (emulatorStatus && event.data.type === "error") {
          emulatorStatus.textContent = event.data.message;
          emulatorStatus.classList.add("error");
        }
      });
    }

    async function loadFile(file) {
      if (!file || !isGbaFileName(file.name)) {
        setStatus("Choose a file with the .gba extension.", true);
        return;
      }

      try {
        const header = new Uint8Array(await file.slice(0, 192).arrayBuffer());
        if (!hasValidGbaHeader(header)) {
          setStatus("That file does not contain a valid GBA ROM header.", true);
          return;
        }
        activeObjectUrl = target.URL.createObjectURL(file);
        launch(activeObjectUrl, romNameFromUrl(file.name), null);
      } catch (_error) {
        setStatus("The ROM could not be read by this browser.", true);
      }
    }

    DEMOS.forEach(function (demo) {
      const card = doc.createElement("button");
      card.type = "button";
      card.className = "demo-card";

      const tag = doc.createElement("span");
      tag.className = "demo-tag";
      tag.textContent = demo.tag;
      const title = doc.createElement("strong");
      title.textContent = demo.title;
      const description = doc.createElement("span");
      description.textContent = demo.description;

      card.append(tag, title, description);
      card.addEventListener("click", function () {
        launch(demo.url, demo.title, demo);
      });
      demoGrid.appendChild(card);
    });

    dropZone.addEventListener("click", function () {
      romInput.click();
    });
    dropZone.addEventListener("dragover", function (event) {
      event.preventDefault();
      dropZone.classList.add("drag-over");
    });
    dropZone.addEventListener("dragleave", function () {
      dropZone.classList.remove("drag-over");
    });
    dropZone.addEventListener("drop", function (event) {
      event.preventDefault();
      dropZone.classList.remove("drag-over");
      loadFile(event.dataTransfer && event.dataTransfer.files[0]);
    });
    romInput.addEventListener("change", function () {
      loadFile(romInput.files && romInput.files[0]);
    });
    if (closeButton) closeButton.addEventListener("click", close);

    const queryRom = romUrlFromSearch(
      target.location && target.location.search,
    );
    if (queryRom) {
      const queryDemo = demoFromUrl(queryRom);
      launch(
        queryRom,
        queryDemo ? queryDemo.title : romNameFromUrl(queryRom),
        queryDemo,
      );
    }
    return true;
  }

  return {
    DEMOS,
    EMULATOR_DATA_URL,
    configureEmulator,
    demoFromUrl,
    emulatorUrl,
    hasValidGbaHeader,
    init,
    isGbaFileName,
    romNameFromUrl,
    romUrlFromSearch,
  };
});
