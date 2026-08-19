// ★ 输入联想搜索 Hook — 防抖的经典高价值场景 (类似搜索框防抖)
// 流程: 输入停止 300ms 且 ≥2 字 → 调 /api/search (RAG 知识库) → 显示 Top-3 建议
// 防抖价值: 不是每个按键都请求, 而是"停下来才搜" (避免高频请求 + 浪费 token)

import { useEffect, useRef, useState } from 'react';
import { debounce } from '../utils/asyncUtils';

const MIN_QUERY_LEN = 2; // 至少 2 字才触发搜索
const DEBOUNCE_MS = 300; // 停止输入 300ms 后搜索

export interface Suggestion {
  text: string;
  source: string;
}

export function useSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const requestSeqRef = useRef(0); // ★ 请求序列号: 丢弃过期响应 (竞态处理)

  // ★ 防抖搜索: 输入停止 300ms 后触发, 避免每个按键都请求后端
  const [searchDebounced] = useState(() =>
    debounce(async (query: string) => {
      const seq = ++requestSeqRef.current;
      setLoading(true);
      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        const data = await res.json();
        // ★ 竞态: 只接受最新一次请求的响应 (旧请求返回时已被更新, 直接丢弃)
        if (seq !== requestSeqRef.current) return;
        const results: string[] = data.results ?? [];
        setSuggestions(
          results.map((r) => {
            const m = r.match(/^\[([^\]]+)\]\s*(.*)$/s);
            return {
              source: m ? m[1] : '知识库',
              text: m ? m[2] : r,
            };
          }),
        );
      } catch {
        if (seq === requestSeqRef.current) setSuggestions([]);
      } finally {
        if (seq === requestSeqRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS),
  );

  /** 输入变化 → 防抖触发搜索 (或清空建议) */
  const onInputChange = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length >= MIN_QUERY_LEN) {
      searchDebounced(trimmed);
    } else {
      // 输入过短: 取消未执行的搜索 + 清空建议
      searchDebounced.cancel();
      requestSeqRef.current++; // 使进行中的请求过期
      setSuggestions([]);
      setLoading(false);
    }
  };

  /** 清空建议 (点击建议/发送后调用) */
  const clear = () => {
    searchDebounced.cancel();
    requestSeqRef.current++;
    setSuggestions([]);
    setLoading(false);
  };

  // ★ 卸载时取消防抖 timer, 防止内存泄漏
  useEffect(() => {
    return () => searchDebounced.cancel();
  }, [searchDebounced]);

  return { suggestions, loading, onInputChange, clear };
}
