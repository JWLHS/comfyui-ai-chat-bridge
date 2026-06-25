```markdown
# AI Chat Bridge for ComfyUI

> 在 ComfyUI 页面右侧打开 AI 对话面板 — 发送工作流、报错信息、画布截图给 AI，即时获得帮助。

无需额外服务器，无需 `.env` 文件。所有配置在面板中完成。

> **License:** [MIT](LICENSE) — 自由使用、修改、商用。

---

## 🔒 Privacy

所有 API 凭据**仅存储在浏览器 localStorage 中**（base64 编码）。
不会写入任何插件文件，不会上传到任何服务器，不会发送遥测数据。
唯一的网络请求是调用你自己配置的 AI API 端点。

---

## 功能一览

| 功能 | 说明 |
|------|------|
| 🤖 **多后端支持** | 任何 OpenAI 兼容 API（Ollama、LM Studio、llama.cpp、DeepSeek、OpenAI 等） |
| 🔄 **模型列表刷新** | 一键获取 API 可用模型列表，下拉选择 |
| 📋 **工作流上下文** | 发送完整工作流 JSON、选中节点参数 |
| 🖼 **画布截图** | 📸 捕获 ComfyUI 画布上的输出图，点选后发送给视觉模型 |
| ❌ **双路报错捕获** | 弹窗报错 + 控制台报错（缺失节点等）独立捕获、独立勾选 |
| 🌊 **流式输出** | 逐字出现，Markdown 渲染 |
| 💭 **思考折叠** | `<think>` 标签自动折叠为可展开面板 |
| 📋 **代码复制** | hover 代码块 → 📋 → ✓ |
| 🌐 **中英文切换** | 标题栏按钮即时切换 |
| 🎨 **可调外观** | 字体大小 10~18px、面板宽度 300~550px |
| 💾 **保存对话** | 一键下载 `.txt` |
| 📸 **剪贴板贴图** | Ctrl+V 粘贴图片到对话 |

---

## 安装（3 步）

### 1. 下载插件

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/你的用户名/comfyui-ai-chat-bridge.git
```

或者直接下载 ZIP 解压到 `custom_nodes/`。

### 2. 启动 ComfyUI

```bash
python main.py
```

插件会自动安装依赖 `openai>=1.0.0`。控制台显示：

```
AI Chat Bridge plugin loaded (routes: /api/chat-bridge/chat, /api/chat-bridge/chat/stream, /api/chat-bridge/models)
```

### 3. 打开浏览器

访问 `http://localhost:8188`，页面右侧出现 **AI Chat Bridge** 面板。

---

## 快速配置（30 秒上手）

以 Ollama 本地模型为例：

1. 展开 **API 配置**（点 ▶）
2. 填写：

| 字段 | 值 |
|------|-----|
| URL | `http://localhost:11434/v1` |
| Key | `not-needed` |
| Model | 点 🔄，下拉选择 |

3. 点 **保存配置**
4. 在底部输入框打字，按 **Enter** 发送

---

## 界面导览

```
┌─────────────────────────────────┐
│ 🟢 AI Chat Bridge    🌐 🌊 ◀   │ ① 标题栏
├─────────────────────────────────┤
│ ▶ API 配置                      │ ② 后端配置
├─────────────────────────────────┤
│ ▶ 上下文（附带每条消息）           │ ③ 上下文勾选
├─────────────────────────────────┤
│ ▶ 外观                          │ ④ 字体/宽度
├─────────────────────────────────┤
│ ▶ 推理参数                       │ ⑤ 模型参数
├─────────────────────────────────┤
│ 🗑 清空  💾 保存    Ctrl+V 贴图  │ ⑥ 工具栏
├─────────────────────────────────┤
│ 📸 捕获画布  0 图片  ✕ 清空      │ ⑦ 图片栏
├─────────────────────────────────┤
│         对话区域                  │ ⑧ 消息区
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
| ◀ | 折叠面板（折叠后左侧抓取条可点击展开） |

### ② API 配置

| 字段 | 说明 |
|------|------|
| URL | API 地址，必须以 `/v1` 结尾 |
| Key | 密码框，点 👁 切换可见，base64 编码存储 |
| Model | 点 🔄 获取可用模型列表，或手动输入 |
| Prompt | 该系统提示词（可选） |

### ③ 上下文

| 选项 | 发送内容 |
|------|---------|
| ☑ 工作流 | 画布完整 JSON |
| ☐ 选中节点 | 框选节点的参数 |
| ☑ 弹窗报错 | 红色错误弹窗文字 |
| ☑ 控制台报错 | F12 控制台 error/warn（含 Missing Node） |

### ④ 外观

| 滑块 | 范围 | 默认 |
|------|------|------|
| 字体大小 | 10~18px | 13 |
| 面板宽度 | 300~550px | 390 |

### ⑤ 推理参数

| 参数 | 范围 | 默认 |
|------|------|------|
| 温度 | 0~2 | 0.3 |
| 最大Token | 128~65536 | 4096 |
| Top-K | 1~100 | 40 |
| Top-P | 0~1 | 0.9 |

> 最大Token 只限制回复长度，不影响上下文窗口（工作流上限 200K 字符）。

### ⑦ 图片栏

- 📸 捕获画布：抓取画布可见图片（最多 6 张）
- 缩略图紫色边框 = 选中（发送），灰色 = 不发送，点击切换
- Ctrl+V 也可粘贴剪贴板图片

### ⑧ 消息区

- 紫色气泡 = 你，深灰气泡 = AI
- 代码块 hover 出现 📋 复制按钮
- `<think>` 自动折叠为 💭 Thinking，点开查看

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

**排查报错**：勾选 工作流 + 弹窗报错 + 控制台报错 → 运行 → 发"帮我看看"。

**分析输出图**：运行工作流 → 📸 捕获画布 → 勾选 工作流 → 发"分析这张图"。

**调节点参数**：选中一个节点 → 勾选 选中节点 → 发"CFG 设多少合适？"。

---

## 常见问题

### 面板没有出现？

1. 检查 `custom_nodes/comfyui-ai-chat-bridge/` 存在
2. 控制台是否有 "AI Chat Bridge plugin loaded"
3. Ctrl+Shift+R 强制刷新
4. F12 → Console，搜索 `ChatBridge`

### 获取模型列表失败？

- URL 是否以 `/v1` 结尾
- 本地引擎是否正在运行
- 浏览器打开 `URL/v1/models` 测试

### 报错 "Network error"？

ComfyUI 是否在运行？API 地址是否可访问？


---

## 文件结构

```
comfyui-ai-chat-bridge/
├── __init__.py              # 插件入口，注册 3 条 HTTP 路由
├── chat_handler.py          # /chat, /chat/stream, /models 处理
├── requirements.txt         # openai>=1.0.0
├── .gitignore
├── README.md
└── js/
    ├── chat-bridge.js       # ComfyUI 自动加载入口
    └── lib/
        ├── chat-bridge-i18n.js   # 中英文字典
        ├── chat-bridge-css.js    # 参数化样式
        └── chat-bridge-core.js   # 全部前端逻辑
```

---

## License

This project is licensed under the [MIT License](LICENSE).


```