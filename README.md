已写好。覆盖 `README.md`：

```markdown
# AI Chat Bridge for ComfyUI

> 嵌入 ComfyUI 的 AI 对话助手——浮动小球 🤖，点击即开，不挡画布。

无需额外服务器，无需 `.env` 文件。所有配置在面板中完成。

> **License:** [MIT](LICENSE) — 自由使用、修改、商用。

---

## 🔒 Privacy

所有 API 凭据仅存储在浏览器 localStorage 中（base64 编码），不写入任何插件文件，不上传任何服务器。

---

## 功能一览

| 功能 | 说明 |
|------|------|
| 🤖 **浮动小球** | 右侧中央可拖动，颜色指示错误状态，点击展开面板 |
| 🎨 **画布错误检测** | 缺失节点/缺失模型自动发现，chip 按钮变色提示 |
| 💥 **运行时错误捕获** | Python monkey-patch 捕获 OOM/参数错/Tensor 崩溃 |
| 🤖 **多后端支持** | 任何 OpenAI 兼容 API（Ollama、LM Studio、DeepSeek、OpenAI 等） |
| 🔄 **模型列表刷新** | 一键获取 API 可用模型列表 |
| 📋 **上下文 chip** | 发送前点选：工作流/选中节点/画布错误/运行错误，发送后自动复位 |
| 🖼 **画布截图** | 📸 捕获画布输出图，点选后发送给视觉模型 |
| 🌊 **流式输出** | 逐字出现，Markdown 实时渲染 |
| 💭 **思考折叠** | `<think>` 标签自动折叠为可展开面板 |
| 📋 **代码复制** | hover 代码块 → 📋 → ✓ |
| 🌐 **中英文切换** | 标题栏按钮即时切换 |
| 🎨 **可调外观** | 字体 10~18px / 面板宽 300~550px |
| 💾 **保存对话** | 一键下载 `.txt` |
| 📸 **剪贴板贴图** | Ctrl+V 粘贴图片到对话 |

---

## 安装

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/JWLHS/comfyui-ai-chat-bridge.git
```

启动 ComfyUI，插件会自动安装依赖 `openai>=1.0.0`。控制台显示：

```
AI Chat Bridge plugin loaded (routes: /api/chat-bridge/chat, /api/chat-bridge/chat/stream, /api/chat-bridge/models, /api/chat-bridge/ping, /api/chat-bridge/last-error, /api/chat-bridge/validate-workflow)
```

打开 `http://localhost:8188`，页面右侧中央出现 🤖 浮动小球。

---

## 快速配置（30 秒上手）

以 Ollama 为例：

1. 点击 🤖 小球打开面板
2. 展开 **API 配置**
3. 填写：

| 字段 | 值 |
|------|-----|
| URL | `http://localhost:11434/v1` |
| Key | `not-needed` |
| Model | 点 🔄，下拉选择 |

4. 点 **保存配置**
5. 底部输入框打字，Enter 发送

---

## 界面导览

### 浮动小球

| 颜色 | 状态 |
|:---:|------|
| 🟢 绿色 | 畅通，无错误 |
| 🟣 紫色 | 有警告 |
| 🟡 黄色 | 有画布错误（节点/模型缺失等） |
| 🔴 红色 | 有运行时错误（OOM/参数错等） |

- 鼠标按住小球可拖动到任意位置（位置自动记住）
- 小球右上角角标显示错误数量
- 点击小球展开面板，点击面板外任意处或 ✕ 关闭

### 面板布局

```
┌─────────────────────────────────┐
│ 🟢 AI Chat Bridge    🌐 🌊 ✕   │ ① 标题栏
├─────────────────────────────────┤
│ ▶ API 配置                      │ ② 后端配置
├─────────────────────────────────┤
│ ▶ 推理参数                       │ ③ 模型参数
├─────────────────────────────────┤
│ ▶ 外观                          │ ④ 字体/宽度
├─────────────────────────────────┤
│ 🗑 清空  💾 保存    Ctrl+V 贴图  │ ⑤ 工具栏
├─────────────────────────────────┤
│ 📸 画布  0 图片  ✕ 清空          │ ⑥ 图片栏
├─────────────────────────────────┤
│         对话区域                  │ ⑦ 消息区
├─────────────────────────────────┤
│ 📋工作流 🔍选中节点 🎨画布错误 💥运行错误 │ ⑧ 上下文 chip
├─────────────────────────────────┤
│ [输入框..................] [发送] │ ⑨ 输入区
└─────────────────────────────────┘
```

### ① 标题栏

| 元素 | 功能 |
|------|------|
| 🟢/⚫ | 连接状态指示灯 |
| 🌐 | 中/EN 界面语言切换 |
| 🌊/📄 | 流式输出开关 |
| ✕ | 关闭面板（面板收回，小球重新出现） |

### ② API 配置

| 字段 | 说明 |
|------|------|
| URL | API 地址，必须以 `/v1` 结尾 |
| Key | 密码框，点 👁 切换可见，base64 编码存储 |
| Model | 点 🔄 获取可用模型列表，或手动输入 |
| Prompt | 系统提示词（可选） |

