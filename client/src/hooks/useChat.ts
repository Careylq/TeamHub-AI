// ★ 对话状态机 Hook
// 职责: 1) Function Calling 工具循环 2) SSE 流式输出 3) 滑动窗口上下文管理 4) 中止/错误处理
// 策略: 第一阶段带 tools 的非流式请求判断是否调工具; 无工具则第二阶段流式输出最终回答

import { useCallback, useRef, useState } from 'react';
import type { ChatMessage, UiMessage } from '../types';
import { streamChat } from '../services/sse';
import { tools, executeTool } from '../services/tools';
import { throttleRaf } from '../utils/asyncUtils';

const MAX_TOOL_ROUNDS = 2; // ★ 防死循环: 工具循环最多 2 轮
const WINDOW_SIZE = 8; // ★ 滑动窗口: 只保留最近 8 条消息, 防止 token 爆炸

let idCounter = 0;
const nextId = () => `msg-${++idCounter}`;

export function useChat() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [streaming, setStreaming] = useState(false); // 是否正在流式输出
  const [thinking, setThinking] = useState(false); // 是否在工具循环阶段
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /** 更新一条 AI 消息的工具调用状态 */
  const setToolStatus = useCallback(
    (id: string, toolName: string, status: 'running' | 'done', result?: string) => {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === id);
        if (idx === -1) return prev;
        const next = [...prev];
        const msg = { ...next[idx] };
        const calls = [...(msg.toolCalls ?? [])];
        const callIdx = calls.findIndex((c) => c.name === toolName);
        if (callIdx >= 0) {
          calls[callIdx] = { ...calls[callIdx], status, result };
        } else {
          calls.push({ name: toolName, args: {}, status, result });
        }
        next[idx] = { ...msg, toolCalls: calls };
        return next;
      });
    },
    [],
  );

  /** 停止当前流式输出 */
  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setThinking(false);
  }, []);

  /** 发送用户消息（入口） */
  const send = useCallback(
    async (input: string) => {
      const text = input.trim();
      if (!text || streaming) return;

      // 追加用户消息 + 一个空 AI 消息（占位, 流式填充）
      const userMsg: UiMessage = { id: nextId(), role: 'user', content: text };
      const aiId = nextId();
      const aiMsg: UiMessage = { id: aiId, role: 'assistant', content: '' };
      setMessages((prev) => [...prev, userMsg, aiMsg]);
      setError(null);
      setStreaming(true);

      // 构建发送给后端的消息数组（含系统消息 + 滑动窗口）
      const history: ChatMessage[] = [
        { role: 'system', content: '你是 TeamHub-AI 助手, 擅长回答前端问题和使用工具。' },
        ...messages
          .slice(-WINDOW_SIZE) // ★ 滑动窗口: 只保留最近 8 条, 防止 token 爆炸
          .filter((m) => m.role === 'user' || (m.role === 'assistant' && m.content))
          .map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: text },
      ];

      const abort = new AbortController();
      abortRef.current = abort;

      try {
        // ============ 第一阶段: Function Calling 工具循环 ============
        setThinking(true);
        let msgs = [...history];
        let toolRounds = 0;

        for (;;) {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: msgs, tools, stream: false }),
            signal: abort.signal,
          });
          if (!res.ok) {
            const errText = await res.text().catch(() => '');
            throw new Error(`请求失败: HTTP ${res.status} ${errText.slice(0, 100)}`);
          }
          const data = await res.json();
          const toolCalls = data.choices?.[0]?.message?.tool_calls;

          if (!toolCalls || toolCalls.length === 0) {
            break; // 无工具调用 → 进入第二阶段流式输出
          }
          if (toolRounds >= MAX_TOOL_ROUNDS) break; // ★ 防死循环

          toolRounds++;
          // 渲染 ToolCallCard: AI 正在调用工具
          for (const call of toolCalls) {
            setToolStatus(aiId, call.function.name, 'running');
          }

          // 把 assistant 的 tool_calls 加入消息历史
          msgs = [
            ...msgs,
            { role: 'assistant', content: null, tool_calls: toolCalls } as ChatMessage,
          ];

          // 逐个执行工具, 结果回填
          for (const call of toolCalls) {
            let resultText: string;
            try {
              const args = JSON.parse(call.function.arguments || '{}');
              resultText = await executeTool(call.function.name, args);
              setToolStatus(aiId, call.function.name, 'done', resultText);
            } catch (e) {
              resultText = `工具执行失败: ${String(e)}`;
              setToolStatus(aiId, call.function.name, 'done', resultText);
            }
            msgs.push({
              role: 'tool',
              tool_call_id: call.id,
              content: resultText,
            } as ChatMessage);
          }
        }
        setThinking(false);

        // ============ 第二阶段: 流式输出最终回答 ============
        // ★ 流式渲染节流: SSE 高频 onChunk 用 rAF 合并, 每帧(16.7ms)只 setState 一次,
        // 避免每收到一小块就触发一次 React 重渲染 (面经 105: 高频流式返回的渲染性能)
        let pendingContent = '';
        const flushChunk = throttleRaf(() => {
          const content = pendingContent;
          pendingContent = '';
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === aiId);
            if (idx === -1) return prev;
            const next = [...prev];
            next[idx] = { ...next[idx], content: (next[idx].content ?? '') + content };
            return next;
          });
        });
        await streamChat(
          msgs,
          undefined, // 最终回答不带 tools, 避免再触发工具
          {
            onChunk: (delta) => {
              // 先累积到 pending, 下一帧统一 flush (rAF 节流)
              pendingContent += delta;
              flushChunk();
            },
            onDone: () => {
              // 流结束: 强制 flush 剩余 pending (rAF 节流可能还没来得及渲染最后一块)
              const rest = pendingContent;
              pendingContent = '';
              if (rest) {
                setMessages((prev) => {
                  const idx = prev.findIndex((m) => m.id === aiId);
                  if (idx === -1) return prev;
                  const next = [...prev];
                  next[idx] = { ...next[idx], content: (next[idx].content ?? '') + rest };
                  return next;
                });
              }
              setStreaming(false);
            },
            onError: (err) => {
              setStreaming(false);
              setError(`响应中断: ${err.message}（已保留已输出内容）`);
            },
          },
          abort.signal,
        );
      } catch (err) {
        if ((err as Error).name === 'AbortError') return; // 用户停止
        setStreaming(false);
        setThinking(false);
        setError((err as Error).message);
      } finally {
        abortRef.current = null;
      }
    },
    [messages, streaming, setToolStatus],
  );

  /** 重试: 重发最后一条用户消息 */
  const retry = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) send(lastUser.content);
  }, [messages, send]);

  return { messages, streaming, thinking, error, send, stop, retry };
}
