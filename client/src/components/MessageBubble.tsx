// 消息气泡: 用户右 / AI 左 + Markdown 渲染

import { Avatar, Tag } from 'antd';
import { RobotOutlined, UserOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import type { UiMessage } from '../types';

interface Props {
  msg: UiMessage;
}

export default function MessageBubble({ msg }: Props) {
  const isUser = msg.role === 'user';
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 16,
      }}
    >
      {!isUser && (
        <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#1677ff' }} />
      )}
      <div style={{ maxWidth: '75%' }}>
        {/* 工具调用卡片（Agent 闭环的肉眼可见证据） */}
        {msg.toolCalls?.map((tc, i) => (
          <div
            key={i}
            style={{
              background: '#fffbe6',
              border: '1px solid #ffe58f',
              borderRadius: 8,
              padding: '6px 12px',
              marginBottom: 8,
              fontSize: 12,
            }}
          >
            🔧 正在调用工具：<b>{tc.name}</b>
            {tc.status === 'done' && (
              <>
                <Tag color="success" style={{ marginLeft: 8 }}>
                  已完成
                </Tag>
                {tc.result && (
                  <div
                    style={{
                      marginTop: 4,
                      color: '#8c8c8c',
                      maxHeight: 60,
                      overflow: 'hidden',
                      fontSize: 11,
                    }}
                  >
                    {tc.result.slice(0, 120)}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        {/* 消息内容 */}
        <div
          style={{
            background: isUser ? '#1677ff' : '#f5f5f5',
            color: isUser ? '#fff' : '#000',
            borderRadius: 12,
            padding: '10px 14px',
            wordBreak: 'break-word',
          }}
        >
          {isUser ? (
            msg.content
          ) : (
            <div style={{ color: '#000' }}>
              <ReactMarkdown>{msg.content || '…'}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
      {isUser && (
        <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#52c41a' }} />
      )}
    </div>
  );
}
