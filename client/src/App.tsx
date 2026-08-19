// ★ TeamHub-AI 主布局
// 手写能力: SSE 流式 / RAG 检索 / Function Calling（Agent 闭环）
// UI 用 antd（坦然承认: UI 组件库省时间, 核心是 AI 管道手写）

import { Layout, Typography, Spin, Badge } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { useMemo } from 'react';
import { useChat } from './hooks/useChat';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import ErrorBanner from './components/ErrorBanner';
import { debounce } from './utils/asyncUtils';

const { Header, Content } = Layout;

export default function App() {
  const { messages, streaming, thinking, error, send, stop, retry } = useChat();

  // ★ 发送防抖: 用户快速连按 Enter/连点发送时, 300ms 内只响应最后一次,
  // 防止连按导致重复请求浪费 token (防抖 = 只执行最后一次)
  // 注: retry(重试) 直接调 send 不受防抖影响, 重试应立即执行
  const sendDebounced = useMemo(() => debounce(send, 300), [send]);

  return (
    <Layout style={{ height: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#001529',
          padding: '0 24px',
        }}
      >
        <RobotOutlined style={{ color: '#1677ff', fontSize: 22, marginRight: 12 }} />
        <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
          TeamHub-AI
        </Typography.Title>
        {thinking && (
          <Badge
            status="processing"
            text={<span style={{ color: '#aaa', marginLeft: 16 }}>AI 正在调用工具…</span>}
          />
        )}
      </Header>
      <Content style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ErrorBanner error={error} onRetry={retry} />
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <ChatWindow messages={messages} />
          {thinking && (
            <div
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: '#fff',
                borderRadius: 8,
                padding: '4px 10px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                fontSize: 12,
              }}
            >
              <Spin size="small" /> 工具调用中…
            </div>
          )}
        </div>
        <ChatInput streaming={streaming} onSend={sendDebounced} onStop={stop} />
      </Content>
    </Layout>
  );
}
