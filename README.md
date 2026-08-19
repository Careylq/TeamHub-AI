# TeamHub-AI — 手写 SSE + RAG + Function Calling 的 AI 对话助手

> 一个展示 **AI 工程理解能力** 的前端 + Node 后端项目。三大核心能力全部**手写**，不使用任何 AI 封装 SDK。

## ✨ 三大亮点（面试官看到就会往这问）

1. **手写 SSE 流式输出** — `fetch + ReadableStream` 增量读取，含**粘包/半包处理**、`AbortController` 中止（`client/src/services/sse.ts`）
2. **RAG 知识检索** — 本地 md 知识库 → 分块 → 向量化 → Top-K 检索 → 注入 Prompt，AI 能回答私有知识（`server/rag.js`）
3. **Function Calling 工具调用** — AI 可调用 `search_knowledge` / `get_current_time` 两个工具，展示 **Agent 闭环**（`client/src/services/tools.ts` + `useChat.ts`）

## 🏗 架构

```
┌────────────┐  POST /api/chat (SSE)   ┌──────────────────┐   OpenAI 兼容   ┌──────────┐
│  前端       │ ──────────────────────→ │  后端 (Express)    │ ──────────────→ │ DeepSeek  │
│ Vite+React │  POST /api/search       │ 隐藏 API Key      │                 │   LLM    │
│  手写 SSE  │ ←────────────────────── │ RAG 注入 + 转发流式 │ ←────────────── │          │
└────────────┘                         └──────────────────┘   流式返回        └──────────┘
```

- **前端**：Vite + React + TS + antd（UI 用组件库，AI 管道手写）
- **后端**：Node + Express（代理隐藏 Key + RAG 注入 + SSE 转发）
- **密钥**：只存在于服务端环境变量 `.env`，前端零暴露

## 🚀 快速开始

```bash
# 1. 安装全部依赖（根 + server + client）
npm run install:all

# 2. 配置环境变量（复制模板并填入你的 DeepSeek key）
cp .env.example .env
#    编辑 .env: LLM_API_KEY=sk-你的key

# 3. 一键启动前后端
npm run dev
#    前端 http://localhost:5173  后端 http://localhost:3001
```

## 🎬 现场演示脚本（面试用）

1. 打开页面，问 **"TeamHub 的 RBAC 怎么设计的"** → 出现"🔧 正在调用工具：search_knowledge" 卡片 → AI 基于知识库回答 → **讲 RAG 全流程**
2. 问 **"现在几点了"** → 出现工具调用卡片 → AI 回答当前时间 → **讲 Function Calling Agent 闭环**
3. 随便发一句话 → 看流式打字 → 打开 Network 看 `/api/chat` 是 `text/event-stream` 增量返回 → **讲手写 SSE + 粘包半包**
4. 聊 10+ 轮 → **讲滑动窗口上下文管理**（请求体不膨胀）

## 🛠 技术栈

| 部分 | 技术 | 说明 |
|------|------|------|
| 前端 | Vite 5 + React 18 + TS 5 | 手写 SSE 读取 |
| UI | antd 5 + react-markdown | 简洁可用 |
| 后端 | Node ≥18 + Express 4 | 代理 + RAG + 转发 |
| LLM | DeepSeek（OpenAI 兼容）| 支持 stream + function calling |
| 向量化 | 本地字符 bigram 哈希 | 零依赖，生产可换 bge-m3 |

## 📦 目录结构

```
TeamHub-AI/
├── package.json            # concurrently 一键启动
├── .env.example            # 环境变量模板（提交 git）
├── .gitignore              # 排除 .env / node_modules / dist
├── client/                 # 前端
│   └── src/
│       ├── services/
│       │   ├── sse.ts      # ★ 手写 SSE 流式（粘包/半包）
│       │   └── tools.ts    # ★ 工具定义 + 执行
│       ├── hooks/
│       │   └── useChat.ts  # 工具循环 + 流式 + 滑动窗口
│       └── components/     # ChatWindow / MessageBubble / ToolCallCard / ChatInput / ErrorBanner
└── server/                 # 后端
    ├── index.js            # ★ Express: SSE 代理 + RAG 注入 + Key 隐藏
    ├── rag.js              # ★ 分块 + 向量化 + Top-K 检索
    └── data/knowledge/     # 知识库（3 个 md）
```

## 📖 面试问答速查（README 附录）

| 问题 | 答案 |
|------|------|
| fetch 为什么能流式响应？ | `Response.body` 是 ReadableStream，浏览器原生支持增量读取 |
| 为什么不用 EventSource？ | 只支持 GET、不能带自定义 Header（鉴权）；fetch 支持 POST + Authorization |
| 粘包/半包怎么处理？ | 粘包按 `\n\n` 切分多个事件；半包用 buffer 缓存尾部下轮拼接 |
| 密钥放哪？ | 后端环境变量，前端零暴露（面经真题） |
| 为什么做后端代理？ | 藏 key + 统一 RAG 注入 + 转发流式 |
| RAG 流程？ | 分块 → 向量化 → 存储 → 检索 Top-K → 注入 Prompt |
| Embedding 用的什么？ | demo 用本地字符 bigram 哈希（零依赖可复现），生产换 bge-m3，接口可替换 |
| 为什么 RAG 不微调？ | 低成本、答案可溯源、知识实时更新 |
| Function Calling 原理？ | LLM 只输出结构化工具参数（不执行）→ 应用层执行 → 结果回填 → 再生成 |
| MCP 和你的工具调用啥关系？ | MCP 是把工具调用标准化的协议（JSON-RPC）；我这是直接函数调用，MCP = 标准化版 |
| 上下文太长怎么办？ | 滑动窗口保留最近 8 条（★ 注释标注）|

## 🎯 诚实分层（面试防穿帮）

| 部分 | 怎么说 |
|------|--------|
| UI（antd / react-markdown）| "UI 用组件库省时间"——坦然承认 |
| **SSE / RAG / Function Calling** | **"这三个是我手写的"**——必须真能讲清（见上表）|
| Embedding | "demo 用本地向量保底，生产换 bge-m3" |
| 后端 | "极简 Express 代理，主要为了藏密钥 + RAG 注入 + 转发流式" |

---

**License**: MIT
