/**
 * chat-bridge-i18n.js — Chinese/English translations for AI Chat Bridge
 * Exposes: window.ChatBridgeI18N = { zh: {...}, en: {...} }
 */
(function() {
  "use strict";

  var DICT = {
    zh: {
      // Title bar
      title: "AI Chat Bridge",
      streamOn: "流式: 开",
      streamOff: "流式: 关",
      hidePanel: "隐藏面板",
      showPanel: "展开面板",
      grabberText: "AI Chat Bridge ▶",

      // API section
      apiHeader: "API 配置",
      url: "URL",
      urlPlaceholder: "如 http://localhost:11434/v1",
      key: "密钥",
      keyPlaceholder: "not-needed",
      model: "模型",
      modelPlaceholder: "auto / 模型名",
      prompt: "提示词",
      promptPlaceholder: "系统提示词（可选）",
      saveConfig: "保存配置",
      fetchModels: "获取模型列表",

      // Appearance section
      appearanceHeader: "外观",
      fontSize: "字体大小",
      panelWidth: "面板宽度",

      // Params section
      paramsHeader: "推理参数",
      temp: "温度",
      maxTok: "最大Token",
      topK: "Top-K",
      topP: "Top-P",

      // Toolbar
      clearHistory: "清空对话",
      saveHistory: "保存对话",
      pasteHint: "Ctrl+V 贴图",
      canvasBtn: "📸 捕获画布",
      imgCount: "图片",
      imgClear: "✕ 清空",

      // Context chips
      contextHint: "点击选择要附带的内容，发送后自动复位",
      workflowLabel: "工作流",
      nodesLabel: "选中节点",
      canvasErrorLabel: "画布错误",
      runErrorLabel: "运行错误",

      // Input
      inputPlaceholder: "输入问题...",
      send: "发送",

      // System messages
      configSaved: "✅ 配置已保存",
      historyCleared: "🗑 对话已清空",
      nothingToSave: "⚠️ 没有对话可保存",
      savedFile: "💾 已保存:",
      imgCaptured: "📸 已捕获 N 张画布图片，点击切换选中",
      noCanvasImg: "⚠️ 画布上没有可见图片",
      captureFailed: "⚠️ 捕获失败:",
      modelsLoaded: "✅ 已加载 N 个模型",
      noModels: "⚠️ 无模型返回，请手动输入模型名",
      fetchFailed: "⚠️ 获取模型列表失败:",
      needUrl: "⚠️ 请先填写 API URL",
      needApiUrl: "请先在上方配置 API URL",
      thinking: "思考中...",
      networkError: "网络错误:",
      serverError: "服务器错误:",
      streamingOn: "流式输出: 开",
      streamingOff: "流式输出: 关",

      // Context summary
      sentContext: "📎 已发送:",
      imagesLabel: "张图片",
      errorLogLabel: "报错日志",

      // Code copy
      copyCode: "复制代码",
      copied: "已复制",

      // Thinking fold
      thinkingFold: "思考过程",
      short: "简短",
      chars: "字符",
    },

    en: {
      title: "AI Chat Bridge",
      streamOn: "Stream: ON",
      streamOff: "Stream: OFF",
      hidePanel: "Hide panel",
      showPanel: "Show panel",
      grabberText: "AI Chat Bridge ▶",

      apiHeader: "API Configuration",
      url: "URL",
      urlPlaceholder: "e.g. http://localhost:11434/v1",
      key: "Key",
      keyPlaceholder: "not-needed",
      model: "Model",
      modelPlaceholder: "auto / model name",
      prompt: "Prompt",
      promptPlaceholder: "System prompt (optional)",
      saveConfig: "Save Config",
      fetchModels: "Fetch models",

      appearanceHeader: "Appearance",
      fontSize: "Font Size",
      panelWidth: "Panel Width",

      paramsHeader: "Parameters",
      temp: "Temp",
      maxTok: "Max Tok",
      topK: "Top-K",
      topP: "Top-P",

      clearHistory: "Clear",
      saveHistory: "Save",
      pasteHint: "Ctrl+V paste",
      canvasBtn: "📸 Canvas",
      imgCount: "images",
      imgClear: "✕ Clear",

      contextHint: "Click to select context. Auto-reset after send",
      workflowLabel: "Workflow",
      nodesLabel: "Selected nodes",
      canvasErrorLabel: "Canvas Error",
      runErrorLabel: "Run Error",

      inputPlaceholder: "Ask about your workflow...",
      send: "Send",

      configSaved: "✅ Config saved.",
      historyCleared: "🗑 Conversation cleared.",
      nothingToSave: "⚠️ Nothing to save.",
      savedFile: "💾 Saved:",
      imgCaptured: "📸 N canvas image(s) captured. Click to select/deselect.",
      noCanvasImg: "⚠️ No visible canvas images.",
      captureFailed: "⚠️ Capture failed:",
      modelsLoaded: "✅ N model(s) loaded.",
      noModels: "⚠️ No models. Type name manually.",
      fetchFailed: "⚠️ Failed to fetch models:",
      needUrl: "⚠️ Enter API URL first.",
      needApiUrl: "Configure an API URL first.",
      thinking: "Thinking...",
      networkError: "Network error:",
      serverError: "Server error:",
      streamingOn: "Streaming: ON",
      streamingOff: "Streaming: OFF",

      sentContext: "📎 Sent:",
      imagesLabel: "image(s)",
      errorLogLabel: "error log",

      copyCode: "Copy code",
      copied: "Copied",

      thinkingFold: "Thinking",
      short: "short",
      chars: "chars",
    }
  };

  // ── Public API ──────────────────────────────────────
  var currentLang = "en";

  window.ChatBridgeI18N = {
    dict: DICT,

    t: function(key) {
      var d = DICT[currentLang] || DICT["en"];
      return d[key] !== undefined ? d[key] : key;
    },

    tReplace: function(key, from, to) {
      return this.t(key).replace(from, to);
    },

    getLang: function() { return currentLang; },

    setLang: function(lang) {
      if (DICT[lang]) currentLang = lang;
    },

    toggleLang: function() {
      currentLang = (currentLang === "zh") ? "en" : "zh";
      return currentLang;
    }
  };
})();
