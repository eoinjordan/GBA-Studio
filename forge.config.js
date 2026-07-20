/* eslint-disable @typescript-eslint/no-var-requires */
const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");
const net = require("net");
const rendererConfig = require("./webpack.renderer.config.js");

const rendererPreloadConfig = {
  ...rendererConfig,
  plugins: [],
};

const parsePort = (value, fallback) => {
  const port = Number.parseInt(value, 10);

  return Number.isInteger(port) && port >= 1024 && port <= 65535
    ? port
    : fallback;
};

const isPortAvailable = (port) =>
  new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port);
  });

const findAvailablePort = async (startPort, reservedPorts = new Set()) => {
  for (let port = startPort; port <= 65535; port++) {
    if (!reservedPorts.has(port) && (await isPortAvailable(port))) {
      return port;
    }
  }

  throw new Error(`No available port found from ${startPort}`);
};

module.exports = async () => {
  const { MakerAppImage } = await import("@reforged/maker-appimage");
  const windowsSigning =
    process.env.WINDOWS_CERTIFICATE_FILE &&
    process.env.WINDOWS_CERTIFICATE_PASSWORD
      ? {
          certificateFile: process.env.WINDOWS_CERTIFICATE_FILE,
          certificatePassword: process.env.WINDOWS_CERTIFICATE_PASSWORD,
          hashes: ["sha256"],
          timestampServer:
            process.env.WINDOWS_TIMESTAMP_SERVER ||
            "http://timestamp.digicert.com",
          description: "GBA Studio",
          website: "https://eoinjordan.github.io/GBA-Studio/",
        }
      : undefined;
  const reservedPorts = new Set();
  const webpackPort = await findAvailablePort(
    parsePort(process.env.GBA_STUDIO_WEBPACK_PORT || process.env.PORT, 3000),
    reservedPorts,
  );
  reservedPorts.add(webpackPort);
  const loggerPort = await findAvailablePort(
    parsePort(process.env.GBA_STUDIO_WEBPACK_LOGGER_PORT, 9000),
    reservedPorts,
  );

  return {
    makers: [
      {
        name: "@electron-forge/maker-squirrel",
        config: {
          name: "gba_studio",
          exe: "gba-studio.exe",
          loadingGif: "src/assets/app/install.gif",
          setupIcon: "src/assets/app/icon/app_icon.ico",
          ...(windowsSigning ? { windowsSign: windowsSigning } : {}),
        },
      },
      {
        name: "@electron-forge/maker-zip",
        platforms: ["darwin", "win32", "linux"],
      },
      {
        name: "@electron-forge/maker-dmg",
        platforms: ["darwin"],
      },
      new MakerAppImage({}),
      {
        name: "@electron-forge/maker-deb",
        config: {
          options: {
            icon: "src/assets/app/icon/app_icon.png",
          },
        },
      },
      {
        name: "@electron-forge/maker-rpm",
        config: {
          options: {
            icon: "src/assets/app/icon/app_icon.png",
          },
        },
      },
    ],
    packagerConfig: {
      name: "GBA Studio",
      executableName: "gba-studio",
      packageManager: "yarn",
      icon: "src/assets/app/icon/app_icon",
      ...(windowsSigning ? { windowsSign: windowsSigning } : {}),
      darwinDarkModeSupport: true,
      extendInfo: "src/assets/app/Info.plist",
      extraResource: ["src/assets/app/icon/gbsproj.icns"],
      afterCopy: ["./src/lib/forge/hooks/after-copy"],
      asar: true,
      appBundleId: "dev.gbstudio.gbstudio",
      // Only code-sign macOS builds when Apple credentials are available.
      // Without them the build is produced unsigned (signing can be added
      // later by providing APPLE_ID / signing secrets in CI).
      ...(process.env.APPLE_ID
        ? {
            osxSign: {
              "hardened-runtime": true,
              entitlements: "./entitlements.plist",
            },
          }
        : {}),
    },
    hooks: {
      postPackage: require("./src/lib/forge/hooks/notarize"),
    },
    plugins: [
      {
        name: "@electron-forge/plugin-auto-unpack-natives",
        config: {},
      },
      {
        name: "@electron-forge/plugin-webpack",
        config: {
          port: webpackPort,
          loggerPort,
          devServer: { liveReload: false },
          mainConfig: "./webpack.main.config.js",
          renderer: {
            config: "./webpack.renderer.config.js",
            nodeIntegration: false,
            entryPoints: [
              {
                html: "./src/app/project/project.html",
                js: "./src/app/project/ProjectRoot.tsx",
                preload: {
                  js: "./src/app/project/preload.ts",
                  config: rendererPreloadConfig,
                },
                name: "main_window",
                additionalChunks: [
                  "vendor-react",
                  "vendor-scriptracker",
                  "vendor-hotloader",
                  "vendor-lodash",
                ],
              },
              {
                html: "./src/app/splash/splash.html",
                js: "./src/app/splash/SplashRoot.tsx",
                preload: {
                  js: "./src/app/splash/preload.ts",
                  config: rendererPreloadConfig,
                },
                name: "splash_window",
                additionalChunks: [
                  "vendor-react",
                  "vendor-hotloader",
                  "vendor-lodash",
                ],
              },
              {
                html: "./src/app/preferences/preferences.html",
                js: "./src/app/preferences/PreferencesRoot.tsx",
                preload: {
                  js: "./src/app/project/preload.ts",
                  config: rendererPreloadConfig,
                },
                name: "preferences_window",
                additionalChunks: [
                  "vendor-react",
                  "vendor-hotloader",
                  "vendor-lodash",
                ],
              },
              {
                html: "./src/app/plugins/plugins.html",
                js: "./src/app/plugins/PluginsRoot.tsx",
                preload: {
                  js: "./src/app/plugins/preload.ts",
                  config: rendererPreloadConfig,
                },
                name: "plugins_window",
              },
              {
                html: "./src/app/music/music.html",
                js: "./src/app/music/MusicRoot.tsx",
                preload: {
                  js: "./src/app/project/preload.ts",
                  config: rendererPreloadConfig,
                },
                name: "music_window",
                additionalChunks: [
                  "vendor-react",
                  "vendor-hotloader",
                  "vendor-lodash",
                ],
              },
              {
                name: "game_window",
                preload: {
                  js: "./src/app/game/preload.ts",
                  config: rendererPreloadConfig,
                },
              },
            ],
          },
        },
      },
      // Fuses are used to enable/disable various Electron functionality
      // at package time, before code signing the application
      new FusesPlugin({
        version: FuseVersion.V1,
        [FuseV1Options.RunAsNode]: false,
        [FuseV1Options.EnableCookieEncryption]: true,
        [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
        [FuseV1Options.EnableNodeCliInspectArguments]: false,
        [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
        [FuseV1Options.OnlyLoadAppFromAsar]: true,
      }),
    ],
  };
};
