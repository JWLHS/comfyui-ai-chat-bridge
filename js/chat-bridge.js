/**
 * chat-bridge.js — AI Chat Bridge entry point
 * Dynamically loads lib/ scripts in order, then core auto-inits.
 */
(function() {
  "use strict";

  if (window.__CB_ENTRY_LOADED__) return;
  window.__CB_ENTRY_LOADED__ = true;

  var BASE = document.currentScript
    ? document.currentScript.src.replace(/\/chat-bridge\.js.*$/, "/lib/")
    : "/extensions/comfyui-ai-chat-bridge/lib/";

  function loadScript(name, cb) {
    var s = document.createElement("script");
    s.src = BASE + name;
    s.onload = cb;
    s.onerror = function() { console.error("[ChatBridge] Failed: " + BASE + name); };
    document.head.appendChild(s);
  }

  loadScript("chat-bridge-i18n.js", function() {
    loadScript("chat-bridge-css.js", function() {
      loadScript("chat-bridge-core.js", function() {
        console.log("[ChatBridge] All scripts loaded.");
      });
    });
  });
})();
