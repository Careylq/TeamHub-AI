// 输入框: Enter 发送, 发送中变"停止"按钮 (AbortController)
// ★ 输入联想: 停止输入 300ms 后 RAG 搜索知识库, 显示建议下拉, 点击直接发送
//   防抖场景: 不是每个按键都请求, 而是"停下来才搜" (避免高频请求)

import { useEffect, useRef, useState } from 'react';
import { Button, Input, Spin } from 'antd';
import { StopOutlined } from '@ant-design/icons';
import { useSuggestions } from '../hooks/useSuggestions';

interface Props {
  streaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

export default function ChatInput({ streaming, onSend, onStop }: Props) {
  const [value, setValue] = useState('');
  const [showSuggest, setShowSuggest] = useState(false);
  const { suggestions, loading, onInputChange, clear } = useSuggestions();
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const submit = (text?: string) => {
    const finalText = (text ?? value).trim();
    if (!finalText || streaming) return;
    onSend(finalText);
    setValue('');
    clear();
    setShowSuggest(false);
  };

  const onChange = (v: string) => {
    setValue(v);
    onInputChange(v);
    setShowSuggest(true);
  };

  // 输入框失焦延迟隐藏建议 (给点击建议留时间)
  const onBlur = () => {
    blurTimerRef.current = setTimeout(() => setShowSuggest(false), 200);
  };
  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, []);

  return (
    <div style={{ padding: 12, borderTop: '1px solid #f0f0f0' }}>
      {streaming ? (
        <Button block danger icon={<StopOutlined />} onClick={onStop}>
          停止生成
        </Button>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* ★ 联想建议下拉: 停止输入 300ms 后 RAG 搜索知识库 */}
          {showSuggest && suggestions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                marginBottom: 4,
                background: '#fff',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                maxHeight: 180,
                overflowY: 'auto',
                zIndex: 10,
              }}
            >
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  onMouseDown={(e) => {
                    e.preventDefault(); // 防止触发 input 失焦
                    submit(s.text);
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f0f0f0',
                    fontSize: 13,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                >
                  <div>{s.text.slice(0, 60)}{s.text.length > 60 ? '…' : ''}</div>
                  <div style={{ color: '#999', fontSize: 11 }}>📚 {s.source}</div>
                </div>
              ))}
            </div>
          )}
          {showSuggest && loading && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                marginBottom: 4,
                padding: '6px 12px',
                background: '#fff',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                fontSize: 12,
                color: '#999',
                zIndex: 10,
              }}
            >
              <Spin size="small" /> 搜索知识库…
            </div>
          )}
          <Input.TextArea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder="输入消息，Enter 发送（Shift+Enter 换行）"
            autoSize={{ minRows: 1, maxRows: 4 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