### ③ 推理参数

| 参数 | 范围 | 默认 |
|------|------|------|
| 温度 | 0~2 | 0.3 |
| 最大Token | 128~65536 | 4096 |
| Top-K | 1~100 | 40 |
| Top-P | 0~1 | 0.9 |

### ④ 外观

| 滑块 | 范围 | 默认 |
|------|------|------|
| 字体大小 | 10~18px | 13 |
| 面板宽度 | 300~550px | 390 |

### ⑧ 上下文 chip 按钮

| 按钮 | 附带内容 | 获取方式 |
|------|---------|---------|
| 📋 工作流 | 画布完整 JSON | `app.graph.serialize()` |
| 🔍 选中节点 | 当前选中节点参数 | `app.canvas.selected_nodes` |
| 🎨 画布错误 | 缺失节点/模型/素材 | Pinia 状态 + Python 验证 |
| 💥 运行错误 | OOM/参数错/Tensor 崩溃 | Python `execution.execute()` hook |

**使用方式**：点击 chip 选中（变紫色高亮），发送消息时附带。发送后自动复位为灰色。

**有错误时**：🎨 和 💥 chip 边框会自动变黄/红色，提示有可发送的错误内容。

### ⑥ 图片栏

- 📸 画布：抓取画布可见图片（最多 6 张）
- 缩略图紫色边框 = 选中（发送），灰色 = 不发送，点击切换
- Ctrl+V 也可粘贴剪贴板图片

### ⑦ 消息区

- 紫色气泡 = 你，深灰气泡 = AI
- 代码块 hover 出现 📋 复制按钮
- `<think>` 自动折叠为 💭 思考过程，点开查看

---

## 错误捕获机制

| 错误来源 | 级别 | 捕获方式 | 间隔 |
|---------|:---:|------|:---:|
| Python 运行时（OOM/Tensor/参数错） | 🔴 | `error_collector.py` monkey-patch `execution.execute()` | 5s 轮询 |
| 画布缺失节点/缺失模型 | 🟡 | Pinia `pendingWarnings` + Python `NODE_CLASS_MAPPINGS` 验证 | 10s + 发送时 |
| 弹窗报错 | 🟡 | `app.ui.dialog.show` hook | 实时 |
| 控制台报错 | 🟡/🟣 | `console.error` / `console.warn` hook | 实时 |

---

## 接入 AI 后端

### 本地模型

| 引擎 | URL | Key | Model |
|------|-----|-----|-------|
| Ollama | `http://localhost:11434/v1` | `not-needed` | 点 🔄 |
| LM Studio | `http://localhost:1234/v1` | `not-needed` | `auto` |
| llama.cpp | `http://localhost:8080/v1` | `not-needed` | 模型名 |
| vLLM | `http://localhost:8000/v1` | `not-needed` | 模型名 |

### 云端 API

| 服务 | URL | Key | Model |
|------|-----|-----|-------|
| DeepSeek | `https://api.deepseek.com/v1` | `sk-xxx` | 点 🔄 |
| OpenAI | `https://api.openai.com/v1` | `sk-xxx` | 点 🔄 |

---

## 使用场景

**排查报错**：运行工作流 → 小球变红/黄 → 点 🎨 + 💥 chip → 发"帮我看看"。

**分析输出图**：运行工作流 → 📸 捕获画布 → 发"分析这张图"。

**调节点参数**：选中一个节点 → 点 🔍 chip → 发"CFG 设多少合适？"。

---

## 文件结构

```
comfyui-ai-chat-bridge/
├── __init__.py              # 插件入口，注册 6 条路由
├── chat_handler.py          # OpenAI API 代理（chat/stream/models）
├── error_collector.py       # 运行时错误收集 + monkey-patch
├── requirements.txt         # openai>=1.0.0
├── .gitignore
├── README.md
└── js/
    ├── chat-bridge.js       # ComfyUI 自动加载入口
    └── lib/
        ├── chat-bridge-i18n.js   # 中英文字典
        ├── chat-bridge-css.js    # 样式（含小球/chip）
        └── chat-bridge-core.js   # 全部前端逻辑
```

---

## 常见问题

### 面板没有出现？

1. 检查 `custom_nodes/comfyui-ai-chat-bridge/` 存在
2. 控制台是否有 "AI Chat Bridge plugin loaded"
3. F12 → Console，搜索 `[ChatBridge]`
4. Ctrl+Shift+R 强制刷新

### 小球不变色？

确认画布上有报错节点，等待 10 秒扫描间隔。首次加载时立即扫描一次。

### 获取模型列表失败？

- URL 是否以 `/v1` 结尾
- 本地引擎是否正在运行
- 浏览器打开 `URL/models` 测试

### 网络错误？

ComfyUI 是否在运行？API 地址是否可访问？

---

## License

This project is licensed under the [MIT License](LICENSE).
```