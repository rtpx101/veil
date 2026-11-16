(async function () {
  const folderPath = (path) => path.substring(0, path.length - path.split("/").pop().length);
  let scriptPath = (typeof window.EJS_pathtodata === "string") ? window.EJS_pathtodata : folderPath((new URL(document.currentScript.src)).pathname);
  if (!scriptPath.endsWith("/")) scriptPath += "/";
  function fail(file) {
    if (typeof window.EJS_onLoadError === "function") window.EJS_onLoadError("missing " + file);
  }
  function loadScript(file) {
    return new Promise(function (resolve) {
      const script = document.createElement("script");
      script.src = scriptPath + file;
      script.onload = resolve;
      script.onerror = () => { fail(file); resolve(); };
      document.head.appendChild(script);
    });
  }
  function loadStyle(file) {
    return new Promise(function (resolve) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = scriptPath + file;
      css.onload = resolve;
      css.onerror = () => { fail(file); resolve(); };
      document.head.appendChild(css);
    });
  }
  await loadScript("emulator.min.js");
  await loadStyle("emulator.min.css");
  if (typeof window.EmulatorJS !== "function") return;
  const config = {};
  config.gameUrl = window.EJS_gameUrl;
  config.dataPath = scriptPath;
  config.system = window.EJS_core;
  config.biosUrl = window.EJS_biosUrl;
  config.gameName = window.EJS_gameName;
  config.color = window.EJS_color;
  config.alignStartButton = window.EJS_alignStartButton;
  config.VirtualGamepadSettings = window.EJS_VirtualGamepadSettings;
  config.buttonOpts = window.EJS_Buttons;
  config.volume = window.EJS_volume;
  config.defaultControllers = window.EJS_defaultControls;
  config.startOnLoad = window.EJS_startOnLoaded;
  config.fullscreenOnLoad = window.EJS_fullscreenOnLoaded;
  config.filePaths = window.EJS_paths;
  config.loadState = window.EJS_loadStateURL;
  config.cacheLimit = window.EJS_CacheLimit;
  config.cheats = window.EJS_cheats;
  config.defaultOptions = window.EJS_defaultOptions;
  config.gamePatchUrl = window.EJS_gamePatchUrl;
  config.gameParentUrl = window.EJS_gameParentUrl;
  config.gameId = window.EJS_gameID;
  config.backgroundImg = window.EJS_backgroundImage;
  config.backgroundBlur = window.EJS_backgroundBlur;
  config.backgroundColor = window.EJS_backgroundColor;
  config.controlScheme = window.EJS_controlScheme;
  config.threads = window.EJS_threads;
  config.disableCue = window.EJS_disableCue;
  config.startBtnName = window.EJS_startButtonName;
  config.softLoad = window.EJS_softLoad;
  config.screenRecording = window.EJS_screenRecording;
  config.externalFiles = window.EJS_externalFiles;
  config.disableDatabases = window.EJS_disableDatabases;
  config.disableLocalStorage = window.EJS_disableLocalStorage;
  config.forceLegacyCores = window.EJS_forceLegacyCores;
  config.noAutoFocus = window.EJS_noAutoFocus;
  config.videoRotation = window.EJS_videoRotation;
  config.shaders = Object.assign({}, window.EJS_SHADERS, window.EJS_shaders ? window.EJS_shaders : {});
  window.EJS_emulator = new EmulatorJS(EJS_player, config);
  const events = { ready: "EJS_ready", start: "EJS_onGameStart", loadState: "EJS_onLoadState", saveState: "EJS_onSaveState", loadSave: "EJS_onLoadSave", saveSave: "EJS_onSaveSave" };
  Object.keys(events).forEach((name) => {
    if (typeof window[events[name]] === "function") window.EJS_emulator.on(name, window[events[name]]);
  });
})();
