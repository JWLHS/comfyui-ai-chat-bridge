/**
 * chat-bridge-core.js — AI Chat Bridge main logic
 * Requires: chat-bridge-i18n.js, chat-bridge-css.js (loaded before)
 */
(function() {
  "use strict";

  var I = window.ChatBridgeI18N;
  var CSS = window.ChatBridgeCSS;

  if (!I || !CSS) {
    console.error("[ChatBridge] Missing dependencies. Ensure i18n and css scripts loaded first.");
    return;
  }

  // ── Constants ──────────────────────────────────────────────────
  var STORAGE_KEY = "comfyui_chat_bridge";
  var DEF = {
    base_url: "", api_key: "", model: "", system_prompt: "",
    temperature: 0.3, max_tokens: 4096, top_k: 40, top_p: 0.9,
    stream_enabled: true,
    context_workflow: true, context_nodes: false,
    context_dialog_error: true, context_console_error: true,
    font_size: 13, panel_width: 390, lang: "zh",
    panel_collapsed: false, api_collapsed: false,
    params_collapsed: true, context_collapsed: true, appearance_collapsed: true,
  };

  // ── State ──────────────────────────────────────────────────────
  var history = [];
  var recentDialogError = "";
  var recentConsoleError = "";
  var isLoading = false;
  var modelList = [];
  var imageStore = [];

  // ── Helpers ────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function scrollBottom(el) { el.scrollTop = el.scrollHeight; }

  function escapeHtml(s) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  // ── Config ─────────────────────────────────────────────────────
  function loadConfig() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s.api_key && s.api_key.startsWith("b64:")) { try { s.api_key = atob(s.api_key.slice(4)); } catch { s.api_key = ""; } }
        var merged = {}; for (var k in DEF) merged[k] = (s[k] !== undefined) ? s[k] : DEF[k];
        return merged;
      }
    } catch(e) { /* ignore */ }
    var copy = {}; for (var k in DEF) copy[k] = DEF[k];
    return copy;
  }

  function saveConfig(cfg) {
    var s = {}; for (var k in cfg) s[k] = cfg[k];
    if (s.api_key && !s.api_key.startsWith("b64:")) s.api_key = "b64:" + btoa(s.api_key);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  // ── I18N text refresh ─────────────────────────────────────────
  function refreshUIText() {
    // Update all elements with data-i18n attribute
    var nodes = document.querySelectorAll("#chat-bridge-root [data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = I.t(nodes[i].getAttribute("data-i18n"));
    }
    // Update placeholders
    var inputs = document.querySelectorAll("#chat-bridge-root [data-i18n-placeholder]");
    for (var j = 0; j < inputs.length; j++) {
      inputs[j].placeholder = I.t(inputs[j].getAttribute("data-i18n-placeholder"));
    }
    // Update titles
    var titles = document.querySelectorAll("#chat-bridge-root [data-i18n-title]");
    for (var k = 0; k < titles.length; k++) {
      titles[k].title = I.t(titles[k].getAttribute("data-i18n-title"));
    }
    // Update grabber text
    var gb = $("cb-grabber"); if (gb) gb.textContent = I.t("grabberText");
    // Update stream toggle text
    var st = $("cb-stream-toggle");
    if (st) st.textContent = st.classList.contains("active") ? "🌊" : "📄";
  }

  // ── Markdown ──────────────────────────────────────────────────
  function renderMarkdown(text) {
    var h = text;
    h = h.replace(/<think>([\s\S]*?)<\/think>/g, function(m,c){
      var label = I.t("thinkingFold") + " (" + (c.length > 80 ? c.length + " " + I.t("chars") : I.t("short")) + ")";
      return '<details class="cb-thinking"><summary>💭 ' + label + '</summary><div>' + escapeHtml(c.trim()) + '</div></details>';
    });
    h = h.replace(/<think>(?![\s\S]*?<\/think>)/g, "&lt;think&gt;");
    h = h.replace(/```(\w*)\n?([\s\S]*?)```/g, function(m,lang,code){
      return '<div class="cb-code-block"><button class="cb-copy-btn" title="' + I.t("copyCode") + '">📋</button><pre><code>' + escapeHtml(code.trim()) + '</code></pre></div>';
    });
    h = h.replace(/`([^`]+)`/g, "<code>$1</code>");
    h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    h = h.replace(/(^|\s)\*([^*\n]+)\*(\s|$)/g, "$1<em>$2</em>$3");
    h = h.replace(/\n/g, "<br>");
    return h;
  }

  // ── Build DOM ─────────────────────────────────────────────────
  function buildPanel() {
    var root = document.createElement("div");
    root.className = "cb-root";
    root.id = "chat-bridge-root";

    // Inject CSS
    root.insertAdjacentHTML("beforeend", CSS.get());

    // Build HTML skeleton with data-i18n attributes
    root.insertAdjacentHTML("beforeend",
      '<div class="cb-grabber" id="cb-grabber" data-i18n-title="showPanel">' + I.t("grabberText") + '</div>\n'+
      '<div class="cb-titlebar" id="cb-titlebar">\n'+
      '  <div class="cb-dot" id="cb-dot"></div>\n'+
      '  <span class="cb-title-text" data-i18n="title">' + I.t("title") + '</span>\n'+
      '  <button id="cb-lang-toggle" title="中/EN">🌐</button>\n'+
      '  <button id="cb-stream-toggle" class="active" data-i18n-title="streamOn">🌊</button>\n'+
      '  <button id="cb-toggle" data-i18n-title="hidePanel">◀</button>\n'+
      '</div>\n'+
      '<div class="cb-section">\n'+
      '  <div class="cb-section-header" id="cb-api-header"><span class="cb-arrow" id="cb-api-arrow">▶</span> <span data-i18n="apiHeader">' + I.t("apiHeader") + '</span></div>\n'+
      '  <div class="cb-section-body" id="cb-api-body">\n'+
      '    <div class="cb-row"><label data-i18n="url">' + I.t("url") + '</label><input id="cb-url" data-i18n-placeholder="urlPlaceholder"></div>\n'+
      '    <div class="cb-row"><label data-i18n="key">' + I.t("key") + '</label><input id="cb-key" type="password" data-i18n-placeholder="keyPlaceholder"><button class="cb-btn small" id="cb-key-toggle" style="width:24px;flex:none;">👁</button></div>\n'+
      '    <div class="cb-row"><label data-i18n="model">' + I.t("model") + '</label><input id="cb-model" list="cb-model-list" data-i18n-placeholder="modelPlaceholder"><datalist id="cb-model-list"></datalist><button class="cb-btn small" id="cb-refresh-models" data-i18n-title="fetchModels" style="flex:none;">🔄</button></div>\n'+
      '    <div class="cb-row"><label data-i18n="prompt">' + I.t("prompt") + '</label><input id="cb-sys" data-i18n-placeholder="promptPlaceholder"></div>\n'+
      '    <div style="text-align:right;margin-top:4px"><button class="cb-btn primary" id="cb-save-config" data-i18n="saveConfig">' + I.t("saveConfig") + '</button></div>\n'+
      '  </div>\n'+
      '</div>\n'+
      '<div class="cb-section">\n'+
      '  <div class="cb-section-header" id="cb-ctx-header"><span class="cb-arrow" id="cb-ctx-arrow">▶</span> <span data-i18n="ctxHeader">' + I.t("ctxHeader") + '</span></div>\n'+
      '  <div class="cb-section-body" id="cb-ctx-body">\n'+
      '    <label class="cb-check"><input type="checkbox" id="cb-ctx-workflow" checked> <span data-i18n="ctxWorkflow">' + I.t("ctxWorkflow") + '</span></label>\n'+
      '    <label class="cb-check"><input type="checkbox" id="cb-ctx-nodes"> <span data-i18n="ctxNodes">' + I.t("ctxNodes") + '</span></label>\n'+
      '    <label class="cb-check"><input type="checkbox" id="cb-ctx-dialog-error" checked> <span data-i18n="ctxDialogError">' + I.t("ctxDialogError") + '</span></label>\n'+
      '    <label class="cb-check"><input type="checkbox" id="cb-ctx-console-error" checked> <span data-i18n="ctxConsoleError">' + I.t("ctxConsoleError") + '</span></label>\n'+
      '  </div>\n'+
      '</div>\n'+
      '<div class="cb-section">\n'+
      '  <div class="cb-section-header" id="cb-appearance-header"><span class="cb-arrow" id="cb-appearance-arrow">▶</span> <span data-i18n="appearanceHeader">' + I.t("appearanceHeader") + '</span></div>\n'+
      '  <div class="cb-section-body" id="cb-appearance-body">\n'+
      '    <div class="cb-row"><label data-i18n="fontSize">' + I.t("fontSize") + '</label><input type="range" id="cb-font-size" min="10" max="18" step="1" value="13"><span class="cb-val" id="cb-font-size-val">13</span></div>\n'+
      '    <div class="cb-row"><label data-i18n="panelWidth">' + I.t("panelWidth") + '</label><input type="range" id="cb-panel-width" min="300" max="550" step="10" value="390"><span class="cb-val" id="cb-panel-width-val">390</span></div>\n'+
      '  </div>\n'+
      '</div>\n'+
      '<div class="cb-section">\n'+
      '  <div class="cb-section-header" id="cb-params-header"><span class="cb-arrow" id="cb-params-arrow">▶</span> <span data-i18n="paramsHeader">' + I.t("paramsHeader") + '</span></div>\n'+
      '  <div class="cb-section-body" id="cb-params-body">\n'+
      '    <div class="cb-row"><label data-i18n="temp">' + I.t("temp") + '</label><input type="range" id="cb-temp" min="0" max="2" step="0.1" value="0.3"><span class="cb-val" id="cb-temp-val">0.3</span></div>\n'+
      '    <div class="cb-row"><label data-i18n="maxTok">' + I.t("maxTok") + '</label><input type="range" id="cb-maxtok" min="128" max="65536" step="256" value="4096"><span class="cb-val" id="cb-maxtok-val">4096</span></div>\n'+
      '    <div class="cb-row"><label data-i18n="topK">' + I.t("topK") + '</label><input type="range" id="cb-topk" min="1" max="100" step="1" value="40"><span class="cb-val" id="cb-topk-val">40</span></div>\n'+
      '    <div class="cb-row"><label data-i18n="topP">' + I.t("topP") + '</label><input type="range" id="cb-topp" min="0" max="1" step="0.05" value="0.9"><span class="cb-val" id="cb-topp-val">0.90</span></div>\n'+
      '  </div>\n'+
      '</div>\n'+
      '<div id="cb-toolbar">\n'+
      '  <button class="cb-btn small" id="cb-clear-history" data-i18n="clearHistory">' + I.t("clearHistory") + '</button>\n'+
      '  <button class="cb-btn small" id="cb-save-history" data-i18n="saveHistory">' + I.t("saveHistory") + '</button>\n'+
      '  <span class="cb-spacer"></span>\n'+
      '  <span style="font-size:10px;color:#555;" data-i18n="pasteHint">' + I.t("pasteHint") + '</span>\n'+
      '</div>\n'+
      '<div id="cb-img-bar">\n'+
      '  <button class="cb-btn small" id="cb-img-canvas" data-i18n="canvasBtn">' + I.t("canvasBtn") + '</button>\n'+
      '  <span id="cb-img-count">0 ' + I.t("imgCount") + '</span>\n'+
      '  <div id="cb-img-list"></div>\n'+
      '  <button class="cb-btn small" id="cb-img-clear" data-i18n="imgClear">' + I.t("imgClear") + '</button>\n'+
      '</div>\n'+
      '<div id="cb-messages"></div>\n'+
      '<div id="cb-input-area">\n'+
      '  <textarea id="cb-input" rows="1" data-i18n-placeholder="inputPlaceholder" placeholder="' + I.t("inputPlaceholder") + '"></textarea>\n'+
      '  <button id="cb-send" data-i18n="send">' + I.t("send") + '</button>\n'+
      '</div>\n'
    );

    document.body.appendChild(root);
    return root;
  }

  // ── Cache refs ─────────────────────────────────────────────────
  function cacheAll() {
    return {
      root: $("chat-bridge-root"), grabber: $("cb-grabber"), dot: $("cb-dot"),
      toggleBtn: $("cb-toggle"), streamToggle: $("cb-stream-toggle"), langToggle: $("cb-lang-toggle"),
      apiHeader: $("cb-api-header"), apiArrow: $("cb-api-arrow"), apiBody: $("cb-api-body"),
      url: $("cb-url"), key: $("cb-key"), keyToggle: $("cb-key-toggle"),
      model: $("cb-model"), modelList: $("cb-model-list"), refreshBtn: $("cb-refresh-models"),
      sys: $("cb-sys"), saveBtn: $("cb-save-config"),
      ctxHeader: $("cb-ctx-header"), ctxArrow: $("cb-ctx-arrow"), ctxBody: $("cb-ctx-body"),
      ctxWorkflow: $("cb-ctx-workflow"), ctxNodes: $("cb-ctx-nodes"),
      ctxDialogError: $("cb-ctx-dialog-error"), ctxConsoleError: $("cb-ctx-console-error"),
      appearanceHeader: $("cb-appearance-header"), appearanceArrow: $("cb-appearance-arrow"), appearanceBody: $("cb-appearance-body"),
      fontSize: $("cb-font-size"), fontSizeVal: $("cb-font-size-val"),
      panelWidth: $("cb-panel-width"), panelWidthVal: $("cb-panel-width-val"),
      paramsHeader: $("cb-params-header"), paramsArrow: $("cb-params-arrow"), paramsBody: $("cb-params-body"),
      temp: $("cb-temp"), tempVal: $("cb-temp-val"),
      maxTok: $("cb-maxtok"), maxTokVal: $("cb-maxtok-val"),
      topk: $("cb-topk"), topkVal: $("cb-topk-val"),
      topp: $("cb-topp"), toppVal: $("cb-topp-val"),
      clearBtn: $("cb-clear-history"), saveBtn2: $("cb-save-history"),
      imgBar: $("cb-img-bar"), imgCanvasBtn: $("cb-img-canvas"),
      imgCount: $("cb-img-count"), imgList: $("cb-img-list"), imgClear: $("cb-img-clear"),
      messages: $("cb-messages"), input: $("cb-input"), sendBtn: $("cb-send"),
    };
  }

  // ── UI helpers ─────────────────────────────────────────────────
  function toggleSection(hdr, arr, body) { body.classList.toggle("open"); arr.classList.toggle("open"); }

  function addMsg(role, text) {
    var msgs = $("cb-messages"); if (!msgs) return null;
    var d = document.createElement("div"); d.className = "cb-msg " + role;
    d.textContent = text; msgs.appendChild(d); scrollBottom(msgs); return d;
  }

  function addHtmlMsg(role, html) {
    var msgs = $("cb-messages"); if (!msgs) return null;
    var d = document.createElement("div"); d.className = "cb-msg " + role;
    d.innerHTML = html; msgs.appendChild(d); scrollBottom(msgs); return d;
  }

  function isVisible(el) { var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.left > 50; }

  // ── Image bar ──────────────────────────────────────────────────
  function updateImageBar() {
    var $ = cacheAll();
    var sel = imageStore.filter(function(x){ return x.selected; });
    if (imageStore.length === 0) { if ($.imgBar) $.imgBar.classList.remove("show"); return; }
    if ($.imgBar) $.imgBar.classList.add("show");
    if ($.imgCount) $.imgCount.textContent = sel.length + " / " + imageStore.length + " " + I.t("imgCount");
    if ($.imgList) {
      $.imgList.innerHTML = "";
      imageStore.forEach(function(e, i) {
        var chip = document.createElement("div");
        chip.className = e.selected ? "cb-img-chip" : "cb-img-chip deselected";
        var img = document.createElement("img"); img.src = e.dataUrl;
        var rm = document.createElement("span"); rm.className = "cb-img-rm"; rm.textContent = "×";
        rm.addEventListener("click", function(ev){ ev.stopPropagation(); imageStore.splice(i,1); updateImageBar(); });
        chip.appendChild(img); chip.appendChild(rm);
        chip.addEventListener("click", function(ev){ if(ev.target===rm) return; e.selected=!e.selected; updateImageBar(); });
        $.imgList.appendChild(chip);
      });
    }
  }

  function captureCanvasImages() {
    try {
      var cs = document.querySelectorAll("canvas"), cnt = 0;
      for (var i = 0; i < cs.length; i++) {
        if (cs[i].width > 32 && cs[i].height > 32 && isVisible(cs[i])) {
          try { imageStore.push({ dataUrl: cs[i].toDataURL("image/jpeg", 0.7), source: "canvas", selected: true }); cnt++; if (cnt >= 6) break; } catch {}
        }
      }
      if (cnt > 0) { updateImageBar(); addMsg("system", I.tReplace("imgCaptured", "N", cnt)); }
      else addMsg("system", I.t("noCanvasImg"));
    } catch(e) { addMsg("system", I.t("captureFailed") + " " + e.message); }
  }

  function setupPasteHandler() {
    var $ = cacheAll();
    document.addEventListener("paste", function(e) {
      if (!$.root || $.root.classList.contains("collapsed")) return;
      var items = e.clipboardData && e.clipboardData.items; if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          e.preventDefault();
          var reader = new FileReader();
          reader.onload = function() { imageStore.push({ dataUrl: reader.result, source: "paste", selected: true }); updateImageBar(); };
          reader.readAsDataURL(items[i].getAsFile()); break;
        }
      }
    });
  }

  // ── Code copy ──────────────────────────────────────────────────
  function setupCodeCopy() {
    var msgs = $("cb-messages"); if (!msgs) return;
    msgs.addEventListener("click", function(e) {
      var btn = e.target.closest(".cb-copy-btn"); if (!btn) return;
      var block = btn.closest(".cb-code-block"); if (!block) return;
      var code = block.querySelector("code"); var txt = code ? code.textContent : "";
      navigator.clipboard.writeText(txt).then(function(){
        btn.textContent="✓"; btn.classList.add("copied"); btn.title = I.t("copied");
        setTimeout(function(){ btn.textContent="📋"; btn.classList.remove("copied"); btn.title = I.t("copyCode"); }, 1500);
      }).catch(function(){
        var ta = document.createElement("textarea"); ta.value = txt;
        ta.style.cssText = "position:fixed;opacity:0;"; document.body.appendChild(ta);
        ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
        btn.textContent="✓"; btn.classList.add("copied"); btn.title = I.t("copied");
        setTimeout(function(){ btn.textContent="📋"; btn.classList.remove("copied"); btn.title = I.t("copyCode"); }, 1500);
      });
    });
  }

  // ── Context collection ─────────────────────────────────────────
  function collectContext() {
    var $ = cacheAll();
    var ctx = { workflow_json: null, selected_nodes: null, dialog_error: null, console_error: null, images: null, summary: null };

    if ($.ctxWorkflow && $.ctxWorkflow.checked) {
      try { if (window.app && window.app.graph) ctx.workflow_json = JSON.stringify(window.app.graph.serialize(), null, 2); } catch {}
    }
    if ($.ctxNodes && $.ctxNodes.checked) {
      try {
        if (window.app && window.app.canvas && window.app.canvas.selected_nodes) {
          var sel = {};
          for (var id in window.app.canvas.selected_nodes) {
            var n = window.app.canvas.selected_nodes[id];
            sel[id] = { type: n.type, title: n.title, inputs: n.inputs && n.inputs.map(function(i){ return { name: i.name, value: i.value }; }), outputs: n.outputs && n.outputs.map(function(o){ return { name: o.name }; }) };
          }
          if (Object.keys(sel).length > 0) ctx.selected_nodes = JSON.stringify(sel, null, 2);
        }
      } catch {}
    }
    if ($.ctxDialogError && $.ctxDialogError.checked && recentDialogError) ctx.dialog_error = recentDialogError;
    if ($.ctxConsoleError && $.ctxConsoleError.checked && recentConsoleError) ctx.console_error = recentConsoleError;

    var selImgs = imageStore.filter(function(x){ return x.selected; }).map(function(x){ return x.dataUrl; });
    if (selImgs.length > 0) ctx.images = selImgs;

    // Merge errors for the API payload (backward compat with server's "recent_error" field)
    var mergedErrors = [];
    if (ctx.dialog_error) mergedErrors.push(I.t("dialogErrorLabel") + "\n" + ctx.dialog_error);
    if (ctx.console_error) mergedErrors.push(I.t("consoleErrorLabel") + "\n" + ctx.console_error);
    ctx.recent_error = mergedErrors.length > 0 ? mergedErrors.join("\n\n") : null;

    var parts = [];
    if (ctx.workflow_json) parts.push(I.t("workflowLabel"));
    if (ctx.selected_nodes) parts.push(I.t("nodesLabel"));
    if (ctx.images) parts.push(ctx.images.length + " " + I.t("imagesLabel"));
    if (ctx.dialog_error) parts.push(I.t("dialogErrorLabel"));
    if (ctx.console_error) parts.push(I.t("consoleErrorLabel"));
    ctx.summary = parts.length > 0 ? parts.join(" + ") : null;

    return ctx;
  }

  // ── Send ───────────────────────────────────────────────────────
  async function sendMessage() {
    var $ = cacheAll();
    var msg = $.input.value.trim(); if (isLoading || !msg) return;
    var url = ($.url.value || "").trim();
    if (!url) { addMsg("error", I.t("needApiUrl")); return; }

    var streamOn = $.streamToggle.classList.contains("active");
    isLoading = true; $.sendBtn.disabled = true;
    addMsg("user", msg); history.push({ role: "user", content: msg });
    $.input.value = ""; $.input.style.height = "auto";

    var ctx = collectContext();
    var body = {
      base_url: url, api_key: ($.key.value || "").trim(),
      model: ($.model.value || "").trim() || "auto",
      message: msg, history: history.slice(0, -1),
      system_prompt: ($.sys.value || "").trim(),
      temperature: parseFloat($.temp.value), max_tokens: parseInt($.maxTok.value),
      top_k: parseInt($.topk.value), top_p: parseFloat($.topp.value),
      workflow_json: ctx.workflow_json, selected_nodes: ctx.selected_nodes,
      recent_error: ctx.recent_error, images: ctx.images, context_summary: ctx.summary,
    };

    imageStore = []; updateImageBar();

    if (streamOn) await sendStream(body, ctx);
    else await sendNonStream(body, ctx);

    isLoading = false; $.sendBtn.disabled = false; $.input.focus();
  }

  async function sendNonStream(body, ctx) {
    var think = addMsg("thinking", I.t("thinking"));
    try {
      var res = await fetch("/api/chat-bridge/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      think.remove();
      if (!res.ok) { var ed = await res.json().catch(function(){ return {}; }); addMsg("error", ed.reply || I.t("serverError") + " " + res.status); return; }
      var d = await res.json();
      if (d.error && !d.reply) { addMsg("error", d.error); history.push({ role: "assistant", content: d.error }); }
      else if (d.reply && d.reply.startsWith("Error")) { addMsg("error", d.reply); history.push({ role: "assistant", content: d.reply }); }
      else { if (ctx.summary) addMsg("system", I.t("sentContext") + " " + ctx.summary); addHtmlMsg("ai", renderMarkdown(d.reply)); history.push({ role: "assistant", content: d.reply }); }
    } catch(e) { think.remove(); addMsg("error", I.t("networkError") + " " + e.message); }
  }

  async function sendStream(body, ctx) {
    var msgs = $("cb-messages");
    var div = document.createElement("div"); div.className = "cb-msg ai"; msgs.appendChild(div); scrollBottom(msgs);
    var full = "";
    try {
      var res = await fetch("/api/chat-bridge/chat/stream", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { div.className = "cb-msg error"; div.textContent = I.t("serverError") + " " + res.status; history.push({ role: "assistant", content: I.t("serverError") + " " + res.status }); return; }
      var reader = res.body.getReader(), decoder = new TextDecoder(), buf = "";
      while (true) {
        var r = await reader.read(); if (r.done) break;
        buf += decoder.decode(r.value, { stream: true });
        var lines = buf.split("\n"); buf = lines.pop() || "";
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i]; if (!line.startsWith("data: ")) continue;
          var json = line.slice(6).trim(); if (json === "[DONE]") continue;
          try {
            var d = JSON.parse(json);
            if (d.error) { div.className = "cb-msg error"; div.textContent = "Error: " + d.error; full = "Error: " + d.error; }
            else if (d.text) { full += d.text; div.innerHTML = renderMarkdown(full); }
            if (d.done && ctx.summary) addMsg("system", I.t("sentContext") + " " + ctx.summary);
          } catch {}
        }
        scrollBottom(msgs);
      }
    } catch(e) { if (!full) { div.className = "cb-msg error"; div.textContent = I.t("networkError") + " " + e.message; full = I.t("networkError") + " " + e.message; } }
    history.push({ role: "assistant", content: full });
  }

  // ── Clear / Save ──────────────────────────────────────────────
  function clearHistory() {
    var $ = cacheAll(); history = []; imageStore = []; updateImageBar();
    if ($.messages) $.messages.innerHTML = ""; addMsg("system", I.t("historyCleared"));
  }

  function saveHistory() {
    if (history.length === 0) { addMsg("system", I.t("nothingToSave")); return; }
    var ts = new Date().toISOString().replace(/[:.]/g,"-").slice(0,19);
    var txt = "AI Chat Bridge\nSaved: " + new Date().toLocaleString() + "\n──────────\n\n";
    history.forEach(function(h){ if(h.role==="user") txt += "[You] " + h.content + "\n\n"; else txt += "[AI] " + h.content + "\n\n"; });
    var blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "chat-bridge-" + ts + ".txt";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    addMsg("system", I.t("savedFile") + " " + a.download);
  }

  // ── Refresh models ────────────────────────────────────────────
  async function refreshModels() {
    var $ = cacheAll();
    var url = ($.url.value || "").trim();
    if (!url) { addMsg("system", I.t("needUrl")); return; }
    $.refreshBtn.textContent = "⏳"; $.refreshBtn.disabled = true;
    try {
      var res = await fetch("/api/chat-bridge/models", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ base_url: url, api_key: ($.key.value || "").trim() }) });
      var d = await res.json();
      if (d.models && d.models.length > 0) {
        modelList = d.models;
        if ($.modelList) { $.modelList.innerHTML = ""; d.models.forEach(function(m){ var o = document.createElement("option"); o.value = m; $.modelList.appendChild(o); }); }
        addMsg("system", I.tReplace("modelsLoaded", "N", d.models.length));
      } else { addMsg("system", I.t("noModels")); modelList = []; }
    } catch(e) { addMsg("system", I.t("fetchFailed") + " " + e.message); }
    $.refreshBtn.textContent = "🔄"; $.refreshBtn.disabled = false;
  }

  // ── Apply config ──────────────────────────────────────────────
  function applyConfig(cfg) {
    var $ = cacheAll();

    // Language
    I.setLang(cfg.lang || "zh");

    // Font & panel width
    $.root.style.setProperty("--cb-font-size", (cfg.font_size || 13) + "px");
    $.root.style.setProperty("--cb-panel-width", (cfg.panel_width || 390) + "px");

    // API
    $.url.value = cfg.base_url || ""; $.key.value = cfg.api_key || "";
    $.model.value = cfg.model || ""; $.sys.value = cfg.system_prompt || "";

    // Params
    $.temp.value = cfg.temperature; $.tempVal.textContent = cfg.temperature.toFixed(1);
    $.maxTok.value = cfg.max_tokens; $.maxTokVal.textContent = cfg.max_tokens;
    $.topk.value = cfg.top_k; $.topkVal.textContent = cfg.top_k;
    $.topp.value = cfg.top_p; $.toppVal.textContent = cfg.top_p.toFixed(2);

    // Context
    $.ctxWorkflow.checked = cfg.context_workflow;
    $.ctxNodes.checked = cfg.context_nodes;
    if ($.ctxDialogError) $.ctxDialogError.checked = cfg.context_dialog_error;
    if ($.ctxConsoleError) $.ctxConsoleError.checked = cfg.context_console_error;

    // Appearance
    $.fontSize.value = cfg.font_size || 13; $.fontSizeVal.textContent = cfg.font_size || 13;
    $.panelWidth.value = cfg.panel_width || 390; $.panelWidthVal.textContent = cfg.panel_width || 390;

    // Stream
    if (cfg.stream_enabled) { $.streamToggle.classList.add("active"); $.streamToggle.textContent = "🌊"; }
    else { $.streamToggle.classList.remove("active"); $.streamToggle.textContent = "📄"; }

    // Sections
    if (!cfg.api_collapsed) { $.apiBody.classList.add("open"); $.apiArrow.classList.add("open"); }
    if (!cfg.params_collapsed) { $.paramsBody.classList.add("open"); $.paramsArrow.classList.add("open"); }
    if (!cfg.context_collapsed) { $.ctxBody.classList.add("open"); $.ctxArrow.classList.add("open"); }
    if (!cfg.appearance_collapsed) { $.appearanceBody.classList.add("open"); $.appearanceArrow.classList.add("open"); }
    if (cfg.panel_collapsed) { $.root.classList.add("collapsed"); $.toggleBtn.textContent = "▶"; }

    refreshUIText();
  }

  function saveConfigFromUI() {
    var $ = cacheAll();
    saveConfig({
      base_url: ($.url.value||"").trim(), api_key: ($.key.value||"").trim(),
      model: ($.model.value||"").trim(), system_prompt: ($.sys.value||"").trim(),
      temperature: parseFloat($.temp.value), max_tokens: parseInt($.maxTok.value),
      top_k: parseInt($.topk.value), top_p: parseFloat($.topp.value),
      stream_enabled: $.streamToggle.classList.contains("active"),
      context_workflow: $.ctxWorkflow.checked, context_nodes: $.ctxNodes.checked,
      context_dialog_error: $.ctxDialogError ? $.ctxDialogError.checked : true,
      context_console_error: $.ctxConsoleError ? $.ctxConsoleError.checked : true,
      font_size: parseInt($.fontSize.value), panel_width: parseInt($.panelWidth.value),
      lang: I.getLang(),
      panel_collapsed: $.root.classList.contains("collapsed"),
      api_collapsed: !$.apiBody.classList.contains("open"),
      params_collapsed: !$.paramsBody.classList.contains("open"),
      context_collapsed: !$.ctxBody.classList.contains("open"),
      appearance_collapsed: !$.appearanceBody.classList.contains("open"),
    });
    addMsg("system", I.t("configSaved"));
  }

  // ── Collapse / Expand ─────────────────────────────────────────
  function collapsePanel() { var $ = cacheAll(); $.root.classList.add("collapsed"); $.toggleBtn.textContent = "▶"; saveConfigFromUI(); }
  function expandPanel() { var $ = cacheAll(); $.root.classList.remove("collapsed"); $.toggleBtn.textContent = "◀"; saveConfigFromUI(); }

  // ── Error hooks ────────────────────────────────────────────────
  function hookDialogErrors() {
    (function chk(){
      if (window.app && window.app.ui && window.app.ui.dialog && window.app.ui.dialog.show) {
        var orig = window.app.ui.dialog.show.bind(window.app.ui.dialog);
        window.app.ui.dialog.show = function(html) {
          var tmp = document.createElement("div"); tmp.innerHTML = html;
          var txt = (tmp.textContent || tmp.innerText || html).trim();
          if (txt && txt.length > 10 && !txt.includes("Queue prompt") && !txt.includes("Prompt executed")) {
            recentDialogError = txt.slice(0, 4000);
          }
          return orig(html);
        };
        console.log("[ChatBridge] Dialog error hook active.");
      } else { setTimeout(chk, 500); }
    })();
  }

  function hookConsoleErrors() {
    var origError = console.error.bind(console);
    var origWarn = console.warn.bind(console);

    console.error = function() {
      var args = Array.prototype.slice.call(arguments);
      var msg = args.join(" ");
      if (msg.length > 10 && !/queue/i.test(msg) && !/prompt executed/i.test(msg)) {
        recentConsoleError = (recentConsoleError ? recentConsoleError + "\n" : "") + msg.slice(0, 1000);
        if (recentConsoleError.length > 4000) recentConsoleError = recentConsoleError.slice(-4000);
      }
      return origError.apply(console, arguments);
    };

    console.warn = function() {
      var args = Array.prototype.slice.call(arguments);
      var msg = args.join(" ");
      if (msg.length > 10 && /missing|failed|error|exception/i.test(msg)) {
        recentConsoleError = (recentConsoleError ? recentConsoleError + "\n" : "") + msg.slice(0, 1000);
        if (recentConsoleError.length > 4000) recentConsoleError = recentConsoleError.slice(-4000);
      }
      return origWarn.apply(console, arguments);
    };

    console.log("[ChatBridge] Console error hook active.");
  }

  // ── Init ───────────────────────────────────────────────────────
  function init() {
    buildPanel();
    var $ = cacheAll();
    var cfg = loadConfig();

    // Set language from config before applying UI
    I.setLang(cfg.lang || "zh");
    applyConfig(cfg);

    setupCodeCopy();

    // Panel collapse
    $.toggleBtn.addEventListener("click", collapsePanel);
    $.grabber.addEventListener("click", expandPanel);

    // Language toggle
    $.langToggle.addEventListener("click", function(e){
      e.stopPropagation();
      I.toggleLang();
      refreshUIText();
      saveConfigFromUI();
    });

    // Section toggles
    $.apiHeader.addEventListener("click", function(){ toggleSection($.apiHeader, $.apiArrow, $.apiBody); saveConfigFromUI(); });
    $.ctxHeader.addEventListener("click", function(){ toggleSection($.ctxHeader, $.ctxArrow, $.ctxBody); saveConfigFromUI(); });
    $.appearanceHeader.addEventListener("click", function(){ toggleSection($.appearanceHeader, $.appearanceArrow, $.appearanceBody); saveConfigFromUI(); });
    $.paramsHeader.addEventListener("click", function(){ toggleSection($.paramsHeader, $.paramsArrow, $.paramsBody); saveConfigFromUI(); });

    $.keyToggle.addEventListener("click", function(){
      var isPw = $.key.type === "password"; $.key.type = isPw ? "text" : "password"; $.keyToggle.textContent = isPw ? "🙈" : "👁";
    });

    $.saveBtn.addEventListener("click", saveConfigFromUI);
    [$.url, $.key, $.model, $.sys].forEach(function(el){ el.addEventListener("blur", saveConfigFromUI); });

    // Sliders
    $.temp.addEventListener("input", function(){ $.tempVal.textContent = parseFloat($.temp.value).toFixed(1); });
    $.maxTok.addEventListener("input", function(){ $.maxTokVal.textContent = $.maxTok.value; });
    $.topk.addEventListener("input", function(){ $.topkVal.textContent = $.topk.value; });
    $.topp.addEventListener("input", function(){ $.toppVal.textContent = parseFloat($.topp.value).toFixed(2); });
    $.fontSize.addEventListener("input", function(){
      $.fontSizeVal.textContent = $.fontSize.value;
      $.root.style.setProperty("--cb-font-size", $.fontSize.value + "px");
    });
    $.panelWidth.addEventListener("input", function(){
      $.panelWidthVal.textContent = $.panelWidth.value;
      $.root.style.setProperty("--cb-panel-width", $.panelWidth.value + "px");
    });

    [$.temp, $.maxTok, $.topk, $.topp, $.fontSize, $.panelWidth].forEach(function(el){ el.addEventListener("change", saveConfigFromUI); });
    [$.ctxWorkflow, $.ctxNodes, $.ctxDialogError, $.ctxConsoleError].forEach(function(el){ if(el) el.addEventListener("change", saveConfigFromUI); });

    // Stream toggle
    $.streamToggle.addEventListener("click", function(e){
      e.stopPropagation();
      $.streamToggle.classList.toggle("active");
      $.streamToggle.textContent = $.streamToggle.classList.contains("active") ? "🌊" : "📄";
      saveConfigFromUI();
    });

    $.clearBtn.addEventListener("click", clearHistory);
    $.saveBtn2.addEventListener("click", saveHistory);

    setupPasteHandler();
    $.imgCanvasBtn.addEventListener("click", captureCanvasImages);
    $.imgClear.addEventListener("click", function(){ imageStore = []; updateImageBar(); });

    $.refreshBtn.addEventListener("click", refreshModels);

    $.sendBtn.addEventListener("click", function(){ sendMessage(); });
    $.input.addEventListener("keydown", function(e){ if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    $.input.addEventListener("input", function(){ $.input.style.height = "auto"; $.input.style.height = Math.min($.input.scrollHeight, 100) + "px"; });

    hookDialogErrors();
    hookConsoleErrors();

    setInterval(function(){
      if ($.dot) {
        fetch("/api/chat-bridge/models", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ base_url: "http://localhost:1/v1", api_key: "" }) })
          .then(function(){ $.dot.classList.add("on"); }).catch(function(){ $.dot.classList.remove("on"); });
      }
    }, 30000);

    console.log("[ChatBridge] Panel ready. Lang:", I.getLang(), "Font:", cfg.font_size, "Width:", cfg.panel_width);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
