// 输入框: Enter 发送, 发送中变"停止"按钮 (AbortController)

import { useState } from 'react';
import { Button, Input } from 'antd';
import { StopOutlined } from '@ant-design/icons';

interface Props {
  streaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

export default function ChatInput({ streaming, onSend, onStop }: Props) {
  const [value, setValue] = useState('');

  const submit = () => {
    if (!value.trim() || streaming) return;
    onSend(value);
    setValue('');
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
          onChange={(e) => setValue(e.target.value)}
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
