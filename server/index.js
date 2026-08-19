// ★ TeamHub-AI 后端
// 职责: 1) 隐藏 API Key (key 只在服务端环境变量) 2) RAG 注入 3) 转发 SSE 流式
// 手写实现: fetch + ReadableStream 转发上游 LLM 的 SSE 事件

require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const { buildRag } = require('./rag');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

// 启动时加载知识库（分块 + 向量化，内存索引）
const rag = buildRag();

// ★ key 只在后端：前端请求不带任何密钥
const LLM_BASE_URL = process.env.LLM_BASE_URL ?? 'https://api.deepseek.com';
const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL ?? 'deepseek-chat';

if (!LLM_API_KEY) {
  console.warn('⚠️ 未配置 LLM_API_KEY，请在 server/.env 或根 .env 中设置');
}

/**
 * POST /api/chat — 聊天（流式 / 非流式）
 * 请求: { messages: [...], tools?: [...], stream?: boolean }
 * 流程:
 *   1. RAG 注入: 取最后一条 user 消息做知识库检索, 拼进 system prompt
 *   2. 转发上游 LLM (OpenAI 兼容协议)
 *   3. stream=true → 原样转发 SSE 事件流; stream=false → 返回 JSON
 */
app.post('/api/chat', async (req, res) => {
  const { messages, tools, stream = true } = req.body ?? {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages 不能为空' });
  }

  // ★ RAG 注入：最后一条 user 消息触发知识库检索
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const context =
    lastUser && typeof lastUser.content === 'string'
      ? rag.search(lastUser.content)
      : [];

  const payload = {
    model: LLM_MODEL,
    messages:
      context.length > 0
        ? [
            {
              role: 'system',
              content:
                '你是 AI 助手。请优先基于以下资料回答，资料里没有的信息请如实说明"资料中没有"。\n' +
                context.join('\n---\n'),
            },
            ...messages,
          ]
        : messages,
    stream,
    ...(Array.isArray(tools) && tools.length ? { tools } : {}),
  };

  const doFetch = () =>
    fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    try {
      const upstream = await doFetch();
      if (!upstream.ok || !upstream.body) {
        const errText = await upstream.text().catch(() => '');
        res.status(502).json({ error: `上游模型服务错误: HTTP ${upstream.status} ${errText.slice(0, 200)}` });
        return;
      }
      // ★ 原样转发 SSE：逐块读取上游流并写入客户端响应
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value));
        }
        res.end();
      } catch {
        res.end(); // 客户端断开时兜底，服务器不崩
      }
    } catch (err) {
      if (!res.headersSent) res.status(500).json({ error: String(err) });
      else res.end();
    }
  } else {
    try {
      const upstream = await doFetch();
      const data = await upstream.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  }
});

/**
 * POST /api/search — RAG 检索（独立接口，便于演示/调试）
 * 请求: { query: string }
 * 响应: { results: ["[文件名] 文本块", ...] }
 */
app.post('/api/search', (req, res) => {
  const { query } = req.body ?? {};
  if (typeof query !== 'string' || !query) {
    return res.status(400).json({ error: 'query 不能为空' });
  }
  res.json({ results: rag.search(query) });
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`✅ TeamHub-AI server → http://localhost:${PORT}`);
  console.log(`   RAG 知识块: ${rag.count()}`);
});
