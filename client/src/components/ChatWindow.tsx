// 消息列表窗口: 自动滚动到底部

import { useEffect, useRef } from 'react';
import { Empty } from 'antd';
import type { UiMessage } from '../types';
import MessageBubble from './MessageBubble';

interface Props {
  messages: UiMessage[];
}

export default function ChatWindow({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 新消息/流式增量时自动滚到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Empty
          description="试试问: TeamHub 的 RBAC 怎么设计 / 现在几点了 / 事件循环是什么"
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 16, overflowY: 'auto', height: '100%' }}>
      {messages.map((m) => (
        <MessageBubble key={m.id} msg={m} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
