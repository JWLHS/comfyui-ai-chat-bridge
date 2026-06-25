/**
 * chat-bridge-css.js — Static CSS for AI Chat Bridge
 * Exposes: window.ChatBridgeCSS = "<style>...</style>"
 * Font size / panel width controlled via CSS custom properties:
 *   --cb-font-size   (default: 13px)
 *   --cb-panel-width (default: 390px)
 */
(function() {
  "use strict";

  var CSS = '\n<style>\n'+
'#chat-bridge-root{isolation:isolate;--cb-font-size:13px;--cb-panel-width:390px;}\n'+
'#chat-bridge-root,#chat-bridge-root *{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;padding:0;}\n'+
'#chat-bridge-root.cb-root{position:fixed!important;right:0!important;top:0!important;bottom:0!important;left:auto!important;width:var(--cb-panel-width)!important;max-width:100vw!important;background:#0d0d0d!important;color:#ddd!important;z-index:99999!important;display:flex!important;flex-direction:column!important;border-left:1px solid #2a2a2a!important;font-size:var(--cb-font-size)!important;box-shadow:-4px 0 20px rgba(0,0,0,0.5)!important;}\n'+
'#chat-bridge-root.cb-root.cb-hidden{transform:translateX(calc(100% + 20px))!important;opacity:0!important;pointer-events:none!important;transition:transform 0.3s ease,opacity 0.3s ease!important;}\n'+
'#chat-bridge-root.cb-root:not(.cb-hidden){transform:translateX(0)!important;opacity:1!important;pointer-events:auto!important;transition:transform 0.3s ease,opacity 0.3s ease!important;}\n'+
'.cb-grabber{display:none!important;}\n'+
'.cb-titlebar{display:flex;align-items:center;gap:8px;padding:6px 10px;background:#141414;border-bottom:1px solid #2a2a2a;flex-shrink:0;user-select:none;}\n'+
'.cb-titlebar .cb-dot{width:7px;height:7px;border-radius:50%;background:#555;flex-shrink:0;}\n'+
'.cb-titlebar .cb-dot.on{background:#22c55e;}\n'+
'.cb-title-text{flex:1;font-weight:600;font-size:calc(var(--cb-font-size) + 1px);color:#eee;}\n'+
'.cb-titlebar button{padding:2px 8px;border-radius:4px;border:1px solid #333;background:transparent;color:#aaa;cursor:pointer;font-size:calc(var(--cb-font-size) - 1px);}\n'+
'.cb-titlebar button:hover{background:#222;color:#fff;}\n'+
'.cb-titlebar button.active{background:#7c3aed;border-color:#7c3aed;color:#fff;}\n'+
'.cb-section{border-bottom:1px solid #2a2a2a;flex-shrink:0;}\n'+
'.cb-section-header{display:flex;align-items:center;gap:6px;padding:5px 10px;background:#141414;cursor:pointer;user-select:none;font-size:calc(var(--cb-font-size) - 1px);color:#999;}\n'+
'.cb-section-header:hover{background:#1a1a1a;}\n'+
'.cb-section-header .cb-arrow{font-size:calc(var(--cb-font-size) - 3px);transition:transform 0.2s;display:inline-block;}\n'+
'.cb-section-header .cb-arrow.open{transform:rotate(90deg);}\n'+
'.cb-section-body{display:none;padding:6px 10px;background:#0a0a0a;}\n'+
'.cb-section-body.open{display:block;}\n'+
'.cb-row{display:flex;align-items:center;gap:6px;margin-bottom:5px;}\n'+
'.cb-row label{font-size:calc(var(--cb-font-size) - 2px);color:#888;width:52px;flex-shrink:0;text-align:right;}\n'+
'.cb-row input,.cb-row select{flex:1;padding:4px 6px;border-radius:4px;border:1px solid #333;background:#141414;color:#ddd;font-size:calc(var(--cb-font-size) - 1px);font-family:monospace;}\n'+
'.cb-row input:focus,.cb-row select:focus{outline:none;border-color:#7c3aed;}\n'+
'.cb-row input[type="range"]{flex:1;height:3px;-webkit-appearance:none;appearance:none;background:#333;border:none;border-radius:2px;cursor:pointer;padding:0;}\n'+
'.cb-row input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:10px;height:10px;border-radius:50%;background:#7c3aed;cursor:pointer;}\n'+
'.cb-row .cb-val{font-size:calc(var(--cb-font-size) - 3px);color:#aaa;width:28px;text-align:left;font-family:monospace;flex-shrink:0;}\n'+
'.cb-btn{padding:4px 10px;border-radius:4px;border:1px solid #333;background:#141414;color:#ccc;cursor:pointer;font-size:calc(var(--cb-font-size) - 1px);white-space:nowrap;}\n'+
'.cb-btn:hover{background:#222;}\n'+
'.cb-btn.primary{background:#7c3aed;border-color:#7c3aed;color:#fff;}\n'+
'.cb-btn.primary:hover{background:#6d28d9;}\n'+
'.cb-btn.small{padding:2px 6px;font-size:calc(var(--cb-font-size) - 2px);}\n'+
'#cb-toolbar{display:flex;align-items:center;gap:6px;padding:4px 10px;border-bottom:1px solid #2a2a2a;flex-shrink:0;background:#0a0a0a;}\n'+
'#cb-toolbar .cb-spacer{flex:1;}\n'+
'#cb-img-bar{display:none;padding:4px 10px;border-bottom:1px solid #2a2a2a;flex-shrink:0;background:#0a0a0a;gap:6px;align-items:center;}\n'+
'#cb-img-bar.show{display:flex;}\n'+
'#cb-img-bar span{font-size:calc(var(--cb-font-size) - 2px);color:#888;flex:1;}\n'+
'#cb-img-list{display:flex;gap:4px;overflow-x:auto;}\n'+
'.cb-img-chip{width:36px;height:36px;border-radius:4px;overflow:hidden;border:2px solid #7c3aed;flex-shrink:0;position:relative;cursor:pointer;transition:opacity 0.15s,border-color 0.15s;}\n'+
'.cb-img-chip.deselected{border-color:#333;opacity:0.3;}\n'+
'.cb-img-chip img{width:100%;height:100%;object-fit:cover;}\n'+
'.cb-img-chip .cb-img-rm{position:absolute;top:0;right:0;background:rgba(0,0,0,0.85);color:#f44;font-size:10px;width:14px;height:14px;text-align:center;line-height:14px;cursor:pointer;border-radius:0 0 0 2px;}\n'+
'#cb-messages{flex:1;overflow-y:auto;padding:8px 10px;display:flex;flex-direction:column;gap:6px;}\n'+
'.cb-msg{padding:7px 9px;border-radius:6px;max-width:92%;line-height:1.45;white-space:pre-wrap;word-break:break-word;font-size:calc(var(--cb-font-size) - 1px);}\n'+
'.cb-msg.user{align-self:flex-end;background:#7c3aed;color:#fff;}\n'+
'.cb-msg.ai{align-self:flex-start;background:#1a1a1a;border:1px solid #252525;}\n'+
'.cb-msg.ai code{background:#0d0d0d;padding:1px 4px;border-radius:3px;font-size:calc(var(--cb-font-size) - 2px);font-family:"SF Mono",Consolas,monospace;color:#e879f9;}\n'+
'.cb-msg.ai pre{background:#0d0d0d;padding:8px;border-radius:4px;overflow-x:auto;margin:0;border:1px solid #222;}\n'+
'.cb-msg.ai pre code{background:none;padding:0;font-size:calc(var(--cb-font-size) - 2px);color:#ccc;}\n'+
'.cb-msg.thinking{align-self:flex-start;color:#666;font-style:italic;background:transparent;}\n'+
'.cb-msg.error{align-self:flex-start;color:#ef4444;background:#1a0000;border:1px solid #3a0000;}\n'+
'.cb-msg.system{align-self:center;color:#555;font-size:calc(var(--cb-font-size) - 2px);background:transparent;text-align:center;max-width:100%;}\n'+
'.cb-code-block{position:relative;margin:4px 0;}\n'+
'.cb-code-block .cb-copy-btn{position:absolute;top:4px;right:4px;padding:2px 6px;border-radius:3px;border:1px solid #444;background:#1a1a1a;color:#999;cursor:pointer;font-size:calc(var(--cb-font-size) - 2px);opacity:0;transition:opacity 0.15s;z-index:2;}\n'+
'.cb-code-block:hover .cb-copy-btn{opacity:1;}\n'+
'.cb-code-block .cb-copy-btn:hover{background:#333;color:#fff;}\n'+
'.cb-code-block .cb-copy-btn.copied{color:#22c55e;border-color:#22c55e;}\n'+
'.cb-thinking{margin:4px 0;}\n'+
'.cb-thinking summary{cursor:pointer;color:#a78bfa;font-size:calc(var(--cb-font-size) - 2px);padding:2px 0;user-select:none;list-style:none;}\n'+
'.cb-thinking summary::before{content:"▶ ";font-size:calc(var(--cb-font-size) - 4px);}\n'+
'.cb-thinking[open] summary::before{content:"▼ ";}\n'+
'.cb-thinking div{margin-top:4px;padding:6px 8px;background:#0d0d0d;border-left:2px solid #7c3aed;border-radius:0 4px 4px 0;font-size:calc(var(--cb-font-size) - 2px);color:#999;line-height:1.4;max-height:200px;overflow-y:auto;}\n'+
'#cb-input-area{display:flex;padding:6px 8px;border-top:1px solid #2a2a2a;gap:6px;flex-shrink:0;background:#0d0d0d;align-items:flex-end;}\n'+
'#cb-input{flex:1;padding:6px 8px;border-radius:6px;border:1px solid #333;background:#141414;color:#eee;font-size:var(--cb-font-size);resize:none;min-height:20px;max-height:100px;font-family:inherit;}\n'+
'#cb-input:focus{outline:none;border-color:#7c3aed;}\n'+
'#cb-send{padding:7px 14px;border-radius:6px;border:none;background:#7c3aed;color:#fff;cursor:pointer;font-size:var(--cb-font-size);font-weight:500;white-space:nowrap;}\n'+
'#cb-send:hover{background:#6d28d9;}\n'+
'#cb-send:disabled{background:#333;color:#666;cursor:default;}\n'+
'#cb-messages::-webkit-scrollbar{width:4px;}\n'+
'#cb-messages::-webkit-scrollbar-track{background:transparent;}\n'+
'#cb-messages::-webkit-scrollbar-thumb{background:#333;border-radius:2px;}\n'+
'\n/* ── Floating ball ── */\n'+
'#cb-ball{position:fixed!important;right:12px!important;top:50%!important;transform:translateY(-50%)!important;width:44px!important;height:44px!important;border-radius:50%!important;background:#1a1a1a!important;border:2px solid #333!important;cursor:grab!important;z-index:99998!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:22px!important;user-select:none!important;box-shadow:0 2px 12px rgba(0,0,0,0.5)!important;transition:border-color 0.3s,box-shadow 0.3s!important;}\n'+
'#cb-ball:active{cursor:grabbing!important;}\n'+
'#cb-ball.green{border-color:#22c55e!important;box-shadow:0 0 8px rgba(34,197,94,0.4)!important;}\n'+
'#cb-ball.purple{border-color:#a78bfa!important;box-shadow:0 0 8px rgba(167,139,250,0.4)!important;}\n'+
'#cb-ball.yellow{border-color:#f59e0b!important;box-shadow:0 0 8px rgba(245,158,11,0.4)!important;}\n'+
'#cb-ball.red{border-color:#ef4444!important;box-shadow:0 0 8px rgba(239,68,68,0.4)!important;}\n'+
'#cb-ball .cb-ball-badge{position:absolute!important;top:-4px!important;right:-4px!important;min-width:18px!important;height:18px!important;border-radius:9px!important;background:#ef4444!important;color:#fff!important;font-size:10px!important;line-height:18px!important;text-align:center!important;font-weight:700!important;display:none!important;padding:0 4px!important;}\n'+
'#cb-ball .cb-ball-badge.show{display:block!important;}\n'+
'\n/* ── Context chips above input ── */\n'+
'#cb-ctx-bar{display:flex!important;gap:4px!important;padding:4px 8px!important;flex-wrap:wrap!important;border-top:1px solid #222!important;flex-shrink:0!important;background:#0a0a0a!important;}\n'+
'.cb-ctx-chip{padding:3px 8px!important;border-radius:12px!important;border:1px solid #333!important;background:#141414!important;color:#666!important;cursor:pointer!important;font-size:calc(var(--cb-font-size) - 2px)!important;white-space:nowrap!important;transition:all 0.15s!important;user-select:none!important;}\n'+
'.cb-ctx-chip:hover{border-color:#555!important;color:#aaa!important;}\n'+
'.cb-ctx-chip.active{background:#7c3aed!important;border-color:#7c3aed!important;color:#fff!important;}\n'+
'\n/* ── Close button ── */\n'+
'#cb-close-panel{background:transparent!important;border:none!important;color:#888!important;cursor:pointer!important;font-size:calc(var(--cb-font-size) + 2px)!important;padding:0 4px!important;line-height:1!important;}\n'+
'#cb-close-panel:hover{color:#fff!important;}\n'+
'.cb-ctx-chip.has-errors{border-color:#f59e0b!important;color:#f59e0b!important;}\n'+
'</style>\n';

  window.ChatBridgeCSS = {
    get: function() { return CSS; }
  };
})();
