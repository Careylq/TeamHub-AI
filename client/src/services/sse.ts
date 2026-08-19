// ★ 手写 SSE 流式读取（核心能力 1）
// 原理: fetch 的 Response.body 是 ReadableStream, 浏览器原生支持增量读取
// 不用 EventSource 的原因: 只支持 GET、不能带自定义 Header（鉴权）; fetch 支持 POST + Authorization
// 不用封装 SDK 的原因: 手写才能讲清楚"流式是怎么工作的"

import type { ChatMessage } from '../types';

export interface StreamHandlers {
  onChunk: (text: string) => void; // 每收到一段文本增量
  onDone: () => void; // 流结束
  onError: (err: Error) => void; // 出错（非用户中止）
}

/**
 * 流式聊天: POST /api/chat, 逐块读取 SSE 事件并回调
 * @param signal AbortController 的 signal, 用于用户点击"停止"
 */
export async function streamChat(
  messages: ChatMessage[],
  tools: unknown[] | undefined,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const { onChunk, onDone, onError } = handlers; // 解构回调, 下方直接用
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, tools, stream: true }),
      signal,
    });
    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => '');
      throw new Error(`请求失败: HTTP ${res.status} ${errText.slice(0, 100)}`);
    }

    // ★ ReadableStream 增量读取: reader.read() 每次返回一块数据
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = ''; // ★ 半包缓冲区: 事件被拆断时缓存尾部, 下轮拼接

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // ★ 粘包处理: 一个 chunk 可能含多个 SSE 事件, 按 \n\n 分隔符切分
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? ''; // ★ 半包: 不完整的尾部留到下一轮

      for (const evt of events) {
        // SSE 格式: data: {...}\n\n, 取所有 data: 行并拼接
        const data = evt
          .split('\n')
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5).trim())
          .join('\n');
        if (!data || data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          // OpenAI 流式格式: choices[0].delta.content 是文本增量
          const delta = json.choices?.[0]?.delta?.content;
          if (typeof delta === 'string' && delta) onChunk(delta);
        } catch {
          // 忽略无法解析的碎片（非标准事件）
        }
      }
    }
    onDone();
  } catch (err) {
    if ((err as Error).name === 'AbortError') return; // 用户主动停止, 不算错误
    onError(err as Error);
  }
}
