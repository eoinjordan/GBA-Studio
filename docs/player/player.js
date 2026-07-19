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

  const EMULATOR_DATA_URL = "https://cdn.emulatorjs.org/stable/data/";
  const DEMOS = Object.freeze([
    Object.freeze({
      title: "Starter World",
      description:
        "Walk through the compact starter scene and test native background, input, and collision handling.",
      tag: "Top-down",
      url: "roms/gba-starter.gba",
    }),
    Object.freeze({
      title: "Isometric Adventure",
      description:
        "Test the isometric projection, depth ordering, NPC interaction, and scene triggers.",
      tag: "Isometric",
      url: "roms/isometric-adventure.gba",
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

  function configureEmulator(target, url) {
    target.EJS_player = "#game";
    target.EJS_core = "gba";
    target.EJS_gameUrl = url;
    target.EJS_pathtodata = EMULATOR_DATA_URL;
    target.EJS_color = "#8b5cf6";
    target.EJS_startOnLoaded = true;
    target.EJS_AdUrl = "";
    target.EJS_AdTimer = -1;
  }

  function init(doc, target) {
    const dropZone = doc.getElementById("drop-zone");
    const romInput = doc.getElementById("rom-input");
    const loaderUi = doc.getElementById("loader-ui");
    const emulatorWrap = doc.getElementById("emulator-wrap");
    const game = doc.getElementById("game");
    const romName = doc.getElementById("rom-name");
    const status = doc.getElementById("player-status");
    const demoGrid = doc.getElementById("demo-grid");
    const closeButton = doc.getElementById("close-btn");

    if (!dropZone || !romInput || !loaderUi || !emulatorWrap || !game) {
      return false;
    }

    function setStatus(message, isError) {
      if (!status) return;
      status.textContent = message || "";
      status.classList.toggle("error", Boolean(isError));
    }

    function removeLoader() {
      doc
        .querySelectorAll("script[data-gba-player-loader]")
        .forEach((node) => node.remove());
    }

    function launch(url, name) {
      setStatus("", false);
      loaderUi.hidden = true;
      emulatorWrap.classList.add("visible");
      game.replaceChildren();
      if (romName) romName.textContent = name || romNameFromUrl(url);

      removeLoader();
      configureEmulator(target, url);
      const script = doc.createElement("script");
      script.src = `${EMULATOR_DATA_URL}loader.js`;
      script.dataset.gbaPlayerLoader = "true";
      script.onerror = function () {
        setStatus("The emulator could not be loaded. Check your connection and try again.", true);
        close();
      };
      doc.body.appendChild(script);
    }

    function close() {
      emulatorWrap.classList.remove("visible");
      loaderUi.hidden = false;
      game.replaceChildren();
      removeLoader();
      if (activeObjectUrl && target.URL && target.URL.revokeObjectURL) {
        target.URL.revokeObjectURL(activeObjectUrl);
      }
      activeObjectUrl = null;
      romInput.value = "";
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
        launch(activeObjectUrl, romNameFromUrl(file.name));
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
        launch(demo.url, demo.title);
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

    const queryRom = romUrlFromSearch(target.location && target.location.search);
    if (queryRom) launch(queryRom, romNameFromUrl(queryRom));
    return true;
  }

  return {
    DEMOS,
    EMULATOR_DATA_URL,
    configureEmulator,
    hasValidGbaHeader,
    init,
    isGbaFileName,
    romNameFromUrl,
    romUrlFromSearch,
  };
});
