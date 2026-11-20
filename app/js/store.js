// store.js — saved progress for Leonida Ledger.
// Progress lives only in this browser (localStorage). Export writes a JSON
// file; import reads one back. No network is involved anywhere.
(function () {
  'use strict';

  var KEY = 'leonida-ledger-progress-v1';
  var SETTINGS_KEY = 'leonida-ledger-settings-v1';

  function readJson(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  // earned: an object mapping trophy name -> true for every earned trophy.
  function loadProgress() {
    var data = readJson(KEY, {});
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    var out = {};
    Object.keys(data).forEach(function (name) {
      if (data[name]) out[name] = true;
    });
    return out;
  }

  function saveProgress(earned) {
    return writeJson(KEY, earned);
  }

  function loadSettings() {
    var data = readJson(SETTINGS_KEY, {});
    return {
      spoilersHidden: data && data.spoilersHidden !== false,
      selected: (data && typeof data.selected === 'string') ? data.selected : null
    };
  }

  function saveSettings(settings) {
    return writeJson(SETTINGS_KEY, settings);
  }

  function exportFile(earned) {
    var payload = {
      app: 'leonida-ledger',
      game: 'Grand Theft Auto VI',
      version: 1,
      exportedAt: new Date().toISOString(),
      earned: Object.keys(earned).filter(function (name) { return earned[name]; })
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'gta6-trophy-progress.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // Parses an imported file's text. Returns { earned } or throws an Error
  // with a plain message. Accepts our own export shape, or a bare array of
  // trophy names, or a bare { name: true } map.
  function parseImport(text) {
    var data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('That file is not valid JSON.');
    }
    var names = null;
    if (Array.isArray(data)) {
      names = data;
    } else if (data && Array.isArray(data.earned)) {
      names = data.earned;
    } else if (data && typeof data === 'object') {
      names = Object.keys(data).filter(function (k) { return data[k]; });
    }
    if (!names) throw new Error('That file has no trophy list in it.');
    var earned = {};
    names.forEach(function (name) {
      if (typeof name === 'string' && name) earned[name] = true;
    });
    return { earned: earned };
  }

  window.LeonidaStore = {
    loadProgress: loadProgress,
    saveProgress: saveProgress,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    exportFile: exportFile,
    parseImport: parseImport
  };
})();
