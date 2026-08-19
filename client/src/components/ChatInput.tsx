// 输入框: Enter 发送, 发送中变"停止"按钮 (AbortController)
// ★ 草稿自动保存: 停止输入 1s 后自动存 localStorage (防抖的经典场景),
//   刷新页面恢复草稿, 发送后清除 — 防抖 = 只执行最后一次 (电梯门)

import { useEffect, useState } from 'react';
import { Button, Input } from 'antd';
import { StopOutlined } from '@ant-design/icons';
import { debounce } from '../utils/asyncUtils';

const DRAFT_KEY = 'teamhub-ai-draft';

interface Props {
  streaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

export default function ChatInput({ streaming, onSend, onStop }: Props) {
  // 挂载时从 localStorage 恢复草稿 (上次输入到一半的内容)
  const [value, setValue] = useState(() => localStorage.getItem(DRAFT_KEY) ?? '');

  // ★ 草稿防抖: 停止输入 1s 后才写入 localStorage, 避免每个按键都写一次
  // useState 惰性初始化保证防抖实例只创建一次 (闭包持有 timer)
  const [saveDraft] = useState(() =>
    debounce((v: string) => {
      localStorage.setItem(DRAFT_KEY, v);
    }, 1000),
  );

  // ★ 卸载时 cancel, 清理 timer 防止内存泄漏 (防抖的经典追问点)
  useEffect(() => {
    return () => saveDraft.cancel();
  }, [saveDraft]);

  const onChange = (v: string) => {
    setValue(v);
    saveDraft(v); // 输入变化 → 防抖存草稿 (停止输入 1s 后)
  };

  const submit = () => {
    if (!value.trim() || streaming) return;
    onSend(value);
    setValue('');
    saveDraft.cancel(); // 发送后取消未执行的保存
    localStorage.removeItem(DRAFT_KEY); // 清除已存草稿
  };

  return (
    <div style={{ padding: 12, borderTop: '1px solid #f0f0f0' }}>
      {streaming ? (
        <Button
          block
          danger
          icon={<StopOutlined />}
          onClick={onStop}
        >
          停止生成
        </Button>
      ) : (
        <Input.TextArea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="输入消息，Enter 发送（Shift+Enter 换行）"
          autoSize={{ minRows: 1, maxRows: 4 }}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
      )}
    </div>
  );
}
